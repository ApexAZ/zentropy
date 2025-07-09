from sqlalchemy import (
    create_engine,
    String,
    Boolean,
    DateTime,
    Integer,
    Text,
    ForeignKey,
    text,
    Enum,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)
from typing import Generator, Optional, List
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from enum import Enum as PyEnum
from typing import Type as TypingType

load_dotenv()


def get_enum_values(enum_class: TypingType[PyEnum]) -> List[str]:
    """Helper function to get enum values for SQLAlchemy Enum columns"""
    return [e.value for e in enum_class]


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
    TEAM_ADMIN = "team_admin"


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


class RegistrationType(PyEnum):
    """User registration method types"""

    EMAIL = "email"
    GOOGLE_OAUTH = "google_oauth"


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


class Base(DeclarativeBase):
    pass


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
class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Required fields
    name: Mapped[str] = mapped_column(String, nullable=False)  # Full legal name

    # Optional core fields
    short_name: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # Display name/abbreviation
    domain: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )  # For Google Workspace integration
    website: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[Optional[IndustryType]] = mapped_column(
        Enum(IndustryType, values_callable=get_enum_values),
        nullable=True,
    )
    organization_type: Mapped[Optional[OrganizationType]] = mapped_column(
        Enum(OrganizationType, values_callable=get_enum_values),
        nullable=True,
    )

    # Address information
    headquarters_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    headquarters_city: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    headquarters_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    headquarters_country: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    headquarters_postal_code: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )

    # Contact information
    main_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    primary_contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Business information
    employee_count_range: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # "1-10", "11-50", etc.
    time_zone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    founded_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Digital presence
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    twitter_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # System fields
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    settings: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON for org-level settings
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="organization_rel"
    )

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
        cls, db: Session, name: str, domain: Optional[str] = None
    ) -> List:
        """
        Find potential duplicate organizations based on name and domain.

        Args:
            db: Database session
            name: Organization name to search for
            domain: Optional domain to search for

        Returns:
            List of Organization objects that might be duplicates
        """
        from sqlalchemy import func, or_

        query = db.query(cls)
        conditions = []

        # Search for exact name match (case-insensitive)
        conditions.append(func.lower(cls.name) == func.lower(name))

        # Search for similar names (fuzzy matching)
        # Remove common business suffixes for comparison
        business_suffixes = [
            "Inc.",
            "LLC",
            "Corp.",
            "Corporation",
            "Limited",
            "Ltd.",
            "Company",
            "Co.",
        ]
        clean_name = name.strip()
        for suffix in business_suffixes:
            clean_name = clean_name.replace(suffix, "").strip()

        if clean_name != name:
            conditions.append(func.lower(cls.name).like(f"%{clean_name.lower()}%"))

        # Search for organizations with similar short names
        if hasattr(cls, "short_name") and cls.short_name:
            conditions.append(func.lower(cls.short_name) == func.lower(name))

        # If domain is provided, search for domain matches
        if domain:
            conditions.append(cls.domain == domain)

            # Also search for organizations where the domain might be in website
            conditions.append(func.lower(cls.website).like(f"%{domain.lower()}%"))

            # Extract potential organization name from domain
            domain_parts = domain.split(".")
            if len(domain_parts) > 1:
                domain_name = (
                    domain_parts[0].replace("-", " ").replace("_", " ").title()
                )
                conditions.append(func.lower(cls.name).like(f"%{domain_name.lower()}%"))

        # Combine conditions with OR logic
        if conditions:
            result = query.filter(or_(*conditions)).all()
        else:
            result = []

        return result


# User model
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(
        String, nullable=True
    )  # Nullable for OAuth users
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)

    # Organization relationship
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=get_enum_values),
        nullable=False,
        default=UserRole.BASIC_USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    has_projects_access: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    # OAuth fields
    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, values_callable=get_enum_values),
        nullable=False,
        default=AuthProvider.LOCAL,
    )
    google_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True)

    # Registration tracking
    registration_type: Mapped[RegistrationType] = mapped_column(
        Enum(RegistrationType, values_callable=get_enum_values),
        nullable=False,
        default=RegistrationType.EMAIL,
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    terms_accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    terms_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    privacy_accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    privacy_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Email verification fields
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verification_token: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )
    email_verification_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # User preferences
    # Note: remember_me functionality handled via JWT token expiration

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    organization_rel: Mapped[Optional["Organization"]] = relationship(
        "Organization", back_populates="users"
    )
    teams: Mapped[List["Team"]] = relationship(
        "Team", secondary="team_memberships", back_populates="members"
    )
    created_teams: Mapped[List["Team"]] = relationship("Team", back_populates="creator")
    calendar_entries: Mapped[List["CalendarEntry"]] = relationship(
        "CalendarEntry", back_populates="user"
    )
    password_history: Mapped[List["PasswordHistory"]] = relationship(
        "PasswordHistory", back_populates="user"
    )


# Team model
class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    velocity_baseline: Mapped[int] = mapped_column(Integer, default=0)
    sprint_length_days: Mapped[int] = mapped_column(Integer, default=14)
    working_days_per_week: Mapped[int] = mapped_column(Integer, default=5)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship(
        "User", back_populates="created_teams"
    )
    members: Mapped[List["User"]] = relationship(
        "User", secondary="team_memberships", back_populates="teams"
    )
    calendar_entries: Mapped[List["CalendarEntry"]] = relationship(
        "CalendarEntry", back_populates="team"
    )
    invitations: Mapped[List["TeamInvitation"]] = relationship(
        "TeamInvitation", back_populates="team"
    )


# Team membership association table
class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    role: Mapped[TeamRole] = mapped_column(
        Enum(TeamRole, values_callable=get_enum_values),
        default=TeamRole.MEMBER,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )


# Calendar entry model
class CalendarEntry(Base):
    __tablename__ = "calendar_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    all_day: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="calendar_entries")
    team: Mapped[Optional["Team"]] = relationship(
        "Team", back_populates="calendar_entries"
    )


# Team invitation model
class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[TeamRole] = mapped_column(
        Enum(TeamRole, values_callable=get_enum_values),
        default=TeamRole.MEMBER,
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus, values_callable=get_enum_values),
        default=InvitationStatus.PENDING,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="invitations")
    inviter: Mapped["User"] = relationship("User")


# Password history model
class PasswordHistory(Base):
    __tablename__ = "password_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="password_history")


# Session model removed - JWT authentication is used instead
