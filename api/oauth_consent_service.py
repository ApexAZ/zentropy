"""
OAuth Consent Service

Handles OAuth consent decisions, audit trail logging, and consent management
for explicit OAuth account linking flows.

This service provides:
- Consent decision recording with full audit trail
- Consent validation and checking
- Revocation capabilities
- Security-first approach with comprehensive logging
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from .database import User, OAuthConsentLog
from .oauth_base import OAuthSecurityContext


class ConsentRequiredResponse:
    """Response when OAuth consent is required for account linking."""

    def __init__(
        self,
        provider: str,
        existing_email: str,
        provider_display_name: str,
        security_context: Dict[str, Any],
    ):
        self.action = "consent_required"
        self.provider = provider
        self.existing_email = existing_email
        self.provider_display_name = provider_display_name
        self.security_context = security_context


class OAuthConsentService:
    """Service for managing OAuth consent decisions and audit trail."""

    @staticmethod
    def record_consent_decision(
        db: Session,
        user: User,
        provider: str,
        provider_user_id: str,
        consent_given: bool,
        client_ip: str,
        user_agent: str,
        security_ctx: Optional[OAuthSecurityContext] = None,
    ) -> None:
        """
        Record consent decision with full audit trail.

        Args:
            db: Database session
            user: User making the consent decision
            provider: OAuth provider name ('google', 'microsoft', 'github')
            provider_user_id: Provider-specific user ID
            consent_given: True if user consented to linking, False otherwise
            client_ip: Client IP address for audit trail
            user_agent: Client user agent for audit trail
            security_ctx: Optional security context for enhanced logging
        """
        # Create consent log entry
        consent_log = OAuthConsentLog(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            email=user.email,
            consent_given=consent_given,
            consent_timestamp=datetime.now(timezone.utc),
            client_ip=client_ip,
            user_agent=user_agent,
        )

        db.add(consent_log)

        # Update user's consent tracking fields
        # Create new dict objects to trigger SQLAlchemy change detection
        consent_dict = (
            user.oauth_consent_given.copy() if user.oauth_consent_given else {}
        )
        timestamp_dict = (
            user.oauth_consent_timestamps.copy()
            if user.oauth_consent_timestamps
            else {}
        )

        consent_dict[provider] = consent_given
        timestamp_dict[provider] = datetime.now(timezone.utc).isoformat()

        user.oauth_consent_given = consent_dict
        user.oauth_consent_timestamps = timestamp_dict

        db.commit()

        # Enhanced security logging
        if security_ctx:
            action = "CONSENT_GRANTED" if consent_given else "CONSENT_DENIED"
            security_ctx.log_event(f"{action} for {provider} account linking")

    @staticmethod
    def check_existing_consent(
        db: Session, email: str, provider: str
    ) -> Optional[bool]:
        """
        Check if user has previously given consent for this provider.

        Args:
            db: Database session
            email: User email address
            provider: OAuth provider name

        Returns:
            Optional[bool]: True if consented, False if denied, None if no decision
        """
        # Get most recent consent decision for this email/provider combo
        latest_consent = (
            db.query(OAuthConsentLog)
            .filter(
                and_(
                    OAuthConsentLog.email == email,
                    OAuthConsentLog.provider == provider,
                    OAuthConsentLog.revoked_at.is_(None),  # Not revoked
                )
            )
            .order_by(desc(OAuthConsentLog.consent_timestamp))
            .first()
        )

        if latest_consent:
            return latest_consent.consent_given

        return None

    @staticmethod
    def revoke_oauth_consent(db: Session, user: User, provider: str) -> bool:
        """
        Revoke previously given OAuth consent.

        Args:
            db: Database session
            user: User revoking consent
            provider: OAuth provider name

        Returns:
            bool: True if consent was revoked, False if no consent found
        """
        # Find active consent logs for this user/provider
        active_consents = (
            db.query(OAuthConsentLog)
            .filter(
                and_(
                    OAuthConsentLog.user_id == user.id,
                    OAuthConsentLog.provider == provider,
                    OAuthConsentLog.consent_given.is_(True),
                    OAuthConsentLog.revoked_at.is_(None),
                )
            )
            .all()
        )

        if not active_consents:
            return False

        # Mark all active consents as revoked
        revocation_time = datetime.now(timezone.utc)
        for consent in active_consents:
            consent.revoked_at = revocation_time

        # Update user's consent tracking
        # Create new dict objects to trigger SQLAlchemy change detection
        if user.oauth_consent_given and provider in user.oauth_consent_given:
            consent_dict = user.oauth_consent_given.copy()
            del consent_dict[provider]  # Remove consent entirely upon revocation
            user.oauth_consent_given = consent_dict

        if user.oauth_consent_timestamps and provider in user.oauth_consent_timestamps:
            timestamp_dict = user.oauth_consent_timestamps.copy()
            timestamp_dict[provider] = revocation_time.isoformat()
            user.oauth_consent_timestamps = timestamp_dict

        db.commit()

        return True

    @staticmethod
    def get_user_consent_history(
        db: Session, user: User, provider: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get user's OAuth consent history for transparency.

        Args:
            db: Database session
            user: User to get history for
            provider: Optional provider filter

        Returns:
            List[Dict]: Consent history entries
        """
        query = (
            db.query(OAuthConsentLog)
            .filter(OAuthConsentLog.user_id == user.id)
            .order_by(desc(OAuthConsentLog.consent_timestamp))
        )

        if provider:
            query = query.filter(OAuthConsentLog.provider == provider)

        consent_logs = query.all()

        history = []
        for log in consent_logs:
            history.append(
                {
                    "provider": log.provider,
                    "consent_given": log.consent_given,
                    "timestamp": log.consent_timestamp.isoformat(),
                    "revoked_at": (
                        log.revoked_at.isoformat() if log.revoked_at else None
                    ),
                    "client_ip": str(log.client_ip) if log.client_ip else None,
                }
            )

        return history

    @staticmethod
    def has_active_consent(db: Session, user: User, provider: str) -> bool:
        """
        Check if user has active (non-revoked) consent for provider.

        Args:
            db: Database session
            user: User to check
            provider: OAuth provider name

        Returns:
            bool: True if user has active consent for this provider
        """
        # Check user's consent tracking first (faster)
        if user.oauth_consent_given and provider in user.oauth_consent_given:
            return user.oauth_consent_given[provider]

        # Fallback to database check
        result = OAuthConsentService.check_existing_consent(db, user.email, provider)
        return result is True

    @staticmethod
    def cleanup_expired_consent_logs(db: Session, days_to_keep: int = 365) -> int:
        """
        Clean up old consent logs for data retention compliance.

        Args:
            db: Database session
            days_to_keep: Number of days to retain logs

        Returns:
            int: Number of logs cleaned up
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)

        # Only delete logs older than cutoff, but keep the most recent decision
        # per user/provider
        # This ensures we always have the latest consent status
        old_logs = (
            db.query(OAuthConsentLog)
            .filter(OAuthConsentLog.consent_timestamp < cutoff_date)
            .all()
        )

        # Filter to only delete logs that aren't the most recent for their
        # user/provider combo
        logs_to_delete = []
        for log in old_logs:
            latest_for_combo = (
                db.query(OAuthConsentLog)
                .filter(
                    and_(
                        OAuthConsentLog.user_id == log.user_id,
                        OAuthConsentLog.provider == log.provider,
                    )
                )
                .order_by(desc(OAuthConsentLog.consent_timestamp))
                .first()
            )

            # Only delete if this isn't the latest log for this user/provider combo
            if latest_for_combo and latest_for_combo.id != log.id:
                logs_to_delete.append(log)

        # Delete the filtered logs
        count = len(logs_to_delete)
        for log in logs_to_delete:
            db.delete(log)

        if count > 0:
            db.commit()

        return count
