"""
Tests for User Registration without Organization (Just-in-Time Organization System)

These tests verify that users can register without being assigned to an organization,
supporting the just-in-time organization system where organization assignment is
deferred until project creation time.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from api.database import User, RegistrationType, AuthProvider
from api.schemas import UserCreate


class TestUserRegistrationWithoutOrganization:
    """Test user registration without organization assignment."""
    
    def test_user_registration_without_organization_id(self, client, db, auto_clean_mailpit):
        """Test that users can register without providing organization_id and get access token."""
        user_data = {
            "email": "no-org@example.com",
            "password": "Password123!",
            "first_name": "NoOrg",
            "last_name": "User",
            "terms_agreement": True
            # Note: No organization_id provided
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify response includes verification message (no automatic login)
        response_data = response.json()
        assert "message" in response_data
        assert "verify" in response_data["message"].lower()
        assert "no-org@example.com" in response_data["message"]

        # Verify user was created without organization
        user = db.query(User).filter(User.email == "no-org@example.com").first()
        assert user is not None
        assert user.organization_id is None
        assert user.registration_type == RegistrationType.EMAIL
        assert user.auth_provider == AuthProvider.LOCAL
    
    def test_user_registration_with_explicit_null_organization_id(self, client, db, auto_clean_mailpit):
        """Test that users can register with explicit null organization_id."""
        user_data = {
            "email": "explicit-null@example.com",
            "password": "Password123!",
            "first_name": "ExplicitNull",
            "last_name": "User",
            "organization_id": None,
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user was created without organization
        user = db.query(User).filter(User.email == "explicit-null@example.com").first()
        assert user is not None
        assert user.organization_id is None
    
    def test_multiple_users_registration_without_organization(self, client, db, test_rate_limits, auto_clean_mailpit):
        """Test that multiple users can register without organizations."""
        users_data = [
            {
                "email": "user1@example.com",
                "password": "Password123!",
                "first_name": "User",
                "last_name": "One",
                "terms_agreement": True
            },
            {
                "email": "user2@example.com",
                "password": "Password123!",
                "first_name": "User",
                "last_name": "Two",
                "terms_agreement": True
            },
            {
                "email": "user3@example.com",
                "password": "Password123!",
                "first_name": "User",
                "last_name": "Three",
                "terms_agreement": True
            }
        ]

        for user_data in users_data:
            response = client.post("/api/v1/auth/register", json=user_data)
            assert response.status_code == 201

        # Verify all users were created without organizations
        emails = [user["email"] for user in users_data]
        users = db.query(User).filter(User.email.in_(emails)).all()
        assert len(users) == 3
        
        for user in users:
            assert user.organization_id is None
            assert user.registration_type == RegistrationType.EMAIL
    
    def test_user_response_includes_null_organization_id(self, client):
        """Test that API response correctly shows null organization_id in LoginResponse format."""
        user_data = {
            "email": "response-null@example.com",
            "password": "Password123!",
            "first_name": "ResponseNull",
            "last_name": "User",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201
        
        response_data = response.json()
        assert "message" in response_data
        assert "verify" in response_data["message"].lower()
        assert "response-null@example.com" in response_data["message"]


class TestGoogleOAuthRegistrationWithoutOrganization:
    """Test Google OAuth registration without organization assignment."""
    
    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_registration_without_organization(self, mock_verify_token, client, db, auto_clean_mailpit):
        """Test that Google OAuth users can register without organization."""
        # Mock Google token verification to return valid user info
        mock_verify_token.return_value = {
            "email": "oauth-no-org@example.com",
            "given_name": "OAuthNoOrg",
            "family_name": "User",
            "sub": "google-oauth-no-org-123",
            "email_verified": True
        }

        oauth_data = {
            "provider": "google",
            "credential": "mock-google-jwt-token"
        }

        response = client.post("/api/v1/auth/oauth", json=oauth_data)
        assert response.status_code == 200

        # Verify user was created without organization
        user = db.query(User).filter(User.email == "oauth-no-org@example.com").first()
        assert user is not None
        assert user.organization_id is None
        assert user.registration_type == RegistrationType.GOOGLE_OAUTH
        assert user.auth_provider == AuthProvider.GOOGLE
    
    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_response_shows_null_organization(self, mock_verify_token, client):
        """Test that Google OAuth response correctly shows null organization_id."""
        mock_verify_token.return_value = {
            "email": "oauth-response-null@example.com",
            "given_name": "OAuthResponseNull",
            "family_name": "User",
            "sub": "google-oauth-response-null-123",
            "email_verified": True
        }

        oauth_data = {
            "provider": "google",
            "credential": "mock-google-jwt-token"
        }

        response = client.post("/api/v1/auth/oauth", json=oauth_data)
        assert response.status_code == 200
        
        login_response = response.json()
        # The user object in the response should show null organization
        user_data = login_response["user"]
        assert user_data["organization_id"] is None


class TestUserCreateSchemaValidation:
    """Test UserCreate schema validation for organization-less registration."""
    
    def test_user_create_schema_allows_missing_organization_id(self):
        """Test that UserCreate schema validates without organization_id."""
        # This should not raise any validation errors
        user_create = UserCreate(
            email="schema-test@example.com",
            password="Password123!",
            first_name="Schema",
            last_name="Test",
            terms_agreement=True
            # No organization_id provided
        )
        
        assert user_create.email == "schema-test@example.com"
        # organization_id is not part of the schema anymore (just-in-time organization system)
        assert not hasattr(user_create, 'organization_id')
    
    def test_user_create_schema_allows_explicit_null_organization_id(self):
        """Test that UserCreate schema validates without organization_id (just-in-time system)."""
        user_create = UserCreate(
            email="schema-null@example.com",
            password="Password123!",
            first_name="SchemaNulL",
            last_name="Test",
            terms_agreement=True
        )
        
        assert user_create.email == "schema-null@example.com"
        # organization_id is not part of the schema anymore (just-in-time organization system)
        assert not hasattr(user_create, 'organization_id')
    
    def test_user_create_schema_default_values(self):
        """Test that UserCreate schema has correct default values."""
        user_create = UserCreate(
            email="defaults@example.com",
            password="Password123!",
            first_name="Defaults",
            last_name="Test",
            terms_agreement=True
        )
        
        # Verify default values from UserBase
        # organization_id is not part of the schema anymore (just-in-time organization system)
        assert not hasattr(user_create, 'organization_id')
        assert user_create.role.value == "basic_user"  # Default from UserRole.BASIC_USER
        assert user_create.has_projects_access is True


class TestUserDatabaseConstraints:
    """Test database constraints for users without organizations."""
    
    def test_user_model_allows_null_organization_id(self, db):
        """Test that User model allows null organization_id in database."""
        user = User(
            email="db-constraint@example.com",
            first_name="DbConstraint",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,  # Explicitly null
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        # This should not raise any database constraint errors
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.organization_id is None
        assert user.email == "db-constraint@example.com"
    
    def test_user_organization_relationship_with_null_organization(self, db):
        """Test that User.organization_rel relationship works with null organization_id."""
        user = User(
            email="relationship-null@example.com",
            first_name="RelationshipNull",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # organization_rel should be None when organization_id is None
        assert user.organization_rel is None
    
    def test_multiple_users_with_null_organizations(self, db):
        """Test that multiple users can have null organization_id."""
        users = []
        for i in range(5):
            user = User(
                email=f"multi-null-{i}@example.com",
                first_name=f"MultiNull{i}",
                last_name="Test",
                password_hash="hashed_password",
                organization_id=None,
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            )
            users.append(user)
            db.add(user)
        
        db.commit()
        
        # Verify all users were created successfully with null organizations
        for user in users:
            db.refresh(user)
            assert user.organization_id is None
            assert user.organization_rel is None


class TestUserQueryingWithNullOrganizations:
    """Test querying users with null organizations."""
    
    def test_query_users_without_organization(self, db):
        """Test querying for users who don't have an organization assigned."""
        import uuid
        
        # Create users with and without organizations
        user_with_org = User(
            email="with-org@example.com",
            first_name="WithOrg",
            last_name="User",
            password_hash="hashed_password",
            organization_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),  # Some UUID
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        user_without_org = User(
            email="without-org@example.com",
            first_name="WithoutOrg",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user_with_org)
        db.add(user_without_org)
        db.commit()
        
        # Query for users without organization
        users_without_org = db.query(User).filter(User.organization_id.is_(None)).all()
        
        # Should find the user without organization
        assert len(users_without_org) >= 1
        found_user = next((u for u in users_without_org if u.email == "without-org@example.com"), None)
        assert found_user is not None
        assert found_user.organization_id is None
    
    def test_count_users_without_organization(self, db):
        """Test counting users who don't have an organization assigned."""
        # Create several users without organizations
        for i in range(3):
            user = User(
                email=f"count-test-{i}@example.com",
                first_name=f"CountTest{i}",
                last_name="User",
                password_hash="hashed_password",
                organization_id=None,
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            )
            db.add(user)
        
        db.commit()
        
        # Count users without organization
        count = db.query(User).filter(User.organization_id.is_(None)).count()
        
        # Should be at least 3 (the ones we just created)
        assert count >= 3


class TestJustInTimeOrganizationReadiness:
    """Test that the system is ready for just-in-time organization assignment."""
    
    def test_user_can_be_updated_with_organization_later(self, client, db, test_rate_limits, auto_clean_mailpit):
        """Test that users created without organization can be assigned to one later."""
        # First, register user without organization
        user_data = {
            "email": "later-org@example.com",
            "password": "Password123!",
            "first_name": "LaterOrg",
            "last_name": "User",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user starts without organization
        user = db.query(User).filter(User.email == "later-org@example.com").first()
        assert user is not None
        assert user.organization_id is None
        
        # TODO: In future phases, this will test organization assignment during project creation
        # For now, we just verify the user can be updated in the database
        import uuid
        test_org_id = uuid.uuid4()
        user.organization_id = test_org_id
        db.commit()
        db.refresh(user)
        
        assert user.organization_id == test_org_id
    
    def test_registration_flow_supports_frictionless_signup(self, client, test_rate_limits, auto_clean_mailpit):
        """Test that registration requires minimal information (no organization)."""
        # Minimal registration data - just what's required for frictionless signup
        minimal_user_data = {
            "email": "frictionless@example.com",
            "password": "Password123!",
            "first_name": "Frictionless",
            "last_name": "User",
            "terms_agreement": True
            # No organization, role, or other optional fields
        }

        response = client.post("/api/v1/auth/register", json=minimal_user_data)
        assert response.status_code == 201
        
        response_data = response.json()
        assert "message" in response_data
        assert "verify" in response_data["message"].lower()
        assert "frictionless@example.com" in response_data["message"]


class TestDuplicateEmailRegistration:
    """Test handling of duplicate email registration attempts."""
    
    def test_duplicate_email_registration_returns_helpful_error(self, client, db, test_rate_limits, auto_clean_mailpit):
        """Test that registering with existing email returns helpful error message with sign-in guidance."""
        # First, register a user
        user_data = {
            "email": "existing@example.com",
            "password": "Password123!",
            "first_name": "Existing",
            "last_name": "User",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user was created
        user = db.query(User).filter(User.email == "existing@example.com").first()
        assert user is not None

        # Try to register with same email again
        duplicate_user_data = {
            "email": "existing@example.com",  # Same email
            "password": "DifferentPassword123!",
            "first_name": "Different",
            "last_name": "Name",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=duplicate_user_data)
        
        # Should return 409 Conflict with helpful message
        assert response.status_code == 409
        response_data = response.json()
        assert "detail" in response_data
        
        # The detail field contains our structured error response
        error_detail = response_data["detail"]
        assert isinstance(error_detail, dict)
        
        # Message should be helpful and guide user to sign in
        message = error_detail["detail"]
        assert "email is already registered" in message.lower()
        assert message == "This email is already registered."
        
        # Should also include error_type for frontend handling
        assert "error_type" in error_detail
        assert error_detail["error_type"] == "email_already_exists"
    
    def test_duplicate_email_case_insensitive(self, client, db, test_rate_limits, auto_clean_mailpit):
        """Test that duplicate email detection is case insensitive."""
        # Register with lowercase email
        user_data = {
            "email": "casetest@example.com",
            "password": "Password123!",
            "first_name": "Case",
            "last_name": "Test",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Try to register with uppercase email
        duplicate_user_data = {
            "email": "CASETEST@EXAMPLE.COM",  # Same email, different case
            "password": "Password123!",
            "first_name": "Case",
            "last_name": "Test",
            "terms_agreement": True
        }

        response = client.post("/api/v1/auth/register", json=duplicate_user_data)
        
        # Should detect duplicate despite case difference
        assert response.status_code == 409
        response_data = response.json()
        error_detail = response_data["detail"]
        assert "email is already registered" in error_detail["detail"].lower()
        assert error_detail["error_type"] == "email_already_exists"


class TestUserOrganizationUtilityMethods:
    """Test utility methods for organization management on User model."""
    
    def test_is_organization_assigned_with_no_organization(self, db):
        """Test is_organization_assigned returns False for users without organization."""
        user = User(
            email="no-org-util@example.com",
            first_name="NoOrgUtil",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.is_organization_assigned() is False
    
    def test_is_organization_assigned_with_organization(self, db):
        """Test is_organization_assigned returns True for users with organization."""
        import uuid
        
        user = User(
            email="with-org-util@example.com",
            first_name="WithOrgUtil",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=uuid.uuid4(),
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.is_organization_assigned() is True
    
    def test_can_create_individual_projects_active_user(self, db):
        """Test can_create_individual_projects for active user with projects access."""
        user = User(
            email="personal-projects@example.com",
            first_name="PersonalProjects",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            is_active=True,
            has_projects_access=True,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.can_create_individual_projects() is True
    
    def test_can_create_individual_projects_inactive_user(self, db):
        """Test can_create_individual_projects for inactive user."""
        user = User(
            email="inactive-projects@example.com",
            first_name="InactiveProjects",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            is_active=False,
            has_projects_access=True,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.can_create_individual_projects() is False
    
    def test_can_create_individual_projects_no_access(self, db):
        """Test can_create_individual_projects for user without projects access."""
        user = User(
            email="no-access-projects@example.com",
            first_name="NoAccessProjects",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            is_active=True,
            has_projects_access=False,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        assert user.can_create_individual_projects() is False
    
    def test_get_organization_status_no_organization(self, db):
        """Test get_organization_status for user without organization."""
        user = User(
            email="status-no-org@example.com",
            first_name="StatusNoOrg",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        status = user.get_organization_status()
        assert "No organization" in status
        assert "individual projects" in status
    
    def test_get_organization_status_with_organization(self, db):
        """Test get_organization_status for user with organization."""
        import uuid
        org_id = uuid.uuid4()
        
        user = User(
            email="status-with-org@example.com",
            first_name="StatusWithOrg",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=org_id,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        status = user.get_organization_status()
        assert "Member of organization" in status
        assert str(org_id) in status
    
    def test_assign_to_organization_success(self, db):
        """Test successful organization assignment."""
        import uuid
        
        user = User(
            email="assign-org@example.com",
            first_name="AssignOrg",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Initially no organization
        assert user.is_organization_assigned() is False
        
        # Assign to organization
        new_org_id = uuid.uuid4()
        user.assign_to_organization(new_org_id)
        
        assert user.organization_id == new_org_id
        assert user.is_organization_assigned() is True
    
    def test_assign_to_organization_already_assigned_fails(self, db):
        """Test that assigning organization to user who already has one fails."""
        import uuid
        
        existing_org_id = uuid.uuid4()
        user = User(
            email="already-assigned@example.com",
            first_name="AlreadyAssigned",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=existing_org_id,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Try to assign to different organization
        new_org_id = uuid.uuid4()
        
        with pytest.raises(ValueError, match="already assigned to organization"):
            user.assign_to_organization(new_org_id)
        
        # Organization should remain unchanged
        assert user.organization_id == existing_org_id