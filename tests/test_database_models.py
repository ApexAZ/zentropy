"""
Database Models Testing Suite (Simplified)

Tests for SQLAlchemy model validation and basic operations.
"""
import pytest
from datetime import datetime, date
import uuid

from api.database import (
    User, Team, CalendarEntry, TeamMembership, TeamInvitation, PasswordHistory, Session,
    get_db, test_database_connection
)


class TestUserModel:
    """Test User model validation and operations."""
    
    def test_user_model_creation(self):
        """Test User model instantiation with valid data."""
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User", 
            "password_hash": "$2b$12$test_hash",
            "role": "basic_user",
            "is_active": True
        }
        
        user = User(**user_data)
        
        assert user.email == "test@example.com"
        assert user.first_name == "Test"
        assert user.last_name == "User"
        assert user.password_hash == "$2b$12$test_hash"
        assert user.role == "basic_user"
        assert user.is_active is True
        assert user.id is not None
    
    def test_user_model_defaults(self):
        """Test User model default values."""
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password_hash="hash"
        )
        
        assert user.is_active is True  # Default
        assert user.role == "basic_user"  # Default
        assert user.created_at is not None
        assert user.updated_at is not None
    
    def test_user_email_validation(self):
        """Test User email field constraints."""
        valid_emails = [
            "test@example.com",
            "user.name@domain.org", 
            "user+tag@example.co.uk",
            "123@numbers.com"
        ]
        
        for email in valid_emails:
            user = User(
                email=email, 
                first_name="Test",
                last_name="User",
                password_hash="hash"
            )
            assert user.email == email


class TestTeamModel:
    """Test Team model validation and operations."""
    
    def test_team_model_creation(self):
        """Test Team model instantiation with valid data."""
        team_data = {
            "name": "Development Team",
            "description": "Main development team",
            "velocity_baseline": 40,
            "sprint_length_days": 14,
            "working_days_per_week": 5,
            "created_by": uuid.uuid4()
        }
        
        team = Team(**team_data)
        
        assert team.name == "Development Team"
        assert team.description == "Main development team"
        assert team.velocity_baseline == 40
        assert team.sprint_length_days == 14
        assert team.working_days_per_week == 5
        assert team.id is not None
        assert team.created_at is not None
        assert team.updated_at is not None
    
    def test_team_model_defaults(self):
        """Test Team model default values."""
        team = Team(name="Test Team")
        
        assert team.name == "Test Team"
        assert team.velocity_baseline == 0  # Default
        assert team.sprint_length_days == 14  # Default
        assert team.working_days_per_week == 5  # Default
        assert team.description is None  # Optional field


class TestCalendarEntryModel:
    """Test CalendarEntry model validation and operations."""
    
    def test_calendar_entry_model_creation(self):
        """Test CalendarEntry model instantiation."""
        entry_data = {
            "title": "Summer Vacation",
            "description": "Annual summer vacation",
            "start_date": datetime(2025, 7, 15),
            "end_date": datetime(2025, 7, 25),
            "all_day": True,
            "user_id": uuid.uuid4(),
            "team_id": uuid.uuid4()
        }
        
        entry = CalendarEntry(**entry_data)
        
        assert entry.title == "Summer Vacation"
        assert entry.description == "Annual summer vacation"
        assert entry.start_date == datetime(2025, 7, 15)
        assert entry.end_date == datetime(2025, 7, 25)
        assert entry.all_day is True
        assert entry.id is not None
        assert entry.created_at is not None
    
    def test_calendar_entry_defaults(self):
        """Test CalendarEntry default values."""
        entry = CalendarEntry(
            title="Test Entry",
            start_date=datetime(2025, 7, 15),
            end_date=datetime(2025, 7, 15),
            user_id=uuid.uuid4()
        )
        
        assert entry.all_day is False  # Default
        assert entry.team_id is None  # Optional


class TestTeamMembershipModel:
    """Test TeamMembership model validation and operations."""
    
    def test_team_membership_creation(self):
        """Test TeamMembership model instantiation."""
        membership_data = {
            "user_id": uuid.uuid4(),
            "team_id": uuid.uuid4(),
            "role": "member"
        }
        
        membership = TeamMembership(**membership_data)
        
        assert membership.user_id == membership_data["user_id"]
        assert membership.team_id == membership_data["team_id"]
        assert membership.role == "member"
        assert membership.joined_at is not None
    
    def test_team_membership_default_role(self):
        """Test TeamMembership default role."""
        membership = TeamMembership(
            user_id=uuid.uuid4(),
            team_id=uuid.uuid4()
        )
        
        assert membership.role == "member"  # Default


class TestTeamInvitationModel:
    """Test TeamInvitation model validation and operations."""
    
    def test_team_invitation_creation(self):
        """Test TeamInvitation model instantiation."""
        invitation_data = {
            "team_id": uuid.uuid4(),
            "email": "newuser@example.com",
            "role": "member",
            "invited_by": uuid.uuid4(),
            "status": "pending",
            "expires_at": datetime.utcnow()
        }
        
        invitation = TeamInvitation(**invitation_data)
        
        assert invitation.team_id == invitation_data["team_id"]
        assert invitation.email == "newuser@example.com"
        assert invitation.role == "member"
        assert invitation.invited_by == invitation_data["invited_by"]
        assert invitation.status == "pending"
        assert invitation.created_at is not None
    
    def test_team_invitation_defaults(self):
        """Test TeamInvitation default values."""
        invitation = TeamInvitation(
            team_id=uuid.uuid4(),
            email="test@example.com",
            invited_by=uuid.uuid4(),
            expires_at=datetime.utcnow()
        )
        
        assert invitation.role == "member"  # Default
        assert invitation.status == "pending"  # Default


class TestPasswordHistoryModel:
    """Test PasswordHistory model validation and operations."""
    
    def test_password_history_creation(self):
        """Test PasswordHistory model instantiation."""
        history_data = {
            "user_id": uuid.uuid4(),
            "password_hash": "$2b$12$old_hash"
        }
        
        history = PasswordHistory(**history_data)
        
        assert history.user_id == history_data["user_id"]
        assert history.password_hash == "$2b$12$old_hash"
        assert history.id is not None
        assert history.created_at is not None


class TestSessionModel:
    """Test Session model validation and operations."""
    
    def test_session_creation(self):
        """Test Session model instantiation."""
        session_data = {
            "user_id": uuid.uuid4(),
            "session_token": "abc123token",
            "expires_at": datetime.utcnow()
        }
        
        session = Session(**session_data)
        
        assert session.user_id == session_data["user_id"]
        assert session.session_token == "abc123token"
        assert session.expires_at == session_data["expires_at"]
        assert session.id is not None
        assert session.created_at is not None


class TestDatabaseConnection:
    """Test database connection functionality."""
    
    def test_get_db_generator(self):
        """Test that get_db returns a generator."""
        db_gen = get_db()
        assert hasattr(db_gen, '__next__')  # Is a generator
    
    def test_test_database_connection_function_exists(self):
        """Test that test_database_connection function exists and is callable."""
        assert callable(test_database_connection)
        # Note: We don't call it as it requires actual database connection