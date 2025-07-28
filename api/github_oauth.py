"""GitHub OAuth authentication module for Zentropy."""

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


class GitHubOAuthError(Exception):
    """Base exception for GitHub OAuth errors."""

    pass


class GitHubTokenInvalidError(GitHubOAuthError):
    """Exception for invalid GitHub tokens."""

    pass


class GitHubEmailUnverifiedError(GitHubOAuthError):
    """Exception for unverified GitHub email."""

    pass


class GitHubConfigurationError(GitHubOAuthError):
    """Exception for GitHub OAuth configuration issues."""

    pass


class GitHubRateLimitError(GitHubOAuthError):
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
        GitHubRateLimitError: If rate limit is exceeded
    """
    _ = max_requests  # Reserved for backward compatibility
    _ = window_minutes  # Reserved for backward compatibility
    try:
        # Use new Redis-based rate limiter
        rate_limiter.check_rate_limit(identifier, RateLimitType.OAUTH)
    except Exception as e:
        # Convert RateLimitError to GitHubRateLimitError for backward compatibility
        if "Rate limit exceeded" in str(e):
            raise GitHubRateLimitError(str(e))
        raise


def exchange_code_for_token(authorization_code: str) -> str:
    """
    Exchange GitHub authorization code for access token.

    Args:
        authorization_code: Authorization code from GitHub OAuth flow

    Returns:
        str: Access token from GitHub

    Raises:
        GitHubOAuthError: If token exchange fails
    """
    try:
        client_id = os.getenv("GITHUB_CLIENT_ID")
        client_secret = os.getenv("GITHUB_CLIENT_SECRET")

        if not client_id or not client_secret:
            raise GitHubConfigurationError(
                "GitHub OAuth not configured - missing "
                "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET"
            )

        # Exchange authorization code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": authorization_code,
        }

        headers = {"Accept": "application/json", "User-Agent": "Zentropy-App"}

        response = requests.post(
            token_url, data=token_data, headers=headers, timeout=10
        )

        if response.status_code != 200:
            raise GitHubTokenInvalidError(
                f"Token exchange failed: {response.status_code} - {response.text}"
            )

        token_response = response.json()
        access_token = token_response.get("access_token")

        if not access_token:
            error_description = token_response.get(
                "error_description", "No access token in response"
            )
            raise GitHubTokenInvalidError(f"Token exchange failed: {error_description}")

        return access_token

    except GitHubConfigurationError:
        raise
    except requests.RequestException as e:
        raise GitHubTokenInvalidError(f"Failed to exchange code for token: {str(e)}")
    except Exception as e:
        raise GitHubTokenInvalidError(f"Token exchange failed: {str(e)}")


def verify_github_token(access_token: str) -> Mapping[str, Any]:
    """
    Verify GitHub OAuth access token and extract user information.

    Args:
        access_token: GitHub OAuth access token

    Returns:
        dict: User information from GitHub API

    Raises:
        GitHubOAuthError: If token verification fails
    """
    try:
        # Get GitHub Client ID from environment
        client_id = os.getenv("GITHUB_CLIENT_ID")
        if not client_id:
            raise GitHubConfigurationError(
                "GitHub OAuth not configured - missing GITHUB_CLIENT_ID"
            )

        # Get user info from GitHub API
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Zentropy-App",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        # Get user profile
        response = requests.get(
            "https://api.github.com/user", headers=headers, timeout=10
        )

        if response.status_code != 200:
            if response.status_code == 401:
                raise GitHubTokenInvalidError("Invalid or expired GitHub token")
            else:
                raise GitHubTokenInvalidError(
                    f"GitHub API error: {response.status_code}"
                )

        user_info = response.json()

        # Get user's primary email (GitHub can have multiple emails)
        email_response = requests.get(
            "https://api.github.com/user/emails", headers=headers, timeout=10
        )

        if email_response.status_code != 200:
            raise GitHubTokenInvalidError(
                f"Failed to get GitHub user emails: {email_response.status_code}"
            )

        emails = email_response.json()

        # Find primary verified email
        primary_email = None
        for email_obj in emails:
            if email_obj.get("primary", False) and email_obj.get("verified", False):
                primary_email = email_obj.get("email")
                break

        # Fallback to first verified email if no primary email found
        if not primary_email:
            for email_obj in emails:
                if email_obj.get("verified", False):
                    primary_email = email_obj.get("email")
                    break

        if not primary_email:
            raise GitHubEmailUnverifiedError(
                "No verified email address found in GitHub account"
            )

        # Parse name from full name or use login as fallback
        full_name = user_info.get("name", "")
        name_parts = full_name.split() if full_name else []
        given_name = name_parts[0] if name_parts else user_info.get("login", "")
        family_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Return standardized user info
        return {
            "id": str(user_info.get("id")),
            "email": primary_email,
            "given_name": given_name,
            "family_name": family_name,
            "name": user_info.get("name") or user_info.get("login", ""),
            "login": user_info.get("login"),
            "email_verified": True,  # GitHub emails are verified when we fetch them
            "hd": None,  # GitHub doesn't have hosted domain concept
        }

    except GitHubConfigurationError:
        raise  # Re-raise GitHubConfigurationError as-is
    except GitHubEmailUnverifiedError:
        raise  # Re-raise email verification errors as-is
    except requests.RequestException as e:
        raise GitHubTokenInvalidError(f"Failed to verify GitHub token: {str(e)}")
    except Exception as e:
        raise GitHubTokenInvalidError(f"Token verification failed: {str(e)}")


def get_or_create_github_user(
    db: Session, github_info: Mapping[str, Any]
) -> tuple[User, str]:
    """
    Get existing user or create new user from GitHub OAuth information.

    Args:
        db: Database session
        github_info: User information from verified GitHub token

    Returns:
        tuple[User, str]: The user and action context
            ("sign_in", "account_linked", or "complete_profile")

    Raises:
        GitHubOAuthError: If user creation fails
    """
    try:
        email = github_info.get("email")
        if not email:
            raise GitHubOAuthError("Email not provided by GitHub")

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Allow login for GITHUB and HYBRID auth providers
            if existing_user.auth_provider in [
                AuthProvider.GITHUB,
                AuthProvider.HYBRID,
            ]:
                # Update last login and ensure GitHub ID is set
                existing_user.last_login_at = datetime.now(timezone.utc)
                if not existing_user.github_id:
                    existing_user.github_id = github_info.get("id")
                db.commit()
                # Existing GitHub user - check if profile is complete
                if existing_user.first_name and existing_user.last_name:
                    return existing_user, "sign_in"
                else:
                    return existing_user, "complete_profile"
            else:
                # Auto-link GitHub OAuth to existing LOCAL account (industry standard)
                # This provides seamless user experience while maintaining security
                # since GitHub has already verified email ownership via OAuth
                existing_user.last_login_at = datetime.now(timezone.utc)
                existing_user.github_id = github_info.get("id")
                existing_user.auth_provider = (
                    AuthProvider.HYBRID
                )  # Support both email/password and OAuth
                db.commit()
                # Auto-linked account - check if profile is complete
                if existing_user.first_name and existing_user.last_name:
                    return existing_user, "account_linked"
                else:
                    return existing_user, "complete_profile"

        # GitHub doesn't have hosted domain concept like Google Workspace
        # All GitHub users get personal organizations
        organization_id = None

        # Create new user from GitHub info
        now = datetime.now(timezone.utc)
        new_user = User(
            email=email,
            first_name=None,  # No real names from GitHub - user must complete profile
            last_name=None,  # No real names from GitHub - user must complete profile
            display_name=github_info.get(
                "login"
            ),  # Store GitHub username as display name
            organization_id=organization_id,  # Use proper foreign key
            password_hash=None,  # No password for OAuth users
            role=UserRole.BASIC_USER,  # Use enum object
            auth_provider=AuthProvider.GITHUB,  # Use enum object
            registration_type=RegistrationType.GITHUB_OAUTH,  # Track registration
            github_id=github_info.get("id"),
            email_verified=True,  # GitHub emails are pre-verified
            last_login_at=now,
            terms_accepted_at=now,
            terms_version="1.0",
            privacy_accepted_at=now,
            privacy_version="1.0",
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # New GitHub user always needs profile completion
        return new_user, "complete_profile"

    except HTTPException:
        # Re-raise HTTPExceptions (like our 409 security error) as-is
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise GitHubOAuthError(f"User creation failed: {str(e)}")


def process_github_oauth(
    db: Session, authorization_code: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Process GitHub OAuth authentication flow.

    Args:
        db: Database session
        authorization_code: GitHub OAuth authorization code
        client_ip: Client IP address for rate limiting

    Returns:
        dict: Authentication response with access token and user info

    Raises:
        GitHubOAuthError: If OAuth processing fails
    """
    # Check rate limit first
    check_rate_limit(client_ip, max_requests=20, window_minutes=1)

    # Exchange authorization code for access token
    access_token = exchange_code_for_token(authorization_code)

    # Verify GitHub token and get user info
    github_info = verify_github_token(access_token)

    # Get or create user with action context
    user, action = get_or_create_github_user(db, github_info)

    # Create access token with extended expiry for OAuth (30 days like "remember me")
    # OAuth is inherently secure since GitHub handles authentication
    access_token = create_access_token(data={"sub": str(user.id)}, remember_me=True)

    # Return authentication response with action context
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": user.display_name,
            "organization_id": user.organization_id,  # Use organization_id instead
            "has_projects_access": user.has_projects_access,
            "email_verified": user.email_verified,
            "registration_type": user.registration_type.value,  # Registration type
            "role": user.role.value if user.role else None,
        },
        "action": action,
    }
