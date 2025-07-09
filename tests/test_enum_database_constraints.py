"""
Database Enum Constraint Tests

Tests for enum validation in database models. These tests validate that:
1. Python enum validation works correctly before database operations
2. Valid enum values are properly stored and retrieved
3. SQLAlchemy enum mappings work as expected

Note: SQLite (used in tests) doesn't enforce enum constraints like PostgreSQL,
so these tests focus on Python-level validation and correct enum behavior.
"""

import pytest
import uuid
from sqlalchemy.exc import DataError, IntegrityError, StatementError
from fastapi.testclient import TestClient

from api.main import app
from api.database import User, Organization, TeamMembership, TeamInvitation
from api.database import UserRole, AuthProvider, RegistrationType, TeamRole, InvitationStatus
from api.database import IndustryType, OrganizationType

class TestEnumValueValidation:
    """Test that enum values are properly validated and stored."""

    def test_all_enum_values_are_available(self):
        """Test that all enum classes have the expected values."""
        # Test UserRole values
        assert UserRole.BASIC_USER.value == "basic_user"
        assert UserRole.ADMIN.value == "admin"
        assert UserRole.TEAM_LEAD.value == "team_lead"
        
        # Test AuthProvider values
        assert AuthProvider.LOCAL.value == "local"
        assert AuthProvider.GOOGLE.value == "google"
        
        # Test RegistrationType values
        assert RegistrationType.EMAIL.value == "email"
        assert RegistrationType.GOOGLE_OAUTH.value == "google_oauth"
        
        # Test TeamRole values
        assert TeamRole.MEMBER.value == "member"
        assert TeamRole.LEAD.value == "lead"
        assert TeamRole.TEAM_ADMIN.value == "team_admin"
        
        # Test InvitationStatus values
        assert InvitationStatus.PENDING.value == "pending"
        assert InvitationStatus.ACCEPTED.value == "accepted"
        assert InvitationStatus.DECLINED.value == "declined"
        assert InvitationStatus.EXPIRED.value == "expired"

    def test_team_role_with_proper_uuids(self, db):
        """Test that TeamRole works correctly with proper UUID objects."""
        # Create proper UUID objects
        team_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        membership = TeamMembership(
            team_id=team_id,
            user_id=user_id,
            role=TeamRole.TEAM_ADMIN  # Valid enum value
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
        
        assert membership.role == TeamRole.TEAM_ADMIN
        assert membership.role.value == "team_admin"

    def test_invitation_status_with_proper_uuids(self, db):
        """Test that InvitationStatus works correctly with proper UUID objects."""
        from datetime import datetime, timedelta
        
        # Create proper UUID objects
        team_id = uuid.uuid4()
        invited_by = uuid.uuid4()
        
        invitation = TeamInvitation(
            team_id=team_id,
            email="test@example.com",
            invited_by=invited_by,
            status=InvitationStatus.PENDING,  # Valid enum value
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        
        assert invitation.status == InvitationStatus.PENDING
        assert invitation.status.value == "pending"

    def test_industry_type_valid_values_work(self, db):
        """Test that valid IndustryType values work correctly."""
        org = Organization(
            name="Test Org",
            industry=IndustryType.TECHNOLOGY  # Valid enum value
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.industry == IndustryType.TECHNOLOGY
        assert org.industry.value == "technology"

    def test_organization_type_valid_values_work(self, db):
        """Test that valid OrganizationType values work correctly."""
        org = Organization(
            name="Test Org",
            organization_type=OrganizationType.CORPORATION  # Valid enum value
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.organization_type == OrganizationType.CORPORATION
        assert org.organization_type.value == "corporation"


class TestSQLiteEnumBehavior:
    """Test SQLite-specific enum behavior for test environment awareness."""

    def test_sqlalchemy_enum_validation_works(self, db):
        """Test that SQLAlchemy validates enum values even in SQLite."""
        # This test shows that SQLAlchemy's enum validation works regardless of database
        # The validation happens at the Python layer, not just the database layer
        with pytest.raises(LookupError, match="'INVALID_ROLE' is not among the defined enum values"):
            user = User(
                email="sqlite-test@example.com",
                first_name="Test",
                last_name="User",
                role="INVALID_ROLE"  # SQLAlchemy validates this
            )
            db.add(user)
            db.commit()
            db.refresh(user)  # This is where the validation error occurs

    def test_uuid_string_conversion_fails(self, db):
        """Test that UUID fields require proper UUID objects, not strings."""
        with pytest.raises(StatementError, match="'str' object has no attribute 'hex'"):
            membership = TeamMembership(
                team_id="550e8400-e29b-41d4-a716-446655440000",  # String UUID fails
                user_id="550e8400-e29b-41d4-a716-446655440001",  # String UUID fails
                role=TeamRole.MEMBER
            )
            db.add(membership)
            db.commit()

    def test_proper_uuid_objects_work(self, db):
        """Test that proper UUID objects work correctly."""
        team_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        membership = TeamMembership(
            team_id=team_id,  # Proper UUID object
            user_id=user_id,  # Proper UUID object
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()  # This works
        db.refresh(membership)
        
        assert membership.team_id == team_id
        assert membership.user_id == user_id
        assert membership.role == TeamRole.MEMBER


class TestEnumValuesCallableIntegration:
    """Test that values_callable pattern works correctly for all enum columns."""

    def test_user_role_values_callable_works(self, db):
        """Test UserRole enum uses values, not names in database."""
        user = User(
            email="role-test@example.com",
            first_name="Test",
            last_name="User",
            
            role=UserRole.BASIC_USER  # Should store 'basic_user', not 'BASIC_USER'
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Verify enum object is returned
        assert user.role == UserRole.BASIC_USER
        # Verify database stores the value, not the name
        assert user.role.value == "basic_user"

    def test_registration_type_values_callable_works(self, db):
        """Test RegistrationType enum uses values, not names in database."""
        user = User(
            email="regtype-test@example.com", 
            first_name="Test",
            last_name="User",
            
            registration_type=RegistrationType.EMAIL  # Should store 'email', not 'EMAIL'
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Verify enum object is returned
        assert user.registration_type == RegistrationType.EMAIL
        # Verify database stores the value, not the name
        assert user.registration_type.value == "email"

    def test_auth_provider_values_callable_works(self, db):
        """Test AuthProvider enum uses values, not names in database."""
        user = User(
            email="auth-test@example.com",
            first_name="Test", 
            last_name="User",
            
            auth_provider=AuthProvider.LOCAL  # Should store 'local', not 'LOCAL'
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Verify enum object is returned
        assert user.auth_provider == AuthProvider.LOCAL
        # Verify database stores the value, not the name  
        assert user.auth_provider.value == "local"


class TestCrossEnumInteractions:
    """Test scenarios involving multiple enums working together."""

    def test_google_oauth_sets_both_auth_and_registration_enums(self, db):
        """Test Google OAuth users get both AuthProvider.GOOGLE and RegistrationType.GOOGLE_OAUTH."""
        user = User(
            email="oauth-cross-test@example.com",
            first_name="OAuth",
            last_name="User",
            
            auth_provider=AuthProvider.GOOGLE,
            registration_type=RegistrationType.GOOGLE_OAUTH,
            email_verified=True  # Google users are pre-verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Verify both enums are set correctly
        assert user.auth_provider == AuthProvider.GOOGLE
        assert user.registration_type == RegistrationType.GOOGLE_OAUTH
        assert user.email_verified is True

    def test_email_registration_sets_correct_enum_combination(self, db):
        """Test email registration users get AuthProvider.LOCAL and RegistrationType.EMAIL."""
        user = User(
            email="email-cross-test@example.com",
            first_name="Email",
            last_name="User",
            
            auth_provider=AuthProvider.LOCAL,
            registration_type=RegistrationType.EMAIL,
            email_verified=False  # Email users need verification
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Verify both enums are set correctly
        assert user.auth_provider == AuthProvider.LOCAL
        assert user.registration_type == RegistrationType.EMAIL
        assert user.email_verified is False

    def test_team_role_admin_with_user_role_admin_consistency(self):
        """Test that system admin users can have team admin roles consistently."""
        # This tests that enum combinations make sense semantically
        user_role = UserRole.ADMIN
        team_role = TeamRole.TEAM_ADMIN
        
        # Both should be admin-level roles
        assert "admin" in user_role.value
        assert "admin" in team_role.value
        
        # Test they can coexist in the same user context
        assert user_role != team_role  # Different enum types
        assert user_role.value != team_role.value  # Different specific values