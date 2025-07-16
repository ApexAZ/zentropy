"""
Tests for Teams API Endpoints

These tests verify the team management system with comprehensive coverage of:
- Team creation and retrieval with projects access control
- Team updates with role-based permissions (TEAM_ADMIN/LEAD/ADMIN)
- Team member management (add/remove) with validation
- Complex data loading and serialization
- Error handling and edge cases

All tests use the mandatory isolated test database system for reliability.
"""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.auth import create_access_token
from api.database import Team, TeamMembership, TeamRole, UserRole
from api.schemas import TeamCreate, TeamUpdate
from tests.conftest import create_test_user, create_test_team


class TestTeamRetrieval:
    """Test GET endpoints - team listing and individual team details"""
    
    def test_get_all_teams_success(self, client, db, auth_headers, current_user):
        """Test retrieving all teams with projects access"""
        # Arrange: Create test teams
        team1 = create_test_team(db, name="Team Alpha")
        team2 = create_test_team(db, name="Team Beta")
        
        # Act: Get all teams
        response = client.get(
            "/api/v1/teams/",
            headers=auth_headers
        )
        
        # Assert: Verify team list
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2  # At least the 2 created teams
        
        # Verify our teams are in the list
        team_names = [team["name"] for team in data]
        assert "Team Alpha" in team_names
        assert "Team Beta" in team_names
    
    def test_get_all_teams_no_projects_access(self, client, db):
        """Test team retrieval fails without projects access"""
        # Arrange: Create user without projects access
        user_no_access = create_test_user(
            db, 
            email="noaccess@example.com",
            has_projects_access=False
        )
        
        token = create_access_token(data={"sub": str(user_no_access.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Act: Attempt to get teams
        response = client.get(
            "/api/v1/teams/",
            headers=headers
        )
        
        # Assert: Access forbidden
        assert response.status_code == 403
        assert "Access to Projects module is required" in response.json()["detail"]
    
    def test_get_team_by_id_success(self, client, db, auth_headers, current_user):
        """Test retrieving team by ID with members"""
        # Arrange: Create team and add member
        team = create_test_team(db, name="Test Team")
        member_user = create_test_user(db, email="member@example.com")
        
        # Add membership for the member user
        membership = TeamMembership(
            team_id=team.id,
            user_id=member_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        
        # Act: Get team by ID
        response = client.get(
            f"/api/v1/teams/{team.id}",
            headers=auth_headers
        )
        
        # Assert: Verify team data with members
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(team.id)
        assert data["name"] == "Test Team"
        assert "members" in data
        assert len(data["members"]) == 1  # One member
        assert data["members"][0]["email"] == "member@example.com"
    
    def test_get_team_by_id_not_found(self, client, auth_headers):
        """Test retrieving non-existent team"""
        # Act: Attempt to get non-existent team
        response = client.get(
            f"/api/v1/teams/{uuid.uuid4()}",
            headers=auth_headers
        )
        
        # Assert: Team not found error
        assert response.status_code == 404
        assert "Team not found" in response.json()["detail"]
    
    def test_get_teams_unauthenticated(self, client):
        """Test team endpoints without authentication"""
        endpoints = [
            "/api/v1/teams/",
            f"/api/v1/teams/{uuid.uuid4()}"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 403  # Forbidden without auth


class TestTeamCreation:
    """Test POST / - team creation with automatic membership"""
    
    def test_create_team_success(self, client, db, auth_headers, current_user):
        """Test successful team creation with auto-membership"""
        # Arrange: Team creation data
        team_data = {
            "name": "New Team",
            "description": "A test team",
            "velocity_baseline": 50,
            "sprint_length_days": 10,
            "working_days_per_week": 4
        }
        
        # Act: Create team
        response = client.post(
            "/api/v1/teams/",
            json=team_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Team"
        assert data["description"] == "A test team"
        assert data["velocity_baseline"] == 50
        assert data["sprint_length_days"] == 10
        assert data["working_days_per_week"] == 4
        assert data["created_by"] == str(current_user.id)
        
        # Verify team exists in database
        team = db.query(Team).filter(Team.name == "New Team").first()
        assert team is not None
        assert team.created_by == current_user.id
        
        # Verify creator was automatically added as TEAM_ADMIN
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == current_user.id
        ).first()
        assert membership is not None
        assert membership.role == TeamRole.TEAM_ADMIN
    
    def test_create_team_minimal_data(self, client, db, auth_headers, current_user):
        """Test team creation with only required fields"""
        # Arrange: Minimal team data
        team_data = {
            "name": "Minimal Team"
        }
        
        # Act: Create team
        response = client.post(
            "/api/v1/teams/",
            json=team_data,
            headers=auth_headers
        )
        
        # Assert: Verify creation with defaults
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Minimal Team"
        assert data["description"] is None
        assert data["velocity_baseline"] == 0  # Default
        assert data["sprint_length_days"] == 14  # Default
        assert data["working_days_per_week"] == 5  # Default
    
    def test_create_team_no_projects_access(self, client, db):
        """Test team creation fails without projects access"""
        # Arrange: User without projects access
        user_no_access = create_test_user(
            db, 
            email="noaccess@example.com",
            has_projects_access=False
        )
        
        token = create_access_token(data={"sub": str(user_no_access.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        team_data = {"name": "Forbidden Team"}
        
        # Act: Attempt to create team
        response = client.post(
            "/api/v1/teams/",
            json=team_data,
            headers=headers
        )
        
        # Assert: Access forbidden
        assert response.status_code == 403
        assert "Access to Projects module is required" in response.json()["detail"]
    
    def test_create_team_unauthenticated(self, client):
        """Test team creation without authentication"""
        team_data = {"name": "Unauthenticated Team"}
        
        # Act: Attempt to create without auth
        response = client.post(
            "/api/v1/teams/",
            json=team_data
        )
        
        # Assert: Forbidden error
        assert response.status_code == 403


class TestTeamUpdate:
    """Test PUT /{team_id} - team updates with role-based permissions"""
    
    def test_update_team_as_team_admin_success(self, client, db, auth_headers, current_user):
        """Test team update by team admin"""
        # Arrange: Create team and make current_user a TEAM_ADMIN
        team = create_test_team(db, name="Original Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        db.commit()
        
        update_data = {
            "name": "Updated Team",
            "description": "Updated description",
            "velocity_baseline": 75
        }
        
        # Act: Update team
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Team"
        assert data["description"] == "Updated description"
        assert data["velocity_baseline"] == 75
        
        # Verify database state
        db.refresh(team)
        assert team.name == "Updated Team"
        assert team.updated_at is not None
    
    def test_update_team_as_team_lead_success(self, client, db, auth_headers, current_user):
        """Test team update by team lead"""
        # Arrange: Create team and make current_user a LEAD
        team = create_test_team(db, name="Lead Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.LEAD
        )
        db.add(membership)
        db.commit()
        
        update_data = {"name": "Lead Updated Team"}
        
        # Act: Update team
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Lead Updated Team"
    
    def test_update_team_as_system_admin_success(self, client, db, admin_user):
        """Test team update by system admin (no team membership required)"""
        # Arrange: Create team and admin auth headers
        team = create_test_team(db, name="Admin Team")
        
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {"name": "Admin Updated Team"}
        
        # Act: Update team as system admin
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=admin_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Admin Updated Team"
    
    def test_update_team_insufficient_permissions(self, client, db, auth_headers, current_user):
        """Test team update fails with insufficient permissions"""
        # Arrange: Create team where current_user is only a MEMBER
        team = create_test_team(db, name="Protected Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER  # Insufficient for updates
        )
        db.add(membership)
        db.commit()
        
        update_data = {"name": "Should Fail"}
        
        # Act: Attempt to update as regular member
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Insufficient permissions error
        assert response.status_code == 403
        assert "Not enough permissions" in response.json()["detail"]
    
    def test_update_team_not_found(self, client, auth_headers):
        """Test updating non-existent team"""
        update_data = {"name": "Not Found"}
        
        # Act: Attempt to update non-existent team
        response = client.put(
            f"/api/v1/teams/{uuid.uuid4()}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Team not found error
        assert response.status_code == 404
        assert "Team not found" in response.json()["detail"]
    
    def test_update_team_partial_update(self, client, db, auth_headers, current_user):
        """Test partial team update (only some fields)"""
        # Arrange: Create team and make current_user a TEAM_ADMIN
        team = create_test_team(
            db, 
            name="Partial Team",
            description="Original description",
            velocity_baseline=25
        )
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        db.commit()
        
        # Update only the name
        update_data = {"name": "Partially Updated"}
        
        # Act: Update team
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Only name changed
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Partially Updated"
        assert data["description"] == "Original description"  # Unchanged
        assert data["velocity_baseline"] == 25  # Unchanged


class TestTeamMemberManagement:
    """Test team member add/remove operations"""
    
    def test_add_team_member_success(self, client, db, auth_headers, current_user):
        """Test successfully adding user to team"""
        # Arrange: Create team and target user
        team = create_test_team(db, name="Member Team")
        target_user = create_test_user(db, email="newmember@example.com")
        
        # Act: Add user to team
        response = client.post(
            f"/api/v1/teams/{team.id}/members/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Verify successful addition
        assert response.status_code == 200
        assert "User added to team successfully" in response.json()["message"]
        
        # Verify membership created in database
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == target_user.id
        ).first()
        assert membership is not None
        assert membership.role == TeamRole.MEMBER  # Default role
    
    def test_add_team_member_team_not_found(self, client, db, auth_headers):
        """Test adding member to non-existent team"""
        target_user = create_test_user(db, email="orphan@example.com")
        
        # Act: Attempt to add user to non-existent team
        response = client.post(
            f"/api/v1/teams/{uuid.uuid4()}/members/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Team not found error
        assert response.status_code == 404
        assert "Team not found" in response.json()["detail"]
    
    def test_add_team_member_user_not_found(self, client, db, auth_headers):
        """Test adding non-existent user to team"""
        team = create_test_team(db, name="Orphan Team")
        
        # Act: Attempt to add non-existent user
        response = client.post(
            f"/api/v1/teams/{team.id}/members/{uuid.uuid4()}",
            headers=auth_headers
        )
        
        # Assert: User not found error
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    def test_add_team_member_already_member(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test adding user who is already a team member"""
        # Arrange: Create team and user, then add user as member
        team = create_test_team(db, name="Duplicate Team")
        target_user = create_test_user(db, email="duplicate@example.com")
        
        # Add user as member first
        membership = TeamMembership(
            team_id=team.id,
            user_id=target_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        
        # Act: Attempt to add user again
        response = client.post(
            f"/api/v1/teams/{team.id}/members/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Already member error
        assert response.status_code == 400
        assert "User is already a team member" in response.json()["detail"]
    
    def test_remove_team_member_success(self, client, db, auth_headers, current_user):
        """Test successfully removing user from team"""
        # Arrange: Create team and add member
        team = create_test_team(db, name="Remove Team")
        target_user = create_test_user(db, email="removeme@example.com")
        
        membership = TeamMembership(
            team_id=team.id,
            user_id=target_user.id,
            role=TeamRole.MEMBER
        )
        db.add(membership)
        db.commit()
        membership_id = membership.id
        
        # Act: Remove user from team
        response = client.delete(
            f"/api/v1/teams/{team.id}/members/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Verify successful removal
        assert response.status_code == 200
        assert "User removed from team successfully" in response.json()["message"]
        
        # Verify membership deleted from database
        deleted_membership = db.query(TeamMembership).filter(
            TeamMembership.id == membership_id
        ).first()
        assert deleted_membership is None
    
    def test_remove_team_member_not_member(self, client, db, auth_headers):
        """Test removing user who is not a team member"""
        # Arrange: Create team and user (but no membership)
        team = create_test_team(db, name="No Member Team")
        target_user = create_test_user(db, email="notmember@example.com")
        
        # Act: Attempt to remove non-member
        response = client.delete(
            f"/api/v1/teams/{team.id}/members/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Not a member error
        assert response.status_code == 404
        assert "User is not a team member" in response.json()["detail"]
    
    def test_member_operations_no_projects_access(self, client, db, test_rate_limits):
        """Test member operations fail without projects access"""
        # Arrange: User without projects access and test data
        user_no_access = create_test_user(
            db, 
            email="noaccess@example.com",
            has_projects_access=False
        )
        team = create_test_team(db, name="Access Team")
        target_user = create_test_user(db, email="target@example.com")
        
        token = create_access_token(data={"sub": str(user_no_access.id)})
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test both add and remove operations
        endpoints = [
            ("POST", f"/api/v1/teams/{team.id}/members/{target_user.id}"),
            ("DELETE", f"/api/v1/teams/{team.id}/members/{target_user.id}")
        ]
        
        for method, endpoint in endpoints:
            if method == "POST":
                response = client.post(endpoint, headers=headers)
            else:
                response = client.delete(endpoint, headers=headers)
            
            assert response.status_code == 403
            assert "Access to Projects module is required" in response.json()["detail"]


class TestTeamWorkflows:
    """Test complete team management workflows"""
    
    def test_complete_team_lifecycle(self, client, db, auth_headers, current_user):
        """Test complete workflow: create → add members → update → remove members"""
        # Step 1: Create team
        team_data = {
            "name": "Lifecycle Team",
            "description": "Full lifecycle test",
            "velocity_baseline": 40
        }
        
        create_response = client.post(
            "/api/v1/teams/",
            json=team_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # Step 2: Add member
        member_user = create_test_user(db, email="lifecycle@example.com")
        
        add_response = client.post(
            f"/api/v1/teams/{team_id}/members/{member_user.id}",
            headers=auth_headers
        )
        assert add_response.status_code == 200
        
        # Step 3: Verify team with members
        get_response = client.get(
            f"/api/v1/teams/{team_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        team_data = get_response.json()
        assert len(team_data["members"]) == 2  # Creator + added member
        
        # Verify both members are present
        member_emails = [member["email"] for member in team_data["members"]]
        assert current_user.email in member_emails  # Creator (TEAM_ADMIN)
        assert "lifecycle@example.com" in member_emails  # Added member
        
        # Step 4: Update team
        update_data = {"velocity_baseline": 60}
        update_response = client.put(
            f"/api/v1/teams/{team_id}",
            json=update_data,
            headers=auth_headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["velocity_baseline"] == 60
        
        # Step 5: Remove member
        remove_response = client.delete(
            f"/api/v1/teams/{team_id}/members/{member_user.id}",
            headers=auth_headers
        )
        assert remove_response.status_code == 200
        
        # Step 6: Verify member removed (only creator remains)
        final_get_response = client.get(
            f"/api/v1/teams/{team_id}",
            headers=auth_headers
        )
        assert final_get_response.status_code == 200
        final_team_data = final_get_response.json()
        assert len(final_team_data["members"]) == 1  # Only creator remains
        assert final_team_data["members"][0]["email"] == current_user.email
    
    def test_permission_escalation_workflow(self, client, db, current_user, test_rate_limits):
        """Test workflow: basic user → team admin → system admin permissions"""
        # Arrange: Create team and multiple users with different roles
        team = create_test_team(db, name="Permission Team")
        
        # Create team lead user
        team_lead = create_test_user(
            db,
            email="teamlead@example.com",
            role=UserRole.TEAM_LEAD
        )
        
        # Create admin user
        admin_user = create_test_user(
            db,
            email="admin@example.com",
            role=UserRole.ADMIN
        )
        
        # Step 1: Basic user cannot update team (no membership)
        basic_token = create_access_token(data={"sub": str(current_user.id)})
        basic_headers = {
            "Authorization": f"Bearer {basic_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {"name": "Should Fail"}
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=basic_headers
        )
        assert response.status_code == 403
        
        # Step 2: Add basic user as TEAM_ADMIN, now can update
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        db.commit()
        
        update_data = {"name": "Team Admin Success"}
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=basic_headers
        )
        assert response.status_code == 200
        
        # Step 3: System admin can update without team membership
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {"name": "System Admin Success"}
        response = client.put(
            f"/api/v1/teams/{team.id}",
            json=update_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()["name"] == "System Admin Success"