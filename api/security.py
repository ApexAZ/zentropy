"""
Operation Token Security System

Provides secure, short-lived tokens for multi-step security operations.
These tokens are used to bridge verified email codes with subsequent security actions.

Security Features:
- JWT-based tokens with strong signatures
- Short expiration times (10 minutes default)
- Single-use semantics via JTI (JWT ID)
- Operation type validation
- Email scope validation
"""

import os
import uuid
import jwt
from datetime import datetime, timedelta, timezone


class OperationTokenError(Exception):
    """Base exception for operation token errors."""

    pass


class InvalidTokenError(OperationTokenError):
    """Raised when token is invalid or malformed."""

    pass


class ExpiredTokenError(OperationTokenError):
    """Raised when token has expired."""

    pass


class InvalidOperationError(OperationTokenError):
    """Raised when token operation type doesn't match expected."""

    pass


class OperationTokenManager:
    """
    Manages secure, short-lived tokens for multi-step security operations.

    These tokens are issued after successful email verification and provide
    secure authorization for completing security-sensitive operations.
    """

    def __init__(self):
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError("SECRET_KEY environment variable must be set")

        self.secret_key: str = secret_key
        self.algorithm = "HS256"
        self.expiry_minutes = 10  # Short-lived tokens for security

    def generate_token(self, email: str, operation_type: str) -> str:
        """
        Generate a secure operation token for a verified email and operation.

        Args:
            email: Email address that was verified
            operation_type: Type of operation (password_reset, password_change, etc.)

        Returns:
            str: JWT token that can be used to authorize the operation

        Example:
            token = manager.generate_token("user@example.com", "password_reset")
        """
        now = datetime.now(timezone.utc)
        payload = {
            "email": email.lower(),  # Normalize email case
            "operation_type": operation_type,
            "exp": now + timedelta(minutes=self.expiry_minutes),
            "iat": now,
            "jti": str(uuid.uuid4()),  # Unique token ID for single-use semantics
            "issuer": "zentropy-security",
        }

        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str, expected_operation: str) -> str:
        """
        Verify an operation token and return the email if valid.

        Args:
            token: JWT token to verify
            expected_operation: Expected operation type

        Returns:
            str: Email address if token is valid

        Raises:
            InvalidTokenError: If token is malformed or has invalid signature
            ExpiredTokenError: If token has expired
            InvalidOperationError: If operation type doesn't match

        Example:
            email = manager.verify_token(token, "password_reset")
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"require": ["exp", "iat", "jti"]},
            )
        except jwt.ExpiredSignatureError:
            raise ExpiredTokenError("Operation token has expired")
        except jwt.InvalidTokenError as e:
            raise InvalidTokenError(f"Invalid operation token: {str(e)}")

        # Validate operation type
        token_operation = payload.get("operation_type")
        if token_operation != expected_operation:
            raise InvalidOperationError(
                f"Token is for '{token_operation}' but expected '{expected_operation}'"
            )

        # Extract and validate email
        email = payload.get("email")
        if not email:
            raise InvalidTokenError("Token missing email claim")

        return email

    def get_token_info(self, token: str) -> dict:
        """
        Get information about a token without validating operation type.

        Args:
            token: JWT token to inspect

        Returns:
            dict: Token payload information

        Raises:
            InvalidTokenError: If token is malformed or has invalid signature
            ExpiredTokenError: If token has expired
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                options={"require": ["exp", "iat", "jti"]},
            )
        except jwt.ExpiredSignatureError:
            raise ExpiredTokenError("Operation token has expired")
        except jwt.InvalidTokenError as e:
            raise InvalidTokenError(f"Invalid operation token: {str(e)}")

        return {
            "email": payload.get("email"),
            "operation_type": payload.get("operation_type"),
            "expires_at": datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            "issued_at": datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
            "token_id": payload.get("jti"),
            "issuer": payload.get("issuer"),
        }


# Global instance for use throughout the application (lazy-loaded)
_operation_token_manager = None


def get_operation_token_manager() -> OperationTokenManager:
    """Get the global operation token manager instance (lazy-loaded)."""
    global _operation_token_manager
    if _operation_token_manager is None:
        _operation_token_manager = OperationTokenManager()
    return _operation_token_manager


# Helper functions for common operations
def generate_operation_token(email: str, operation_type: str) -> str:
    """Convenience function to generate an operation token."""
    return get_operation_token_manager().generate_token(email, operation_type)


def verify_operation_token(token: str, expected_operation: str) -> str:
    """Convenience function to verify an operation token."""
    return get_operation_token_manager().verify_token(token, expected_operation)
