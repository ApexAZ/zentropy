from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import datetime

from ..database import get_db, UserRole
from ..schemas import UserResponse, UserUpdate, PasswordUpdate, MessageResponse
from ..auth import (
    get_current_active_user,
    get_password_hash,
    verify_password,
    validate_password_strength,
)
from .. import database

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: database.User = Depends(get_current_active_user),
) -> List[database.User]:
    """Get all users"""
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
    user = db.query(database.User).filter(database.User.id == user_id).first()
    if not user:
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
    update_data = user_update.dict(exclude_unset=True)

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

    current_user.updated_at = datetime.utcnow()  # type: ignore
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
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = user_update.dict(exclude_unset=True)

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

    user.updated_at = datetime.utcnow()  # type: ignore
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
    # Verify current password
    if not verify_password(
        password_update.current_password, str(current_user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Check password reuse against history
    password_history = (
        db.query(database.PasswordHistory)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
        .limit(5)
        .all()
    )

    for history_entry in password_history:
        if verify_password(
            password_update.new_password, str(history_entry.password_hash)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password has been used recently and cannot be reused",
            )

    # Validate new password
    user_info = {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }
    validate_password_strength(password_update.new_password, user_info)

    # Update password
    new_password_hash = get_password_hash(password_update.new_password)
    current_user.password_hash = new_password_hash  # type: ignore
    current_user.updated_at = datetime.utcnow()  # type: ignore

    # Add to password history
    password_history_entry = database.PasswordHistory(
        user_id=current_user.id, password_hash=new_password_hash
    )
    db.add(password_history_entry)

    # Clean up old password history (keep only 5 most recent)
    old_entries = (
        db.query(database.PasswordHistory)
        .filter(database.PasswordHistory.user_id == current_user.id)
        .order_by(database.PasswordHistory.created_at.desc())
        .offset(5)
        .all()
    )

    for entry in old_entries:
        db.delete(entry)

    db.commit()

    return MessageResponse(message="Password updated successfully")


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
    if not user:
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
