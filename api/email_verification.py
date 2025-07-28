"""
Email Verification Service

Handles email verification using the central VerificationCodeService.
Maintains backward compatibility while migrating to code-based verification.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from .database import User
from .verification_service import (
    VerificationCodeService,
    VerificationType,
    VerificationCode,
)


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


def send_verification_email(email: str, code: str, user_name: str) -> bool:
    """Send verification email with code to user."""
    from .email_service import send_verification_code_email

    # Use the email service to send the verification code email
    return send_verification_code_email(email, code, user_name)


def resend_verification_email(
    db: Session, email: str, purpose: str = "registration"
) -> Dict[str, Any]:
    """Resend verification email to a user."""
    # Find user by email
    user = db.query(User).filter(User.email == email.lower()).first()

    if not user:
        return {"success": False, "message": "User not found"}

    # Only block verified users for registration purposes
    # For password reset, we need to send verification codes to verified users
    if user.email_verified is True and purpose == "registration":
        return {"success": False, "message": "Email already verified"}

    try:
        # Generate new code
        code, expires_at = create_verification_code(db, str(user.id))

        # Send email
        from api.utils.display_name import generate_display_name_from_user

        user_name = generate_display_name_from_user(user)
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
        # Check if this is a rate limiting error and calculate remaining time
        error_message = str(e)
        if "Please wait" in error_message and "minute(s) before" in error_message:
            # This is a rate limiting error - calculate remaining seconds

            # Find the most recent verification code to calculate rate limit expiry
            now = datetime.now(timezone.utc)
            config = VerificationCodeService.TYPE_CONFIG[
                VerificationType.EMAIL_VERIFICATION
            ]
            rate_limit_minutes = config["rate_limit_minutes"]

            # Query for the most recent code that's causing the rate limit
            recent_code = (
                db.query(VerificationCode)
                .filter(
                    VerificationCode.user_id == user.id,
                    VerificationCode.verification_type
                    == (VerificationType.EMAIL_VERIFICATION),
                    VerificationCode.created_at
                    > now - timedelta(minutes=rate_limit_minutes),
                )
                .order_by(VerificationCode.created_at.desc())
                .first()
            )

            if recent_code:
                # Rate limit expires after the rate limit period
                rate_limit_expires = recent_code.created_at + timedelta(
                    minutes=rate_limit_minutes
                )

                # Ensure both datetimes are timezone-aware for comparison
                if recent_code.created_at.tzinfo is None:
                    # SQLite datetime without timezone, assume UTC
                    rate_limit_expires = rate_limit_expires.replace(tzinfo=timezone.utc)

                if rate_limit_expires > now:
                    remaining_seconds = int((rate_limit_expires - now).total_seconds())
                    return {
                        "success": False,
                        "message": error_message,
                        "rate_limited": True,
                        "rate_limit_seconds_remaining": remaining_seconds,
                    }

        return {"success": False, "message": error_message}
