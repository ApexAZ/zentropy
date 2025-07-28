"""
GitHub OAuth authentication module - Security-Hardened & Consolidated

This module provides GitHub OAuth authentication using the unified OAuth base system
while maintaining all GitHub-specific security requirements including:
- Access token validation via GitHub API
- Proper User-Agent headers and API version consistency
- Primary verified email extraction
- GitHub-specific profile completion flow

SECURITY FEATURES:
- Comprehensive access token validation
- Rate limiting with exponential backoff
- Security audit logging
- Proper GitHub API interaction
- Backward compatibility with existing API
"""

import os
import requests
from typing import Dict, Any, Mapping
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


class GitHubOAuthProvider(OAuthProvider):
    """
    GitHub OAuth provider with security-hardened access token validation.

    Implements GitHub-specific security requirements while using the
    unified OAuth base system for common functionality.
    """

    def __init__(self):
        super().__init__("github")

    def verify_token_and_get_user_info(
        self, credential_or_code: str
    ) -> Mapping[str, Any]:
        """
        Verify GitHub OAuth access token with comprehensive security validation.

        SECURITY CRITICAL: This method implements GitHub's specific access token
        validation requirements including proper User-Agent headers, API version
        consistency, and primary verified email extraction as required by GitHub's
        OAuth security guidelines.

        Args:
            credential_or_code: GitHub access token from OAuth flow

        Returns:
            Standardized user information dictionary

        Raises:
            OAuthTokenInvalidError: If access token validation fails
            OAuthConfigurationError: If GitHub OAuth not configured
            OAuthEmailUnverifiedError: If no verified email found
        """
        try:
            # Step 1: Configuration validation
            client_id = os.getenv("GITHUB_CLIENT_ID")
            if not client_id:
                raise OAuthConfigurationError(
                    "GitHub OAuth not configured - missing GITHUB_CLIENT_ID"
                )

            # Step 2: GitHub API headers (SECURITY CRITICAL)
            # GitHub requires proper User-Agent and API version headers
            headers = {
                "Authorization": f"Bearer {credential_or_code}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "Zentropy-App",
                "X-GitHub-Api-Version": "2022-11-28",
            }

            # Step 3: Get user profile from GitHub API
            response = requests.get(
                "https://api.github.com/user", headers=headers, timeout=10
            )

            if response.status_code != 200:
                if response.status_code == 401:
                    raise OAuthTokenInvalidError("Invalid or expired GitHub token")
                else:
                    raise OAuthTokenInvalidError(
                        f"GitHub API error: {response.status_code}"
                    )

            user_info = response.json()

            # Step 4: Get user's emails (SECURITY CRITICAL for verification)
            email_response = requests.get(
                "https://api.github.com/user/emails", headers=headers, timeout=10
            )

            if email_response.status_code != 200:
                raise OAuthTokenInvalidError(
                    f"Failed to get GitHub user emails: {email_response.status_code}"
                )

            emails = email_response.json()

            # Step 5: Find primary verified email (SECURITY CRITICAL)
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
                raise OAuthEmailUnverifiedError(
                    "No verified email address found in GitHub account"
                )

            # Step 6: User ID validation
            if not user_info.get("id"):
                raise OAuthTokenInvalidError("Missing user ID from GitHub")

            # Step 7: Parse name from full name or use login as fallback
            full_name = user_info.get("name", "")
            name_parts = full_name.split() if full_name else []
            given_name = name_parts[0] if name_parts else user_info.get("login", "")
            family_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            # Step 8: Return standardized user info
            # GitHub doesn't provide real names by default - requires profile completion
            return {
                "id": str(user_info.get("id")),  # GitHub user ID (stable identifier)
                "email": primary_email,
                "given_name": given_name,
                "family_name": family_name,
                "name": user_info.get("name") or user_info.get("login", ""),
                "login": user_info.get("login"),  # GitHub username
                "email_verified": True,  # GitHub emails are verified when accessible via API
                "hd": None,  # GitHub doesn't have hosted domain concept
                # Additional GitHub-specific fields for audit
                "avatar_url": user_info.get("avatar_url"),
                "company": user_info.get("company"),
                "location": user_info.get("location"),
                "bio": user_info.get("bio"),
            }

        except OAuthConfigurationError:
            # Re-raise configuration errors as-is
            raise
        except OAuthEmailUnverifiedError:
            # Re-raise email verification errors as-is
            raise
        except OAuthTokenInvalidError:
            # Re-raise token validation errors as-is
            raise
        except requests.RequestException as e:
            # Network or HTTP errors
            raise OAuthTokenInvalidError(f"Failed to verify GitHub token: {str(e)}")
        except Exception as e:
            # Catch any other errors and wrap them securely
            raise OAuthTokenInvalidError(f"GitHub token verification failed: {str(e)}")

    def exchange_code_for_token(self, authorization_code: str) -> str:
        """
        Exchange GitHub authorization code for access token.

        SECURITY CRITICAL: This method securely exchanges authorization codes
        for access tokens using client secret authentication.

        Args:
            authorization_code: Authorization code from GitHub OAuth flow

        Returns:
            Access token from GitHub

        Raises:
            OAuthTokenInvalidError: If token exchange fails
            OAuthConfigurationError: If GitHub OAuth not configured
        """
        try:
            client_id = os.getenv("GITHUB_CLIENT_ID")
            client_secret = os.getenv("GITHUB_CLIENT_SECRET")

            if not client_id or not client_secret:
                raise OAuthConfigurationError(
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
                raise OAuthTokenInvalidError(
                    f"Token exchange failed: {response.status_code} - {response.text}"
                )

            token_response = response.json()
            access_token = token_response.get("access_token")

            if not access_token:
                error_description = token_response.get(
                    "error_description", "No access token in response"
                )
                raise OAuthTokenInvalidError(
                    f"Token exchange failed: {error_description}"
                )

            return access_token

        except OAuthConfigurationError:
            raise
        except requests.RequestException as e:
            raise OAuthTokenInvalidError(f"Failed to exchange code for token: {str(e)}")
        except Exception as e:
            raise OAuthTokenInvalidError(f"Token exchange failed: {str(e)}")


# =============================================================================
# BACKWARD COMPATIBILITY LAYER
# =============================================================================

# Global provider instance for backward compatibility
_github_provider = GitHubOAuthProvider()


# Backward-compatible exception classes (aliases to unified exceptions)
class GitHubOAuthError(OAuthError):
    """Backward compatible GitHub OAuth base exception."""

    pass


class GitHubTokenInvalidError(GitHubOAuthError):
    """Backward compatible GitHub token invalid exception."""

    pass


class GitHubEmailUnverifiedError(GitHubOAuthError):
    """Backward compatible GitHub email unverified exception."""

    pass


class GitHubConfigurationError(GitHubOAuthError):
    """Backward compatible GitHub configuration exception."""

    pass


class GitHubRateLimitError(GitHubOAuthError):
    """Backward compatible GitHub rate limit exception."""

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

    This maintains the exact same API as the original GitHub OAuth module
    while using the new unified rate limiting system underneath.
    """
    try:
        check_oauth_rate_limit(identifier, max_requests, window_minutes)
    except OAuthRateLimitError as e:
        # Convert to GitHub-specific exception for backward compatibility
        raise GitHubRateLimitError(str(e))


def exchange_code_for_token(authorization_code: str) -> str:
    """
    Backward-compatible code exchange function.

    This maintains the exact same API as the original while using the
    new security-hardened implementation underneath.
    """
    try:
        return _github_provider.exchange_code_for_token(authorization_code)
    except OAuthTokenInvalidError as e:
        raise GitHubTokenInvalidError(str(e))
    except OAuthConfigurationError as e:
        raise GitHubConfigurationError(str(e))


def verify_github_token(access_token: str) -> Mapping[str, Any]:
    """
    Backward-compatible GitHub token verification function.

    This maintains the exact same API as the original while using the
    new security-hardened implementation underneath.
    """
    try:
        return _github_provider.verify_token_and_get_user_info(access_token)
    except OAuthTokenInvalidError as e:
        raise GitHubTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise GitHubEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise GitHubConfigurationError(str(e))


def get_or_create_github_user(
    db: Session, github_info: Mapping[str, Any]
) -> tuple[User, str]:
    """
    Backward-compatible user creation function.

    Note: This functionality is now handled by the unified OAuth user management,
    but we maintain this function for backward compatibility.
    """
    from .oauth_base import get_or_create_oauth_user

    # Use unified user creation logic
    user, action = get_or_create_oauth_user(db, "github", github_info, None)
    return user, action


def process_github_oauth(
    db: Session, authorization_code: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Backward-compatible GitHub OAuth processing function.

    This maintains the exact same API as the original while using the
    new security-hardened unified OAuth processing system underneath.

    SECURITY FEATURES:
    - Access token validation via GitHub API
    - Comprehensive security audit logging
    - Rate limiting with exponential backoff
    - Proper User-Agent headers and API versioning
    - Primary verified email extraction
    - Backward-compatible exception handling
    """
    try:
        # Step 1: Exchange code for access token
        access_token = _github_provider.exchange_code_for_token(authorization_code)

        # Step 2: Process OAuth using unified system with access token
        return _github_provider.process_oauth(db, access_token, client_ip)

    except OAuthTokenInvalidError as e:
        raise GitHubTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise GitHubEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise GitHubConfigurationError(str(e))
    except OAuthRateLimitError as e:
        raise GitHubRateLimitError(str(e))
    except OAuthError as e:
        raise GitHubOAuthError(str(e))


# Export the provider instance for advanced usage
github_oauth_provider = _github_provider
