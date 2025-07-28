"""Tests for Redis-based rate limiting system."""

import pytest
import time
from unittest.mock import Mock, patch
from fastapi import Request
from fastapi.testclient import TestClient

from api.rate_limiter import RateLimiter, RateLimitType, RateLimitError, get_client_ip
from api.config import reload_security_config


class TestRateLimiter:
    """Test rate limiting functionality."""

    def test_rate_limiter_initialization(self):
        """Test rate limiter initializes correctly."""
        rate_limiter = RateLimiter()
        assert rate_limiter is not None
        assert hasattr(rate_limiter, "enabled")
        assert hasattr(rate_limiter, "redis_client")

    def test_rate_limit_config_loading(self):
        """Test rate limit configuration loading."""
        with patch.dict("os.environ", {
            "RATE_LIMIT_ENABLED": "true",
            "RATE_LIMIT_AUTH_REQUESTS": "10",
            "RATE_LIMIT_AUTH_WINDOW_MINUTES": "5",
            "RATE_LIMIT_OAUTH_REQUESTS": "25",
            "RATE_LIMIT_OAUTH_WINDOW_MINUTES": "2"
        }):
            # Reload security configuration to pick up environment changes
            reload_security_config()
            rate_limiter = RateLimiter()
            assert rate_limiter.enabled is True
            assert rate_limiter.auth_requests == 10
            assert rate_limiter.auth_window_minutes == 5
            assert rate_limiter.oauth_requests == 25
            assert rate_limiter.oauth_window_minutes == 2
        
        # Cleanup: Reload configuration to restore defaults after test
        reload_security_config()

    def test_get_rate_limit_config(self):
        """Test getting rate limit configuration for different types."""
        rate_limiter = RateLimiter()
        
        # Test AUTH limits
        max_requests, window_minutes = rate_limiter._get_rate_limit_config(RateLimitType.AUTH)
        assert max_requests == rate_limiter.auth_requests
        assert window_minutes == rate_limiter.auth_window_minutes
        
        # Test OAUTH limits
        max_requests, window_minutes = rate_limiter._get_rate_limit_config(RateLimitType.OAUTH)
        assert max_requests == rate_limiter.oauth_requests
        assert window_minutes == rate_limiter.oauth_window_minutes
        
        # Test EMAIL limits
        max_requests, window_minutes = rate_limiter._get_rate_limit_config(RateLimitType.EMAIL)
        assert max_requests == rate_limiter.email_requests
        assert window_minutes == rate_limiter.email_window_minutes

    def test_memory_rate_limiting(self):
        """Test in-memory rate limiting when Redis is unavailable."""
        rate_limiter = RateLimiter()
        rate_limiter.redis_client = None  # Force in-memory mode
        rate_limiter.enabled = True  # Override disabled setting from .env
        
        # Configure strict limits for testing
        rate_limiter.auth_requests = 2
        rate_limiter.auth_window_minutes = 1
        
        identifier = "test_ip_123.123.123.123"
        
        # First request should succeed
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Second request should succeed
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Third request should fail
        with pytest.raises(RateLimitError) as exc_info:
            rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        assert "Rate limit exceeded" in str(exc_info.value.detail)
        assert exc_info.value.status_code == 429

    def test_rate_limit_disabled(self):
        """Test that rate limiting can be disabled."""
        rate_limiter = RateLimiter()
        rate_limiter.enabled = False
        
        identifier = "test_ip_disabled"
        
        # Should allow unlimited requests when disabled
        for _ in range(100):
            rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)

    def test_rate_limit_reset(self):
        """Test rate limit reset functionality."""
        rate_limiter = RateLimiter()
        rate_limiter.redis_client = None  # Force in-memory mode
        rate_limiter.enabled = True  # Override disabled setting from .env
        
        # Configure strict limits
        rate_limiter.auth_requests = 1
        rate_limiter.auth_window_minutes = 10  # Long window
        
        identifier = "test_ip_reset"
        
        # Use up the rate limit
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Should be rate limited
        with pytest.raises(RateLimitError):
            rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Reset the rate limit
        rate_limiter.reset_rate_limit(identifier, RateLimitType.AUTH)
        
        # Should work again
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)

    def test_different_limit_types_independent(self):
        """Test that different rate limit types are independent."""
        rate_limiter = RateLimiter()
        rate_limiter.redis_client = None  # Force in-memory mode
        rate_limiter.enabled = True  # Override disabled setting from .env
        
        # Configure strict limits
        rate_limiter.auth_requests = 1
        rate_limiter.oauth_requests = 1
        rate_limiter.email_requests = 1
        
        identifier = "test_ip_independent"
        
        # Use up AUTH limit
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        with pytest.raises(RateLimitError):
            rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # OAUTH should still work
        rate_limiter.check_rate_limit(identifier, RateLimitType.OAUTH)
        
        # EMAIL should still work
        rate_limiter.check_rate_limit(identifier, RateLimitType.EMAIL)

    def test_get_rate_limit_status(self):
        """Test getting rate limit status for debugging."""
        rate_limiter = RateLimiter()
        rate_limiter.redis_client = None  # Force in-memory mode
        rate_limiter.enabled = True  # Override disabled setting from .env
        
        identifier = "test_ip_status"
        
        # Check initial status
        status = rate_limiter.get_rate_limit_status(identifier, RateLimitType.AUTH)
        assert status["current_requests"] == 0
        assert status["max_requests"] == rate_limiter.auth_requests
        assert status["window_minutes"] == rate_limiter.auth_window_minutes
        
        # Make a request
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Check updated status
        status = rate_limiter.get_rate_limit_status(identifier, RateLimitType.AUTH)
        assert status["current_requests"] == 1


class TestClientIPExtraction:
    """Test client IP extraction functionality."""

    def test_get_client_ip_direct(self):
        """Test getting client IP from direct connection."""
        # Mock request with direct client
        request = Mock(spec=Request)
        request.headers = {}
        request.client = Mock()
        request.client.host = "192.168.1.100"
        
        ip = get_client_ip(request)
        assert ip == "192.168.1.100"

    def test_get_client_ip_forwarded_for(self):
        """Test getting client IP from X-Forwarded-For header."""
        request = Mock(spec=Request)
        request.headers = {"X-Forwarded-For": "203.0.113.10, 192.168.1.1"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        ip = get_client_ip(request)
        assert ip == "203.0.113.10"

    def test_get_client_ip_real_ip(self):
        """Test getting client IP from X-Real-IP header."""
        request = Mock(spec=Request)
        request.headers = {"X-Real-IP": "203.0.113.20"}
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        ip = get_client_ip(request)
        assert ip == "203.0.113.20"

    def test_get_client_ip_no_client(self):
        """Test getting client IP when client is None."""
        request = Mock(spec=Request)
        request.headers = {}
        request.client = None
        
        ip = get_client_ip(request)
        assert ip == "unknown"

    def test_get_client_ip_priority(self):
        """Test that X-Forwarded-For takes priority over X-Real-IP."""
        request = Mock(spec=Request)
        request.headers = {
            "X-Forwarded-For": "203.0.113.30",
            "X-Real-IP": "203.0.113.40"
        }
        request.client = Mock()
        request.client.host = "192.168.1.1"
        
        ip = get_client_ip(request)
        assert ip == "203.0.113.30"


class TestRateLimitError:
    """Test rate limit error handling."""

    def test_rate_limit_error_creation(self):
        """Test creating rate limit error."""
        error = RateLimitError("Test message", retry_after=120)
        
        assert error.status_code == 429
        assert error.detail == "Test message"
        assert error.headers == {"Retry-After": "120"}

    def test_rate_limit_error_default_retry_after(self):
        """Test rate limit error with default retry after."""
        error = RateLimitError("Test message")
        
        assert error.status_code == 429
        assert error.detail == "Test message"
        assert error.headers == {"Retry-After": "60"}


class TestRedisIntegration:
    """Test Redis integration functionality."""

    @patch("api.rate_limiter.redis.Redis")
    def test_redis_connection_success(self, mock_redis_class):
        """Test successful Redis connection."""
        mock_redis_instance = Mock()
        mock_redis_instance.ping.return_value = True
        mock_redis_class.return_value = mock_redis_instance
        
        with patch.dict("os.environ", {
            "REDIS_HOST": "localhost",
            "REDIS_PORT": "6379",
            "REDIS_DB": "0"
        }):
            rate_limiter = RateLimiter()
            assert rate_limiter.redis_client is not None

    @patch("api.rate_limiter.redis.Redis")
    def test_redis_connection_failure(self, mock_redis_class):
        """Test Redis connection failure fallback."""
        mock_redis_instance = Mock()
        mock_redis_instance.ping.side_effect = Exception("Connection failed")
        mock_redis_class.return_value = mock_redis_instance
        
        rate_limiter = RateLimiter()
        assert rate_limiter.redis_client is None

    @patch("api.rate_limiter.redis.Redis")
    def test_redis_rate_limiting_fallback(self, mock_redis_class):
        """Test fallback to memory when Redis operations fail."""
        mock_redis_instance = Mock()
        mock_redis_instance.ping.return_value = True
        mock_redis_instance.pipeline.side_effect = Exception("Redis error")
        mock_redis_class.return_value = mock_redis_instance
        
        rate_limiter = RateLimiter()
        rate_limiter.enabled = True  # Override disabled setting from .env
        rate_limiter.auth_requests = 1  # Strict limit for testing
        
        identifier = "test_ip_fallback"
        
        # First request should succeed (falls back to memory)
        rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)
        
        # Second request should fail (memory rate limiting kicks in)
        with pytest.raises(RateLimitError):
            rate_limiter.check_rate_limit(identifier, RateLimitType.AUTH)


@pytest.mark.integration
class TestRateLimitingIntegration:
    """Integration tests for rate limiting with FastAPI endpoints."""

    def test_auth_endpoint_rate_limiting(self, client, db):
        """Test that authentication endpoints have rate limiting."""
        # This test would require the full FastAPI app setup
        # For now, we'll test that the rate limiter is properly imported
        from api.routers.auth import rate_limiter
        assert rate_limiter is not None

    def test_rate_limit_headers_in_response(self):
        """Test that rate limit errors include proper headers."""
        error = RateLimitError("Too many requests", retry_after=300)
        
        assert error.status_code == 429
        assert "Retry-After" in error.headers
        assert error.headers["Retry-After"] == "300"

    def test_different_endpoints_different_limits(self):
        """Test that different endpoints can have different rate limits."""
        rate_limiter = RateLimiter()
        
        # AUTH and EMAIL should have different limits
        auth_config = rate_limiter._get_rate_limit_config(RateLimitType.AUTH)
        email_config = rate_limiter._get_rate_limit_config(RateLimitType.EMAIL)
        
        # Default config should have AUTH less strict than EMAIL
        assert auth_config[0] > email_config[0]  # AUTH allows more requests
        assert auth_config[1] > email_config[1]  # AUTH has longer window