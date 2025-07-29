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
    
    @patch('api.google_oauth_consolidated.id_token.verify_token')
    def test_oauth_auto_linking_with_existing_local_account(self, mock_verify_token, db, client):
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
        
        # Step 3: Mock legitimate Google JWT token verification
        mock_jwt_info = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            "sub": "google_id_12345",
            "email": "user@example.com",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True,
            "exp": 9999999999,
            "iat": 1234567890
        }
        mock_verify_token.return_value = mock_jwt_info
        
        # Step 4: Mock environment and attempt OAuth login
        print(f"🔗 Attempting OAuth auto-linking...")
        
        with patch.dict('os.environ', {'GOOGLE_CLIENT_ID': 'test-client-id'}):
            response = client.post("/api/v1/auth/oauth", json={
                "provider": "google",
                "credential": "valid.google.jwt"
            })
        
            # Should now require consent instead of auto-linking
            assert response.status_code == 200, f"Expected consent response, got {response.status_code}: {response.json()}"
            
            result = response.json()
            assert result["action"] == "consent_required"
            assert result["existing_email"] == "user@example.com"
            assert result["provider"] == "google"
            print(f"✅ Consent required as expected: {result['existing_email']}")
            
            # Step 5: Test explicit consent flow
            consent_response = client.post("/api/v1/auth/oauth/consent", json={
                "provider": "google",
                "credential": "valid.google.jwt",
                "consent_given": True
            })
            
            assert consent_response.status_code == 200
            consent_result = consent_response.json()
            assert consent_result["user"]["email"] == "user@example.com"
            
            # Verify account was properly linked after consent
            db.expunge_all()  # Clear the session cache
            updated_user = db.query(User).filter(User.email == "user@example.com").first()
            assert updated_user is not None
            assert updated_user.auth_provider == AuthProvider.HYBRID  # Now supports both email/password and OAuth
            assert updated_user.google_id == "google_id_12345"  # Google ID was set
            assert updated_user.password_hash is not None  # Original password preserved
            
            print(f"✅ CONSENT-BASED LINKING TEST PASSED: OAuth provider linked after explicit consent")
    
    
    
    
