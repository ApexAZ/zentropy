from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime, timezone

from ..database import get_db, UserRole, AuthProvider
from ..rate_limiter import rate_limiter, RateLimitType, get_client_ip
from ..schemas import (
    UserResponse,
    UserUpdate,
    PasswordUpdate,
    MessageResponse,
    LinkOAuthAccountRequest,
    UnlinkOAuthAccountRequest,
    AccountSecurityResponse,
)
from ..auth import (
    get_current_active_user,
    get_password_hash,
    verify_password,
    validate_password_strength,
    validate_password_history,
)
from ..google_oauth_consolidated import verify_google_token
from ..microsoft_oauth_consolidated import (
    verify_microsoft_token,
    exchange_code_for_token,
)
from ..github_oauth_consolidated import (
    verify_github_token,
    exchange_code_for_token as github_exchange_code_for_token,
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
    request: Request,
    password_update: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """Change current user's password (simplified flow)"""
    # Apply rate limiting for security-sensitive operations
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
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

    # Validate password history to prevent reuse of recent passwords
    validate_password_history(
        password_update.new_password, current_user.id, current_user.password_hash, db
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

    # Clean up old password history using configurable history limit
    from ..config import get_security_config

    config = get_security_config()
    history_limit = (
        config.password.history_count - 1
    )  # Subtract 1 because current password isn't in history

    all_ids_query = (
        db.query(database.PasswordHistory.id)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
    )
    ids_to_delete = [row[0] for row in all_ids_query.offset(history_limit).all()]

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


@router.post("/me/link-oauth", response_model=MessageResponse)
def link_oauth_account(
    request: LinkOAuthAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """
    Unified OAuth account linking endpoint for all providers.

    This endpoint provides a provider-agnostic interface that routes
    internally to provider-specific implementations based on the provider field.
    """
    try:
        # Provider-specific OAuth account linking implementation
        if request.provider == "google":
            if not request.credential:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google OAuth linking requires credential field",
                )

            # Verify Google token and extract user info
            google_info = verify_google_token(request.credential)
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
            return MessageResponse(
                message="Google account linked successfully",
                provider_identifier=google_email,
            )

        elif request.provider == "microsoft":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Microsoft OAuth linking requires authorization_code field",
                )

            # Exchange code for access token and verify
            access_token = exchange_code_for_token(request.authorization_code)
            microsoft_info = verify_microsoft_token(access_token)

            # Check if Microsoft account is already linked to another user
            existing_user = (
                db.query(database.User)
                .filter(database.User.microsoft_id == microsoft_info.get("id"))
                .first()
            )

            if existing_user and existing_user.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This Microsoft account is already linked to another user",
                )

            # Link Microsoft account to current user
            current_user.microsoft_id = microsoft_info.get("id")
            current_user.auth_provider = AuthProvider.HYBRID
            current_user.updated_at = datetime.now(timezone.utc)

            db.commit()
            return MessageResponse(
                message="Microsoft account linked successfully",
                provider_identifier=microsoft_info.get("mail", ""),
            )

        elif request.provider == "github":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub OAuth linking requires authorization_code field",
                )

            # Exchange code for access token and verify
            access_token = github_exchange_code_for_token(request.authorization_code)
            github_info = verify_github_token(access_token)

            # Check if GitHub account is already linked to another user
            existing_user = (
                db.query(database.User)
                .filter(database.User.github_id == github_info.get("id"))
                .first()
            )

            if existing_user and existing_user.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This GitHub account is already linked to another user",
                )

            # Link GitHub account to current user
            current_user.github_id = github_info.get("id")
            current_user.auth_provider = AuthProvider.HYBRID
            current_user.updated_at = datetime.now(timezone.utc)

            db.commit()
            return MessageResponse(
                message="GitHub account linked successfully",
                provider_identifier=github_info.get("email", ""),
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {request.provider}",
            )

    except HTTPException:
        # Re-raise HTTPExceptions (like validation errors) as-is
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link {request.provider} account: {str(e)}",
        )


@router.post("/me/unlink-oauth", response_model=MessageResponse)
def unlink_oauth_account(
    request: UnlinkOAuthAccountRequest,
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> MessageResponse:
    """
    Unified OAuth account unlinking endpoint for all providers.

    This endpoint provides a provider-agnostic interface that routes
    internally to provider-specific implementations based on the provider field.
    """
    try:
        # Import OAuth consent service for consent revocation
        from ..oauth_consent_service import OAuthConsentService

        # Provider-specific OAuth account unlinking implementation
        if request.provider == "google":
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

            # Unlink Google account
            current_user.google_id = None
            current_user.auth_provider = AuthProvider.LOCAL
            current_user.updated_at = datetime.now(timezone.utc)

            # Revoke OAuth consent so user must re-consent when linking again
            OAuthConsentService.revoke_oauth_consent(db, current_user, "google")

            db.commit()
            return MessageResponse(message="Google account unlinked successfully")

        elif request.provider == "microsoft":
            # Verify password for security
            if not current_user.password_hash or not verify_password(
                request.password, current_user.password_hash
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
                )

            # Check if Microsoft account is linked
            if not current_user.microsoft_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No Microsoft account is linked to this user",
                )

            # Unlink Microsoft account
            current_user.microsoft_id = None
            current_user.auth_provider = AuthProvider.LOCAL
            current_user.updated_at = datetime.now(timezone.utc)

            # Revoke OAuth consent so user must re-consent when linking again
            OAuthConsentService.revoke_oauth_consent(db, current_user, "microsoft")

            db.commit()
            return MessageResponse(message="Microsoft account unlinked successfully")

        elif request.provider == "github":
            # Verify password for security
            if not current_user.password_hash or not verify_password(
                request.password, current_user.password_hash
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
                )

            # Check if GitHub account is linked
            if not current_user.github_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No GitHub account is linked to this user",
                )

            # Unlink GitHub account
            current_user.github_id = None
            current_user.auth_provider = AuthProvider.LOCAL
            current_user.updated_at = datetime.now(timezone.utc)

            # Revoke OAuth consent so user must re-consent when linking again
            OAuthConsentService.revoke_oauth_consent(db, current_user, "github")

            db.commit()
            return MessageResponse(message="GitHub account unlinked successfully")

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {request.provider}",
            )

    except HTTPException:
        # Re-raise HTTPExceptions (like validation errors) as-is
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unlink {request.provider} account: {str(e)}",
        )
