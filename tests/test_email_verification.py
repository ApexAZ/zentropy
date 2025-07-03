"""
Email Verification Tests - TDD Approach

Tests for email verification functionality including:
- Email verification token generation
- Email verification endpoints  
- Database schema for email verification
- Email sending functionality
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import random

from api.main import app
from api.database import get_db, User
from api.schemas import UserCreate


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def db():
    """Create database session."""
    from api.database import get_db
    db_session = next(get_db())
    yield db_session
    db_session.close()


class TestEmailVerificationDatabase:
    """Test email verification database schema and models."""
    
    def test_user_model_has_email_verification_fields(self, db: Session):
        """Test that User model has email verification fields."""
        # This test will fail initially - we need to add these fields
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            email_verified=False,  # Should exist
            email_verification_token="test-token",  # Should exist
            email_verification_expires_at=datetime.utcnow() + timedelta(hours=24)  # Should exist
        )
        
        # These attributes should exist on the User model
        assert hasattr(user, 'email_verified')
        assert hasattr(user, 'email_verification_token')
        assert hasattr(user, 'email_verification_expires_at')
        
        # Default should be unverified
        assert user.email_verified is False


class TestEmailVerificationEndpoints:
    """Test email verification API endpoints."""
    
    def test_register_sends_verification_email(self, client: TestClient):
        """Test that registration sends a verification email."""
        # Use random email to avoid conflicts with existing users
        random_id = random.randint(1000, 9999)
        user_data = {
            "email": f"newuser{random_id}@example.com",
            "password": "SecurePass123!",
            "first_name": "New",
            "last_name": "User",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        # Should succeed but user should be unverified
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == f"newuser{random_id}@example.com"
        assert data["email_verified"] is False  # Should exist in response
        
    def test_send_verification_email_endpoint(self, client: TestClient):
        """Test endpoint to resend verification email."""
        # This endpoint doesn't exist yet - test will fail
        response = client.post("/api/auth/send-verification", json={"email": "test@example.com"})
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "verification email" in data["message"].lower()
        
    def test_verify_email_endpoint(self, client: TestClient, db: Session):
        """Test endpoint to verify email with token."""
        # First, register a user to get a verification token
        random_id = random.randint(1000, 9999)
        user_data = {
            "email": f"verify{random_id}@example.com",
            "password": "SecurePass123!",
            "first_name": "Verify",
            "last_name": "User",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        # Register user (this creates a verification token)
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get the verification token from database
        from api.database import User
        user = db.query(User).filter(User.email == f"verify{random_id}@example.com").first()
        assert user is not None
        assert user.email_verification_token is not None
        
        token = user.email_verification_token
        
        # Now verify the email using the token
        response = client.post(f"/api/auth/verify-email/{token}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "email verified" in data["message"].lower()
        
    def test_verify_email_invalid_token(self, client: TestClient):
        """Test email verification with invalid token."""
        response = client.post("/api/auth/verify-email/invalid-token")
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower()
        
    def test_verify_email_expired_token(self, client: TestClient):
        """Test email verification with expired token."""
        response = client.post("/api/auth/verify-email/expired-token")
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "expired" in data["detail"].lower()


class TestEmailVerificationFlow:
    """Test complete email verification flow."""
    
    def test_complete_verification_flow(self, client: TestClient):
        """Test complete flow: register -> send email -> verify."""
        # 1. Register user
        random_id = random.randint(1000, 9999)
        email = f"flowtest{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Flow",
            "last_name": "Test",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # 2. Resend verification email
        send_response = client.post("/api/auth/send-verification", json={"email": email})
        assert send_response.status_code == 200
        
        # 3. In real implementation, we'd get token from email
        # For testing, we'll need to extract token from database or mock it
        
    def test_login_requires_verified_email(self, client: TestClient):
        """Test that login is rejected for unverified users."""
        # Register user (unverified)
        random_id = random.randint(1000, 9999)
        email = f"unverified{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Unverified",
            "last_name": "User",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Try to login with unverified account - should fail
        login_response = client.post("/api/auth/login-json", json={
            "email": email,
            "password": "SecurePass123!"
        })
        
        # Should fail with 403 Forbidden
        assert login_response.status_code == 403
        data = login_response.json()
        assert "detail" in data
        assert "verify your email" in data["detail"].lower()
        
    def test_login_succeeds_after_email_verification(self, client: TestClient, db: Session):
        """Test that login succeeds after email verification."""
        # Register user
        random_id = random.randint(1000, 9999)
        email = f"verified{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Verified",
            "last_name": "User",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Get verification token from database
        from api.database import User
        user = db.query(User).filter(User.email == email).first()
        assert user is not None
        assert user.email_verification_token is not None
        token = user.email_verification_token
        
        # Verify email
        verify_response = client.post(f"/api/auth/verify-email/{token}")
        assert verify_response.status_code == 200
        
        # Now login should succeed
        login_response = client.post("/api/auth/login-json", json={
            "email": email,
            "password": "SecurePass123!"
        })
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email_verified"] is True
        
    def test_oauth_login_endpoint_requires_verified_email(self, client: TestClient):
        """Test that OAuth login endpoint also requires verified email."""
        # Register user (unverified)
        random_id = random.randint(1000, 9999)
        email = f"unverified_oauth{random_id}@example.com"
        user_data = {
            "email": email,
            "password": "SecurePass123!",
            "first_name": "Unverified",
            "last_name": "User",
            "organization": "Test Org",
            "terms_agreement": True,
            "has_projects_access": True
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # Try to login with form data (OAuth endpoint) - should also fail
        login_response = client.post("/api/auth/login", data={
            "username": email,
            "password": "SecurePass123!"
        })
        
        # Should fail with 403 Forbidden
        assert login_response.status_code == 403
        data = login_response.json()
        assert "detail" in data
        assert "verify your email" in data["detail"].lower()


class TestEmailVerificationSecurity:
    """Test security aspects of email verification."""
    
    def test_verification_token_is_secure(self, db: Session):
        """Test that verification tokens are cryptographically secure."""
        # Should generate unique, unpredictable tokens
        # This will be implemented in the email verification service
        pass
        
    def test_verification_token_expires(self, db: Session):
        """Test that verification tokens have expiration."""
        # Tokens should expire after 24 hours by default
        pass
        
    def test_verification_token_single_use(self, db: Session):
        """Test that verification tokens can only be used once."""
        # Once verified, token should be invalidated
        pass


class TestEmailVerificationNotifications:
    """Test email sending functionality."""
    
    def test_verification_email_contains_token(self):
        """Test that verification email contains the correct token."""
        # This will test the email template and sending service
        pass
        
    def test_verification_email_format(self):
        """Test that verification email has proper format."""
        # Should have proper HTML/text format, links, etc.
        pass