"""
Tests for Central Verification Code Service

Tests for the unified verification code system that handles:
- Email verification codes
- Future 2FA codes
- Password reset codes
- Account recovery codes
- Sensitive action codes

This ensures consistent security, rate limiting, and audit trails across all verification types.
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import uuid

from api.verification_service import (
    VerificationCodeService,
    VerificationCode,
    VerificationType,
)


class TestVerificationCodeGeneration:
    """Test verification code generation."""

    def test_generate_code_returns_six_digits(self):
        """Test that generated codes are always 6 digits."""
        for _ in range(100):  # Test multiple generations
            code = VerificationCodeService.generate_code()
            assert len(code) == 6
            assert code.isdigit()
            assert 100000 <= int(code) <= 999999

    def test_generate_code_uniqueness(self):
        """Test that generated codes are unique (at least mostly)."""
        codes = set()
        for _ in range(1000):
            code = VerificationCodeService.generate_code()
            codes.add(code)
        
        # With 900,000 possible codes, we should have good uniqueness
        # Allow for some collisions but ensure reasonable distribution
        assert len(codes) > 950  # At least 95% unique


class TestVerificationCodeCreation:
    """Test verification code creation and database operations."""

    def test_create_verification_code_email_type(self, db: Session, mailpit_disabled):
        """Test creating an email verification code."""
        user_id = uuid.uuid4()
        
        code, expires_at = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Check return values
        assert len(code) == 6
        assert code.isdigit()
        assert isinstance(expires_at, datetime)
        
        # Check database record
        db_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        assert db_code is not None
        assert db_code.code == code
        # Handle timezone differences between SQLite (tests) and PostgreSQL (production)
        if db_code.expires_at.tzinfo is None and expires_at.tzinfo is not None:
            # SQLite stripped timezone info, compare by replacing timezone
            assert db_code.expires_at == expires_at.replace(tzinfo=None)
        else:
            assert db_code.expires_at == expires_at
        assert db_code.max_attempts == 3  # Email verification config
        assert db_code.attempts == 0
        assert db_code.is_used is False
        assert db_code.used_at is None

    def test_create_verification_code_different_types(self, db: Session, mailpit_disabled):
        """Test creating codes for different verification types."""
        user_id = uuid.uuid4()
        
        # Test each verification type
        type_configs = {
            VerificationType.EMAIL_VERIFICATION: {"expiration_minutes": 15, "max_attempts": 3},
            VerificationType.TWO_FACTOR_AUTH: {"expiration_minutes": 5, "max_attempts": 3},
            VerificationType.PASSWORD_RESET: {"expiration_minutes": 30, "max_attempts": 5},
            VerificationType.ACCOUNT_RECOVERY: {"expiration_minutes": 60, "max_attempts": 3},
            VerificationType.SENSITIVE_ACTION: {"expiration_minutes": 10, "max_attempts": 2},
        }
        
        for verification_type, expected_config in type_configs.items():
            code, expires_at = VerificationCodeService.create_verification_code(
                db=db, user_id=user_id, verification_type=verification_type
            )
            
            db_code = db.query(VerificationCode).filter(
                VerificationCode.user_id == user_id,
                VerificationCode.verification_type == verification_type
            ).first()
            
            assert db_code is not None
            assert db_code.max_attempts == expected_config["max_attempts"]
            
            # Check expiration time (allow 1 minute tolerance for test execution time)
            expected_expiration = db_code.created_at + timedelta(
                minutes=expected_config["expiration_minutes"]
            )
            time_diff = abs((db_code.expires_at - expected_expiration).total_seconds())
            assert time_diff < 60  # Within 1 minute

    def test_rate_limiting_prevents_frequent_requests(self, db: Session, mailpit_disabled):
        """Test that rate limiting prevents too frequent code generation."""
        user_id = uuid.uuid4()
        
        # First request should succeed
        code1, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        assert code1 is not None
        
        # Second request immediately should fail due to rate limiting
        with pytest.raises(ValueError, match="Please wait 1 minute"):
            VerificationCodeService.create_verification_code(
                db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
            )

    def test_hourly_rate_limiting_prevents_abuse(self, db: Session, mailpit_disabled):
        """Test that hourly rate limiting prevents too many verification requests."""
        user_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        
        # Manually create 6 verification codes with timestamps spread across the hour
        # to simulate reaching the hourly limit
        for i in range(6):  # Create 6 codes (the hourly limit)
            # Create code manually to avoid rate limiting during test setup
            code = VerificationCodeService.generate_code()
            expires_at = now + timedelta(minutes=15)
            
            verification_code = VerificationCode(
                user_id=user_id,
                verification_type=VerificationType.EMAIL_VERIFICATION,
                code=code,
                expires_at=expires_at,
                max_attempts=3,
                # Set created_at to be (5 + i * 8) minutes ago to avoid 1-minute rate limit
                # but still be within the hour for hourly limit checking
                created_at=now - timedelta(minutes=5 + i * 8),
                is_used=False,
                attempts=0
            )
            db.add(verification_code)
        
        db.commit()
        
        # Now try to create a 7th code - should fail due to hourly limit
        with pytest.raises(ValueError, match="Hourly limit exceeded"):
            VerificationCodeService.create_verification_code(
                db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
            )

    def test_invalidates_existing_codes_on_new_creation(self, db: Session, mailpit_disabled):
        """Test that creating a new code invalidates existing unused codes."""
        user_id = uuid.uuid4()
        
        # Create first code
        code1, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        # Wait to avoid rate limiting (set created_at to past)
        first_code_record = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.code == code1
        ).first()
        first_code_record.created_at = datetime.now(timezone.utc) - timedelta(minutes=5)
        db.commit()
        
        # Create second code
        code2, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        # First code should be invalidated
        db.refresh(first_code_record)
        assert first_code_record.is_used is True
        assert first_code_record.used_at is not None
        
        # Second code should be active
        second_code_record = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.code == code2
        ).first()
        assert second_code_record.is_used is False

    def test_code_uniqueness_within_active_codes(self, db: Session, mailpit_disabled):
        """Test that codes are unique among active codes of the same type."""
        # This test verifies the uniqueness check in the creation process
        # It's hard to test directly, but we can test that different users
        # get different codes when created at the same time
        
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        
        code1, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user1_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        code2, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user2_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Codes should be different (very high probability)
        assert code1 != code2


class TestVerificationCodeValidation:
    """Test verification code validation."""

    def test_verify_valid_code(self, db: Session, mailpit_disabled):
        """Test successful code verification."""
        user_id = uuid.uuid4()
        
        # Create a code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Verify the code
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert result["valid"] is True
        assert result["message"] == "Verification successful"
        assert result["verification_id"] is not None
        assert result["attempts_remaining"] is None
        
        # Code should be marked as used
        db_code = db.query(VerificationCode).filter(
            VerificationCode.id == result["verification_id"]
        ).first()
        assert db_code.is_used is True
        assert db_code.used_at is not None

    def test_verify_invalid_code(self, db: Session, mailpit_disabled):
        """Test verification with invalid code."""
        user_id = uuid.uuid4()
        
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code="999999", verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert result["valid"] is False
        assert result["message"] == "Invalid verification code"
        assert result["verification_id"] is None
        assert result["attempts_remaining"] is None

    def test_verify_expired_code(self, db: Session, mailpit_disabled):
        """Test verification with expired code."""
        user_id = uuid.uuid4()
        
        # Create a code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Manually expire the code
        db_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.code == code
        ).first()
        # Handle timezone for SQLite vs PostgreSQL
        if db_code.expires_at.tzinfo is None:
            # SQLite - use timezone-naive datetime
            db_code.expires_at = datetime.now() - timedelta(minutes=1)
        else:
            # PostgreSQL - use timezone-aware datetime
            db_code.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        
        # Try to verify expired code
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert result["valid"] is False
        assert result["message"] == "Verification code has expired"

    def test_verify_already_used_code(self, db: Session, mailpit_disabled):
        """Test verification with already used code."""
        user_id = uuid.uuid4()
        
        # Create and use a code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Use the code once
        result1 = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        assert result1["valid"] is True
        
        # Try to use it again
        result2 = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert result2["valid"] is False
        assert result2["message"] == "Verification code has already been used"

    def test_verify_max_attempts_exceeded(self, db: Session, mailpit_disabled):
        """Test verification with too many failed attempts."""
        user_id = uuid.uuid4()
        
        # Create a code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Make maximum allowed attempts with wrong code
        for i in range(3):  # Email verification allows 3 attempts
            result = VerificationCodeService.verify_code(
                db=db, user_id=user_id, code="000000", verification_type=VerificationType.EMAIL_VERIFICATION
            )
            assert result["valid"] is False
        
        # Code should still exist but any further attempts should fail
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert result["valid"] is False
        assert result["message"] == "Maximum verification attempts exceeded"


class TestVerificationCodeUtilities:
    """Test utility functions for verification codes."""

    def test_cleanup_expired_codes(self, db: Session, mailpit_disabled):
        """Test cleanup of expired and used codes."""
        user_id = uuid.uuid4()
        
        # Create some codes
        code1, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Manually create expired and used codes
        expired_code = VerificationCode(
            user_id=user_id,
            verification_type=VerificationType.EMAIL_VERIFICATION,
            code="111111",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
            max_attempts=3,
            is_used=False
        )
        
        used_code = VerificationCode(
            user_id=user_id,
            verification_type=VerificationType.EMAIL_VERIFICATION,
            code="222222",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            max_attempts=3,
            is_used=True,
            used_at=datetime.now(timezone.utc)
        )
        
        db.add(expired_code)
        db.add(used_code)
        db.commit()
        
        # Count codes before cleanup
        codes_before = db.query(VerificationCode).count()
        
        # Run cleanup
        cleaned_count = VerificationCodeService.cleanup_expired_codes(db)
        
        # Check results
        assert cleaned_count == 2  # Should clean expired and used codes
        
        # Active code should remain
        remaining_codes = db.query(VerificationCode).all()
        now_utc = datetime.now(timezone.utc)
        
        # Handle timezone comparison for SQLite vs PostgreSQL
        active_codes = []
        for c in remaining_codes:
            if not c.is_used:
                if c.expires_at.tzinfo is None:
                    # SQLite datetime without timezone, compare with timezone-naive version
                    if c.expires_at > now_utc.replace(tzinfo=None):
                        active_codes.append(c)
                else:
                    # PostgreSQL datetime with timezone
                    if c.expires_at > now_utc:
                        active_codes.append(c)
        assert len(active_codes) == 1
        assert active_codes[0].code == code1

    def test_get_user_code_status_with_active_code(self, db: Session, mailpit_disabled):
        """Test getting status for user with active code."""
        user_id = uuid.uuid4()
        
        code, expires_at = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        status = VerificationCodeService.get_user_code_status(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert status is not None
        assert status["has_active_code"] is True
        # Handle timezone differences between SQLite (tests) and PostgreSQL (production)
        if status["expires_at"].tzinfo is None and expires_at.tzinfo is not None:
            # SQLite stripped timezone info, compare by replacing timezone
            assert status["expires_at"] == expires_at.replace(tzinfo=None)
        else:
            assert status["expires_at"] == expires_at
        assert status["attempts_used"] == 0
        assert status["attempts_remaining"] == 3

    def test_get_user_code_status_no_active_code(self, db: Session, mailpit_disabled):
        """Test getting status for user with no active code."""
        user_id = uuid.uuid4()
        
        status = VerificationCodeService.get_user_code_status(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert status is None

    def test_get_user_code_status_after_attempts(self, db: Session, mailpit_disabled):
        """Test getting status after some verification attempts."""
        user_id = uuid.uuid4()
        
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        # Make one failed attempt
        VerificationCodeService.verify_code(
            db=db, user_id=user_id, code="000000", verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        status = VerificationCodeService.get_user_code_status(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert status is not None
        assert status["attempts_used"] == 1
        assert status["attempts_remaining"] == 2


class TestVerificationCodeSecurity:
    """Test security aspects of the verification code system."""

    def test_different_users_different_codes(self, db: Session, mailpit_disabled):
        """Test that different users get different codes."""
        user1_id = uuid.uuid4()
        user2_id = uuid.uuid4()
        
        code1, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user1_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        code2, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user2_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        assert code1 != code2

    def test_different_types_isolated(self, db: Session, mailpit_disabled):
        """Test that different verification types are isolated."""
        user_id = uuid.uuid4()
        
        # Create codes for different types
        email_code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        
        reset_code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user_id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        # Email code should not work for password reset
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=email_code, verification_type=VerificationType.PASSWORD_RESET
        )
        assert result["valid"] is False
        
        # Reset code should not work for email verification
        result = VerificationCodeService.verify_code(
            db=db, user_id=user_id, code=reset_code, verification_type=VerificationType.EMAIL_VERIFICATION
        )
        assert result["valid"] is False

    def test_code_entropy_distribution(self):
        """Test that generated codes have good entropy distribution."""
        codes = []
        for _ in range(1000):
            code = VerificationCodeService.generate_code()
            codes.append(code)
        
        # Test that all digits appear in various positions
        digit_positions = {}
        for pos in range(6):
            digit_positions[pos] = set()
            for code in codes:
                digit_positions[pos].add(code[pos])
        
        # Each position should have multiple different digits
        for pos in range(6):
            assert len(digit_positions[pos]) >= 5  # At least 5 different digits per position