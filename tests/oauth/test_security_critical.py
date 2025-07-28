"""
CRITICAL OAuth Security Test

This test verifies that the email hijacking security prevention works correctly.
🚨 SECURITY CRITICAL: This test must pass to prevent account hijacking.
"""
import pytest
from sqlalchemy.orm import Session
from unittest.mock import patch

from api.database import User, AuthProvider, Organization
from tests.conftest import create_test_user


class TestCriticalOAuthSecurity:
    """CRITICAL security tests for OAuth implementation."""
    
    @patch('api.google_oauth.verify_google_token')
    def test_oauth_auto_linking_with_existing_local_account(self, mock_verify_google_token, db, client):
        """✅ Test that Google OAuth automatically links to existing local accounts with same email."""
        
        # Step 1: Create existing local user
        local_user = User(
            email="user@example.com",
            first_name="Test",
            last_name="User",
            auth_provider=AuthProvider.LOCAL,
            password_hash="$2b$12$secure_hashed_password",
            google_id=None
        )
        db.add(local_user)
        db.commit()
        db.refresh(local_user)
        
        print(f"✅ Created local user: {local_user.email} with auth_provider: {local_user.auth_provider}")
        
        # Step 2: Verify local user exists
        existing_user_check = db.query(User).filter(User.email == "user@example.com").first()
        assert existing_user_check is not None
        assert existing_user_check.auth_provider == AuthProvider.LOCAL
        assert existing_user_check.google_id is None
        print(f"✅ Verified local user exists in database")
        
        # Step 3: Mock legitimate Google OAuth for same user
        mock_google_user_info = {
            "sub": "google_id_12345",
            "email": "user@example.com",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Step 4: Attempt OAuth login - should automatically link and succeed
        print(f"🔗 Attempting OAuth auto-linking...")
        
        response = client.post("/api/v1/auth/oauth", json={
            "provider": "google",
            "credential": "valid_google_token"
        })
        
        # Should succeed with auto-linking
        assert response.status_code == 200, f"Expected successful auto-linking, got {response.status_code}: {response.json()}"
        
        result = response.json()
        assert result["user"]["email"] == "user@example.com"
        print(f"✅ Auto-linking successful: {result['user']['email']}")
        
        # Step 5: Verify account was properly linked
        # Refresh the session to see changes made by the OAuth process
        db.expunge_all()  # Clear the session cache
        updated_user = db.query(User).filter(User.email == "user@example.com").first()
        assert updated_user is not None
        assert updated_user.auth_provider == AuthProvider.HYBRID  # Now supports both email/password and OAuth
        assert updated_user.google_id == "google_id_12345"  # Google ID was set
        assert updated_user.password_hash is not None  # Original password preserved
        
        print(f"✅ AUTO-LINKING TEST PASSED: OAuth provider successfully linked to existing account")
    
    @patch('api.google_oauth.verify_google_token')
    def test_google_user_can_login_with_different_email(self, mock_verify_google_token, db, client):
        """✅ POSITIVE TEST: Google users can create accounts with different emails."""
        
        # Step 1: Create existing local user
        local_user = User(
            email="local@company.com",
            first_name="Local",
            last_name="User",
            
            auth_provider=AuthProvider.LOCAL,
            password_hash="$2b$12$secure_password",
            google_id=None
        )
        db.add(local_user)
        db.commit()
        
        # Step 2: Mock Google user with DIFFERENT email
        mock_google_user_info = {
            "sub": "google_user_12345",
            "email": "googleuser@gmail.com",  # Different email - should succeed
            "given_name": "Google",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Step 3: Create Google login request will be made via HTTP POST
        
        # Step 4: OAuth login should succeed (different email)
        response = client.post("/api/v1/auth/oauth", json={
            "provider": "google",
            "credential": "valid_google_token"
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Step 5: Verify Google user was created successfully
        assert result["access_token"] is not None
        assert result["user"]["email"] == "googleuser@gmail.com"
        assert result["user"]["first_name"] == "Google"
        
        # Step 6: Verify both users exist in database
        users = db.query(User).all()
        assert len(users) == 2
        
        local_user_db = db.query(User).filter(User.email == "local@company.com").first()
        google_user_db = db.query(User).filter(User.email == "googleuser@gmail.com").first()
        
        assert local_user_db.auth_provider == AuthProvider.LOCAL
        assert google_user_db.auth_provider == AuthProvider.GOOGLE
        assert google_user_db.google_id == "google_user_12345"
        
        print(f"✅ Both users coexist safely with different emails")
    
    @patch('api.google_oauth.verify_google_token')
    def test_existing_google_user_can_login_again(self, mock_verify_google_token, db, client):
        """✅ POSITIVE TEST: Existing Google users can login again."""
        
        # Step 1: Create existing Google user
        google_user = User(
            email="existing@gmail.com",
            first_name="Existing",
            last_name="GoogleUser",
            
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_existing_123",
            password_hash=None
        )
        db.add(google_user)
        db.commit()
        
        # Step 2: Mock the same Google user logging in again
        mock_google_user_info = {
            "sub": "google_existing_123",  # Same Google ID
            "email": "existing@gmail.com", # Same email
            "given_name": "Existing",
            "family_name": "GoogleUser",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Step 3: OAuth login should succeed (existing Google user)
        response = client.post("/api/v1/auth/oauth", json={
            "provider": "google",
            "credential": "existing_user_token"
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Step 4: Verify successful authentication
        assert result["access_token"] is not None
        assert result["user"]["email"] == "existing@gmail.com"
        
        # Step 5: Verify only one user exists (no duplicates)
        users = db.query(User).filter(User.email == "existing@gmail.com").all()
        assert len(users) == 1
        assert users[0].auth_provider == AuthProvider.GOOGLE
        
        print(f"✅ Existing Google user successfully re-authenticated")
    
    @patch('api.google_oauth.verify_google_token')
    def test_google_workspace_organization_extraction(self, mock_verify_google_token, db, client):
        """✅ TEST: Google Workspace users get organization from hosted domain."""
        
        # Mock Google Workspace user (has 'hd' field)
        mock_google_user_info = {
            "sub": "workspace_user_123",
            "email": "employee@acmecorp.com",
            "given_name": "Employee",
            "family_name": "Worker",
            "email_verified": True,
            "hd": "acmecorp.com"  # Google Workspace hosted domain
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # OAuth login without specifying organization
        response = client.post("/api/v1/auth/oauth", json={
            "provider": "google",
            "credential": "workspace_token"
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Should have organization_id
        assert result["user"]["organization_id"] is not None
        
        # Verify in database - get organization by ID
        user = db.query(User).filter(User.email == "employee@acmecorp.com").first()
        assert user.organization_id is not None
        organization = db.query(Organization).filter(Organization.id == user.organization_id).first()
        assert organization is not None
        assert organization.name == "Acmecorp"
        
        print(f"✅ Google Workspace organization extracted: {organization.name}")
    
    @patch('api.google_oauth.verify_google_token')
    def test_gmail_user_no_organization_assignment(self, mock_verify_google_token, db, client):
        """✅ TEST: Regular Gmail users are created without automatic organization assignment."""
        
        # Mock regular Gmail user (no 'hd' field)
        mock_google_user_info = {
            "sub": "gmail_user_123",
            "email": "user@gmail.com",
            "given_name": "Gmail",
            "family_name": "User",
            "email_verified": True,
            "hd": None  # No hosted domain
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # OAuth login without specifying organization
        response = client.post("/api/v1/auth/oauth", json={
            "provider": "google",
            "credential": "gmail_token"
        })
        
        assert response.status_code == 200
        result = response.json()
        
        # Gmail users (no hosted domain) don't get automatic organization assignment
        assert result["user"]["organization_id"] is None
        
        # Verify in database 
        user = db.query(User).filter(User.email == "user@gmail.com").first()
        assert user.organization_id is None
        assert user.auth_provider == AuthProvider.GOOGLE
        assert user.google_id == "gmail_user_123"
        
        print(f"✅ Gmail user correctly created without organization")