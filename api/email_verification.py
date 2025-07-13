"""
Email Verification Service

Handles email verification using the central VerificationCodeService.
Maintains backward compatibility while migrating to code-based verification.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from .database import User
from .verification_service import VerificationCodeService, VerificationType


def create_verification_code(db: Session, user_id: str) -> tuple[str, datetime]:
    """Create a verification code for email verification using central service."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValueError(f"Invalid UUID format: {user_id}")

    # Use central verification service for consistent security across all
    # verification types
    return VerificationCodeService.create_verification_code(
        db=db, user_id=user_uuid, verification_type=VerificationType.EMAIL_VERIFICATION
    )


def verify_email_code(db: Session, user_id: uuid.UUID, code: str) -> Dict[str, Any]:
    """Verify an email verification code using central service."""
    result = VerificationCodeService.verify_code(
        db=db,
        user_id=user_id,
        code=code,
        verification_type=VerificationType.EMAIL_VERIFICATION,
    )

    if result["valid"]:
        # Mark user's email as verified
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.email_verified = True
            db.commit()
            result["user"] = user

    return result


def verify_email_token(db: Session, token: str) -> Optional[User]:
    """DEPRECATED: Legacy function for backward compatibility - will be removed
    after migration."""
    # Find user with this token
    user = db.query(User).filter(User.email_verification_token == token).first()

    if not user:
        return None

    # Check if token is expired
    expires_at = user.email_verification_expires_at
    if expires_at:
        # Ensure both datetimes are timezone-aware for comparison
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None

    # Mark email as verified and clear token
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires_at = None
    db.commit()

    return user


def send_verification_email(email: str, code: str, user_name: str) -> bool:
    """Send verification email with code to user."""
    from .email_service import send_verification_code_email

    # Use the email service to send the verification code email
    return send_verification_code_email(email, code, user_name)


def resend_verification_email(db: Session, email: str) -> Dict[str, Any]:
    """Resend verification email to a user."""
    # Find user by email
    user = db.query(User).filter(User.email == email.lower()).first()

    if not user:
        return {"success": False, "message": "User not found"}

    # Don't resend if already verified
    if user.email_verified is True:
        return {"success": False, "message": "Email already verified"}

    try:
        # Generate new code
        code, expires_at = create_verification_code(db, str(user.id))

        # Send email
        user_name = f"{user.first_name} {user.last_name}"
        email_sent = send_verification_email(str(user.email), code, user_name)

        if email_sent:
            return {
                "success": True,
                "message": "Verification code sent",
                "expires_at": expires_at,
            }
        else:
            return {"success": False, "message": "Failed to send email"}

    except ValueError as e:
        return {"success": False, "message": str(e)}
