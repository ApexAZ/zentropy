"""
Tests for Project API Endpoints (Just-in-Time Organization System)

These tests verify the Project API endpoints that support the just-in-time
organization system where project creation drives organization assignment
decisions and enables frictionless project workflows.
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch

from api.database import Project, User, Organization, OrganizationScope, ProjectVisibility, ProjectStatus, UserRole
from api.schemas import ProjectCreate, ProjectResponse


class TestProjectCreationAPI:
    """Test project creation API with organization decision workflow."""
    
    def test_create_individual_project_without_organization(self, client, auth_headers, db, current_user):
        """Test creating individual project without organization assignment."""
        # Ensure user has no organization
        current_user.organization_id = None
        db.commit()
        
        project_data = {
            "name": "Individual Project",
            "description": "A individual project for testing",
            "visibility": "individual"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Individual Project"
        assert data["description"] == "A individual project for testing"
        assert data["visibility"] == "individual"
        assert data["organization_id"] is None
        assert data["created_by"] == str(current_user.id)
        assert data["status"] == "active"
        assert "id" in data
        assert "created_at" in data
    
    def test_create_team_project_with_organization(self, client, auth_headers, db, current_user):
        """Test creating team project with organization assignment."""
        # Create organization and assign user
        org = Organization(
            name="Team Project Org",
            domain="teamproject.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        current_user.organization_id = org.id
        db.commit()
        
        project_data = {
            "name": "Team Project",
            "description": "A team project for testing",
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Team Project"
        assert data["visibility"] == "team"
        assert data["organization_id"] == str(org.id)
        assert data["created_by"] == str(current_user.id)
    
    def test_create_organization_project_enterprise_scope(self, client, auth_headers, db, current_user):
        """Test creating organization-wide project in enterprise scope."""
        # Create enterprise organization
        org = Organization(
            name="Enterprise Corp",
            domain="enterprise.com",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        current_user.organization_id = org.id
        db.commit()
        
        project_data = {
            "name": "Enterprise Project",
            "description": "An organization-wide project",
            "visibility": "organization",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Enterprise Project"
        assert data["visibility"] == "organization"
        assert data["organization_id"] == str(org.id)
    
    def test_create_project_validation_errors(self, client, auth_headers):
        """Test project creation validation errors."""
        # Missing required fields
        response = client.post(
            "/api/v1/projects/",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid visibility
        response = client.post(
            "/api/v1/projects/",
            json={
                "name": "Invalid Visibility Project",
                "visibility": "invalid_visibility"
            },
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Team project without organization
        response = client.post(
            "/api/v1/projects/",
            json={
                "name": "Team Project No Org",
                "visibility": "team"
                # Missing organization_id
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "organization" in response.json()["detail"].lower()


class TestProjectJustInTimeOrganizationWorkflow:
    """Test project creation workflows that trigger organization decisions."""
    
    def test_individual_to_team_project_upgrade_workflow(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test upgrading individual project to team project with organization creation."""
        # Start with user without organization
        current_user.organization_id = None
        db.commit()
        
        # Step 1: Create individual project
        individual_project_data = {
            "name": "Individual Project to Upgrade",
            "description": "Will be upgraded to team project",
            "visibility": "individual"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=individual_project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        project_id = response.json()["id"]
        
        # Step 2: User decides to collaborate, needs organization
        # First, create organization
        org_data = {
            "name": "Collaboration Org",
            "domain": "collab.com",
            "scope": "shared",
            "max_users": 50
        }
        
        org_response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert org_response.status_code == 201
        org_id = org_response.json()["id"]
        
        # Step 3: Update project to team visibility with organization
        update_data = {
            "visibility": "team",
            "organization_id": org_id
        }
        
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["visibility"] == "team"
        assert data["organization_id"] == org_id
    
    def test_project_creation_with_organization_suggestion(self, client, auth_headers, db, test_rate_limits):
        """Test project creation with organization domain suggestion workflow."""
        # Step 1: Check if organization exists for user's email domain
        domain_response = client.get(
            "/api/v1/organizations/check-domain?email=teamlead@newcompany.com"
        )
        assert domain_response.status_code == 200
        
        domain_data = domain_response.json()
        
        if not domain_data["domain_found"]:
            # Step 2: Create organization based on domain suggestion
            org_data = {
                "name": domain_data["suggestions"]["suggested_name"].title() + " Inc",
                "domain": domain_data["domain"],
                "scope": "shared",
                "max_users": 100
            }
            
            org_response = client.post(
                "/api/v1/organizations/",
                json=org_data,
                headers=auth_headers
            )
            assert org_response.status_code == 201
            org_id = org_response.json()["id"]
        else:
            org_id = domain_data["organization"]["id"]
        
        # Step 3: Create team project with organization
        project_data = {
            "name": "Team Project with Suggested Org",
            "description": "Project created with organization suggestion",
            "visibility": "team",
            "organization_id": org_id
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["organization_id"] == org_id
        assert data["visibility"] == "team"
    
    def test_project_creation_triggers_user_organization_assignment(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test that project creation can trigger user organization assignment."""
        # Create organization
        org = Organization(
            name="Assignment Test Org",
            domain="assignment.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # User starts without organization
        current_user.organization_id = None
        db.commit()
        assert current_user.is_organization_assigned() is False
        
        # Create team project that requires organization
        project_data = {
            "name": "Assignment Project",
            "description": "Project that triggers user assignment",
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        # Verify project creation and user assignment
        data = response.json()
        assert data["organization_id"] == str(org.id)
        
        # In a real implementation, this might trigger automatic user assignment
        # For now, we verify the project was created successfully
        # User assignment would happen through separate join workflow


class TestProjectCRUDAPI:
    """Test project CRUD API operations."""
    
    def test_get_project_by_id(self, client, auth_headers, db, current_user):
        """Test retrieving project by ID."""
        # Create project
        project = Project(
            name="Get Test Project",
            description="Project for get testing",
            created_by=current_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        response = client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Get Test Project"
        assert data["description"] == "Project for get testing"
        assert data["id"] == str(project.id)
        assert data["created_by"] == str(current_user.id)
    
    def test_get_project_not_found(self, client, auth_headers):
        """Test retrieving non-existent project."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/projects/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_list_projects_for_user(self, client, auth_headers, db, current_user):
        """Test listing projects for current user."""
        # Create multiple projects
        projects = []
        for i in range(3):
            project = Project(
                name=f"List Test Project {i}",
                description=f"Project {i} for list testing",
                created_by=current_user.id,
                visibility=ProjectVisibility.INDIVIDUAL,
                status=ProjectStatus.ACTIVE
            )
            projects.append(project)
            db.add(project)
        
        db.commit()
        
        response = client.get("/api/v1/projects/", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "projects" in data
        assert "total" in data
        assert len(data["projects"]) >= 3
        
        # Verify user can see their own projects
        project_names = [p["name"] for p in data["projects"]]
        for project in projects:
            assert project.name in project_names
    
    def test_list_projects_with_filters(self, client, auth_headers, db, current_user):
        """Test listing projects with status and visibility filters."""
        # Create projects with different statuses and visibilities
        active_project = Project(
            name="Active Project",
            created_by=current_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        archived_project = Project(
            name="Archived Project",
            created_by=current_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ARCHIVED
        )
        
        db.add(active_project)
        db.add(archived_project)
        db.commit()
        
        # Filter by status
        response = client.get("/api/v1/projects/?status=active", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        active_projects = [p for p in data["projects"] if p["name"] in ["Active Project", "Archived Project"]]
        assert len(active_projects) == 1
        assert active_projects[0]["name"] == "Active Project"
        
        # Filter by visibility
        response = client.get("/api/v1/projects/?visibility=individual", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        individual_projects = [p for p in data["projects"] if p["visibility"] == "individual"]
        assert len(individual_projects) >= 2
    
    def test_update_project(self, client, auth_headers, db, current_user):
        """Test updating project information."""
        # Create project
        project = Project(
            name="Update Test Project",
            description="Original description",
            created_by=current_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Update project
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description",
            "status": "completed"
        }
        
        response = client.put(
            f"/api/v1/projects/{project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Project Name"
        assert data["description"] == "Updated description"
        assert data["status"] == "completed"
        assert data["visibility"] == "individual"  # Should remain unchanged
    
    def test_delete_project(self, client, auth_headers, db, current_user):
        """Test deleting project."""
        # Create project
        project = Project(
            name="Delete Test Project",
            created_by=current_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Delete project
        response = client.delete(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "deleted successfully" in data["message"]
        
        # Verify project is deleted
        response = client.get(f"/api/v1/projects/{project.id}", headers=auth_headers)
        assert response.status_code == 404


class TestProjectAccessControlAPI:
    """Test project access control and permissions."""
    
    def test_project_access_individual_visibility(self, client, auth_headers, db, current_user):
        """Test access control for individual projects."""
        # Create another user
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        # Create individual project by other user
        other_project = Project(
            name="Other User's Individual Project",
            created_by=other_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(other_project)
        db.commit()
        db.refresh(other_project)
        
        # Current user should not see other user's individual project
        response = client.get(f"/api/v1/projects/{other_project.id}", headers=auth_headers)
        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()
    
    def test_project_access_team_visibility(self, client, auth_headers, db, current_user):
        """Test access control for team projects."""
        # Create organization
        org = Organization(
            name="Team Access Org",
            domain="teamaccess.com",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # Create team member in same organization
        team_member = User(
            email="teammember@teamaccess.com",
            first_name="Team",
            last_name="Member",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(team_member)
        db.commit()
        db.refresh(team_member)
        
        # Assign current user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Create team project
        team_project = Project(
            name="Team Project",
            created_by=team_member.id,
            organization_id=org.id,
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.ACTIVE
        )
        db.add(team_project)
        db.commit()
        db.refresh(team_project)
        
        # Current user should see team project (same organization)
        response = client.get(f"/api/v1/projects/{team_project.id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Team Project"
        assert data["visibility"] == "team"
    
    def test_project_modification_requires_ownership(self, client, auth_headers, db, current_user):
        """Test that project modification requires ownership."""
        # Create another user
        other_user = User(
            email="projectowner@example.com",
            first_name="Project",
            last_name="Owner",
            password_hash="hashed_password"
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        # Create project owned by other user
        other_project = Project(
            name="Other User's Project",
            created_by=other_user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(other_project)
        db.commit()
        db.refresh(other_project)
        
        # Current user should not be able to modify
        update_data = {"name": "Unauthorized Update"}
        
        response = client.put(
            f"/api/v1/projects/{other_project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"].lower()


class TestProjectAPIAuthentication:
    """Test project API authentication requirements."""
    
    def test_project_endpoints_require_authentication(self, client):
        """Test that project endpoints require authentication."""
        endpoints = [
            ("GET", "/api/v1/projects/"),
            ("POST", "/api/v1/projects/"),
            ("GET", f"/api/v1/projects/{uuid.uuid4()}"),
            ("PUT", f"/api/v1/projects/{uuid.uuid4()}"),
            ("DELETE", f"/api/v1/projects/{uuid.uuid4()}")
        ]
        
        for method, url in endpoints:
            response = getattr(client, method.lower())(url)
            assert response.status_code in [401, 403, 404]  # Auth errors or not found
    
    def test_project_creation_requires_active_user(self, client, db):
        """Test that project creation requires active user account."""
        # Create inactive user
        inactive_user = User(
            email="inactive@example.com",
            first_name="Inactive",
            last_name="User",
            password_hash="hashed_password",
            is_active=False
        )
        db.add(inactive_user)
        db.commit()
        db.refresh(inactive_user)
        
        # Mock authentication to return inactive user
        with patch('api.auth.get_current_user', return_value=inactive_user):
            project_data = {
                "name": "Inactive User Project",
                "visibility": "individual"
            }
            
            response = client.post("/api/v1/projects/", json=project_data)
            assert response.status_code == 403
            assert "inactive" in response.json()["detail"].lower() or "not authenticated" in response.json()["detail"].lower()


class TestProjectAPIErrorHandling:
    """Test project API error handling and edge cases."""
    
    def test_invalid_uuid_format(self, client, auth_headers):
        """Test API endpoints with invalid UUID format."""
        invalid_id = "not-a-uuid"
        
        endpoints = [
            ("GET", f"/api/v1/projects/{invalid_id}"),
            ("PUT", f"/api/v1/projects/{invalid_id}"),
            ("DELETE", f"/api/v1/projects/{invalid_id}")
        ]
        
        for method, url in endpoints:
            response = getattr(client, method.lower())(url, headers=auth_headers)
            assert response.status_code == 422  # Validation error
    
    def test_project_visibility_organization_mismatch(self, client, auth_headers, db, current_user):
        """Test creating project with visibility-organization mismatch."""
        # Try to create organization project without organization
        project_data = {
            "name": "Org Project Without Org",
            "visibility": "organization"
            # Missing organization_id
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "organization" in response.json()["detail"].lower()
    
    def test_project_name_uniqueness_within_user_scope(self, client, auth_headers, db, current_user):
        """Test that project names must be unique within user's scope."""
        # Create first project
        project_data = {
            "name": "Unique Project Name",
            "visibility": "individual"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        # Try to create another project with same name
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()


class TestProjectAPIIntegration:
    """Test project API integration scenarios."""
    
    def test_complete_project_lifecycle_workflow(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test complete project lifecycle from creation to completion."""
        # Step 1: Create individual project
        project_data = {
            "name": "Lifecycle Project",
            "description": "Project for lifecycle testing",
            "visibility": "individual",
            "status": "active"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        project_id = response.json()["id"]
        
        # Step 2: Update project status to in progress
        update_data = {"status": "active"}
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Step 3: Mark project as completed
        complete_data = {"status": "completed"}
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=complete_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        
        # Step 4: Archive completed project
        archive_data = {"status": "archived"}
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=archive_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "archived"
    
    def test_project_organization_migration_workflow(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test migrating project from individual to organization scope."""
        # Step 1: Create individual project
        project_data = {
            "name": "Migration Project",
            "description": "Project to be migrated to organization",
            "visibility": "individual"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        project_id = response.json()["id"]
        
        # Step 2: Create organization
        org_data = {
            "name": "Migration Org",
            "domain": "migration.com",
            "scope": "shared",
            "max_users": 50
        }
        
        org_response = client.post(
            "/api/v1/organizations/",
            json=org_data,
            headers=auth_headers
        )
        assert org_response.status_code == 201
        org_id = org_response.json()["id"]
        
        # Step 3: Migrate project to organization
        migration_data = {
            "visibility": "team",
            "organization_id": org_id
        }
        
        response = client.put(
            f"/api/v1/projects/{project_id}",
            json=migration_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["visibility"] == "team"
        assert data["organization_id"] == org_id
        
        # Step 4: Verify project is now organization-scoped
        response = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200


class TestProjectValidationEdgeCases:
    """Test edge cases for project validation not covered by existing tests."""
    
    def test_individual_project_with_organization_id_fails(self, client, auth_headers, db, current_user):
        """Test that individual projects cannot have organization_id set."""
        # Create organization first
        org = Organization(
            name="Test Organization",
            domain="test.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add(org)
        db.commit()
        
        # Try to create individual project with organization_id
        project_data = {
            "name": "Individual Project with Org",
            "description": "This should fail",
            "visibility": "individual",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Individual projects cannot be assigned to an organization" in response.json()["detail"]
    
    def test_team_project_without_organization_fails(self, client, auth_headers):
        """Test that team projects require organization_id."""
        project_data = {
            "name": "Team Project No Org",
            "description": "This should fail",
            "visibility": "team"
            # Missing organization_id
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Team projects require an organization" in response.json()["detail"]
    
    def test_organization_project_without_organization_fails(self, client, auth_headers):
        """Test that organization projects require organization_id."""
        project_data = {
            "name": "Organization Project No Org",
            "description": "This should fail",
            "visibility": "organization"
            # Missing organization_id
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "Organization projects require an organization" in response.json()["detail"]
    
    def test_create_project_nonexistent_organization_fails(self, client, auth_headers):
        """Test creating project with non-existent organization ID."""
        fake_org_id = str(uuid.uuid4())
        
        project_data = {
            "name": "Project with Fake Org",
            "description": "This should fail",
            "visibility": "team",
            "organization_id": fake_org_id
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "Organization not found" in response.json()["detail"]
    
    def test_create_project_organization_at_capacity_fails(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test creating project when organization is at maximum capacity."""
        # Create organization with max_users=1
        org = Organization(
            name="Full Organization",
            domain="full.com",
            scope=OrganizationScope.SHARED,
            max_users=1
        )
        db.add(org)
        db.commit()
        
        # Create another user already in this organization
        existing_user = User(
            email="existing@full.com",
            first_name="Existing",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True,
            organization_id=org.id
        )
        db.add(existing_user)
        db.commit()
        
        # Current user has no organization
        current_user.organization_id = None
        db.commit()
        
        # Try to create team project - should fail because org is at capacity
        project_data = {
            "name": "Team Project Full Org",
            "description": "This should fail",
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "maximum user capacity" in response.json()["detail"]
    
    def test_create_project_user_not_organization_member_fails(self, client, auth_headers, db, current_user):
        """Test creating project when user is not a member of the organization."""
        # Create two organizations
        org1 = Organization(
            name="Org 1",
            domain="org1.com",
            scope=OrganizationScope.SHARED,
            max_users=10
        )
        org2 = Organization(
            name="Org 2",
            domain="org2.com",
            scope=OrganizationScope.SHARED,
            max_users=10
        )
        db.add_all([org1, org2])
        db.commit()
        
        # Assign user to org1
        current_user.organization_id = org1.id
        db.commit()
        
        # Try to create project in org2 (user is not a member)
        project_data = {
            "name": "Project in Wrong Org",
            "description": "This should fail",
            "visibility": "team",
            "organization_id": str(org2.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "must be a member of the organization" in response.json()["detail"]
    
    def test_create_project_without_projects_access_fails(self, client, db, current_user):
        """Test creating project when user doesn't have projects access."""
        # Remove projects access from user
        current_user.has_projects_access = False
        db.commit()
        
        # Create auth headers for user without projects access
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(current_user.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        project_data = {
            "name": "Project No Access",
            "description": "This should fail",
            "visibility": "individual"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=headers
        )
        assert response.status_code == 403
        assert "does not have projects access" in response.json()["detail"]


class TestProjectAccessEndpoint:
    """Test the project access checking endpoint."""
    
    def test_check_project_access_success(self, client, auth_headers, db, current_user):
        """Test successful project access check."""
        # Create a project
        project = Project(
            name="Test Project",
            description="Test description",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        db.add(project)
        db.commit()
        
        # Check access
        response = client.get(
            f"/api/v1/projects/{project.id}/access-check",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_access"] is True
        assert data["can_modify"] is True
        assert data["project_id"] == str(project.id)
        assert data["visibility"] == "individual"
        assert data["is_creator"] is True
    
    def test_check_project_access_not_found(self, client, auth_headers):
        """Test project access check for non-existent project."""
        fake_project_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/projects/{fake_project_id}/access-check",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_check_project_access_no_access(self, client, auth_headers, db, current_user):
        """Test project access check when user has no access."""
        # Create another user and their project
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(other_user)
        db.commit()
        
        # Create project owned by other user
        project = Project(
            name="Other User Project",
            description="Private project",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=other_user.id
        )
        db.add(project)
        db.commit()
        
        # Check access as current user
        response = client.get(
            f"/api/v1/projects/{project.id}/access-check",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_access"] is False
        assert data["can_modify"] is False
        assert data["is_creator"] is False


class TestProjectListingWithAdmin:
    """Test project listing with admin privileges."""
    
    def test_admin_can_see_all_projects(self, client, db, admin_auth_headers, admin_user):
        """Test that admin users can see all projects."""
        # Create multiple users with different projects
        user1 = User(
            email="user1@example.com",
            first_name="User",
            last_name="One",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        user2 = User(
            email="user2@example.com",
            first_name="User",
            last_name="Two",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add_all([user1, user2])
        db.commit()
        
        # Create projects for different users
        project1 = Project(
            name="User1 Project",
            description="User 1's project",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=user1.id
        )
        project2 = Project(
            name="User2 Project",
            description="User 2's project",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=user2.id
        )
        db.add_all([project1, project2])
        db.commit()
        
        # Admin should see all projects
        response = client.get(
            "/api/v1/projects/",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        project_names = [p["name"] for p in data["projects"]]
        assert "User1 Project" in project_names
        assert "User2 Project" in project_names




class TestProjectArchiveRestore:
    """Test project archiving and restoration functionality."""
    
    def test_archive_project_success(self, client, auth_headers, db, current_user):
        """Test successful project archiving."""
        # Create project
        project = Project(
            name="Project to Archive",
            description="Test project for archiving",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Archive project
        response = client.post(
            f"/api/v1/projects/{project.id}/archive",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "archived"
        assert data["name"] == "Project to Archive"
        assert "updated_at" in data
    
    def test_archive_project_not_found(self, client, auth_headers):
        """Test archiving non-existent project."""
        fake_project_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/projects/{fake_project_id}/archive",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_archive_project_unauthorized(self, client, auth_headers, db, current_user):
        """Test archiving project without ownership."""
        # Create another user
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(other_user)
        db.commit()
        
        # Create project owned by other user
        project = Project(
            name="Other User Project",
            description="Not owned by current user",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=other_user.id
        )
        db.add(project)
        db.commit()
        
        # Try to archive
        response = client.post(
            f"/api/v1/projects/{project.id}/archive",
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "not authorized to archive" in response.json()["detail"].lower()
    
    def test_restore_project_success(self, client, auth_headers, db, current_user):
        """Test successful project restoration."""
        # Create archived project
        project = Project(
            name="Archived Project",
            description="Test project for restoration",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ARCHIVED,
            created_by=current_user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Restore project
        response = client.post(
            f"/api/v1/projects/{project.id}/restore",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "active"
        assert data["name"] == "Archived Project"
        assert "updated_at" in data
    
    def test_restore_project_not_found(self, client, auth_headers):
        """Test restoring non-existent project."""
        fake_project_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/v1/projects/{fake_project_id}/restore",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "Project not found" in response.json()["detail"]
    
    def test_restore_project_unauthorized(self, client, auth_headers, db, current_user):
        """Test restoring project without ownership."""
        # Create another user
        other_user = User(
            email="other@example.com",
            first_name="Other",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(other_user)
        db.commit()
        
        # Create archived project owned by other user
        project = Project(
            name="Other User Archived Project",
            description="Not owned by current user",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ARCHIVED,
            created_by=other_user.id
        )
        db.add(project)
        db.commit()
        
        # Try to restore
        response = client.post(
            f"/api/v1/projects/{project.id}/restore",
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "not authorized to restore" in response.json()["detail"].lower()


class TestOrganizationProjectListing:
    """Test organization-specific project listing endpoint."""
    
    def test_list_organization_projects_success(self, client, auth_headers, db, current_user):
        """Test successful organization project listing."""
        # Create organization
        org = Organization(
            name="Test Organization",
            domain="test.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add(org)
        db.commit()
        
        # Assign user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Create projects in organization
        project1 = Project(
            name="Org Project 1",
            description="First organization project",
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id,
            organization_id=org.id
        )
        project2 = Project(
            name="Org Project 2",
            description="Second organization project",
            visibility=ProjectVisibility.ORGANIZATION,
            status=ProjectStatus.COMPLETED,
            created_by=current_user.id,
            organization_id=org.id
        )
        db.add_all([project1, project2])
        db.commit()
        
        # List organization projects
        response = client.get(
            f"/api/v1/projects/organization/{org.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["projects"]) == 2
        assert data["total"] == 2
        project_names = [p["name"] for p in data["projects"]]
        assert "Org Project 1" in project_names
        assert "Org Project 2" in project_names
    
    def test_list_organization_projects_with_status_filter(self, client, auth_headers, db, current_user):
        """Test organization project listing with status filter."""
        # Create organization
        org = Organization(
            name="Filter Test Org",
            domain="filtertest.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add(org)
        db.commit()
        
        # Assign user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Create projects with different statuses
        active_project = Project(
            name="Active Project",
            description="Active project",
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id,
            organization_id=org.id
        )
        completed_project = Project(
            name="Completed Project",
            description="Completed project",
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.COMPLETED,
            created_by=current_user.id,
            organization_id=org.id
        )
        db.add_all([active_project, completed_project])
        db.commit()
        
        # List only active projects
        response = client.get(
            f"/api/v1/projects/organization/{org.id}?status=active",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["projects"]) == 1
        assert data["projects"][0]["name"] == "Active Project"
        assert data["projects"][0]["status"] == "active"
    
    def test_list_organization_projects_not_found(self, client, auth_headers):
        """Test listing projects for non-existent organization."""
        fake_org_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/projects/organization/{fake_org_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        assert "Organization not found" in response.json()["detail"]
    
    def test_list_organization_projects_unauthorized(self, client, auth_headers, db, current_user):
        """Test listing projects for organization user is not member of."""
        # Create two organizations
        org1 = Organization(
            name="User's Organization",
            domain="userorg.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        org2 = Organization(
            name="Other Organization",
            domain="otherorg.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add_all([org1, org2])
        db.commit()
        
        # Assign user to org1
        current_user.organization_id = org1.id
        db.commit()
        
        # Try to list projects from org2
        response = client.get(
            f"/api/v1/projects/organization/{org2.id}",
            headers=auth_headers
        )
        assert response.status_code == 403
        assert "not authorized to view projects" in response.json()["detail"].lower()
    
    def test_list_organization_projects_pagination(self, client, auth_headers, db, current_user):
        """Test organization project listing with pagination."""
        # Create organization
        org = Organization(
            name="Pagination Test Org",
            domain="paginationtest.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add(org)
        db.commit()
        
        # Assign user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Create multiple projects
        projects = []
        for i in range(5):
            project = Project(
                name=f"Pagination Project {i+1}",
                description=f"Project {i+1} for pagination testing",
                visibility=ProjectVisibility.TEAM,
                status=ProjectStatus.ACTIVE,
                created_by=current_user.id,
                organization_id=org.id
            )
            projects.append(project)
        
        db.add_all(projects)
        db.commit()
        
        # Test pagination with limit=2
        response = client.get(
            f"/api/v1/projects/organization/{org.id}?page=1&limit=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["projects"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["limit"] == 2


class TestJustInTimeOrganizationAssignment:
    """Test just-in-time organization assignment during project creation."""
    
    def test_just_in_time_organization_assignment_success(self, client, auth_headers, db, current_user):
        """Test successful just-in-time organization assignment."""
        # Create organization with capacity
        org = Organization(
            name="JIT Assignment Org",
            domain="jitassign.com",
            scope=OrganizationScope.SHARED,
            max_users=10
        )
        db.add(org)
        db.commit()
        
        # Ensure user has no organization
        current_user.organization_id = None
        db.commit()
        
        # Create team project - should trigger JIT assignment
        project_data = {
            "name": "JIT Team Project",
            "description": "Project that triggers JIT assignment",
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "JIT Team Project"
        assert data["organization_id"] == str(org.id)
        assert data["visibility"] == "team"
        
        # Verify user was assigned to organization
        db.refresh(current_user)
        assert current_user.organization_id == org.id
    
    def test_just_in_time_assignment_blocked_by_capacity(self, client, auth_headers, db, current_user, test_rate_limits):
        """Test JIT assignment blocked by organization capacity."""
        # Create organization at capacity
        org = Organization(
            name="Full Organization",
            domain="full.com",
            scope=OrganizationScope.SHARED,
            max_users=1
        )
        db.add(org)
        db.commit()
        
        # Create user already in organization
        existing_user = User(
            email="existing@full.com",
            first_name="Existing",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True,
            organization_id=org.id
        )
        db.add(existing_user)
        db.commit()
        
        # Ensure current user has no organization
        current_user.organization_id = None
        db.commit()
        
        # Try to create team project - should fail due to capacity
        project_data = {
            "name": "Capacity Blocked Project",
            "description": "Should fail due to capacity",
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "maximum user capacity" in response.json()["detail"]


class TestAdminProjectAccess:
    """Test admin access to all projects."""
    
    def test_admin_can_modify_any_project(self, client, db, admin_auth_headers, admin_user, test_rate_limits):
        """Test that admin can modify any project."""
        # Create regular user
        regular_user = User(
            email="regular@example.com",
            first_name="Regular",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(regular_user)
        db.commit()
        
        # Create project owned by regular user
        project = Project(
            name="Regular User Project",
            description="Owned by regular user",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=regular_user.id
        )
        db.add(project)
        db.commit()
        
        # Admin should be able to modify
        update_data = {
            "name": "Modified by Admin",
            "description": "Updated by admin user"
        }
        
        response = client.put(
            f"/api/v1/projects/{project.id}",
            json=update_data,
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Modified by Admin"
        assert data["description"] == "Updated by admin user"
    
    def test_admin_can_delete_any_project(self, client, db, admin_auth_headers, admin_user, test_rate_limits):
        """Test that admin can delete any project."""
        # Create regular user
        regular_user = User(
            email="regular@example.com",
            first_name="Regular",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(regular_user)
        db.commit()
        
        # Create project owned by regular user
        project = Project(
            name="Project to Delete",
            description="Will be deleted by admin",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=regular_user.id
        )
        db.add(project)
        db.commit()
        
        # Admin should be able to delete
        response = client.delete(
            f"/api/v1/projects/{project.id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "deleted successfully" in data["message"]
    
    def test_admin_can_archive_any_project(self, client, db, admin_auth_headers, admin_user, test_rate_limits):
        """Test that admin can archive any project."""
        # Create regular user
        regular_user = User(
            email="regular@example.com",
            first_name="Regular",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.BASIC_USER,
            is_active=True,
            email_verified=True,
            has_projects_access=True
        )
        db.add(regular_user)
        db.commit()
        
        # Create project owned by regular user
        project = Project(
            name="Project to Archive",
            description="Will be archived by admin",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=regular_user.id
        )
        db.add(project)
        db.commit()
        
        # Admin should be able to archive
        response = client.post(
            f"/api/v1/projects/{project.id}/archive",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "archived"
        assert data["name"] == "Project to Archive"


class TestProjectUpdateEdgeCases:
    """Test edge cases for project updates."""
    
    def test_update_project_name_uniqueness_validation(self, client, auth_headers, db, current_user):
        """Test that project name uniqueness is validated during updates."""
        # Create two projects
        project1 = Project(
            name="Original Project 1",
            description="First project",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        project2 = Project(
            name="Original Project 2",
            description="Second project",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        db.add_all([project1, project2])
        db.commit()
        
        # Try to update project2 name to match project1
        update_data = {
            "name": "Original Project 1"  # Same as project1
        }
        
        response = client.put(
            f"/api/v1/projects/{project2.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_update_project_visibility_with_organization_validation(self, client, auth_headers, db, current_user):
        """Test updating project visibility with organization validation."""
        # Create organization
        org = Organization(
            name="Update Test Org",
            domain="updatetest.com",
            scope=OrganizationScope.SHARED,
            max_users=100
        )
        db.add(org)
        db.commit()
        
        # Assign user to organization
        current_user.organization_id = org.id
        db.commit()
        
        # Create individual project
        project = Project(
            name="Individual to Team Project",
            description="Will be migrated to team",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        db.add(project)
        db.commit()
        
        # Update to team project
        update_data = {
            "visibility": "team",
            "organization_id": str(org.id)
        }
        
        response = client.put(
            f"/api/v1/projects/{project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["visibility"] == "team"
        assert data["organization_id"] == str(org.id)
    
    def test_update_project_fallback_creation_method(self, client, auth_headers, db, current_user):
        """Test that project updates handle fallback creation method."""
        # Create project with manual creation (fallback method)
        project = Project(
            name="Manual Project",
            description="Created manually",
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE,
            created_by=current_user.id
        )
        db.add(project)
        db.commit()
        
        # Test updating with status field
        update_data = {
            "name": "Updated Manual Project",
            "status": "completed"
        }
        
        response = client.put(
            f"/api/v1/projects/{project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Updated Manual Project"
        assert data["status"] == "completed"
        assert "updated_at" in data