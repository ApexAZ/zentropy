from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from ..database import get_db, UserRole, AuthProvider
from ..rate_limiter import rate_limiter, RateLimitType, get_client_ip
from ..security import (
    verify_operation_token,
    InvalidTokenError,
    ExpiredTokenError,
    InvalidOperationError,
)
from ..schemas import (
    UserResponse,
    UserUpdate,
    PasswordUpdate,
    SecurePasswordChangeRequest,
    MessageResponse,
    LinkGoogleAccountRequest,
    UnlinkGoogleAccountRequest,
    LinkMicrosoftAccountRequest,
    UnlinkMicrosoftAccountRequest,
    LinkGitHubAccountRequest,
    UnlinkGitHubAccountRequest,
    AccountSecurityResponse,
)
from ..auth import (
    get_current_active_user,
    get_password_hash,
    verify_password,
    validate_password_strength,
)
from ..google_oauth import (
    verify_google_token,
    GoogleOAuthError,
    GoogleTokenInvalidError,
    GoogleEmailUnverifiedError,
)
from .. import database

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> List[database.User]:
    """Get all users"""
    _ = current_user  # Reserved for future authorization implementation
    users = db.query(database.User).all()
    return users


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: database.User = Depends(get_current_active_user),
) -> database.User:
    """Get current user profile"""
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> database.User:
    """Get user by ID"""
    _ = current_user  # Reserved for future authorization implementation
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> database.User:
    """Update current user profile"""
    update_data = user_update.model_dump(exclude_unset=True)

    # Check if email is being updated and if it already exists
    if "email" in update_data:
        existing_user = (
            db.query(database.User)
            .filter(
                database.User.email == update_data["email"].lower(),
                database.User.id != current_user.id,
            )
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        update_data["email"] = update_data["email"].lower()

    # Update user
    for field, value in update_data.items():
        setattr(current_user, field, value)

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> database.User:
    """Update user by ID (admin only)"""
    # Basic role check - you might want to implement proper admin roles
    if current_user.role not in [UserRole.ADMIN, UserRole.TEAM_LEAD]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    user = db.query(database.User).filter(database.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)

    # Check if email is being updated and if it already exists
    if "email" in update_data:
        existing_user = (
            db.query(database.User)
            .filter(
                database.User.email == update_data["email"].lower(),
                database.User.id != user_id,
            )
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        update_data["email"] = update_data["email"].lower()

    # Update user
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return user


@router.post("/me/change-password", response_model=MessageResponse)
def change_password(
    password_update: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Change current user's password"""
    if not verify_password(
        password_update.current_password, str(current_user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Validate new password strength before anything else
    user_info = {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }
    validate_password_strength(password_update.new_password, user_info)

    # Check for reuse against the current password
    if verify_password(password_update.new_password, str(current_user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be the same as the current password.",
        )

    # Check for reuse against the 4 most recent passwords in history.
    # Combined with the current password, this prevents reuse of the last 5 passwords.
    password_history = (
        db.query(database.PasswordHistory)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
        .limit(4)
        .all()
    )
    for history_entry in password_history:
        if verify_password(
            password_update.new_password, str(history_entry.password_hash)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password has been used recently and cannot be reused.",
            )

    # If all checks pass, proceed with the update.
    old_password_hash = current_user.password_hash
    new_password_hash = get_password_hash(password_update.new_password)

    current_user.password_hash = new_password_hash
    current_user.updated_at = datetime.now(timezone.utc)

    # Add the OLD password to history
    if old_password_hash:
        password_history_entry = database.PasswordHistory(
            user_id=current_user.id, password_hash=old_password_hash
        )
        db.add(password_history_entry)
        # Flush the session to make the new entry available for the cleanup query
        db.flush()

    # Clean up old password history, keeping the 4 most recent entries.
    # The 5th password is the current one in the users table.
    all_ids_query = (
        db.query(database.PasswordHistory.id)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
    )
    ids_to_delete = [row[0] for row in all_ids_query.offset(4).all()]

    if ids_to_delete:
        db.query(database.PasswordHistory).filter(
            database.PasswordHistory.id.in_(ids_to_delete)
        ).delete(synchronize_session=False)

    db.commit()

    return MessageResponse(message="Password updated successfully")


@router.post("/me/secure-change-password", response_model=MessageResponse)
def secure_change_password(
    request: Request,
    password_change: SecurePasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """
    Secure password change with email verification and operation token.

    This endpoint requires:
    1. Valid authentication (current user)
    2. Current password verification
    3. Operation token from email verification flow
    4. Rate limiting to prevent abuse

    The operation token must be obtained through the unified security code flow:
    1. POST /auth/send-security-code (operation_type: password_change)
    2. POST /auth/verify-security-code -> returns operation_token
    3. Use operation_token in this endpoint
    """
    # Apply rate limiting for security-sensitive operations
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Verify operation token for password_change operation
    try:
        verified_email = verify_operation_token(
            password_change.operation_token, "password_change"
        )
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Operation token has expired",
        )
    except (InvalidTokenError, InvalidOperationError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid operation token"
        )

    # Verify token email matches current user email (security check)
    if verified_email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid operation token"
        )

    # Verify current password
    if not verify_password(
        password_change.current_password, str(current_user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Validate new password strength
    user_info = {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }
    validate_password_strength(password_change.new_password, user_info)

    # Check for reuse against the current password
    if verify_password(password_change.new_password, str(current_user.password_hash)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be the same as the current password.",
        )

    # Check for reuse against the 4 most recent passwords in history
    password_history = (
        db.query(database.PasswordHistory)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
        .limit(4)
        .all()
    )
    for history_entry in password_history:
        if verify_password(
            password_change.new_password, str(history_entry.password_hash)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password has been used recently and cannot be reused.",
            )

    # If all checks pass, proceed with the update
    old_password_hash = current_user.password_hash
    new_password_hash = get_password_hash(password_change.new_password)

    current_user.password_hash = new_password_hash
    current_user.updated_at = datetime.now(timezone.utc)

    # Add the OLD password to history
    if old_password_hash:
        password_history_entry = database.PasswordHistory(
            user_id=current_user.id, password_hash=old_password_hash
        )
        db.add(password_history_entry)
        db.flush()

    # Clean up old password history, keeping the 4 most recent entries
    all_ids_query = (
        db.query(database.PasswordHistory.id)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
    )
    ids_to_delete = [row[0] for row in all_ids_query.offset(4).all()]

    if ids_to_delete:
        db.query(database.PasswordHistory).filter(
            database.PasswordHistory.id.in_(ids_to_delete)
        ).delete(synchronize_session=False)

    db.commit()

    return MessageResponse(message="Password changed successfully")


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Delete user by ID (admin only)"""
    # Basic role check
    if current_user.role not in [UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )

    user = db.query(database.User).filter(database.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Don't allow users to delete themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    db.delete(user)
    db.commit()

    return MessageResponse(message="User deleted successfully")


@router.get("/me/security", response_model=AccountSecurityResponse)
def get_account_security(
    current_user: database.User = Depends(get_current_active_user),
) -> AccountSecurityResponse:
    """Get current user's account security status"""
    from api.schemas import OAuthProviderStatus

    # Build OAuth providers list
    oauth_providers = []

    # Google provider
    oauth_providers.append(
        OAuthProviderStatus(
            provider="google",
            linked=current_user.google_id is not None,
            identifier=current_user.email if current_user.google_id else None,
        )
    )

    # Microsoft provider
    oauth_providers.append(
        OAuthProviderStatus(
            provider="microsoft",
            linked=current_user.microsoft_id is not None,
            identifier=current_user.email if current_user.microsoft_id else None,
        )
    )

    # GitHub provider
    oauth_providers.append(
        OAuthProviderStatus(
            provider="github",
            linked=current_user.github_id is not None,
            identifier=current_user.email if current_user.github_id else None,
        )
    )

    return AccountSecurityResponse(
        email_auth_linked=current_user.password_hash is not None,
        oauth_providers=oauth_providers,
        # Backwards compatibility
        google_auth_linked=current_user.google_id is not None,
        google_email=current_user.email if current_user.google_id else None,
    )


@router.post("/me/link-google", response_model=MessageResponse)
def link_google_account(
    request: LinkGoogleAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Link Google account to current user account"""
    try:
        # Verify Google token and extract user info
        google_info = verify_google_token(request.google_credential)
        google_email = google_info.get("email")
        google_id = google_info.get("sub")

        if not google_email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token - missing email or ID",
            )

        # Security: Verify email matches current user
        if google_email.lower() != current_user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google email must match your account email",
            )

        # Check if Google ID is already linked to another account
        existing_google_user = (
            db.query(database.User)
            .filter(
                database.User.google_id == google_id,
                database.User.id != current_user.id,
            )
            .first()
        )

        if existing_google_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This Google account is already linked to another user",
            )

        # Check if user already has Google linked
        if current_user.google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account is already linked to your account",
            )

        # Link Google account
        current_user.google_id = google_id
        current_user.auth_provider = AuthProvider.HYBRID
        current_user.updated_at = datetime.now(timezone.utc)

        db.commit()

        return MessageResponse(message="Google account linked successfully")

    except (GoogleOAuthError, GoogleTokenInvalidError, GoogleEmailUnverifiedError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth error: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link Google account",
        )


@router.post("/me/unlink-google", response_model=MessageResponse)
def unlink_google_account(
    request: UnlinkGoogleAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Unlink Google account from current user account"""
    # Security: Verify user has Google account linked
    if not current_user.google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Google account is linked to your account",
        )

    # Security: Require password verification to prevent lockout
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unlink Google account: no password set. "
            "Set a password first.",
        )

    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password"
        )

    try:
        # Unlink Google account
        current_user.google_id = None
        current_user.auth_provider = AuthProvider.LOCAL
        current_user.updated_at = datetime.now(timezone.utc)

        db.commit()

        return MessageResponse(message="Google account unlinked successfully")

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink Google account",
        )


@router.post("/me/link-microsoft", response_model=MessageResponse)
def link_microsoft_account(
    request: LinkMicrosoftAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Link Microsoft account to current user account"""
    # TODO: Implement Microsoft OAuth verification
    # For now, return success for testing
    _ = request  # Avoid unused parameter warning
    _ = db  # Avoid unused parameter warning
    _ = current_user  # Avoid unused parameter warning

    return MessageResponse(message="Microsoft account linked successfully")


@router.post("/me/unlink-microsoft", response_model=MessageResponse)
def unlink_microsoft_account(
    request: UnlinkMicrosoftAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Unlink Microsoft account from current user account"""
    # TODO: Implement Microsoft unlinking
    _ = request  # Avoid unused parameter warning
    _ = db  # Avoid unused parameter warning
    _ = current_user  # Avoid unused parameter warning

    return MessageResponse(message="Microsoft account unlinked successfully")


@router.post("/me/link-github", response_model=MessageResponse)
def link_github_account(
    request: LinkGitHubAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Link GitHub account to current user account"""
    # TODO: Implement GitHub OAuth verification
    # For now, return success for testing
    _ = request  # Avoid unused parameter warning
    _ = db  # Avoid unused parameter warning
    _ = current_user  # Avoid unused parameter warning

    return MessageResponse(message="GitHub account linked successfully")


@router.post("/me/unlink-github", response_model=MessageResponse)
def unlink_github_account(
    request: UnlinkGitHubAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Unlink GitHub account from current user account"""
    # TODO: Implement GitHub unlinking
    _ = request  # Avoid unused parameter warning
    _ = db  # Avoid unused parameter warning
    _ = current_user  # Avoid unused parameter warning

    return MessageResponse(message="GitHub account unlinked successfully")
