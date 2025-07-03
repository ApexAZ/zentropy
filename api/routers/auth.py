from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

from ..database import get_db
from ..rate_limiter import rate_limiter, RateLimitType, get_client_ip
from ..schemas import (
    Token,
    LoginResponse,
    UserLogin,
    UserCreate,
    UserResponse,
    MessageResponse,
    GoogleLoginRequest,
    GoogleOAuthRequest,
    EmailVerificationRequest,
    EmailVerificationResponse,
)
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    validate_password_strength,
    verify_google_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..google_oauth import (
    process_google_oauth,
    GoogleOAuthError,
    GoogleTokenInvalidError,
    GoogleEmailUnverifiedError,
    GoogleConfigurationError,
    GoogleRateLimitError,
)
from .. import database
from ..database import AuthProvider, Organization
from ..email_verification import (
    create_verification_token,
    send_verification_email,
    verify_email_token,
    resend_verification_email,
)

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    """Login user and return access token"""
    # Apply rate limiting to prevent brute force attacks
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    user = authenticate_user(db, form_data.username, form_data.password)
    if not user or isinstance(user, bool):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email address before logging in. "
                "Check your email for the verification link."
            ),
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
def login_json(
    request: Request, user_login: UserLogin, db: Session = Depends(get_db)
) -> LoginResponse:
    """Login user with JSON payload"""
    # Apply rate limiting to prevent brute force attacks
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    user = authenticate_user(db, user_login.email, user_login.password)
    if not user or isinstance(user, bool):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email address before logging in. "
                "Check your email for the verification link."
            ),
        )

    # Update last login
    user.last_login_at = datetime.utcnow()  # type: ignore
    db.commit()

    # Create access token with remember_me handling
    access_token = create_access_token(
        data={"sub": str(user.id)}, remember_me=user_login.remember_me
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
            "email_verified": user.email_verified,
        },
    )


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register(
    request: Request, user_create: UserCreate, db: Session = Depends(get_db)
) -> database.User:
    """Register a new user"""
    # Apply rate limiting to prevent spam registrations
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Validate terms agreement
    if not user_create.terms_agreement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must agree to the terms and conditions",
        )

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

    # Generate verification token and send email
    token = create_verification_token(db, str(db_user.id))
    user_name = f"{db_user.first_name} {db_user.last_name}"
    send_verification_email(str(db_user.email), token, user_name)

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
            email_verified=True,  # Google OAuth users are pre-verified
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
            "email_verified": user.email_verified,
        },
    )


@router.post("/google-oauth", response_model=LoginResponse)
def google_oauth_register(
    request: GoogleOAuthRequest, http_request: Request, db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Register or login user using Google OAuth JWT credential.

    This endpoint:
    1. Verifies the Google JWT credential
    2. Creates a new user if they don't exist, or logs in existing user
    3. Returns an access token and user information
    """
    try:
        # Get client IP for rate limiting
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Process Google OAuth authentication
        auth_response = process_google_oauth(db, request.credential, client_ip)

        return LoginResponse(
            access_token=auth_response["access_token"],
            token_type=auth_response["token_type"],
            user=auth_response["user"],
        )

    except GoogleTokenInvalidError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth failed: {str(e)}",
        )
    except GoogleEmailUnverifiedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth failed: {str(e)}",
        )
    except GoogleConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google OAuth failed: {str(e)}",
        )
    except GoogleRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Google OAuth failed: {str(e)}",
        )
    except GoogleOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google OAuth failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google OAuth registration failed: {str(e)}",
        )


@router.post("/send-verification", response_model=EmailVerificationResponse)
def send_verification_email_endpoint(
    fastapi_request: Request,
    request: EmailVerificationRequest,
    db: Session = Depends(get_db),
) -> EmailVerificationResponse:
    """Send or resend email verification email to user."""
    # Apply strict rate limiting to prevent email spam
    client_ip = get_client_ip(fastapi_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.EMAIL)

    success = resend_verification_email(db, request.email)

    if not success:
        # Don't reveal if email exists for security
        # Always return success to prevent email enumeration
        pass

    return EmailVerificationResponse(
        message=(
            "If an account with that email exists and is unverified, "
            "a verification email has been sent"
        ),
        email=request.email,
    )


@router.post("/verify-email/{token}", response_model=MessageResponse)
def verify_email_endpoint(
    request: Request, token: str, db: Session = Depends(get_db)
) -> MessageResponse:
    """Verify email address using verification token."""
    # Apply rate limiting to prevent token brute force attacks
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.EMAIL)

    user = verify_email_token(db, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    return MessageResponse(message=f"Email verified successfully for {user.email}")
