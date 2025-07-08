"""
Email Verification Service

Handles email verification token generation, validation, and email sending.
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from .database import User


def generate_verification_token() -> str:
    """Generate a cryptographically secure verification token."""
    # Generate a 32-character random token
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(32))


def create_verification_token(db: Session, user_id: str) -> str:
    """Create and store a verification token for a user."""
    import uuid

    # Generate new token
    token = generate_verification_token()

    # Set expiration to 24 hours from now
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Convert string UUID back to UUID object for database query compatibility
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValueError(f"Invalid UUID format: {user_id}")

    # Update user with verification token
    user = db.query(User).filter(User.id == user_uuid).first()
    if user:
        user.email_verification_token = token
        user.email_verification_expires_at = expires_at
        db.commit()

    return token


def verify_email_token(db: Session, token: str) -> Optional[User]:
    """Verify an email verification token and mark email as verified."""
    # Find user with this token
    user = db.query(User).filter(User.email_verification_token == token).first()

    if not user:
        return None

    # Check if token is expired
    expires_at = user.email_verification_expires_at
    if expires_at and expires_at < datetime.now(timezone.utc):
        return None

    # Mark email as verified and clear token
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.commit()

    return user


def send_verification_email(email: str, token: str, user_name: str) -> bool:
    """Send verification email to user."""
    # For now, this is a placeholder that always returns True
    # In a real implementation, this would integrate with an email service
    # like SendGrid, AWS SES, or similar

    print("📧 [EMAIL SIMULATION] Sending verification email:")
    print(f"   To: {email}")
    print("   Subject: Please verify your email address")
    print(f"   Body: Hello {user_name},")
    print("         Please click this link to verify your email:")
    print(f"         http://localhost:5173/verify-email/{token}")
    print("         This link expires in 24 hours.")

    return True  # Simulate successful email sending


def resend_verification_email(db: Session, email: str) -> bool:
    """Resend verification email to a user."""
    # Find user by email
    user = db.query(User).filter(User.email == email.lower()).first()

    if not user:
        return False

    # Don't resend if already verified
    if user.email_verified is True:
        return False

    # Generate new token
    token = create_verification_token(db, str(user.id))

    # Send email
    user_name = f"{user.first_name} {user.last_name}"
    return send_verification_email(str(user.email), token, user_name)
