"""
Remember Me Functionality Tests

Tests for "Remember Me" login feature that extends token expiration
when users choose to stay logged in for extended periods.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.main import app
from api.database import User

# Note: Using isolated test database fixtures from conftest.py
# This ensures tests don't pollute the main database
from api.auth import create_access_token, verify_token_string, ACCESS_TOKEN_EXPIRE_MINUTES
from api.schemas import UserLogin

class TestRememberMeBackend:
    """Test Remember Me functionality in backend authentication."""

    def test_user_login_schema_accepts_remember_me_field(self, client):
        """Test that UserLogin schema accepts remember_me field."""
        # This should FAIL initially since remember_me is not in the schema
        login_data = {
            "email": "test@example.com"
            "password": "password123"
            "remember_me": True
        }
        
        # This should not raise a validation error
        user_login = UserLogin(**login_data)
        assert user_login.email == "test@example.com"
        assert user_login.password == "password123"
        assert user_login.remember_me is True

    def test_user_login_schema_defaults_remember_me_false(self, client):
        """Test that remember_me defaults to False when not provided."""
        login_data = {
            "email": "test@example.com", 
            "password": "password123"
        }
        
        user_login = UserLogin(**login_data)
        assert user_login.remember_me is False

    def test_login_with_remember_me_true_creates_extended_token(self, client):
        """Test that remember_me=True creates token with extended expiration."""
        # Create test user first
        with patch('api.routers.auth.authenticate_user') as mock_auth:
            # Mock authenticated user
            mock_user = User(
                id="test-user-id"
                email="test@example.com"
                first_name="Test"
                last_name="User"
                
                email_verified=True
                is_active=True
            )
            mock_auth.return_value = mock_user

            # Login with remember_me=True
            response = client.post("/api/auth/login-json", json={
                "email": "test@example.com"
                "password": "password123"
                "remember_me": True
            })

            assert response.status_code == 200
            data = response.json()
            
            # Verify token has extended expiration (should be 30 days for remember_me)
            token = data["access_token"]
            payload = verify_token_string(token)
            
            # Calculate expected extended expiration (30 days = 43200 minutes)
            extended_minutes = 30 * 24 * 60  # 30 days in minutes
            normal_minutes = ACCESS_TOKEN_EXPIRE_MINUTES  # Default (likely 60 minutes)
            
            # Token should expire much later than normal token
            assert payload["exp"] > (datetime.utcnow() + timedelta(minutes=normal_minutes * 2)).timestamp()

    def test_login_with_remember_me_false_creates_normal_token(self, client):
        """Test that remember_me=False creates token with normal expiration."""
        with patch('api.routers.auth.authenticate_user') as mock_auth:
            # Mock authenticated user
            mock_user = User(
                id="test-user-id"
                email="test@example.com"
                first_name="Test"
                last_name="User", 
                
                email_verified=True
                is_active=True
            )
            mock_auth.return_value = mock_user

            # Login with remember_me=False
            response = client.post("/api/auth/login-json", json={
                "email": "test@example.com"
                "password": "password123", 
                "remember_me": False
            })

            assert response.status_code == 200
            data = response.json()
            
            # Verify token has normal expiration
            token = data["access_token"]
            payload = verify_token_string(token)
            
            # Token should expire around normal time (within reasonable margin)
            expected_exp = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            margin = timedelta(minutes=5)  # 5 minute margin
            
            token_exp = datetime.utcfromtimestamp(payload["exp"])  # Use UTC for consistency
            assert abs(token_exp - expected_exp) < margin

    def test_login_without_remember_me_defaults_to_normal_token(self, client):
        """Test that login without remember_me field defaults to normal token expiration."""
        with patch('api.routers.auth.authenticate_user') as mock_auth:
            # Mock authenticated user
            mock_user = User(
                id="test-user-id"
                email="test@example.com"
                first_name="Test"
                last_name="User"
                , 
                email_verified=True
                is_active=True
            )
            mock_auth.return_value = mock_user

            # Login without remember_me field
            response = client.post("/api/auth/login-json", json={
                "email": "test@example.com"
                "password": "password123"
            })

            assert response.status_code == 200
            data = response.json()
            
            # Should behave same as remember_me=False
            token = data["access_token"]
            payload = verify_token_string(token)
            
            expected_exp = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            margin = timedelta(minutes=5)
            
            token_exp = datetime.utcfromtimestamp(payload["exp"])  # Use UTC for consistency
            assert abs(token_exp - expected_exp) < margin


class TestRememberMeConstants:
    """Test Remember Me configuration constants."""

    def test_extended_token_expiration_constant_exists(self, client):
        """Test that EXTENDED_TOKEN_EXPIRE_MINUTES constant is defined."""
        from api.auth import EXTENDED_TOKEN_EXPIRE_MINUTES
        
        # Should be 30 days in minutes
        expected_minutes = 30 * 24 * 60  # 43200 minutes
        assert EXTENDED_TOKEN_EXPIRE_MINUTES == expected_minutes

    def test_create_access_token_accepts_remember_me_parameter(self, client):
        """Test that create_access_token function accepts remember_me parameter."""
        # Test with remember_me=True
        token_extended = create_access_token(
            data={"sub": "test-user-id"}, 
            remember_me=True
        )
        
        # Test with remember_me=False  
        token_normal = create_access_token(
            data={"sub": "test-user-id"}
            remember_me=False
        )
        
        # Verify tokens are different (different expiration times)
        payload_extended = verify_token_string(token_extended)
        payload_normal = verify_token_string(token_normal)
        
        # Extended token should expire much later
        assert payload_extended["exp"] > payload_normal["exp"]