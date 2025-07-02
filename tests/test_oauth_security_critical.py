"""
CRITICAL OAuth Security Test

This test verifies that the email hijacking security prevention works correctly.
🚨 SECURITY CRITICAL: This test must pass to prevent account hijacking.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from api.database import Base, User, AuthProvider
from api.routers.auth import google_login
from api.schemas import GoogleLoginRequest


# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


class TestCriticalOAuthSecurity:
    """CRITICAL security tests for OAuth implementation."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_email_hijacking_prevention_real_database(self, mock_verify_google_token, db_session):
        """🚨 CRITICAL: Test that Google OAuth cannot hijack existing local accounts (real DB test)."""
        
        # Step 1: Create existing local user
        local_user = User(
            email="victim@example.com",
            first_name="Victim",
            last_name="User",
            organization="Victim Company",
            auth_provider=AuthProvider.LOCAL,
            password_hash="$2b$12$secure_hashed_password",
            google_id=None
        )
        db_session.add(local_user)
        db_session.commit()
        db_session.refresh(local_user)
        
        print(f"✅ Created local user: {local_user.email} with auth_provider: {local_user.auth_provider}")
        
        # Step 2: Verify local user exists
        existing_user_check = db_session.query(User).filter(User.email == "victim@example.com").first()
        assert existing_user_check is not None
        assert existing_user_check.auth_provider == AuthProvider.LOCAL
        assert existing_user_check.google_id is None
        print(f"✅ Verified local user exists in database")
        
        # Step 3: Mock attacker's Google token (same email, different Google ID)
        mock_google_user_info = {
            "sub": "attacker_google_id_12345",  # Different Google ID
            "email": "victim@example.com",      # Same email as victim
            "given_name": "Attacker",
            "family_name": "Hacker",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Step 4: Create Google login request
        request = GoogleLoginRequest(
            google_token="attacker_token",
            organization="Attacker Company"
        )
        
        # Step 5: Attempt OAuth login - MUST fail with security error
        print(f"🔥 Attempting OAuth hijack attack...")
        
        try:
            result = google_login(request, db_session)
            # If we get here, the security check FAILED - this is a critical vulnerability
            pytest.fail(
                f"🚨 CRITICAL SECURITY VULNERABILITY: OAuth hijacking succeeded! "
                f"Attacker was able to login as {result.user['email']} using Google OAuth. "
                f"This should have been blocked by email collision detection."
            )
        except Exception as e:
            # Security check should raise HTTPException with 400 status
            if "Email already registered with different authentication method" in str(e):
                print(f"✅ SECURITY PASSED: OAuth hijacking correctly blocked")
                print(f"✅ Security error: {str(e)}")
                # This is the expected behavior
                assert True
            else:
                pytest.fail(f"🚨 UNEXPECTED ERROR: {str(e)}")
        
        # Step 6: Verify original user is unchanged
        final_user_check = db_session.query(User).filter(User.email == "victim@example.com").first()
        assert final_user_check is not None
        assert final_user_check.auth_provider == AuthProvider.LOCAL
        assert final_user_check.google_id is None
        assert final_user_check.first_name == "Victim"  # Not changed to "Attacker"
        print(f"✅ Original user account remains secure and unchanged")
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_user_can_login_with_different_email(self, mock_verify_google_token, db_session):
        """✅ POSITIVE TEST: Google users can create accounts with different emails."""
        
        # Step 1: Create existing local user
        local_user = User(
            email="local@company.com",
            first_name="Local",
            last_name="User",
            organization="Company",
            auth_provider=AuthProvider.LOCAL,
            password_hash="$2b$12$secure_password",
            google_id=None
        )
        db_session.add(local_user)
        db_session.commit()
        
        # Step 2: Mock Google user with DIFFERENT email
        mock_google_user_info = {
            "sub": "google_user_12345",
            "email": "googleuser@gmail.com",  # Different email - should succeed
            "given_name": "Google",
            "family_name": "User",
            "email_verified": True
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Step 3: Create Google login request
        request = GoogleLoginRequest(
            google_token="valid_google_token",
            organization="Google Company"
        )
        
        # Step 4: OAuth login should succeed (different email)
        result = google_login(request, db_session)
        
        # Step 5: Verify Google user was created successfully
        assert result.access_token is not None
        assert result.user["email"] == "googleuser@gmail.com"
        assert result.user["first_name"] == "Google"
        
        # Step 6: Verify both users exist in database
        users = db_session.query(User).all()
        assert len(users) == 2
        
        local_user_db = db_session.query(User).filter(User.email == "local@company.com").first()
        google_user_db = db_session.query(User).filter(User.email == "googleuser@gmail.com").first()
        
        assert local_user_db.auth_provider == AuthProvider.LOCAL
        assert google_user_db.auth_provider == AuthProvider.GOOGLE
        assert google_user_db.google_id == "google_user_12345"
        
        print(f"✅ Both users coexist safely with different emails")
    
    @patch('api.routers.auth.verify_google_token')
    def test_existing_google_user_can_login_again(self, mock_verify_google_token, db_session):
        """✅ POSITIVE TEST: Existing Google users can login again."""
        
        # Step 1: Create existing Google user
        google_user = User(
            email="existing@gmail.com",
            first_name="Existing",
            last_name="GoogleUser",
            organization="Google Inc",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_existing_123",
            password_hash=None
        )
        db_session.add(google_user)
        db_session.commit()
        
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
        request = GoogleLoginRequest(google_token="existing_user_token")
        result = google_login(request, db_session)
        
        # Step 4: Verify successful authentication
        assert result.access_token is not None
        assert result.user["email"] == "existing@gmail.com"
        
        # Step 5: Verify only one user exists (no duplicates)
        users = db_session.query(User).filter(User.email == "existing@gmail.com").all()
        assert len(users) == 1
        assert users[0].auth_provider == AuthProvider.GOOGLE
        
        print(f"✅ Existing Google user successfully re-authenticated")
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_workspace_organization_extraction(self, mock_verify_google_token, db_session):
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
        request = GoogleLoginRequest(google_token="workspace_token")
        result = google_login(request, db_session)
        
        # Should use hosted domain as organization
        assert result.user["organization"] == "Acmecorp.Com"
        
        # Verify in database
        user = db_session.query(User).filter(User.email == "employee@acmecorp.com").first()
        assert user.organization == "Acmecorp.Com"
        
        print(f"✅ Google Workspace organization extracted: {user.organization}")
    
    @patch('api.routers.auth.verify_google_token')
    def test_gmail_user_organization_fallback(self, mock_verify_google_token, db_session):
        """✅ TEST: Regular Gmail users get organization from email domain."""
        
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
        request = GoogleLoginRequest(google_token="gmail_token")
        result = google_login(request, db_session)
        
        # Should use email domain as organization fallback
        assert result.user["organization"] == "Gmail.Com"
        
        print(f"✅ Gmail user organization fallback: {result.user['organization']}")