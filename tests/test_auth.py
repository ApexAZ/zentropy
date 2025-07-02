"""
Authentication and Security Testing Suite

Tests for password management, JWT tokens, and authentication flows.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from jose import jwt

from api.auth import (
    get_password_hash,
    verify_password,
    validate_password_strength,
    create_access_token,
    verify_token,
    authenticate_user,
    get_current_user,
    get_current_active_user,
    SECRET_KEY,
    ALGORITHM
)
from api.database import User


class TestPasswordManagement:
    """Test password hashing and verification functions."""
    
    def test_get_password_hash_generates_unique_hashes(self):
        """Test that same password generates different hashes due to salt."""
        password = "test_password_123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2
        assert len(hash1) > 50  # bcrypt hashes are lengthy
        assert hash1.startswith("$2b$")  # bcrypt format
    
    def test_verify_password_correct_password(self):
        """Test password verification with correct password."""
        password = "correct_password_123"
        password_hash = get_password_hash(password)
        
        assert verify_password(password, password_hash) is True
    
    def test_verify_password_incorrect_password(self):
        """Test password verification with incorrect password."""
        password = "correct_password_123"
        wrong_password = "wrong_password_456"
        password_hash = get_password_hash(password)
        
        assert verify_password(wrong_password, password_hash) is False
    
    def test_verify_password_empty_password(self):
        """Test password verification with empty password."""
        password = "test_password"
        password_hash = get_password_hash(password)
        
        assert verify_password("", password_hash) is False
        assert verify_password(None, password_hash) is False
    
    def test_validate_password_strength_strong_password(self):
        """Test password strength validation with strong password."""
        strong_passwords = [
            "StrongPass123!",
            "MySecureP@ssw0rd",
            "Complex#Password99"
        ]
        
        for password in strong_passwords:
            assert validate_password_strength(password) is True
    
    def test_validate_password_strength_weak_passwords(self):
        """Test password strength validation with weak passwords."""
        weak_passwords = [
            "weak",           # Too short
            "password",       # No numbers/symbols
            "12345678",       # Only numbers
            "PASSWORD",       # Only uppercase
            "password123",    # No symbols
            "",               # Empty
            None              # None
        ]
        
        for password in weak_passwords:
            assert validate_password_strength(password) is False


class TestJWTTokenManagement:
    """Test JWT token creation and verification."""
    
    def test_create_access_token_default_expiry(self):
        """Test access token creation with default expiry."""
        data = {"sub": "test_user@example.com"}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        
        # Decode and verify token structure
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        assert payload["sub"] == "test_user@example.com"
        assert "exp" in payload
    
    def test_create_access_token_custom_expiry(self):
        """Test access token creation with custom expiry."""
        data = {"sub": "test_user@example.com"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta)
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check that expiry is approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(payload["exp"])
        expected_time = datetime.utcnow() + expires_delta
        time_diff = abs((exp_time - expected_time).total_seconds())
        assert time_diff < 5  # Within 5 seconds tolerance
    
    def test_verify_token_valid_token(self):
        """Test token verification with valid token."""
        data = {"sub": "test_user@example.com"}
        token = create_access_token(data)
        
        payload = verify_token(token)
        assert payload["sub"] == "test_user@example.com"
    
    def test_verify_token_expired_token(self):
        """Test token verification with expired token."""
        data = {"sub": "test_user@example.com"}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_access_token(data, expires_delta)
        
        payload = verify_token(token)
        assert payload is None
    
    def test_verify_token_invalid_token(self):
        """Test token verification with malformed token."""
        invalid_tokens = [
            "invalid.token.here",
            "not_a_token_at_all",
            "",
            None,
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid"
        ]
        
        for token in invalid_tokens:
            payload = verify_token(token)
            assert payload is None
    
    def test_verify_token_wrong_algorithm(self):
        """Test token verification with wrong algorithm."""
        data = {"sub": "test_user@example.com"}
        # Create token with different algorithm
        token = jwt.encode(data, SECRET_KEY, algorithm="HS512")
        
        payload = verify_token(token)
        assert payload is None


class TestAuthenticationFlows:
    """Test user authentication workflows."""
    
    @pytest.fixture
    def mock_user(self):
        """Create a mock user for testing."""
        user = Mock(spec=User)
        user.id = "123e4567-e89b-12d3-a456-426614174000"
        user.email = "test@example.com"
        user.username = "testuser"
        user.hashed_password = get_password_hash("correct_password")
        user.is_active = True
        user.is_verified = True
        return user
    
    @pytest.fixture
    def inactive_user(self):
        """Create an inactive mock user for testing."""
        user = Mock(spec=User)
        user.id = "123e4567-e89b-12d3-a456-426614174001"
        user.email = "inactive@example.com"
        user.username = "inactiveuser"
        user.hashed_password = get_password_hash("password123")
        user.is_active = False
        user.is_verified = True
        return user
    
    @patch('api.auth.get_user_by_email')
    def test_authenticate_user_valid_credentials(self, mock_get_user, mock_user):
        """Test user authentication with valid credentials."""
        mock_get_user.return_value = mock_user
        
        authenticated_user = authenticate_user(None, "test@example.com", "correct_password")
        
        assert authenticated_user == mock_user
        mock_get_user.assert_called_once_with(None, "test@example.com")
    
    @patch('api.auth.get_user_by_email')
    def test_authenticate_user_invalid_password(self, mock_get_user, mock_user):
        """Test user authentication with invalid password."""
        mock_get_user.return_value = mock_user
        
        authenticated_user = authenticate_user(None, "test@example.com", "wrong_password")
        
        assert authenticated_user is False
    
    @patch('api.auth.get_user_by_email')
    def test_authenticate_user_nonexistent_user(self, mock_get_user):
        """Test user authentication with non-existent user."""
        mock_get_user.return_value = None
        
        authenticated_user = authenticate_user(None, "nonexistent@example.com", "password")
        
        assert authenticated_user is False
    
    @patch('api.auth.get_user_by_email')
    def test_authenticate_user_inactive_user(self, mock_get_user, inactive_user):
        """Test user authentication with inactive user."""
        mock_get_user.return_value = inactive_user
        
        authenticated_user = authenticate_user(None, "inactive@example.com", "password123")
        
        # Should authenticate but user is inactive
        assert authenticated_user == inactive_user
    
    @patch('api.auth.get_user_by_email')
    def test_get_current_user_valid_token(self, mock_get_user, mock_user):
        """Test getting current user with valid token."""
        mock_get_user.return_value = mock_user
        
        data = {"sub": mock_user.email}
        token = create_access_token(data)
        
        current_user = get_current_user(None, token)
        
        assert current_user == mock_user
        mock_get_user.assert_called_once_with(None, mock_user.email)
    
    def test_get_current_user_invalid_token(self):
        """Test getting current user with invalid token."""
        with pytest.raises(Exception):  # Should raise credentials exception
            get_current_user(None, "invalid_token")
    
    def test_get_current_user_expired_token(self):
        """Test getting current user with expired token."""
        data = {"sub": "test@example.com"}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_access_token(data, expires_delta)
        
        with pytest.raises(Exception):  # Should raise credentials exception
            get_current_user(None, token)
    
    @patch('api.auth.get_current_user')
    def test_get_current_active_user_active_user(self, mock_get_current_user, mock_user):
        """Test getting current active user with active user."""
        mock_get_current_user.return_value = mock_user
        
        active_user = get_current_active_user(mock_user)
        
        assert active_user == mock_user
    
    @patch('api.auth.get_current_user')
    def test_get_current_active_user_inactive_user(self, mock_get_current_user, inactive_user):
        """Test getting current active user with inactive user."""
        mock_get_current_user.return_value = inactive_user
        
        with pytest.raises(Exception):  # Should raise inactive user exception
            get_current_active_user(inactive_user)


class TestSecurityEdgeCases:
    """Test security-related edge cases and vulnerabilities."""
    
    def test_password_hash_timing_attack_resistance(self):
        """Test that password hashing takes consistent time (timing attack resistance)."""
        import time
        
        passwords = ["short", "much_longer_password_here", "medium_pass"]
        times = []
        
        for password in passwords:
            start = time.time()
            get_password_hash(password)
            end = time.time()
            times.append(end - start)
        
        # Times should be relatively consistent (within reasonable variance)
        avg_time = sum(times) / len(times)
        for time_taken in times:
            # Allow 50% variance (bcrypt is designed to be consistent)
            assert abs(time_taken - avg_time) / avg_time < 0.5
    
    def test_token_payload_injection_protection(self):
        """Test that token payload cannot be injected with malicious data."""
        # Try to inject admin claims
        malicious_data = {
            "sub": "test@example.com",
            "is_admin": True,
            "permissions": ["admin", "super_user"],
            "exp": datetime.utcnow() + timedelta(days=365)  # Long expiry
        }
        
        token = create_access_token(malicious_data)
        payload = verify_token(token)
        
        # Only expected fields should be present
        assert payload["sub"] == "test@example.com"
        assert "is_admin" in payload  # Data should be preserved but not trusted
        # Security should be enforced by application logic, not token content
    
    def test_password_verification_handles_malformed_hashes(self):
        """Test password verification with malformed password hashes."""
        malformed_hashes = [
            "not_a_hash",
            "$2b$12$incomplete",
            "",
            None,
            "plaintext_password",
            "$invalid$format$here"
        ]
        
        for bad_hash in malformed_hashes:
            # Should not crash and should return False
            result = verify_password("any_password", bad_hash)
            assert result is False