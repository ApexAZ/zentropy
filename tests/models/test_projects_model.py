"""
Tests for Project Model (Just-in-Time Organization System)

These tests verify the Project model implementation that supports the just-in-time
organization system where projects can be created with or without organizations,
and project creation drives organization assignment decisions.
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from api.database import Project, User, Organization, OrganizationScope, ProjectVisibility, ProjectStatus
from api.schemas import ProjectCreate, ProjectResponse


class TestProjectModel:
    """Test Project model creation and relationships."""

    def test_project_model_creation(self, db):
        """Test basic Project model creation."""
        # Create organization first
        org = Organization(
            name="Test Organization",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user = User(
            email="project-creator@example.com",
            first_name="Project",
            last_name="Creator",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create project
        project = Project(
            name="Test Project",
            description="A test project",
            organization_id=org.id,
            created_by=user.id,
            visibility=ProjectVisibility.TEAM,
            status=ProjectStatus.ACTIVE
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify project was created correctly
        assert project.name == "Test Project"
        assert project.description == "A test project"
        assert project.organization_id == org.id
        assert project.created_by == user.id
        assert project.visibility == ProjectVisibility.TEAM
        assert project.status == ProjectStatus.ACTIVE
        assert project.created_at is not None
        assert project.updated_at is not None

    def test_project_model_without_organization(self, db):
        """Test creating a individual project without organization."""
        # Create user without organization
        user = User(
            email="individual-project@example.com",
            first_name="Personal",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create individual project
        project = Project(
            name="Personal Project",
            description="A individual project",
            organization_id=None,
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify individual project was created correctly
        assert project.name == "Personal Project"
        assert project.organization_id is None
        assert project.created_by == user.id
        assert project.visibility == ProjectVisibility.INDIVIDUAL
        assert project.status == ProjectStatus.ACTIVE

    def test_project_organization_relationship(self, db):
        """Test Project-Organization relationship."""
        # Create organization
        org = Organization(
            name="Relationship Test Org",
            scope=OrganizationScope.SHARED
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user = User(
            email="relationship-test@example.com",
            first_name="Relationship",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create project
        project = Project(
            name="Relationship Project",
            organization_id=org.id,
            created_by=user.id,
            visibility=ProjectVisibility.TEAM
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Test relationship
        assert project.organization_rel is not None
        assert project.organization_rel.name == "Relationship Test Org"
        assert project.organization_rel.id == org.id

    def test_project_creator_relationship(self, db):
        """Test Project-User (creator) relationship."""
        # Create user
        user = User(
            email="creator-test@example.com",
            first_name="Creator",
            last_name="Test",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create project
        project = Project(
            name="Creator Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Test creator relationship
        assert project.creator_rel is not None
        assert project.creator_rel.email == "creator-test@example.com"
        assert project.creator_rel.id == user.id

    def test_project_visibility_constraints(self, db):
        """Test project visibility constraints and validation."""
        # Create user
        user = User(
            email="visibility-test@example.com",
            first_name="Visibility",
            last_name="Test",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Test individual project visibility
        individual_project = Project(
            name="Personal Visibility Test",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            organization_id=None
        )
        db.add(individual_project)
        db.commit()
        db.refresh(individual_project)

        # Verify individual project constraints
        assert individual_project.visibility == ProjectVisibility.INDIVIDUAL
        assert individual_project.organization_id is None

    def test_project_status_enum(self, db):
        """Test project status enum values."""
        # Create user
        user = User(
            email="status-test@example.com",
            first_name="Status",
            last_name="Test",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Test each status value
        statuses = [
            ProjectStatus.ACTIVE,
            ProjectStatus.INACTIVE,
            ProjectStatus.ARCHIVED,
            ProjectStatus.COMPLETED
        ]

        for status in statuses:
            project = Project(
                name=f"Status Test {status.value}",
                created_by=user.id,
                visibility=ProjectVisibility.INDIVIDUAL,
                status=status
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            
            assert project.status == status

    def test_project_timestamps(self, db):
        """Test project created_at and updated_at timestamps."""
        # Create user
        user = User(
            email="timestamp-test@example.com",
            first_name="Timestamp",
            last_name="Test",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create project
        project = Project(
            name="Timestamp Test",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify timestamps exist and are datetime objects
        assert project.created_at is not None
        assert project.updated_at is not None
        assert isinstance(project.created_at, datetime)
        assert isinstance(project.updated_at, datetime)
        # For new projects, created_at and updated_at should be very close
        time_diff = abs((project.created_at - project.updated_at).total_seconds())
        assert time_diff < 0.1  # Within 100ms


class TestProjectVisibilityEnum:
    """Test ProjectVisibility enum values and constraints."""

    def test_project_visibility_enum_values(self):
        """Test that ProjectVisibility enum has correct values."""
        assert ProjectVisibility.INDIVIDUAL.value == "individual"
        assert ProjectVisibility.TEAM.value == "team"
        assert ProjectVisibility.ORGANIZATION.value == "organization"

    def test_project_visibility_enum_count(self):
        """Test that ProjectVisibility enum has exactly 3 values."""
        expected_values = ["individual", "team", "organization"]
        actual_values = [pv.value for pv in ProjectVisibility]
        assert len(actual_values) == 3
        assert set(actual_values) == set(expected_values)

    def test_project_visibility_validation_logic(self):
        """Test ProjectVisibility validation logic."""
        # Test that validation methods exist and return expected results
        assert ProjectVisibility.requires_organization(ProjectVisibility.INDIVIDUAL) is False
        assert ProjectVisibility.requires_organization(ProjectVisibility.TEAM) is True
        assert ProjectVisibility.requires_organization(ProjectVisibility.ORGANIZATION) is True


class TestProjectStatusEnum:
    """Test ProjectStatus enum values."""

    def test_project_status_enum_values(self):
        """Test that ProjectStatus enum has correct values."""
        assert ProjectStatus.ACTIVE.value == "active"
        assert ProjectStatus.INACTIVE.value == "inactive"
        assert ProjectStatus.ARCHIVED.value == "archived"
        assert ProjectStatus.COMPLETED.value == "completed"

    def test_project_status_enum_count(self):
        """Test that ProjectStatus enum has exactly 4 values."""
        expected_values = ["active", "inactive", "archived", "completed"]
        actual_values = [ps.value for ps in ProjectStatus]
        assert len(actual_values) == 4
        assert set(actual_values) == set(expected_values)


class TestProjectJustInTimeOrganizationIntegration:
    """Test Project model integration with just-in-time organization system."""

    def test_individual_project_creation_without_organization(self, db):
        """Test creating individual project without organization assignment."""
        # Create user without organization
        user = User(
            email="individual-jit@example.com",
            first_name="PersonalJIT",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create individual project
        project = Project(
            name="Personal JIT Project",
            description="Personal project for just-in-time testing",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            organization_id=None
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify individual project creation
        assert project.organization_id is None
        assert project.visibility == ProjectVisibility.INDIVIDUAL
        assert project.created_by == user.id
        assert user.is_organization_assigned() is False

    def test_team_project_creation_triggers_organization_assignment(self, db):
        """Test that team project creation can trigger organization assignment."""
        # Create organization
        org = Organization(
            name="JIT Team Organization",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user without organization initially
        user = User(
            email="team-jit@example.com",
            first_name="TeamJIT",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Verify user starts without organization
        assert user.is_organization_assigned() is False

        # Simulate just-in-time organization assignment during project creation
        user.assign_to_organization(org.id)
        db.commit()
        db.refresh(user)

        # Create team project
        project = Project(
            name="Team JIT Project",
            description="Team project triggering organization assignment",
            created_by=user.id,
            visibility=ProjectVisibility.TEAM,
            organization_id=org.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify organization assignment and project creation
        assert user.is_organization_assigned() is True
        assert user.organization_id == org.id
        assert project.organization_id == org.id
        assert project.visibility == ProjectVisibility.TEAM

    def test_organization_project_creation_workflow(self, db):
        """Test organization-wide project creation workflow."""
        # Create organization
        org = Organization(
            name="Organization Project Org",
            scope=OrganizationScope.ENTERPRISE,
            max_users=None
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user with organization
        user = User(
            email="org-project@example.com",
            first_name="OrgProject",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create organization-wide project
        project = Project(
            name="Organization Project",
            description="Organization-wide project",
            created_by=user.id,
            visibility=ProjectVisibility.ORGANIZATION,
            organization_id=org.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify organization project creation
        assert project.organization_id == org.id
        assert project.visibility == ProjectVisibility.ORGANIZATION
        assert project.organization_rel.scope == OrganizationScope.ENTERPRISE

    def test_project_visibility_organization_constraints(self, db):
        """Test that project visibility constraints work with organization requirements."""
        # Create user without organization
        user = User(
            email="constraint-test@example.com",
            first_name="Constraint",
            last_name="Test",
            password_hash="hashed_password",
            organization_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Personal project should work without organization
        individual_project = Project(
            name="Personal Constraint Test",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            organization_id=None
        )
        db.add(individual_project)
        db.commit()
        db.refresh(individual_project)

        # Verify individual project constraints
        assert individual_project.visibility == ProjectVisibility.INDIVIDUAL
        assert individual_project.organization_id is None
        assert individual_project.validate_visibility_constraints() == []

    def test_project_can_be_updated_with_organization_later(self, db):
        """Test that projects can be updated with organization assignment later."""
        # Create user and individual project
        user = User(
            email="update-org@example.com",
            first_name="UpdateOrg",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create individual project
        project = Project(
            name="Update Organization Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            organization_id=None
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify project starts without organization
        assert project.organization_id is None
        assert project.visibility == ProjectVisibility.INDIVIDUAL

        # Create organization and assign user
        org = Organization(
            name="Update Organization",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        user.assign_to_organization(org.id)
        db.commit()
        db.refresh(user)

        # Update project to team visibility with organization
        project.organization_id = org.id
        project.visibility = ProjectVisibility.TEAM
        db.commit()
        db.refresh(project)

        # Verify project update
        assert project.organization_id == org.id
        assert project.visibility == ProjectVisibility.TEAM
        assert project.organization_rel.id == org.id


class TestProjectBusinessLogicMethods:
    """Test Project model business logic methods."""

    def test_project_can_be_accessed_by_user(self, db):
        """Test project access control logic."""
        # Create organization and users
        org = Organization(
            name="Access Control Org",
            scope=OrganizationScope.SHARED,
            max_users=50
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        owner = User(
            email="owner@example.com",
            first_name="Owner",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        teammate = User(
            email="teammate@example.com",
            first_name="Teammate",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        outsider = User(
            email="outsider@example.com",
            first_name="Outsider",
            last_name="User",
            password_hash="hashed_password",
            organization_id=None
        )
        
        db.add(owner)
        db.add(teammate)
        db.add(outsider)
        db.commit()
        db.refresh(owner)
        db.refresh(teammate)
        db.refresh(outsider)

        # Create team project
        project = Project(
            name="Access Control Project",
            created_by=owner.id,
            organization_id=org.id,
            visibility=ProjectVisibility.TEAM
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Test access control
        assert project.can_be_accessed_by(owner) is True
        assert project.can_be_accessed_by(teammate) is True
        assert project.can_be_accessed_by(outsider) is False

    def test_project_validate_visibility_constraints(self, db):
        """Test project visibility constraint validation."""
        # Create user
        user = User(
            email="validation@example.com",
            first_name="Validation",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Test individual project validation
        individual_project = Project(
            name="Personal Validation",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            organization_id=None
        )
        db.add(individual_project)
        db.commit()
        db.refresh(individual_project)

        # Should have no validation errors
        errors = individual_project.validate_visibility_constraints()
        assert len(errors) == 0

    def test_project_get_visibility_description(self, db):
        """Test project visibility description method."""
        # Create user
        user = User(
            email="description@example.com",
            first_name="Description",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create project
        project = Project(
            name="Description Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # Test description method
        description = project.get_visibility_description()
        assert "accessible to project creator" in description.lower()
        assert "only" in description.lower()


class TestProjectFactoryMethods:
    """Test Project model factory methods."""

    def test_create_individual_project(self, db):
        """Test creating individual project via factory method."""
        # Create user
        user = User(
            email="factory-individual@example.com",
            first_name="FactoryPersonal",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create individual project via factory
        project = Project.create_individual_project(
            name="Factory Personal Project",
            description="Created via factory method",
            creator_id=user.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify factory creation
        assert project.visibility == ProjectVisibility.INDIVIDUAL
        assert project.organization_id is None
        assert project.created_by == user.id
        assert project.status == ProjectStatus.ACTIVE

    def test_create_team_project(self, db):
        """Test creating team project via factory method."""
        # Create organization
        org = Organization(
            name="Factory Team Org",
            scope=OrganizationScope.SHARED
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user = User(
            email="factory-team@example.com",
            first_name="FactoryTeam",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create team project via factory
        project = Project.create_team_project(
            name="Factory Team Project",
            description="Created via factory method",
            creator_id=user.id,
            organization_id=org.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify factory creation
        assert project.visibility == ProjectVisibility.TEAM
        assert project.organization_id == org.id
        assert project.created_by == user.id
        assert project.status == ProjectStatus.ACTIVE

    def test_create_organization_project(self, db):
        """Test creating organization project via factory method."""
        # Create organization
        org = Organization(
            name="Factory Organization Org",
            scope=OrganizationScope.ENTERPRISE
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user = User(
            email="factory-org@example.com",
            first_name="FactoryOrg",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create organization project via factory
        project = Project.create_organization_project(
            name="Factory Organization Project",
            description="Created via factory method",
            creator_id=user.id,
            organization_id=org.id
        )
        
        db.add(project)
        db.commit()
        db.refresh(project)

        # Verify factory creation
        assert project.visibility == ProjectVisibility.ORGANIZATION
        assert project.organization_id == org.id
        assert project.created_by == user.id
        assert project.status == ProjectStatus.ACTIVE


class TestProjectDatabaseConstraints:
    """Test Project model database constraints."""

    def test_project_name_required_constraint(self, db):
        """Test that project name is required."""
        # Create user
        user = User(
            email="constraint-name@example.com",
            first_name="ConstraintName",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Try to create project without name (should fail)
        with pytest.raises(Exception):  # Database constraint error
            project = Project(
                name=None,  # Required field
                created_by=user.id,
                visibility=ProjectVisibility.INDIVIDUAL
            )
            db.add(project)
            db.commit()

    def test_project_creator_required_constraint(self, db):
        """Test that project creator is required."""
        # Try to create project without creator (should fail)
        with pytest.raises(Exception):  # Database constraint error
            project = Project(
                name="No Creator Project",
                created_by=None,  # Required field
                visibility=ProjectVisibility.INDIVIDUAL
            )
            db.add(project)
            db.commit()

    def test_project_visibility_required_constraint(self, db):
        """Test that project visibility is required."""
        # Create user
        user = User(
            email="constraint-visibility@example.com",
            first_name="ConstraintVisibility",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Try to create project without visibility (should work with default)
        project = Project(
            name="Default Visibility Project",
            created_by=user.id
            # visibility will get default value
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        # Should have default visibility
        assert project.visibility == ProjectVisibility.INDIVIDUAL


class TestProjectQueryingAndFiltering:
    """Test Project model querying and filtering."""

    def test_query_projects_by_organization(self, db):
        """Test querying projects by organization."""
        # Create organization
        org = Organization(
            name="Query Test Org",
            scope=OrganizationScope.SHARED
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user
        user = User(
            email="query-org@example.com",
            first_name="QueryOrg",
            last_name="User",
            password_hash="hashed_password",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create projects
        org_project = Project(
            name="Organization Project",
            created_by=user.id,
            organization_id=org.id,
            visibility=ProjectVisibility.TEAM
        )
        individual_project = Project(
            name="Personal Project",
            created_by=user.id,
            organization_id=None,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        
        db.add(org_project)
        db.add(individual_project)
        db.commit()

        # Query projects by organization
        org_projects = db.query(Project).filter(Project.organization_id == org.id).all()
        individual_projects = db.query(Project).filter(Project.organization_id.is_(None)).all()

        # Verify filtering
        assert len(org_projects) >= 1
        assert len(individual_projects) >= 1
        assert any(p.name == "Organization Project" for p in org_projects)
        assert any(p.name == "Personal Project" for p in individual_projects)

    def test_query_projects_by_creator(self, db):
        """Test querying projects by creator."""
        # Create users
        creator1 = User(
            email="creator1@example.com",
            first_name="Creator1",
            last_name="User",
            password_hash="hashed_password"
        )
        creator2 = User(
            email="creator2@example.com",
            first_name="Creator2",
            last_name="User",
            password_hash="hashed_password"
        )
        
        db.add(creator1)
        db.add(creator2)
        db.commit()
        db.refresh(creator1)
        db.refresh(creator2)

        # Create projects
        project1 = Project(
            name="Creator 1 Project",
            created_by=creator1.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        project2 = Project(
            name="Creator 2 Project",
            created_by=creator2.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        
        db.add(project1)
        db.add(project2)
        db.commit()

        # Query projects by creator
        creator1_projects = db.query(Project).filter(Project.created_by == creator1.id).all()
        creator2_projects = db.query(Project).filter(Project.created_by == creator2.id).all()

        # Verify filtering
        assert len(creator1_projects) >= 1
        assert len(creator2_projects) >= 1
        assert any(p.name == "Creator 1 Project" for p in creator1_projects)
        assert any(p.name == "Creator 2 Project" for p in creator2_projects)

    def test_query_projects_by_visibility(self, db):
        """Test querying projects by visibility."""
        # Create user
        user = User(
            email="visibility-query@example.com",
            first_name="VisibilityQuery",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create projects with different visibility
        individual_project = Project(
            name="Personal Visibility Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL
        )
        
        db.add(individual_project)
        db.commit()

        # Query projects by visibility
        individual_projects = db.query(Project).filter(
            Project.visibility == ProjectVisibility.INDIVIDUAL
        ).all()

        # Verify filtering
        assert len(individual_projects) >= 1
        assert any(p.name == "Personal Visibility Project" for p in individual_projects)

    def test_query_projects_by_status(self, db):
        """Test querying projects by status."""
        # Create user
        user = User(
            email="status-query@example.com",
            first_name="StatusQuery",
            last_name="User",
            password_hash="hashed_password"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create projects with different statuses
        active_project = Project(
            name="Active Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ACTIVE
        )
        archived_project = Project(
            name="Archived Project",
            created_by=user.id,
            visibility=ProjectVisibility.INDIVIDUAL,
            status=ProjectStatus.ARCHIVED
        )
        
        db.add(active_project)
        db.add(archived_project)
        db.commit()

        # Query projects by status
        active_projects = db.query(Project).filter(
            Project.status == ProjectStatus.ACTIVE
        ).all()
        archived_projects = db.query(Project).filter(
            Project.status == ProjectStatus.ARCHIVED
        ).all()

        # Verify filtering
        assert len(active_projects) >= 1
        assert len(archived_projects) >= 1
        assert any(p.name == "Active Project" for p in active_projects)
        assert any(p.name == "Archived Project" for p in archived_projects)