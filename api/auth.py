from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
from uuid import UUID
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
import secrets

from .database import get_db
from .schemas import TokenData
from . import database
from .config import get_security_config

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings


def get_secret_key() -> str:
    """Get SECRET_KEY with production environment validation"""
    secret_key = os.getenv("SECRET_KEY")

    # Check if we're in production environment
    env = os.getenv("NODE_ENV", "development").lower()

    if env == "production" and not secret_key:
        raise ValueError(
            "SECRET_KEY environment variable must be explicitly set in "
            "production. Generate a secure key with: "
            "python -c 'import secrets; print(secrets.token_urlsafe(32))'"
        )

    # Fall back to random key for development (will warn)
    if not secret_key:
        secret_key = secrets.token_urlsafe(32)
        print(
            "⚠️  WARNING: Using randomly generated SECRET_KEY. "
            "Set SECRET_KEY environment variable for production."
        )

    return secret_key


SECRET_KEY = get_secret_key()


# Get security configuration values (loaded dynamically to avoid circular imports)
def _get_jwt_config():
    """Get JWT configuration values from security config"""
    config = get_security_config()
    return {
        "algorithm": config.jwt.algorithm,
        "access_token_expire_minutes": config.jwt.access_token_expire_minutes,
        "extended_token_expire_minutes": config.jwt.extended_token_expire_minutes,
    }


# Note: JWT configuration values are now loaded dynamically from security config
# All functions use _get_jwt_config() to get current configuration values


# Backward compatibility functions for external imports
def get_access_token_expire_minutes() -> int:
    """Get current access token expiration in minutes (for backward compatibility)"""
    return _get_jwt_config()["access_token_expire_minutes"]


def get_extended_token_expire_minutes() -> int:
    """Get current extended token expiration in minutes (for backward compatibility)"""
    return _get_jwt_config()["extended_token_expire_minutes"]


def get_algorithm() -> str:
    """Get current JWT algorithm (for backward compatibility)"""
    return _get_jwt_config()["algorithm"]


# Legacy constant access for existing imports
ACCESS_TOKEN_EXPIRE_MINUTES = get_access_token_expire_minutes()
EXTENDED_TOKEN_EXPIRE_MINUTES = get_extended_token_expire_minutes()
ALGORITHM = get_algorithm()

# Security scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bool(pwd_context.verify(plain_password, hashed_password))


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return str(pwd_context.hash(password))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    remember_me: bool = False,
) -> str:
    """Create a JWT access token with optional extended expiration for remember_me"""
    to_encode = data.copy()
    jwt_config = _get_jwt_config()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    elif remember_me is True:
        # Extended expiration for remember me
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=jwt_config["extended_token_expire_minutes"]
        )
    else:
        # Normal expiration
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=jwt_config["access_token_expire_minutes"]
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=jwt_config["algorithm"])
    return str(encoded_jwt)


def verify_token_string(token: str) -> Dict[str, Any]:
    """Verify JWT token string and return payload (for testing)"""
    jwt_config = _get_jwt_config()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[jwt_config["algorithm"]])
        return dict(payload)  # Ensure we return a proper Dict[str, Any]
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """Verify JWT token and return token data"""
    jwt_config = _get_jwt_config()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[jwt_config["algorithm"]]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=UUID(user_id))
    except JWTError:
        raise credentials_exception

    return token_data


def get_current_user(
    token_data: TokenData = Depends(verify_token), db: Session = Depends(get_db)
) -> database.User:
    """Get current user from token"""
    user = (
        db.query(database.User).filter(database.User.id == token_data.user_id).first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def get_current_active_user(
    current_user: database.User = Depends(get_current_user),
) -> database.User:
    """Get current active user"""
    if current_user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


def require_projects_access(
    current_user: database.User = Depends(get_current_active_user),
) -> database.User:
    """Require Projects module access"""
    if current_user.has_projects_access is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to Projects module is required",
        )
    return current_user


def authenticate_user(
    db: Session, email: str, password: str
) -> Union[database.User, bool]:
    """Authenticate user credentials"""
    user = db.query(database.User).filter(database.User.email == email.lower()).first()
    if not user:
        return False
    if not verify_password(password, str(user.password_hash)):
        return False
    return user


def validate_password_strength(
    password: str, user_info: Optional[Dict[str, Any]] = None
) -> bool:
    """Password validation using security configuration"""
    _ = user_info  # Reserved for future enhanced validation
    config = get_security_config()
    password_config = config.password

    # Check minimum length
    if len(password) < password_config.min_length:
        min_len = password_config.min_length
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {min_len} characters long",
        )

    # Build validation requirements and error messages
    validation_errors = []

    if password_config.require_uppercase and not any(c.isupper() for c in password):
        validation_errors.append("uppercase")

    if password_config.require_lowercase and not any(c.islower() for c in password):
        validation_errors.append("lowercase")

    if password_config.require_digits and not any(c.isdigit() for c in password):
        validation_errors.append("numeric")

    if password_config.require_special_chars:
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        if not any(c in special_chars for c in password):
            validation_errors.append("special")

    if validation_errors:
        # Create user-friendly error message
        error_parts = []
        if "uppercase" in validation_errors:
            error_parts.append("uppercase")
        if "lowercase" in validation_errors:
            error_parts.append("lowercase")
        if "numeric" in validation_errors:
            error_parts.append("numeric")
        if "special" in validation_errors:
            error_parts.append("special")

        if len(error_parts) == 1:
            detail = f"Password must contain {error_parts[0]} characters"
        elif len(error_parts) == 2:
            part1, part2 = error_parts[0], error_parts[1]
            detail = f"Password must contain {part1} and {part2} characters"
        else:
            parts_str = ", ".join(error_parts[:-1])
            last_part = error_parts[-1]
            detail = f"Password must contain {parts_str}, and {last_part} characters"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    # Check for password breaches if enabled
    if password_config.enable_breach_detection:
        from .password_breach_detection import check_password_breach_sync

        check_password_breach_sync(password)

    # Advanced complexity analysis if enabled
    if password_config.enable_complexity_scoring:
        from .password_strength_analyzer import analyze_password_strength

        analysis = analyze_password_strength(password, user_info)

        # Check if password meets minimum complexity score
        if analysis.complexity_score < password_config.min_complexity_score:
            # Create detailed error message with suggestions
            suggestions_text = ". Consider: " + "; ".join(analysis.suggestions[:2])

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Password complexity score ({analysis.complexity_score}/100) "
                    f"is below the required minimum "
                    f"({password_config.min_complexity_score}){suggestions_text}"
                ),
            )

    return True


def validate_password_history(
    new_password: str,
    user_id: UUID,
    current_password_hash: Optional[str],
    db: Session,
) -> None:
    """
    Validate that the new password doesn't match current or recent passwords.

    Args:
        new_password: The proposed new password in plain text
        user_id: The user's UUID
        current_password_hash: The user's current password hash (if any)
        db: Database session

    Raises:
        HTTPException: If password reuses current or recent password
    """
    from . import database

    # Check against current password (if user has one)
    if current_password_hash and verify_password(
        new_password, str(current_password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reuse current password",
        )

    # Check for reuse against recent passwords in history.
    # The history count is configurable via security config.
    config = get_security_config()
    history_limit = (
        config.password.history_count - 1
    )  # Subtract 1 because current password is checked separately

    password_history = (
        db.query(database.PasswordHistory)
        .filter(database.PasswordHistory.user_id == user_id)
        .order_by(database.PasswordHistory.created_at.desc())
        .limit(history_limit)
        .all()
    )

    for history_entry in password_history:
        if verify_password(new_password, str(history_entry.password_hash)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reuse a recent password. Please choose a different one.",
            )
