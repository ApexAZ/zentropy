"""Tests for secure account linking functionality."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import User, AuthProvider
from api.auth import get_password_hash


class TestAccountLinking:
    """Test secure account linking and unlinking functionality."""

    def test_get_account_security_status_local_user(
        self, client: TestClient, db: Session, current_user: User, auth_headers: dict
    ):
        """Test getting security status for local user."""
        response = client.get("/api/v1/users/me/security", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email_auth_linked"] is True  # Has password
        assert data["google_auth_linked"] is False  # No Google ID
        assert data["google_email"] is None

    def test_get_account_security_status_google_user(
        self, client: TestClient, db: Session
    ):
        """Test getting security status for Google OAuth user."""
        # Create Google user with auth headers
        google_user = User(
            email="google@example.com",
            first_name="Google",
            last_name="User",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google123",
            password_hash=None,  # No password for OAuth users
            email_verified=True,
        )
        db.add(google_user)
        db.commit()

        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(google_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/v1/users/me/security", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email_auth_linked"] is False  # No password
        assert data["google_auth_linked"] is True  # Has Google ID
        assert data["google_email"] == "google@example.com"

    def test_get_account_security_status_hybrid_user(
        self, client: TestClient, db: Session
    ):
        """Test getting security status for hybrid user (both email and Google)."""
        # Create hybrid user
        hybrid_user = User(
            email="hybrid@example.com",
            first_name="Hybrid",
            last_name="User",
            auth_provider=AuthProvider.HYBRID,
            google_id="google456",
            password_hash=get_password_hash("password123"),
            email_verified=True,
        )
        db.add(hybrid_user)
        db.commit()

        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(hybrid_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/v1/users/me/security", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email_auth_linked"] is True  # Has password
        assert data["google_auth_linked"] is True  # Has Google ID
        assert data["google_email"] == "hybrid@example.com"

    @patch("api.routers.users.verify_google_token")
    def test_link_google_account_success(
        self, mock_verify_token, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test successful Google account linking."""
        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "current@user.com",  # Matches current user
            "sub": "google_id_123",
            "email_verified": True,
        }

        response = client.post(
            "/api/v1/users/me/link-google",
            json={"google_credential": "fake_google_token"},
            headers=auth_headers,
        )
        
        # Behavior: User should get success confirmation
        assert response.status_code == 200
        assert response.json()["message"] == "Google account linked successfully"

    @patch("api.routers.users.verify_google_token")
    def test_link_google_account_email_mismatch(
        self, mock_verify_token, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test linking fails when Google email doesn't match user email."""
        # Mock Google token with different email
        mock_verify_token.return_value = {
            "email": "different@email.com",
            "sub": "google_id_123",
            "email_verified": True,
        }

        response = client.post(
            "/api/v1/users/me/link-google",
            json={"google_credential": "fake_google_token"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Google email must match your account email" in response.json()["detail"]

    @patch("api.routers.users.verify_google_token")
    def test_link_google_account_already_linked_to_another_user(
        self, mock_verify_token, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test linking fails when Google ID is already linked to another user."""
        # Create another user with the Google ID
        other_user = User(
            email="other@user.com",
            first_name="Other",
            last_name="User",
            google_id="google_id_123",
            password_hash=get_password_hash("password123"),
            email_verified=True,
        )
        db.add(other_user)
        db.commit()

        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "current@user.com",
            "sub": "google_id_123",  # Same Google ID as other user
            "email_verified": True,
        }

        response = client.post(
            "/api/v1/users/me/link-google",
            json={"google_credential": "fake_google_token"},
            headers=auth_headers,
        )

        assert response.status_code == 409
        assert "already linked to another user" in response.json()["detail"]

    @patch("api.routers.users.verify_google_token")
    def test_link_google_account_already_linked(
        self, mock_verify_token, client: TestClient, db: Session, current_user: User, auth_headers: dict
    ):
        """Test linking fails when user already has Google account linked."""
        # Set Google ID on current user
        current_user.google_id = "existing_google_id"
        db.commit()

        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "current@user.com",
            "sub": "google_id_123",
            "email_verified": True,
        }

        response = client.post(
            "/api/v1/users/me/link-google",
            json={"google_credential": "fake_google_token"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "already linked to your account" in response.json()["detail"]

    def test_unlink_google_account_success(
        self, client: TestClient, db: Session, user_with_known_password: User
    ):
        """Test successful Google account unlinking."""
        # Set up user with Google account linked
        user_with_known_password.google_id = "google_id_123"
        user_with_known_password.auth_provider = AuthProvider.HYBRID
        db.commit()

        # Create auth headers for this user
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/v1/users/me/unlink-google",
            json={"password": "OldPassword123!"},  # Known password from fixture
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Google account unlinked successfully"

        # Verify user was updated in database
        db.refresh(user_with_known_password)
        assert user_with_known_password.google_id is None
        assert user_with_known_password.auth_provider == AuthProvider.LOCAL

    def test_unlink_google_account_no_google_linked(
        self, client: TestClient, db: Session, user_with_known_password: User
    ):
        """Test unlinking fails when no Google account is linked."""
        # Create auth headers for this user  
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/v1/users/me/unlink-google",
            json={"password": "OldPassword123!"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "No Google account is linked" in response.json()["detail"]

    def test_unlink_google_account_no_password_set(
        self, client: TestClient, db: Session
    ):
        """Test unlinking fails when user has no password (prevents lockout)."""
        # Create Google-only user with no password
        google_user = User(
            email="google@example.com",
            first_name="Google",
            last_name="User",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google123",
            password_hash=None,  # No password
            email_verified=True,
        )
        db.add(google_user)
        db.commit()

        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(google_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/v1/users/me/unlink-google",
            json={"password": "any_password"},
            headers=headers,
        )

        assert response.status_code == 400
        assert "no password set" in response.json()["detail"]

    def test_unlink_google_account_wrong_password(
        self, client: TestClient, db: Session, user_with_known_password: User, test_rate_limits
    ):
        """Test unlinking fails with wrong password."""
        # Set up user with Google account linked
        user_with_known_password.google_id = "google_id_123"
        user_with_known_password.auth_provider = AuthProvider.HYBRID
        db.commit()

        # Create auth headers for this user
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {"Authorization": f"Bearer {token}"}

        response = client.post(
            "/api/v1/users/me/unlink-google",
            json={"password": "WrongPassword123!"},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid password" in response.json()["detail"]

    def test_link_google_account_requires_authentication(self, client: TestClient):
        """Test that linking requires authentication."""
        response = client.post(
            "/api/v1/users/me/link-google",
            json={"google_credential": "fake_google_token"},
        )

        assert response.status_code == 403

    def test_unlink_google_account_requires_authentication(self, client: TestClient):
        """Test that unlinking requires authentication."""
        response = client.post(
            "/api/v1/users/me/unlink-google",
            json={"password": "TestPassword123!"},
        )

        assert response.status_code == 403

    def test_get_security_status_requires_authentication(self, client: TestClient):
        """Test that getting security status requires authentication."""
        response = client.get("/api/v1/users/me/security")

        assert response.status_code == 403

    def test_get_account_security_multi_provider_format(
        self, client: TestClient, db: Session, current_user: User, auth_headers: dict
    ):
        """Test that security endpoint returns multi-provider format."""
        response = client.get("/api/v1/users/me/security", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check new multi-provider format
        assert "oauth_providers" in data
        assert isinstance(data["oauth_providers"], list)
        assert len(data["oauth_providers"]) == 3
        
        # Verify all three providers are included
        provider_names = [provider["provider"] for provider in data["oauth_providers"]]
        assert "google" in provider_names
        assert "microsoft" in provider_names
        assert "github" in provider_names
        
        # Verify structure of each provider
        for provider in data["oauth_providers"]:
            assert "provider" in provider
            assert "linked" in provider
            assert "identifier" in provider
            assert isinstance(provider["linked"], bool)
        
        # Backwards compatibility - old fields should still exist
        assert "email_auth_linked" in data
        assert "google_auth_linked" in data
        assert "google_email" in data

    def test_get_account_security_with_multiple_providers_linked(
        self, client: TestClient, db: Session
    ):
        """Test security status when multiple OAuth providers are linked."""
        # Create user with multiple OAuth providers linked
        multi_provider_user = User(
            email="multi@example.com",
            first_name="Multi",
            last_name="Provider",
            auth_provider=AuthProvider.HYBRID,
            google_id="google123",
            microsoft_id="microsoft456", 
            github_id="github789",
            password_hash=get_password_hash("password123"),
            email_verified=True,
        )
        db.add(multi_provider_user)
        db.commit()

        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(multi_provider_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/v1/users/me/security", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All providers should show as linked
        providers_by_name = {p["provider"]: p for p in data["oauth_providers"]}
        
        assert providers_by_name["google"]["linked"] is True
        assert providers_by_name["google"]["identifier"] == "multi@example.com"
        
        assert providers_by_name["microsoft"]["linked"] is True
        assert providers_by_name["microsoft"]["identifier"] == "multi@example.com"
        
        assert providers_by_name["github"]["linked"] is True
        assert providers_by_name["github"]["identifier"] == "multi@example.com"
        
        # Email auth should also be linked
        assert data["email_auth_linked"] is True

    def test_get_account_security_no_providers_linked(
        self, client: TestClient, db: Session
    ):
        """Test security status when no OAuth providers are linked."""
        # Create user with no OAuth providers
        local_user = User(
            email="local@example.com",
            first_name="Local",
            last_name="User",
            auth_provider=AuthProvider.LOCAL,
            password_hash=get_password_hash("password123"),
            email_verified=True,
        )
        db.add(local_user)
        db.commit()

        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(local_user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/v1/users/me/security", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # All OAuth providers should show as unlinked
        for provider in data["oauth_providers"]:
            assert provider["linked"] is False
            assert provider["identifier"] is None
        
        # Email auth should be linked
        assert data["email_auth_linked"] is True


class TestMicrosoftAccountLinking:
    """Test Microsoft OAuth account linking functionality."""

    def test_link_microsoft_account_success(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user can successfully link Microsoft account."""
        response = client.post(
            "/api/v1/users/me/link-microsoft",
            json={"microsoft_credential": "fake_microsoft_token"},
            headers=auth_headers,
        )
        
        # Behavior: User should get success confirmation
        assert response.status_code == 200
        assert response.json()["message"] == "Microsoft account linked successfully"

    def test_unlink_microsoft_account_success(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user can successfully unlink Microsoft account."""
        response = client.post(
            "/api/v1/users/me/unlink-microsoft",
            json={"password": "TestPassword123!"},
            headers=auth_headers,
        )

        # Behavior: User should get success confirmation
        assert response.status_code == 200
        assert response.json()["message"] == "Microsoft account unlinked successfully"

    def test_link_microsoft_account_requires_authentication(self, client: TestClient):
        """Test that unauthenticated user cannot link Microsoft account."""
        response = client.post(
            "/api/v1/users/me/link-microsoft",
            json={"microsoft_credential": "fake_microsoft_token"},
        )

        # Behavior: Unauthenticated user should be rejected
        assert response.status_code == 403

    def test_unlink_microsoft_account_requires_authentication(self, client: TestClient):
        """Test that unauthenticated user cannot unlink Microsoft account."""
        response = client.post(
            "/api/v1/users/me/unlink-microsoft",
            json={"password": "TestPassword123!"},
        )

        # Behavior: Unauthenticated user should be rejected
        assert response.status_code == 403

    def test_link_microsoft_account_with_invalid_credential(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user gets error when linking with invalid Microsoft credential."""
        response = client.post(
            "/api/v1/users/me/link-microsoft",
            json={"microsoft_credential": ""},
            headers=auth_headers,
        )
        
        # Behavior: User should get validation error for empty credential
        assert response.status_code == 422
        # User gets clear feedback about invalid input
        assert "detail" in response.json()

    def test_unlink_microsoft_account_with_invalid_password(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user gets error when unlinking with invalid password."""
        response = client.post(
            "/api/v1/users/me/unlink-microsoft",
            json={"password": ""},
            headers=auth_headers,
        )

        # Behavior: User should get validation error for empty password
        assert response.status_code == 422
        # User gets clear feedback about invalid input
        assert "detail" in response.json()


class TestGitHubAccountLinking:
    """Test GitHub OAuth account linking functionality."""

    def test_link_github_account_success(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user can successfully link GitHub account."""
        response = client.post(
            "/api/v1/users/me/link-github",
            json={"github_credential": "fake_github_token"},
            headers=auth_headers,
        )
        
        # Behavior: User should get success confirmation
        assert response.status_code == 200
        assert response.json()["message"] == "GitHub account linked successfully"

    def test_unlink_github_account_success(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user can successfully unlink GitHub account."""
        response = client.post(
            "/api/v1/users/me/unlink-github",
            json={"password": "TestPassword123!"},
            headers=auth_headers,
        )

        # Behavior: User should get success confirmation
        assert response.status_code == 200
        assert response.json()["message"] == "GitHub account unlinked successfully"

    def test_link_github_account_requires_authentication(self, client: TestClient):
        """Test that unauthenticated user cannot link GitHub account."""
        response = client.post(
            "/api/v1/users/me/link-github",
            json={"github_credential": "fake_github_token"},
        )

        # Behavior: Unauthenticated user should be rejected
        assert response.status_code == 403

    def test_unlink_github_account_requires_authentication(self, client: TestClient):
        """Test that unauthenticated user cannot unlink GitHub account."""
        response = client.post(
            "/api/v1/users/me/unlink-github",
            json={"password": "TestPassword123!"},
        )

        # Behavior: Unauthenticated user should be rejected
        assert response.status_code == 403

    def test_link_github_account_with_invalid_credential(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user gets error when linking with invalid GitHub credential."""
        response = client.post(
            "/api/v1/users/me/link-github",
            json={"github_credential": ""},
            headers=auth_headers,
        )
        
        # Behavior: User should get validation error for empty credential
        assert response.status_code == 422
        # User gets clear feedback about invalid input
        assert "detail" in response.json()

    def test_unlink_github_account_with_invalid_password(
        self, client: TestClient, db: Session, auth_headers: dict
    ):
        """Test user gets error when unlinking with invalid password."""
        response = client.post(
            "/api/v1/users/me/unlink-github",
            json={"password": ""},
            headers=auth_headers,
        )

        # Behavior: User should get validation error for empty password
        assert response.status_code == 422
        # User gets clear feedback about invalid input
        assert "detail" in response.json()


class TestGoogleOAuthSecurityFix:
    """Test the security fix for Google OAuth account takeover prevention."""

    @patch("api.google_oauth.verify_google_token")
    def test_oauth_login_prevents_local_account_takeover(
        self, mock_verify_token, client: TestClient, db: Session
    ):
        """Test that Google OAuth login cannot takeover LOCAL accounts."""
        # Create a LOCAL user
        local_user = User(
            email="victim@example.com",
            first_name="Victim",
            last_name="User",
            auth_provider=AuthProvider.LOCAL,
            password_hash=get_password_hash("secret123"),
            email_verified=True,
        )
        db.add(local_user)
        db.commit()

        # Mock Google token with same email
        mock_verify_token.return_value = {
            "email": "victim@example.com",
            "sub": "attacker_google_id",
            "email_verified": True,
        }

        # Attempt Google OAuth login (should fail)
        with patch("api.google_oauth.check_rate_limit"):  # Skip rate limiting
            response = client.post(
                "/api/v1/auth/google-oauth",
                json={"credential": "fake_google_token"},
            )

        assert response.status_code == 409
        error_detail = response.json()["detail"]
        assert "already registered with a different authentication method" in error_detail["error"]
        assert error_detail["error_type"] == "email_different_provider"

    @patch("api.google_oauth.verify_google_token")
    def test_oauth_login_allows_google_account_login(
        self, mock_verify_token, client: TestClient, db: Session
    ):
        """Test that Google OAuth login works for GOOGLE accounts."""
        # Create a GOOGLE user
        google_user = User(
            email="google@example.com",
            first_name="Google",
            last_name="User",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google123",
            email_verified=True,
        )
        db.add(google_user)
        db.commit()

        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "google@example.com",
            "sub": "google123",
            "email_verified": True,
        }

        # Google OAuth login should work
        with patch("api.google_oauth.check_rate_limit"):  # Skip rate limiting
            response = client.post(
                "/api/v1/auth/google-oauth",
                json={"credential": "fake_google_token"},
            )

        assert response.status_code == 200
        assert "access_token" in response.json()

    @patch("api.google_oauth.verify_google_token")
    def test_oauth_login_allows_hybrid_account_login(
        self, mock_verify_token, client: TestClient, db: Session
    ):
        """Test that Google OAuth login works for HYBRID accounts."""
        # Create a HYBRID user
        hybrid_user = User(
            email="hybrid@example.com",
            first_name="Hybrid",
            last_name="User",
            auth_provider=AuthProvider.HYBRID,
            google_id="google456",
            password_hash=get_password_hash("password123"),
            email_verified=True,
        )
        db.add(hybrid_user)
        db.commit()

        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "hybrid@example.com",
            "sub": "google456",
            "email_verified": True,
        }

        # Google OAuth login should work for hybrid accounts
        with patch("api.google_oauth.check_rate_limit"):  # Skip rate limiting
            response = client.post(
                "/api/v1/auth/google-oauth",
                json={"credential": "fake_google_token"},
            )

        assert response.status_code == 200
        assert "access_token" in response.json()