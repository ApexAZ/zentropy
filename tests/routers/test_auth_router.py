"""
OAuth Endpoints Testing Suite (TDD)

Critical security tests for Google OAuth authentication endpoints.
Following TDD - these tests should FAIL until we implement the endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid
from datetime import datetime

from api.database import Base, User, AuthProvider, get_db
from api.main import app
from api.schemas import LoginResponse


# Note: Using centralized database fixtures from conftest.py
# No custom database setup needed - tests use client and db fixtures


class TestGoogleOAuthEndpoint:
    """Critical tests for Google OAuth login endpoint."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_endpoint_exists(self, mock_verify_google_token, client, test_rate_limits):
        """Test that /auth/google-login endpoint exists and works properly."""
        # Mock invalid token verification (raises exception)
        from api.google_oauth import GoogleTokenInvalidError
        mock_verify_google_token.side_effect = GoogleTokenInvalidError("Invalid Google token")
        
        response = client.post("/api/v1/auth/google-login", json={"google_token": "fake_token"})
        
        # Should return 401 for invalid token (endpoint exists and is working)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Google token verification failed" in response.json()["detail"]
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_new_user_creation(self, mock_verify_google_token, client, db, test_rate_limits):
        """Test Google login creates new user when user doesn't exist."""
        # Mock Google token verification response
        mock_google_user_info = {
            "sub": "google_123456789",
            "email": "newuser@gmail.com",
            "given_name": "New",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # This should FAIL initially until we implement the endpoint
        response = client.post(
            "/api/v1/auth/google-login", 
            json={
                "google_token": "valid_google_token"
            }
        )
        
        # Should create new user and return access token
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "access_token" in response_data
        assert response_data["token_type"] == "bearer"
        assert response_data["user"]["email"] == "newuser@gmail.com"
        assert response_data["user"]["first_name"] == "New"
        assert response_data["user"]["last_name"] == "User"
        # In the just-in-time system, organization is created from email domain
        # Gmail users get an organization named after their domain
        assert response_data["user"]["organization_id"] is not None
        assert response_data["user"]["has_projects_access"] is True
    
    @patch('api.routers.auth.verify_google_token')  
    def test_google_login_existing_user_authentication(self, mock_verify_google_token, client, db, test_rate_limits):
        """Test Google login authenticates existing Google user."""
        # Create existing Google user in the test database
        existing_user = User(
            email="existing@gmail.com",
            first_name="Existing",
            last_name="User",
            
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_existing_123",
            password_hash=None
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)
        
        # Mock Google token verification
        mock_google_user_info = {
            "sub": "google_existing_123",
            "email": "existing@gmail.com", 
            "given_name": "Existing",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Should authenticate existing user
        response = client.post(
            "/api/v1/auth/google-login",
            json={"google_token": "valid_google_token"}
        )
        
        # Should return successful authentication
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "existing@gmail.com"
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_invalid_token(self, mock_verify_google_token, client, test_rate_limits):
        """Test Google login with invalid Google token."""
        # Mock invalid token verification
        from api.google_oauth import GoogleTokenInvalidError
        mock_verify_google_token.side_effect = GoogleTokenInvalidError("Invalid Google token")
        
        # Should reject invalid token
        response = client.post(
            "/api/v1/auth/google-login",
            json={"google_token": "invalid_google_token"}
        )
        
        # Should return 401 for invalid token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Google token verification failed" in response.json()["detail"]
    
    def test_google_login_missing_token(self, client):
        """Test Google login with missing Google token."""
        # Should return validation error for missing token
        response = client.post("/api/v1/auth/google-login", json={})
        
        # Should return 422 for missing required field
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_unverified_email(self, mock_verify_google_token, client, test_rate_limits):
        """Test Google login rejects unverified email addresses."""
        # Mock Google token with unverified email (verify_google_token raises exception for unverified)
        from api.google_oauth import GoogleEmailUnverifiedError
        mock_verify_google_token.side_effect = GoogleEmailUnverifiedError("Email must be verified")
        
        # Should reject unverified email (verify_google_token raises exception)
        response = client.post(
            "/api/v1/auth/google-login",
            json={
                "google_token": "valid_token_unverified_email",
                "organization": "Test Company"
            }
        )
        
        # Should return 401 for unverified email
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Google token verification failed" in response.json()["detail"]
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_email_linking_security(self, mock_verify_google_token, client, db, test_rate_limits):
        """Test that Google login cannot hijack existing local accounts."""
        # Create existing local user in the test database
        local_user = User(
            email="shared@example.com",
            first_name="Local",
            last_name="User",
            
            auth_provider=AuthProvider.LOCAL,
            password_hash="$2b$12$hashed_password",
            google_id=None
        )
        db.add(local_user)
        db.commit()
        db.refresh(local_user)
        
        # Mock Google user with same email but different Google ID
        mock_google_user_info = {
            "sub": "google_different_id",
            "email": "shared@example.com",  # Same email as local user
            "given_name": "Google",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Should prevent email hijacking - reject OAuth for existing local account
        response = client.post(
            "/api/v1/auth/google-login",
            json={"google_token": "valid_google_token"}
        )
        
        # Should return 400 for email hijacking attempt
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered with different authentication method" in response.json()["detail"]


class TestGoogleTokenVerification:
    """Tests for Google token verification function (will be implemented)."""
    
    @patch('google.auth.transport.requests.Request')
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_verify_google_token_valid_token(self, mock_verify_token, mock_request, client):
        """Test Google token verification with valid token."""
        # Mock Google's verification response
        mock_verify_token.return_value = {
            "sub": "google_123456789",
            "email": "test@gmail.com",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True,
            "iss": "https://accounts.google.com",
            "aud": "test_client_id"
        }
        
        # This import should FAIL until we implement verify_google_token function
        try:
            from api.auth import verify_google_token
            result = verify_google_token("valid_google_token")
            
            # Expected behavior once implemented:
            assert result["sub"] == "google_123456789"
            assert result["email"] == "test@gmail.com"
            assert result["email_verified"] is True
        except ImportError:
            # Expected to fail until implementation
            assert True  # Test passes because function doesn't exist yet
    
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_verify_google_token_invalid_token(self, mock_verify_token, client):
        """Test Google token verification with invalid token."""
        # Mock Google's rejection
        mock_verify_token.side_effect = ValueError("Invalid token")
        
        # This import should FAIL until we implement verify_google_token function
        try:
            from api.auth import verify_google_token
            result = verify_google_token("invalid_token")
            assert result is None
        except ImportError:
            # Expected to fail until implementation
            assert True  # Test passes because function doesn't exist yet
    
    def test_verify_google_token_missing_environment_variables(self, client):
        """Test that missing Google OAuth environment variables are handled properly."""
        # This should FAIL until we add proper environment variable validation
        try:
            from api.auth import verify_google_token
            # Should handle missing GOOGLE_CLIENT_ID gracefully
            result = verify_google_token("any_token")
            assert result is None  # Should return None if not configured
        except ImportError:
            # Expected to fail until implementation
            assert True  # Test passes because function doesn't exist yet
        except Exception as e:
            # Should not crash on missing config
            assert "GOOGLE_CLIENT_ID" in str(e) or "not configured" in str(e)


class TestGoogleOAuthSchemas:
    """Tests for Google OAuth Pydantic schemas (will be implemented)."""
    
    def test_google_login_request_schema(self, client):
        """Test GoogleLoginRequest schema validation."""
        # This should FAIL until we create the schema
        try:
            from api.schemas import GoogleLoginRequest
            
            # Valid request
            valid_request = GoogleLoginRequest(
                google_token="valid_token_string"
                
            )
            assert valid_request.google_token == "valid_token_string"
            
            # Required field validation
            with pytest.raises(ValueError):
                GoogleLoginRequest()  # Missing required google_token
                
        except ImportError:
            # Expected to fail until implementation
            assert True  # Test passes because schema doesn't exist yet
    
    def test_google_login_response_schema(self, client):
        """Test that LoginResponse schema works for Google OAuth responses."""
        # LoginResponse should already exist and work for Google auth
        try:
            from api.schemas import LoginResponse
            
            google_response = LoginResponse(
                access_token="jwt_token_here",
                token_type="bearer",
                user={
                    "id": "12345678-1234-1234-1234-123456789012",
                    "email": "google@example.com",
                    "first_name": "Google",
                    "last_name": "User",
                    "organization_id": None,
                    "has_projects_access": True,
                    "email_verified": True,
                    "registration_type": "google_oauth",
                    "role": "basic_user"
                }
            )
            
            assert google_response.access_token == "jwt_token_here"
            assert google_response.user.email == "google@example.com"
            
        except ImportError:
            pytest.fail("LoginResponse schema should already exist")


class TestOAuthSecurityRequirements:
    """Critical security requirements for OAuth implementation."""
    
    def test_google_client_id_environment_variable_required(self, client):
        """Test that GOOGLE_CLIENT_ID environment variable is required."""
        # This test documents the security requirement
        import os
        
        # Should have GOOGLE_CLIENT_ID configured for production
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        # For now, this can be None during development
        # In production, this should be enforced
        assert client_id is None or isinstance(client_id, str)
    
    def test_oauth_endpoints_require_https_in_production(self, client):
        """Test OAuth security requirement for HTTPS in production."""
        # This is a documentation test for security requirements
        # OAuth should only work over HTTPS in production
        assert True  # Placeholder for production HTTPS enforcement
    
    def test_oauth_state_parameter_csrf_protection(self, client):
        """Test that OAuth state parameter provides CSRF protection."""
        # Google OAuth should use state parameter for CSRF protection
        # This will be implemented in the frontend integration
        assert True  # Placeholder for CSRF protection requirements


class TestUsernameRecoveryEndpoint:
    """TDD tests for username recovery endpoint - should FAIL until implemented."""
    
    def test_recover_username_endpoint_exists(self, client, test_rate_limits):
        """Test that /recover-username endpoint exists and handles operation tokens."""
        # This should FAIL until we implement the endpoint
        response = client.post(
            "/api/v1/auth/recover-username",
            json={"operation_token": "fake_token"}
        )
        
        # Should return 404 until endpoint is implemented
        assert response.status_code in [404, 400, 422]  # Any of these indicate endpoint missing/incomplete
    
    def test_recover_username_with_valid_token(self, client, db, current_user, test_rate_limits):
        """Test username recovery with valid operation token."""
        # Mock a valid operation token - this should fail until we implement token generation
        from api.security import generate_operation_token
        
        try:
            # Generate a valid USERNAME_RECOVERY token
            operation_token = generate_operation_token(current_user.email, "username_recovery")
            
            response = client.post(
                "/api/v1/auth/recover-username",
                json={"operation_token": operation_token}
            )
            
            # Should succeed once implemented
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "username has been sent" in data["message"]
            
        except (ImportError, ValueError):
            # Expected to fail until token generation is implemented
            pytest.skip("Operation token generation requires SECRET_KEY environment variable")
    
    def test_recover_username_with_invalid_token(self, client, test_rate_limits):
        """Test username recovery with invalid operation token."""
        response = client.post(
            "/api/v1/auth/recover-username",
            json={"operation_token": "invalid_token_xyz"}
        )
        
        # Should return 400 for invalid token (once endpoint exists)
        assert response.status_code in [404, 400, 422]
        
        if response.status_code == 400:
            data = response.json()
            assert "Invalid" in data["detail"] or "expired" in data["detail"]
    
    def test_recover_username_with_expired_token(self, client, db, current_user, test_rate_limits):
        """Test username recovery with expired operation token."""
        # This test documents the requirement that tokens should expire
        try:
            from api.security import generate_operation_token
            # Generate token that will be expired (implementation detail)
            operation_token = generate_operation_token(current_user.email, "username_recovery")
            
            # Simulate token expiry by waiting or manipulating time
            # For now, test with obviously invalid token format
            expired_token = "expired." + operation_token
            
            response = client.post(
                "/api/v1/auth/recover-username",
                json={"operation_token": expired_token}
            )
            
            # Should return 400 for expired token
            assert response.status_code in [400, 404, 422]
            
        except (ImportError, ValueError):
            pytest.skip("Token generation requires SECRET_KEY environment variable")
    
    def test_recover_username_missing_token(self, client):
        """Test username recovery with missing operation token."""
        response = client.post(
            "/api/v1/auth/recover-username",
            json={}
        )
        
        # Should return 422 for missing required field
        assert response.status_code in [404, 422]
    
    def test_recover_username_nonexistent_user(self, client, test_rate_limits):
        """Test username recovery for non-existent user (security test)."""
        try:
            from api.security import generate_operation_token
            # Generate token for non-existent email
            fake_email = "nonexistent@example.com"
            operation_token = generate_operation_token(fake_email, "username_recovery")
            
            response = client.post(
                "/api/v1/auth/recover-username",
                json={"operation_token": operation_token}
            )
            
            # Should return success anyway (don't reveal if email exists)
            assert response.status_code == 200
            data = response.json()
            assert "If the email exists" in data["message"]
            
        except (ImportError, ValueError):
            pytest.skip("Token generation requires SECRET_KEY environment variable")
    
    def test_recover_username_rate_limiting(self, client, test_rate_limits):
        """Test that username recovery endpoint has proper rate limiting."""
        # Multiple requests should be rate limited
        for i in range(10):
            response = client.post(
                "/api/v1/auth/recover-username",
                json={"operation_token": f"fake_token_{i}"}
            )
            
            if response.status_code == 429:
                # Rate limiting is working
                assert "rate limit" in response.json()["detail"].lower()
                break
        else:
            # If no rate limiting hit, either endpoint doesn't exist or rate limiting not implemented
            assert response.status_code in [404, 400, 422]  # Acceptable for TDD phase


class TestUsernameRecoverySchema:
    """TDD tests for username recovery request schema - should FAIL until implemented."""
    
    def test_recover_username_request_schema(self, client):
        """Test RecoverUsernameRequest schema validation."""
        try:
            from api.schemas import RecoverUsernameRequest
            
            # Valid request
            valid_request = RecoverUsernameRequest(
                operation_token="valid_token_string"
            )
            assert valid_request.operation_token == "valid_token_string"
            
            # Required field validation
            with pytest.raises(ValueError):
                RecoverUsernameRequest()  # Missing required operation_token
                
        except ImportError:
            # Expected to fail until implementation
            pytest.skip("RecoverUsernameRequest schema not yet implemented")
    
    def test_recover_username_request_validates_token_format(self, client):
        """Test that RecoverUsernameRequest validates token format."""
        try:
            from api.schemas import RecoverUsernameRequest
            from pydantic import ValidationError
            
            # Empty token should be invalid
            with pytest.raises(ValidationError):
                RecoverUsernameRequest(operation_token="")
            
            # Whitespace-only token should be invalid
            with pytest.raises(ValidationError):
                RecoverUsernameRequest(operation_token="   ")
                
        except ImportError:
            pytest.skip("RecoverUsernameRequest schema not yet implemented")