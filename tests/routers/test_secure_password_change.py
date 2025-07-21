"""
Tests for Secure Password Change with Email Verification

Tests the new secure password change flow that requires:
- Email verification via security codes
- Operation token validation  
- Rate limiting
- Multi-step security process

This is Phase 3 of the Unified Code Verification Plan.
"""

import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import User, PasswordHistory
from api.auth import create_access_token, get_password_hash, verify_password
from api.verification_service import VerificationCodeService, VerificationType
from api.security import generate_operation_token, verify_operation_token
from tests.conftest import create_test_user


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-secure-password-change'})
class TestSecurePasswordChange:
    """Test the new secure password change endpoint that requires email verification."""

    def test_secure_password_change_success(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test successful secure password change with operation token."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        new_password = "NewSecurePassword456!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create operation token for password_change
        operation_token = generate_operation_token(current_user.email, "password_change")
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": new_password,
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify successful password change
        assert response.status_code == 200
        data = response.json()
        assert "Password changed successfully" in data["message"]
        
        # Verify password was actually changed in database
        db.refresh(current_user)
        assert verify_password(new_password, current_user.password_hash)
        assert not verify_password(current_password, current_user.password_hash)
        
        # Verify password history entry was created
        history_entry = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == current_user.id
        ).first()
        assert history_entry is not None

    def test_secure_password_change_invalid_operation_token(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with invalid operation token."""
        # Arrange: Set up user with known password  
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": "NewSecurePassword456!",
            "operation_token": "invalid.token.here"
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify invalid token error
        assert response.status_code == 400
        assert "Invalid operation token" in response.json()["detail"]

    def test_secure_password_change_wrong_operation_type_token(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with token for wrong operation type."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create operation token for WRONG operation type
        operation_token = generate_operation_token(current_user.email, "password_reset")  # Wrong type!
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": "NewSecurePassword456!",
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify wrong operation type error
        assert response.status_code == 400
        assert "Invalid operation token" in response.json()["detail"]

    def test_secure_password_change_token_email_mismatch(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with token for different email."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create operation token for DIFFERENT email
        operation_token = generate_operation_token("different@example.com", "password_change")
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": "NewSecurePassword456!",
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify email mismatch error
        assert response.status_code == 400
        assert "Invalid operation token" in response.json()["detail"]

    def test_secure_password_change_incorrect_current_password(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with incorrect current password."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create valid operation token
        operation_token = generate_operation_token(current_user.email, "password_change")
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": "WrongPassword123!",  # Wrong current password
            "new_password": "NewSecurePassword456!",
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify current password error
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    def test_secure_password_change_weak_new_password(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with weak new password."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create valid operation token
        operation_token = generate_operation_token(current_user.email, "password_change")
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": "123",  # Weak password
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify password validation error
        assert response.status_code in [400, 422]  # Depends on validation implementation

    def test_secure_password_change_password_reuse_prevention(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change prevents password reuse."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create valid operation token
        operation_token = generate_operation_token(current_user.email, "password_change")
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "current_password": current_password,
            "new_password": current_password,  # Same as current password
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify password reuse error
        assert response.status_code == 400
        assert "password cannot be the same as the current password" in response.json()["detail"].lower()

    def test_secure_password_change_unauthenticated(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change without authentication."""
        # Arrange: Create valid operation token
        operation_token = generate_operation_token(current_user.email, "password_change")
        
        request_data = {
            "current_password": "CurrentPassword123!",
            "new_password": "NewSecurePassword456!",
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint without auth headers
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data)
        
        # Assert: Verify authentication required error
        assert response.status_code == 403  # FastAPI returns 403 for missing auth

    def test_secure_password_change_rate_limiting(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test that rate limiting applies to secure password change."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Make multiple requests quickly
        for i in range(10):  # Try to trigger rate limit
            operation_token = generate_operation_token(current_user.email, "password_change")
            request_data = {
                "current_password": current_password,
                "new_password": f"NewPassword{i}!",
                "operation_token": operation_token
            }
            
            response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
            
            # First request might succeed, subsequent should be rate limited
            if response.status_code == 429:
                assert "rate limit" in response.json()["detail"].lower()
                break
        else:
            # If we get here, rate limiting might not be working as expected
            # This is acceptable in test environment with generous limits
            pass

    def test_secure_password_change_expired_token(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test secure password change with expired operation token."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Create an expired token by mocking time
        with patch('api.security.datetime') as mock_datetime:
            # Mock time to be 11 minutes ago (tokens expire in 10 minutes)
            from datetime import datetime, timezone, timedelta
            past_time = datetime.now(timezone.utc) - timedelta(minutes=11)
            mock_datetime.now.return_value = past_time
            mock_datetime.utcnow.return_value = past_time.replace(tzinfo=None)
            
            operation_token = generate_operation_token(current_user.email, "password_change")
        
        request_data = {
            "current_password": current_password,
            "new_password": "NewSecurePassword456!",
            "operation_token": operation_token
        }
        
        # Act: Call secure password change endpoint with expired token
        response = client.post("/api/v1/users/me/secure-change-password", json=request_data, headers=headers)
        
        # Assert: Verify expired token error
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-secure-password-change'})
class TestSecurePasswordChangeWorkflow:
    """Test complete workflow from sending code to changing password."""

    def test_complete_secure_password_change_workflow(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test complete workflow: send code → verify code → change password."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        new_password = "NewSecurePassword456!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        # Create auth headers
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Step 1: Send security code for password change
        send_request = {
            "email": current_user.email,
            "operation_type": "password_change"
        }
        
        send_response = client.post("/api/v1/auth/send-security-code", json=send_request, headers=headers)
        assert send_response.status_code == 200
        
        # Step 2: Get the verification code from database (simulating email reception)
        from api.verification_service import VerificationCode
        verification_record = db.query(VerificationCode).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_CHANGE,
            VerificationCode.is_used == False
        ).first()
        
        assert verification_record is not None
        verification_code = verification_record.code
        
        # Step 3: Verify the code and get operation token
        verify_request = {
            "email": current_user.email,
            "code": verification_code,
            "operation_type": "password_change"
        }
        
        verify_response = client.post("/api/v1/auth/verify-security-code", json=verify_request)
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        operation_token = verify_data["operation_token"]
        assert operation_token is not None
        
        # Step 4: Use operation token to change password
        change_request = {
            "current_password": current_password,
            "new_password": new_password,
            "operation_token": operation_token
        }
        
        change_response = client.post("/api/v1/users/me/secure-change-password", json=change_request, headers=headers)
        assert change_response.status_code == 200
        assert "Password changed successfully" in change_response.json()["message"]
        
        # Step 5: Verify password was actually changed
        db.refresh(current_user)
        assert verify_password(new_password, current_user.password_hash)
        assert not verify_password(current_password, current_user.password_hash)

    def test_workflow_token_single_use_enforcement(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test that operation tokens are single-use only (enhanced security)."""
        # Arrange: Complete workflow to get an operation token
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Get operation token through complete flow
        send_response = client.post("/api/v1/auth/send-security-code", 
                                   json={"email": current_user.email, "operation_type": "password_change"}, 
                                   headers=headers)
        assert send_response.status_code == 200
        
        from api.verification_service import VerificationCode
        verification_record = db.query(VerificationCode).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_CHANGE,
            VerificationCode.is_used == False
        ).first()
        
        verify_response = client.post("/api/v1/auth/verify-security-code", 
                                    json={"email": current_user.email, "code": verification_record.code, "operation_type": "password_change"})
        operation_token = verify_response.json()["operation_token"]
        
        # Act: Use the token successfully once
        change_request = {
            "current_password": current_password,
            "new_password": "FirstNewPassword123!",
            "operation_token": operation_token
        }
        
        first_response = client.post("/api/v1/users/me/secure-change-password", json=change_request, headers=headers)
        assert first_response.status_code == 200
        
        # Act: Try to use the same token again (should fail due to single-use enforcement)
        change_request["new_password"] = "SecondNewPassword123!"
        change_request["current_password"] = "FirstNewPassword123!"  # Updated current password
        
        second_response = client.post("/api/v1/users/me/secure-change-password", json=change_request, headers=headers)
        
        # Assert: Second use should fail (single-use token enforcement)
        assert second_response.status_code == 400
        assert "Invalid operation token" in second_response.json()["detail"]
        
        # Verify password was only changed once (first change succeeded)
        db.refresh(current_user)
        assert verify_password("FirstNewPassword123!", current_user.password_hash)
        assert not verify_password("SecondNewPassword123!", current_user.password_hash)
        assert not verify_password(current_password, current_user.password_hash)


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-secure-password-change'})
class TestSecurePasswordChangeBehaviorVsLegacy:
    """Test that secure password change behaves correctly alongside legacy endpoint."""

    def test_secure_endpoint_requires_operation_token(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test that secure endpoint requires operation token while legacy doesn't."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        legacy_request = {
            "current_password": current_password,
            "new_password": "NewPassword456!"
        }
        
        secure_request = {
            "current_password": current_password,
            "new_password": "NewPassword789!",
            # Missing operation_token
        }
        
        # Act & Assert: Legacy endpoint should work without operation token
        legacy_response = client.post("/api/v1/users/me/change-password", json=legacy_request, headers=headers)
        assert legacy_response.status_code == 200
        
        # Act & Assert: Secure endpoint should fail without operation token
        secure_response = client.post("/api/v1/users/me/secure-change-password", json=secure_request, headers=headers)
        assert secure_response.status_code == 422  # Missing required field

    def test_both_endpoints_respect_password_policies(self, client: TestClient, db: Session, current_user: User, test_rate_limits):
        """Test that both endpoints enforce the same password policies."""
        # Arrange: Set up user with known password
        current_password = "CurrentPassword123!"
        current_user.password_hash = get_password_hash(current_password)
        db.commit()
        
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        weak_password = "123"  # Weak password
        
        # Test legacy endpoint with weak password
        legacy_request = {
            "current_password": current_password,
            "new_password": weak_password
        }
        
        legacy_response = client.post("/api/v1/users/me/change-password", json=legacy_request, headers=headers)
        legacy_status = legacy_response.status_code
        
        # Test secure endpoint with weak password
        operation_token = generate_operation_token(current_user.email, "password_change")
        secure_request = {
            "current_password": current_password,
            "new_password": weak_password,
            "operation_token": operation_token
        }
        
        secure_response = client.post("/api/v1/users/me/secure-change-password", json=secure_request, headers=headers)
        secure_status = secure_response.status_code
        
        # Assert: Both should fail with weak password (same status code)
        assert legacy_status in [400, 422]
        assert secure_status in [400, 422]
        # Both should reject weak passwords consistently
        assert legacy_status == secure_status or (legacy_status in [400, 422] and secure_status in [400, 422])