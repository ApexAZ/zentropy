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
    GoogleLoginRequest,
)
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    validate_password_strength,
    verify_google_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from .. import database
from ..database import AuthProvider, Organization

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    """Login user and return access token"""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user or isinstance(user, bool):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login
    user.last_login_at = datetime.utcnow()  # type: ignore
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login-json", response_model=LoginResponse)
def login_json(user_login: UserLogin, db: Session = Depends(get_db)) -> LoginResponse:
    """Login user with JSON payload"""
    user = authenticate_user(db, user_login.email, user_login.password)
    if not user or isinstance(user, bool):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Update last login
    user.last_login_at = datetime.utcnow()  # type: ignore
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
            "has_projects_access": user.has_projects_access,
        },
    )


@router.post("/register", response_model=UserResponse)
def register(user_create: UserCreate, db: Session = Depends(get_db)) -> database.User:
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
        has_projects_access=user_create.has_projects_access,
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
def logout() -> MessageResponse:
    """Logout user (client should discard token)"""
    return MessageResponse(message="Successfully logged out")


@router.post("/google-login", response_model=LoginResponse)
def google_login(
    request: GoogleLoginRequest, db: Session = Depends(get_db)
) -> LoginResponse:
    """Login or register user using Google OAuth"""
    # Verify Google token
    google_user_info = verify_google_token(request.google_token)
    if not google_user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token or unverified email",
        )

    # Extract Google user information
    google_id = google_user_info["sub"]
    email = google_user_info["email"].lower()
    first_name = google_user_info.get("given_name", "")
    last_name = google_user_info.get("family_name", "")
    hosted_domain = google_user_info.get("hd")  # Google Workspace domain

    # Check if user exists by Google ID first
    existing_user = (
        db.query(database.User).filter(database.User.google_id == google_id).first()
    )

    if existing_user:
        # Existing Google user - update last login and authenticate
        existing_user.last_login_at = datetime.utcnow()  # type: ignore
        db.commit()
        user = existing_user
    else:
        # Check if email already exists with different auth provider
        email_user = (
            db.query(database.User).filter(database.User.email == email).first()
        )

        if email_user:
            # Email already exists - security: don't allow account hijacking
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered with different authentication method",
            )

        # Create or find organization
        organization_record: Organization

        if hosted_domain:
            # Google Workspace user - look for existing organization by domain
            existing_org = (
                db.query(Organization)
                .filter(Organization.domain == hosted_domain.lower())
                .first()
            )

            if existing_org:
                organization_record = existing_org
            else:
                # Create new organization from Google Workspace domain
                organization_record = Organization.create_from_google_domain(
                    domain=hosted_domain.lower(), name=hosted_domain.title()
                )
                db.add(organization_record)
                db.commit()
                db.refresh(organization_record)

        elif request.organization:
            # Manual organization specified - create new one
            organization_record = Organization(name=request.organization)
            db.add(organization_record)
            db.commit()
            db.refresh(organization_record)

        else:
            # Gmail user - create organization from email domain
            email_domain = email.split("@")[1]
            existing_org = (
                db.query(Organization)
                .filter(Organization.domain == email_domain.lower())
                .first()
            )

            if existing_org:
                organization_record = existing_org
            else:
                organization_record = Organization.create_from_google_domain(
                    domain=email_domain.lower(), name=email_domain.title()
                )
                db.add(organization_record)
                db.commit()
                db.refresh(organization_record)

        now = datetime.utcnow()

        user = database.User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            organization_id=organization_record.id,  # Foreign key
            organization=organization_record.name,  # Legacy field
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_id,
            password_hash=None,  # OAuth users don't need passwords
            last_login_at=now,
            terms_accepted_at=now,
            terms_version="1.0",
            privacy_accepted_at=now,
            privacy_version="1.0",
        )

        db.add(user)
        db.commit()
        db.refresh(user)

    # Create JWT token
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
            "has_projects_access": user.has_projects_access,
        },
    )
