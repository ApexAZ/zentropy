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
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
EXTENDED_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days in minutes (43200)

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

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    elif remember_me is True:
        # Extended expiration for remember me (30 days)
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=EXTENDED_TOKEN_EXPIRE_MINUTES
        )
    else:
        # Normal expiration (30 minutes)
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return str(encoded_jwt)


def verify_token_string(token: str) -> Dict[str, Any]:
    """Verify JWT token string and return payload (for testing)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
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
    """Basic password validation"""
    _ = user_info  # Reserved for future enhanced validation
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long",
        )

    # Add more validation rules as needed
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)

    if not (has_upper and has_lower and has_digit):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain uppercase, lowercase, and numeric characters",
        )

    return True
