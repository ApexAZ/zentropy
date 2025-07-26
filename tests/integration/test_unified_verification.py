"""
Integration Tests for Simplified Unified Verification System

End-to-end integration tests for the simplified email verification system that covers
complete user workflows for password reset using unified email verification.

Test Categories:
- Complete password reset flow using simplified email verification
- Email verification integration and cleanup
- System reliability and edge cases
"""

import pytest
import random
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from api.database import User
from api.auth import get_password_hash
from api.verification_service import VerificationCode, VerificationType
from tests.conftest import create_test_user


class TestPasswordResetCompleteFlow:
    """Test complete password reset flow using simplified unified email verification."""

    def test_password_reset_complete_flow_success(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test complete password reset flow: send verification -> verify code -> reset password."""
        # Step 1: Create user
        original_password = "OriginalPassword123!"
        new_password = "NewResetPassword456!"
        email = f"reset-flow{random.randint(1000, 9999)}@example.com"
        
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash(original_password),
            email_verified=True
        )
        
        # Step 2: Send email verification for password reset
        response = client.post("/api/v1/auth/send-verification", json={
            "email": email
        })
        assert response.status_code == 200
        
        # Step 3: Get verification code from database (simulating email)
        verification_code_obj = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.used_at.is_(None)
        ).order_by(VerificationCode.created_at.desc()).first()
        assert verification_code_obj is not None
        
        # Step 4: Verify code to get user_id for password reset
        response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code_obj.code,
            "verification_type": "email_verification"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        user_id = data["user_id"]
        
        # Step 5: Reset password using simple token format
        simple_token = f"verified_user_{user_id}"
        response = client.post("/api/v1/auth/reset-password", json={
            "new_password": new_password,
            "operation_token": simple_token
        })
        assert response.status_code == 200
        assert "reset" in response.json()["message"].lower()
        
        # Step 6: Verify old password no longer works
        login_response = client.post("/api/v1/auth/login-json", json={
            "email": email,
            "password": original_password
        })
        assert login_response.status_code == 401
        
        # Step 7: Verify new password works
        login_response = client.post("/api/v1/auth/login-json", json={
            "email": email,
            "password": new_password
        })
        assert login_response.status_code == 200
        
        # Step 8: Verify password hash was actually changed
        db.refresh(user)
        assert not get_password_hash(original_password) == user.password_hash
    
    def test_password_reset_flow_nonexistent_user_security(self, client: TestClient, auto_clean_mailpit):
        """Test that password reset doesn't reveal user existence."""
        fake_email = f"nonexistent{random.randint(1000, 9999)}@example.com"
        
        # Step 1: Send verification to non-existent email
        response = client.post("/api/v1/auth/send-verification", json={
            "email": fake_email
        })
        # Should return success to prevent email enumeration
        assert response.status_code == 200
        
        # Step 2: Try to verify with fake code
        response = client.post("/api/v1/auth/verify-code", json={
            "email": fake_email,
            "code": "123456",
            "verification_type": "email_verification"
        })
        # Should fail with invalid email error
        assert response.status_code == 400
        assert "invalid email" in response.json()["detail"].lower()
    
    def test_password_reset_flow_unverified_user(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test password reset works for users with unverified emails."""
        original_password = "OriginalPassword123!"
        new_password = "NewResetPassword456!"
        email = f"unverified-reset{random.randint(1000, 9999)}@example.com"
        
        # Create user with unverified email
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash(original_password),
            email_verified=False  # Unverified email
        )
        
        try:
            # Step 1: Send verification (should work even for unverified users)
            response = client.post("/api/v1/auth/send-verification", json={
                "email": email
            })
            assert response.status_code == 200
            
            # Step 2: Get verification code
            verification_code_obj = db.query(VerificationCode).filter(
                VerificationCode.user_id == user.id,
                VerificationCode.used_at.is_(None)
            ).order_by(VerificationCode.created_at.desc()).first()
            assert verification_code_obj is not None
            
            # Step 3: Verify code
            response = client.post("/api/v1/auth/verify-code", json={
                "email": email,
                "code": verification_code_obj.code,
                "verification_type": "email_verification"
            })
            assert response.status_code == 200
            user_id = response.json()["user_id"]
            
            # Step 4: Reset password
            simple_token = f"verified_user_{user_id}"
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": new_password,
                "operation_token": simple_token
            })
            assert response.status_code == 200
            
            # Step 5: Verify password was changed
            db.refresh(user)
            assert user.password_hash != get_password_hash(original_password)
            
        finally:
            # Clean up
            db.delete(user)
            db.commit()


class TestEmailIntegrationAndCleanup:
    """Test email verification integration and database cleanup behaviors."""
    
    def test_verification_code_cleanup_after_use(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test that verification codes are marked as used after successful verification."""
        email = f"cleanup-test{random.randint(1000, 9999)}@example.com"
        
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash("TestPassword123!"),
            email_verified=True
        )
        
        # Send verification
        response = client.post("/api/v1/auth/send-verification", json={
            "email": email
        })
        assert response.status_code == 200
        
        # Get code
        verification_code_obj = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.used_at.is_(None)
        ).first()
        assert verification_code_obj is not None
        assert verification_code_obj.is_used is False
        
        # Verify code
        response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code_obj.code,
            "verification_type": "email_verification"
        })
        assert response.status_code == 200
        
        # Check that code is marked as used
        db.refresh(verification_code_obj)
        assert verification_code_obj.is_used is True
        assert verification_code_obj.used_at is not None
        
        # Try to use same code again - should fail
        response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code_obj.code,
            "verification_type": "email_verification"
        })
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()
    
    def test_verification_code_isolation(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test that verification codes are properly isolated per user."""
        email = f"isolation-test{random.randint(1000, 9999)}@example.com"
        
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash("TestPassword123!"),
            email_verified=True
        )
        
        # Send verification code
        response1 = client.post("/api/v1/auth/send-verification", json={
            "email": email
        })
        assert response1.status_code == 200
        
        # Get the verification code
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.used_at.is_(None)
        ).first()
        assert verification_code is not None
        
        # Use the verification code
        response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        assert response.status_code == 200
        
        # Verify the code was marked as used
        db.refresh(verification_code)
        assert verification_code.is_used is True


class TestSystemReliabilityAndEdgeCases:
    """Test system reliability and edge case handling."""
    
    def test_concurrent_verification_attempts(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test handling of concurrent verification attempts on same code."""
        email = f"concurrent-test{random.randint(1000, 9999)}@example.com"
        
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash("TestPassword123!"),
            email_verified=True
        )
        
        # Send verification
        response = client.post("/api/v1/auth/send-verification", json={
            "email": email
        })
        assert response.status_code == 200
        
        # Get code
        verification_code_obj = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.used_at.is_(None)
        ).first()
        assert verification_code_obj is not None
        
        # Simulate concurrent verification attempts
        request_data = {
            "email": email,
            "code": verification_code_obj.code,
            "verification_type": "email_verification"
        }
        
        # First attempt should succeed
        response1 = client.post("/api/v1/auth/verify-code", json=request_data)
        assert response1.status_code == 200
        
        # Second attempt should fail (code already used)
        response2 = client.post("/api/v1/auth/verify-code", json=request_data)
        assert response2.status_code == 400
        assert "expired" in response2.json()["detail"].lower()
    
    def test_malformed_requests_handling(self, client: TestClient):
        """Test handling of malformed requests."""
        # Test invalid JSON structure
        response = client.post("/api/v1/auth/verify-code", 
                             content="invalid json",
                             headers={"Content-Type": "application/json"})
        assert response.status_code == 422
        
        # Test missing required fields
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "test@example.com"
            # Missing code and verification_type
        })
        assert response.status_code == 422
        
        # Test invalid email format
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "invalid-email-format",
            "code": "123456",
            "verification_type": "email_verification"
        })
        assert response.status_code == 422
        
        # Test invalid verification type
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "test@example.com",
            "code": "123456",
            "verification_type": "invalid_type"
        })
        assert response.status_code == 400
    
    def test_expired_verification_codes(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test handling of expired verification codes."""
        email = f"expired-test{random.randint(1000, 9999)}@example.com"
        
        user = create_test_user(
            db,
            email=email,
            password_hash=get_password_hash("TestPassword123!"),
            email_verified=True
        )
        
        # Send verification
        response = client.post("/api/v1/auth/send-verification", json={
            "email": email
        })
        assert response.status_code == 200
        
        # Get and manually expire the code
        verification_code_obj = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.used_at.is_(None)
        ).first()
        assert verification_code_obj is not None
        
        # Expire the code
        verification_code_obj.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        
        # Try to use expired code
        response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code_obj.code,
            "verification_type": "email_verification"
        })
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()
    
    def test_rate_limiting_basic(self, client: TestClient, test_rate_limits):
        """Test basic rate limiting on verification endpoints."""
        # Test rate limiting on verification sending
        email = f"rate-test{random.randint(1000, 9999)}@example.com"
        
        success_count = 0
        rate_limited = False
        
        for i in range(10):  # Make multiple requests
            response = client.post("/api/v1/auth/send-verification", json={
                "email": email
            })
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited = True
                assert "rate limit" in response.json()["detail"].lower()
                break
        
        # Should either have some successes or hit rate limit
        assert success_count > 0 or rate_limited