from sqlalchemy import (
    create_engine,
    Column,
    String,
    Boolean,
    DateTime,
    Integer,
    Text,
    ForeignKey,
    text,
    Enum,
)
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy.orm import sessionmaker, relationship
from typing import Generator, Optional, List, Any
from sqlalchemy.sql.schema import Column as SqlColumn
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv
from enum import Enum as PyEnum

load_dotenv()


# Role Enums for database validation
class UserRole(PyEnum):
    """Global user roles for system-wide permissions"""

    BASIC_USER = "basic_user"
    ADMIN = "admin"
    TEAM_LEAD = "team_lead"
    PROJECT_ADMINISTRATOR = "project_administrator"
    PROJECT_LEAD = "project_lead"
    STAKEHOLDER = "stakeholder"


class TeamRole(PyEnum):
    """Team-specific roles for team-level permissions"""

    MEMBER = "member"
    LEAD = "lead"
    ADMIN = "admin"
    TEAM_ADMINISTRATOR = "team_administrator"


class InvitationStatus(PyEnum):
    """Team invitation status values"""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class AuthProvider(PyEnum):
    """Authentication provider types"""

    LOCAL = "local"
    GOOGLE = "google"


class IndustryType(PyEnum):
    """Industry/sector classification for organizations"""

    SOFTWARE = "software"
    MANUFACTURING = "manufacturing"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    EDUCATION = "education"
    RETAIL = "retail"
    CONSULTING = "consulting"
    GOVERNMENT = "government"
    NON_PROFIT = "non_profit"
    TECHNOLOGY = "technology"
    MEDIA = "media"
    REAL_ESTATE = "real_estate"
    CONSTRUCTION = "construction"
    ENERGY = "energy"
    TELECOMMUNICATIONS = "telecommunications"
    AGRICULTURE = "agriculture"
    TRANSPORTATION = "transportation"
    HOSPITALITY = "hospitality"
    LEGAL = "legal"
    OTHER = "other"


class OrganizationType(PyEnum):
    """Legal organization structure types"""

    CORPORATION = "corporation"
    LLC = "llc"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NON_PROFIT = "non_profit"
    GOVERNMENT = "government"
    COOPERATIVE = "cooperative"
    OTHER = "other"


# Database URL from environment
# Build DATABASE_URL from environment variables
DB_USER = os.getenv("DB_USER", "dev_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "dev_password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "zentropy")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLAlchemy setup - create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using them
    pool_recycle=3600,  # Recycle connections after 1 hour
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def test_database_connection() -> bool:
    """Test database connection without raising exceptions"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("⚠️  Starting server without database connection")
        return False


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Organization model
class Organization(Base):  # type: ignore
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Required fields
    name = Column(String, nullable=False)  # Full legal name

    # Optional core fields
    short_name = Column(String, nullable=True)  # Display name/abbreviation
    domain = Column(
        String, nullable=True, unique=True
    )  # For Google Workspace integration
    website = Column(String, nullable=True)
    industry: SqlColumn[IndustryType] = Column(Enum(IndustryType), nullable=True)
    organization_type: SqlColumn[OrganizationType] = Column(
        Enum(OrganizationType), nullable=True
    )

    # Address information
    headquarters_address = Column(String, nullable=True)
    headquarters_city = Column(String, nullable=True)
    headquarters_state = Column(String, nullable=True)
    headquarters_country = Column(String, nullable=True)
    headquarters_postal_code = Column(String, nullable=True)

    # Contact information
    main_phone = Column(String, nullable=True)
    primary_contact_name = Column(String, nullable=True)
    primary_contact_title = Column(String, nullable=True)
    primary_contact_email = Column(String, nullable=True)
    primary_contact_phone = Column(String, nullable=True)

    # Business information
    employee_count_range = Column(String, nullable=True)  # "1-10", "11-50", etc.
    time_zone = Column(String, nullable=True)
    founded_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)

    # Digital presence
    logo_url = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    twitter_url = Column(String, nullable=True)

    # System fields
    is_active = Column(Boolean, default=True)
    settings = Column(Text, nullable=True)  # JSON for org-level settings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization_rel")

    @classmethod
    def create_from_google_domain(cls, domain: str, name: str) -> "Organization":
        """Create organization from Google Workspace domain."""
        return cls(
            name=name,
            domain=domain,
            website=f"https://{domain}",
            short_name=domain.split(".")[0].title(),
        )

    @classmethod
    def find_potential_duplicates(
        cls, name: str, domain: Optional[str] = None
    ) -> List[Any]:
        """Find potential duplicate organizations."""
        # This would be implemented with database queries
        # For now, return empty list as placeholder
        return []


# User model
class User(Base):  # type: ignore
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Nullable for OAuth users
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    # Organization relationship
    organization_id = Column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )
    # DEPRECATED: Keep for backward compatibility during migration
    organization = Column(String, nullable=True)
    role: SqlColumn[UserRole] = Column(
        Enum(UserRole), nullable=False, default=UserRole.BASIC_USER
    )
    is_active = Column(Boolean, default=True)
    has_projects_access = Column(Boolean, default=True, nullable=False)
    # OAuth fields
    auth_provider: SqlColumn[AuthProvider] = Column(
        Enum(AuthProvider), nullable=False, default=AuthProvider.LOCAL
    )
    google_id = Column(String, nullable=True, unique=True)
    last_login_at = Column(DateTime, nullable=True)
    terms_accepted_at = Column(DateTime, nullable=True)
    terms_version = Column(String(20), nullable=True)
    privacy_accepted_at = Column(DateTime, nullable=True)
    privacy_version = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization_rel = relationship("Organization", back_populates="users")
    teams = relationship("Team", secondary="team_memberships", back_populates="members")
    created_teams = relationship("Team", back_populates="creator")
    calendar_entries = relationship("CalendarEntry", back_populates="user")
    password_history = relationship("PasswordHistory", back_populates="user")


# Team model
class Team(Base):  # type: ignore
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    velocity_baseline = Column(Integer, default=0)
    sprint_length_days = Column(Integer, default=14)
    working_days_per_week = Column(Integer, default=5)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_teams")
    members = relationship("User", secondary="team_memberships", back_populates="teams")
    calendar_entries = relationship("CalendarEntry", back_populates="team")
    invitations = relationship("TeamInvitation", back_populates="team")


# Team membership association table
class TeamMembership(Base):  # type: ignore
    __tablename__ = "team_memberships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role: SqlColumn[TeamRole] = Column(Enum(TeamRole), default=TeamRole.MEMBER)
    joined_at = Column(DateTime, default=datetime.utcnow)


# Calendar entry model
class CalendarEntry(Base):  # type: ignore
    __tablename__ = "calendar_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="calendar_entries")
    team = relationship("Team", back_populates="calendar_entries")


# Team invitation model
class TeamInvitation(Base):  # type: ignore
    __tablename__ = "team_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False)
    email = Column(String, nullable=False)
    role: SqlColumn[TeamRole] = Column(Enum(TeamRole), default=TeamRole.MEMBER)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: SqlColumn[InvitationStatus] = Column(
        Enum(InvitationStatus), default=InvitationStatus.PENDING
    )
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="invitations")
    inviter = relationship("User")


# Password history model
class PasswordHistory(Base):  # type: ignore
    __tablename__ = "password_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="password_history")


# Session model for authentication
class Session(Base):  # type: ignore
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
