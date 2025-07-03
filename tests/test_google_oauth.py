import pytest
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


class TestGoogleOAuthEndpoint:
    """Test Google OAuth registration endpoint - TDD approach"""

    def setup_method(self, method):
        """Clear rate limit store before each test"""
        from api.google_oauth import clear_rate_limit_store
        clear_rate_limit_store()

    @pytest.fixture
    def mock_google_token(self):
        """Mock Google JWT token for testing"""
        return {
            "iss": "https://accounts.google.com",
            "sub": "1234567890",
            "email": "test.user@gmail.com",
            "email_verified": True,
            "given_name": "Test",
            "family_name": "User",
            "picture": "https://example.com/photo.jpg",
            "iat": 1234567890,
            "exp": 1234567890 + 3600
        }

    def test_google_oauth_endpoint_exists(self):
        """Test that Google OAuth endpoint exists and accepts POST requests"""
        # This test will FAIL initially - endpoint not implemented yet
        response = client.post("/api/auth/google-oauth", json={
            "credential": "mock-jwt-token"
        })
        
        # Should not return 404 (endpoint should exist)
        assert response.status_code != 404
        assert response.status_code in [200, 400, 401, 422, 500]  # Valid responses

    def test_google_oauth_requires_credential(self):
        """Test that Google OAuth endpoint requires credential parameter"""
        # This test will FAIL initially - validation not implemented
        response = client.post("/api/auth/google-oauth", json={})
        
        assert response.status_code == 422  # Validation error
        error_data = response.json()
        assert "credential" in str(error_data)

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_successful_registration(self, mock_verify, mock_google_token):
        """Test successful Google OAuth registration flow"""
        # This test will FAIL initially - Google OAuth flow not implemented
        mock_verify.return_value = mock_google_token
        
        response = client.post("/api/auth/google-oauth", json={
            "credential": "valid-jwt-token"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return access token and user data
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "test.user@gmail.com"
        assert data["user"]["first_name"] == "Test"
        assert data["user"]["last_name"] == "User"

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_invalid_token(self, mock_verify):
        """Test Google OAuth with invalid token"""
        # This test will FAIL initially - token validation not implemented
        from api.google_oauth import GoogleTokenInvalidError
        mock_verify.side_effect = GoogleTokenInvalidError("Invalid token")
        
        response = client.post("/api/auth/google-oauth", json={
            "credential": "invalid-jwt-token"
        })
        
        assert response.status_code == 401
        error_data = response.json()
        assert "Invalid token" in error_data["detail"]

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_existing_user_login(self, mock_verify, mock_google_token):
        """Test Google OAuth with existing user (login instead of registration)"""
        # This test will FAIL initially - existing user handling not implemented
        mock_verify.return_value = mock_google_token
        
        # First registration
        response1 = client.post("/api/auth/google-oauth", json={
            "credential": "valid-jwt-token"
        })
        assert response1.status_code == 200
        
        # Second attempt should login existing user
        response2 = client.post("/api/auth/google-oauth", json={
            "credential": "valid-jwt-token"
        })
        assert response2.status_code == 200
        
        data = response2.json()
        assert data["user"]["email"] == "test.user@gmail.com"

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_unverified_email(self, mock_verify):
        """Test Google OAuth with unverified email"""
        # This test will FAIL initially - email verification check not implemented
        from api.google_oauth import GoogleEmailUnverifiedError
        mock_verify.side_effect = GoogleEmailUnverifiedError("Email must be verified with Google")
        
        response = client.post("/api/auth/google-oauth", json={
            "credential": "unverified-token"
        })
        
        assert response.status_code == 400
        error_data = response.json()
        assert "email must be verified" in error_data["detail"].lower()

    def test_google_oauth_missing_environment_config(self):
        """Test Google OAuth when environment configuration is missing"""
        # This test will FAIL initially - environment validation not implemented
        with patch.dict('os.environ', {}, clear=True):
            response = client.post("/api/auth/google-oauth", json={
                "credential": "any-token"
            })
            
            assert response.status_code == 500
            error_data = response.json()
            assert "Google OAuth not configured" in error_data["detail"]

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_database_error_handling(self, mock_verify, mock_google_token):
        """Test Google OAuth when database operations fail"""
        # This test will FAIL initially - database error handling not implemented
        mock_verify.return_value = mock_google_token
        
        with patch('api.google_oauth.get_or_create_google_user') as mock_create:
            mock_create.side_effect = Exception("Database connection failed")
            
            response = client.post("/api/auth/google-oauth", json={
                "credential": "valid-jwt-token"
            })
            
            assert response.status_code == 500
            error_data = response.json()
            assert "registration failed" in error_data["detail"].lower()

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_sets_projects_access_default(self, mock_verify, mock_google_token):
        """Test that Google OAuth users get default projects access"""
        # This test will FAIL initially - projects access logic not implemented
        mock_verify.return_value = mock_google_token
        
        response = client.post("/api/auth/google-oauth", json={
            "credential": "valid-jwt-token"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["has_projects_access"] is True  # Default should be True

    @patch('api.google_oauth.verify_google_token')
    @patch('api.google_oauth.check_rate_limit')
    def test_google_oauth_rate_limiting(self, mock_rate_limit, mock_verify, mock_google_token):
        """Test that Google OAuth respects rate limiting"""
        # This test will FAIL initially - rate limiting not implemented
        mock_verify.return_value = mock_google_token
        
        # Set up rate limit to trigger on 5th request
        call_count = 0
        def rate_limit_side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count > 5:
                from api.google_oauth import GoogleRateLimitError
                raise GoogleRateLimitError("Rate limit exceeded")
        
        mock_rate_limit.side_effect = rate_limit_side_effect
        
        # Make multiple rapid requests
        responses = []
        for i in range(10):
            # Create different tokens to avoid user conflicts
            token = mock_google_token.copy()
            token["email"] = f"user{i}@gmail.com"
            mock_verify.return_value = token
            
            response = client.post("/api/auth/google-oauth", json={
                "credential": f"token-{i}"
            })
            responses.append(response)
        
        # Should eventually hit rate limit
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited, "Rate limiting should be enforced"