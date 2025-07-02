from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from ..database import get_db
from ..schemas import (
    Token,
    LoginResponse,
    UserLogin,
    UserCreate,
    UserResponse,
    MessageResponse,
)
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    validate_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from .. import database

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """Login user and return access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login-json", response_model=LoginResponse)
def login_json(user_login: UserLogin, db: Session = Depends(get_db)):
    """Login user with JSON payload"""
    user = authenticate_user(db, user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "organization": user.organization,
        },
    )


@router.post("/register", response_model=UserResponse)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = (
        db.query(database.User)
        .filter(database.User.email == user_create.email.lower())
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    # Validate password
    user_info = {
        "email": user_create.email,
        "first_name": user_create.first_name,
        "last_name": user_create.last_name,
    }
    validate_password_strength(user_create.password, user_info)

    # Create user
    hashed_password = get_password_hash(user_create.password)
    now = datetime.utcnow()
    db_user = database.User(
        email=user_create.email.lower(),
        password_hash=hashed_password,
        first_name=user_create.first_name,
        last_name=user_create.last_name,
        organization=user_create.organization,
        role=user_create.role,
        terms_accepted_at=now,
        terms_version="1.0",
        privacy_accepted_at=now,
        privacy_version="1.0",
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Add password to history
    password_history = database.PasswordHistory(
        user_id=db_user.id, password_hash=hashed_password
    )
    db.add(password_history)
    db.commit()

    return db_user


@router.post("/logout", response_model=MessageResponse)
def logout():
    """Logout user (client should discard token)"""
    return MessageResponse(message="Successfully logged out")
