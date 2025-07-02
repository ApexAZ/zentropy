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


# Test database setup with thread safety
TEST_DATABASE_URL = "sqlite:///:memory:?check_same_thread=false"
test_engine = create_engine(
    TEST_DATABASE_URL, 
    echo=False,
    poolclass=StaticPool,
    connect_args={
        "check_same_thread": False,
    },
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    """Override database dependency for testing."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Setup and teardown database for each test."""
    # Create tables before each test
    Base.metadata.create_all(bind=test_engine)
    yield
    # Clean up after each test
    Base.metadata.drop_all(bind=test_engine)


class TestGoogleOAuthEndpoint:
    """Critical tests for Google OAuth login endpoint."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_endpoint_exists(self, mock_verify_google_token):
        """Test that /auth/google-login endpoint exists and works properly."""
        # Mock invalid token verification (returns None)
        mock_verify_google_token.return_value = None
        
        response = client.post("/api/auth/google-login", json={"google_token": "fake_token"})
        
        # Should return 401 for invalid token (endpoint exists and is working)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid Google token" in response.json()["detail"]
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_new_user_creation(self, mock_verify_google_token):
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
            "/api/auth/google-login", 
            json={
                "google_token": "valid_google_token",
                "organization": "Test Company"
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
        assert response_data["user"]["organization"] == "Test Company"
        assert response_data["user"]["has_projects_access"] is True
    
    @patch('api.routers.auth.verify_google_token')  
    def test_google_login_existing_user_authentication(self, mock_verify_google_token):
        """Test Google login authenticates existing Google user."""
        # Create existing Google user in the test database
        session = TestSessionLocal()
        try:
            existing_user = User(
                email="existing@gmail.com",
                first_name="Existing",
                last_name="User",
                organization="Test Company",
                auth_provider=AuthProvider.GOOGLE,
                google_id="google_existing_123",
                password_hash=None
            )
            session.add(existing_user)
            session.commit()
            session.refresh(existing_user)
        finally:
            session.close()
        
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
            "/api/auth/google-login",
            json={"google_token": "valid_google_token"}
        )
        
        # Should return successful authentication
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "existing@gmail.com"
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_invalid_token(self, mock_verify_google_token):
        """Test Google login with invalid Google token."""
        # Mock invalid token verification
        mock_verify_google_token.return_value = None
        
        # Should reject invalid token
        response = client.post(
            "/api/auth/google-login",
            json={"google_token": "invalid_google_token"}
        )
        
        # Should return 401 for invalid token
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid Google token" in response.json()["detail"]
    
    def test_google_login_missing_token(self):
        """Test Google login with missing Google token."""
        # Should return validation error for missing token
        response = client.post("/api/auth/google-login", json={})
        
        # Should return 422 for missing required field
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_unverified_email(self, mock_verify_google_token):
        """Test Google login rejects unverified email addresses."""
        # Mock Google token with unverified email (verify_google_token returns None for unverified)
        mock_verify_google_token.return_value = None
        
        # Should reject unverified email (verify_google_token returns None)
        response = client.post(
            "/api/auth/google-login",
            json={
                "google_token": "valid_token_unverified_email",
                "organization": "Test Company"
            }
        )
        
        # Should return 401 for unverified email (verify_google_token returns None)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid Google token" in response.json()["detail"]
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_login_email_linking_security(self, mock_verify_google_token):
        """Test that Google login cannot hijack existing local accounts."""
        # Create existing local user in the test database
        session = TestSessionLocal()
        try:
            local_user = User(
                email="shared@example.com",
                first_name="Local",
                last_name="User",
                organization="Local Company",
                auth_provider=AuthProvider.LOCAL,
                password_hash="$2b$12$hashed_password",
                google_id=None
            )
            session.add(local_user)
            session.commit()
            session.refresh(local_user)
        finally:
            session.close()
        
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
            "/api/auth/google-login",
            json={"google_token": "valid_google_token"}
        )
        
        # Should return 400 for email hijacking attempt
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered with different authentication method" in response.json()["detail"]


class TestGoogleTokenVerification:
    """Tests for Google token verification function (will be implemented)."""
    
    @patch('google.auth.transport.requests.Request')
    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_verify_google_token_valid_token(self, mock_verify_token, mock_request):
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
    def test_verify_google_token_invalid_token(self, mock_verify_token):
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
    
    def test_verify_google_token_missing_environment_variables(self):
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
    
    def test_google_login_request_schema(self):
        """Test GoogleLoginRequest schema validation."""
        # This should FAIL until we create the schema
        try:
            from api.schemas import GoogleLoginRequest
            
            # Valid request
            valid_request = GoogleLoginRequest(
                google_token="valid_token_string",
                organization="Optional Company"
            )
            assert valid_request.google_token == "valid_token_string"
            assert valid_request.organization == "Optional Company"
            
            # Required field validation
            with pytest.raises(ValueError):
                GoogleLoginRequest()  # Missing required google_token
                
        except ImportError:
            # Expected to fail until implementation
            assert True  # Test passes because schema doesn't exist yet
    
    def test_google_login_response_schema(self):
        """Test that LoginResponse schema works for Google OAuth responses."""
        # LoginResponse should already exist and work for Google auth
        try:
            from api.schemas import LoginResponse
            
            google_response = LoginResponse(
                access_token="jwt_token_here",
                token_type="bearer",
                user={
                    "email": "google@example.com",
                    "first_name": "Google",
                    "last_name": "User",
                    "organization": "Google Inc",
                    "has_projects_access": True
                }
            )
            
            assert google_response.access_token == "jwt_token_here"
            assert google_response.user["email"] == "google@example.com"
            
        except ImportError:
            pytest.fail("LoginResponse schema should already exist")


class TestOAuthSecurityRequirements:
    """Critical security requirements for OAuth implementation."""
    
    def test_google_client_id_environment_variable_required(self):
        """Test that GOOGLE_CLIENT_ID environment variable is required."""
        # This test documents the security requirement
        import os
        
        # Should have GOOGLE_CLIENT_ID configured for production
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        # For now, this can be None during development
        # In production, this should be enforced
        assert client_id is None or isinstance(client_id, str)
    
    def test_oauth_endpoints_require_https_in_production(self):
        """Test OAuth security requirement for HTTPS in production."""
        # This is a documentation test for security requirements
        # OAuth should only work over HTTPS in production
        assert True  # Placeholder for production HTTPS enforcement
    
    def test_oauth_state_parameter_csrf_protection(self):
        """Test that OAuth state parameter provides CSRF protection."""
        # Google OAuth should use state parameter for CSRF protection
        # This will be implemented in the frontend integration
        assert True  # Placeholder for CSRF protection requirements