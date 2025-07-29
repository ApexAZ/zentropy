"""
Unified OAuth Base System for Zentropy

This module consolidates common OAuth functionality across all providers
(Google, Microsoft, GitHub)
to eliminate code duplication while maintaining full backward compatibility.

Key Features:
- Unified exception hierarchy
- Shared rate limiting implementation
- Common user management patterns
- Provider-specific configuration system
- Full backward compatibility with existing APIs
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Mapping, Optional, Tuple, Callable, Set
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi import HTTPException
from .database import User, UserRole, AuthProvider, RegistrationType, Organization
from .auth import create_access_token
from .rate_limiter import rate_limiter, RateLimitType


# =============================================================================
# UNIFIED EXCEPTION HIERARCHY
# =============================================================================


class OAuthError(Exception):
    """Base exception for OAuth errors across all providers."""

    pass


class OAuthTokenInvalidError(OAuthError):
    """Exception for invalid OAuth tokens."""

    pass


class OAuthEmailUnverifiedError(OAuthError):
    """Exception for unverified OAuth email addresses."""

    pass


class OAuthConfigurationError(OAuthError):
    """Exception for OAuth configuration issues."""

    pass


class OAuthRateLimitError(OAuthError):
    """Exception for OAuth rate limit violations."""

    pass


# =============================================================================
# UNIFIED RATE LIMITING SYSTEM
# =============================================================================


def clear_oauth_rate_limit_store() -> None:
    """Clear the OAuth rate limit store (for testing purposes)."""
    # Clear Redis-based rate limiting for OAuth endpoints
    rate_limiter.reset_rate_limit("test", RateLimitType.OAUTH)


def check_oauth_rate_limit(
    identifier: str, max_requests: int = 20, window_minutes: int = 1
) -> None:
    """
    Unified OAuth rate limiter with Redis backend and in-memory fallback.

    Maintains backward compatibility API while using the new Redis-based system.

    Args:
        identifier: Unique identifier for rate limiting (e.g., IP address)
        max_requests: Max requests allowed (ignored - uses global config)
        window_minutes: Time window in minutes (ignored - uses global config)

    Raises:
        OAuthRateLimitError: If rate limit is exceeded
    """
    _ = max_requests  # Reserved for backward compatibility
    _ = window_minutes  # Reserved for backward compatibility

    try:
        # Use centralized Redis-based rate limiter
        rate_limiter.check_rate_limit(identifier, RateLimitType.OAUTH)
    except Exception as e:
        # Convert RateLimitError to OAuthRateLimitError for unified handling
        if "Rate limit exceeded" in str(e):
            raise OAuthRateLimitError(str(e))
        raise


# =============================================================================
# PROVIDER CONFIGURATION SYSTEM
# =============================================================================


class OAuthProviderConfig:
    """Configuration for OAuth providers."""

    def __init__(
        self,
        name: str,
        display_name: str,
        auth_provider_enum: AuthProvider,
        registration_type_enum: RegistrationType,
        required_env_vars: Dict[str, str],
        user_id_field: str,
        supports_hosted_domain: bool = False,
    ):
        self.name = name
        self.display_name = display_name
        self.auth_provider_enum = auth_provider_enum
        self.registration_type_enum = registration_type_enum
        self.required_env_vars = required_env_vars
        self.user_id_field = (
            user_id_field  # Field name in User model (e.g., 'google_id')
        )
        self.supports_hosted_domain = supports_hosted_domain


# Provider configurations
OAUTH_PROVIDERS = {
    "google": OAuthProviderConfig(
        name="google",
        display_name="Google",
        auth_provider_enum=AuthProvider.GOOGLE,
        registration_type_enum=RegistrationType.GOOGLE_OAUTH,
        required_env_vars={"GOOGLE_CLIENT_ID": "Google OAuth not configured"},
        user_id_field="google_id",
        supports_hosted_domain=True,
    ),
    "microsoft": OAuthProviderConfig(
        name="microsoft",
        display_name="Microsoft",
        auth_provider_enum=AuthProvider.MICROSOFT,
        registration_type_enum=RegistrationType.MICROSOFT_OAUTH,
        required_env_vars={
            "MICROSOFT_CLIENT_ID": "Microsoft OAuth not configured",
            "MICROSOFT_CLIENT_SECRET": "Microsoft OAuth not configured",
        },
        user_id_field="microsoft_id",
        supports_hosted_domain=False,
    ),
    "github": OAuthProviderConfig(
        name="github",
        display_name="GitHub",
        auth_provider_enum=AuthProvider.GITHUB,
        registration_type_enum=RegistrationType.GITHUB_OAUTH,
        required_env_vars={
            "GITHUB_CLIENT_ID": "GitHub OAuth not configured",
            "GITHUB_CLIENT_SECRET": "GitHub OAuth not configured",
        },
        user_id_field="github_id",
        supports_hosted_domain=False,
    ),
}


def get_provider_config(provider: str) -> OAuthProviderConfig:
    """Get configuration for OAuth provider."""
    if provider not in OAUTH_PROVIDERS:
        raise OAuthConfigurationError(f"Unsupported OAuth provider: {provider}")
    return OAUTH_PROVIDERS[provider]


def validate_provider_configuration(provider: str) -> None:
    """Validate that required environment variables are set for provider."""
    config = get_provider_config(provider)

    for env_var, error_message in config.required_env_vars.items():
        if not os.getenv(env_var):
            raise OAuthConfigurationError(f"{error_message} - missing {env_var}")


# =============================================================================
# UNIFIED USER MANAGEMENT SYSTEM
# =============================================================================


def get_or_create_oauth_user(
    db: Session,
    provider: str,
    user_info: Mapping[str, Any],
    organization: Optional[Organization] = None,
    consent_given: Optional[bool] = None,
):
    """
    Unified user creation/retrieval logic for all OAuth providers.

    Args:
        db: Database session
        provider: OAuth provider name ('google', 'microsoft', 'github')
        user_info: Standardized user information from provider
        organization: Optional organization for workspace users

    Returns:
        Tuple[User, str]: User object and action ('sign_in', 'account_linked',
                         'complete_profile')

    Raises:
        OAuthError: If user creation fails
    """
    try:
        config = get_provider_config(provider)

        email = user_info.get("email")
        if not email:
            raise OAuthError(f"Email not provided by {config.display_name}")

        provider_user_id = user_info.get("id")
        if not provider_user_id:
            raise OAuthError(f"User ID not provided by {config.display_name}")

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            return _handle_existing_user(
                db, existing_user, config, provider_user_id, user_info, consent_given
            )

        # Create new user
        return _create_new_oauth_user(db, config, user_info, organization)

    except HTTPException:
        # Re-raise HTTPExceptions (like security errors) as-is
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise OAuthError(f"User creation failed for {provider}: {str(e)}")


def _handle_existing_user(
    db: Session,
    existing_user: User,
    config: OAuthProviderConfig,
    provider_user_id: str,
    user_info: Mapping[str, Any],
    consent_given: Optional[bool] = None,
):
    """Handle existing user OAuth login/linking."""

    # Allow login for same provider and HYBRID users
    if existing_user.auth_provider in [config.auth_provider_enum, AuthProvider.HYBRID]:
        # Update last login and ensure provider ID is set
        existing_user.last_login_at = datetime.now(timezone.utc)

        # Set provider-specific ID if not already set
        current_provider_id = getattr(existing_user, config.user_id_field, None)
        if not current_provider_id:
            setattr(existing_user, config.user_id_field, provider_user_id)

        db.commit()

        # Check if profile completion needed (GitHub specific)
        if config.name == "github":
            if existing_user.first_name and existing_user.last_name:
                return existing_user, "sign_in"
            else:
                return existing_user, "complete_profile"

        return existing_user, "sign_in"

    else:
        # Handle OAuth account linking with explicit consent
        from .oauth_consent_service import ConsentRequiredResponse, OAuthConsentService

        # Check if consent has been given
        if consent_given is None:
            # Check for existing consent decision
            existing_consent = OAuthConsentService.check_existing_consent(
                db, existing_user.email, config.name
            )

            if existing_consent is None:
                # Auto-approve consent for same verified email (secure OAuth behavior)
                # OAuth providers verify email ownership, making this linking secure
                email_verified = user_info.get("email_verified", True)
                if email_verified and existing_user.email == user_info.get("email"):
                    # Automatically grant consent for verified same-email linking
                    consent_given = True
                else:
                    # Require explicit consent for unverified emails or different emails
                    return ConsentRequiredResponse(
                        provider=config.name,
                        existing_email=existing_user.email,
                        provider_display_name=config.display_name,
                        security_context={
                            "existing_auth_method": existing_user.auth_provider.value,
                            "provider_email_verified": email_verified,
                        },
                    )
            else:
                # Use existing consent decision
                consent_given = existing_consent

        if consent_given:
            # User has consented to account linking
            existing_user.last_login_at = datetime.now(timezone.utc)
            setattr(existing_user, config.user_id_field, provider_user_id)
            existing_user.auth_provider = AuthProvider.HYBRID  # Support both methods
            db.commit()

            # Check if profile completion needed (GitHub specific)
            if config.name == "github":
                if existing_user.first_name and existing_user.last_name:
                    return existing_user, "account_linked"
                else:
                    return existing_user, "complete_profile"

            return existing_user, "account_linked"
        else:
            # User denied consent - this should be handled by creating separate account
            # This case should be handled by the API layer, not here
            raise OAuthError("Account linking requires user consent")


def _create_new_oauth_user(
    db: Session,
    config: OAuthProviderConfig,
    user_info: Mapping[str, Any],
    organization: Optional[Organization] = None,
) -> Tuple[User, str]:
    """Create new OAuth user."""

    now = datetime.now(timezone.utc)

    # Provider-specific field mapping
    if config.name == "github":
        # GitHub doesn't provide real names - requires profile completion
        first_name = None
        last_name = None
        display_name = user_info.get("login")  # Use GitHub username
        action = "complete_profile"
    else:
        # Google/Microsoft provide real names
        first_name = user_info.get("given_name", "")
        last_name = user_info.get("family_name", "")
        display_name = None
        action = "sign_in"

    # Create user with provider-specific attributes
    user_data = {
        "email": user_info.get("email"),
        "first_name": first_name,
        "last_name": last_name,
        "display_name": display_name,
        "organization_id": organization.id if organization else None,
        "password_hash": None,  # No password for OAuth users
        "role": UserRole.BASIC_USER,
        "auth_provider": config.auth_provider_enum,
        "registration_type": config.registration_type_enum,
        "email_verified": True,  # OAuth emails are pre-verified
        "last_login_at": now,
        "terms_accepted_at": now,
        "terms_version": "1.0",
        "privacy_accepted_at": now,
        "privacy_version": "1.0",
        config.user_id_field: user_info.get("id"),  # Set provider-specific ID
    }

    new_user = User(**user_data)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user, action


# =============================================================================
# UNIFIED RESPONSE BUILDER
# =============================================================================


def build_oauth_response(user: User, action: str) -> Dict[str, Any]:
    """
    Build standardized OAuth response for all providers.

    Args:
        user: User object
        action: Action context ('sign_in', 'account_linked', 'complete_profile')

    Returns:
        Standardized OAuth response dictionary
    """
    # Create access token with extended expiry for OAuth (30 days like "remember me")
    # OAuth is inherently secure since provider handles authentication
    access_token = create_access_token(data={"sub": str(user.id)}, remember_me=True)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": getattr(user, "display_name", None),
            "organization_id": user.organization_id,
            "has_projects_access": user.has_projects_access,
            "email_verified": user.email_verified,
            "registration_type": user.registration_type.value,
            "role": user.role.value if user.role else None,
        },
        "action": action,
    }


# =============================================================================
# SECURITY-FOCUSED OAUTH PROCESSING
# =============================================================================


# Security logger for OAuth events
oauth_security_logger = logging.getLogger("oauth_security")


class OAuthSecurityContext:
    """Security context for OAuth operations with audit trail."""

    def __init__(self, provider: str, client_ip: str, timestamp: datetime):
        self.provider = provider
        self.client_ip = client_ip
        self.timestamp = timestamp
        self.events: list[str] = []
        self.security_flags: Set[str] = set()

    def log_event(self, event: str) -> None:
        """Log security event with timestamp."""
        self.events.append(f"{self.timestamp.isoformat()}: {event}")
        oauth_security_logger.info(f"OAuth {self.provider} - {self.client_ip}: {event}")

    def flag_security_concern(self, flag: str) -> None:
        """Flag potential security concern."""
        self.security_flags.add(flag)
        oauth_security_logger.warning(
            f"OAuth {self.provider} - {self.client_ip}: SECURITY FLAG - {flag}"
        )


def process_oauth_with_security(
    provider: str,
    db: Session,
    credential_or_code: str,
    client_ip: str = "unknown",
    verify_token_func: Optional[Callable] = None,
    consent_given: Optional[bool] = None,
):
    """
    Security-hardened OAuth processing with audit trail.

    This function maintains provider-specific security implementations while
    providing unified logging, rate limiting, and user management.

    Args:
        provider: OAuth provider name ('google', 'microsoft', 'github')
        db: Database session
        credential_or_code: Provider credential or authorization code
        client_ip: Client IP for rate limiting and logging
        verify_token_func: Provider-specific token verification function

    Returns:
        Standardized OAuth response

    Raises:
        OAuthError: If OAuth processing fails

    Security Features:
        - Comprehensive audit logging
        - Rate limiting with exponential backoff
        - Provider-specific token validation
        - Email verification enforcement
        - Organization domain validation
        - Security flag detection
    """
    # Initialize security context
    security_ctx = OAuthSecurityContext(provider, client_ip, datetime.now(timezone.utc))
    security_ctx.log_event(f"OAuth {provider} authentication initiated")

    try:
        # Step 1: Rate limiting with security logging
        security_ctx.log_event("Checking rate limits")
        try:
            check_oauth_rate_limit(client_ip)
        except OAuthRateLimitError:
            security_ctx.flag_security_concern("RATE_LIMIT_EXCEEDED")
            raise

        # Step 2: Configuration validation
        security_ctx.log_event("Validating provider configuration")
        validate_provider_configuration(provider)

        # Step 3: Provider-specific token verification (SECURITY CRITICAL)
        security_ctx.log_event("Verifying token with provider")
        if not verify_token_func:
            raise OAuthConfigurationError(
                f"No token verification function for {provider}"
            )

        # Call provider-specific verification (maintains security isolation)
        user_info = verify_token_func(credential_or_code)

        # Step 4: Security validation of user info
        _validate_user_info_security(security_ctx, user_info)

        # Step 5: Handle organization creation with domain validation
        organization = None
        config = get_provider_config(provider)
        if config.supports_hosted_domain:
            organization = _handle_organization_creation_secure(
                db, user_info, security_ctx
            )

        # Step 6: User creation/linking with security checks
        security_ctx.log_event("Processing user creation/linking")
        result = get_or_create_oauth_user(
            db, provider, user_info, organization, consent_given
        )

        # Handle consent required response
        from .oauth_consent_service import ConsentRequiredResponse

        if isinstance(result, ConsentRequiredResponse):
            return {
                "action": result.action,
                "provider": result.provider,
                "existing_email": result.existing_email,
                "provider_display_name": result.provider_display_name,
                "security_context": result.security_context,
            }

        user, action = result

        # Step 7: Generate response with security context
        response = build_oauth_response(user, action)

        # Step 8: Final security audit
        if security_ctx.security_flags:
            security_ctx.log_event(
                f"Completed with security flags: {security_ctx.security_flags}"
            )
        else:
            security_ctx.log_event("Completed successfully - no security concerns")

        return response

    except Exception as e:
        security_ctx.log_event(f"OAuth failed: {str(e)}")
        if isinstance(e, (OAuthError, HTTPException)):
            raise
        else:
            # Wrap unexpected errors to prevent information leakage
            raise OAuthError(f"OAuth authentication failed for {provider}")


def _validate_user_info_security(
    security_ctx: OAuthSecurityContext, user_info: Mapping[str, Any]
) -> None:
    """Validate user info for security concerns."""

    # Check required fields
    if not user_info.get("email"):
        security_ctx.flag_security_concern("MISSING_EMAIL")
        raise OAuthError("No email provided by OAuth provider")

    if not user_info.get("id"):
        security_ctx.flag_security_concern("MISSING_USER_ID")
        raise OAuthError("No user ID provided by OAuth provider")

    # Validate email format
    email = user_info.get("email", "")
    if "@" not in email or "." not in email:
        security_ctx.flag_security_concern("INVALID_EMAIL_FORMAT")
        raise OAuthError("Invalid email format from OAuth provider")

    # Check email verification status
    email_verified = user_info.get("email_verified", True)  # Default to True for OAuth
    if not email_verified:
        security_ctx.flag_security_concern("UNVERIFIED_EMAIL")
        raise OAuthEmailUnverifiedError("Email must be verified with OAuth provider")

    security_ctx.log_event("User info security validation passed")


def _handle_organization_creation_secure(
    db: Session, user_info: Mapping[str, Any], security_ctx: OAuthSecurityContext
) -> Optional[Organization]:
    """Handle organization creation with security validation."""

    hosted_domain = user_info.get("hd")
    if not hosted_domain:
        return None

    # Validate hosted domain format
    if "." not in hosted_domain or len(hosted_domain) < 3:
        security_ctx.flag_security_concern("INVALID_HOSTED_DOMAIN")
        raise OAuthError("Invalid hosted domain format")

    # Security check: prevent common domain abuse
    suspicious_domains = {
        "gmail.com",
        "hotmail.com",
        "yahoo.com",
        "outlook.com",
        "protonmail.com",
        "temporary.com",
        "10minutemail.com",
    }

    if hosted_domain.lower() in suspicious_domains:
        security_ctx.flag_security_concern("SUSPICIOUS_HOSTED_DOMAIN")
        # Log but don't block - could be legitimate edge case
        security_ctx.log_event(
            f"Warning: Hosted domain {hosted_domain} flagged as suspicious"
        )

    security_ctx.log_event(f"Processing hosted domain: {hosted_domain}")

    # Check if organization already exists
    existing_org = (
        db.query(Organization).filter(Organization.domain == hosted_domain).first()
    )

    if existing_org:
        security_ctx.log_event(
            f"Using existing organization for domain {hosted_domain}"
        )
        return existing_org

    # Create new organization with security audit
    security_ctx.log_event(f"Creating new organization for domain {hosted_domain}")
    new_org = Organization.create_from_google_domain(
        domain=hosted_domain, name=hosted_domain.split(".")[0].title()
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    security_ctx.log_event(f"Organization created: {new_org.id}")
    return new_org


# =============================================================================
# ABSTRACT PROVIDER INTERFACE (SECURITY-FOCUSED)
# =============================================================================


class OAuthProvider(ABC):
    """
    Abstract base class for OAuth provider implementations with security focus.

    This class provides a security-hardened framework for OAuth providers while
    maintaining provider-specific token verification and security requirements.
    """

    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        self.config = get_provider_config(provider_name)

    def process_oauth(
        self,
        db: Session,
        credential_or_code: str,
        client_ip: str = "unknown",
        consent_given: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Process OAuth authentication with security hardening.

        This method uses the security-focused OAuth processing while maintaining
        provider-specific token verification for maximum security.
        """
        return process_oauth_with_security(
            provider=self.provider_name,
            db=db,
            credential_or_code=credential_or_code,
            client_ip=client_ip,
            verify_token_func=self.verify_token_and_get_user_info,
            consent_given=consent_given,
        )

    @abstractmethod
    def verify_token_and_get_user_info(
        self, credential_or_code: str
    ) -> Mapping[str, Any]:
        """
        Provider-specific token verification and user info extraction.

        SECURITY CRITICAL: This method must implement provider-specific
        security requirements including:

        For Google (JWT tokens):
        - JWT signature verification with Google's public keys
        - Issuer validation (accounts.google.com)
        - Audience validation (client_id)
        - Token expiration validation
        - Email verification check

        For Microsoft (Access tokens):
        - Access token validation via Graph API
        - Proper scope validation
        - Client secret security
        - Email verification via API response

        For GitHub (Access tokens):
        - Access token validation via GitHub API
        - Proper User-Agent headers
        - API version consistency
        - Primary verified email extraction

        Must return standardized user info with keys:
        - id: Provider user ID (validated)
        - email: User email address (verified)
        - given_name: First name (optional)
        - family_name: Last name (optional)
        - name: Full name (optional)
        - email_verified: Boolean (must be True)
        - hd: Hosted domain for workspace users (optional, validated)
        """
        pass

    def _handle_organization_creation(
        self, db: Session, user_info: Mapping[str, Any]
    ) -> Optional[Organization]:
        """Handle organization creation for workspace users (Google only)."""
        hosted_domain = user_info.get("hd")
        if not hosted_domain:
            return None

        # Check if organization already exists
        existing_org = (
            db.query(Organization).filter(Organization.domain == hosted_domain).first()
        )

        if existing_org:
            return existing_org

        # Create new organization from hosted domain
        new_org = Organization.create_from_google_domain(
            domain=hosted_domain, name=hosted_domain.split(".")[0].title()
        )
        db.add(new_org)
        db.commit()
        db.refresh(new_org)
        return new_org
