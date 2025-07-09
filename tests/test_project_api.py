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
    
    def test_create_personal_project_without_organization(self, client, auth_headers, db, current_user):
        """Test creating personal project without organization assignment."""
        # Ensure user has no organization
        current_user.organization_id = None
        db.commit()
        
        project_data = {
            "name": "Personal Project",
            "description": "A personal project for testing",
            "visibility": "personal"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        
        data = response.json()
        assert data["name"] == "Personal Project"
        assert data["description"] == "A personal project for testing"
        assert data["visibility"] == "personal"
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
    
    def test_personal_to_team_project_upgrade_workflow(self, client, auth_headers, db, current_user):
        """Test upgrading personal project to team project with organization creation."""
        # Start with user without organization
        current_user.organization_id = None
        db.commit()
        
        # Step 1: Create personal project
        personal_project_data = {
            "name": "Personal Project to Upgrade",
            "description": "Will be upgraded to team project",
            "visibility": "personal"
        }
        
        response = client.post(
            "/api/v1/projects/",
            json=personal_project_data,
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
    
    def test_project_creation_with_organization_suggestion(self, client, auth_headers, db):
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
                "/api/v1/organizations",
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
    
    def test_project_creation_triggers_user_organization_assignment(self, client, auth_headers, db, current_user):
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
            visibility=ProjectVisibility.PERSONAL,
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
                visibility=ProjectVisibility.PERSONAL,
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
            visibility=ProjectVisibility.PERSONAL,
            status=ProjectStatus.ACTIVE
        )
        archived_project = Project(
            name="Archived Project",
            created_by=current_user.id,
            visibility=ProjectVisibility.PERSONAL,
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
        response = client.get("/api/v1/projects/?visibility=personal", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        personal_projects = [p for p in data["projects"] if p["visibility"] == "personal"]
        assert len(personal_projects) >= 2
    
    def test_update_project(self, client, auth_headers, db, current_user):
        """Test updating project information."""
        # Create project
        project = Project(
            name="Update Test Project",
            description="Original description",
            created_by=current_user.id,
            visibility=ProjectVisibility.PERSONAL,
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
        assert data["visibility"] == "personal"  # Should remain unchanged
    
    def test_delete_project(self, client, auth_headers, db, current_user):
        """Test deleting project."""
        # Create project
        project = Project(
            name="Delete Test Project",
            created_by=current_user.id,
            visibility=ProjectVisibility.PERSONAL,
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
    
    def test_project_access_personal_visibility(self, client, auth_headers, db, current_user):
        """Test access control for personal projects."""
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
        
        # Create personal project by other user
        other_project = Project(
            name="Other User's Personal Project",
            created_by=other_user.id,
            visibility=ProjectVisibility.PERSONAL,
            status=ProjectStatus.ACTIVE
        )
        db.add(other_project)
        db.commit()
        db.refresh(other_project)
        
        # Current user should not see other user's personal project
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
            visibility=ProjectVisibility.PERSONAL,
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
                "visibility": "personal"
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
            "visibility": "personal"
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
    
    def test_complete_project_lifecycle_workflow(self, client, auth_headers, db, current_user):
        """Test complete project lifecycle from creation to completion."""
        # Step 1: Create personal project
        project_data = {
            "name": "Lifecycle Project",
            "description": "Project for lifecycle testing",
            "visibility": "personal",
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
    
    def test_project_organization_migration_workflow(self, client, auth_headers, db, current_user):
        """Test migrating project from personal to organization scope."""
        # Step 1: Create personal project
        project_data = {
            "name": "Migration Project",
            "description": "Project to be migrated to organization",
            "visibility": "personal"
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
        
        data = response.json()
        assert data["organization_id"] == org_id
        assert data["visibility"] == "team"