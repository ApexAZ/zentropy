"""
Tests for Pydantic Schema Models

Tests validation, serialization, and edge cases for all Pydantic schemas
in the api/schemas.py file. Follows the "Test What Can Break" philosophy.
"""

import pytest
from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import ValidationError
from typing import Optional

from api.schemas import (
    # User schemas
    UserBase, UserCreate, UserUpdate, UserResponse, UserWithOrganizationResponse,
    UserLogin, PasswordUpdate,
    # Organization schemas
    OrganizationResponse,
    # Google OAuth schemas
    GoogleLoginRequest, GoogleOAuthRequest,
    # Team schemas
    TeamBase, TeamCreate, TeamUpdate, TeamResponse, TeamWithMembers,
    # Calendar entry schemas
    CalendarEntryBase, CalendarEntryCreate, CalendarEntryUpdate, CalendarEntryResponse,
    # Team invitation schemas
    TeamInvitationBase, TeamInvitationCreate, TeamInvitationResponse,
    # Authentication schemas
    Token, LoginResponse, TokenData,
    # Health check schema
    HealthResponse,
    # Email verification schemas
    EmailVerificationRequest, EmailVerificationResponse,
    # Generic response schemas
    MessageResponse, ErrorResponse,
    # Project schemas
    ProjectBase, ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
)
from api.database import (
    UserRole, TeamRole, InvitationStatus, RegistrationType,
    ProjectVisibility, ProjectStatus,
)


class TestUserSchemas:
    """Test user-related schema validation and edge cases."""
    
    def test_user_base_valid_data(self):
        """Test UserBase with valid data."""
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "role": UserRole.BASIC_USER,
            "has_projects_access": True
        }
        
        user = UserBase(**user_data)
        assert user.email == "test@example.com"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.role == UserRole.BASIC_USER
        assert user.has_projects_access is True
    
    def test_user_base_default_values(self):
        """Test UserBase with default values."""
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        }
        
        user = UserBase(**user_data)
        assert user.role == UserRole.BASIC_USER  # Default value
        assert user.has_projects_access is True  # Default value
    
    def test_user_base_invalid_email(self):
        """Test UserBase with invalid email format."""
        user_data = {
            "email": "not-an-email",
            "first_name": "Test",
            "last_name": "User"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserBase(**user_data)
        
        assert "value is not a valid email address" in str(exc_info.value)
    
    def test_user_base_empty_strings(self):
        """Test UserBase with empty strings."""
        user_data = {
            "email": "test@example.com",
            "first_name": "",
            "last_name": ""
        }
        
        user = UserBase(**user_data)
        assert user.first_name == ""
        assert user.last_name == ""
    
    def test_user_create_valid_data(self):
        """Test UserCreate with valid data."""
        user_data = {
            "email": "new@example.com",
            "first_name": "New",
            "last_name": "User",
            "password": "SecurePassword123",
            "terms_agreement": True
        }
        
        user = UserCreate(**user_data)
        assert user.email == "new@example.com"
        assert user.password == "SecurePassword123"
        assert user.terms_agreement is True
    
    def test_user_create_missing_required_fields(self):
        """Test UserCreate with missing required fields."""
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
            # Missing password and terms_agreement
        }
        
        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)
        
        error_str = str(exc_info.value)
        assert "password" in error_str
        assert "terms_agreement" in error_str
    
    def test_user_update_all_optional_fields(self):
        """Test UserUpdate with all optional fields."""
        user_data = {
            "email": "updated@example.com",
            "first_name": "Updated",
            "last_name": "User",
            "organization_id": uuid4(),
            "role": UserRole.ADMIN,
            "is_active": False,
            "has_projects_access": False
        }
        
        user = UserUpdate(**user_data)
        assert user.email == "updated@example.com"
        assert user.role == UserRole.ADMIN
        assert user.is_active is False
        assert user.has_projects_access is False
    
    def test_user_update_empty_data(self):
        """Test UserUpdate with no data (all fields optional)."""
        user = UserUpdate()
        assert user.email is None
        assert user.first_name is None
        assert user.last_name is None
        assert user.organization_id is None
        assert user.role is None
        assert user.is_active is None
        assert user.has_projects_access is None
    
    def test_user_login_valid_data(self):
        """Test UserLogin with valid data."""
        login_data = {
            "email": "login@example.com",
            "password": "LoginPassword123",
            "remember_me": True
        }
        
        login = UserLogin(**login_data)
        assert login.email == "login@example.com"
        assert login.password == "LoginPassword123"
        assert login.remember_me is True
    
    def test_user_login_default_remember_me(self):
        """Test UserLogin with default remember_me value."""
        login_data = {
            "email": "login@example.com",
            "password": "LoginPassword123"
        }
        
        login = UserLogin(**login_data)
        assert login.remember_me is False  # Default value
    
    def test_password_update_valid_data(self):
        """Test PasswordUpdate with valid data."""
        password_data = {
            "current_password": "OldPassword123",
            "new_password": "NewPassword456"
        }
        
        password_update = PasswordUpdate(**password_data)
        assert password_update.current_password == "OldPassword123"
        assert password_update.new_password == "NewPassword456"


class TestTeamSchemas:
    """Test team-related schema validation and edge cases."""
    
    def test_team_base_valid_data(self):
        """Test TeamBase with valid data."""
        team_data = {
            "name": "Development Team",
            "description": "Core development team",
            "velocity_baseline": 50,
            "sprint_length_days": 14,
            "working_days_per_week": 5
        }
        
        team = TeamBase(**team_data)
        assert team.name == "Development Team"
        assert team.description == "Core development team"
        assert team.velocity_baseline == 50
        assert team.sprint_length_days == 14
        assert team.working_days_per_week == 5
    
    def test_team_base_default_values(self):
        """Test TeamBase with default values."""
        team_data = {
            "name": "Test Team"
        }
        
        team = TeamBase(**team_data)
        assert team.name == "Test Team"
        assert team.description is None  # Default
        assert team.velocity_baseline == 0  # Default
        assert team.sprint_length_days == 14  # Default
        assert team.working_days_per_week == 5  # Default
    
    def test_team_base_negative_values(self):
        """Test TeamBase with negative values."""
        team_data = {
            "name": "Test Team",
            "velocity_baseline": -10,
            "sprint_length_days": -5,
            "working_days_per_week": -3
        }
        
        # Should accept negative values (business logic validation happens elsewhere)
        team = TeamBase(**team_data)
        assert team.velocity_baseline == -10
        assert team.sprint_length_days == -5
        assert team.working_days_per_week == -3
    
    def test_team_create_with_created_by(self):
        """Test TeamCreate with created_by field."""
        team_data = {
            "name": "New Team",
            "created_by": uuid4()
        }
        
        team = TeamCreate(**team_data)
        assert team.name == "New Team"
        assert isinstance(team.created_by, UUID)
    
    def test_team_update_partial_data(self):
        """Test TeamUpdate with partial data."""
        team_data = {
            "name": "Updated Team Name",
            "velocity_baseline": 75
        }
        
        team = TeamUpdate(**team_data)
        assert team.name == "Updated Team Name"
        assert team.velocity_baseline == 75
        assert team.description is None
        assert team.sprint_length_days is None
        assert team.working_days_per_week is None


class TestCalendarEntrySchemas:
    """Test calendar entry schema validation and edge cases."""
    
    def test_calendar_entry_base_valid_data(self):
        """Test CalendarEntryBase with valid data."""
        start_date = datetime(2024, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 15, 17, 0, 0, tzinfo=timezone.utc)
        
        entry_data = {
            "title": "Team Meeting",
            "description": "Weekly team standup",
            "start_date": start_date,
            "end_date": end_date,
            "all_day": False,
            "team_id": uuid4()
        }
        
        entry = CalendarEntryBase(**entry_data)
        assert entry.title == "Team Meeting"
        assert entry.description == "Weekly team standup"
        assert entry.start_date == start_date
        assert entry.end_date == end_date
        assert entry.all_day is False
        assert isinstance(entry.team_id, UUID)
    
    def test_calendar_entry_base_default_values(self):
        """Test CalendarEntryBase with default values."""
        start_date = datetime(2024, 1, 15, 9, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 15, 17, 0, 0, tzinfo=timezone.utc)
        
        entry_data = {
            "title": "Meeting",
            "start_date": start_date,
            "end_date": end_date
        }
        
        entry = CalendarEntryBase(**entry_data)
        assert entry.description is None  # Default
        assert entry.all_day is False  # Default
        assert entry.team_id is None  # Default
    
    def test_calendar_entry_all_day_event(self):
        """Test CalendarEntryBase with all_day event."""
        start_date = datetime(2024, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 15, 23, 59, 59, tzinfo=timezone.utc)
        
        entry_data = {
            "title": "Conference Day",
            "start_date": start_date,
            "end_date": end_date,
            "all_day": True
        }
        
        entry = CalendarEntryBase(**entry_data)
        assert entry.all_day is True
    
    def test_calendar_entry_update_partial_data(self):
        """Test CalendarEntryUpdate with partial data."""
        entry_data = {
            "title": "Updated Meeting Title",
            "all_day": True
        }
        
        entry = CalendarEntryUpdate(**entry_data)
        assert entry.title == "Updated Meeting Title"
        assert entry.all_day is True
        assert entry.description is None
        assert entry.start_date is None
        assert entry.end_date is None
        assert entry.team_id is None


class TestProjectSchemas:
    """Test project schema validation and edge cases."""
    
    def test_project_base_valid_data(self):
        """Test ProjectBase with valid data."""
        project_data = {
            "name": "Web Application",
            "description": "Company website redesign",
            "visibility": ProjectVisibility.TEAM,
            "status": ProjectStatus.ACTIVE
        }
        
        project = ProjectBase(**project_data)
        assert project.name == "Web Application"
        assert project.description == "Company website redesign"
        assert project.visibility == ProjectVisibility.TEAM
        assert project.status == ProjectStatus.ACTIVE
    
    def test_project_base_default_values(self):
        """Test ProjectBase with default values."""
        project_data = {
            "name": "Test Project"
        }
        
        project = ProjectBase(**project_data)
        assert project.name == "Test Project"
        assert project.description is None  # Default
        assert project.visibility == ProjectVisibility.INDIVIDUAL  # Default
        assert project.status == ProjectStatus.ACTIVE  # Default
    
    def test_project_create_with_organization(self):
        """Test ProjectCreate with organization_id."""
        project_data = {
            "name": "Team Project",
            "description": "Collaborative project",
            "visibility": ProjectVisibility.TEAM,
            "organization_id": uuid4()
        }
        
        project = ProjectCreate(**project_data)
        assert project.name == "Team Project"
        assert project.visibility == ProjectVisibility.TEAM
        assert isinstance(project.organization_id, UUID)
    
    def test_project_update_visibility_change(self):
        """Test ProjectUpdate changing visibility."""
        project_data = {
            "visibility": ProjectVisibility.ORGANIZATION,
            "status": ProjectStatus.COMPLETED
        }
        
        project = ProjectUpdate(**project_data)
        assert project.visibility == ProjectVisibility.ORGANIZATION
        assert project.status == ProjectStatus.COMPLETED
        assert project.name is None
        assert project.description is None
        assert project.organization_id is None
    
    def test_project_list_response_empty_list(self):
        """Test ProjectListResponse with empty project list."""
        response_data = {
            "projects": [],
            "total": 0,
            "page": 1,
            "limit": 50
        }
        
        response = ProjectListResponse(**response_data)
        assert response.projects == []
        assert response.total == 0
        assert response.page == 1
        assert response.limit == 50
    
    def test_project_list_response_default_pagination(self):
        """Test ProjectListResponse with default pagination values."""
        response_data = {
            "projects": [],
            "total": 0
        }
        
        response = ProjectListResponse(**response_data)
        assert response.page == 1  # Default
        assert response.limit == 50  # Default


class TestAuthenticationSchemas:
    """Test authentication-related schema validation and edge cases."""
    
    def test_token_valid_data(self):
        """Test Token with valid data."""
        token_data = {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer"
        }
        
        token = Token(**token_data)
        assert token.access_token.startswith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
        assert token.token_type == "bearer"
    
    def test_token_default_type(self):
        """Test Token with default token_type."""
        token_data = {
            "access_token": "sample_token_123"
        }
        
        token = Token(**token_data)
        assert token.token_type == "bearer"  # Default
    
    def test_login_response_valid_data(self):
        """Test LoginResponse with valid data."""
        response_data = {
            "access_token": "jwt_token_here",
            "token_type": "bearer",
            "user": {
                "id": str(uuid4()),
                "email": "user@example.com",
                "first_name": "John",
                "last_name": "Doe",
                "organization_id": None,
                "has_projects_access": True,
                "email_verified": True,
                "registration_type": "email",
                "role": "basic_user"
            }
        }
        
        response = LoginResponse(**response_data)
        assert response.access_token == "jwt_token_here"
        assert response.token_type == "bearer"
        assert response.user.email == "user@example.com"
        assert response.user.first_name == "John"
        assert response.user.last_name == "Doe"
    
    def test_token_data_optional_user_id(self):
        """Test TokenData with optional user_id."""
        # Test with user_id
        token_data_with_id = {"user_id": uuid4()}
        token_data = TokenData(**token_data_with_id)
        assert isinstance(token_data.user_id, UUID)
        
        # Test without user_id
        token_data_empty = TokenData()
        assert token_data_empty.user_id is None


class TestGoogleOAuthSchemas:
    """Test Google OAuth schema validation and edge cases."""
    
    def test_google_login_request_valid_data(self):
        """Test GoogleLoginRequest with valid data."""
        request_data = {
            "google_token": "google_oauth_token_123"
        }
        
        request = GoogleLoginRequest(**request_data)
        assert request.google_token == "google_oauth_token_123"
    
    def test_google_oauth_request_valid_data(self):
        """Test GoogleOAuthRequest with valid data."""
        request_data = {
            "credential": "google_credential_jwt_token"
        }
        
        request = GoogleOAuthRequest(**request_data)
        assert request.credential == "google_credential_jwt_token"


class TestInvitationSchemas:
    """Test team invitation schema validation and edge cases."""
    
    def test_team_invitation_base_valid_data(self):
        """Test TeamInvitationBase with valid data."""
        invitation_data = {
            "email": "invite@example.com",
            "role": TeamRole.LEAD
        }
        
        invitation = TeamInvitationBase(**invitation_data)
        assert invitation.email == "invite@example.com"
        assert invitation.role == TeamRole.LEAD
    
    def test_team_invitation_base_default_role(self):
        """Test TeamInvitationBase with default role."""
        invitation_data = {
            "email": "invite@example.com"
        }
        
        invitation = TeamInvitationBase(**invitation_data)
        assert invitation.role == TeamRole.MEMBER  # Default
    
    def test_team_invitation_create_required_fields(self):
        """Test TeamInvitationCreate with required fields."""
        invitation_data = {
            "email": "invite@example.com",
            "team_id": uuid4(),
            "invited_by": uuid4()
        }
        
        invitation = TeamInvitationCreate(**invitation_data)
        assert invitation.email == "invite@example.com"
        assert isinstance(invitation.team_id, UUID)
        assert isinstance(invitation.invited_by, UUID)
        assert invitation.role == TeamRole.MEMBER  # Default from base


class TestGenericSchemas:
    """Test generic response schema validation and edge cases."""
    
    def test_message_response_valid_data(self):
        """Test MessageResponse with valid data."""
        response_data = {
            "message": "Operation completed successfully"
        }
        
        response = MessageResponse(**response_data)
        assert response.message == "Operation completed successfully"
    
    def test_message_response_empty_message(self):
        """Test MessageResponse with empty message."""
        response_data = {
            "message": ""
        }
        
        response = MessageResponse(**response_data)
        assert response.message == ""
    
    def test_error_response_valid_data(self):
        """Test ErrorResponse with valid data."""
        response_data = {
            "detail": "An error occurred during processing"
        }
        
        response = ErrorResponse(**response_data)
        assert response.detail == "An error occurred during processing"
    
    def test_health_response_valid_data(self):
        """Test HealthResponse with valid data."""
        response_data = {
            "status": "ok",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc)
        }
        
        response = HealthResponse(**response_data)
        assert response.status == "ok"
        assert response.database == "connected"
        assert isinstance(response.timestamp, datetime)


class TestEmailVerificationSchemas:
    """Test email verification schema validation and edge cases."""
    
    def test_email_verification_request_valid_data(self):
        """Test EmailVerificationRequest with valid data."""
        request_data = {
            "email": "verify@example.com"
        }
        
        request = EmailVerificationRequest(**request_data)
        assert request.email == "verify@example.com"
    
    def test_email_verification_request_invalid_email(self):
        """Test EmailVerificationRequest with invalid email."""
        request_data = {
            "email": "not-an-email"
        }
        
        with pytest.raises(ValidationError) as exc_info:
            EmailVerificationRequest(**request_data)
        
        assert "value is not a valid email address" in str(exc_info.value)
    
    def test_email_verification_response_valid_data(self):
        """Test EmailVerificationResponse with valid data."""
        response_data = {
            "message": "Verification email sent",
            "email": "verify@example.com"
        }
        
        response = EmailVerificationResponse(**response_data)
        assert response.message == "Verification email sent"
        assert response.email == "verify@example.com"


class TestSchemaEdgeCases:
    """Test edge cases and boundary conditions across all schemas."""
    
    def test_uuid_field_validation(self):
        """Test UUID field validation with invalid values."""
        # Test with invalid UUID string
        with pytest.raises(ValidationError):
            UserUpdate(organization_id="not-a-uuid")
        
        # Test with valid UUID string
        valid_uuid = str(uuid4())
        user_update = UserUpdate(organization_id=valid_uuid)
        assert isinstance(user_update.organization_id, UUID)
    
    def test_datetime_field_validation(self):
        """Test datetime field validation with various formats."""
        # Test with ISO format string
        iso_datetime = "2024-01-15T10:30:00Z"
        entry = CalendarEntryBase(
            title="Test Event",
            start_date=iso_datetime,
            end_date=iso_datetime
        )
        assert isinstance(entry.start_date, datetime)
        
        # Test with datetime object
        dt_object = datetime.now(timezone.utc)
        entry2 = CalendarEntryBase(
            title="Test Event 2",
            start_date=dt_object,
            end_date=dt_object
        )
        assert entry2.start_date == dt_object
    
    def test_enum_field_validation(self):
        """Test enum field validation with invalid values."""
        # Test with invalid role
        with pytest.raises(ValidationError):
            UserBase(
                email="test@example.com",
                first_name="Test",
                last_name="User",
                role="INVALID_ROLE"
            )
        
        # Test with valid role
        user = UserBase(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN
        )
        assert user.role == UserRole.ADMIN
    
    def test_model_config_from_attributes(self):
        """Test that models with from_attributes=True work correctly."""
        # Create a mock SQLAlchemy-like object
        class MockUser:
            def __init__(self):
                self.id = uuid4()
                self.email = "test@example.com"
                self.first_name = "Test"
                self.last_name = "User"
                self.role = UserRole.BASIC_USER
                self.has_projects_access = True
                self.organization_id = None
                self.is_active = True
                self.email_verified = False
                self.registration_type = RegistrationType.EMAIL
                self.last_login_at = None
                self.created_at = datetime.now(timezone.utc)
                self.updated_at = datetime.now(timezone.utc)
        
        mock_user = MockUser()
        
        # Test that UserResponse can be created from attributes
        user_response = UserResponse.model_validate(mock_user)
        assert user_response.email == "test@example.com"
        assert user_response.first_name == "Test"
        assert user_response.role == UserRole.BASIC_USER
    
    def test_optional_fields_with_none_values(self):
        """Test optional fields with explicit None values."""
        user_update = UserUpdate(
            email=None,
            first_name=None,
            last_name=None,
            organization_id=None,
            role=None,
            is_active=None,
            has_projects_access=None
        )
        
        # All should be None
        assert user_update.email is None
        assert user_update.first_name is None
        assert user_update.last_name is None
        assert user_update.organization_id is None
        assert user_update.role is None
        assert user_update.is_active is None
        assert user_update.has_projects_access is None
    
    def test_long_string_fields(self):
        """Test fields with very long strings."""
        long_string = "x" * 10000
        
        # Test that long strings are accepted
        user = UserBase(
            email="test@example.com",
            first_name=long_string,
            last_name=long_string
        )
        assert len(user.first_name) == 10000
        assert len(user.last_name) == 10000
    
    def test_special_characters_in_strings(self):
        """Test fields with special characters."""
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
        user = UserBase(
            email="test@example.com",
            first_name=special_chars,
            last_name=special_chars
        )
        assert user.first_name == special_chars
        assert user.last_name == special_chars
    
    def test_unicode_characters_in_strings(self):
        """Test fields with unicode characters."""
        unicode_string = "测试用户名 José María 🚀"
        
        user = UserBase(
            email="test@example.com",
            first_name=unicode_string,
            last_name=unicode_string
        )
        assert user.first_name == unicode_string
        assert user.last_name == unicode_string