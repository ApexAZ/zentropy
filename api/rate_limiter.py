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
    - Exponential backoff for repeated violations (NEW)
    - Dual tracking: IP-based and user-based rate limiting (NEW)
    """

    def __init__(self) -> None:
        self.redis_client: Optional[redis.Redis[str]] = None
        self._memory_store: Dict[str, List[datetime]] = {}
        self._violation_store: Dict[str, Dict[str, Any]] = (
            {}
        )  # For exponential backoff tracking
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

        # Exponential backoff configuration
        backoff_enabled = os.getenv("RATE_LIMIT_EXPONENTIAL_BACKOFF", "true").lower()
        self.exponential_backoff_enabled = backoff_enabled == "true"

        # Violation tracking window (how long to remember violations)
        violation_window = os.getenv("RATE_LIMIT_VIOLATION_WINDOW_HOURS", "24")
        self.violation_window_hours = int(violation_window)

        # Maximum backoff delay (cap exponential growth)
        max_backoff = os.getenv("RATE_LIMIT_MAX_BACKOFF_SECONDS", "300")  # 5 minutes
        self.max_backoff_seconds = int(max_backoff)

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

    def _get_violation_key(self, identifier: str, limit_type: RateLimitType) -> str:
        """Get Redis key for violation tracking."""
        return f"violations:{limit_type.value}:{identifier}"

    def _calculate_exponential_backoff(self, violation_count: int) -> int:
        """Calculate exponential backoff delay in seconds."""
        if violation_count <= 0:
            return 0

        # Exponential backoff: 2^(violations-1) seconds, capped at max_backoff_seconds
        delay = min(2 ** (violation_count - 1), self.max_backoff_seconds)
        return int(delay)

    def _redis_track_violation(self, violation_key: str) -> int:
        """Track a violation in Redis and return current violation count."""
        if not self.redis_client:
            raise redis.RedisError("Redis client not available")

        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=self.violation_window_hours)

        pipe = self.redis_client.pipeline()

        # Remove old violations outside the window
        pipe.zremrangebyscore(violation_key, 0, window_start.timestamp())

        # Add current violation
        pipe.zadd(violation_key, {str(now.timestamp()): now.timestamp()})

        # Get current violation count
        pipe.zcard(violation_key)

        # Set expiration for cleanup
        pipe.expire(violation_key, self.violation_window_hours * 3600)

        results = pipe.execute()
        return int(results[2]) if len(results) > 2 else 1

    def _memory_track_violation(self, violation_key: str) -> int:
        """Track a violation in memory and return current violation count."""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=self.violation_window_hours)

        if violation_key not in self._violation_store:
            self._violation_store[violation_key] = {
                "violations": [],
                "last_cleanup": now,
            }

        store = self._violation_store[violation_key]

        # Clean up old violations if needed (every hour)
        if now - store["last_cleanup"] > timedelta(hours=1):
            store["violations"] = [
                v_time for v_time in store["violations"] if v_time > window_start
            ]
            store["last_cleanup"] = now

        # Add current violation
        store["violations"].append(now)

        return len(store["violations"])

    def _redis_get_violation_count(self, violation_key: str) -> int:
        """Get current violation count from Redis."""
        if not self.redis_client:
            return 0

        try:
            now = datetime.now(timezone.utc)
            window_start = now - timedelta(hours=self.violation_window_hours)

            # Clean up old violations and get count
            pipe = self.redis_client.pipeline()
            pipe.zremrangebyscore(violation_key, 0, window_start.timestamp())
            pipe.zcard(violation_key)
            results = pipe.execute()

            return int(results[1]) if len(results) > 1 else 0
        except redis.RedisError:
            return 0

    def _memory_get_violation_count(self, violation_key: str) -> int:
        """Get current violation count from memory."""
        if violation_key not in self._violation_store:
            return 0

        now = datetime.now(timezone.utc)
        window_start = now - timedelta(hours=self.violation_window_hours)

        store = self._violation_store[violation_key]

        # Count recent violations
        recent_violations = [
            v_time for v_time in store["violations"] if v_time > window_start
        ]

        return len(recent_violations)

    def _check_exponential_backoff(
        self, identifier: str, limit_type: RateLimitType
    ) -> None:
        """Check if request should be delayed due to exponential backoff."""
        if not self.exponential_backoff_enabled:
            return

        violation_key = self._get_violation_key(identifier, limit_type)

        # Get current violation count with proper fallback handling
        violation_count = 0
        try:
            if self.redis_client:
                violation_count = self._redis_get_violation_count(violation_key)
            else:
                violation_count = self._memory_get_violation_count(violation_key)
        except (redis.RedisError, Exception):
            # Fall back to memory tracking for Redis errors
            violation_count = self._memory_get_violation_count(violation_key)

        if violation_count > 0:
            delay_seconds = self._calculate_exponential_backoff(violation_count)
            if delay_seconds > 0:
                message = (
                    f"Exponential backoff active due to {violation_count} violations. "
                    f"Please wait {delay_seconds} seconds before trying again."
                )
                raise RateLimitError(message, retry_after=delay_seconds)

    def _record_violation(self, identifier: str, limit_type: RateLimitType) -> None:
        """Record a rate limit violation for exponential backoff tracking."""
        if not self.exponential_backoff_enabled:
            return

        violation_key = self._get_violation_key(identifier, limit_type)

        try:
            if self.redis_client:
                self._redis_track_violation(violation_key)
            else:
                self._memory_track_violation(violation_key)
        except (redis.RedisError, Exception):
            # Fall back to memory tracking for Redis errors
            self._memory_track_violation(violation_key)

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
        results: List[Any] = pipe.execute()
        current_requests = int(results[1]) if len(results) > 1 else 0

        if current_requests >= max_requests:
            # Calculate retry after time
            oldest_req = self.redis_client.zrange(key, 0, 0, withscores=True)
            if oldest_req:
                oldest_ts = float(oldest_req[0][1])
                oldest_time = datetime.fromtimestamp(oldest_ts, tz=timezone.utc)
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
        Check if request is within rate limits with exponential backoff support.

        Args:
            identifier: Unique identifier (IP address, user ID, etc.)
            limit_type: Type of rate limit to apply

        Raises:
            RateLimitError: If rate limit is exceeded or exponential backoff is active
        """
        if not self.enabled:
            return

        # Step 1: Check exponential backoff first (if enabled)
        # This prevents further requests if there have been recent violations
        self._check_exponential_backoff(identifier, limit_type)

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

        except RateLimitError as e:
            # Step 2: Record violation for exponential backoff
            self._record_violation(identifier, limit_type)
            raise e  # Re-raise the original rate limit error
        except redis.RedisError:
            # Redis failed, fall back to in-memory
            print("⚠️  Redis error, falling back to in-memory rate limiting")
            try:
                self._memory_check_rate_limit(key, max_requests, window_minutes)
            except RateLimitError as e:
                self._record_violation(identifier, limit_type)
                raise e
        except Exception as e:
            # Any other Redis-related error, fall back to in-memory
            if self.redis_client:  # Only print if we were trying to use Redis
                msg = f"⚠️  Redis error ({e}), falling back to in-memory"
                print(msg)
            try:
                self._memory_check_rate_limit(key, max_requests, window_minutes)
            except RateLimitError as rate_e:
                self._record_violation(identifier, limit_type)
                raise rate_e

    def reset_rate_limit(self, identifier: str, limit_type: RateLimitType) -> None:
        """
        Reset rate limit for a specific identifier (for testing).
        Also clears violation history for exponential backoff.

        Args:
            identifier: Unique identifier to reset
            limit_type: Type of rate limit to reset
        """
        key = f"rate_limit:{limit_type.value}:{identifier}"
        violation_key = self._get_violation_key(identifier, limit_type)

        if self.redis_client:
            try:
                # Clear both rate limit and violation tracking
                pipe = self.redis_client.pipeline()
                pipe.delete(key)
                pipe.delete(violation_key)
                pipe.execute()
            except redis.RedisError:
                pass

        # Also clear from memory stores
        if key in self._memory_store:
            del self._memory_store[key]

        if violation_key in self._violation_store:
            del self._violation_store[violation_key]

    def get_rate_limit_status(
        self, identifier: str, limit_type: RateLimitType
    ) -> Dict[str, Any]:
        """
        Get current rate limit status for debugging, including exponential backoff info.

        Args:
            identifier: Unique identifier
            limit_type: Type of rate limit to check

        Returns:
            Dict with current requests, max requests, reset time, and backoff status
        """
        max_requests, window_minutes = self._get_rate_limit_config(limit_type)
        key = f"rate_limit:{limit_type.value}:{identifier}"

        # Get violation count for exponential backoff info
        violation_count = 0
        backoff_delay = 0
        if self.exponential_backoff_enabled:
            try:
                if self.redis_client:
                    violation_key = self._get_violation_key(identifier, limit_type)
                    violation_count = self._redis_get_violation_count(violation_key)
                else:
                    violation_count = self._memory_get_violation_count(
                        self._get_violation_key(identifier, limit_type)
                    )
                backoff_delay = self._calculate_exponential_backoff(violation_count)
            except (redis.RedisError, Exception):
                # Fall back to memory tracking for any error
                violation_count = self._memory_get_violation_count(
                    self._get_violation_key(identifier, limit_type)
                )
                backoff_delay = self._calculate_exponential_backoff(violation_count)

        if self.redis_client:
            try:
                current_requests = self.redis_client.zcard(key)
                ttl = self.redis_client.ttl(key)
                return {
                    "current_requests": int(current_requests),
                    "max_requests": max_requests,
                    "reset_in_seconds": int(ttl) if ttl > 0 else 0,
                    "window_minutes": window_minutes,
                    "exponential_backoff_enabled": self.exponential_backoff_enabled,
                    "violation_count": violation_count,
                    "backoff_delay_seconds": backoff_delay,
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
            "exponential_backoff_enabled": self.exponential_backoff_enabled,
            "violation_count": violation_count,
            "backoff_delay_seconds": backoff_delay,
        }

    def check_dual_rate_limit(
        self,
        ip_address: str,
        user_id: Optional[str] = None,
        limit_type: RateLimitType = RateLimitType.API,
    ) -> None:
        """
        Check rate limits for both IP address and user ID (if provided).
        This provides layered protection against both distributed and targeted attacks.

        Args:
            ip_address: Client IP address
            user_id: User ID (optional, for authenticated requests)
            limit_type: Type of rate limit to apply

        Raises:
            RateLimitError: If rate limit is exceeded for either IP or user
        """
        if not self.enabled:
            return

        # Always check IP-based rate limiting
        try:
            self.check_rate_limit(ip_address, limit_type)
        except RateLimitError as e:
            # Add context to error message to indicate this was IP-based
            error_msg = f"IP rate limit exceeded: {e.detail}"
            retry_after = 60
            if e.headers and "Retry-After" in e.headers:
                try:
                    retry_after = int(e.headers["Retry-After"])
                except (ValueError, TypeError):
                    retry_after = 60
            raise RateLimitError(error_msg, retry_after=retry_after)

        # Also check user-based rate limiting if user is authenticated
        if user_id:
            try:
                self.check_rate_limit(f"user:{user_id}", limit_type)
            except RateLimitError as e:
                # Add context to error message to indicate this was user-based
                error_msg = f"User rate limit exceeded: {e.detail}"
                retry_after = 60
                if e.headers and "Retry-After" in e.headers:
                    try:
                        retry_after = int(e.headers["Retry-After"])
                    except (ValueError, TypeError):
                        retry_after = 60
                raise RateLimitError(error_msg, retry_after=retry_after)

    def reset_dual_rate_limit(
        self,
        ip_address: str,
        user_id: Optional[str] = None,
        limit_type: RateLimitType = RateLimitType.API,
    ) -> None:
        """
        Reset rate limits for both IP address and user ID (for testing).

        Args:
            ip_address: Client IP address to reset
            user_id: User ID to reset (optional)
            limit_type: Type of rate limit to reset
        """
        # Reset IP-based rate limit
        self.reset_rate_limit(ip_address, limit_type)

        # Reset user-based rate limit if provided
        if user_id:
            self.reset_rate_limit(f"user:{user_id}", limit_type)


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
