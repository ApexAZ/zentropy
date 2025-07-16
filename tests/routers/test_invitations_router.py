"""
Tests for Team Invitation API Endpoints

These tests verify the team invitation system with comprehensive coverage of:
- Invitation creation with role-based permissions
- Invitation retrieval for current user
- Invitation acceptance with membership creation
- Invitation decline with status updates
- Error handling and edge cases

All tests use the mandatory isolated test database system for reliability.
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.auth import create_access_token
from api.database import (
    User, Team, TeamMembership, TeamInvitation,
    TeamRole, InvitationStatus, UserRole, RegistrationType, AuthProvider
)
from api.schemas import TeamInvitationCreate, TeamInvitationResponse
from tests.conftest import create_test_user, create_test_team


class TestInvitationCreation:
    """Test POST /api/v1/invitations/ endpoint - most complex business logic"""
    
    def test_create_invitation_as_team_admin_success(self, client, db, auth_headers, current_user):
        """Test successful invitation creation by team admin"""
        # Arrange: Create team and make current_user a TEAM_ADMIN
        team = create_test_team(db, name="Test Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "newuser@example.com",
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["role"] == "member"
        assert data["team_id"] == str(team.id)
        assert data["invited_by"] == str(current_user.id)
        assert data["status"] == "pending"
        assert "expires_at" in data
        assert "id" in data
        
        # Verify database state
        invitation = db.query(TeamInvitation).filter(
            TeamInvitation.email == "newuser@example.com"
        ).first()
        assert invitation is not None
        assert invitation.status == InvitationStatus.PENDING
        # Check expiration is in the future (handle timezone differences)
        current_time = datetime.now(timezone.utc)
        if invitation.expires_at.tzinfo is None:
            current_time = current_time.replace(tzinfo=None)
        assert invitation.expires_at > current_time
    
    def test_create_invitation_as_team_lead_success(self, client, db, auth_headers, current_user):
        """Test successful invitation creation by team lead"""
        # Arrange: Create team and make current_user a LEAD
        team = create_test_team(db, name="Test Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.LEAD
        )
        db.add(membership)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "newuser@example.com",
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful creation
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["role"] == "member"
    
    def test_create_invitation_email_case_normalization(self, client, db, auth_headers, current_user):
        """Test that email addresses are normalized to lowercase"""
        # Arrange: Create team and admin membership
        team = create_test_team(db, name="Test Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "NewUser@Example.COM",  # Mixed case
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Email is normalized
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newuser@example.com"
        
        # Verify in database
        invitation = db.query(TeamInvitation).filter(
            TeamInvitation.email == "newuser@example.com"
        ).first()
        assert invitation is not None
    
    def test_create_invitation_team_not_found(self, client, auth_headers):
        """Test invitation creation with non-existent team"""
        invitation_data = {
            "team_id": str(uuid.uuid4()),  # Random UUID
            "email": "newuser@example.com",
            "role": "member",
            "invited_by": str(uuid.uuid4())
        }
        
        # Act: Attempt to create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Team not found error
        assert response.status_code == 404
        assert "Team not found" in response.json()["detail"]
    
    def test_create_invitation_insufficient_permissions(self, client, db, auth_headers, current_user):
        """Test invitation creation by regular member (should fail)"""
        # Arrange: Create team and make current_user a regular MEMBER
        team = create_test_team(db, name="Test Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER  # Regular member, not admin/lead
        )
        db.add(membership)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "newuser@example.com",
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Attempt to create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Forbidden error
        assert response.status_code == 403
        assert "Not authorized to invite users" in response.json()["detail"]
    
    def test_create_invitation_user_already_member(self, client, db, auth_headers, current_user):
        """Test invitation creation when user is already a team member"""
        # Arrange: Create team, admin membership, and existing member
        team = create_test_team(db, name="Test Team")
        admin_membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(admin_membership)
        
        # Create existing team member
        existing_user = create_test_user(db, email="existing@example.com")
        existing_membership = TeamMembership(
            team_id=team.id,
            user_id=existing_user.id,
            role=TeamRole.MEMBER
        )
        db.add(existing_membership)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "existing@example.com",  # Already a member
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Attempt to create invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Already member error
        assert response.status_code == 400
        assert "already a team member" in response.json()["detail"]
    
    def test_create_invitation_duplicate_pending_invitation(self, client, db, auth_headers, current_user):
        """Test invitation creation when pending invitation already exists"""
        # Arrange: Create team, admin membership, and existing pending invitation
        team = create_test_team(db, name="Test Team")
        membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(membership)
        
        # Create existing pending invitation
        existing_invitation = TeamInvitation(
            team_id=team.id,
            email="newuser@example.com",
            role=TeamRole.MEMBER,
            invited_by=current_user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(existing_invitation)
        db.commit()
        
        invitation_data = {
            "team_id": str(team.id),
            "email": "newuser@example.com",  # Duplicate invitation
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        # Act: Attempt to create duplicate invitation
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        # Assert: Pending invitation exists error
        assert response.status_code == 400
        assert "Pending invitation already exists" in response.json()["detail"]
    
    def test_create_invitation_unauthenticated(self, client):
        """Test invitation creation without authentication"""
        invitation_data = {
            "team_id": str(uuid.uuid4()),
            "email": "newuser@example.com",
            "role": "member"
        }
        
        # Act: Attempt to create invitation without auth
        response = client.post(
            "/api/v1/invitations/",
            json=invitation_data
        )
        
        # Assert: Forbidden error (403 is returned for missing auth)
        assert response.status_code == 403


class TestInvitationRetrieval:
    """Test GET /api/v1/invitations/ endpoint"""
    
    def test_get_pending_invitations_success(self, client, db, auth_headers, current_user):
        """Test retrieving pending invitations for current user"""
        # Arrange: Create team and pending invitation for current user
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Get invitations
        response = client.get(
            "/api/v1/invitations/",
            headers=auth_headers
        )
        
        # Assert: Verify invitation retrieval
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["email"] == current_user.email
        assert data[0]["role"] == "member"
        assert data[0]["team_id"] == str(team.id)
        assert data[0]["status"] == "pending"
    
    def test_get_invitations_excludes_expired(self, client, db, auth_headers, current_user):
        """Test that expired invitations are not returned"""
        # Arrange: Create team and expired invitation
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        # Create expired invitation
        expired_invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # Expired
        )
        
        # Create valid invitation
        valid_invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.LEAD,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)  # Valid
        )
        
        db.add_all([expired_invitation, valid_invitation])
        db.commit()
        
        # Act: Get invitations
        response = client.get(
            "/api/v1/invitations/",
            headers=auth_headers
        )
        
        # Assert: Only valid invitation returned
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["role"] == "lead"  # The valid invitation
    
    def test_get_invitations_excludes_non_pending(self, client, db, auth_headers, current_user):
        """Test that accepted/declined invitations are not returned"""
        # Arrange: Create team and various invitation statuses
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        # Create invitations with different statuses
        pending_invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        accepted_invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.LEAD,
            invited_by=inviter.id,
            status=InvitationStatus.ACCEPTED,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        declined_invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.TEAM_ADMIN,
            invited_by=inviter.id,
            status=InvitationStatus.DECLINED,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        db.add_all([pending_invitation, accepted_invitation, declined_invitation])
        db.commit()
        
        # Act: Get invitations
        response = client.get(
            "/api/v1/invitations/",
            headers=auth_headers
        )
        
        # Assert: Only pending invitation returned
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["role"] == "member"  # The pending invitation
        assert data[0]["status"] == "pending"
    
    def test_get_invitations_empty_list(self, client, auth_headers):
        """Test retrieving invitations when none exist"""
        # Act: Get invitations
        response = client.get(
            "/api/v1/invitations/",
            headers=auth_headers
        )
        
        # Assert: Empty list returned
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_invitations_unauthenticated(self, client):
        """Test invitation retrieval without authentication"""
        # Act: Attempt to get invitations without auth
        response = client.get("/api/v1/invitations/")
        
        # Assert: Forbidden error (403 is returned for missing auth)
        assert response.status_code == 403


class TestInvitationAcceptance:
    """Test POST /api/v1/invitations/{invitation_id}/accept endpoint"""
    
    def test_accept_invitation_success(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test successful invitation acceptance with membership creation"""
        # Arrange: Create team and invitation for current user
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Accept invitation
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/accept",
            headers=auth_headers
        )
        
        # Assert: Successful acceptance
        assert response.status_code == 200
        assert "accepted successfully" in response.json()["message"]
        
        # Verify database state: invitation status updated
        db.refresh(invitation)
        assert invitation.status == InvitationStatus.ACCEPTED
        assert invitation.updated_at is not None
        
        # Verify database state: membership created
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == current_user.id
        ).first()
        assert membership is not None
        assert membership.role == TeamRole.MEMBER
    
    def test_accept_invitation_not_found(self, client, auth_headers):
        """Test accepting non-existent invitation"""
        # Act: Attempt to accept non-existent invitation
        response = client.post(
            f"/api/v1/invitations/{uuid.uuid4()}/accept",
            headers=auth_headers
        )
        
        # Assert: Not found error
        assert response.status_code == 404
        assert "not found or expired" in response.json()["detail"]
    
    def test_accept_invitation_wrong_user(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test accepting invitation meant for different user"""
        # Arrange: Create invitation for different user
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email="different@example.com",  # Different email
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Attempt to accept invitation for different user
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/accept",
            headers=auth_headers
        )
        
        # Assert: Not found error (invitation not for current user)
        assert response.status_code == 404
        assert "not found or expired" in response.json()["detail"]
    
    def test_accept_expired_invitation(self, client, db, auth_headers, current_user):
        """Test accepting expired invitation"""
        # Arrange: Create expired invitation
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # Expired
        )
        db.add(invitation)
        db.commit()
        
        # Act: Attempt to accept expired invitation
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/accept",
            headers=auth_headers
        )
        
        # Assert: Not found error (expired)
        assert response.status_code == 404
        assert "not found or expired" in response.json()["detail"]
    
    def test_accept_invitation_already_member(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test accepting invitation when already a team member"""
        # Arrange: Create team, invitation, and existing membership
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        # Create existing membership
        existing_membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.MEMBER
        )
        db.add(existing_membership)
        
        # Create invitation
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.LEAD,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Attempt to accept invitation while already a member
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/accept",
            headers=auth_headers
        )
        
        # Assert: Already member error
        assert response.status_code == 400
        assert "already a member" in response.json()["detail"]
    
    def test_accept_invitation_unauthenticated(self, client):
        """Test invitation acceptance without authentication"""
        # Act: Attempt to accept invitation without auth
        response = client.post(f"/api/v1/invitations/{uuid.uuid4()}/accept")
        
        # Assert: Forbidden error (403 is returned for missing auth)
        assert response.status_code == 403


class TestInvitationDecline:
    """Test POST /api/v1/invitations/{invitation_id}/decline endpoint"""
    
    def test_decline_invitation_success(self, client, db, auth_headers, current_user):
        """Test successful invitation decline"""
        # Arrange: Create team and invitation for current user
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Decline invitation
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/decline",
            headers=auth_headers
        )
        
        # Assert: Successful decline
        assert response.status_code == 200
        assert "declined successfully" in response.json()["message"]
        
        # Verify database state: invitation status updated
        db.refresh(invitation)
        assert invitation.status == InvitationStatus.DECLINED
        assert invitation.updated_at is not None
        
        # Verify no membership created
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == current_user.id
        ).first()
        assert membership is None
    
    def test_decline_invitation_not_found(self, client, auth_headers):
        """Test declining non-existent invitation"""
        # Act: Attempt to decline non-existent invitation
        response = client.post(
            f"/api/v1/invitations/{uuid.uuid4()}/decline",
            headers=auth_headers
        )
        
        # Assert: Not found error
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_decline_invitation_wrong_user(self, client, db, auth_headers, current_user):
        """Test declining invitation meant for different user"""
        # Arrange: Create invitation for different user
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email="different@example.com",  # Different email
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        db.add(invitation)
        db.commit()
        
        # Act: Attempt to decline invitation for different user
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/decline",
            headers=auth_headers
        )
        
        # Assert: Not found error (invitation not for current user)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_decline_invitation_accepts_expired(self, client, db, auth_headers, current_user):
        """Test that decline works even for expired invitations (unlike accept)"""
        # Arrange: Create expired invitation
        team = create_test_team(db, name="Test Team")
        inviter = create_test_user(db, email="inviter@example.com")
        
        invitation = TeamInvitation(
            team_id=team.id,
            email=current_user.email,
            role=TeamRole.MEMBER,
            invited_by=inviter.id,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # Expired
        )
        db.add(invitation)
        db.commit()
        
        # Act: Decline expired invitation (should work per API logic)
        response = client.post(
            f"/api/v1/invitations/{invitation.id}/decline",
            headers=auth_headers
        )
        
        # Assert: Successful decline (decline doesn't check expiration)
        assert response.status_code == 200
        assert "declined successfully" in response.json()["message"]
        
        # Verify status updated
        db.refresh(invitation)
        assert invitation.status == InvitationStatus.DECLINED
    
    def test_decline_invitation_unauthenticated(self, client):
        """Test invitation decline without authentication"""
        # Act: Attempt to decline invitation without auth
        response = client.post(f"/api/v1/invitations/{uuid.uuid4()}/decline")
        
        # Assert: Forbidden error (403 is returned for missing auth)
        assert response.status_code == 403


class TestInvitationWorkflows:
    """Test complete invitation workflows end-to-end"""
    
    def test_complete_invitation_workflow_accept(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test complete workflow: create → retrieve → accept"""
        # Arrange: Create team and make current_user admin
        team = create_test_team(db, name="Workflow Team")
        admin_membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(admin_membership)
        
        # Create invitee user
        invitee = create_test_user(db, email="invitee@example.com")
        db.commit()
        
        # Step 1: Create invitation
        invitation_data = {
            "team_id": str(team.id),
            "email": "invitee@example.com",
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        create_response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        invitation_id = create_response.json()["id"]
        
        # Step 2: Create auth headers for invitee
        invitee_token = create_access_token(data={"sub": str(invitee.id)})
        invitee_headers = {
            "Authorization": f"Bearer {invitee_token}",
            "Content-Type": "application/json"
        }
        
        # Step 3: Invitee retrieves their invitations
        get_response = client.get(
            "/api/v1/invitations/",
            headers=invitee_headers
        )
        assert get_response.status_code == 200
        invitations = get_response.json()
        assert len(invitations) == 1
        assert invitations[0]["id"] == invitation_id
        
        # Step 4: Invitee accepts invitation
        accept_response = client.post(
            f"/api/v1/invitations/{invitation_id}/accept",
            headers=invitee_headers
        )
        assert accept_response.status_code == 200
        
        # Step 5: Verify final state
        # Invitation should be accepted
        invitation = db.query(TeamInvitation).filter(
            TeamInvitation.id == uuid.UUID(invitation_id)
        ).first()
        assert invitation.status == InvitationStatus.ACCEPTED
        
        # Membership should be created
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == invitee.id
        ).first()
        assert membership is not None
        assert membership.role == TeamRole.MEMBER
        
        # Invitation should no longer appear in pending list
        final_get_response = client.get(
            "/api/v1/invitations/",
            headers=invitee_headers
        )
        assert final_get_response.status_code == 200
        assert len(final_get_response.json()) == 0
    
    def test_complete_invitation_workflow_decline(self, client, db, auth_headers, current_user, test_rate_limits):
        """Test complete workflow: create → retrieve → decline"""
        # Arrange: Create team and make current_user admin
        team = create_test_team(db, name="Workflow Team")
        admin_membership = TeamMembership(
            team_id=team.id,
            user_id=current_user.id,
            role=TeamRole.TEAM_ADMIN
        )
        db.add(admin_membership)
        
        # Create invitee user
        invitee = create_test_user(db, email="invitee@example.com")
        db.commit()
        
        # Create and decline invitation (abbreviated workflow)
        invitation_data = {
            "team_id": str(team.id),
            "email": "invitee@example.com",
            "role": "member",
            "invited_by": str(current_user.id)
        }
        
        create_response = client.post(
            "/api/v1/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        invitation_id = create_response.json()["id"]
        
        # Create invitee auth headers
        invitee_token = create_access_token(data={"sub": str(invitee.id)})
        invitee_headers = {
            "Authorization": f"Bearer {invitee_token}",
            "Content-Type": "application/json"
        }
        
        # Decline invitation
        decline_response = client.post(
            f"/api/v1/invitations/{invitation_id}/decline",
            headers=invitee_headers
        )
        assert decline_response.status_code == 200
        
        # Verify final state: declined, no membership
        invitation = db.query(TeamInvitation).filter(
            TeamInvitation.id == uuid.UUID(invitation_id)
        ).first()
        assert invitation.status == InvitationStatus.DECLINED
        
        membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team.id,
            TeamMembership.user_id == invitee.id
        ).first()
        assert membership is None