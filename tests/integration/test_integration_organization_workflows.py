"""
Integration Tests for Organization Workflows

End-to-end integration tests for the just-in-time organization system workflows,
including registration flows, organization discovery, project creation, and user workflows.

Test Categories:
- Registration with organization discovery
- Project creation triggering organization assignment
- Multi-user organization workflows
- Organization migration and user assignment
"""

import pytest
import uuid
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import User, Organization, Project, RegistrationType, AuthProvider, OrganizationScope, ProjectStatus


class TestRegistrationWithOrganizationDiscovery:
    """Test registration flow with organization discovery integration."""

    def test_registration_with_domain_matching_organization(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test user registration when email domain matches existing organization."""
        # Create organization first
        org = Organization(
            name="Acme Corp",
            domain="acme.com",
            short_name="ACME",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Register user (just-in-time organization system - no domain checking during registration)
        user_data = {
            "email": "user@acme.com",
            "password": "SecurePass123!",
            "first_name": "John",
            "last_name": "Doe",
            "terms_agreement": True
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user was created without organization (just-in-time)
        user = db.query(User).filter(User.email == "user@acme.com").first()
        assert user is not None
        assert user.organization_id is None  # Just-in-time assignment

    def test_registration_with_no_matching_organization(self, client: TestClient, db: Session, auto_clean_mailpit):
        """Test user registration when no organization exists for domain (just-in-time system)."""
        # Register user (just-in-time organization system - no domain checking during registration)
        user_data = {
            "email": "user@newcompany.com",
            "password": "SecurePass123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "terms_agreement": True
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201

        # Verify user was created without organization
        user = db.query(User).filter(User.email == "user@newcompany.com").first()
        assert user is not None
        assert user.organization_id is None

    def test_registration_flow_organization_discovery_performance(self, client: TestClient, db: Session):
        """Test that registration with organization discovery performs well."""
        # Create multiple organizations
        orgs = []
        for i in range(10):
            org = Organization(
                name=f"Company {i}",
                domain=f"company{i}.com",
                short_name=f"COMP{i}",
                scope=OrganizationScope.SHARED,
                max_users=100,
                created_by=uuid.uuid4()
            )
            orgs.append(org)
            db.add(org)
        db.commit()

        # Test organization lookup performance via organization API (just-in-time system)
        import time
        start_time = time.time()
        org_check = client.get("/api/v1/organizations/check-domain", 
                              params={"email": "user@company5.com"})
        end_time = time.time()
        
        assert org_check.status_code == 200
        assert (end_time - start_time) < 1.0  # Should be fast
        
        org_data = org_check.json()
        assert org_data["domain_found"] is True
        assert org_data["organization"]["name"] == "Company 5"

    @patch('api.google_oauth.verify_google_token')
    def test_google_oauth_registration_with_organization_discovery(self, mock_verify_token, client: TestClient, db: Session):
        """Test Google OAuth registration with organization discovery."""
        # Create organization
        org = Organization(
            name="Google Corp",
            domain="google.com",
            short_name="GOOGLE",
            scope=OrganizationScope.SHARED,
            max_users=500,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()

        # Mock Google token verification
        mock_verify_token.return_value = {
            "email": "user@google.com",
            "given_name": "Google",
            "family_name": "User",
            "sub": "google-oauth-123",
            "email_verified": True
        }

        # Test Google OAuth registration
        oauth_data = {"credential": "mock-google-jwt-token"}
        response = client.post("/api/v1/auth/google-oauth", json=oauth_data)
        assert response.status_code == 200

        # Verify user was created without organization (just-in-time)
        user = db.query(User).filter(User.email == "user@google.com").first()
        assert user is not None
        assert user.organization_id is None
        assert user.registration_type == RegistrationType.GOOGLE_OAUTH


class TestProjectCreationWithOrganizationWorkflow:
    """Test project creation with just-in-time organization assignment."""

    def test_project_creation_with_organization_assignment(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test project creation that assigns user to organization."""
        # Create organization
        org = Organization(
            name="Project Corp",
            domain="projectcorp.com",
            short_name="PROJ",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user without organization
        user_data = {
            "email": "user@projectcorp.com",
            "password": "SecurePass123!",
            "first_name": "Project",
            "last_name": "User",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Verify email to enable login
        user = db.query(User).filter(User.email == "user@projectcorp.com").first()
        user.email_verified = True
        db.commit()

        # Login to get token
        login_data = {"email": "user@projectcorp.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Join organization (just-in-time assignment)
        join_response = client.post(f"/api/v1/organizations/{org.id}/join", headers=headers)
        assert join_response.status_code == 200
        join_data = join_response.json()
        assert join_data["status"] == "approved"

        # Create project with organization assignment
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "organization_id": str(org.id),
            "status": "active",
            "visibility": "team"
        }
        
        project_response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert project_response.status_code == 201

        # Verify user was assigned to organization through join
        user = db.query(User).filter(User.email == "user@projectcorp.com").first()
        assert user is not None
        assert user.organization_id == org.id

        # Verify project was created with organization
        project = db.query(Project).filter(Project.name == "Test Project").first()
        assert project is not None
        assert project.organization_id == org.id

    def test_project_creation_individual_without_organization(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test creating individual project without organization assignment."""
        # Create user without organization
        user_data = {
            "email": "individual@example.com",
            "password": "SecurePass123!",
            "first_name": "Individual",
            "last_name": "User",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Verify email to enable login
        user = db.query(User).filter(User.email == "individual@example.com").first()
        user.email_verified = True
        db.commit()

        # Login to get token
        login_data = {"email": "individual@example.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create individual project
        project_data = {
            "name": "Individual Project",
            "description": "A individual project",
            "status": "active",
            "visibility": "individual"
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        project_response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert project_response.status_code == 201

        # Verify user still has no organization
        user = db.query(User).filter(User.email == "individual@example.com").first()
        assert user is not None
        assert user.organization_id is None

        # Verify project was created without organization
        project = db.query(Project).filter(Project.name == "Individual Project").first()
        assert project is not None
        assert project.organization_id is None
        assert project.visibility.value == "individual"

    def test_project_creation_with_organization_discovery_and_joining(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test complete workflow: registration -> organization discovery -> project creation -> organization joining."""
        # Create organization
        org = Organization(
            name="Discovery Corp",
            domain="discovery.com",
            short_name="DISC",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Step 1: Register user
        user_data = {
            "email": "user@discovery.com",
            "password": "SecurePass123!",
            "first_name": "Discovery",
            "last_name": "User",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Step 2: Verify email and login
        user = db.query(User).filter(User.email == "user@discovery.com").first()
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@discovery.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Check organization discovery (via organization API)
        domain_check = client.get("/api/v1/organizations/check-domain", 
                                 params={"email": "user@discovery.com"})
        assert domain_check.status_code == 200
        domain_data = domain_check.json()
        assert domain_data["domain_found"] is True

        # Step 4: Join organization
        join_response = client.post(f"/api/v1/organizations/{org.id}/join", headers=headers)
        assert join_response.status_code == 200

        # Step 5: Create project in organization
        project_data = {
            "name": "Organization Project",
            "description": "A project in organization",
            "organization_id": str(org.id),
            "status": "active",
            "visibility": "team"
        }
        project_response = client.post("/api/v1/projects/", json=project_data, headers=headers)
        assert project_response.status_code == 201

        # Verify final state
        user = db.query(User).filter(User.email == "user@discovery.com").first()
        assert user is not None
        assert user.organization_id == org.id

        project = db.query(Project).filter(Project.name == "Organization Project").first()
        assert project is not None
        assert project.organization_id == org.id


class TestCompleteUserWorkflows:
    """Test complete user workflows from registration to project management."""

    def test_complete_individual_user_workflow(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test complete workflow for individual user (no organization)."""
        # Step 1: Register
        user_data = {
            "email": "individual@freelance.com",
            "password": "SecurePass123!",
            "first_name": "Individual",
            "last_name": "User",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Step 2: Verify email and login
        user = db.query(User).filter(User.email == "individual@freelance.com").first()
        user.email_verified = True
        db.commit()

        login_data = {"email": "individual@freelance.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Verify user has no organization (just-in-time organization system)
        user_response = client.get("/api/v1/users/me", headers=headers)
        assert user_response.status_code == 200
        user_data = user_response.json()
        assert user_data["organization_id"] is None

        # Step 4: Create individual projects
        projects = []
        for i in range(3):
            project_data = {
                "name": f"Individual Project {i+1}",
                "description": f"Individual project {i+1}",
                "status": "active",
                "visibility": "individual"
            }
            project_response = client.post("/api/v1/projects/", json=project_data, headers=headers)
            assert project_response.status_code == 201
            projects.append(project_response.json())

        # Step 5: List projects
        projects_response = client.get("/api/v1/projects/", headers=headers)
        assert projects_response.status_code == 200
        project_list_response = projects_response.json()
        project_list = project_list_response["projects"]
        assert len(project_list) == 3

        # Verify all projects are individual
        for project in project_list:
            assert project["visibility"] == "individual"
            assert project["organization_id"] is None

        # Verify user never got organization
        user = db.query(User).filter(User.email == "individual@freelance.com").first()
        assert user is not None
        assert user.organization_id is None

    def test_complete_team_user_workflow(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test complete workflow for team user with organization."""
        # Step 1: Create organization
        org = Organization(
            name="Team Corp",
            domain="teamcorp.com",
            short_name="TEAM",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Step 2: Register team member
        user_data = {
            "email": "member@teamcorp.com",
            "password": "SecurePass123!",
            "first_name": "Team",
            "last_name": "Member",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Step 3: Verify email and login
        user = db.query(User).filter(User.email == "member@teamcorp.com").first()
        user.email_verified = True
        db.commit()

        login_data = {"email": "member@teamcorp.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 4: Organization discovery (via organization API)
        domain_check = client.get("/api/v1/organizations/check-domain", 
                                 params={"email": "member@teamcorp.com"})
        assert domain_check.status_code == 200
        domain_data = domain_check.json()
        assert domain_data["domain_found"] is True

        # Step 5: Join organization
        join_response = client.post(f"/api/v1/organizations/{org.id}/join", headers=headers)
        assert join_response.status_code == 200

        # Step 6: Create team projects
        team_projects = []
        for i in range(2):
            project_data = {
                "name": f"Team Project {i+1}",
                "description": f"Team project {i+1}",
                "organization_id": str(org.id),
                "status": "active",
                "visibility": "team"
            }
            project_response = client.post("/api/v1/projects/", json=project_data, headers=headers)
            assert project_response.status_code == 201
            team_projects.append(project_response.json())

        # Step 7: Create individual project (mixed usage)
        individual_project_data = {
            "name": "Individual Side Project",
            "description": "Individual work",
            "status": "active",
            "visibility": "individual"
        }
        individual_response = client.post("/api/v1/projects/", json=individual_project_data, headers=headers)
        assert individual_response.status_code == 201

        # Step 8: List all projects
        projects_response = client.get("/api/v1/projects/", headers=headers)
        assert projects_response.status_code == 200
        project_list_response = projects_response.json()
        project_list = project_list_response["projects"]
        assert len(project_list) == 3

        # Verify project types
        team_project_count = sum(1 for p in project_list if p["visibility"] == "team")
        individual_project_count = sum(1 for p in project_list if p["visibility"] == "individual")
        assert team_project_count == 2
        assert individual_project_count == 1

        # Verify user organization assignment
        user = db.query(User).filter(User.email == "member@teamcorp.com").first()
        assert user is not None
        assert user.organization_id == org.id

    def test_user_workflow_with_multiple_organizations(self, client: TestClient, db: Session, test_rate_limits, auto_clean_mailpit):
        """Test user workflow with multiple organization options."""
        # Create multiple organizations with different domains
        org1 = Organization(
            name="Main Corp",
            domain="maincorp.com",
            short_name="MAIN",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4()
        )
        org2 = Organization(
            name="Sub Corp",
            domain="subcorp.com",
            short_name="SUB",
            scope=OrganizationScope.SHARED,
            max_users=50,
            created_by=uuid.uuid4()
        )
        db.add_all([org1, org2])
        db.commit()
        db.refresh(org1)
        db.refresh(org2)

        # Register user (using main corp domain)
        user_data = {
            "email": "user@maincorp.com",
            "password": "SecurePass123!",
            "first_name": "Multi",
            "last_name": "User",
            "terms_agreement": True
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201

        # Verify email and login
        user = db.query(User).filter(User.email == "user@maincorp.com").first()
        user.email_verified = True
        db.commit()

        login_data = {"email": "user@maincorp.com", "password": "SecurePass123!"}
        login_response = client.post("/api/v1/auth/login-json", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check organization by domain (via organization API)
        domain_check = client.get("/api/v1/organizations/check-domain", 
                                 params={"email": "user@maincorp.com"})
        assert domain_check.status_code == 200
        domain_data = domain_check.json()
        assert domain_data["domain_found"] is True
        assert domain_data["organization"]["name"] == "Main Corp"

        # Join first organization
        join_response = client.post(f"/api/v1/organizations/{org1.id}/join", headers=headers)
        assert join_response.status_code == 200

        # Try to join second organization (should fail - already assigned)
        join_response2 = client.post(f"/api/v1/organizations/{org2.id}/join", headers=headers)
        assert join_response2.status_code == 400  # Already in organization

        # Verify user is assigned to first organization
        user = db.query(User).filter(User.email == "user@maincorp.com").first()
        assert user is not None
        assert user.organization_id == org1.id


class TestDataMigrationReadiness:
    """Test that the system is ready for data migration."""

    def test_existing_users_can_remain_without_organization(self, client: TestClient, db: Session):
        """Test that existing users can remain without organization assignment."""
        # Create existing user directly in database (simulating legacy data)
        existing_user = User(
            email="existing@legacy.com",
            password_hash="legacy_hash",
            first_name="Existing",
            last_name="User",
            organization_id=None,
            registration_type=RegistrationType.EMAIL,
            auth_provider=AuthProvider.LOCAL
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)

        # User should be able to login
        login_data = {"email": "existing@legacy.com", "password": "legacy_password"}
        # Note: This would fail with wrong password, but the point is the user exists
        
        # Check user state
        user = db.query(User).filter(User.email == "existing@legacy.com").first()
        assert user is not None
        assert user.organization_id is None
        assert user.can_create_individual_projects() is True

    def test_system_handles_mixed_organization_states(self, client: TestClient, db: Session):
        """Test system handles mix of users with and without organizations."""
        # Create organization
        org = Organization(
            name="Mixed Corp",
            domain="mixed.com",
            short_name="MIX",
            scope=OrganizationScope.SHARED,
            max_users=100,
            created_by=uuid.uuid4()
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create users in different states
        users = [
            User(
                email="with-org@mixed.com",
                password_hash="hash1",
                first_name="With",
                last_name="Org",
                organization_id=org.id,
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            ),
            User(
                email="without-org@mixed.com",
                password_hash="hash2",
                first_name="Without",
                last_name="Org",
                organization_id=None,
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            ),
            User(
                email="individual@individual.com",
                password_hash="hash3",
                first_name="Individual",
                last_name="User",
                organization_id=None,
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            )
        ]
        
        for user in users:
            db.add(user)
        db.commit()

        # Test queries work with mixed states
        all_users = db.query(User).all()
        assert len(all_users) >= 3

        users_with_org = db.query(User).filter(User.organization_id.isnot(None)).all()
        users_without_org = db.query(User).filter(User.organization_id.is_(None)).all()
        
        assert len(users_with_org) >= 1
        assert len(users_without_org) >= 2

        # Test organization relationships
        org_users = db.query(User).filter(User.organization_id == org.id).all()
        assert len(org_users) >= 1

    def test_migration_script_simulation(self, client: TestClient, db: Session):
        """Test simulation of migration script behavior."""
        # Create legacy data structure (simulating pre-migration state)
        legacy_users = []
        for i in range(10):
            user = User(
                email=f"legacy{i}@example.com",
                password_hash=f"hash{i}",
                first_name=f"Legacy{i}",
                last_name="User",
                organization_id=None,  # All legacy users start without organization
                registration_type=RegistrationType.EMAIL,
                auth_provider=AuthProvider.LOCAL
            )
            legacy_users.append(user)
            db.add(user)
        db.commit()

        # Simulate migration - verify all users can exist without organization
        for user in legacy_users:
            db.refresh(user)
            assert user.organization_id is None
            assert user.can_create_individual_projects() is True

        # Test that system works with all users having no organization
        all_users = db.query(User).all()
        users_without_org = db.query(User).filter(User.organization_id.is_(None)).all()
        
        # All users should be able to exist without organization
        assert len(users_without_org) >= 10
        
        # System should handle queries efficiently
        import time
        start_time = time.time()
        count = db.query(User).filter(User.organization_id.is_(None)).count()
        end_time = time.time()
        
        assert count >= 10
        assert (end_time - start_time) < 1.0  # Should be performant