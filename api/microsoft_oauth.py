"""Microsoft OAuth authentication module for Zentropy."""

import os
import requests
from typing import Dict, Any, Mapping
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi import HTTPException
from .database import User, UserRole, AuthProvider, RegistrationType
from .auth import create_access_token
from .rate_limiter import rate_limiter, RateLimitType

# Legacy in-memory rate limiter for backward compatibility (removed - unused)
# _rate_limit_store: Dict[str, List[datetime]] = {}


class MicrosoftOAuthError(Exception):
    """Base exception for Microsoft OAuth errors."""

    pass


class MicrosoftTokenInvalidError(MicrosoftOAuthError):
    """Exception for invalid Microsoft tokens."""

    pass


class MicrosoftEmailUnverifiedError(MicrosoftOAuthError):
    """Exception for unverified Microsoft email."""

    pass


class MicrosoftConfigurationError(MicrosoftOAuthError):
    """Exception for Microsoft OAuth configuration issues."""

    pass


class MicrosoftRateLimitError(MicrosoftOAuthError):
    """Exception for rate limit violations."""

    pass


def clear_rate_limit_store() -> None:
    """Clear the rate limit store (for testing purposes)."""
    # Legacy in-memory store no longer exists - only clear Redis rate limiting
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
        MicrosoftRateLimitError: If rate limit is exceeded
    """
    _ = max_requests  # Reserved for backward compatibility
    _ = window_minutes  # Reserved for backward compatibility
    try:
        # Use new Redis-based rate limiter
        rate_limiter.check_rate_limit(identifier, RateLimitType.OAUTH)
    except Exception as e:
        # Convert RateLimitError to MicrosoftRateLimitError for backward compatibility
        if "Rate limit exceeded" in str(e):
            raise MicrosoftRateLimitError(str(e))
        raise


def exchange_code_for_token(authorization_code: str) -> str:
    """
    Exchange Microsoft authorization code for access token.

    Args:
        authorization_code: Authorization code from Microsoft OAuth flow

    Returns:
        str: Access token from Microsoft

    Raises:
        MicrosoftOAuthError: If token exchange fails
    """
    try:
        client_id = os.getenv("MICROSOFT_CLIENT_ID")
        client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise MicrosoftConfigurationError(
                "Microsoft OAuth not configured - missing "
                "MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET"
            )

        # Exchange authorization code for access token
        token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        token_data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": authorization_code,
            "grant_type": "authorization_code",
            "redirect_uri": (
                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}"
                "/oauth-redirect.html"
            ),
        }

        response = requests.post(token_url, data=token_data, timeout=10)

        if response.status_code != 200:
            raise MicrosoftTokenInvalidError(
                f"Token exchange failed: {response.status_code} - {response.text}"
            )

        token_response = response.json()
        access_token = token_response.get("access_token")

        if not access_token:
            raise MicrosoftTokenInvalidError("No access token in response")

        return access_token

    except MicrosoftConfigurationError:
        raise
    except requests.RequestException as e:
        raise MicrosoftTokenInvalidError(f"Failed to exchange code for token: {str(e)}")
    except Exception as e:
        raise MicrosoftTokenInvalidError(f"Token exchange failed: {str(e)}")


def verify_microsoft_token(access_token: str) -> Mapping[str, Any]:
    """
    Verify Microsoft OAuth access token and extract user information.

    Args:
        access_token: Microsoft OAuth access token

    Returns:
        dict: User information from Microsoft Graph API

    Raises:
        MicrosoftOAuthError: If token verification fails
    """
    try:
        # Get Microsoft Client ID from environment
        client_id = os.getenv("MICROSOFT_CLIENT_ID")
        if not client_id:
            raise MicrosoftConfigurationError(
                "Microsoft OAuth not configured - missing MICROSOFT_CLIENT_ID"
            )

        # Get user info from Microsoft Graph API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        response = requests.get(
            "https://graph.microsoft.com/v1.0/me", headers=headers, timeout=10
        )

        if response.status_code != 200:
            if response.status_code == 401:
                raise MicrosoftTokenInvalidError("Invalid or expired Microsoft token")
            else:
                raise MicrosoftTokenInvalidError(
                    f"Microsoft Graph API error: {response.status_code}"
                )

        user_info = response.json()

        # Verify required fields
        if not user_info.get("mail") and not user_info.get("userPrincipalName"):
            raise MicrosoftTokenInvalidError(
                "No email address found in Microsoft account"
            )

        # Use mail field if available, otherwise use userPrincipalName
        email = user_info.get("mail") or user_info.get("userPrincipalName")

        # Check if email is verified (Microsoft accounts are generally verified)
        # Note: Microsoft doesn't provide an explicit email_verified field like Google
        # We assume Microsoft accounts are verified since they require email
        # verification to create

        # Return standardized user info
        return {
            "id": user_info.get("id"),
            "email": email,
            "given_name": user_info.get("givenName", ""),
            "family_name": user_info.get("surname", ""),
            "name": user_info.get("displayName", ""),
            "email_verified": True,  # Microsoft accounts are assumed to be verified
            "hd": None,  # Microsoft doesn't have hosted domain concept
        }

    except MicrosoftConfigurationError:
        raise  # Re-raise MicrosoftConfigurationError as-is
    except requests.RequestException as e:
        raise MicrosoftTokenInvalidError(f"Failed to verify Microsoft token: {str(e)}")
    except Exception as e:
        raise MicrosoftTokenInvalidError(f"Token verification failed: {str(e)}")


def get_or_create_microsoft_user(
    db: Session, microsoft_info: Mapping[str, Any]
) -> User:
    """
    Get existing user or create new user from Microsoft OAuth information.

    Args:
        db: Database session
        microsoft_info: User information from verified Microsoft token

    Returns:
        User: The existing or newly created user

    Raises:
        MicrosoftOAuthError: If user creation fails
    """
    try:
        email = microsoft_info.get("email")
        if not email:
            raise MicrosoftOAuthError("Email not provided by Microsoft")

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Allow login for MICROSOFT and HYBRID auth providers
            if existing_user.auth_provider in [
                AuthProvider.MICROSOFT,
                AuthProvider.HYBRID,
            ]:
                # Update last login and ensure Microsoft ID is set
                existing_user.last_login_at = datetime.now(timezone.utc)
                if not existing_user.microsoft_id:
                    existing_user.microsoft_id = microsoft_info.get("id")
                db.commit()
                return existing_user
            else:
                # Security: Prevent account takeover - email registered with
                # LOCAL provider only
                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": (
                            "This email is already registered with email/password. "
                            "Please sign in normally and use the account linking "
                            "feature in your profile to connect Microsoft OAuth."
                        ),
                        "error_type": "email_different_provider",
                    },
                )

        # Microsoft doesn't have hosted domain concept like Google Workspace
        # All Microsoft users get personal organizations
        organization_id = None

        # Create new user from Microsoft info
        now = datetime.now(timezone.utc)
        new_user = User(
            email=email,
            first_name=microsoft_info.get("given_name", ""),
            last_name=microsoft_info.get("family_name", ""),
            organization_id=organization_id,  # Use proper foreign key
            password_hash=None,  # No password for OAuth users
            role=UserRole.BASIC_USER,  # Use enum object
            auth_provider=AuthProvider.MICROSOFT,  # Use enum object
            registration_type=RegistrationType.MICROSOFT_OAUTH,  # Track registration
            microsoft_id=microsoft_info.get("id"),
            email_verified=True,  # Microsoft emails are pre-verified
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
        raise MicrosoftOAuthError(f"User creation failed: {str(e)}")


def process_microsoft_oauth(
    db: Session, authorization_code: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Process Microsoft OAuth authentication flow.

    Args:
        db: Database session
        authorization_code: Microsoft OAuth authorization code
        client_ip: Client IP address for rate limiting

    Returns:
        dict: Authentication response with access token and user info

    Raises:
        MicrosoftOAuthError: If OAuth processing fails
    """
    # Check rate limit first
    check_rate_limit(client_ip, max_requests=20, window_minutes=1)

    # Exchange authorization code for access token
    access_token = exchange_code_for_token(authorization_code)

    # Verify Microsoft token and get user info
    microsoft_info = verify_microsoft_token(access_token)

    # Get or create user
    user = get_or_create_microsoft_user(db, microsoft_info)

    # Create access token with extended expiry for OAuth (30 days like "remember me")
    # OAuth is inherently secure since Microsoft handles authentication
    access_token = create_access_token(data={"sub": str(user.id)}, remember_me=True)

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
