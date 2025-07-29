from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
import uuid

from ..database import get_db
from ..rate_limiter import rate_limiter, RateLimitType, get_client_ip
from ..schemas import (
    Token,
    LoginResponse,
    UserLogin,
    UserCreate,
    UserLoginResponse,
    MessageResponse,
    OAuthRequest,
    OAuthConsentCheckRequest,
    OAuthConsentCheckResponse,
    OAuthConsentRequest,
    OAuthConsentResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    VerificationCodeRequest,
    VerificationCodeResponse,
    ResetPasswordRequest,
    RequestPasswordResetRequest,
    ResetPasswordWithCodeRequest,
)
from ..auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    validate_password_strength,
    validate_password_history,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# OAuth imports with migration support (Phase 2.1: OAuth Consolidation)
# Using consolidated implementations by default via migration system
from ..oauth_router_migration import (
    process_google_oauth_safe as process_google_oauth,
    process_microsoft_oauth_safe as process_microsoft_oauth,
    process_github_oauth_safe as process_github_oauth,
)
from .. import database
from ..database import User
from ..email_verification import (
    create_verification_code,
    send_verification_email,
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

    # OAuth2 spec uses 'username' field, but we authenticate with email
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
            display_name=getattr(user, "display_name", None),
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
    from api.utils.display_name import generate_display_name_from_user

    user_name = generate_display_name_from_user(db_user)
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


@router.post("/oauth/check-consent", response_model=OAuthConsentCheckResponse)
def check_oauth_consent_required(
    request: OAuthConsentCheckRequest, db: Session = Depends(get_db)
) -> OAuthConsentCheckResponse:
    """
    Check if OAuth consent is required before starting OAuth flow.

    This endpoint determines whether the user will be prompted for consent
    when they attempt OAuth authentication, allowing the frontend to show
    the consent modal before starting the OAuth process.
    """
    try:
        from ..oauth_base import get_provider_config
        from .. import database

        # Get provider configuration
        config = get_provider_config(request.provider)

        # Check if user already exists with this email
        existing_user = (
            db.query(database.User).filter(database.User.email == request.email).first()
        )

        if not existing_user:
            # New user - no consent required
            return OAuthConsentCheckResponse(
                consent_required=False, provider_display_name=config.display_name
            )

        # Check if user can sign in with this provider without consent
        if existing_user.auth_provider in [
            config.auth_provider_enum,
            database.AuthProvider.HYBRID,
        ]:
            # User can already use this provider - no consent required
            return OAuthConsentCheckResponse(
                consent_required=False,
                existing_auth_method=existing_user.auth_provider.value,
                provider_display_name=config.display_name,
            )

        # Different auth provider - consent required for account linking
        return OAuthConsentCheckResponse(
            consent_required=True,
            existing_auth_method=existing_user.auth_provider.value,
            provider_display_name=config.display_name,
            existing_email=existing_user.email,
            security_context={
                "existing_auth_method": existing_user.auth_provider.value,
                "provider_email_verified": True,  # OAuth providers verify emails
                "scenario": "account_linking",
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check consent requirements: {str(e)}",
        )


@router.post("/oauth")
def unified_oauth_register(
    request: OAuthRequest, http_request: Request, db: Session = Depends(get_db)
):
    """
    Unified OAuth registration/login endpoint for all providers.

    This endpoint provides a provider-agnostic interface that routes
    internally to provider-specific implementations based on the provider field.
    """
    try:
        # Get client IP for rate limiting
        client_ip = http_request.client.host if http_request.client else "unknown"

        # Route to provider-specific implementation based on provider field
        if request.provider == "google":
            if not request.credential:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google OAuth requires credential field",
                )
            auth_response = process_google_oauth(db, request.credential, client_ip)

        elif request.provider == "microsoft":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Microsoft OAuth requires authorization_code field",
                )
            auth_response = process_microsoft_oauth(
                db, request.authorization_code, client_ip
            )

        elif request.provider == "github":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub OAuth requires authorization_code field",
                )
            auth_response = process_github_oauth(
                db, request.authorization_code, client_ip
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {request.provider}",
            )

        # Check if consent is required
        if auth_response.get("action") == "consent_required":
            return OAuthConsentResponse(
                action=auth_response["action"],
                provider=auth_response["provider"],
                existing_email=auth_response["existing_email"],
                provider_display_name=auth_response["provider_display_name"],
                security_context=auth_response["security_context"],
            )

        # Standard login response
        return LoginResponse(
            access_token=auth_response["access_token"],
            token_type=auth_response["token_type"],
            user=UserLoginResponse(**auth_response["user"]),
        )

    except HTTPException:
        # Re-raise HTTPExceptions (like validation errors) as-is
        raise
    except Exception as e:
        # Handle specific OAuth error types with appropriate HTTP status codes
        error_name = type(e).__name__

        # Token validation errors (401 Unauthorized)
        if "TokenInvalidError" in error_name or "InvalidToken" in error_name:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid OAuth token: {str(e)}",
            )

        # Email verification errors (400 Bad Request)
        elif "EmailUnverifiedError" in error_name or "EmailUnverified" in error_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email verification required: {str(e)}",
            )

        # Rate limiting errors (429 Too Many Requests)
        elif "RateLimitError" in error_name or "RateLimit" in error_name:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {str(e)}",
            )

        # Configuration errors (500 Internal Server Error)
        elif "ConfigurationError" in error_name or "Configuration" in error_name:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OAuth configuration error",
            )

        # Generic OAuth errors (400 Bad Request)
        elif "OAuthError" in error_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth error: {str(e)}",
            )

        # All other exceptions (500 Internal Server Error)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OAuth registration failed: {str(e)}",
            )


@router.post("/oauth/consent", response_model=LoginResponse)
def process_oauth_consent(
    request: OAuthConsentRequest, http_request: Request, db: Session = Depends(get_db)
) -> LoginResponse:
    """
    Process OAuth consent decision for account linking.

    This endpoint handles user's explicit consent for linking OAuth providers
    to existing accounts or creating separate accounts.
    """
    try:
        # Get client IP for audit trail
        client_ip = http_request.client.host if http_request.client else "unknown"
        user_agent = http_request.headers.get("user-agent", "unknown")

        # Route to provider-specific implementation based on provider field
        if request.provider == "google":
            if not request.credential:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google OAuth requires credential field",
                )
            auth_response = process_google_oauth(
                db, request.credential, client_ip, consent_given=request.consent_given
            )
        elif request.provider == "microsoft":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Microsoft OAuth requires authorization_code field",
                )
            auth_response = process_microsoft_oauth(
                db,
                request.authorization_code,
                client_ip,
                consent_given=request.consent_given,
            )
        elif request.provider == "github":
            if not request.authorization_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="GitHub OAuth requires authorization_code field",
                )
            auth_response = process_github_oauth(
                db,
                request.authorization_code,
                client_ip,
                consent_given=request.consent_given,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported OAuth provider: {request.provider}",
            )

        # Record consent decision for audit trail
        if "user" in auth_response:
            from ..oauth_consent_service import OAuthConsentService

            # Get user from response to record consent
            user_data = auth_response["user"]
            user = (
                db.query(database.User)
                .filter(database.User.email == user_data["email"])
                .first()
            )

            if user:
                # Determine provider user ID based on provider
                provider_user_id = getattr(user, f"{request.provider}_id", "unknown")

                OAuthConsentService.record_consent_decision(
                    db=db,
                    user=user,
                    provider=request.provider,
                    provider_user_id=provider_user_id,
                    consent_given=request.consent_given,
                    client_ip=client_ip,
                    user_agent=user_agent,
                )

        return LoginResponse(
            access_token=auth_response["access_token"],
            token_type=auth_response["token_type"],
            user=UserLoginResponse(**auth_response["user"]),
        )

    except HTTPException:
        # Re-raise HTTPExceptions (like validation errors) as-is
        raise
    except Exception as e:
        # Handle OAuth consent errors with same error mapping as main OAuth endpoint
        error_name = type(e).__name__

        if "TokenInvalidError" in error_name or "InvalidToken" in error_name:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid OAuth token: {str(e)}",
            )
        elif "EmailUnverifiedError" in error_name or "EmailUnverified" in error_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email verification required: {str(e)}",
            )
        elif "RateLimitError" in error_name or "RateLimit" in error_name:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {str(e)}",
            )
        elif "OAuthError" in error_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth consent error: {str(e)}",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OAuth consent processing failed: {str(e)}",
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

    result = resend_verification_email(db, request.email, purpose="password_reset")

    if not result["success"]:
        # Check for rate limiting error
        if result.get("rate_limited", False):
            # Return rate limit information for better UX
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": result["message"],
                    "rate_limited": True,
                    "rate_limit_seconds_remaining": result[
                        "rate_limit_seconds_remaining"
                    ],
                },
            )
        # Don't reveal if email exists for security
        # Always return success to prevent email enumeration
        pass

    return EmailVerificationResponse(
        message=(
            "If an account with that email exists, " "a verification code has been sent"
        ),
        email=request.email,
        rate_limit_seconds_remaining=60,  # 1-minute rate limit period
    )


@router.post("/verify-code", response_model=VerificationCodeResponse)
def verify_code_endpoint(
    fastapi_request: Request,
    request: VerificationCodeRequest,
    db: Session = Depends(get_db),
) -> VerificationCodeResponse:
    """Verify email using verification code (new secure method)."""
    # Apply rate limiting to prevent brute force attacks on verification codes
    client_ip = get_client_ip(fastapi_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
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

    # Verify the code using direct table query (simplified approach)
    from ..verification_service import VerificationCode

    # Find valid verification code
    verification_code = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.user_id == user.id,
            VerificationCode.code == request.code,
            ~VerificationCode.is_used,
            VerificationCode.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not verification_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code",
        )

    # Mark code as used
    verification_code.is_used = True
    verification_code.used_at = datetime.now(timezone.utc)

    # Mark user's email as verified for email verification
    if request.verification_type == "email_verification":
        user.email_verified = True

    db.commit()

    return VerificationCodeResponse(
        message="Email verified successfully", success=True, user_id=user.id
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    request: ResetPasswordRequest,
    fastapi_request: Request,
    db: Session = Depends(get_db),
) -> MessageResponse:
    """
    Reset user password using operation token from email verification.

    For unauthenticated users who forgot their password. Requires a valid
    operation token obtained by verifying a security code sent to their email.
    """
    # Apply rate limiting
    client_ip = get_client_ip(fastapi_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Only handle simple token format from unified email verification
    if not request.operation_token.startswith("verified_user_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    # Extract user_id from simple token
    user_id_str = request.operation_token.replace("verified_user_", "")
    try:
        user_id = uuid.UUID(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token format",
        )

    # Validate new password strength
    try:
        validate_password_strength(request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Validate password history to prevent reuse of recent passwords
    validate_password_history(request.new_password, user.id, user.password_hash, db)

    # Add the OLD password to history before updating
    if user.password_hash:  # Only add to history if user had a password before
        # Store the old password hash before updating
        old_password_hash = user.password_hash

        # Create and add password history entry
        password_history_entry = database.PasswordHistory(
            user_id=user.id, password_hash=old_password_hash
        )
        db.add(password_history_entry)

        # Flush to ensure the history entry is persisted for cleanup query
        try:
            db.flush()
        except Exception:
            # If flush fails, rollback and re-raise
            db.rollback()
            raise

    # Clean up old password history using configurable history limit
    from ..config import get_security_config

    config = get_security_config()
    history_limit = (
        config.password.history_count - 1
    )  # Subtract 1 because current password isn't in history

    all_ids_query = (
        db.query(database.PasswordHistory.id)
        .filter(database.PasswordHistory.user_id == user.id)
        .order_by(database.PasswordHistory.created_at.desc())
    )
    ids_to_delete = [row[0] for row in all_ids_query.offset(history_limit).all()]

    if ids_to_delete:
        db.query(database.PasswordHistory).filter(
            database.PasswordHistory.id.in_(ids_to_delete)
        ).delete(synchronize_session=False)

    # Update password
    user.password_hash = get_password_hash(request.new_password)

    # Update the user's updated_at timestamp to indicate password change
    user.updated_at = datetime.now(timezone.utc)

    db.commit()

    return MessageResponse(message="Password reset successfully")


@router.post("/request-password-reset", response_model=MessageResponse)
def request_password_reset(
    fastapi_request: Request,
    request: RequestPasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset verification code.
    Sends a secure verification code to the user's email using VerificationCodeService.
    """
    from ..verification_service import VerificationCodeService, VerificationType
    from ..email_service import send_password_reset_code_email

    # Apply rate limiting
    client_ip = get_client_ip(fastapi_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists - return success message anyway for security
        return MessageResponse(
            message=(
                "If an account with that email exists, "
                "you will receive a password reset code."
            )
        )

    try:
        # Generate secure verification code using central service
        code, _ = VerificationCodeService.create_verification_code(
            db=db, user_id=user.id, verification_type=VerificationType.PASSWORD_RESET
        )

        # Generate display name for email
        from ..utils.display_name import generate_display_name_from_user

        user_name = generate_display_name_from_user(user)

        # Send password reset email with verification code
        email_sent = send_password_reset_code_email(
            email=str(user.email), code=code, user_name=user_name
        )

        if not email_sent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email",
            )

    except ValueError as e:
        # Handle rate limiting from VerificationCodeService
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e)
        )
    except Exception as e:
        # Log the error but don't reveal internal details
        print(f"Password reset request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request",
        )

    return MessageResponse(
        message=(
            "If an account with that email exists, "
            "you will receive a password reset code."
        )
    )


@router.post("/reset-password-with-code", response_model=MessageResponse)
def reset_password_with_code(
    fastapi_request: Request,
    request: ResetPasswordWithCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Reset user password using verification code.
    Uses VerificationCodeService for secure code validation.
    """
    from ..verification_service import VerificationCodeService, VerificationType

    # Apply rate limiting
    client_ip = get_client_ip(fastapi_request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)

    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or verification code",
        )

    try:
        # Verify the code using central service
        verification_result = VerificationCodeService.verify_code(
            db=db,
            user_id=user.id,
            code=request.verification_code,
            verification_type=VerificationType.PASSWORD_RESET,
        )

        if not verification_result["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code",
            )

    except ValueError as e:
        # Handle verification errors (too many attempts, etc.)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Validate new password strength
    try:
        validate_password_strength(request.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Validate password history to prevent reuse of recent passwords
    validate_password_history(request.new_password, user.id, user.password_hash, db)

    # Add the OLD password to history before updating
    if user.password_hash:  # Only add to history if user had a password before
        # Store the old password hash before updating
        old_password_hash = user.password_hash

        # Create and add password history entry
        password_history_entry = database.PasswordHistory(
            user_id=user.id, password_hash=old_password_hash
        )
        db.add(password_history_entry)

        # Flush to ensure the history entry is persisted for cleanup query
        try:
            db.flush()
        except Exception:
            # If flush fails, rollback and re-raise
            db.rollback()
            raise

    # Clean up old password history using configurable history limit
    from ..config import get_security_config

    config = get_security_config()
    history_limit = (
        config.password.history_count - 1
    )  # Subtract 1 because current password isn't in history

    all_ids_query = (
        db.query(database.PasswordHistory.id)
        .filter(database.PasswordHistory.user_id == user.id)
        .order_by(database.PasswordHistory.created_at.desc())
    )
    ids_to_delete = [row[0] for row in all_ids_query.offset(history_limit).all()]

    if ids_to_delete:
        db.query(database.PasswordHistory).filter(
            database.PasswordHistory.id.in_(ids_to_delete)
        ).delete(synchronize_session=False)

    # Update password
    user.password_hash = get_password_hash(request.new_password)

    # Update the user's updated_at timestamp to indicate password change
    user.updated_at = datetime.now(timezone.utc)

    db.commit()

    return MessageResponse(message="Password reset successfully")
