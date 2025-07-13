from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone

from ..database import get_db
from ..rate_limiter import rate_limiter, RateLimitType, get_client_ip
from ..schemas import (
    Token,
    LoginResponse,
    UserLogin,
    UserCreate,
    UserLoginResponse,
    MessageResponse,
    GoogleLoginRequest,
    GoogleOAuthRequest,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerificationCodeRequest,
    VerificationCodeResponse,
)
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    validate_password_strength,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..google_oauth import (
    process_google_oauth,
    verify_google_token,
    GoogleOAuthError,
    GoogleTokenInvalidError,
    GoogleEmailUnverifiedError,
    GoogleConfigurationError,
    GoogleRateLimitError,
)
from .. import database
from ..database import AuthProvider, Organization
from ..email_verification import (
    create_verification_code,
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
    if user.email_verified is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email address before logging in. "
                "Check your email for the verification link."
            ),
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
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
    if user.email_verified is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Please verify your email address before logging in. "
                "Check your email for the verification link."
            ),
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Create access token with remember_me handling
    access_token = create_access_token(
        data={"sub": str(user.id)}, remember_me=user_login.remember_me
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserLoginResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            organization_id=user.organization_id,
            has_projects_access=user.has_projects_access,
            email_verified=user.email_verified,
            registration_type=user.registration_type.value,
            role=user.role.value if user.role else None,
        ),
    )


@router.post(
    "/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED
)
def register(
    request: Request, user_create: UserCreate, db: Session = Depends(get_db)
) -> MessageResponse:
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
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "This email is already registered.",
                "error_type": "email_already_exists",
            },
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
    now = datetime.now(timezone.utc)
    db_user = database.User(
        email=user_create.email.lower(),
        password_hash=hashed_password,
        first_name=user_create.first_name,
        last_name=user_create.last_name,
        organization_id=None,  # Just-in-time organization assignment
        role=user_create.role,
        has_projects_access=user_create.has_projects_access,
        registration_type=database.RegistrationType.EMAIL,  # Set registration type
        auth_provider=database.AuthProvider.LOCAL,  # Set auth provider
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

    # Generate verification code and send email
    code, _ = create_verification_code(db, str(db_user.id))
    user_name = f"{db_user.first_name} {db_user.last_name}"
    send_verification_email(str(db_user.email), code, user_name)

    return MessageResponse(
        message=(
            f"Registration successful! Please check your email at {db_user.email} "
            "to verify your account before logging in."
        )
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: database.User = Depends(get_current_user),
) -> MessageResponse:
    """Logout user"""
    _ = current_user  # Reserved for future server-side logout implementation
    # Note: JWT token handling is done client-side
    # Server-side logout could implement token blacklisting if needed
    return MessageResponse(message="Successfully logged out")


@router.post("/google-login", response_model=LoginResponse)
def google_login(
    request: GoogleLoginRequest, http_request: Request, db: Session = Depends(get_db)
) -> LoginResponse:
    """Login or register user using Google OAuth"""
    # Apply rate limiting to prevent brute force attacks
    client_ip = get_client_ip(http_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Verify Google token
    try:
        google_user_info = verify_google_token(request.google_token)
    except (
        GoogleTokenInvalidError,
        GoogleEmailUnverifiedError,
        GoogleConfigurationError,
    ) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(e)}",
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
        existing_user.last_login_at = datetime.now(timezone.utc)
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

        now = datetime.now(timezone.utc)

        user = database.User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            organization_id=organization_record.id,  # Foreign key
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_id,
            password_hash=None,  # OAuth users don't need passwords
            email_verified=True,  # Google OAuth users are pre-verified
            last_login_at=now,
            terms_accepted_at=now,
            terms_version="1.0",
            privacy_accepted_at=now,
            privacy_version="1.0",
            registration_type=database.RegistrationType.GOOGLE_OAUTH,
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
        user=UserLoginResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            organization_id=user.organization_id,
            has_projects_access=user.has_projects_access,
            email_verified=user.email_verified,
            registration_type=user.registration_type.value,
            role=user.role.value if user.role else None,
        ),
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
            user=UserLoginResponse(**auth_response["user"]),
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
    except HTTPException:
        # Re-raise HTTPExceptions (like our 409 security error) as-is
        raise
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

    result = resend_verification_email(db, request.email)

    if not result["success"]:
        # Don't reveal if email exists for security
        # Always return success to prevent email enumeration
        pass

    return EmailVerificationResponse(
        message=(
            "If an account with that email exists and is unverified, "
            "a verification code has been sent"
        ),
        email=request.email,
    )


@router.post("/verify-email/{token}", response_model=MessageResponse)
def verify_email_endpoint(token: str, db: Session = Depends(get_db)) -> MessageResponse:
    """Verify email address using verification token."""
    user = verify_email_token(db, token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    return MessageResponse(message=f"Email verified successfully for {user.email}")


@router.post("/verify-code", response_model=VerificationCodeResponse)
def verify_code_endpoint(
    request: VerificationCodeRequest, db: Session = Depends(get_db)
) -> VerificationCodeResponse:
    """Verify email using verification code (new secure method)."""
    # Find user by email
    user = (
        db.query(database.User)
        .filter(database.User.email == request.email.lower())
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address",
        )

    # Verify the code using central service
    from ..verification_service import VerificationCodeService, VerificationType

    try:
        verification_type = VerificationType(request.verification_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification type: {request.verification_type}",
        )

    result = VerificationCodeService.verify_code(
        db=db, user_id=user.id, code=request.code, verification_type=verification_type
    )

    # If email verification is successful, mark user's email as verified
    if result["valid"] and verification_type == VerificationType.EMAIL_VERIFICATION:
        user.email_verified = True
        db.commit()

    if result["valid"]:
        return VerificationCodeResponse(
            message="Email verified successfully", success=True, user_id=user.id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )
