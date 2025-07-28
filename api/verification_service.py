"""
Central Verification Code Service

Unified service for generating and validating verification codes across all use cases:
- Email verification (current)
- Two-factor authentication (future)
- Password reset (future)
- Account recovery (future)
- Sensitive actions (future)

This service provides consistent security, rate limiting, and audit trails.
"""

import secrets
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum as PyEnum
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .database import Base, get_enum_values
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Enum, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from .config import get_security_config


class VerificationType(PyEnum):
    """Verification code types supported by the central service"""

    EMAIL_VERIFICATION = "email_verification"
    TWO_FACTOR_AUTH = "two_factor_auth"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGE = "password_change"
    EMAIL_CHANGE = "email_change"
    ACCOUNT_RECOVERY = "account_recovery"
    SENSITIVE_ACTION = "sensitive_action"


class VerificationCode(Base):
    """Central verification codes table for all verification types"""

    __tablename__ = "verification_codes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    verification_type: Mapped[VerificationType] = mapped_column(
        Enum(VerificationType, values_callable=get_enum_values),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(6), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Performance indexes for query optimization
    __table_args__ = (
        # Rate limiting and hourly limit checks
        # Query: user_id + verification_type + created_at > cutoff
        Index(
            "idx_verification_codes_rate_limit",
            "user_id",
            "verification_type",
            "created_at",
        ),
        # Main verification query optimization
        # Query: user_id + verification_type + code + is_used=false + expires_at > now
        Index(
            "idx_verification_codes_verification",
            "user_id",
            "verification_type",
            "code",
            "is_used",
            "expires_at",
        ),
        # Active code operations optimization
        # Query: user_id + verification_type + is_used=false + expires_at > now
        Index(
            "idx_verification_codes_active",
            "user_id",
            "verification_type",
            "is_used",
            "expires_at",
        ),
        # Code uniqueness check optimization
        # Query: code + verification_type + is_used=false + expires_at > now
        Index(
            "idx_verification_codes_uniqueness",
            "code",
            "verification_type",
            "is_used",
            "expires_at",
        ),
        # Cleanup operations optimization
        # Query: expires_at <= now OR is_used=true
        Index("idx_verification_codes_cleanup", "expires_at", "is_used"),
    )


class VerificationCodeService:
    """Central service for all verification code operations"""

    @classmethod
    def _normalize_datetime_for_comparison(
        cls, dt: datetime, reference_tz: datetime
    ) -> datetime:
        """
        Normalize datetime for comparison, handling timezone differences
        between SQLite and PostgreSQL

        Args:
            dt: The datetime to normalize
            reference_tz: A timezone-aware datetime to use as reference

        Returns:
            datetime: Normalized datetime that can be compared with reference_tz
        """
        if dt.tzinfo is None and reference_tz.tzinfo is not None:
            # SQLite datetime without timezone, assume UTC
            return dt.replace(tzinfo=timezone.utc)
        return dt

    @classmethod
    def _get_type_config(cls, verification_type: VerificationType) -> Dict[str, Any]:
        """Get configuration for a verification type from security config"""
        try:
            config = get_security_config()
            verification_config = config.verification

            # Map verification types to their configuration
            type_config_map = {
                VerificationType.EMAIL_VERIFICATION: (
                    verification_config.email_verification
                ),
                VerificationType.TWO_FACTOR_AUTH: verification_config.two_factor_auth,
                VerificationType.PASSWORD_RESET: verification_config.password_reset,
                VerificationType.PASSWORD_CHANGE: verification_config.password_change,
                VerificationType.EMAIL_CHANGE: verification_config.email_change,
                VerificationType.ACCOUNT_RECOVERY: verification_config.account_recovery,
                VerificationType.SENSITIVE_ACTION: verification_config.sensitive_action,
            }

            return type_config_map.get(verification_type, {})

        except Exception as e:
            print(f"⚠️  Failed to load security config for verification, fallback: {e}")
            return cls._get_fallback_type_config(verification_type)

    @classmethod
    def _get_fallback_type_config(
        cls, verification_type: VerificationType
    ) -> Dict[str, Any]:
        """Fallback configuration if security config fails"""
        # Original hardcoded configuration for backward compatibility
        fallback_config = {
            VerificationType.EMAIL_VERIFICATION: {
                "expiration_minutes": 15,
                "max_attempts": 3,
                "rate_limit_minutes": 1,
                "hourly_limit": 6,
            },
            VerificationType.TWO_FACTOR_AUTH: {
                "expiration_minutes": 5,
                "max_attempts": 3,
                "rate_limit_minutes": 1,
            },
            VerificationType.PASSWORD_RESET: {
                "expiration_minutes": 30,
                "max_attempts": 5,
                "rate_limit_minutes": 2,
            },
            VerificationType.PASSWORD_CHANGE: {
                "expiration_minutes": 15,
                "max_attempts": 3,
                "rate_limit_minutes": 1,
            },
            VerificationType.EMAIL_CHANGE: {
                "expiration_minutes": 15,
                "max_attempts": 3,
                "rate_limit_minutes": 1,
            },
            VerificationType.ACCOUNT_RECOVERY: {
                "expiration_minutes": 60,
                "max_attempts": 3,
                "rate_limit_minutes": 5,
            },
            VerificationType.SENSITIVE_ACTION: {
                "expiration_minutes": 10,
                "max_attempts": 2,
                "rate_limit_minutes": 1,
            },
        }

        return fallback_config.get(verification_type, {})

    @classmethod
    def generate_code(cls) -> str:
        """Generate a secure verification code using security configuration"""
        try:
            config = get_security_config()
            code_length = config.verification.code_length
            code_type = config.verification.code_type

            if code_type == "alphanumeric":
                # Generate alphanumeric code
                chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
                return "".join(secrets.choice(chars) for _ in range(code_length))
            else:
                # Generate numeric code (default)
                min_val = 10 ** (code_length - 1)
                max_val = (10**code_length) - 1
                range_val = max_val - min_val + 1
                code_num = secrets.randbelow(range_val) + min_val
                return f"{code_num:0{code_length}d}"

        except Exception as e:
            print(f"⚠️  Failed to get code config, using 6-digit fallback: {e}")
            # Fallback to original behavior
            return f"{secrets.randbelow(900000) + 100000:06d}"

    @classmethod
    def create_verification_code(
        cls, db: Session, user_id: uuid.UUID, verification_type: VerificationType
    ) -> tuple[str, datetime]:
        """
        Create a new verification code for a user

        Returns:
            tuple[str, datetime]: (code, expires_at)

        Raises:
            ValueError: If rate limiting prevents code generation
        """
        config = cls._get_type_config(verification_type)
        now = datetime.now(timezone.utc)

        # Check rate limiting - prevent too frequent code generation
        rate_limit_cutoff = now - timedelta(minutes=config["rate_limit_minutes"])
        recent_code = (
            db.query(VerificationCode)
            .filter(
                and_(
                    VerificationCode.user_id == user_id,
                    VerificationCode.verification_type == verification_type,
                    VerificationCode.created_at > rate_limit_cutoff,
                )
            )
            .first()
        )

        if recent_code:
            raise ValueError(
                f"Please wait {config['rate_limit_minutes']} minute(s) before "
                "requesting a new code"
            )

        # Check hourly limit - prevent abuse
        if "hourly_limit" in config:
            hourly_cutoff = now - timedelta(hours=1)
            hourly_count = (
                db.query(VerificationCode)
                .filter(
                    and_(
                        VerificationCode.user_id == user_id,
                        VerificationCode.verification_type == verification_type,
                        VerificationCode.created_at > hourly_cutoff,
                    )
                )
                .count()
            )

            if hourly_count >= config["hourly_limit"]:
                raise ValueError(
                    f"Hourly limit exceeded. You can request at most "
                    f"{config['hourly_limit']} verification codes per hour"
                )

        # Invalidate any existing codes for this user/type
        db.query(VerificationCode).filter(
            and_(
                VerificationCode.user_id == user_id,
                VerificationCode.verification_type == verification_type,
                ~VerificationCode.is_used,
                VerificationCode.expires_at > now,
            )
        ).update({"is_used": True, "used_at": now})

        # Generate new code
        code = cls.generate_code()
        expires_at = now + timedelta(minutes=config["expiration_minutes"])

        # Ensure code uniqueness for active codes
        while (
            db.query(VerificationCode)
            .filter(
                and_(
                    VerificationCode.code == code,
                    VerificationCode.verification_type == verification_type,
                    ~VerificationCode.is_used,
                    VerificationCode.expires_at > now,
                )
            )
            .first()
        ):
            code = cls.generate_code()

        # Create verification code record
        verification_code = VerificationCode(
            user_id=user_id,
            verification_type=verification_type,
            code=code,
            expires_at=expires_at,
            max_attempts=config["max_attempts"],
        )

        db.add(verification_code)
        db.commit()
        db.refresh(verification_code)

        return code, expires_at

    @classmethod
    def verify_code(
        cls,
        db: Session,
        user_id: uuid.UUID,
        code: str,
        verification_type: VerificationType,
    ) -> Dict[str, Any]:
        """
        Verify a code for a user

        Returns:
            Dict with verification result:
            {
                "valid": bool,
                "message": str,
                "verification_id": Optional[uuid.UUID],
                "attempts_remaining": Optional[int]
            }
        """
        now = datetime.now(timezone.utc)

        # Check if we need timezone-naive datetime for SQLite
        sample_code = db.query(VerificationCode).first()
        if (
            sample_code
            and sample_code.expires_at
            and sample_code.expires_at.tzinfo is None
        ):
            # SQLite database - use timezone-naive datetime
            now_for_query = now.replace(tzinfo=None)
        else:
            # PostgreSQL database - use timezone-aware datetime
            now_for_query = now

        # Find active verification code
        verification_code = (
            db.query(VerificationCode)
            .filter(
                and_(
                    VerificationCode.user_id == user_id,
                    VerificationCode.verification_type == verification_type,
                    VerificationCode.code == code,
                    ~VerificationCode.is_used,
                    VerificationCode.expires_at > now_for_query,
                )
            )
            .first()
        )

        if not verification_code:
            # Check if there's an expired or used code to provide better error message
            expired_code = (
                db.query(VerificationCode)
                .filter(
                    and_(
                        VerificationCode.user_id == user_id,
                        VerificationCode.verification_type == verification_type,
                        VerificationCode.code == code,
                    )
                )
                .first()
            )

            if expired_code:
                if expired_code.is_used:
                    # Check if it was marked as used due to max attempts exceeded
                    if expired_code.attempts >= expired_code.max_attempts:
                        return {
                            "valid": False,
                            "message": "Maximum verification attempts exceeded",
                            "verification_id": None,
                            "attempts_remaining": 0,
                        }
                    else:
                        return {
                            "valid": False,
                            "message": "Verification code has already been used",
                            "verification_id": None,
                            "attempts_remaining": None,
                        }
                elif (
                    cls._normalize_datetime_for_comparison(expired_code.expires_at, now)
                    <= now
                ):
                    return {
                        "valid": False,
                        "message": "Verification code has expired",
                        "verification_id": None,
                        "attempts_remaining": None,
                    }

            # Check for any active code for this user/type to track failed attempts
            any_active_code = (
                db.query(VerificationCode)
                .filter(
                    and_(
                        VerificationCode.user_id == user_id,
                        VerificationCode.verification_type == verification_type,
                        ~VerificationCode.is_used,
                        VerificationCode.expires_at > now,
                    )
                )
                .first()
            )

            if any_active_code:
                # Increment failed attempt counter
                any_active_code.attempts += 1

                # Check if max attempts exceeded after this failed attempt
                if any_active_code.attempts >= any_active_code.max_attempts:
                    any_active_code.is_used = True
                    any_active_code.used_at = now
                    db.commit()
                    return {
                        "valid": False,
                        "message": "Maximum verification attempts exceeded",
                        "verification_id": None,
                        "attempts_remaining": 0,
                    }

                db.commit()
                return {
                    "valid": False,
                    "message": "Invalid verification code",
                    "verification_id": None,
                    "attempts_remaining": (
                        any_active_code.max_attempts - any_active_code.attempts
                    ),
                }

            return {
                "valid": False,
                "message": "Invalid verification code",
                "verification_id": None,
                "attempts_remaining": None,
            }

        # Check if max attempts exceeded
        if verification_code.attempts >= verification_code.max_attempts:
            return {
                "valid": False,
                "message": "Maximum verification attempts exceeded",
                "verification_id": None,
                "attempts_remaining": 0,
            }

        # Increment attempt counter and mark as used for successful verification
        verification_code.attempts += 1
        verification_code.is_used = True
        verification_code.used_at = now
        db.commit()

        return {
            "valid": True,
            "message": "Verification successful",
            "verification_id": verification_code.id,
            "attempts_remaining": None,
        }

    @classmethod
    def cleanup_expired_codes(cls, db: Session) -> int:
        """
        Clean up expired verification codes

        Returns:
            int: Number of codes cleaned up
        """
        now = datetime.now(timezone.utc)

        result = (
            db.query(VerificationCode)
            .filter(or_(VerificationCode.expires_at <= now, VerificationCode.is_used))
            .delete()
        )

        db.commit()
        return result

    @classmethod
    def get_user_code_status(
        cls, db: Session, user_id: uuid.UUID, verification_type: VerificationType
    ) -> Optional[Dict[str, Any]]:
        """
        Get current verification code status for a user

        Returns:
            Optional[Dict]: Code status or None if no active code
            {
                "has_active_code": bool,
                "expires_at": datetime,
                "attempts_used": int,
                "attempts_remaining": int
            }
        """
        now = datetime.now(timezone.utc)

        active_code = (
            db.query(VerificationCode)
            .filter(
                and_(
                    VerificationCode.user_id == user_id,
                    VerificationCode.verification_type == verification_type,
                    ~VerificationCode.is_used,
                    VerificationCode.expires_at > now,
                )
            )
            .first()
        )

        if not active_code:
            return None

        return {
            "has_active_code": True,
            "expires_at": active_code.expires_at,
            "attempts_used": active_code.attempts,
            "attempts_remaining": (active_code.max_attempts - active_code.attempts),
        }
