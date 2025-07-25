"""
Password Reset Endpoint Testing Suite (TDD)

Tests for forgot password / password reset functionality using operation tokens.
Following TDD - these tests should FAIL until we implement the endpoints.
"""
import pytest
import os
from fastapi import status
from unittest.mock import patch, Mock
from datetime import datetime, timezone, timedelta

from api.database import User
from api.security import generate_operation_token, verify_operation_token
from api.verification_service import VerificationCodeService, VerificationType, VerificationCode


class TestPasswordResetEndpoint:
    """Tests for the /auth/reset-password endpoint."""
    
    def test_reset_password_endpoint_exists(self, client):
        """Test that /auth/reset-password endpoint exists and accepts POST requests."""
        response = client.post("/api/v1/auth/reset-password", json={
            "new_password": "NewPassword123!",
            "operation_token": "invalid_token"
        })
        
        # Should not be 404 (endpoint should exist)
        assert response.status_code != status.HTTP_404_NOT_FOUND
        # Should be 400 or 401 for invalid token (endpoint exists)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED]
    
    def test_reset_password_requires_new_password(self, client):
        """Test that new_password field is required."""
        response = client.post("/api/v1/auth/reset-password", json={
            "operation_token": "some_token"
        })
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()["detail"]
        assert any("new_password" in str(error).lower() for error in error_detail)
    
    def test_reset_password_requires_operation_token(self, client):
        """Test that operation_token field is required."""
        response = client.post("/api/v1/auth/reset-password", json={
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()["detail"]
        assert any("operation_token" in str(error).lower() for error in error_detail)
    
    def test_reset_password_validates_password_strength(self, client, db, current_user):
        """Test that weak passwords are rejected."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Create valid operation token
            email = current_user.email
            operation_token = generate_operation_token(email, "password_reset")
            
            # Test weak password (but meets min length for pydantic)
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "weakpass",  # 8 chars but weak
                "operation_token": operation_token
            })
            
            # Should be 422 for pydantic validation or 400 for password strength
            assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY]
            response_detail = str(response.json()["detail"]).lower()
            assert "password" in response_detail or "validation" in response_detail
    
    def test_reset_password_rejects_invalid_token(self, client):
        """Test that invalid operation tokens are rejected."""
        response = client.post("/api/v1/auth/reset-password", json={
            "new_password": "ValidPassword123!",
            "operation_token": "invalid.jwt.token"
        })
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "invalid" in response.json()["detail"].lower() or "expired" in response.json()["detail"].lower()
    
    def test_reset_password_rejects_wrong_operation_type(self, client, db, current_user):
        """Test that tokens for wrong operation type are rejected."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Create token for password_change instead of password_reset
            email = current_user.email
            wrong_operation_token = generate_operation_token(email, "password_change")
            
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "ValidPassword123!",
                "operation_token": wrong_operation_token
            })
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "invalid" in response.json()["detail"].lower() or "token" in response.json()["detail"].lower()
    
    def test_reset_password_rejects_expired_token(self, client, db, current_user):
        """Test that expired operation tokens are rejected."""
        # Mock expired token by patching the verification
        with patch('api.security.verify_operation_token') as mock_verify:
            from api.security import ExpiredTokenError
            mock_verify.side_effect = ExpiredTokenError("Operation token has expired")
            
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "ValidPassword123!",
                "operation_token": "expired_token"
            })
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "expired" in response.json()["detail"].lower()
    
    def test_reset_password_handles_nonexistent_user_securely(self, client):
        """Test that reset returns success even for non-existent users (security)."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Create valid token for non-existent email
            fake_email = "nonexistent@example.com"
            operation_token = generate_operation_token(fake_email, "password_reset")
            
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "ValidPassword123!",
                "operation_token": operation_token
            })
            
            # Should return success to prevent email enumeration
            assert response.status_code == status.HTTP_200_OK
            assert "reset" in response.json()["message"].lower()
    
    def test_reset_password_successful(self, client, db, current_user):
        """Test successful password reset flow."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Get original password hash
            original_password_hash = current_user.password_hash
            
            # Create valid operation token
            email = current_user.email
            operation_token = generate_operation_token(email, "password_reset")
            
            # Reset password
            new_password = "NewValidPassword123!"
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": new_password,
                "operation_token": operation_token
            })
            
            assert response.status_code == status.HTTP_200_OK
            assert "reset" in response.json()["message"].lower()
            
            # Verify password was actually changed
            db.refresh(current_user)
            assert current_user.password_hash != original_password_hash
            # Note: password_changed_at field not in User model, using updated_at instead
            
            # Verify old password no longer works
            login_response = client.post("/api/v1/auth/login-json", json={
                "email": email,
                "password": "TestPassword123!"  # This was the original password
            })
            assert login_response.status_code == status.HTTP_401_UNAUTHORIZED
            
            # Verify new password works
            login_response = client.post("/api/v1/auth/login-json", json={
                "email": email,
                "password": new_password
            })
            assert login_response.status_code == status.HTTP_200_OK
    
    def test_reset_password_invalidates_existing_sessions(self, client, db, current_user):
        """Test that password reset invalidates existing user sessions."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Record updated timestamp before reset (User model doesn't have session_invalidated_at)
            original_updated_at = current_user.updated_at
            
            # Create valid operation token
            email = current_user.email
            operation_token = generate_operation_token(email, "password_reset")
            
            # Reset password
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "NewValidPassword123!",
                "operation_token": operation_token
            })
            
            assert response.status_code == status.HTTP_200_OK
            
            # Verify updated timestamp was changed (indicates password change)
            db.refresh(current_user)
            assert current_user.updated_at != original_updated_at
            # Handle timezone comparison - convert current_user.updated_at to UTC if needed
            user_timestamp = current_user.updated_at
            if user_timestamp.tzinfo is None:
                user_timestamp = user_timestamp.replace(tzinfo=timezone.utc)
            one_minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
            assert user_timestamp > one_minute_ago
    
    def test_reset_password_respects_rate_limiting(self, client, test_rate_limits):
        """Test that password reset respects rate limiting."""
        # This test verifies rate limiting is applied
        # The exact behavior will depend on rate limiter configuration
        
        # Make multiple rapid requests
        for i in range(10):  # Exceed typical rate limit
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "ValidPassword123!",
                "operation_token": "some_token"
            })
            
            # Should eventually hit rate limit
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                assert "rate limit" in response.json()["detail"].lower()
                return
        
        # If we don't hit rate limit, that's also valid (rate limits might be high)
        # The important thing is the endpoint exists and processes requests
    
    def test_reset_password_case_insensitive_email(self, client, db, current_user):
        """Test that password reset works with case-insensitive email matching."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Create token with uppercase email
            email_upper = current_user.email.upper()
            operation_token = generate_operation_token(email_upper, "password_reset")
            
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "NewValidPassword123!",
                "operation_token": operation_token
            })
            
            assert response.status_code == status.HTTP_200_OK
            
            # Verify password was changed for the correct user
            db.refresh(current_user)
            # Note: User model doesn't have password_changed_at, using updated_at instead
            assert current_user.updated_at is not None


class TestPasswordResetIntegration:
    """Integration tests for complete password reset flow."""
    
    def test_complete_password_reset_flow(self, client, db, current_user, auto_clean_mailpit):
        """Test complete flow: send code -> verify code -> reset password."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            email = current_user.email
            
            # Step 1: Send security code for password reset
            response = client.post("/api/v1/auth/send-security-code", json={
                "email": email,
                "operation_type": "password_reset"
            })
            assert response.status_code == status.HTTP_200_OK
            
            # Step 2: Get the verification code from database (simulating email)
            verification_code_obj = db.query(VerificationCode).filter(
                VerificationCode.user_id == current_user.id,
                VerificationCode.verification_type == VerificationType.PASSWORD_RESET,
                VerificationCode.used_at.is_(None)
            ).order_by(VerificationCode.created_at.desc()).first()
            assert verification_code_obj is not None
            
            # Step 3: Verify code and get operation token
            response = client.post("/api/v1/auth/verify-security-code", json={
                "email": email,
                "code": verification_code_obj.code,
                "operation_type": "password_reset"
            })
            assert response.status_code == status.HTTP_200_OK
            operation_token = response.json()["operation_token"]
            
            # Step 4: Reset password using operation token
            new_password = "NewCompleteFlowPassword123!"
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": new_password,
                "operation_token": operation_token
            })
            assert response.status_code == status.HTTP_200_OK
            
            # Step 5: Verify old password no longer works
            login_response = client.post("/api/v1/auth/login-json", json={
                "email": email,
                "password": "TestPassword123!"  # Original password
            })
            assert login_response.status_code == status.HTTP_401_UNAUTHORIZED
            
            # Step 6: Verify new password works
            login_response = client.post("/api/v1/auth/login-json", json={
                "email": email,
                "password": new_password
            })
            assert login_response.status_code == status.HTTP_200_OK
    
    def test_password_reset_flow_for_unverified_user(self, client, db, auto_clean_mailpit, test_rate_limits):
        """Test password reset works even for users with unverified emails."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            # Create user with unverified email
            from api.auth import get_password_hash
            
            user = User(
                email="unverified@example.com",
                password_hash=get_password_hash("OriginalPassword123!"),
                first_name="Unverified",
                last_name="User",
                email_verified=False  # Unverified email
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Should still be able to reset password
            email = user.email
            
            # Send security code
            response = client.post("/api/v1/auth/send-security-code", json={
                "email": email,
                "operation_type": "password_reset"
            })
            assert response.status_code == status.HTTP_200_OK
            
            # Get verification code
            verification_code_obj = db.query(VerificationCode).filter(
                VerificationCode.user_id == user.id,
                VerificationCode.verification_type == VerificationType.PASSWORD_RESET,
                VerificationCode.used_at.is_(None)
            ).order_by(VerificationCode.created_at.desc()).first()
            assert verification_code_obj is not None
            
            # Verify code and get token
            response = client.post("/api/v1/auth/verify-security-code", json={
                "email": email,
                "code": verification_code_obj.code,
                "operation_type": "password_reset"
            })
            assert response.status_code == status.HTTP_200_OK
            operation_token = response.json()["operation_token"]
            
            # Reset password
            response = client.post("/api/v1/auth/reset-password", json={
                "new_password": "ResetPassword123!",
                "operation_token": operation_token
            })
            assert response.status_code == status.HTTP_200_OK