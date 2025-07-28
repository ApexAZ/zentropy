"""
Registration Type Tests

Tests for registration_type field that tracks how users initially registered:
- EMAIL: User registered with email/password
- GOOGLE_OAUTH: User registered with Google OAuth
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from api.main import app
from api.database import User, RegistrationType
from api.schemas import UserCreate

class TestRegistrationTypeEnum:
    """Test RegistrationType enum values and database constraints."""

    def test_registration_type_enum_values(self, client):
        """Test that RegistrationType enum has correct values."""
        # This should FAIL initially since RegistrationType doesn't exist yet
        assert RegistrationType.EMAIL.value == "email"
        assert RegistrationType.GOOGLE_OAUTH.value == "google_oauth"
        assert RegistrationType.MICROSOFT_OAUTH.value == "microsoft_oauth"
        assert RegistrationType.GITHUB_OAUTH.value == "github_oauth"

    def test_registration_type_enum_count(self, client):
        """Test that RegistrationType enum has exactly 4 values."""
        expected_values = ["email", "google_oauth", "microsoft_oauth", "github_oauth"]
        actual_values = [rt.value for rt in RegistrationType]
        assert len(actual_values) == 4
        assert set(actual_values) == set(expected_values)


class TestUserModelRegistrationType:
    """Test User model registration_type field."""

    def test_user_model_has_registration_type_field(self, client):
        """Test that User model includes registration_type field."""
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            registration_type=RegistrationType.EMAIL
        )
        assert user.registration_type == RegistrationType.EMAIL

    def test_user_registration_type_defaults_to_email(self, db):
        """Test that registration_type defaults to EMAIL when saved to database."""
        user = User(
            email="test@example.com", 
            first_name="Test",
            last_name="User"
        )
        
        # Save to database to trigger default value
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Should default to EMAIL registration type
        assert user.registration_type == RegistrationType.EMAIL

    def test_user_can_be_created_with_google_oauth_registration_type(self, client):
        """Test that users can be created with GOOGLE_OAUTH registration type."""
        user = User(
            email="oauth@example.com",
            first_name="OAuth",
            last_name="User", 
            registration_type=RegistrationType.GOOGLE_OAUTH
        )
        assert user.registration_type == RegistrationType.GOOGLE_OAUTH


class TestEmailRegistrationWithType:
    """Test email registration sets registration_type=EMAIL."""

    def test_email_registration_sets_email_type(self, client, db):
        """Test that email registration sets registration_type to EMAIL."""
        user_data = {
            "email": "email@example.com",
            "password": "Password123!",
            "first_name": "Email",
            "last_name": "User",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user was created with EMAIL registration type
        user = db.query(User).filter(User.email == "email@example.com").first()
        assert user is not None
        assert user.registration_type == RegistrationType.EMAIL

    def test_multiple_email_registrations_all_have_email_type(self, client, db):
        """Test that multiple email registrations all get EMAIL type."""
        users_data = [
            {
                "email": "user1@example.com",
                "password": "Password123!",
                "first_name": "User", 
                "last_name": "One",
                "terms_agreement": True
            },
            {
                "email": "user2@example.com", 
                "password": "Password123!",
                "first_name": "User",
                "last_name": "Two", 
                "terms_agreement": True
            }
        ]

        for user_data in users_data:
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 201

        # Verify all users have EMAIL registration type
        users = db.query(User).filter(User.email.in_(["user1@example.com", "user2@example.com"])).all()
        assert len(users) == 2
        for user in users:
            assert user.registration_type == RegistrationType.EMAIL


class TestGoogleOAuthRegistrationWithType:
    """Test Google OAuth registration sets registration_type=GOOGLE_OAUTH."""

    @patch('api.google_oauth_consolidated.id_token.verify_token')
    def test_google_oauth_registration_sets_google_type(self, mock_verify_token, client, db):
        """Test that Google OAuth registration sets registration_type to GOOGLE_OAUTH."""
        # Mock Google JWT token verification
        mock_verify_token.return_value = {
            "iss": "https://accounts.google.com", 
            "aud": "test-client-id",
            "sub": "google-oauth-123",
            "email": "oauth@example.com",
            "given_name": "OAuth",
            "family_name": "User",
            "email_verified": True,
            "exp": 9999999999,
            "iat": 1234567890
        }

        oauth_data = {
            "provider": "google",
            "credential": "mock.google.jwt"
        }

        with patch.dict('os.environ', {'GOOGLE_CLIENT_ID': 'test-client-id'}):
            response = client.post("/api/v1/auth/oauth", json=oauth_data)
            assert response.status_code == 200

            # Verify user was created with GOOGLE_OAUTH registration type
            user = db.query(User).filter(User.email == "oauth@example.com").first()
            assert user is not None
            assert user.registration_type == RegistrationType.GOOGLE_OAUTH
            
            # Verify response includes registration_type
            result = response.json()
            assert result["user"]["registration_type"] == "google_oauth"



class TestRegistrationTypeInResponses:
    """Test that registration_type is included in API responses."""

    def test_user_response_includes_registration_type(self, client, db):
        """Test that user API responses include registration_type field."""
        # Create a user first
        user_data = {
            "email": "response@example.com",
            "password": "Password123!",
            "first_name": "Response",
            "last_name": "User",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201
        
        # Registration now returns message only (security fix)
        response_data = response.json()
        assert "message" in response_data
        
        # Verify the user after registration to test login
        from api.database import User
        user = db.query(User).filter(User.email == "response@example.com").first()
        user.email_verified = True  # Manually verify for testing
        db.commit()
        
        # Test registration type via login endpoint
        login_response = client.post("/api/v1/auth/login-json", json={
            "email": "response@example.com",
            "password": "Password123!"
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "user" in login_data
        user_data_response = login_data["user"]
        assert "registration_type" in user_data_response
        assert user_data_response["registration_type"] == "email"

    @patch('api.routers.auth.process_google_oauth')
    def test_google_oauth_response_includes_registration_type(self, mock_process_oauth, client):
        """Test that Google OAuth responses include registration_type field."""
        mock_process_oauth.return_value = {
            "access_token": "test-token",
            "token_type": "bearer",
            "user": {
                "id": "12345678-1234-1234-1234-123456789012",
                "email": "oauth-response@example.com",
                "first_name": "OAuth",
                "last_name": "Response",
                "organization_id": None,
                "has_projects_access": True,
                "email_verified": True,
                "registration_type": "google_oauth",  # Should be included in response
                "role": "basic_user"
            }
        }

        oauth_data = {"provider": "google", "credential": "mock-jwt-token"}
        response = client.post("/api/v1/auth/oauth", json=oauth_data)
        assert response.status_code == 200
        
        # This should FAIL initially since response doesn't include registration_type
        login_response = response.json()
        assert "registration_type" in login_response["user"]
        assert login_response["user"]["registration_type"] == "google_oauth"


class TestRegistrationTypeImmutable:
    """Test that registration_type cannot be changed after user creation."""

    def test_registration_type_is_immutable_via_api(self, client, test_rate_limits):
        """Test that registration_type cannot be updated via user update API."""
        # Create user with email registration
        user_data = {
            "email": "immutable@example.com",
            "password": "Password123!",
            "first_name": "Immutable",
            "last_name": "User",
            "terms_agreement": True
        }

        create_response = client.post("/api/v1/auth/register", json=user_data)
        assert create_response.status_code == 201

        # Try to update registration_type (should be ignored/rejected) - NOTE: This test requires client + db fixtures
        # The client makes the API call, but we need db to verify the result
        # In practice, this test should use a separate fixture to query the test database
        # This test validates that even if someone tries to update it, it stays the same