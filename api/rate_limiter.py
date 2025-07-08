"""
Redis-based rate limiting for production with in-memory fallback.

This module provides a comprehensive rate limiting system that uses Redis for
production deployments and falls back to in-memory storage for development.
"""

import os
import redis
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

from fastapi import HTTPException


class RateLimitType(Enum):
    """Rate limit types for different endpoint categories."""

    AUTH = "auth"  # Login, registration, password reset
    OAUTH = "oauth"  # OAuth authentication
    API = "api"  # General API endpoints
    EMAIL = "email"  # Email verification, sending


class RateLimitError(HTTPException):
    """Rate limit exceeded error."""

    def __init__(self, message: str, retry_after: int = 60):
        super().__init__(
            status_code=429, detail=message, headers={"Retry-After": str(retry_after)}
        )


class RateLimiter:
    """
    Production-ready rate limiter with Redis backend and in-memory fallback.

    Features:
    - Redis-based storage for production (distributed, persistent)
    - In-memory fallback for development (no Redis required)
    - Configurable rate limits via environment variables
    - Sliding window rate limiting algorithm
    - Different limits for different endpoint types
    """

    def __init__(self) -> None:
        self.redis_client: Optional[redis.Redis] = None
        self._memory_store: Dict[str, List[datetime]] = {}
        self._setup_redis()
        self._load_config()

    def _setup_redis(self) -> None:
        """Initialize Redis connection with fallback to in-memory."""
        try:
            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            redis_db = int(os.getenv("REDIS_DB", "0"))
            redis_password = os.getenv("REDIS_PASSWORD") or None

            # Create Redis connection
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                password=redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )

            # Test connection
            self.redis_client.ping()
            print(f"✅ Redis connected: {redis_host}:{redis_port}")

        except Exception as e:
            print(f"⚠️  Redis unavailable, using in-memory rate limiting: {e}")
            self.redis_client = None

    def _load_config(self) -> None:
        """Load rate limiting configuration from environment variables."""
        enabled_str = os.getenv("RATE_LIMIT_ENABLED", "true").lower()
        self.enabled = enabled_str == "true"

        # Authentication endpoints (login, register) - strict limits
        auth_req = os.getenv("RATE_LIMIT_AUTH_REQUESTS", "5")
        self.auth_requests = int(auth_req)
        auth_win = os.getenv("RATE_LIMIT_AUTH_WINDOW_MINUTES", "15")
        self.auth_window_minutes = int(auth_win)

        # OAuth endpoints - moderate limits (already implemented)
        oauth_req = os.getenv("RATE_LIMIT_OAUTH_REQUESTS", "20")
        self.oauth_requests = int(oauth_req)
        oauth_win = os.getenv("RATE_LIMIT_OAUTH_WINDOW_MINUTES", "1")
        self.oauth_window_minutes = int(oauth_win)

        # General API endpoints - generous limits
        api_req = os.getenv("RATE_LIMIT_API_REQUESTS", "100")
        self.api_requests = int(api_req)
        api_win = os.getenv("RATE_LIMIT_API_WINDOW_MINUTES", "1")
        self.api_window_minutes = int(api_win)

        # Email endpoints (verification, sending) - strict limits
        email_req = os.getenv("RATE_LIMIT_EMAIL_REQUESTS", "3")
        self.email_requests = int(email_req)
        email_win = os.getenv("RATE_LIMIT_EMAIL_WINDOW_MINUTES", "5")
        self.email_window_minutes = int(email_win)

    def _get_rate_limit_config(self, limit_type: RateLimitType) -> Tuple[int, int]:
        """Get max requests and window minutes for a rate limit type."""
        if limit_type == RateLimitType.AUTH:
            return self.auth_requests, self.auth_window_minutes
        elif limit_type == RateLimitType.OAUTH:
            return self.oauth_requests, self.oauth_window_minutes
        elif limit_type == RateLimitType.EMAIL:
            return self.email_requests, self.email_window_minutes
        else:  # API
            return self.api_requests, self.api_window_minutes

    def _redis_check_rate_limit(
        self, key: str, max_requests: int, window_seconds: int
    ) -> None:
        """Redis-based sliding window rate limiting."""
        if not self.redis_client:
            raise redis.RedisError("Redis client not available")

        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=window_seconds)

        pipe = self.redis_client.pipeline()

        # Remove expired entries
        pipe.zremrangebyscore(key, 0, window_start.timestamp())

        # Count current requests in window
        pipe.zcard(key)

        # Execute pipeline
        results = pipe.execute()
        current_requests = int(results[1])  # Type: ignore

        if current_requests >= max_requests:
            # Calculate retry after time
            oldest_req = self.redis_client.zrange(key, 0, 0, withscores=True)
            if oldest_req:
                oldest_ts = float(oldest_req[0][1])  # type: ignore
                oldest_time = datetime.fromtimestamp(oldest_ts)
                retry_delta = oldest_time + timedelta(seconds=window_seconds) - now
                retry_after = int(retry_delta.total_seconds()) + 1
            else:
                retry_after = window_seconds

            window_min = window_seconds // 60
            raise RateLimitError(
                f"Rate limit exceeded: {max_requests} requests per "
                f"{window_min} minutes. Try again in {retry_after} seconds.",
                retry_after=retry_after,
            )

        # Add current request
        timestamp = now.timestamp()
        self.redis_client.zadd(key, {str(timestamp): timestamp})

        # Set expiration for cleanup
        self.redis_client.expire(key, window_seconds)

    def _memory_check_rate_limit(
        self,
        key: str,  # Now uses the same key format as Redis
        max_requests: int,
        window_minutes: int,
    ) -> None:
        """In-memory sliding window rate limiting (development fallback)."""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)

        # Get or create request history for this specific key
        if key not in self._memory_store:
            self._memory_store[key] = []

        # Remove old requests outside the window
        self._memory_store[key] = [
            request_time
            for request_time in self._memory_store[key]
            if request_time > window_start
        ]

        # Check if rate limit is exceeded
        if len(self._memory_store[key]) >= max_requests:
            raise RateLimitError(
                f"Rate limit exceeded: {max_requests} requests per "
                f"{window_minutes} minutes. Try again later.",
                retry_after=window_minutes * 60,
            )

        # Add current request
        self._memory_store[key].append(now)

    def check_rate_limit(
        self, identifier: str, limit_type: RateLimitType = RateLimitType.API
    ) -> None:
        """
        Check if request is within rate limits.

        Args:
            identifier: Unique identifier (IP address, user ID, etc.)
            limit_type: Type of rate limit to apply

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        if not self.enabled:
            return

        max_requests, window_minutes = self._get_rate_limit_config(limit_type)

        # Create unique key for this rate limit
        key = f"rate_limit:{limit_type.value}:{identifier}"

        try:
            if self.redis_client:
                # Use Redis for production
                window_sec = window_minutes * 60
                self._redis_check_rate_limit(key, max_requests, window_sec)
            else:
                # Use in-memory for development
                self._memory_check_rate_limit(key, max_requests, window_minutes)

        except redis.RedisError:
            # Redis failed, fall back to in-memory
            print("⚠️  Redis error, falling back to in-memory rate limiting")
            self._memory_check_rate_limit(key, max_requests, window_minutes)
        except Exception as e:
            # Any other Redis-related error, fall back to in-memory
            if self.redis_client:  # Only print if we were trying to use Redis
                msg = f"⚠️  Redis error ({e}), falling back to in-memory"
                print(msg)
            self._memory_check_rate_limit(key, max_requests, window_minutes)

    def reset_rate_limit(self, identifier: str, limit_type: RateLimitType) -> None:
        """
        Reset rate limit for a specific identifier (for testing).

        Args:
            identifier: Unique identifier to reset
            limit_type: Type of rate limit to reset
        """
        key = f"rate_limit:{limit_type.value}:{identifier}"

        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except redis.RedisError:
                pass

        # Also clear from memory store
        if key in self._memory_store:
            del self._memory_store[key]

    def get_rate_limit_status(
        self, identifier: str, limit_type: RateLimitType
    ) -> Dict[str, int]:
        """
        Get current rate limit status for debugging.

        Args:
            identifier: Unique identifier
            limit_type: Type of rate limit to check

        Returns:
            Dict with current requests, max requests, and reset time
        """
        max_requests, window_minutes = self._get_rate_limit_config(limit_type)
        key = f"rate_limit:{limit_type.value}:{identifier}"

        if self.redis_client:
            try:
                current_requests = self.redis_client.zcard(key)
                ttl = self.redis_client.ttl(key)
                return {
                    "current_requests": int(current_requests),  # type: ignore
                    "max_requests": max_requests,
                    "reset_in_seconds": int(ttl) if ttl > 0 else 0,  # type: ignore
                    "window_minutes": window_minutes,
                }
            except redis.RedisError:
                pass

        # Fall back to memory store
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)

        if key in self._memory_store:
            current_requests = len(
                [req for req in self._memory_store[key] if req > window_start]
            )
        else:
            current_requests = 0

        return {
            "current_requests": current_requests,
            "max_requests": max_requests,
            "reset_in_seconds": window_minutes * 60,
            "window_minutes": window_minutes,
        }


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_ip(request: Any) -> str:
    """
    Extract client IP address from FastAPI request.

    Handles X-Forwarded-For header for load balancer/proxy setups.
    """
    # Check for X-Forwarded-For header (load balancer/proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        return str(forwarded_for.split(",")[0].strip())

    # Check for X-Real-IP header (Nginx proxy)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return str(real_ip.strip())

    # Fall back to direct client IP
    return str(request.client.host) if request.client else "unknown"
