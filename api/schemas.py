from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from .database import (
    UserRole,
    TeamRole,
    InvitationStatus,
    RegistrationType,
    ProjectVisibility,
    ProjectStatus,
)


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: UserRole = UserRole.BASIC_USER
    has_projects_access: bool = True


class UserCreate(UserBase):
    password: str
    terms_agreement: bool


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    organization_id: Optional[UUID] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    has_projects_access: Optional[bool] = None


class UserResponse(UserBase):
    id: UUID
    organization_id: Optional[UUID] = None  # Include for just-in-time org status
    is_active: bool
    email_verified: bool
    registration_type: RegistrationType
    last_login_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Organization schemas
class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    short_name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    scope: str  # OrganizationScope enum value
    max_users: Optional[int] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserWithOrganizationResponse(UserResponse):
    organization_rel: Optional[OrganizationResponse] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class SecurePasswordChangeRequest(BaseModel):
    current_password: str = Field(
        ..., min_length=1, description="User's current password"
    )
    new_password: str = Field(
        ..., min_length=8, max_length=128, description="New password to set"
    )
    operation_token: str = Field(
        ..., min_length=1, description="Operation token from email verification"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "CurrentPassword123!",
                "new_password": "NewSecurePassword456!",
                "operation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            }
        }
    )


# Google OAuth schemas
class GoogleLoginRequest(BaseModel):
    google_token: str


class GoogleOAuthRequest(BaseModel):
    credential: str


# Team schemas
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    velocity_baseline: int = 0
    sprint_length_days: int = 14
    working_days_per_week: int = 5


class TeamCreate(TeamBase):
    created_by: Optional[UUID] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    velocity_baseline: Optional[int] = None
    sprint_length_days: Optional[int] = None
    working_days_per_week: Optional[int] = None


class TeamResponse(TeamBase):
    id: UUID
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TeamWithMembers(TeamResponse):
    members: List[UserResponse] = []


# Calendar entry schemas
class CalendarEntryBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    all_day: bool = False
    team_id: Optional[UUID] = None


class CalendarEntryCreate(CalendarEntryBase):
    pass  # user_id is automatically set from current_user


class CalendarEntryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    all_day: Optional[bool] = None
    team_id: Optional[UUID] = None


class CalendarEntryResponse(CalendarEntryBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Team invitation schemas
class TeamInvitationBase(BaseModel):
    email: EmailStr
    role: TeamRole = TeamRole.MEMBER


class TeamInvitationCreate(TeamInvitationBase):
    team_id: UUID
    invited_by: UUID


class TeamInvitationResponse(TeamInvitationBase):
    id: UUID
    team_id: UUID
    invited_by: UUID
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserLoginResponse(BaseModel):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    organization_id: Optional[UUID] = None
    has_projects_access: bool
    email_verified: bool
    registration_type: str
    role: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserLoginResponse


class TokenData(BaseModel):
    user_id: Optional[UUID] = None


# Health check schema
class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime


# Email verification schemas
class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationResponse(BaseModel):
    message: str
    email: EmailStr
    rate_limit_seconds_remaining: int = 60  # Include rate limit info for UX


# Verification code schemas
class VerificationCodeRequest(BaseModel):
    email: EmailStr
    code: str
    verification_type: str = "email_verification"


class VerificationCodeResponse(BaseModel):
    message: str
    success: bool
    user_id: Optional[UUID] = None


# Unified security code schemas
class SecurityCodeRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "operation_type": "password_change",
            }
        }
    )

    email: EmailStr
    operation_type: str = Field(
        ...,
        description="Type of security operation (password_change, "
        "password_reset, username_recovery, etc.)",
    )


class VerifySecurityCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
    operation_type: str = Field(
        ...,
        description="Type of security operation (password_change, "
        "password_reset, username_recovery, etc.)",
    )


class OperationTokenResponse(BaseModel):
    operation_token: str
    expires_in: int = Field(..., description="Token expiration time in seconds")


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)
    operation_token: str = Field(..., min_length=1)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "new_password": "NewSecurePassword123!",
                "operation_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            }
        }
    )


# Generic response schemas
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str


class DetailedErrorResponse(BaseModel):
    detail: str
    error_type: str


# Account linking schemas
class LinkGoogleAccountRequest(BaseModel):
    google_credential: str


class UnlinkGoogleAccountRequest(BaseModel):
    password: str


class LinkMicrosoftAccountRequest(BaseModel):
    microsoft_credential: str = Field(
        ..., min_length=1, description="Microsoft OAuth credential token"
    )


class UnlinkMicrosoftAccountRequest(BaseModel):
    password: str = Field(
        ..., min_length=1, description="User password for security verification"
    )


class LinkGitHubAccountRequest(BaseModel):
    github_credential: str = Field(
        ..., min_length=1, description="GitHub OAuth credential token"
    )


class UnlinkGitHubAccountRequest(BaseModel):
    password: str = Field(
        ..., min_length=1, description="User password for security verification"
    )


class OAuthProviderStatus(BaseModel):
    provider: str
    linked: bool
    identifier: Optional[str] = None


class AccountSecurityResponse(BaseModel):
    email_auth_linked: bool
    oauth_providers: List[OAuthProviderStatus]
    # Backwards compatibility - deprecated but maintained
    google_auth_linked: bool
    google_email: Optional[str] = None


# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    visibility: ProjectVisibility = ProjectVisibility.INDIVIDUAL
    status: ProjectStatus = ProjectStatus.ACTIVE


class ProjectCreate(ProjectBase):
    organization_id: Optional[UUID] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[ProjectVisibility] = None
    status: Optional[ProjectStatus] = None
    organization_id: Optional[UUID] = None


class ProjectResponse(ProjectBase):
    id: UUID
    created_by: UUID
    organization_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    page: int = 1
    limit: int = 50
