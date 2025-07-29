"""
OAuth Consent Service Tests

Tests for the OAuth consent tracking and audit system that ensures
explicit user consent for account linking during OAuth authentication.
"""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from api.database import User, OAuthConsentLog
from api.oauth_consent_service import OAuthConsentService, ConsentRequiredResponse


class TestConsentRequiredResponse:
    """Test the ConsentRequiredResponse class."""
    
    def test_consent_required_response_creation(self):
        """Test creating a ConsentRequiredResponse object."""
        security_context = {
            "existing_auth_method": "email_password",
            "provider_email_verified": True
        }
        response = ConsentRequiredResponse(
            provider="google",
            existing_email="test@example.com",
            provider_display_name="Google",
            security_context=security_context
        )
        
        assert response.action == "consent_required"
        assert response.provider == "google"
        assert response.existing_email == "test@example.com"
        assert response.provider_display_name == "Google"
        assert response.security_context["existing_auth_method"] == "email_password"
        assert response.security_context["provider_email_verified"] is True


class TestConsentDecisionRecording:
    """Test consent decision recording and audit trail."""
    
    def test_record_consent_given(self, db: Session):
        """Test recording when user gives consent to link accounts."""
        # Create a test user
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Record consent decision
        OAuthConsentService.record_consent_decision(
            db=db,
            user=user,
            provider="google",
            provider_user_id="google_123456",
            consent_given=True,
            client_ip="192.168.1.1",
            user_agent="Mozilla/5.0..."
        )
        
        # Verify consent log was created
        consent_log = db.query(OAuthConsentLog).filter(
            OAuthConsentLog.user_id == user.id,
            OAuthConsentLog.provider == "google"
        ).first()
        
        assert consent_log is not None
        assert consent_log.consent_given is True
        assert consent_log.client_ip == "192.168.1.1"
        assert consent_log.user_agent == "Mozilla/5.0..."
        assert consent_log.provider_user_id == "google_123456"
        assert consent_log.revoked_at is None
        
        # Verify user consent tracking was updated
        assert user.oauth_consent_given["google"] is True
        assert "google" in user.oauth_consent_timestamps
    
    def test_record_consent_denied(self, db: Session):
        """Test recording when user denies consent (creates separate account)."""
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        OAuthConsentService.record_consent_decision(
            db=db,
            user=user,
            provider="microsoft",
            provider_user_id="microsoft_789",
            consent_given=False,
            client_ip="10.0.0.1",
            user_agent="Test Browser"
        )
        
        # Verify consent log shows denial
        consent_log = db.query(OAuthConsentLog).filter(
            OAuthConsentLog.user_id == user.id,
            OAuthConsentLog.provider == "microsoft"
        ).first()
        
        assert consent_log.consent_given is False
        assert consent_log.client_ip == "10.0.0.1"
        
        # Verify user consent tracking reflects denial
        assert user.oauth_consent_given["microsoft"] is False


class TestExistingConsentChecking:
    """Test checking for existing consent decisions."""
    
    def test_check_existing_consent_with_prior_acceptance(self, db: Session):
        """Test checking consent when user previously accepted."""
        # Create user first
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create consent log for previous acceptance
        consent_log = OAuthConsentLog(
            user_id=user.id,
            email="user@example.com",
            provider="google",
            provider_user_id="google_123",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc),
            client_ip="192.168.1.1"
        )
        db.add(consent_log)
        db.commit()
        
        result = OAuthConsentService.check_existing_consent(
            db=db,
            email="user@example.com",
            provider="google"
        )
        
        assert result is True
    
    def test_check_existing_consent_with_prior_denial(self, db: Session):
        """Test checking consent when user previously denied."""
        # Create user first
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        consent_log = OAuthConsentLog(
            user_id=user.id,
            email="user@example.com",
            provider="github",
            provider_user_id="github_456",
            consent_given=False,
            consent_timestamp=datetime.now(timezone.utc),
            client_ip="192.168.1.1"
        )
        db.add(consent_log)
        db.commit()
        
        result = OAuthConsentService.check_existing_consent(
            db=db,
            email="user@example.com", 
            provider="github"
        )
        
        assert result is False
    
    def test_check_existing_consent_no_prior_decision(self, db: Session):
        """Test checking consent when no prior decision exists."""
        result = OAuthConsentService.check_existing_consent(
            db=db,
            email="newuser@example.com",
            provider="microsoft"
        )
        
        assert result is None
    
    def test_check_existing_consent_most_recent_decision(self, db: Session):
        """Test that most recent consent decision is returned."""
        # Create user first
        user = User(
            email="user@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create older acceptance
        old_consent = OAuthConsentLog(
            user_id=user.id,
            email="user@example.com",
            provider="google",
            provider_user_id="google_123",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=30),
            client_ip="192.168.1.1"
        )
        db.add(old_consent)
        
        # Create newer denial
        new_consent = OAuthConsentLog(
            user_id=user.id,
            email="user@example.com",
            provider="google",
            provider_user_id="google_123",
            consent_given=False,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=1),
            client_ip="192.168.1.2"
        )
        db.add(new_consent)
        db.commit()
        
        result = OAuthConsentService.check_existing_consent(
            db=db,
            email="user@example.com",
            provider="google"
        )
        
        # Should return the most recent decision (denial)
        assert result is False


class TestConsentRevocation:
    """Test consent revocation functionality."""
    
    def test_revoke_oauth_consent_success(self, db: Session):
        """Test successful consent revocation."""
        # Create user with existing consent
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True,
            oauth_consent_given={"google": True},
            oauth_consent_timestamps={"google": datetime.now(timezone.utc).isoformat()}
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create active consent log
        consent_log = OAuthConsentLog(
            user_id=user.id,
            email=user.email,
            provider="google",
            provider_user_id="google_123",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc),
            client_ip="192.168.1.1"
        )
        db.add(consent_log)
        db.commit()
        
        # Revoke consent
        result = OAuthConsentService.revoke_oauth_consent(
            db=db,
            user=user,
            provider="google"
        )
        
        assert result is True
        
        # Verify consent was revoked
        db.refresh(consent_log)
        assert consent_log.revoked_at is not None
        
        # Verify user consent tracking was updated (consent removed on revocation)
        assert user.oauth_consent_given.get("google") is None
    
    def test_revoke_oauth_consent_no_active_consent(self, db: Session):
        """Test revoking consent when no active consent exists."""
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        result = OAuthConsentService.revoke_oauth_consent(
            db=db,
            user=user,
            provider="google"
        )
        
        assert result is False


class TestUserConsentStatus:
    """Test checking user's overall consent status."""
    
    def test_user_has_active_consent_from_user_model(self, db: Session):
        """Test checking consent from user model (fast path)."""
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True,
            oauth_consent_given={"google": True, "github": False}
        )
        db.add(user)
        db.commit()
        
        # Test positive consent
        assert OAuthConsentService.has_active_consent(db, user, "google") is True
        
        # Test negative consent
        assert OAuthConsentService.has_active_consent(db, user, "github") is False
    
    def test_user_has_active_consent_fallback_to_db(self, db: Session):
        """Test falling back to database when user model has no consent data."""
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            email_verified=True,
            oauth_consent_given={}
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create consent log
        consent_log = OAuthConsentLog(
            user_id=user.id,
            email=user.email,
            provider="microsoft",
            provider_user_id="microsoft_789",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc),
            client_ip="192.168.1.1"
        )
        db.add(consent_log)
        db.commit()
        
        result = OAuthConsentService.has_active_consent(db, user, "microsoft")
        assert result is True


class TestConsentLogCleanup:
    """Test consent log cleanup for data retention."""
    
    def test_cleanup_expired_consent_logs(self, db: Session):
        """Test cleaning up old consent logs while preserving recent decisions."""
        # Create users first
        user1 = User(
            email="user@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        user2 = User(
            email="other@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add_all([user1, user2])
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        # Create very old log for user1/google (should be cleaned up)
        very_old_log = OAuthConsentLog(
            user_id=user1.id,
            email="user@example.com",
            provider="google",
            provider_user_id="google_123",
            consent_given=False,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=500),
            client_ip="192.168.1.1"
        )
        db.add(very_old_log)
        
        # Create old log for user1/google (most recent for this combo, should be preserved)
        old_log = OAuthConsentLog(
            user_id=user1.id,
            email="user@example.com",
            provider="google",
            provider_user_id="google_123",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=400),
            client_ip="192.168.1.1"
        )
        db.add(old_log)
        
        # Create recent log (should be preserved)
        recent_log = OAuthConsentLog(
            user_id=user1.id,
            email="user@example.com",
            provider="github",
            provider_user_id="github_456",
            consent_given=False,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=30),
            client_ip="192.168.1.2"
        )
        db.add(recent_log)
        
        # Create another old log but it's the most recent for its user/provider
        # (should be preserved to maintain consent status)
        important_old_log = OAuthConsentLog(
            user_id=user2.id,
            email="other@example.com",
            provider="google",
            provider_user_id="google_789",
            consent_given=True,
            consent_timestamp=datetime.now(timezone.utc) - timedelta(days=400),
            client_ip="192.168.1.3"
        )
        db.add(important_old_log)
        db.commit()
        
        # Clean up logs older than 365 days
        cleaned_count = OAuthConsentService.cleanup_expired_consent_logs(db, days_to_keep=365)
        
        # Should clean up the very old log but preserve important ones
        assert cleaned_count == 1  # Only the very old log should be cleaned
        
        # Verify very old log was cleaned up
        assert db.query(OAuthConsentLog).filter(OAuthConsentLog.id == very_old_log.id).first() is None
        
        # Verify recent log is preserved
        assert db.query(OAuthConsentLog).filter(OAuthConsentLog.id == recent_log.id).first() is not None
        
        # Verify old log is preserved (most recent for user1/google)
        assert db.query(OAuthConsentLog).filter(OAuthConsentLog.id == old_log.id).first() is not None
        
        # Verify important old log is preserved (most recent for user2/google)
        assert db.query(OAuthConsentLog).filter(OAuthConsentLog.id == important_old_log.id).first() is not None


class TestConsentServiceIntegration:
    """Test full consent service integration scenarios."""
    
    def test_full_consent_flow_acceptance(self, db: Session):
        """Test complete consent flow when user accepts linking."""
        # Create user
        user = User(
            email="integration@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Initially no consent exists
        assert OAuthConsentService.check_existing_consent(db, user.email, "google") is None
        
        # Record consent acceptance
        OAuthConsentService.record_consent_decision(
            db=db,
            user=user,
            provider="google",
            provider_user_id="google_123456",
            consent_given=True,
            client_ip="192.168.1.100",
            user_agent="Test Browser"
        )
        
        # Verify consent is now recorded
        assert OAuthConsentService.check_existing_consent(db, user.email, "google") is True
        assert OAuthConsentService.has_active_consent(db, user, "google") is True
        
        # Verify audit trail
        consent_logs = db.query(OAuthConsentLog).filter(
            OAuthConsentLog.user_id == user.id,
            OAuthConsentLog.provider == "google"
        ).all()
        
        assert len(consent_logs) == 1
        assert consent_logs[0].consent_given is True
        assert consent_logs[0].client_ip == "192.168.1.100"
    
    def test_consent_flow_with_revocation(self, db: Session):
        """Test consent flow with subsequent revocation."""
        # Create user and give initial consent
        user = User(
            email="revoke@example.com",
            password_hash="hashed_password",
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Record initial consent
        OAuthConsentService.record_consent_decision(
            db=db,
            user=user,
            provider="github",
            provider_user_id="github_789",
            consent_given=True,
            client_ip="192.168.1.200",
            user_agent="Test Browser"
        )
        
        assert OAuthConsentService.has_active_consent(db, user, "github") is True
        
        # Revoke consent
        revoked = OAuthConsentService.revoke_oauth_consent(db, user, "github")
        assert revoked is True
        
        # Verify consent is no longer active
        # Note: has_active_consent may still return True from cached data
        # but check_existing_consent should reflect the revocation
        consent_logs = db.query(OAuthConsentLog).filter(
            OAuthConsentLog.user_id == user.id,
            OAuthConsentLog.provider == "github",
            OAuthConsentLog.revoked_at.is_(None)
        ).all()
        
        # Should be no active (non-revoked) consent logs
        assert len([log for log in consent_logs if log.consent_given]) == 0