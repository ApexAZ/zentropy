"""
Security Configuration Module

Centralized security configuration with environment variable support
and comprehensive validation for production deployments.

This module provides:
- Environment-based configuration with sensible defaults
- Production validation with warnings for insecure settings
- Type-safe configuration loading with error handling
- Documentation for all security parameters
"""

import os
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass


class Environment(Enum):
    """Application environment types"""

    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class JWTConfig:
    """JWT (JSON Web Token) security configuration"""

    # Token expiration settings
    access_token_expire_minutes: int
    extended_token_expire_minutes: int  # For "remember me" functionality

    # Cryptographic settings
    algorithm: str

    # Production validation
    require_secure_key_in_production: bool = True


@dataclass
class PasswordConfig:
    """Password security and validation configuration"""

    # Password strength requirements
    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_digits: bool
    require_special_chars: bool

    # Password history settings
    history_count: int  # Number of previous passwords to remember

    # Password complexity scoring (future enhancement)
    enable_complexity_scoring: bool = False
    min_complexity_score: int = 0


@dataclass
class RateLimitConfig:
    """Rate limiting configuration for different endpoint types"""

    # Global rate limiting settings
    enabled: bool
    exponential_backoff_enabled: bool
    max_backoff_seconds: int
    violation_window_hours: int

    # Authentication endpoints (login, register, password reset)
    auth_requests: int
    auth_window_minutes: int

    # OAuth endpoints
    oauth_requests: int
    oauth_window_minutes: int

    # General API endpoints
    api_requests: int
    api_window_minutes: int

    # Email endpoints (verification, sending)
    email_requests: int
    email_window_minutes: int


@dataclass
class VerificationConfig:
    """Verification code configuration for different verification types"""

    # Code generation settings
    code_length: int
    code_type: str  # "numeric" or "alphanumeric"

    # Type-specific configurations
    email_verification: Dict[str, Any]
    two_factor_auth: Dict[str, Any]
    password_reset: Dict[str, Any]
    password_change: Dict[str, Any]
    email_change: Dict[str, Any]
    account_recovery: Dict[str, Any]
    sensitive_action: Dict[str, Any]


@dataclass
class SecurityConfig:
    """Complete security configuration for the application"""

    environment: Environment
    jwt: JWTConfig
    password: PasswordConfig
    rate_limiting: RateLimitConfig
    verification: VerificationConfig

    # Additional security settings
    session_timeout_minutes: int
    max_concurrent_sessions: int
    enable_audit_logging: bool
    enable_security_headers: bool


class SecurityConfigLoader:
    """Loads and validates security configuration from environment variables"""

    @staticmethod
    def get_environment() -> Environment:
        """Determine the current application environment"""
        env_str = os.getenv("NODE_ENV", "development").lower()

        try:
            return Environment(env_str)
        except ValueError:
            print(f"⚠️  Unknown environment '{env_str}', defaulting to development")
            return Environment.DEVELOPMENT

    @staticmethod
    def get_int_env(
        key: str,
        default: int,
        min_value: Optional[int] = None,
        max_value: Optional[int] = None,
    ) -> int:
        """Get integer environment variable with validation"""
        try:
            value = int(os.getenv(key, str(default)))

            if min_value is not None and value < min_value:
                print(f"⚠️  {key}={value} is below minimum {min_value}, using minimum")
                return min_value

            if max_value is not None and value > max_value:
                print(f"⚠️  {key}={value} is above maximum {max_value}, using maximum")
                return max_value

            return value
        except ValueError:
            print(f"⚠️  Invalid integer value for {key}, using default {default}")
            return default

    @staticmethod
    def get_bool_env(key: str, default: bool) -> bool:
        """Get boolean environment variable"""
        value = os.getenv(key, str(default)).lower()
        return value in ("true", "1", "yes", "on")

    @staticmethod
    def load_jwt_config(environment: Environment) -> JWTConfig:
        """Load JWT configuration with environment-specific defaults"""

        if environment == Environment.PRODUCTION:
            # Production defaults - shorter expiration for security
            default_access_minutes = 15
            default_extended_minutes = 7 * 24 * 60  # 7 days instead of 30
        else:
            # Development defaults - longer for convenience
            default_access_minutes = 30
            default_extended_minutes = 30 * 24 * 60  # 30 days

        return JWTConfig(
            access_token_expire_minutes=SecurityConfigLoader.get_int_env(
                "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
                default_access_minutes,
                min_value=5,  # Minimum 5 minutes
                max_value=120,  # Maximum 2 hours
            ),
            extended_token_expire_minutes=SecurityConfigLoader.get_int_env(
                "JWT_EXTENDED_TOKEN_EXPIRE_MINUTES",
                default_extended_minutes,
                min_value=24 * 60,  # Minimum 1 day
                max_value=90 * 24 * 60,  # Maximum 90 days
            ),
            algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
            require_secure_key_in_production=SecurityConfigLoader.get_bool_env(
                "JWT_REQUIRE_SECURE_KEY_IN_PRODUCTION", True
            ),
        )

    @staticmethod
    def load_password_config(environment: Environment) -> PasswordConfig:
        """Load password security configuration"""

        if environment == Environment.PRODUCTION:
            # Production defaults - stricter requirements
            default_min_length = 12
            default_history_count = 24
            default_require_special = True
        else:
            # Development defaults - more lenient for testing
            default_min_length = 8
            default_history_count = 4
            default_require_special = False

        return PasswordConfig(
            min_length=SecurityConfigLoader.get_int_env(
                "PASSWORD_MIN_LENGTH", default_min_length, min_value=8, max_value=128
            ),
            require_uppercase=SecurityConfigLoader.get_bool_env(
                "PASSWORD_REQUIRE_UPPERCASE", True
            ),
            require_lowercase=SecurityConfigLoader.get_bool_env(
                "PASSWORD_REQUIRE_LOWERCASE", True
            ),
            require_digits=SecurityConfigLoader.get_bool_env(
                "PASSWORD_REQUIRE_DIGITS", True
            ),
            require_special_chars=SecurityConfigLoader.get_bool_env(
                "PASSWORD_REQUIRE_SPECIAL_CHARS", default_require_special
            ),
            history_count=SecurityConfigLoader.get_int_env(
                "PASSWORD_HISTORY_COUNT",
                default_history_count,
                min_value=4,
                max_value=50,
            ),
            enable_complexity_scoring=SecurityConfigLoader.get_bool_env(
                "PASSWORD_ENABLE_COMPLEXITY_SCORING", False
            ),
            min_complexity_score=SecurityConfigLoader.get_int_env(
                "PASSWORD_MIN_COMPLEXITY_SCORE", 0, min_value=0, max_value=100
            ),
        )

    @staticmethod
    def load_rate_limit_config(environment: Environment) -> RateLimitConfig:
        """Load rate limiting configuration"""

        if environment == Environment.PRODUCTION:
            # Production defaults - stricter limits
            default_auth_requests = 3
            default_auth_window = 15
        else:
            # Development defaults - more lenient
            default_auth_requests = 5
            default_auth_window = 15

        return RateLimitConfig(
            enabled=SecurityConfigLoader.get_bool_env("RATE_LIMIT_ENABLED", True),
            exponential_backoff_enabled=SecurityConfigLoader.get_bool_env(
                "RATE_LIMIT_EXPONENTIAL_BACKOFF", True
            ),
            max_backoff_seconds=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_MAX_BACKOFF_SECONDS",
                300,
                min_value=30,
                max_value=3600,  # Max 1 hour
            ),
            violation_window_hours=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_VIOLATION_WINDOW_HOURS",
                24,
                min_value=1,
                max_value=168,  # Max 7 days
            ),
            auth_requests=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_AUTH_REQUESTS",
                default_auth_requests,
                min_value=1,
                max_value=20,
            ),
            auth_window_minutes=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_AUTH_WINDOW_MINUTES",
                default_auth_window,
                min_value=1,
                max_value=60,
            ),
            oauth_requests=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_OAUTH_REQUESTS", 20, min_value=5, max_value=100
            ),
            oauth_window_minutes=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_OAUTH_WINDOW_MINUTES", 1, min_value=1, max_value=10
            ),
            api_requests=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_API_REQUESTS", 100, min_value=10, max_value=1000
            ),
            api_window_minutes=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_API_WINDOW_MINUTES", 1, min_value=1, max_value=10
            ),
            email_requests=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_EMAIL_REQUESTS", 3, min_value=1, max_value=10
            ),
            email_window_minutes=SecurityConfigLoader.get_int_env(
                "RATE_LIMIT_EMAIL_WINDOW_MINUTES", 5, min_value=1, max_value=30
            ),
        )

    @staticmethod
    def load_verification_config(environment: Environment) -> VerificationConfig:
        """Load verification code configuration"""

        if environment == Environment.PRODUCTION:
            # Production defaults - stricter settings
            default_email_expiration = 10  # 10 minutes instead of 15
            default_password_reset_expiration = 15  # 15 minutes instead of 30
        else:
            # Development defaults - match original hardcoded values exactly
            default_email_expiration = 15
            default_password_reset_expiration = 30

        return VerificationConfig(
            code_length=SecurityConfigLoader.get_int_env(
                "VERIFICATION_CODE_LENGTH", 6, min_value=4, max_value=8
            ),
            code_type=os.getenv("VERIFICATION_CODE_TYPE", "numeric"),
            email_verification={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_EXPIRATION_MINUTES",
                    default_email_expiration,
                    min_value=5,
                    max_value=60,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_MAX_ATTEMPTS",
                    3,  # Original hardcoded value
                    min_value=2,
                    max_value=10,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_RATE_LIMIT_MINUTES",
                    1,
                    min_value=1,
                    max_value=10,
                ),
                "hourly_limit": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_HOURLY_LIMIT", 6, min_value=3, max_value=20
                ),
            },
            two_factor_auth={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_2FA_EXPIRATION_MINUTES",
                    5,  # Original hardcoded value
                    min_value=2,
                    max_value=15,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_2FA_MAX_ATTEMPTS",
                    3,  # Original hardcoded value
                    min_value=2,
                    max_value=5,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_2FA_RATE_LIMIT_MINUTES", 1, min_value=1, max_value=5
                ),
            },
            password_reset={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_RESET_EXPIRATION_MINUTES",
                    default_password_reset_expiration,
                    min_value=10,
                    max_value=120,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_RESET_MAX_ATTEMPTS",
                    5,  # Original hardcoded value
                    min_value=3,
                    max_value=10,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_RESET_RATE_LIMIT_MINUTES",
                    2,
                    min_value=1,
                    max_value=10,
                ),
            },
            password_change={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_CHANGE_EXPIRATION_MINUTES",
                    15,  # Original hardcoded value
                    min_value=5,
                    max_value=60,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_CHANGE_MAX_ATTEMPTS",
                    3,  # Original hardcoded value
                    min_value=2,
                    max_value=5,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_PASSWORD_CHANGE_RATE_LIMIT_MINUTES",
                    1,
                    min_value=1,
                    max_value=5,
                ),
            },
            email_change={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_CHANGE_EXPIRATION_MINUTES",
                    15,  # Original hardcoded value
                    min_value=5,
                    max_value=60,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_CHANGE_MAX_ATTEMPTS",
                    3,  # Original hardcoded value
                    min_value=2,
                    max_value=5,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_EMAIL_CHANGE_RATE_LIMIT_MINUTES",
                    1,
                    min_value=1,
                    max_value=5,
                ),
            },
            account_recovery={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_ACCOUNT_RECOVERY_EXPIRATION_MINUTES",
                    60,  # Original hardcoded value
                    min_value=30,
                    max_value=240,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_ACCOUNT_RECOVERY_MAX_ATTEMPTS",
                    3,  # Original hardcoded value
                    min_value=2,
                    max_value=5,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_ACCOUNT_RECOVERY_RATE_LIMIT_MINUTES",
                    5,
                    min_value=2,
                    max_value=15,
                ),
            },
            sensitive_action={
                "expiration_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_SENSITIVE_ACTION_EXPIRATION_MINUTES",
                    10,  # Original hardcoded value
                    min_value=5,
                    max_value=30,
                ),
                "max_attempts": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_SENSITIVE_ACTION_MAX_ATTEMPTS",
                    2,  # Original hardcoded value
                    min_value=1,
                    max_value=3,
                ),
                "rate_limit_minutes": SecurityConfigLoader.get_int_env(
                    "VERIFICATION_SENSITIVE_ACTION_RATE_LIMIT_MINUTES",
                    1,
                    min_value=1,
                    max_value=5,
                ),
            },
        )

    @classmethod
    def load_security_config(cls) -> SecurityConfig:
        """Load complete security configuration"""
        environment = cls.get_environment()

        jwt_config = cls.load_jwt_config(environment)
        password_config = cls.load_password_config(environment)
        rate_limit_config = cls.load_rate_limit_config(environment)
        verification_config = cls.load_verification_config(environment)

        # Additional security settings
        session_timeout_minutes = cls.get_int_env(
            "SESSION_TIMEOUT_MINUTES",
            60 if environment == Environment.PRODUCTION else 120,
            min_value=15,
            max_value=480,  # Max 8 hours
        )

        max_concurrent_sessions = cls.get_int_env(
            "MAX_CONCURRENT_SESSIONS", 3, min_value=1, max_value=10
        )

        enable_audit_logging = cls.get_bool_env(
            "ENABLE_AUDIT_LOGGING", environment == Environment.PRODUCTION
        )

        enable_security_headers = cls.get_bool_env("ENABLE_SECURITY_HEADERS", True)

        config = SecurityConfig(
            environment=environment,
            jwt=jwt_config,
            password=password_config,
            rate_limiting=rate_limit_config,
            verification=verification_config,
            session_timeout_minutes=session_timeout_minutes,
            max_concurrent_sessions=max_concurrent_sessions,
            enable_audit_logging=enable_audit_logging,
            enable_security_headers=enable_security_headers,
        )

        # Validate configuration for production
        cls._validate_production_config(config)

        return config

    @staticmethod
    def _validate_production_config(config: SecurityConfig) -> None:
        """Validate configuration for production deployment"""
        if config.environment != Environment.PRODUCTION:
            return

        warnings = []

        # JWT validation
        if config.jwt.access_token_expire_minutes > 30:
            expiry_mins = config.jwt.access_token_expire_minutes
            warnings.append(
                f"JWT access token expiration ({expiry_mins}m) "
                "is longer than recommended 30 minutes for production"
            )

        # Password validation
        if config.password.min_length < 12:
            warnings.append(
                f"Password minimum length ({config.password.min_length}) "
                "is shorter than recommended 12 characters for production"
            )

        if config.password.history_count < 12:
            warnings.append(
                f"Password history count ({config.password.history_count}) "
                "is lower than recommended 12 for production"
            )

        # Rate limiting validation
        if not config.rate_limiting.enabled:
            warnings.append("Rate limiting is disabled in production")

        if config.rate_limiting.auth_requests > 5:
            warnings.append(
                f"Authentication rate limit ({config.rate_limiting.auth_requests}) "
                "is higher than recommended 5 for production"
            )

        # Security features validation
        if not config.enable_audit_logging:
            warnings.append("Audit logging is disabled in production")

        if not config.enable_security_headers:
            warnings.append("Security headers are disabled in production")

        # Print warnings
        if warnings:
            print("🚨 PRODUCTION SECURITY WARNINGS:")
            for warning in warnings:
                print(f"   ⚠️  {warning}")
            print()


# Global security configuration instance
_security_config: Optional[SecurityConfig] = None


def get_security_config() -> SecurityConfig:
    """Get the global security configuration instance (singleton pattern)"""
    global _security_config

    if _security_config is None:
        _security_config = SecurityConfigLoader.load_security_config()

        # Print configuration summary
        env_name = _security_config.environment.value
        print(f"🛡️  Security configuration loaded for {env_name} environment")
        print(f"   JWT expiration: {_security_config.jwt.access_token_expire_minutes}m")
        history_count = _security_config.password.history_count
        print(f"   Password history: {history_count} passwords")
        enabled = _security_config.rate_limiting.enabled
        rate_status = "enabled" if enabled else "disabled"
        print(f"   Rate limiting: {rate_status}")
        print()

    return _security_config


def reload_security_config() -> SecurityConfig:
    """Reload security configuration (useful for testing)"""
    global _security_config
    _security_config = None
    return get_security_config()
