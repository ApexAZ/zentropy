from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = "basic_user"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

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
    
    class Config:
        from_attributes = True

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
    user_id: UUID

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
    
    class Config:
        from_attributes = True

# Team invitation schemas
class TeamInvitationBase(BaseModel):
    email: EmailStr
    role: str = "member"

class TeamInvitationCreate(TeamInvitationBase):
    team_id: UUID
    invited_by: UUID

class TeamInvitationResponse(TeamInvitationBase):
    id: UUID
    team_id: UUID
    invited_by: UUID
    status: str
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[UUID] = None

# Health check schema
class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime

# Generic response schemas
class MessageResponse(BaseModel):
    message: str

class ErrorResponse(BaseModel):
    detail: str