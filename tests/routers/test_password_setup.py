"""
Tests for password setup functionality
"""

import pytest
from fastapi.testclient import TestClient
from api.database import AuthProvider
from tests.conftest import create_test_user


def test_setup_password_for_oauth_user(client: TestClient, db):
    """Test setting up password for OAuth-only user"""
    from api.auth import create_access_token
    
    # Create OAuth-only user (no password)
    oauth_user = create_test_user(
        db,
        email="oauth@example.com",
        password_hash=None,  # No password initially
        google_id="google123",  # Has OAuth provider linked
        auth_provider=AuthProvider.GOOGLE,
    )

    # Create auth headers for this specific user
    token = create_access_token(data={"sub": str(oauth_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # Setup password
    response = client.post(
        "/api/v1/users/me/setup-password",
        json={"new_password": "NewSecurePassword123!"},
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Password set up successfully"

    # Verify user now has password and HYBRID auth
    db.refresh(oauth_user)
    assert oauth_user.password_hash is not None
    assert oauth_user.auth_provider == AuthProvider.HYBRID


def test_setup_password_already_has_password(client: TestClient, db):
    """Test that users with existing passwords cannot use password setup"""
    from api.auth import create_access_token
    
    # Create user with password (use password_hash parameter)
    user_with_password = create_test_user(
        db,
        email="withpassword@example.com",
        google_id="google456",
    )

    # Create auth headers
    token = create_access_token(data={"sub": str(user_with_password.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/users/me/setup-password",
        json={"new_password": "NewPassword123!"},
        headers=headers,
    )

    assert response.status_code == 400
    data = response.json()
    assert "Password is already set up" in data["detail"]


def test_setup_password_no_oauth_linked(client: TestClient, db):
    """Test that users without OAuth providers cannot setup password"""
    from api.auth import create_access_token
    
    # Create user with no OAuth providers linked
    email_only_user = create_test_user(
        db,
        email="emailonly@example.com",
        password_hash=None,  # No password
        auth_provider=AuthProvider.LOCAL,
    )

    # Create auth headers
    token = create_access_token(data={"sub": str(email_only_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/users/me/setup-password",
        json={"new_password": "NewPassword123!"},
        headers=headers,
    )

    assert response.status_code == 400
    data = response.json()
    assert "requires at least one linked OAuth provider" in data["detail"]


def test_setup_password_weak_password(client: TestClient, db):
    """Test password strength validation during setup"""
    from api.auth import create_access_token
    
    oauth_user = create_test_user(
        db,
        email="oauth2@example.com",
        password_hash=None,
        microsoft_id="microsoft123",
        auth_provider=AuthProvider.MICROSOFT,
    )

    # Create auth headers
    token = create_access_token(data={"sub": str(oauth_user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/api/v1/users/me/setup-password",
        json={"new_password": "weak"},  # Weak password
        headers=headers,
    )

    assert response.status_code == 400
    data = response.json()
    assert "password" in data["detail"].lower()