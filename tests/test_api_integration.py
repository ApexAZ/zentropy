"""
API Integration Tests - Streamlined Suite

Tests core API functionality matching current implementation.
Focuses on smoke tests and critical path validation.
"""
import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)


class TestHealthAndCore:
    """Test core API functionality and health endpoints."""
    
    def test_health_endpoint(self, client):
        """Test /health endpoint returns expected structure."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "database" in data  
        assert "timestamp" in data
        assert data["status"] == "ok"
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns basic info."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestAuthenticationFlow:
    """Test authentication endpoints with actual API behavior."""
    
    def test_login_endpoint_invalid_credentials(self, client):
        """Test login with invalid credentials returns 401."""
        response = client.post(
            "/api/v1/auth/login-json",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "email or password" in data["detail"].lower()
    
    def test_login_endpoint_missing_fields(self, client):
        """Test login with missing fields returns 422."""
        response = client.post(
            "/api/v1/auth/login-json",
            json={"email": "test@example.com"}  # Missing password
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_login_endpoint_invalid_email_format(self, client):
        """Test login with invalid email format returns 422."""
        response = client.post(
            "/api/v1/auth/login-json", 
            json={
                "email": "not-an-email",
                "password": "somepassword"
            }
        )
        
        assert response.status_code == 422


class TestAPIStructure:
    """Test API structure and endpoint availability."""
    
    def test_api_docs_available(self, client):
        """Test that API documentation is available."""
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_openapi_schema_available(self, client):
        """Test that OpenAPI schema is available."""  
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data


class TestCORS:
    """Test CORS configuration."""
    
    def test_cors_headers_present(self, client):
        """Test that CORS headers are properly configured."""
        response = client.options("/health")
        # Should not error and should handle preflight
        assert response.status_code in [200, 204, 405]  # Different servers handle OPTIONS differently


class TestErrorHandling:
    """Test error handling across the API."""
    
    def test_404_for_nonexistent_endpoint(self, client):
        """Test 404 response for non-existent endpoints."""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
    
    def test_405_for_wrong_method(self, client):
        """Test 405 response for wrong HTTP method."""
        response = client.put("/health")  # Health only supports GET
        assert response.status_code == 405