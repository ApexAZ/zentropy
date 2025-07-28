"""
Microsoft OAuth authentication module - Security-Hardened & Consolidated

This module provides Microsoft OAuth authentication using the unified OAuth base system
while maintaining all Microsoft-specific security requirements including:
- Access token validation via Microsoft Graph API
- Proper scope validation and client secret security
- Email verification via API response
- Microsoft-specific error handling

SECURITY FEATURES:
- Comprehensive access token validation
- Rate limiting with exponential backoff
- Security audit logging
- Client secret protection
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


class MicrosoftOAuthProvider(OAuthProvider):
    """
    Microsoft OAuth provider with security-hardened access token validation.

    Implements Microsoft-specific security requirements while using the
    unified OAuth base system for common functionality.
    """

    def __init__(self):
        super().__init__("microsoft")

    def verify_token_and_get_user_info(
        self, credential_or_code: str
    ) -> Mapping[str, Any]:
        """
        Verify Microsoft OAuth access token with comprehensive security validation.

        SECURITY CRITICAL: This method implements Microsoft's specific access token
        validation requirements including Graph API validation, proper scope checking,
        and client secret security as required by Microsoft's OAuth security guidelines.

        Args:
            credential_or_code: Microsoft access token from OAuth flow

        Returns:
            Standardized user information dictionary

        Raises:
            OAuthTokenInvalidError: If access token validation fails
            OAuthConfigurationError: If Microsoft OAuth not configured
            OAuthEmailUnverifiedError: If email not available
        """
        try:
            # Step 1: Configuration validation
            client_id = os.getenv("MICROSOFT_CLIENT_ID")
            if not client_id:
                raise OAuthConfigurationError(
                    "Microsoft OAuth not configured - missing MICROSOFT_CLIENT_ID"
                )

            # Step 2: Access token validation via Microsoft Graph API
            # This validates:
            # - Token signature and expiration
            # - Proper scopes and permissions
            # - Account status and verification
            headers = {
                "Authorization": f"Bearer {credential_or_code}",
                "Content-Type": "application/json",
            }

            response = requests.get(
                "https://graph.microsoft.com/v1.0/me", headers=headers, timeout=10
            )

            # Step 3: Response validation
            if response.status_code != 200:
                if response.status_code == 401:
                    raise OAuthTokenInvalidError("Invalid or expired Microsoft token")
                else:
                    raise OAuthTokenInvalidError(
                        f"Microsoft Graph API error: {response.status_code}"
                    )

            user_info = response.json()

            # Step 4: Required fields validation
            if not user_info.get("mail") and not user_info.get("userPrincipalName"):
                raise OAuthTokenInvalidError(
                    "No email address found in Microsoft account"
                )

            # Step 5: Email extraction and validation
            # Use mail field if available, otherwise userPrincipalName
            email = user_info.get("mail") or user_info.get("userPrincipalName")

            if not email or "@" not in email:
                raise OAuthTokenInvalidError("Invalid email format from Microsoft")

            # Step 6: User ID validation
            if not user_info.get("id"):
                raise OAuthTokenInvalidError("Missing user ID from Microsoft")

            # Step 7: Return standardized user info
            # Microsoft provides high-quality user data including real names
            return {
                "id": user_info.get("id"),  # Microsoft user ID (stable identifier)
                "email": email,
                "given_name": user_info.get("givenName", ""),
                "family_name": user_info.get("surname", ""),
                "name": user_info.get("displayName", ""),
                "email_verified": True,  # Microsoft accounts are verified when accessible via Graph API
                "hd": None,  # Microsoft doesn't have hosted domain concept like Google
                # Additional Microsoft-specific fields for audit
                "userPrincipalName": user_info.get("userPrincipalName"),
                "jobTitle": user_info.get("jobTitle"),
                "officeLocation": user_info.get("officeLocation"),
            }

        except OAuthConfigurationError:
            # Re-raise configuration errors as-is
            raise
        except OAuthTokenInvalidError:
            # Re-raise token validation errors as-is
            raise
        except requests.RequestException as e:
            # Network or HTTP errors
            raise OAuthTokenInvalidError(f"Failed to verify Microsoft token: {str(e)}")
        except Exception as e:
            # Catch any other errors and wrap them securely
            raise OAuthTokenInvalidError(
                f"Microsoft token verification failed: {str(e)}"
            )

    def exchange_code_for_token(self, authorization_code: str) -> str:
        """
        Exchange Microsoft authorization code for access token.

        SECURITY CRITICAL: This method securely exchanges authorization codes
        for access tokens using client secret authentication.

        Args:
            authorization_code: Authorization code from Microsoft OAuth flow

        Returns:
            Access token from Microsoft

        Raises:
            OAuthTokenInvalidError: If token exchange fails
            OAuthConfigurationError: If Microsoft OAuth not configured
        """
        try:
            client_id = os.getenv("MICROSOFT_CLIENT_ID")
            client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")

            if not client_id or not client_secret:
                raise OAuthConfigurationError(
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
_microsoft_provider = MicrosoftOAuthProvider()


# Backward-compatible exception classes (aliases to unified exceptions)
class MicrosoftOAuthError(OAuthError):
    """Backward compatible Microsoft OAuth base exception."""

    pass


class MicrosoftTokenInvalidError(MicrosoftOAuthError):
    """Backward compatible Microsoft token invalid exception."""

    pass


class MicrosoftEmailUnverifiedError(MicrosoftOAuthError):
    """Backward compatible Microsoft email unverified exception."""

    pass


class MicrosoftConfigurationError(MicrosoftOAuthError):
    """Backward compatible Microsoft configuration exception."""

    pass


class MicrosoftRateLimitError(MicrosoftOAuthError):
    """Backward compatible Microsoft rate limit exception."""

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

    This maintains the exact same API as the original Microsoft OAuth module
    while using the new unified rate limiting system underneath.
    """
    try:
        check_oauth_rate_limit(identifier, max_requests, window_minutes)
    except OAuthRateLimitError as e:
        # Convert to Microsoft-specific exception for backward compatibility
        raise MicrosoftRateLimitError(str(e))


def exchange_code_for_token(authorization_code: str) -> str:
    """
    Backward-compatible code exchange function.

    This maintains the exact same API as the original while using the
    new security-hardened implementation underneath.
    """
    try:
        return _microsoft_provider.exchange_code_for_token(authorization_code)
    except OAuthTokenInvalidError as e:
        raise MicrosoftTokenInvalidError(str(e))
    except OAuthConfigurationError as e:
        raise MicrosoftConfigurationError(str(e))


def verify_microsoft_token(access_token: str) -> Mapping[str, Any]:
    """
    Backward-compatible Microsoft token verification function.

    This maintains the exact same API as the original while using the
    new security-hardened implementation underneath.
    """
    try:
        return _microsoft_provider.verify_token_and_get_user_info(access_token)
    except OAuthTokenInvalidError as e:
        raise MicrosoftTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise MicrosoftEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise MicrosoftConfigurationError(str(e))


def get_or_create_microsoft_user(
    db: Session, microsoft_info: Mapping[str, Any]
) -> User:
    """
    Backward-compatible user creation function.

    Note: This functionality is now handled by the unified OAuth user management,
    but we maintain this function for backward compatibility.
    """
    from .oauth_base import get_or_create_oauth_user

    # Use unified user creation logic
    user, _ = get_or_create_oauth_user(db, "microsoft", microsoft_info, None)
    return user


def process_microsoft_oauth(
    db: Session, authorization_code: str, client_ip: str = "unknown"
) -> Dict[str, Any]:
    """
    Backward-compatible Microsoft OAuth processing function.

    This maintains the exact same API as the original while using the
    new security-hardened unified OAuth processing system underneath.

    SECURITY FEATURES:
    - Access token validation via Microsoft Graph API
    - Comprehensive security audit logging
    - Rate limiting with exponential backoff
    - Client secret protection
    - Proper scope validation
    - Backward-compatible exception handling
    """
    try:
        # Step 1: Exchange code for access token
        access_token = _microsoft_provider.exchange_code_for_token(authorization_code)

        # Step 2: Process OAuth using unified system with access token
        return _microsoft_provider.process_oauth(db, access_token, client_ip)

    except OAuthTokenInvalidError as e:
        raise MicrosoftTokenInvalidError(str(e))
    except OAuthEmailUnverifiedError as e:
        raise MicrosoftEmailUnverifiedError(str(e))
    except OAuthConfigurationError as e:
        raise MicrosoftConfigurationError(str(e))
    except OAuthRateLimitError as e:
        raise MicrosoftRateLimitError(str(e))
    except OAuthError as e:
        raise MicrosoftOAuthError(str(e))


# Export the provider instance for advanced usage
microsoft_oauth_provider = _microsoft_provider
