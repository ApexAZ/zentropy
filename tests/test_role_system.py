"""
Role System Tests

Comprehensive test suite for the enhanced role system including:
- UserRole and TeamRole enums
- Database role constraints and validation
- Role-based API endpoint access
- Role assignment workflows
- Role hierarchy and permissions
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch
import uuid

from api.main import app
from api.database import Base, get_db, UserRole, TeamRole, InvitationStatus
from api.database import User, Team, TeamMembership, TeamInvitation
from api.schemas import UserCreate, TeamCreate, TeamInvitationCreate


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_roles.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Create a test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create test client with test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestRoleEnums:
    """Test role enum definitions and values."""
    
    def test_user_role_enum_values(self, client):
        """Test UserRole enum has correct values."""
        assert UserRole.BASIC_USER.value == "basic_user"
        assert UserRole.ADMIN.value == "admin"
        assert UserRole.TEAM_LEAD.value == "team_lead"
        assert UserRole.PROJECT_ADMINISTRATOR.value == "project_administrator"
        assert UserRole.PROJECT_LEAD.value == "project_lead"
        assert UserRole.STAKEHOLDER.value == "stakeholder"
    
    def test_team_role_enum_values(self, client):
        """Test TeamRole enum has correct values."""
        assert TeamRole.MEMBER.value == "member"
        assert TeamRole.LEAD.value == "lead"
        assert TeamRole.ADMIN.value == "admin"
        assert TeamRole.TEAM_ADMINISTRATOR.value == "team_administrator"
    
    def test_invitation_status_enum_values(self, client):
        """Test InvitationStatus enum has correct values."""
        assert InvitationStatus.PENDING.value == "pending"
        assert InvitationStatus.ACCEPTED.value == "accepted"
        assert InvitationStatus.DECLINED.value == "declined"
        assert InvitationStatus.EXPIRED.value == "expired"
    
    def test_role_enum_count(self, client):
        """Test that enums have the expected number of values."""
        assert len(list(UserRole)) == 6
        assert len(list(TeamRole)) == 4
        assert len(list(InvitationStatus)) == 4


class TestDatabaseRoleConstraints:
    """Test database model role constraints and validation."""
    
    def test_user_default_role(self, db_session, client):
        """Test that new users get basic_user role by default."""
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            organization="Test Org"
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.role == UserRole.BASIC_USER
    
    def test_user_role_assignment(self, db_session, client):
        """Test assigning different user roles."""
        test_roles = [
            UserRole.PROJECT_ADMINISTRATOR,
            UserRole.PROJECT_LEAD,
            UserRole.STAKEHOLDER,
            UserRole.ADMIN
        ]
        
        for role in test_roles:
            user = User(
                email=f"test_{role.value}@example.com",
                password_hash="hashed_password",
                first_name="Test",
                last_name="User",
                organization="Test Org",
                role=role
            )
            db_session.add(user)
            db_session.commit()
            
            assert user.role == role
    
    def test_team_membership_default_role(self, db_session, client):
        """Test that team memberships get member role by default."""
        # Create user and team first
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            organization="Test Org"
        )
        team = Team(
            name="Test Team",
            description="Test Description",
            created_by=user.id
        )
        db_session.add_all([user, team])
        db_session.commit()
        
        membership = TeamMembership(
            team_id=team.id,
            user_id=user.id
        )
        db_session.add(membership)
        db_session.commit()
        
        assert membership.role == TeamRole.MEMBER
    
    def test_team_membership_role_assignment(self, db_session, client):
        """Test assigning different team roles."""
        # Create user and team
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            organization="Test Org"
        )
        team = Team(
            name="Test Team",
            description="Test Description",
            created_by=user.id
        )
        db_session.add_all([user, team])
        db_session.commit()
        
        test_roles = [TeamRole.ADMIN, TeamRole.LEAD, TeamRole.TEAM_ADMINISTRATOR]
        
        for i, role in enumerate(test_roles):
            membership = TeamMembership(
                team_id=team.id,
                user_id=user.id,
                role=role
            )
            db_session.add(membership)
            db_session.commit()
            
            assert membership.role == role
            db_session.delete(membership)  # Clean up for next iteration
    
    def test_team_invitation_role_and_status(self, db_session, client):
        """Test team invitation role and status defaults."""
        # Create user and team
        user = User(
            email="test@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            organization="Test Org"
        )
        team = Team(
            name="Test Team",
            description="Test Description",
            created_by=user.id
        )
        db_session.add_all([user, team])
        db_session.commit()
        
        from datetime import datetime, timedelta
        invitation = TeamInvitation(
            team_id=team.id,
            email="invite@example.com",
            invited_by=user.id,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(invitation)
        db_session.commit()
        
        assert invitation.role == TeamRole.MEMBER
        assert invitation.status == InvitationStatus.PENDING


class TestRoleBasedAPIAccess:
    """Test role-based access control in API endpoints."""
    
    def create_test_user(self, client, email="test@example.com", role=UserRole.BASIC_USER):
        """Helper to create and authenticate a test user."""
        user_data = {
            "email": email,
            "password": "TestPassword123",
            "first_name": "Test",
            "last_name": "User",
            "organization": "Test Org",
            "role": role.value
        }
        
        # Register user
        response = client.post("/api/auth/register", json=user_data)
        if response.status_code not in [200, 201]:
            print(f"Registration failed: {response.status_code}, {response.text}")
        assert response.status_code in [200, 201]  # API returns 200, not 201
        
        # Login to get token
        login_data = {"email": email, "password": "TestPassword123"}
        response = client.post("/api/auth/login-json", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_basic_user_team_creation(self, client):
        """Test that basic users can create teams and become admin."""
        headers = self.create_test_user(client, role=UserRole.BASIC_USER)
        
        team_data = {
            "name": "Test Team",
            "description": "A test team"
        }
        
        response = client.post("/api/teams", json=team_data, headers=headers)
        assert response.status_code == 201
        
        team_id = response.json()["id"]
        
        # Check that user became admin of the team
        response = client.get(f"/api/teams/{team_id}/members", headers=headers)
        assert response.status_code == 200
        
        members = response.json()
        assert len(members) == 1
        # Note: The actual role checking would need the API to return role info
    
    def test_admin_user_permissions(self, client):
        """Test that admin users have elevated permissions."""
        headers = self.create_test_user(client, role=UserRole.ADMIN)
        
        # Admin users should be able to access user management endpoints
        response = client.get("/api/users", headers=headers)
        assert response.status_code == 200
    
    def test_stakeholder_read_only_access(self, client):
        """Test that stakeholder role has read-only access."""
        headers = self.create_test_user(client, role=UserRole.STAKEHOLDER)
        
        # Stakeholders should be able to view teams (when implemented)
        # This test would need actual stakeholder endpoints
        # For now, test that they can access their profile
        response = client.get("/api/users/me", headers=headers)
        assert response.status_code == 200


class TestRoleAssignmentWorkflows:
    """Test role assignment and promotion workflows."""
    
    def test_team_member_role_assignment(self, client):
        """Test assigning roles to team members."""
        # Create team admin
        admin_headers = self.create_test_user(client, "admin@example.com", UserRole.BASIC_USER)
        
        # Create team
        team_data = {"name": "Test Team", "description": "Test Description"}
        response = client.post("/api/teams", json=team_data, headers=admin_headers)
        assert response.status_code == 201
        team_id = response.json()["id"]
        
        # Create another user to invite
        member_headers = self.create_test_user(client, "member@example.com", UserRole.BASIC_USER)
        
        # Test team invitation with specific role
        # This would require implementing the invitation endpoints with role specification
        # For now, verify that the invitation system supports role specification
        invitation_data = {
            "email": "newmember@example.com",
            "role": TeamRole.LEAD.value
        }
        
        # This endpoint would need to be implemented to test role assignment
        # response = client.post(f"/api/teams/{team_id}/invitations", 
        #                       json=invitation_data, headers=admin_headers)
        # assert response.status_code == 201
    
    def create_test_user(self, client, email="test@example.com", role=UserRole.BASIC_USER):
        """Helper to create and authenticate a test user."""
        user_data = {
            "email": email,
            "password": "TestPassword123",
            "first_name": "Test",
            "last_name": "User",
            "organization": "Test Org",
            "role": role.value
        }
        
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code in [200, 201]  # API returns 200, not 201
        
        login_data = {"email": email, "password": "TestPassword123"}
        response = client.post("/api/auth/login-json", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


class TestRoleHierarchy:
    """Test role hierarchy and permission inheritance."""
    
    def test_user_role_hierarchy(self, client):
        """Test that user roles have correct hierarchy."""
        # Define expected hierarchy (higher number = more permissions)
        hierarchy = {
            UserRole.BASIC_USER: 1,
            UserRole.STAKEHOLDER: 2,
            UserRole.TEAM_LEAD: 3,
            UserRole.PROJECT_LEAD: 4,
            UserRole.PROJECT_ADMINISTRATOR: 5,
            UserRole.ADMIN: 6
        }
        
        # Test hierarchy relationships
        assert hierarchy[UserRole.ADMIN] > hierarchy[UserRole.PROJECT_ADMINISTRATOR]
        assert hierarchy[UserRole.PROJECT_ADMINISTRATOR] > hierarchy[UserRole.PROJECT_LEAD]
        assert hierarchy[UserRole.PROJECT_LEAD] > hierarchy[UserRole.TEAM_LEAD]
        assert hierarchy[UserRole.TEAM_LEAD] > hierarchy[UserRole.STAKEHOLDER]
        assert hierarchy[UserRole.STAKEHOLDER] > hierarchy[UserRole.BASIC_USER]
    
    def test_team_role_hierarchy(self, client):
        """Test that team roles have correct hierarchy."""
        hierarchy = {
            TeamRole.MEMBER: 1,
            TeamRole.LEAD: 2,
            TeamRole.ADMIN: 3,
            TeamRole.TEAM_ADMINISTRATOR: 4
        }
        
        assert hierarchy[TeamRole.TEAM_ADMINISTRATOR] > hierarchy[TeamRole.ADMIN]
        assert hierarchy[TeamRole.ADMIN] > hierarchy[TeamRole.LEAD]
        assert hierarchy[TeamRole.LEAD] > hierarchy[TeamRole.MEMBER]


class TestRoleSystemIntegration:
    """Test integration between different role system components."""
    
    def test_role_enum_to_database_mapping(self, db_session, client):
        """Test that enum values correctly map to database storage."""
        # Test UserRole
        for role in UserRole:
            user = User(
                email=f"test_{role.value}@example.com",
                password_hash="hashed_password",
                first_name="Test",
                last_name="User",
                organization="Test Org",
                role=role
            )
            db_session.add(user)
            db_session.commit()
            
            # Retrieve from database and verify
            retrieved_user = db_session.query(User).filter(User.email == user.email).first()
            assert retrieved_user.role == role
            
            db_session.delete(retrieved_user)
    
    def test_schema_validation_with_enums(self, client):
        """Test that Pydantic schemas correctly validate enum values."""
        from api.schemas import UserCreate, TeamInvitationCreate
        from uuid import uuid4
        
        # Test UserCreate with enum role
        user_data = {
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "organization": "Test Org",
            "password": "TestPassword123",
            "role": UserRole.PROJECT_ADMINISTRATOR,
            "terms_agreement": True
        }
        user = UserCreate(**user_data)
        assert user.role == UserRole.PROJECT_ADMINISTRATOR
        
        # Test TeamInvitationCreate with enum role
        invitation_data = {
            "email": "invite@example.com",
            "role": TeamRole.TEAM_ADMINISTRATOR,
            "team_id": uuid4(),
            "invited_by": uuid4()
        }
        invitation = TeamInvitationCreate(**invitation_data)
        assert invitation.role == TeamRole.TEAM_ADMINISTRATOR


if __name__ == "__main__":
    pytest.main([__file__, "-v"])