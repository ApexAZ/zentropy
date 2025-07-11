"""Google OAuth authentication module for Zentropy."""

import os
from typing import Dict, List, Any, Mapping
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from .database import User, UserRole, AuthProvider, RegistrationType, Organization
from .auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from .rate_limiter import rate_limiter, RateLimitType

# Legacy in-memory rate limiter for backward compatibility
_rate_limit_store: Dict[str, List[datetime]] = {}


class GoogleOAuthError(Exception):
    """Base exception for Google OAuth errors."""

    pass


class GoogleTokenInvalidError(GoogleOAuthError):
    """Exception for invalid Google tokens."""

    pass


class GoogleEmailUnverifiedError(GoogleOAuthError):
    """Exception for unverified Google email."""

    pass


class GoogleConfigurationError(GoogleOAuthError):
    """Exception for Google OAuth configuration issues."""

    pass


class GoogleRateLimitError(GoogleOAuthError):
    """Exception for rate limit violations."""

    pass


def clear_rate_limit_store() -> None:
    """Clear the rate limit store (for testing purposes)."""
    global _rate_limit_store
    _rate_limit_store.clear()
    # Also clear Redis rate limit if available
    rate_limiter.reset_rate_limit("test", RateLimitType.OAUTH)


def check_rate_limit(
    identifier: str, max_requests: int = 20, window_minutes: int = 1
) -> None:
    """
    Redis-based rate limiter with in-memory fallback.

    This function now uses the new Redis-based rate limiting system
    but maintains the same API for backward compatibility.

    Args:
        identifier: Unique identifier for rate limiting (e.g., IP address)
        max_requests: Max requests allowed in window (ignored - uses config)
        window_minutes: Time window in minutes (ignored - uses config)

    Raises:
        GoogleRateLimitError: If rate limit is exceeded
    """
    _ = max_requests  # Reserved for backward compatibility
    _ = window_minutes  # Reserved for backward compatibility
    try:
        # Use new Redis-based rate limiter
        rate_limiter.check_rate_limit(identifier, RateLimitType.OAUTH)
    except Exception as e:
        # Convert RateLimitError to GoogleRateLimitError for backward compatibility
        if "Rate limit exceeded" in str(e):
            raise GoogleRateLimitError(str(e))
        raise


def verify_google_token(credential: str) -> Mapping[str, Any]:
    """
    Verify Google OAuth JWT token and extract user information.

    Args:
        credential: Google JWT credential token

    Returns:
        dict: User information from Google token

    Raises:
        GoogleOAuthError: If token verification fails
    """
    try:
        # Get Google Client ID from environment
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not client_id:
            raise GoogleConfigurationError(
                "Google OAuth not configured - missing GOOGLE_CLIENT_ID"
            )

        # Verify the token with Google
        idinfo: Mapping[str, Any] = id_token.verify_token(
            credential, requests.Request(), client_id
        )

        # Verify the issuer
        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise GoogleTokenInvalidError("Invalid token issuer")

        # Check if email is verified
        if not idinfo.get("email_verified", False):
            raise GoogleEmailUnverifiedError("Email must be verified with Google")

        # Type assertion - idinfo is verified dict from Google
        return idinfo

    except GoogleConfigurationError:
        raise  # Re-raise GoogleConfigurationError as-is
    except ValueError as e:
        raise GoogleTokenInvalidError(f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise GoogleTokenInvalidError(f"Token verification failed: {str(e)}")


def get_or_create_organization_from_google_domain(
    db: Session, domain: str
) -> Organization:
    """
    Get existing organization or create new one from Google Workspace domain.

    Args:
        db: Database session
        domain: Google Workspace domain (e.g., "company.com")

    Returns:
        Organization: The existing or newly created organization
    """
    # Check if organization already exists for this domain
    existing_org = db.query(Organization).filter(Organization.domain == domain).first()

    if existing_org:
        return existing_org

    # Create new organization from Google Workspace domain
    new_org = Organization.create_from_google_domain(
        domain=domain, name=domain.split(".")[0].title()  # Use domain as company name
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)

    return new_org


def get_or_create_google_user(db: Session, google_info: Mapping[str, Any]) -> User:
    """
    Get existing user or create new user from Google OAuth information.

    Args:
        db: Database session
        google_info: User information from verified Google token

    Returns:
        User: The existing or newly created user

    Raises:
        GoogleOAuthError: If user creation fails
    """
    try:
        email = google_info.get("email")
        if not email:
            raise GoogleOAuthError("Email not provided by Google")

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Allow login for GOOGLE and HYBRID auth providers
            if existing_user.auth_provider in [
                AuthProvider.GOOGLE,
                AuthProvider.HYBRID,
            ]:
                # Update last login and ensure Google ID is set
                existing_user.last_login_at = datetime.now(timezone.utc)
                if not existing_user.google_id:
                    existing_user.google_id = google_info.get("sub")
                db.commit()
                return existing_user
            else:
                # Security: Prevent account takeover - email registered with
                # LOCAL provider only
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": "This email is already registered with a "
                        "different authentication method.",
                        "error_type": "email_different_provider",
                    },
                )

        # Handle organization assignment for Google Workspace users
        organization_id = None
        google_domain = google_info.get("hd")  # Google Workspace hosted domain
        if google_domain:
            # User is from Google Workspace - create/get organization
            organization = get_or_create_organization_from_google_domain(
                db, google_domain
            )
            organization_id = organization.id

        # Create new user from Google info
        now = datetime.now(timezone.utc)
        new_user = User(
            email=email,
            first_name=google_info.get("given_name", ""),
            last_name=google_info.get("family_name", ""),
            organization_id=organization_id,  # Use proper foreign key
            password_hash=None,  # No password for OAuth users
            role=UserRole.BASIC_USER,  # Use enum object
            auth_provider=AuthProvider.GOOGLE,  # Use enum object
            registration_type=RegistrationType.GOOGLE_OAUTH,  # Track registration
            google_id=google_info.get("sub"),
            email_verified=True,  # Google emails are pre-verified
            last_login_at=now,
            terms_accepted_at=now,
            terms_version="1.0",
            privacy_accepted_at=now,
            privacy_version="1.0",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except HTTPException:
        # Re-raise HTTPExceptions (like our 409 security error) as-is
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise GoogleOAuthError(f"User creation failed: {str(e)}")


def process_google_oauth(
    db: Session, credential: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Process Google OAuth authentication flow.

    Args:
        db: Database session
        credential: Google JWT credential token
        client_ip: Client IP address for rate limiting

    Returns:
        dict: Authentication response with access token and user info

    Raises:
        GoogleOAuthError: If OAuth processing fails
    """
    # Check rate limit first
    check_rate_limit(client_ip, max_requests=20, window_minutes=1)

    # Verify Google token and get user info
    google_info = verify_google_token(credential)

    # Get or create user
    user = get_or_create_google_user(db, google_info)

    # Create access token with proper expiry
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    # Return authentication response
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "organization_id": user.organization_id,  # Use organization_id instead
            "has_projects_access": user.has_projects_access,
            "email_verified": user.email_verified,
            "registration_type": user.registration_type.value,  # Registration type
            "role": user.role.value if user.role else None,
        },
    }
