"""
API Endpoints Testing Suite

Comprehensive tests for all FastAPI endpoints across all routers.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import json
from datetime import datetime, timedelta

from api.main import app
from api.database import User, Team, CalendarEntry
from api.auth import create_access_token


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create a test user object."""
    user = Mock(spec=User)
    user.id = "123e4567-e89b-12d3-a456-426614174000"
    user.email = "test@example.com"
    user.username = "testuser"
    user.hashed_password = "$2b$12$test_hash"
    user.is_active = True
    user.is_verified = True
    user.created_at = datetime.utcnow()
    return user


@pytest.fixture
def test_team():
    """Create a test team object."""
    team = Mock(spec=Team)
    team.id = "223e4567-e89b-12d3-a456-426614174000"
    team.name = "Test Team"
    team.description = "A test team"
    team.owner_id = "123e4567-e89b-12d3-a456-426614174000"
    team.created_at = datetime.utcnow()
    return team


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers with valid JWT token."""
    token_data = {"sub": test_user.email}
    access_token = create_access_token(token_data)
    return {"Authorization": f"Bearer {access_token}"}


class TestAuthenticationEndpoints:
    """Test authentication-related API endpoints."""
    
    @patch('api.routers.auth.authenticate_user')
    @patch('api.routers.auth.create_access_token')
    def test_login_json_valid_credentials(self, mock_create_token, mock_auth, client, test_user):
        """Test /api/auth/login-json with valid credentials."""
        mock_auth.return_value = test_user
        mock_create_token.return_value = "fake_access_token"
        
        response = client.post(
            "/api/auth/login-json",
            json={
                "email": "test@example.com",
                "password": "correct_password"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "fake_access_token"
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        mock_auth.assert_called_once()
        mock_create_token.assert_called_once()
    
    @patch('api.routers.auth.authenticate_user')
    def test_login_json_invalid_credentials(self, mock_auth, client):
        """Test /api/auth/login-json with invalid credentials."""
        mock_auth.return_value = False
        
        response = client.post(
            "/api/auth/login-json",
            json={
                "email": "test@example.com",
                "password": "wrong_password"
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    def test_login_json_missing_fields(self, client):
        """Test /api/auth/login-json with missing required fields."""
        # Missing password
        response = client.post(
            "/api/auth/login-json",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 422
        
        # Missing email
        response = client.post(
            "/api/auth/login-json",
            json={"password": "password123"}
        )
        assert response.status_code == 422
        
        # Empty body
        response = client.post("/api/auth/login-json", json={})
        assert response.status_code == 422
    
    @patch('api.routers.auth.get_user_by_email')
    @patch('api.routers.auth.create_user')
    def test_register_new_user(self, mock_create_user, mock_get_user, client, test_user):
        """Test /api/auth/register with new user."""
        mock_get_user.return_value = None  # User doesn't exist
        mock_create_user.return_value = test_user
        
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "StrongPassword123!"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "User registered successfully"
        assert "user" in data
        
        mock_create_user.assert_called_once()
    
    @patch('api.routers.auth.get_user_by_email')
    def test_register_existing_user(self, mock_get_user, client, test_user):
        """Test /api/auth/register with existing user."""
        mock_get_user.return_value = test_user  # User already exists
        
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "StrongPassword123!"
            }
        )
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_register_weak_password(self, client):
        """Test /api/auth/register with weak password."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "weak"
            }
        )
        
        assert response.status_code == 400
        assert "Password does not meet requirements" in response.json()["detail"]
    
    def test_logout(self, client):
        """Test /api/auth/logout endpoint."""
        response = client.post("/api/auth/logout")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"


class TestUserEndpoints:
    """Test user management API endpoints."""
    
    @patch('api.routers.users.get_current_active_user')
    def test_get_current_user_me(self, mock_get_user, client, test_user, auth_headers):
        """Test GET /api/users/me endpoint."""
        mock_get_user.return_value = test_user
        
        response = client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
    
    def test_get_current_user_unauthorized(self, client):
        """Test GET /api/users/me without authentication."""
        response = client.get("/api/users/me")
        
        assert response.status_code == 401
    
    @patch('api.routers.users.get_current_active_user')
    @patch('api.routers.users.update_user_profile')
    def test_update_profile(self, mock_update, mock_get_user, client, test_user, auth_headers):
        """Test PUT /api/users/me endpoint."""
        mock_get_user.return_value = test_user
        updated_user = Mock(spec=User)
        updated_user.email = test_user.email
        updated_user.username = "updated_username"
        mock_update.return_value = updated_user
        
        response = client.put(
            "/api/users/me",
            headers=auth_headers,
            json={"username": "updated_username"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updated_username"
        
        mock_update.assert_called_once()
    
    @patch('api.routers.users.get_current_active_user')
    @patch('api.routers.users.verify_password')
    @patch('api.routers.users.update_user_password')
    def test_change_password_valid(self, mock_update_pass, mock_verify, mock_get_user, 
                                 client, test_user, auth_headers):
        """Test POST /api/users/change-password with valid current password."""
        mock_get_user.return_value = test_user
        mock_verify.return_value = True
        mock_update_pass.return_value = True
        
        response = client.post(
            "/api/users/change-password",
            headers=auth_headers,
            json={
                "current_password": "old_password",
                "new_password": "NewStrongPassword123!"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully"
    
    @patch('api.routers.users.get_current_active_user')
    @patch('api.routers.users.verify_password')
    def test_change_password_invalid_current(self, mock_verify, mock_get_user, 
                                           client, test_user, auth_headers):
        """Test POST /api/users/change-password with invalid current password."""
        mock_get_user.return_value = test_user
        mock_verify.return_value = False
        
        response = client.post(
            "/api/users/change-password",
            headers=auth_headers,
            json={
                "current_password": "wrong_password",
                "new_password": "NewStrongPassword123!"
            }
        )
        
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
    
    @patch('api.routers.users.get_current_active_user')
    def test_change_password_weak_new_password(self, mock_get_user, client, test_user, auth_headers):
        """Test POST /api/users/change-password with weak new password."""
        mock_get_user.return_value = test_user
        
        response = client.post(
            "/api/users/change-password",
            headers=auth_headers,
            json={
                "current_password": "old_password",
                "new_password": "weak"
            }
        )
        
        assert response.status_code == 400
        assert "Password does not meet requirements" in response.json()["detail"]
    
    @patch('api.routers.users.get_user_by_email')
    def test_check_email_availability_available(self, mock_get_user, client):
        """Test GET /api/users/check-email with available email."""
        mock_get_user.return_value = None
        
        response = client.get("/api/users/check-email?email=available@example.com")
        
        assert response.status_code == 200
        assert response.json()["available"] is True
    
    @patch('api.routers.users.get_user_by_email')
    def test_check_email_availability_taken(self, mock_get_user, client, test_user):
        """Test GET /api/users/check-email with taken email."""
        mock_get_user.return_value = test_user
        
        response = client.get("/api/users/check-email?email=taken@example.com")
        
        assert response.status_code == 200
        assert response.json()["available"] is False
    
    def test_check_email_availability_invalid_email(self, client):
        """Test GET /api/users/check-email with invalid email format."""
        response = client.get("/api/users/check-email?email=invalid-email")
        
        assert response.status_code == 422


class TestTeamEndpoints:
    """Test team management API endpoints."""
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.get_user_teams')
    def test_get_user_teams(self, mock_get_teams, mock_get_user, client, test_user, test_team, auth_headers):
        """Test GET /api/teams/ endpoint."""
        mock_get_user.return_value = test_user
        mock_get_teams.return_value = [test_team]
        
        response = client.get("/api/teams/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == test_team.name
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.create_team')
    def test_create_team(self, mock_create_team, mock_get_user, client, test_user, test_team, auth_headers):
        """Test POST /api/teams/ endpoint."""
        mock_get_user.return_value = test_user
        mock_create_team.return_value = test_team
        
        response = client.post(
            "/api/teams/",
            headers=auth_headers,
            json={
                "name": "New Team",
                "description": "A new team for testing"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == test_team.name
        
        mock_create_team.assert_called_once()
    
    def test_create_team_unauthorized(self, client):
        """Test POST /api/teams/ without authentication."""
        response = client.post(
            "/api/teams/",
            json={
                "name": "New Team",
                "description": "A new team"
            }
        )
        
        assert response.status_code == 401
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.get_team_by_id')
    def test_get_team_by_id(self, mock_get_team, mock_get_user, client, test_user, test_team, auth_headers):
        """Test GET /api/teams/{team_id} endpoint."""
        mock_get_user.return_value = test_user
        mock_get_team.return_value = test_team
        
        response = client.get(f"/api/teams/{test_team.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == test_team.name
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.get_team_by_id')
    def test_get_team_by_id_not_found(self, mock_get_team, mock_get_user, client, test_user, auth_headers):
        """Test GET /api/teams/{team_id} with non-existent team."""
        mock_get_user.return_value = test_user
        mock_get_team.return_value = None
        
        response = client.get("/api/teams/nonexistent-id", headers=auth_headers)
        
        assert response.status_code == 404
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.get_team_by_id')
    @patch('api.routers.teams.update_team')
    def test_update_team(self, mock_update_team, mock_get_team, mock_get_user, 
                        client, test_user, test_team, auth_headers):
        """Test PUT /api/teams/{team_id} endpoint."""
        mock_get_user.return_value = test_user
        mock_get_team.return_value = test_team
        updated_team = Mock(spec=Team)
        updated_team.name = "Updated Team Name"
        updated_team.description = test_team.description
        mock_update_team.return_value = updated_team
        
        response = client.put(
            f"/api/teams/{test_team.id}",
            headers=auth_headers,
            json={"name": "Updated Team Name"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Team Name"
    
    @patch('api.routers.teams.get_current_active_user')
    @patch('api.routers.teams.get_team_by_id')
    @patch('api.routers.teams.delete_team')
    def test_delete_team(self, mock_delete_team, mock_get_team, mock_get_user, 
                        client, test_user, test_team, auth_headers):
        """Test DELETE /api/teams/{team_id} endpoint."""
        mock_get_user.return_value = test_user
        mock_get_team.return_value = test_team
        mock_delete_team.return_value = True
        
        response = client.delete(f"/api/teams/{test_team.id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json()["message"] == "Team deleted successfully"


class TestCalendarEndpoints:
    """Test calendar entry API endpoints."""
    
    @pytest.fixture
    def test_calendar_entry(self, test_user, test_team):
        """Create a test calendar entry."""
        entry = Mock(spec=CalendarEntry)
        entry.id = "323e4567-e89b-12d3-a456-426614174000"
        entry.title = "Test PTO"
        entry.description = "Test PTO entry"
        entry.start_date = datetime(2025, 7, 15).date()
        entry.end_date = datetime(2025, 7, 16).date()
        entry.entry_type = "PTO"
        entry.user_id = test_user.id
        entry.team_id = test_team.id
        entry.created_at = datetime.utcnow()
        return entry
    
    @patch('api.routers.calendar_entries.get_current_active_user')
    @patch('api.routers.calendar_entries.get_calendar_entries')
    def test_get_calendar_entries(self, mock_get_entries, mock_get_user, client, 
                                 test_user, test_calendar_entry, auth_headers):
        """Test GET /api/calendar-entries/ endpoint."""
        mock_get_user.return_value = test_user
        mock_get_entries.return_value = [test_calendar_entry]
        
        response = client.get("/api/calendar-entries/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == test_calendar_entry.title
    
    @patch('api.routers.calendar_entries.get_current_active_user')
    @patch('api.routers.calendar_entries.create_calendar_entry')
    def test_create_calendar_entry(self, mock_create_entry, mock_get_user, client, 
                                  test_user, test_calendar_entry, auth_headers):
        """Test POST /api/calendar-entries/ endpoint."""
        mock_get_user.return_value = test_user
        mock_create_entry.return_value = test_calendar_entry
        
        response = client.post(
            "/api/calendar-entries/",
            headers=auth_headers,
            json={
                "title": "New PTO",
                "description": "New PTO entry",
                "start_date": "2025-07-15",
                "end_date": "2025-07-16",
                "entry_type": "PTO",
                "team_id": "223e4567-e89b-12d3-a456-426614174000"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == test_calendar_entry.title
    
    def test_create_calendar_entry_invalid_dates(self, client, auth_headers):
        """Test POST /api/calendar-entries/ with invalid date range."""
        response = client.post(
            "/api/calendar-entries/",
            headers=auth_headers,
            json={
                "title": "Invalid Entry",
                "start_date": "2025-07-16",
                "end_date": "2025-07-15",  # End before start
                "entry_type": "PTO",
                "team_id": "223e4567-e89b-12d3-a456-426614174000"
            }
        )
        
        assert response.status_code == 400
    
    @patch('api.routers.calendar_entries.get_current_active_user')
    @patch('api.routers.calendar_entries.get_calendar_entry_by_id')
    @patch('api.routers.calendar_entries.update_calendar_entry')
    def test_update_calendar_entry(self, mock_update_entry, mock_get_entry, mock_get_user, 
                                  client, test_user, test_calendar_entry, auth_headers):
        """Test PUT /api/calendar-entries/{entry_id} endpoint."""
        mock_get_user.return_value = test_user
        mock_get_entry.return_value = test_calendar_entry
        updated_entry = Mock(spec=CalendarEntry)
        updated_entry.title = "Updated PTO"
        mock_update_entry.return_value = updated_entry
        
        response = client.put(
            f"/api/calendar-entries/{test_calendar_entry.id}",
            headers=auth_headers,
            json={"title": "Updated PTO"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated PTO"
    
    @patch('api.routers.calendar_entries.get_current_active_user')
    @patch('api.routers.calendar_entries.get_calendar_entry_by_id')
    @patch('api.routers.calendar_entries.delete_calendar_entry')
    def test_delete_calendar_entry(self, mock_delete_entry, mock_get_entry, mock_get_user, 
                                  client, test_user, test_calendar_entry, auth_headers):
        """Test DELETE /api/calendar-entries/{entry_id} endpoint."""
        mock_get_user.return_value = test_user
        mock_get_entry.return_value = test_calendar_entry
        mock_delete_entry.return_value = True
        
        response = client.delete(f"/api/calendar-entries/{test_calendar_entry.id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert response.json()["message"] == "Calendar entry deleted successfully"


class TestHealthAndMiscEndpoints:
    """Test health check and miscellaneous endpoints."""
    
    def test_health_check(self, client):
        """Test GET /health endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    def test_root_endpoint(self, client):
        """Test GET / endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data