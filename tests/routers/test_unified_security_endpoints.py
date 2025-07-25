"""
Tests for Unified Security Code Endpoints

Tests the new unified security code sending and verification endpoints
that support multiple operation types (password_change, password_reset, etc.)
"""

import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from api.verification_service import VerificationCodeService, VerificationType, VerificationCode
from api.database import User
from api.auth import create_access_token


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-unified-endpoints'})
class TestSendSecurityCodeEndpoint:
    """Test the /send-security-code endpoint."""

    def test_send_security_code_password_change_authenticated(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test sending security code for password change (requires authentication)."""
        # Create access token for authentication
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "email": current_user.email,
            "operation_type": "password_change"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "Verification code sent to" in data["message"]
        assert current_user.email in data["message"]
        
        # Verify code was created in database
        verification_code = db.query(
            VerificationCode
        ).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_CHANGE
        ).first()
        
        assert verification_code is not None
        assert verification_code.is_used is False

    def test_send_security_code_password_change_unauthenticated(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test that password change requires authentication."""
        request_data = {
            "email": current_user.email,
            "operation_type": "password_change"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data)
        
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]

    def test_send_security_code_password_change_wrong_email(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test that authenticated user cannot change password for different email."""
        # Create access token for authentication
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        request_data = {
            "email": "different@example.com",
            "operation_type": "password_change"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data, headers=headers)
        
        assert response.status_code == 403
        assert "Cannot change password for different email" in response.json()["detail"]

    def test_send_security_code_password_reset_existing_user(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test sending security code for password reset (no authentication required)."""
        request_data = {
            "email": current_user.email,
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "Verification code sent to" in data["message"]
        
        # Verify code was created in database
        verification_code = db.query(
            VerificationCode
        ).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_RESET
        ).first()
        
        assert verification_code is not None
        assert verification_code.is_used is False

    def test_send_security_code_password_reset_nonexistent_user(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test password reset for non-existent user (should not reveal if email exists)."""
        request_data = {
            "email": "nonexistent@example.com",
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data)
        
        # Should return success to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert "If an account with that email exists" in data["message"]


    def test_send_security_code_invalid_operation_type(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test sending security code with invalid operation type."""
        request_data = {
            "email": current_user.email,
            "operation_type": "invalid_operation"
        }
        
        response = client.post("/api/v1/auth/send-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid operation type" in response.json()["detail"]

    def test_send_security_code_rate_limiting(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test that rate limiting applies to security code sending."""
        request_data = {
            "email": current_user.email,
            "operation_type": "password_reset"
        }
        
        # First request should succeed
        response1 = client.post("/api/v1/auth/send-security-code", json=request_data)
        assert response1.status_code == 200
        
        # Second request immediately should fail due to rate limiting
        response2 = client.post("/api/v1/auth/send-security-code", json=request_data)
        assert response2.status_code == 429  # Too Many Requests


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-unified-endpoints'})
class TestVerifySecurityCodeEndpoint:
    """Test the /verify-security-code endpoint."""

    def test_verify_security_code_success(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test successful security code verification."""
        # First, create a verification code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=current_user.id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        request_data = {
            "email": current_user.email,
            "code": code,
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "operation_token" in data
        assert "expires_in" in data
        assert data["expires_in"] == 600  # 10 minutes
        
        # Verify the token is valid by checking it's a JWT-like string
        token = data["operation_token"]
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # JWT has 3 parts

    def test_verify_security_code_invalid_code(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test verification with invalid code."""
        request_data = {
            "email": current_user.email,
            "code": "999999",  # Invalid code
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid verification code" in response.json()["detail"]

    def test_verify_security_code_wrong_operation_type(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test verification with wrong operation type."""
        # Create code for password_reset
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=current_user.id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        # Try to verify with different operation type
        request_data = {
            "email": current_user.email,
            "code": code,
            "operation_type": "password_change"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid verification code" in response.json()["detail"]

    def test_verify_security_code_nonexistent_user(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test verification for non-existent user."""
        request_data = {
            "email": "nonexistent@example.com",
            "code": "123456",
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid email address" in response.json()["detail"]

    def test_verify_security_code_invalid_operation_type(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test verification with invalid operation type."""
        request_data = {
            "email": current_user.email,
            "code": "123456",
            "operation_type": "invalid_operation"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "Invalid operation type" in response.json()["detail"]

    def test_verify_security_code_expired_code(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test verification with expired code."""
        # Create and manually expire a code
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=current_user.id, verification_type=VerificationType.PASSWORD_RESET
        )
        
        # Manually expire the code
        from datetime import datetime, timezone, timedelta
        verification_code = db.query(
            VerificationCode
        ).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.code == code
        ).first()
        
        # Set expiration to the past
        if verification_code.expires_at.tzinfo is None:
            # SQLite - use timezone-naive datetime
            verification_code.expires_at = datetime.now() - timedelta(minutes=1)
        else:
            # PostgreSQL - use timezone-aware datetime
            verification_code.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        
        request_data = {
            "email": current_user.email,
            "code": code,
            "operation_type": "password_reset"
        }
        
        response = client.post("/api/v1/auth/verify-security-code", json=request_data)
        
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()


@patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key-for-unified-endpoints'})
class TestUnifiedSecurityEndpointsIntegration:
    """Test integration between send and verify endpoints."""

    def test_complete_password_change_flow(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test complete flow from sending code to verifying it for password change."""
        # Create access token for authentication
        access_token = create_access_token(data={"sub": str(current_user.id)})
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Step 1: Send security code
        send_request = {
            "email": current_user.email,
            "operation_type": "password_change"
        }
        
        send_response = client.post("/api/v1/auth/send-security-code", json=send_request, headers=headers)
        assert send_response.status_code == 200
        
        # Step 2: Get the code from database (in real scenario, user gets it from email)
        verification_code_record = db.query(
            VerificationCode
        ).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_CHANGE,
            VerificationCode.is_used == False
        ).first()
        
        assert verification_code_record is not None
        code = verification_code_record.code
        
        # Step 3: Verify the code
        verify_request = {
            "email": current_user.email,
            "code": code,
            "operation_type": "password_change"
        }
        
        verify_response = client.post("/api/v1/auth/verify-security-code", json=verify_request)
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        assert "operation_token" in verify_data
        assert verify_data["expires_in"] == 600

    def test_complete_password_reset_flow(self, client: TestClient, db: Session, current_user: User, test_rate_limits, auto_clean_mailpit):
        """Test complete flow from sending code to verifying it for password reset."""
        # Step 1: Send security code (no authentication required)
        send_request = {
            "email": current_user.email,
            "operation_type": "password_reset"
        }
        
        send_response = client.post("/api/v1/auth/send-security-code", json=send_request)
        assert send_response.status_code == 200
        
        # Step 2: Get the code from database
        verification_code_record = db.query(
            VerificationCode
        ).filter(
            VerificationCode.user_id == current_user.id,
            VerificationCode.verification_type == VerificationType.PASSWORD_RESET,
            VerificationCode.is_used == False
        ).first()
        
        assert verification_code_record is not None
        code = verification_code_record.code
        
        # Step 3: Verify the code
        verify_request = {
            "email": current_user.email,
            "code": code,
            "operation_type": "password_reset"
        }
        
        verify_response = client.post("/api/v1/auth/verify-security-code", json=verify_request)
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        assert "operation_token" in verify_data
        assert verify_data["expires_in"] == 600