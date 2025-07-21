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
from sqlalchemy.orm import Session
from typing import Optional


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


class TokenAlreadyUsedError(OperationTokenError):
    """Raised when trying to use a token that has already been consumed."""

    pass


class TokenUserMismatchError(OperationTokenError):
    """Raised when token email doesn't match the expected user."""

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

    def verify_token(
        self,
        token: str,
        expected_operation: str,
        db: Optional[Session] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Verify an operation token and return the email if valid.

        Args:
            token: JWT token to verify
            expected_operation: Expected operation type
            db: Database session for single-use token tracking (optional)
            user_id: Expected user ID for cross-user prevention (optional)

        Returns:
            str: Email address if token is valid

        Raises:
            InvalidTokenError: If token is malformed or has invalid signature
            ExpiredTokenError: If token has expired
            InvalidOperationError: If operation type doesn't match
            TokenAlreadyUsedError: If token has already been used
            TokenUserMismatchError: If token email doesn't match user

        Example:
            email = manager.verify_token(token, "password_reset", db, str(user.id))
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

        jti = payload.get("jti")
        if not jti:
            raise InvalidTokenError("Token missing JTI claim")

        # Enhanced security checks if database session is provided
        if db is not None:
            # Import here to avoid circular import
            from api.database import UsedOperationToken, User

            # Check if token has already been used (single-use enforcement)
            used_token = (
                db.query(UsedOperationToken)
                .filter(UsedOperationToken.jti == jti)
                .first()
            )

            if used_token:
                raise TokenAlreadyUsedError("Operation token has already been used")

            # Cross-user token prevention
            if user_id:
                # Convert string UUID to UUID object if needed
                import uuid as uuid_module

                try:
                    user_id_uuid = uuid_module.UUID(user_id)
                except ValueError:
                    raise InvalidTokenError("Invalid user ID format")

                # Find the user by ID to get their email
                user = db.query(User).filter(User.id == user_id_uuid).first()
                if user and user.email.lower() != email.lower():
                    raise TokenUserMismatchError(
                        f"Token email '{email}' does not match user email "
                        f"'{user.email}'"
                    )

            # Mark token as used to prevent reuse
            expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
            used_token_record = UsedOperationToken(
                jti=jti,
                user_id=user_id if user_id else None,
                operation_type=token_operation,
                email=email,
                used_at=datetime.now(timezone.utc),
                expires_at=expires_at,
            )

            # Set the user_id appropriately - only add record if we have a valid user
            if user_id:
                used_token_record.user_id = user_id_uuid
                db.add(used_token_record)
                db.commit()
            else:
                # For unauthenticated operations, try to find user by email
                user = db.query(User).filter(User.email.ilike(email)).first()
                if user:
                    used_token_record.user_id = user.id
                    db.add(used_token_record)
                    db.commit()
                # If no user found, don't track the token (for non-existent users)

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


def verify_operation_token(
    token: str,
    expected_operation: str,
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> str:
    """Convenience function to verify an operation token with enhanced security."""
    return get_operation_token_manager().verify_token(
        token, expected_operation, db, user_id
    )
