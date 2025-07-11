"""
Tests for User API Endpoints

These tests verify the user management system with comprehensive coverage of:
- User profile retrieval and management
- User profile updates with validation
- Password management with history and validation
- Admin user operations with role-based permissions
- Error handling and edge cases

All tests use the mandatory isolated test database system for reliability.
"""

import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import User, PasswordHistory, UserRole, RegistrationType, AuthProvider
from api.schemas import UserUpdate, PasswordUpdate
from tests.conftest import create_test_user


class TestUserRetrieval:
    """Test GET endpoints - user listing and profiles"""
    
    def test_get_all_users_success(self, client, db, auth_headers, current_user):
        """Test retrieving all users"""
        # Arrange: Create additional test users
        user2 = create_test_user(db, email="user2@example.com")
        user3 = create_test_user(db, email="user3@example.com")
        
        # Act: Get all users
        response = client.get(
            "/api/v1/users/",
            headers=auth_headers
        )
        
        # Assert: Verify user list
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3  # At least current_user + 2 created users
        
        # Verify current user is in the list
        user_emails = [user["email"] for user in data]
        assert current_user.email in user_emails
        assert "user2@example.com" in user_emails
        assert "user3@example.com" in user_emails
    
    def test_get_current_user_profile_success(self, client, auth_headers, current_user):
        """Test retrieving current user profile"""
        # Act: Get current user profile
        response = client.get(
            "/api/v1/users/me",
            headers=auth_headers
        )
        
        # Assert: Verify profile data
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(current_user.id)
        assert data["email"] == current_user.email
        assert data["first_name"] == current_user.first_name
        assert data["last_name"] == current_user.last_name
        assert data["role"] == current_user.role.value
        assert "password_hash" not in data  # Sensitive data excluded
    
    def test_get_user_by_id_success(self, client, db, auth_headers):
        """Test retrieving user by ID"""
        # Arrange: Create test user
        target_user = create_test_user(db, email="target@example.com")
        
        # Act: Get user by ID
        response = client.get(
            f"/api/v1/users/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Verify user data
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(target_user.id)
        assert data["email"] == "target@example.com"
        assert data["first_name"] == target_user.first_name
    
    def test_get_user_by_id_not_found(self, client, auth_headers):
        """Test retrieving non-existent user"""
        # Act: Attempt to get non-existent user
        response = client.get(
            f"/api/v1/users/{uuid.uuid4()}",
            headers=auth_headers
        )
        
        # Assert: User not found error
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    def test_get_users_unauthenticated(self, client):
        """Test user endpoints without authentication"""
        endpoints = [
            "/api/v1/users/",
            "/api/v1/users/me",
            f"/api/v1/users/{uuid.uuid4()}"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 403  # Forbidden without auth


class TestUserProfileUpdate:
    """Test PUT /me - current user profile updates"""
    
    def test_update_current_user_profile_success(self, client, db, auth_headers, current_user):
        """Test successful profile update"""
        # Arrange: Update data
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "organization_id": None
        }
        
        # Act: Update profile
        response = client.put(
            "/api/v1/users/me",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["organization_id"] is None
        
        # Verify database state
        db.refresh(current_user)
        assert current_user.first_name == "Updated"
        assert current_user.last_name == "Name"
        assert current_user.updated_at is not None
    
    def test_update_current_user_email_success(self, client, db, auth_headers, current_user):
        """Test successful email update with case normalization"""
        # Arrange: Update data with mixed case email
        update_data = {
            "email": "NEW.Email@Example.COM"
        }
        
        # Act: Update email
        response = client.put(
            "/api/v1/users/me",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful update with normalized email
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "new.email@example.com"
        
        # Verify database state
        db.refresh(current_user)
        assert current_user.email == "new.email@example.com"
    
    def test_update_current_user_email_already_exists(self, client, db, auth_headers, current_user):
        """Test email update with duplicate email"""
        # Arrange: Create another user with target email
        existing_user = create_test_user(db, email="existing@example.com")
        
        update_data = {
            "email": "existing@example.com"
        }
        
        # Act: Attempt to update to existing email
        response = client.put(
            "/api/v1/users/me",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Email already registered error
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
        
        # Verify email unchanged
        db.refresh(current_user)
        assert current_user.email != "existing@example.com"
    
    def test_update_current_user_partial_update(self, client, auth_headers, current_user):
        """Test partial profile update (only some fields)"""
        original_email = current_user.email
        original_last_name = current_user.last_name
        
        # Arrange: Update only first name
        update_data = {
            "first_name": "OnlyFirstName"
        }
        
        # Act: Update profile
        response = client.put(
            "/api/v1/users/me",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Only first name changed
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "OnlyFirstName"
        assert data["email"] == original_email  # Unchanged
        assert data["last_name"] == original_last_name  # Unchanged
    
    def test_update_current_user_unauthenticated(self, client):
        """Test profile update without authentication"""
        update_data = {"first_name": "Test"}
        
        # Act: Attempt to update without auth
        response = client.put(
            "/api/v1/users/me",
            json=update_data
        )
        
        # Assert: Forbidden error
        assert response.status_code == 403


class TestAdminUserOperations:
    """Test PUT /{id} and DELETE /{id} - admin operations"""
    
    def test_update_user_as_admin_success(self, client, db, admin_user):
        """Test admin updating another user"""
        # Arrange: Create target user and admin auth headers
        target_user = create_test_user(db, email="target@example.com")
        
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {
            "first_name": "AdminUpdated",
            "role": "basic_user",
            "is_active": False
        }
        
        # Act: Update user as admin
        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json=update_data,
            headers=admin_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "AdminUpdated"
        assert data["role"] == "basic_user"
        assert data["is_active"] is False
        
        # Verify database state
        db.refresh(target_user)
        assert target_user.first_name == "AdminUpdated"
        assert target_user.role == UserRole.BASIC_USER
        assert target_user.is_active is False
    
    def test_update_user_as_team_lead_success(self, client, db):
        """Test team lead updating another user"""
        # Arrange: Create team lead user and target user
        team_lead = create_test_user(
            db,
            email="teamlead@example.com",
            role=UserRole.TEAM_LEAD
        )
        target_user = create_test_user(db, email="target@example.com")
        
        from api.auth import create_access_token
        lead_token = create_access_token(data={"sub": str(team_lead.id)})
        lead_headers = {
            "Authorization": f"Bearer {lead_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {"first_name": "LeadUpdated"}
        
        # Act: Update user as team lead
        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json=update_data,
            headers=lead_headers
        )
        
        # Assert: Verify successful update
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "LeadUpdated"
    
    def test_update_user_insufficient_permissions(self, client, db, auth_headers, current_user):
        """Test regular user attempting to update another user"""
        # Arrange: Create target user (current_user is BASIC_USER by default)
        target_user = create_test_user(db, email="target@example.com")
        
        update_data = {"first_name": "ShouldFail"}
        
        # Act: Attempt to update as regular user
        response = client.put(
            f"/api/v1/users/{target_user.id}",
            json=update_data,
            headers=auth_headers
        )
        
        # Assert: Insufficient permissions error
        assert response.status_code == 403
        assert "Not enough permissions" in response.json()["detail"]
    
    def test_update_user_not_found(self, client, admin_user):
        """Test admin updating non-existent user"""
        # Arrange: Admin auth headers
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        update_data = {"first_name": "NotFound"}
        
        # Act: Attempt to update non-existent user
        response = client.put(
            f"/api/v1/users/{uuid.uuid4()}",
            json=update_data,
            headers=admin_headers
        )
        
        # Assert: User not found error
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    def test_delete_user_as_admin_success(self, client, db, admin_user):
        """Test admin deleting another user"""
        # Arrange: Create target user and admin auth headers
        target_user = create_test_user(db, email="target@example.com")
        target_id = target_user.id
        
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Act: Delete user as admin
        response = client.delete(
            f"/api/v1/users/{target_user.id}",
            headers=admin_headers
        )
        
        # Assert: Verify successful deletion
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify user is deleted from database
        deleted_user = db.query(User).filter(User.id == target_id).first()
        assert deleted_user is None
    
    def test_delete_user_insufficient_permissions(self, client, db, auth_headers, current_user):
        """Test regular user attempting to delete another user"""
        # Arrange: Create target user
        target_user = create_test_user(db, email="target@example.com")
        
        # Act: Attempt to delete as regular user
        response = client.delete(
            f"/api/v1/users/{target_user.id}",
            headers=auth_headers
        )
        
        # Assert: Insufficient permissions error
        assert response.status_code == 403
        assert "Not enough permissions" in response.json()["detail"]
    
    def test_delete_user_self_deletion_forbidden(self, client, admin_user):
        """Test admin attempting to delete their own account"""
        # Arrange: Admin auth headers
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Act: Attempt to delete own account
        response = client.delete(
            f"/api/v1/users/{admin_user.id}",
            headers=admin_headers
        )
        
        # Assert: Cannot delete own account error
        assert response.status_code == 400
        assert "Cannot delete your own account" in response.json()["detail"]
    
    def test_delete_user_not_found(self, client, admin_user):
        """Test admin deleting non-existent user"""
        # Arrange: Admin auth headers
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Act: Attempt to delete non-existent user
        response = client.delete(
            f"/api/v1/users/{uuid.uuid4()}",
            headers=admin_headers
        )
        
        # Assert: User not found error
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]


class TestPasswordManagement:
    """Test POST /me/change-password - complex password logic"""
    
    def test_change_password_success(self, client, db, user_with_known_password):
        """Test successful password change"""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Arrange: Password change data
        password_data = {
            "current_password": user_with_known_password.known_password,
            "new_password": "NewSecurePassword123!"
        }
        
        # Act: Change password
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=auth_headers
        )
        
        # Assert: Verify successful change
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
        assert response.status_code == 200
        assert "Password updated successfully" in response.json()["message"]
        
        # Verify password hash changed in database
        db.refresh(user_with_known_password)
        from api.auth import get_password_hash
        original_hash = get_password_hash(user_with_known_password.known_password)
        assert user_with_known_password.password_hash != original_hash
        
        # Verify password history entry created
        history_entry = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_with_known_password.id
        ).first()
        assert history_entry is not None
    
    def test_change_password_incorrect_current_password(self, client, user_with_known_password):
        """Test password change with incorrect current password"""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Arrange: Password change data with wrong current password
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "NewSecurePassword123!"
        }
        
        # Act: Attempt password change
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=auth_headers
        )
        
        # Assert: Current password incorrect error
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]
    
    def test_change_password_reuse_prevention(self, client, db, user_with_known_password):
        """Test password reuse prevention"""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Arrange: Create password history entry with new password hash
        from api.auth import get_password_hash
        new_password_hash = get_password_hash("NewPassword123!")
        
        history_entry = PasswordHistory(
            user_id=user_with_known_password.id,
            password_hash=new_password_hash
        )
        db.add(history_entry)
        db.commit()
        
        password_data = {
            "current_password": user_with_known_password.known_password,
            "new_password": "NewPassword123!"  # Same as in history
        }
        
        # Act: Attempt to reuse password
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=auth_headers
        )
        
        # Assert: Password reuse error
        assert response.status_code == 400
        assert "Password has been used recently" in response.json()["detail"]
    
    def test_change_password_creates_history_and_prevents_reuse(self, client, user_with_known_password, db):
        """Test that password changes create history entries and prevent immediate reuse"""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Act: Change password successfully
        password_data = {
            "current_password": user_with_known_password.known_password,
            "new_password": "NewPassword123!"
        }
        
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Act: Try to change back to the same password immediately
        reuse_data = {
            "current_password": "NewPassword123!",
            "new_password": "NewPassword123!"  # Same password
        }
        
        response = client.post(
            "/api/v1/users/me/change-password",
            json=reuse_data,
            headers=auth_headers
        )
        
        # Assert: Should prevent reuse of current password
        assert response.status_code == 400
        assert "been used recently" in response.json()["detail"].lower()
        
        # TODO: Add a test to verify that the password history cleanup logic
        # correctly removes old entries, keeping only the 5 most recent.
    
    def test_password_history_cleanup(self, client, db, user_with_known_password):
        """Test that password history is cleaned up, keeping only the 5 most recent."""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Change password 7 times to create history
        current_password = user_with_known_password.known_password
        for i in range(7):
            new_password = f"NewPassword{i}"
            password_data = {
                "current_password": current_password,
                "new_password": new_password
            }
            response = client.post(
                "/api/v1/users/me/change-password",
                json=password_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            current_password = new_password

        # Assert: Verify that only 5 password history entries exist
        history_count = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == user_with_known_password.id
        ).count()
        assert history_count == 5
    
    def test_change_password_weak_password(self, client, user_with_known_password):
        """Test password change with weak password"""
        # Arrange: Create auth headers for user with known password
        from api.auth import create_access_token
        token = create_access_token(data={"sub": str(user_with_known_password.id)})
        auth_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Note: This test depends on the validate_password_strength implementation
        password_data = {
            "current_password": user_with_known_password.known_password,
            "new_password": "123"  # Weak password
        }
        
        # Act: Attempt password change with weak password
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=auth_headers
        )
        
        # Assert: Password validation error (may be 400 or 422 depending on implementation)
        assert response.status_code in [400, 422]
        # Note: Specific error message depends on validate_password_strength implementation
    
    def test_change_password_unauthenticated(self, client):
        """Test password change without authentication"""
        password_data = {
            "current_password": "secret",
            "new_password": "NewPassword123!"
        }
        
        # Act: Attempt password change without auth
        response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data
        )
        
        # Assert: Forbidden error
        assert response.status_code == 403


class TestUserWorkflows:
    """Test complete user management workflows"""
    
    def test_complete_user_lifecycle_admin(self, client, db, admin_user):
        """Test complete workflow: create → update → delete (admin operations)"""
        # Arrange: Create admin auth headers
        from api.auth import create_access_token
        admin_token = create_access_token(data={"sub": str(admin_user.id)})
        admin_headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Step 1: Create user (using helper)
        target_user = create_test_user(db, email="lifecycle@example.com")
        original_name = target_user.first_name
        
        # Step 2: Admin updates user
        update_data = {
            "first_name": "UpdatedByAdmin",
            "is_active": False
        }
        
        update_response = client.put(
            f"/api/v1/users/{target_user.id}",
            json=update_data,
            headers=admin_headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["first_name"] == "UpdatedByAdmin"
        
        # Step 3: Verify user updated in database
        db.refresh(target_user)
        assert target_user.first_name == "UpdatedByAdmin"
        assert target_user.is_active is False
        
        # Step 4: Admin deletes user
        delete_response = client.delete(
            f"/api/v1/users/{target_user.id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200
        
        # Step 5: Verify user deleted
        deleted_user = db.query(User).filter(User.id == target_user.id).first()
        assert deleted_user is None
    
    def test_complete_profile_management_workflow(self, client, db, auth_headers, current_user):
        """Test complete workflow: profile update → password change"""
        original_email = current_user.email
        
        # Step 1: Update profile
        profile_data = {
            "first_name": "NewFirstName",
            "last_name": "NewLastName"
        }
        
        profile_response = client.put(
            "/api/v1/users/me",
            json=profile_data,
            headers=auth_headers
        )
        assert profile_response.status_code == 200
        assert profile_response.json()["first_name"] == "NewFirstName"
        
        # Step 2: Change password using a user with known password
        password_user = create_test_user(db, email="passworduser@example.com")
        from api.auth import get_password_hash, create_access_token
        known_password = "secret123"
        password_user.password_hash = get_password_hash(known_password)
        db.commit()
        
        # Create auth headers for password user
        password_token = create_access_token(data={"sub": str(password_user.id)})
        password_headers = {
            "Authorization": f"Bearer {password_token}",
            "Content-Type": "application/json"
        }
        
        password_data = {
            "current_password": known_password,
            "new_password": "NewSecurePassword123!"
        }
        
        password_response = client.post(
            "/api/v1/users/me/change-password",
            json=password_data,
            headers=password_headers
        )
        assert password_response.status_code == 200
        
        # Step 3: Verify final state
        db.refresh(current_user)
        assert current_user.first_name == "NewFirstName"
        assert current_user.last_name == "NewLastName"
        assert current_user.email == original_email  # Email unchanged
        
        # Verify password history
        history_count = db.query(PasswordHistory).filter(
            PasswordHistory.user_id == password_user.id
        ).count()
        assert history_count == 1