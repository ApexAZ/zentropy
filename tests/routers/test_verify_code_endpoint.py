"""
Tests for /api/v1/auth/verify-code endpoint

Tests the new verification code endpoint that replaces URL-based email verification
with secure 6-digit numeric codes.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
import random

from api.main import app
from api.database import User
from api.verification_service import VerificationCode, VerificationType, VerificationCodeService


class TestVerifyCodeEndpoint:
    """Test the /api/v1/auth/verify-code endpoint."""

    def test_verify_code_success(self, client: TestClient, db: Session, test_rate_limits):
        """Test successful email verification with valid code."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-success{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Success",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user (creates verification code)
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get user and verification code from database
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.email_verified is False
        
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        assert verification_code is not None
        
        # Verify the code
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is True
        assert data["message"] == "Email verified successfully"
        assert data["user_id"] == str(user.id)
        
        # User should now be verified
        db.refresh(user)
        assert user.email_verified is True

    def test_verify_code_invalid_email(self, client: TestClient):
        """Test verification with non-existent email."""
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": "nonexistent@example.com",
            "code": "123456",
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "Invalid email address" in data["detail"]

    def test_verify_code_invalid_code(self, client: TestClient, db: Session, test_rate_limits):
        """Test verification with invalid code."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-invalid{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Invalid",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Try to verify with wrong code
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": "999999",
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "Invalid verification code" in data["detail"]

    def test_verify_code_expired(self, client: TestClient, db: Session, test_rate_limits):
        """Test verification with expired code."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-expired{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Expired",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get user and expire their verification code
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Manually expire the code
        from datetime import datetime, timezone, timedelta
        verification_code.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        
        # Try to verify with expired code
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "expired" in data["detail"].lower()

    def test_verify_code_already_used(self, client: TestClient, db: Session, test_rate_limits):
        """Test verification with already used code."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-used{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Used",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get verification code
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Use the code once
        verify_response1 = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        assert verify_response1.status_code == 200
        
        # Try to use it again
        verify_response2 = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response2.status_code == 400
        data = verify_response2.json()
        assert "already been used" in data["detail"]

    def test_verify_code_max_attempts(self, client: TestClient, db: Session, test_rate_limits):
        """Test verification with too many failed attempts."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-attempts{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Attempts",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get verification code
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Make maximum allowed attempts with wrong code (3 for email verification)
        for i in range(3):
            verify_response = client.post("/api/v1/auth/verify-code", json={
                "email": email,
                "code": "000000",
                "verification_type": "email_verification"
            })
            assert verify_response.status_code == 400
        
        # Try with correct code - should fail due to exceeded attempts
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "maximum" in data["detail"].lower() and "attempts" in data["detail"].lower()

    def test_verify_code_wrong_verification_type(self, client: TestClient, db: Session, test_rate_limits):
        """Test verification with wrong verification type."""
        # Create a test user
        random_id = random.randint(1000, 9999)
        email = f"verify-wrongtype{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "WrongType",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get verification code (which is for email verification)
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Try to verify with wrong verification type
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "password_reset"  # Wrong type
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "Invalid verification code" in data["detail"]

    def test_verify_code_validation_errors(self, client: TestClient):
        """Test verification with invalid request data."""
        # Missing email
        response = client.post("/api/v1/auth/verify-code", json={
            "code": "123456",
            "verification_type": "email_verification"
        })
        assert response.status_code == 422
        
        # Missing code
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "test@example.com",
            "verification_type": "email_verification"
        })
        assert response.status_code == 422
        
        # Invalid verification_type (since we have a default, test with invalid value)
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "test@example.com",
            "code": "123456",
            "verification_type": "invalid_type"
        })
        assert response.status_code == 400
        
        # Invalid email format
        response = client.post("/api/v1/auth/verify-code", json={
            "email": "invalid-email",
            "code": "123456",
            "verification_type": "email_verification"
        })
        assert response.status_code == 422

    def test_verify_code_integrates_with_login(self, client: TestClient, db: Session, test_rate_limits):
        """Test that verified users can successfully log in."""
        # Create and verify a user
        random_id = random.randint(1000, 9999)
        email = f"verify-login{random_id}@example.com"
        password = "SecurePass123!"
        user_data = {
            "email": email,
            "password": password,
            "first_name": "Verify",
            "last_name": "Login",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get and verify code
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email,
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        assert verify_response.status_code == 200
        
        # Now login should work
        login_response = client.post("/api/v1/auth/login-json", json={
            "email": email,
            "password": password
        })
        
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "access_token" in login_data
        assert login_data["user"]["email_verified"] is True

    def test_verify_code_case_insensitive_email(self, client: TestClient, db: Session, test_rate_limits):
        """Test that email verification is case insensitive."""
        # Create a test user with lowercase email
        random_id = random.randint(1000, 9999)
        email = f"verify-case{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "Case",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get verification code
        user = db.query(User).filter(User.email == email).first()
        verification_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Verify with uppercase email
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email.upper(),
            "code": verification_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["success"] is True


class TestVerifyCodeEndpointSecurity:
    """Test security aspects of the verify code endpoint."""

    def test_verify_code_sql_injection_protection(self, client: TestClient):
        """Test that SQL injection attempts are handled safely."""
        # Try SQL injection in email field
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": "test@example.com'; DROP TABLE users; --",
            "code": "123456",
            "verification_type": "email_verification"
        })
        
        # Should return validation error (422) because pydantic EmailStr catches malformed emails
        # This is actually better security than 400 because it happens at validation layer
        assert verify_response.status_code == 422
        data = verify_response.json()
        assert "detail" in data  # Pydantic validation error structure

    def test_verify_code_different_users_isolated(self, client: TestClient, db: Session, test_rate_limits):
        """Test that verification codes are isolated between users."""
        # Create two users
        random_id1 = random.randint(1000, 9999)
        random_id2 = random.randint(1000, 9999)
        
        email1 = f"verify-user1-{random_id1}@example.com"
        email2 = f"verify-user2-{random_id2}@example.com"
        
        user_data1 = {
            "email": email1,
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "One",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        user_data2 = {
            "email": email2,
            "password": "SecurePass123!",
            "first_name": "User",
            "last_name": "Two",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register both users
        client.post("/api/v1/auth/register", json=user_data1)
        client.post("/api/v1/auth/register", json=user_data2)
        
        # Get user1's verification code
        user1 = db.query(User).filter(User.email == email1).first()
        user1_code = db.query(VerificationCode).filter(
            VerificationCode.user_id == user1.id,
            VerificationCode.verification_type == VerificationType.EMAIL_VERIFICATION
        ).first()
        
        # Try to use user1's code for user2
        verify_response = client.post("/api/v1/auth/verify-code", json={
            "email": email2,
            "code": user1_code.code,
            "verification_type": "email_verification"
        })
        
        assert verify_response.status_code == 400
        data = verify_response.json()
        assert "Invalid verification code" in data["detail"]
        
        # User2 should still be unverified
        user2 = db.query(User).filter(User.email == email2).first()
        assert user2.email_verified is False