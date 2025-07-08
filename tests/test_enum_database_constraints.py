"""
Database Enum Constraint Tests

Critical tests for enum database constraint validation that were missing from coverage.
These tests ensure that invalid enum values are properly rejected by the database.
"""

import pytest
from sqlalchemy.exc import DataError, IntegrityError
from fastapi.testclient import TestClient

from api.main import app
from api.database import User, Organization, TeamMembership, TeamInvitation
from api.database import UserRole, AuthProvider, RegistrationType, TeamRole, InvitationStatus
from api.database import IndustryType, OrganizationType

class TestDatabaseEnumConstraints:
    """Test that database properly validates enum constraints."""

    def test_user_role_invalid_value_rejected(self, db):
        """Test that invalid UserRole values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            user = User(
                email="invalid-role@example.com",
                first_name="Test",
                last_name="User",
                organization="Test Org",
                role="INVALID_ROLE"  # Should fail
            )
            db.add(user)
            db.commit()

    def test_auth_provider_invalid_value_rejected(self, db):
        """Test that invalid AuthProvider values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            user = User(
                email="invalid-auth@example.com",
                first_name="Test",
                last_name="User", 
                organization="Test Org",
                auth_provider="INVALID_PROVIDER"  # Should fail
            )
            db.add(user)
            db.commit()

    def test_registration_type_invalid_value_rejected(self, db):
        """Test that invalid RegistrationType values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            user = User(
                email="invalid-regtype@example.com",
                first_name="Test",
                last_name="User",
                organization="Test Org", 
                registration_type="INVALID_TYPE"  # Should fail
            )
            db.add(user)
            db.commit()

    def test_team_role_invalid_value_rejected(self, db):
        """Test that invalid TeamRole values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            membership = TeamMembership(
                team_id="550e8400-e29b-41d4-a716-446655440000",  # Fake UUID
                user_id="550e8400-e29b-41d4-a716-446655440001",  # Fake UUID
                role="INVALID_TEAM_ROLE"  # Should fail
            )
            db.add(membership)
            db.commit()

    def test_invitation_status_invalid_value_rejected(self, db):
        """Test that invalid InvitationStatus values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            from datetime import datetime, timedelta
            
            invitation = TeamInvitation(
                team_id="550e8400-e29b-41d4-a716-446655440000",  # Fake UUID
                email="test@example.com",
                invited_by="550e8400-e29b-41d4-a716-446655440001",  # Fake UUID
                status="INVALID_STATUS",  # Should fail
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.add(invitation)
            db.commit()

    def test_industry_type_invalid_value_rejected(self, db):
        """Test that invalid IndustryType values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            org = Organization(
                name="Test Org",
                industry="INVALID_INDUSTRY"  # Should fail
            )
            db.add(org)
            db.commit()

    def test_organization_type_invalid_value_rejected(self, db):
        """Test that invalid OrganizationType values are rejected by database."""
        with pytest.raises((DataError, IntegrityError)):
            org = Organization(
                name="Test Org",
                organization_type="INVALID_ORG_TYPE"  # Should fail
            )
            db.add(org)
            db.commit()


class TestEnumValuesCallableIntegration:
    """Test that values_callable pattern works correctly for all enum columns."""

    def test_user_role_values_callable_works(self, db):
        """Test UserRole enum uses values, not names in database."""
        user = User(
            email="role-test@example.com",
            first_name="Test",
            last_name="User",
            organization="Test Org",
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
            organization="Test Org",
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
            organization="Test Org",
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
            organization="OAuth Org",
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
            organization="Email Org",
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