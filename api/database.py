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
    CheckConstraint,
    Index,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)
from typing import Generator, Optional, List, Sequence
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
    HYBRID = "hybrid"  # Supports both email/password and Google OAuth


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


class OrganizationScope(PyEnum):
    """
    Organization scope types for just-in-time organization system.

    Defines the collaboration level and user capacity for organizations:
    - INDIVIDUAL: Individual user workspace (max 1 user)
    - SHARED: Team collaboration workspace (default, configurable user limit)
    - ENTERPRISE: Large organization workspace (unlimited users)
    """

    INDIVIDUAL = "individual"  # Individual user workspace, max 1 user
    SHARED = "shared"  # Team collaboration workspace, configurable limit
    ENTERPRISE = "enterprise"  # Large organization workspace, unlimited users

    @classmethod
    def get_default_max_users(cls, scope: "OrganizationScope") -> Optional[int]:
        """
        Get the default max_users value for a given scope.

        Args:
            scope: The organization scope

        Returns:
            int | None: Default max users (None = unlimited)
        """
        defaults = {
            cls.INDIVIDUAL: 1,
            cls.SHARED: 50,  # Default reasonable limit for shared workspaces
            cls.ENTERPRISE: None,  # Unlimited
        }
        return defaults.get(scope)

    @classmethod
    def validate_max_users(
        cls, scope: "OrganizationScope", max_users: Optional[int]
    ) -> bool:
        """
        Validate that max_users is appropriate for the given scope.

        Args:
            scope: The organization scope
            max_users: The proposed max users value

        Returns:
            bool: True if valid, False otherwise
        """
        if scope == cls.INDIVIDUAL:
            return max_users == 1
        elif scope == cls.SHARED:
            return max_users is None or max_users > 0
        elif scope == cls.ENTERPRISE:
            return max_users is None  # Enterprise should be unlimited
        return False


class ProjectVisibility(PyEnum):
    """
    Project visibility levels for access control in just-in-time organization system.

    Defines who can access projects based on organization assignment:
    - INDIVIDUAL: Only accessible to project creator (no organization required)
    - TEAM: Accessible to organization members (organization required)
    - ORGANIZATION: Accessible to all organization members (organization required)
    """

    INDIVIDUAL = "individual"  # Only creator can access, no organization required
    TEAM = "team"  # Organization members can access, organization required
    ORGANIZATION = "organization"  # All organization members, organization required

    @classmethod
    def requires_organization(cls, visibility: "ProjectVisibility") -> bool:
        """
        Check if visibility level requires organization assignment.

        Args:
            visibility: The project visibility level

        Returns:
            bool: True if organization is required, False otherwise
        """
        return visibility in [cls.TEAM, cls.ORGANIZATION]

    @classmethod
    def get_access_description(cls, visibility: "ProjectVisibility") -> str:
        """
        Get human-readable description of access level.

        Args:
            visibility: The project visibility level

        Returns:
            str: Description of who can access the project
        """
        descriptions = {
            cls.INDIVIDUAL: "Only accessible to project creator",
            cls.TEAM: "Accessible to team members within organization",
            cls.ORGANIZATION: "Accessible to all organization members",
        }
        return descriptions.get(visibility, "Unknown visibility level")


class ProjectStatus(PyEnum):
    """
    Project status values for tracking project lifecycle.

    Defines the current state of projects in the system:
    - ACTIVE: Project is currently being worked on
    - INACTIVE: Project is paused or not currently active
    - ARCHIVED: Project is completed and archived
    - COMPLETED: Project has been successfully completed
    """

    ACTIVE = "active"  # Currently being worked on
    INACTIVE = "inactive"  # Paused or not currently active
    ARCHIVED = "archived"  # Completed and archived
    COMPLETED = "completed"  # Successfully completed

    @classmethod
    def get_active_statuses(cls) -> List["ProjectStatus"]:
        """
        Get list of statuses considered "active" for filtering.

        Returns:
            List[ProjectStatus]: Statuses that indicate active projects
        """
        return [cls.ACTIVE]

    @classmethod
    def get_inactive_statuses(cls) -> List["ProjectStatus"]:
        """
        Get list of statuses considered "inactive" for filtering.

        Returns:
            List[ProjectStatus]: Statuses that indicate inactive projects
        """
        return [cls.INACTIVE, cls.ARCHIVED, cls.COMPLETED]


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

    # Just-in-time organization system fields
    scope: Mapped[OrganizationScope] = mapped_column(
        Enum(OrganizationScope, values_callable=get_enum_values),
        nullable=False,
        default=OrganizationScope.SHARED,
        doc="Organization scope defining collaboration level and user capacity",
    )
    max_users: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Maximum number of users allowed in this organization (None = unlimited)",
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", use_alter=True, name="fk_organization_created_by"),
        nullable=True,
        doc="ID of the user who created this organization",
    )

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

    # Database constraints for business rules
    __table_args__ = (
        CheckConstraint(
            "max_users IS NULL OR max_users > 0", name="positive_max_users"
        ),
        CheckConstraint(
            "(scope = 'individual' AND max_users = 1) OR scope != 'individual'",
            name="individual_scope_single_user",
        ),
        CheckConstraint(
            "(scope = 'enterprise' AND max_users IS NULL) OR scope != 'enterprise'",
            name="enterprise_scope_unlimited",
        ),
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User", back_populates="organization_rel", foreign_keys="User.organization_id"
    )
    creator_rel: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by], post_update=True, viewonly=True
    )

    def validate_scope_and_max_users(self) -> list[str]:
        """
        Validate that scope and max_users are consistent.

        Returns:
            list[str]: List of validation errors, empty if valid
        """
        errors = []

        if not OrganizationScope.validate_max_users(self.scope, self.max_users):
            if self.scope == OrganizationScope.INDIVIDUAL:
                errors.append("Individual organizations must have exactly 1 max user")
            elif self.scope == OrganizationScope.ENTERPRISE:
                errors.append(
                    "Enterprise organizations must have unlimited users "
                    "(max_users = None)"
                )
            elif self.scope == OrganizationScope.SHARED:
                if self.max_users is not None and self.max_users <= 0:
                    errors.append(
                        "Shared organizations must have a positive max_users value"
                    )

        return errors

    def can_add_user(self, db_session) -> bool:
        """
        Check if organization can accommodate another user.

        Args:
            db_session: Database session to query current user count

        Returns:
            bool: True if user can be added, False otherwise
        """
        if self.max_users is None:
            return True  # Unlimited

        current_user_count = (
            db_session.query(User)
            .filter(User.organization_id == self.id, User.is_active.is_(True))
            .count()
        )

        return current_user_count < self.max_users

    def get_user_count(self, db_session) -> int:
        """
        Get the current number of active users in this organization.

        Args:
            db_session: Database session to query user count

        Returns:
            int: Number of active users
        """
        return (
            db_session.query(User)
            .filter(User.organization_id == self.id, User.is_active.is_(True))
            .count()
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
    def create_individual_workspace(
        cls, user_id: uuid.UUID, user_name: str
    ) -> "Organization":
        """
        Create an individual workspace for an individual user.

        Args:
            user_id: ID of the user creating the workspace
            user_name: Name of the user for workspace naming

        Returns:
            Organization: Individual workspace organization
        """
        return cls(
            name=f"{user_name}'s Individual Workspace",
            scope=OrganizationScope.INDIVIDUAL,
            max_users=1,
            created_by=user_id,
        )

    @classmethod
    def create_shared_workspace(
        cls, name: str, user_id: uuid.UUID, max_users: Optional[int] = None
    ) -> "Organization":
        """
        Create a shared workspace for team collaboration.

        Args:
            name: Name of the organization
            user_id: ID of the user creating the workspace
            max_users: Maximum number of users (None for default)

        Returns:
            Organization: Shared workspace organization
        """
        if max_users is None:
            max_users = OrganizationScope.get_default_max_users(
                OrganizationScope.SHARED
            )

        return cls(
            name=name,
            scope=OrganizationScope.SHARED,
            max_users=max_users,
            created_by=user_id,
        )

    @classmethod
    def create_enterprise_workspace(
        cls, name: str, user_id: uuid.UUID, domain: Optional[str] = None
    ) -> "Organization":
        """
        Create an enterprise workspace for large organizations.

        Args:
            name: Name of the organization
            user_id: ID of the user creating the workspace
            domain: Optional domain for the organization

        Returns:
            Organization: Enterprise workspace organization
        """
        return cls(
            name=name,
            domain=domain,
            scope=OrganizationScope.ENTERPRISE,
            max_users=None,  # Unlimited
            created_by=user_id,
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
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Organization relationship - supports just-in-time organization assignment
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=True,
        doc="Organization ID - nullable to support just-in-time "
        "organization assignment during project creation",
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
    microsoft_id: Mapped[Optional[str]] = mapped_column(
        String, nullable=True, unique=True
    )
    github_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, unique=True)

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
        "Organization", back_populates="users", foreign_keys=[organization_id]
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

    def is_organization_assigned(self) -> bool:
        """
        Check if user has been assigned to an organization.

        In the just-in-time organization system, users start without
        an organization and get assigned to one during project creation.

        Returns:
            bool: True if user has an organization, False otherwise
        """
        return self.organization_id is not None

    def can_create_individual_projects(self) -> bool:
        """
        Check if user can create individual projects.

        Users without organization assignment can always create individual projects.
        Users with organization assignment should use organization project workflows.

        Returns:
            bool: True if user can create individual projects
        """
        return self.is_active and self.has_projects_access

    def get_organization_status(self) -> str:
        """
        Get user's organization assignment status for display purposes.

        Returns:
            str: Status description for UI display
        """
        if not self.is_organization_assigned():
            return "No organization - can create individual projects or join teams"
        else:
            return f"Member of organization {self.organization_id}"

    def assign_to_organization(self, organization_id: uuid.UUID) -> None:
        """
        Assign user to an organization (just-in-time assignment).

        This method is called during project creation when a user
        chooses to create a team project that requires organization membership.

        Args:
            organization_id: UUID of the organization to assign user to
        """
        if self.is_organization_assigned():
            raise ValueError(
                f"User {self.email} is already assigned to organization "
                f"{self.organization_id}"
            )

        self.organization_id = organization_id


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


# Operation token tracking for single-use enforcement
class UsedOperationToken(Base):
    """
    Track used operation tokens to prevent reuse attacks.

    Operation tokens should only be used once for security. This model
    stores the JTI (JWT ID) of tokens that have been consumed.
    """

    __tablename__ = "used_operation_tokens"

    jti: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID as string
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    used_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        Index("idx_used_tokens_cleanup", "expires_at"),
        Index("idx_used_tokens_lookup", "jti", "user_id"),
    )


# Session model removed - JWT authentication is used instead


# Project model
class Project(Base):
    """
    Project model for managing projects in the just-in-time organization system.

    Projects can be created with or without organizations, supporting the
    just-in-time organization assignment workflow where organization
    assignment is deferred until collaboration is needed.
    """

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Required fields
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Organization relationship - supports just-in-time organization assignment
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
        doc="Organization ID - nullable to support individual projects and "
        "just-in-time organization assignment",
    )

    # Creator relationship - required for all projects
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="ID of the user who created this project",
    )

    # Project visibility and access control
    visibility: Mapped[ProjectVisibility] = mapped_column(
        Enum(ProjectVisibility, values_callable=get_enum_values),
        nullable=False,
        default=ProjectVisibility.INDIVIDUAL,
        doc="Project visibility level determining access control",
    )

    # Project status and lifecycle
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, values_callable=get_enum_values),
        nullable=False,
        default=ProjectStatus.ACTIVE,
        doc="Current project status in lifecycle",
    )

    # System fields
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    settings: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, doc="JSON settings for project configuration"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Database constraints for business rules
    __table_args__ = (
        CheckConstraint(
            "(visibility = 'individual' AND organization_id IS NULL) OR "
            "(visibility IN ('team', 'organization') AND organization_id IS NOT NULL)",
            name="project_visibility_organization_constraint",
        ),
    )

    # Relationships
    organization_rel: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        foreign_keys=[organization_id],
        doc="Organization this project belongs to (None for individual projects)",
    )
    creator_rel: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by],
        doc="User who created this project",
    )

    def validate_visibility_constraints(self) -> List[str]:
        """
        Validate that visibility and organization settings are consistent.

        Returns:
            List[str]: List of validation errors, empty if valid
        """
        errors = []

        if self.visibility == ProjectVisibility.INDIVIDUAL:
            if self.organization_id is not None:
                errors.append(
                    "Individual projects cannot be assigned to an organization"
                )
        elif self.visibility in [
            ProjectVisibility.TEAM,
            ProjectVisibility.ORGANIZATION,
        ]:
            if self.organization_id is None:
                errors.append(
                    f"{self.visibility.value.title()} projects must be assigned "
                    "to an organization"
                )

        return errors

    def can_be_accessed_by(self, user: "User") -> bool:
        """
        Check if a user can access this project based on visibility rules.

        Args:
            user: User to check access for

        Returns:
            bool: True if user can access project, False otherwise
        """
        # Creator can always access their projects
        if self.created_by == user.id:
            return True

        # Individual projects are only accessible to creator
        if self.visibility == ProjectVisibility.INDIVIDUAL:
            return False

        # Team and organization projects require organization membership
        if self.visibility in [ProjectVisibility.TEAM, ProjectVisibility.ORGANIZATION]:
            if self.organization_id is None:
                return False  # Invalid state - should not happen

            # User must be in the same organization
            return user.organization_id == self.organization_id

        return False

    def get_visibility_description(self) -> str:
        """
        Get human-readable description of project visibility.

        Returns:
            str: Description of project access level
        """
        return ProjectVisibility.get_access_description(self.visibility)

    def is_individual_project(self) -> bool:
        """
        Check if this is an individual project.

        Returns:
            bool: True if individual project, False otherwise
        """
        return (
            self.visibility == ProjectVisibility.INDIVIDUAL
            and self.organization_id is None
        )

    def is_organization_project(self) -> bool:
        """
        Check if this is an organization project.

        Returns:
            bool: True if organization project, False otherwise
        """
        return (
            self.visibility in [ProjectVisibility.TEAM, ProjectVisibility.ORGANIZATION]
            and self.organization_id is not None
        )

    def can_be_converted_to_team_project(self, organization_id: uuid.UUID) -> bool:
        """
        Check if individual project can be converted to team project.

        Args:
            organization_id: Organization to convert project to

        Returns:
            bool: True if conversion is possible, False otherwise
        """
        # Check if project is personal and active
        # organization_id parameter is for future validation logic
        return self.is_individual_project() and self.status == ProjectStatus.ACTIVE

    @classmethod
    def create_individual_project(
        cls, name: str, creator_id: uuid.UUID, description: Optional[str] = None
    ) -> "Project":
        """
        Create an individual project for individual use.

        Args:
            name: Project name
            creator_id: ID of user creating the project
            description: Optional project description

        Returns:
            Project: Individual project instance
        """
        return cls(
            name=name,
            description=description,
            created_by=creator_id,
            organization_id=None,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
        )

    @classmethod
    def create_team_project(
        cls,
        name: str,
        creator_id: uuid.UUID,
        organization_id: uuid.UUID,
        description: Optional[str] = None,
    ) -> "Project":
        """
        Create a team project within an organization.

        Args:
            name: Project name
            creator_id: ID of user creating the project
            organization_id: ID of organization the project belongs to
            description: Optional project description

        Returns:
            Project: Team project instance
        """
        return cls(
            name=name,
            description=description,
            created_by=creator_id,
            organization_id=organization_id,
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.ACTIVE,
        )

    @classmethod
    def create_organization_project(
        cls,
        name: str,
        creator_id: uuid.UUID,
        organization_id: uuid.UUID,
        description: Optional[str] = None,
    ) -> "Project":
        """
        Create an organization-wide project.

        Args:
            name: Project name
            creator_id: ID of user creating the project
            organization_id: ID of organization the project belongs to
            description: Optional project description

        Returns:
            Project: Organization project instance
        """
        return cls(
            name=name,
            description=description,
            created_by=creator_id,
            organization_id=organization_id,
            visibility=ProjectVisibility.ORGANIZATION,
            status=ProjectStatus.ACTIVE,
        )

    @classmethod
    def find_projects_for_user(
        cls, db: Session, user_id: uuid.UUID, include_personal: bool = True
    ) -> Sequence["Project"]:
        """
        Find all projects accessible to a user.

        Args:
            db: Database session
            user_id: ID of user to find projects for
            include_personal: Whether to include individual projects

        Returns:
            List[Project]: List of accessible projects
        """
        query = db.query(cls)
        conditions = []

        # Always include projects created by the user
        conditions.append(cls.created_by == user_id)

        # Include organization projects if user has organization
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.organization_id:
            conditions.append(
                (cls.organization_id == user.organization_id)
                & (
                    cls.visibility.in_(
                        [
                            ProjectVisibility.TEAM,
                            ProjectVisibility.ORGANIZATION,
                        ]
                    )
                )
            )

        # Filter by conditions
        if conditions:
            from sqlalchemy import or_

            query = query.filter(or_(*conditions))

        # Filter out individual projects if requested
        if not include_personal:
            query = query.filter(cls.visibility != ProjectVisibility.INDIVIDUAL)

        return query.filter(cls.is_active.is_(True)).all()

    @classmethod
    def find_organization_projects(
        cls, db: Session, organization_id: uuid.UUID
    ) -> Sequence["Project"]:
        """
        Find all projects belonging to an organization.

        Args:
            db: Database session
            organization_id: ID of organization to find projects for

        Returns:
            List[Project]: List of organization projects
        """
        return (
            db.query(cls)
            .filter(cls.organization_id == organization_id)
            .filter(cls.is_active.is_(True))
            .all()
        )

    @classmethod
    def find_individual_projects(
        cls, db: Session, user_id: uuid.UUID
    ) -> Sequence["Project"]:
        """
        Find all individual projects for a user.

        Args:
            db: Database session
            user_id: ID of user to find individual projects for

        Returns:
            List[Project]: List of individual projects
        """
        return (
            db.query(cls)
            .filter(cls.created_by == user_id)
            .filter(cls.visibility == ProjectVisibility.INDIVIDUAL)
            .filter(cls.is_active.is_(True))
            .all()
        )
