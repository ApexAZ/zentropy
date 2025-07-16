"""
Tests for Organization Scope enum and just-in-time organization features.

These tests verify the OrganizationScope enum behavior and organization model enhancements
for the just-in-time organization system.
"""

import pytest
from api.database import (
    Organization, 
    User, 
    OrganizationScope, 
    UserRole,
    RegistrationType,
    AuthProvider
)
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
import uuid


class TestOrganizationScope:
    """Test cases for OrganizationScope enum."""
    
    def test_organization_scope_enum_values(self):
        """Test that OrganizationScope enum has correct values."""
        assert OrganizationScope.PERSONAL.value == "personal"
        assert OrganizationScope.SHARED.value == "shared"
        assert OrganizationScope.ENTERPRISE.value == "enterprise"
    
    def test_organization_scope_enum_from_string(self):
        """Test that OrganizationScope can be created from string values."""
        assert OrganizationScope("personal") == OrganizationScope.PERSONAL
        assert OrganizationScope("shared") == OrganizationScope.SHARED
        assert OrganizationScope("enterprise") == OrganizationScope.ENTERPRISE
    
    def test_organization_scope_enum_invalid_value(self):
        """Test that invalid OrganizationScope values raise ValueError."""
        with pytest.raises(ValueError):
            OrganizationScope("invalid")
    
    def test_get_default_max_users(self):
        """Test that get_default_max_users returns correct defaults."""
        assert OrganizationScope.get_default_max_users(OrganizationScope.PERSONAL) == 1
        assert OrganizationScope.get_default_max_users(OrganizationScope.SHARED) == 50
        assert OrganizationScope.get_default_max_users(OrganizationScope.ENTERPRISE) is None
    
    def test_validate_max_users_personal(self):
        """Test max_users validation for personal scope."""
        assert OrganizationScope.validate_max_users(OrganizationScope.PERSONAL, 1) == True
        assert OrganizationScope.validate_max_users(OrganizationScope.PERSONAL, 2) == False
        assert OrganizationScope.validate_max_users(OrganizationScope.PERSONAL, None) == False
    
    def test_validate_max_users_shared(self):
        """Test max_users validation for shared scope."""
        assert OrganizationScope.validate_max_users(OrganizationScope.SHARED, 1) == True
        assert OrganizationScope.validate_max_users(OrganizationScope.SHARED, 50) == True
        assert OrganizationScope.validate_max_users(OrganizationScope.SHARED, None) == True
        assert OrganizationScope.validate_max_users(OrganizationScope.SHARED, 0) == False
        assert OrganizationScope.validate_max_users(OrganizationScope.SHARED, -1) == False
    
    def test_validate_max_users_enterprise(self):
        """Test max_users validation for enterprise scope."""
        assert OrganizationScope.validate_max_users(OrganizationScope.ENTERPRISE, None) == True
        assert OrganizationScope.validate_max_users(OrganizationScope.ENTERPRISE, 1) == False
        assert OrganizationScope.validate_max_users(OrganizationScope.ENTERPRISE, 1000) == False


class TestOrganizationModel:
    """Test cases for enhanced Organization model with just-in-time features."""
    
    def test_organization_creation_with_scope(self, db, mailpit_disabled):
        """Test creating an organization with scope field."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create organization with scope
        org = Organization(
            name="Test Organization",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.scope == OrganizationScope.SHARED
        assert org.max_users == 50
        assert org.created_by == user.id
    
    def test_organization_default_scope(self, db, mailpit_disabled):
        """Test that organization has default scope when not specified."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create organization without explicit scope
        org = Organization(
            name="Test Organization",
            created_by=user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        assert org.scope == OrganizationScope.SHARED  # Default value
    
    def test_organization_max_users_validation(self, db, mailpit_disabled):
        """Test that max_users field behaves correctly and enforces constraints."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Test with valid shared organization max_users
        shared_org = Organization(
            name="Shared Organization",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=user.id
        )
        db.add(shared_org)
        db.commit()
        db.refresh(shared_org)
        
        assert shared_org.max_users == 50
        
        # Test with null max_users for enterprise (unlimited)
        org_unlimited = Organization(
            name="Unlimited Organization",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None,
            created_by=user.id
        )
        db.add(org_unlimited)
        db.commit()
        db.refresh(org_unlimited)
        
        assert org_unlimited.max_users is None
        
        # Test that enterprise organizations with max_users fail database constraint
        with pytest.raises(Exception):  # Should raise IntegrityError due to constraint
            invalid_enterprise = Organization(
                name="Invalid Enterprise",
                scope=OrganizationScope.ENTERPRISE,
                max_users=1000,  # This violates the enterprise_scope_unlimited constraint
                created_by=user.id
            )
            db.add(invalid_enterprise)
            db.commit()
        
        # Test that personal organizations with wrong max_users fail database constraint
        with pytest.raises(Exception):  # Should raise IntegrityError due to constraint
            invalid_personal = Organization(
                name="Invalid Personal",
                scope=OrganizationScope.PERSONAL,
                max_users=5,  # This violates the personal_scope_single_user constraint
                created_by=user.id
            )
            db.add(invalid_personal)
            db.commit()
        
        # Test that negative max_users fail database constraint
        with pytest.raises(Exception):  # Should raise IntegrityError due to constraint
            negative_max_users = Organization(
                name="Negative Max Users",
                scope=OrganizationScope.SHARED,
                max_users=-1,  # This violates the positive_max_users constraint
                created_by=user.id
            )
            db.add(negative_max_users)
            db.commit()
    
    def test_organization_created_by_relationship(self, db, mailpit_disabled):
        """Test that organization creator relationship works correctly."""
        # Create a user to be the organization creator
        creator = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(creator)
        db.commit()
        db.refresh(creator)
        
        # Create organization
        org = Organization(
            name="Test Organization",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=creator.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Load organization with creator relationship
        org_with_creator = db.query(Organization).filter(
            Organization.id == org.id
        ).first()
        
        assert org_with_creator.created_by == creator.id
        # The creator_rel relationship should be available if properly configured
    
    def test_organization_domain_based_lookup(self, db, mailpit_disabled):
        """Test domain-based organization lookup functionality."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create organization with domain
        org = Organization(
            name="Example Corp",
            domain="example.com",
            scope=OrganizationScope.SHARED,
            created_by=user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Test domain lookup
        found_org = db.query(Organization).filter(
            Organization.domain == "example.com"
        ).first()
        
        assert found_org is not None
        assert found_org.name == "Example Corp"
        assert found_org.domain == "example.com"
    
    def test_organization_scope_personal_for_individual_users(self, db, mailpit_disabled):
        """Test that personal scope organizations work for individual users."""
        # Create a user to be the organization creator
        user = User(
            email="individual@example.com",
            first_name="Jane",
            last_name="Individual",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create personal organization (for individual projects)
        personal_org = Organization(
            name="Jane Individual's Personal Workspace",
            scope=OrganizationScope.PERSONAL,
            max_users=1,
            created_by=user.id
        )
        db.add(personal_org)
        db.commit()
        db.refresh(personal_org)
        
        assert personal_org.scope == OrganizationScope.PERSONAL
        assert personal_org.max_users == 1
        assert personal_org.created_by == user.id
    
    def test_organization_scope_enterprise_for_large_teams(self, db, mailpit_disabled):
        """Test that enterprise scope organizations work for large teams."""
        # Create a user to be the organization creator
        user = User(
            email="admin@bigcorp.com",
            first_name="Admin",
            last_name="User",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create enterprise organization
        enterprise_org = Organization(
            name="Big Corporation",
            domain="bigcorp.com",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None,  # Unlimited
            created_by=user.id
        )
        db.add(enterprise_org)
        db.commit()
        db.refresh(enterprise_org)
        
        assert enterprise_org.scope == OrganizationScope.ENTERPRISE
        assert enterprise_org.max_users is None  # Unlimited
        assert enterprise_org.domain == "bigcorp.com"


class TestOrganizationValidation:
    """Test cases for organization validation methods."""
    
    def test_validate_scope_and_max_users_valid(self, db, mailpit_disabled):
        """Test that valid scope and max_users combinations pass validation."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Test valid combinations
        personal_org = Organization(
            name="Personal Workspace",
            scope=OrganizationScope.PERSONAL,
            max_users=1,
            created_by=user.id
        )
        assert personal_org.validate_scope_and_max_users() == []
        
        shared_org = Organization(
            name="Shared Workspace",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=user.id
        )
        assert shared_org.validate_scope_and_max_users() == []
        
        enterprise_org = Organization(
            name="Enterprise Workspace",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None,
            created_by=user.id
        )
        assert enterprise_org.validate_scope_and_max_users() == []
    
    def test_validate_scope_and_max_users_invalid(self, db, mailpit_disabled):
        """Test that invalid scope and max_users combinations fail validation."""
        # Create a user to be the organization creator
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Test invalid combinations
        invalid_personal = Organization(
            name="Invalid Personal",
            scope=OrganizationScope.PERSONAL,
            max_users=5,  # Should be 1
            created_by=user.id
        )
        errors = invalid_personal.validate_scope_and_max_users()
        assert len(errors) == 1
        assert "Personal organizations must have exactly 1 max user" in errors[0]
        
        invalid_enterprise = Organization(
            name="Invalid Enterprise",
            scope=OrganizationScope.ENTERPRISE,
            max_users=1000,  # Should be None
            created_by=user.id
        )
        errors = invalid_enterprise.validate_scope_and_max_users()
        assert len(errors) == 1
        assert "Enterprise organizations must have unlimited users" in errors[0]


class TestOrganizationFactoryMethods:
    """Test cases for organization factory methods."""
    
    def test_create_personal_workspace(self, db, mailpit_disabled):
        """Test creating a personal workspace."""
        # Create a user
        user = User(
            email="user@example.com",
            first_name="Jane",
            last_name="Doe",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create personal workspace
        personal_org = Organization.create_personal_workspace(user.id, "Jane Doe")
        
        assert personal_org.name == "Jane Doe's Personal Workspace"
        assert personal_org.scope == OrganizationScope.PERSONAL
        assert personal_org.max_users == 1
        assert personal_org.created_by == user.id
        assert personal_org.validate_scope_and_max_users() == []
    
    def test_create_shared_workspace(self, db, mailpit_disabled):
        """Test creating a shared workspace."""
        # Create a user
        user = User(
            email="user@example.com",
            first_name="Jane",
            last_name="Doe",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create shared workspace with default max_users
        shared_org = Organization.create_shared_workspace("My Team", user.id)
        
        assert shared_org.name == "My Team"
        assert shared_org.scope == OrganizationScope.SHARED
        assert shared_org.max_users == 50  # Default
        assert shared_org.created_by == user.id
        assert shared_org.validate_scope_and_max_users() == []
        
        # Create shared workspace with custom max_users
        custom_shared_org = Organization.create_shared_workspace("Custom Team", user.id, 25)
        
        assert custom_shared_org.name == "Custom Team"
        assert custom_shared_org.scope == OrganizationScope.SHARED
        assert custom_shared_org.max_users == 25
        assert custom_shared_org.created_by == user.id
        assert custom_shared_org.validate_scope_and_max_users() == []
    
    def test_create_enterprise_workspace(self, db, mailpit_disabled):
        """Test creating an enterprise workspace."""
        # Create a user
        user = User(
            email="admin@bigcorp.com",
            first_name="Admin",
            last_name="User",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create enterprise workspace
        enterprise_org = Organization.create_enterprise_workspace("Big Corp", user.id, "bigcorp.com")
        
        assert enterprise_org.name == "Big Corp"
        assert enterprise_org.scope == OrganizationScope.ENTERPRISE
        assert enterprise_org.max_users is None  # Unlimited
        assert enterprise_org.domain == "bigcorp.com"
        assert enterprise_org.created_by == user.id
        assert enterprise_org.validate_scope_and_max_users() == []


class TestOrganizationUserCapacity:
    """Test cases for organization user capacity management."""
    
    def test_can_add_user_unlimited(self, db, mailpit_disabled):
        """Test that unlimited organizations can always add users."""
        # Create a user and organization
        user = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        org = Organization(
            name="Unlimited Org",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None,
            created_by=user.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Should always be able to add users
        assert org.can_add_user(db) == True
    
    def test_can_add_user_with_limit(self, db, mailpit_disabled):
        """Test user capacity checking for limited organizations."""
        # Create users
        creator = User(
            email="creator@example.com",
            first_name="John",
            last_name="Creator",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(creator)
        db.commit()
        db.refresh(creator)
        
        # Create organization with limit of 2
        org = Organization(
            name="Limited Org",
            scope=OrganizationScope.SHARED,
            max_users=2,
            created_by=creator.id
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Initially should be able to add users
        assert org.can_add_user(db) == True
        
        # Add one user
        user1 = User(
            email="user1@example.com",
            first_name="User",
            last_name="One",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL,
            organization_id=org.id
        )
        db.add(user1)
        db.commit()
        
        # Should still be able to add one more
        assert org.can_add_user(db) == True
        
        # Add second user
        user2 = User(
            email="user2@example.com",
            first_name="User",
            last_name="Two",
            password_hash="hash123",
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL,
            organization_id=org.id
        )
        db.add(user2)
        db.commit()
        
        # Should now be at capacity
        assert org.can_add_user(db) == False
        assert org.get_user_count(db) == 2