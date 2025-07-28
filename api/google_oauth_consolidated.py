"""
Google OAuth authentication module - Security-Hardened & Consolidated

This module provides Google OAuth authentication using the unified OAuth base system
while maintaining all Google-specific security requirements including:
- JWT signature verification with Google's public keys
- Issuer and audience validation  
- Token expiration checks
- Email verification enforcement
- Google Workspace domain handling

SECURITY FEATURES:
- Comprehensive JWT validation
- Rate limiting with exponential backoff
- Security audit logging
- Domain validation for workspace users
- Backward compatibility with existing API
"""

import os
from typing import Dict, Any, Mapping
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session

from .oauth_base import (
    OAuthProvider,
    OAuthError,
    OAuthTokenInvalidError,
    OAuthEmailUnverifiedError,
    OAuthConfigurationError,
    OAuthRateLimitError,
    clear_oauth_rate_limit_store,
    check_oauth_rate_limit,
)
from .database import User


class GoogleOAuthProvider(OAuthProvider):
    """
    Google OAuth provider with security-hardened JWT validation.

    Implements Google-specific security requirements while using the
    unified OAuth base system for common functionality.
    """

    def __init__(self):
        super().__init__("google")

    def verify_token_and_get_user_info(
        self, credential_or_code: str
    ) -> Mapping[str, Any]:
        """
        Verify Google OAuth JWT token with comprehensive security validation.

        SECURITY CRITICAL: This method implements Google's specific JWT validation
        requirements including signature verification, issuer validation, and
        audience validation as required by Google's OAuth security guidelines.

        Args:
            credential_or_code: Google JWT credential token from OAuth flow

        Returns:
            Standardized user information dictionary

        Raises:
            OAuthTokenInvalidError: If JWT validation fails
            OAuthConfigurationError: If Google OAuth not configured
            OAuthEmailUnverifiedError: If email not verified
        """
        try:
            # Step 1: Configuration validation
            client_id = os.getenv("GOOGLE_CLIENT_ID")
            if not client_id:
                raise OAuthConfigurationError(
                    "Google OAuth not configured - missing GOOGLE_CLIENT_ID"
                )

            # Step 2: JWT signature and claims verification with Google's public keys
            # This automatically validates:
            # - JWT signature using Google's public keys
            # - Token expiration (exp claim)
            # - Issuer (iss claim)
            # - Audience (aud claim)
            idinfo: Mapping[str, Any] = id_token.verify_token(
                credential_or_code, requests.Request(), client_id
            )

            # Step 3: Additional issuer validation (defense in depth)
            valid_issuers = ["accounts.google.com", "https://accounts.google.com"]
            if idinfo.get("iss") not in valid_issuers:
                raise OAuthTokenInvalidError("Invalid JWT issuer from Google")

            # Step 4: Audience validation (defense in depth)
            if idinfo.get("aud") != client_id:
                raise OAuthTokenInvalidError("JWT audience mismatch")

            # Step 5: Email verification enforcement
            if not idinfo.get("email_verified", False):
                raise OAuthEmailUnverifiedError(
                    "Email must be verified with Google for security"
                )

            # Step 6: Required claims validation
            required_claims = ["sub", "email", "email_verified"]
            for claim in required_claims:
                if claim not in idinfo:
                    raise OAuthTokenInvalidError(f"Missing required JWT claim: {claim}")

            # Step 7: Return standardized user info
            # Google provides high-quality user data including real names
            return {
                "id": idinfo.get("sub"),  # Google user ID (stable identifier)
                "email": idinfo.get("email"),
                "given_name": idinfo.get("given_name", ""),
                "family_name": idinfo.get("family_name", ""),
                "name": idinfo.get("name", ""),
                "email_verified": idinfo.get("email_verified", False),
                "hd": idinfo.get("hd"),  # Google Workspace hosted domain
                # Additional Google-specific fields for audit
                "picture": idinfo.get("picture"),
                "locale": idinfo.get("locale"),
            }

        except OAuthConfigurationError:
            # Re-raise configuration errors as-is
            raise
        except OAuthEmailUnverifiedError:
            # Re-raise email verification errors as-is
            raise
        except ValueError as e:
            # Google's id_token.verify_token raises ValueError for invalid tokens
            raise OAuthTokenInvalidError(f"Invalid Google JWT token: {str(e)}")
        except Exception as e:
            # Catch any other errors and wrap them securely
            raise OAuthTokenInvalidError(f"Google JWT verification failed: {str(e)}")


# =============================================================================
# BACKWARD COMPATIBILITY LAYER
# =============================================================================

# Global provider instance for backward compatibility
_google_provider = GoogleOAuthProvider()


# Backward-compatible exception classes (aliases to unified exceptions)
class GoogleOAuthError(OAuthError):
    """Backward compatible Google OAuth base exception."""

    pass


class GoogleTokenInvalidError(GoogleOAuthError):
    """Backward compatible Google token invalid exception."""

    pass


class GoogleEmailUnverifiedError(GoogleOAuthError):
    """Backward compatible Google email unverified exception."""

    pass


class GoogleConfigurationError(GoogleOAuthError):
    """Backward compatible Google configuration exception."""

    pass


class GoogleRateLimitError(GoogleOAuthError):
    """Backward compatible Google rate limit exception."""

    pass


# Backward-compatible functions that maintain existing API
def clear_rate_limit_store() -> None:
    """Clear the rate limit store (for testing purposes)."""
    clear_oauth_rate_limit_store()


def check_rate_limit(
    identifier: str, max_requests: int = 20, window_minutes: int = 1
) -> None:
    """
    Backward-compatible rate limiting function.

    This maintains the exact same API as the original Google OAuth module
    while using the new unified rate limiting system underneath.
    """
    try:
        check_oauth_rate_limit(identifier, max_requests, window_minutes)
    except OAuthRateLimitError as e:
        # Convert to Google-specific exception for backward compatibility
        raise GoogleRateLimitError(str(e))


def verify_google_token(credential: str) -> Mapping[str, Any]:
    """
    Backward-compatible Google token verification function.

    This maintains the exact same API as the original while using the
    new security-hardened implementation underneath.
    """
    try:
        return _google_provider.verify_token_and_get_user_info(credential)
    except OAuthTokenInvalidError as e:
        raise GoogleTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise GoogleEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise GoogleConfigurationError(str(e))


def get_or_create_organization_from_google_domain(
    db: Session, domain: str
) -> Any:  # Organization type
    """
    Backward-compatible organization creation function.

    Note: This functionality is now handled automatically by the unified
    OAuth processing, but we maintain this function for backward compatibility.
    """
    from .database import Organization

    # Check if organization already exists
    existing_org = db.query(Organization).filter(Organization.domain == domain).first()

    if existing_org:
        return existing_org

    # Create new organization from Google Workspace domain
    new_org = Organization.create_from_google_domain(
        domain=domain, name=domain.split(".")[0].title()
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    return new_org


def get_or_create_google_user(db: Session, google_info: Mapping[str, Any]) -> User:
    """
    Backward-compatible user creation function.

    Note: This functionality is now handled by the unified OAuth user management,
    but we maintain this function for backward compatibility.
    """
    from .oauth_base import get_or_create_oauth_user

    # Handle organization creation if hosted domain present
    organization = None
    google_domain = google_info.get("hd")
    if google_domain:
        organization = get_or_create_organization_from_google_domain(db, google_domain)

    # Use unified user creation logic
    user, _ = get_or_create_oauth_user(db, "google", google_info, organization)
    return user


def process_google_oauth(
    db: Session, credential: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Backward-compatible Google OAuth processing function.

    This maintains the exact same API as the original while using the
    new security-hardened unified OAuth processing system underneath.

    SECURITY FEATURES:
    - JWT signature verification with Google's public keys
    - Comprehensive security audit logging
    - Rate limiting with exponential backoff
    - Email verification enforcement
    - Domain validation for Google Workspace
    - Backward-compatible exception handling
    """
    try:
        return _google_provider.process_oauth(db, credential, client_ip)
    except OAuthTokenInvalidError as e:
        raise GoogleTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise GoogleEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise GoogleConfigurationError(str(e))
    except OAuthRateLimitError as e:
        raise GoogleRateLimitError(str(e))
    except OAuthError as e:
        raise GoogleOAuthError(str(e))


# Export the provider instance for advanced usage
google_oauth_provider = _google_provider
