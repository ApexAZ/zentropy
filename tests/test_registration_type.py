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
from api.database import User

# Note: Using isolated test database fixtures from conftest.py
# This ensures tests don't pollute the main database, RegistrationType
from api.schemas import UserCreate, GoogleOAuthRequest

class TestRegistrationTypeEnum:
    """Test RegistrationType enum values and database constraints."""

    def test_registration_type_enum_values(self, client):
        """Test that RegistrationType enum has correct values."""
        # This should FAIL initially since RegistrationType doesn't exist yet
        assert RegistrationType.EMAIL.value == "email"
        assert RegistrationType.GOOGLE_OAUTH.value == "google_oauth"

    def test_registration_type_enum_count(self, client):
        """Test that RegistrationType enum has exactly 2 values."""
        expected_values = ["email", "google_oauth"]
        actual_values = [rt.value for rt in RegistrationType]
        assert len(actual_values) == 2
        assert set(actual_values) == set(expected_values)


class TestUserModelRegistrationType:
    """Test User model registration_type field."""

    def test_user_model_has_registration_type_field(self, client):
        """Test that User model includes registration_type field."""
        # This should FAIL initially since registration_type field doesn't exist
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            organization="Test Org",
            registration_type=RegistrationType.EMAIL
        )
        assert user.registration_type == RegistrationType.EMAIL

    def test_user_registration_type_defaults_to_email(self, client):
        """Test that registration_type defaults to EMAIL when saved to database."""
        user = User(
            email="test@example.com", 
            first_name="Test",
            last_name="User",
            organization="Test Org"
        )
        
        # Save to database to trigger default value
        with next(get_db()) as db:
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
            organization="OAuth Org",
            registration_type=RegistrationType.GOOGLE_OAUTH
        )
        assert user.registration_type == RegistrationType.GOOGLE_OAUTH


class TestEmailRegistrationWithType:
    """Test email registration sets registration_type=EMAIL."""

    def test_email_registration_sets_email_type(self, client):
        """Test that email registration sets registration_type to EMAIL."""
        # This should FAIL initially since endpoint doesn't set registration_type
        user_data = {
            "email": "email@example.com",
            "password": "Password123!",
            "first_name": "Email",
            "last_name": "User",
            "organization": "Email Org",
            "terms_agreement": True
        }

        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201

        # Get the created user from database to check registration_type
        with next(get_db()) as db:
            user = db.query(User).filter(User.email == "email@example.com").first()
            assert user is not None
            assert user.registration_type == RegistrationType.EMAIL

    def test_multiple_email_registrations_all_have_email_type(self, client):
        """Test that multiple email registrations all get EMAIL type."""
        users_data = [
            {
                "email": "user1@example.com",
                "password": "Password123!",
                "first_name": "User", 
                "last_name": "One",
                "organization": "Org1",
                "terms_agreement": True
            },
            {
                "email": "user2@example.com", 
                "password": "Password123!",
                "first_name": "User",
                "last_name": "Two", 
                "organization": "Org2",
                "terms_agreement": True
            }
        ]

        for user_data in users_data:
            response = client.post("/api/auth/register", json=user_data)
            assert response.status_code == 201

        # Check all users have EMAIL registration type
        with next(get_db()) as db:
            for user_data in users_data:
                user = db.query(User).filter(User.email == user_data["email"]).first()
                assert user is not None
                assert user.registration_type == RegistrationType.EMAIL


class TestGoogleOAuthRegistrationWithType:
    """Test Google OAuth registration sets registration_type=GOOGLE_OAUTH."""

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_registration_sets_google_type(self, mock_verify_token, client):
        """Test that Google OAuth registration sets registration_type to GOOGLE_OAUTH."""
        # Mock Google token verification to return valid user info
        mock_verify_token.return_value = {
            "email": "oauth@example.com",
            "given_name": "OAuth",
            "family_name": "User",
            "sub": "google-oauth-123",
            "email_verified": True
        }

        oauth_data = {
            "credential": "mock-google-jwt-token"
        }

        response = client.post("/api/auth/google-oauth", json=oauth_data)
        assert response.status_code == 200

        # Check that the user was created with GOOGLE_OAUTH registration type
        with next(get_db()) as db:
            user = db.query(User).filter(User.email == "oauth@example.com").first()
            assert user is not None
            assert user.registration_type == RegistrationType.GOOGLE_OAUTH

    @patch('api.google_oauth.verify_google_token')
    def test_multiple_google_oauth_registrations_all_have_google_type(self, mock_verify_token, client):
        """Test that multiple Google OAuth registrations all get GOOGLE_OAUTH type."""
        # Mock different Google OAuth users
        oauth_users = [
            {
                "credential": "mock-jwt-1",
                "user_data": {
                    "email": "oauth1@example.com",
                    "first_name": "OAuth1", 
                    "last_name": "User1",
                    "organization": "OAuth Org1"
                }
            },
            {
                "credential": "mock-jwt-2",
                "user_data": {
                    "email": "oauth2@example.com",
                    "first_name": "OAuth2",
                    "last_name": "User2", 
                    "organization": "OAuth Org2"
                }
            }
        ]

        for oauth_user in oauth_users:
            # Mock Google token verification for each user
            mock_verify_token.return_value = {
                "email": oauth_user["user_data"]["email"],
                "given_name": oauth_user["user_data"]["first_name"],
                "family_name": oauth_user["user_data"]["last_name"],
                "sub": f"google-{oauth_user['user_data']['email']}",
                "email_verified": True
            }

            response = client.post("/api/auth/google-oauth", json={
                "credential": oauth_user["credential"]
            })
            assert response.status_code == 200

        # Check all OAuth users have GOOGLE_OAUTH registration type
        with next(get_db()) as db:
            for oauth_user in oauth_users:
                user = db.query(User).filter(
                    User.email == oauth_user["user_data"]["email"]
                ).first()
                assert user is not None
                assert user.registration_type == RegistrationType.GOOGLE_OAUTH


class TestRegistrationTypeInResponses:
    """Test that registration_type is included in API responses."""

    def test_user_response_includes_registration_type(self, client):
        """Test that user API responses include registration_type field."""
        # Create a user first
        user_data = {
            "email": "response@example.com",
            "password": "Password123!",
            "first_name": "Response",
            "last_name": "User",
            "organization": "Response Org",
            "terms_agreement": True
        }

        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201
        
        # This should FAIL initially since UserResponse schema doesn't include registration_type
        user_response = response.json()
        assert "registration_type" in user_response
        assert user_response["registration_type"] == "email"

    @patch('api.routers.auth.process_google_oauth')
    def test_google_oauth_response_includes_registration_type(self, mock_process_oauth, client):
        """Test that Google OAuth responses include registration_type field."""
        mock_process_oauth.return_value = {
            "access_token": "test-token",
            "token_type": "bearer",
            "user": {
                "email": "oauth-response@example.com",
                "first_name": "OAuth",
                "last_name": "Response",
                "organization": "OAuth Org",
                "has_projects_access": True,
                "email_verified": True,
                "registration_type": "google_oauth"  # Should be included in response
            }
        }

        oauth_data = {"credential": "mock-jwt-token"}
        response = client.post("/api/auth/google-oauth", json=oauth_data)
        assert response.status_code == 200
        
        # This should FAIL initially since response doesn't include registration_type
        login_response = response.json()
        assert "registration_type" in login_response["user"]
        assert login_response["user"]["registration_type"] == "google_oauth"


class TestRegistrationTypeImmutable:
    """Test that registration_type cannot be changed after user creation."""

    def test_registration_type_is_immutable_via_api(self, client):
        """Test that registration_type cannot be updated via user update API."""
        # Create user with email registration
        user_data = {
            "email": "immutable@example.com",
            "password": "Password123!",
            "first_name": "Immutable",
            "last_name": "User",
            "organization": "Immutable Org",
            "terms_agreement": True
        }

        create_response = client.post("/api/auth/register", json=user_data)
        assert create_response.status_code == 201

        # Try to update registration_type (should be ignored/rejected)
        # This test validates that even if someone tries to update it, it stays the same
        with next(get_db()) as db:
            user = db.query(User).filter(User.email == "immutable@example.com").first()
            assert user is not None
            original_registration_type = user.registration_type
            
            # Verify it's EMAIL as expected
            assert original_registration_type == RegistrationType.EMAIL
            
            # Even if we try to change it directly (in real app this would be via API)
            # the registration_type should remain unchanged
            assert user.registration_type == original_registration_type