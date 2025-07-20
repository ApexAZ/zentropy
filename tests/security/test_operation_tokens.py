"""
Tests for Operation Token Security System

Tests the JWT-based operation token system used for secure multi-step flows.
"""

import pytest
import os
import time
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from api.security import (
    OperationTokenManager,
    InvalidTokenError,
    ExpiredTokenError,
    InvalidOperationError,
    generate_operation_token,
    verify_operation_token
)


class TestOperationTokenManager:
    """Test the OperationTokenManager class."""

    def test_init_requires_secret_key(self):
        """Test that OperationTokenManager requires SECRET_KEY environment variable."""
        with patch.dict(os.environ, {}, clear=True):
            # Remove SECRET_KEY from environment
            if 'SECRET_KEY' in os.environ:
                del os.environ['SECRET_KEY']
            
            with pytest.raises(ValueError, match="SECRET_KEY environment variable must be set"):
                OperationTokenManager()

    def test_init_with_secret_key(self):
        """Test that OperationTokenManager initializes correctly with SECRET_KEY."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            assert manager.secret_key == 'test-secret-key'
            assert manager.algorithm == 'HS256'
            assert manager.expiry_minutes == 10

    def test_generate_token_creates_valid_jwt(self):
        """Test that generate_token creates a valid JWT with correct claims."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            email = "test@example.com"
            operation_type = "password_reset"
            
            token = manager.generate_token(email, operation_type)
            
            # Verify it's a valid JWT
            assert isinstance(token, str)
            assert len(token.split('.')) == 3  # JWT has 3 parts
            
            # Decode token to verify claims
            payload = jwt.decode(token, 'test-secret-key', algorithms=['HS256'])
            
            assert payload['email'] == email.lower()  # Should be normalized
            assert payload['operation_type'] == operation_type
            assert 'exp' in payload
            assert 'iat' in payload
            assert 'jti' in payload
            assert payload['issuer'] == 'zentropy-security'

    def test_generate_token_normalizes_email_case(self):
        """Test that email addresses are normalized to lowercase."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            email = "TEST@EXAMPLE.COM"
            operation_type = "password_reset"
            
            token = manager.generate_token(email, operation_type)
            payload = jwt.decode(token, 'test-secret-key', algorithms=['HS256'])
            
            assert payload['email'] == "test@example.com"

    def test_generate_token_has_correct_expiration(self):
        """Test that generated tokens have correct expiration time."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            before_generation = datetime.now(timezone.utc)
            token = manager.generate_token("test@example.com", "password_reset")
            after_generation = datetime.now(timezone.utc)
            
            payload = jwt.decode(token, 'test-secret-key', algorithms=['HS256'])
            
            exp_time = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)
            expected_exp_min = before_generation + timedelta(minutes=10)
            expected_exp_max = after_generation + timedelta(minutes=10)
            
            # Allow 2 seconds tolerance for timing precision and JWT timestamp truncation
            tolerance = timedelta(seconds=2)
            assert (expected_exp_min - tolerance) <= exp_time <= (expected_exp_max + tolerance)

    def test_verify_token_success(self):
        """Test successful token verification."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            email = "test@example.com"
            operation_type = "password_reset"
            
            token = manager.generate_token(email, operation_type)
            verified_email = manager.verify_token(token, operation_type)
            
            assert verified_email == email.lower()

    def test_verify_token_invalid_signature(self):
        """Test verification fails with invalid signature."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            # Generate token with one secret
            token = manager.generate_token("test@example.com", "password_reset")
            
            # Try to verify with different secret
            manager.secret_key = 'different-secret'
            
            with pytest.raises(InvalidTokenError, match="Invalid operation token"):
                manager.verify_token(token, "password_reset")

    def test_verify_token_expired(self):
        """Test verification fails with expired token."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            # Generate token with very short expiry
            original_expiry = manager.expiry_minutes
            manager.expiry_minutes = 0  # Expire immediately
            
            token = manager.generate_token("test@example.com", "password_reset")
            
            # Restore original expiry and wait
            manager.expiry_minutes = original_expiry
            time.sleep(1)  # Wait for token to expire
            
            with pytest.raises(ExpiredTokenError, match="Operation token has expired"):
                manager.verify_token(token, "password_reset")

    def test_verify_token_wrong_operation_type(self):
        """Test verification fails with wrong operation type."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            token = manager.generate_token("test@example.com", "password_reset")
            
            with pytest.raises(InvalidOperationError, match="Token is for 'password_reset' but expected 'password_change'"):
                manager.verify_token(token, "password_change")

    def test_verify_token_malformed(self):
        """Test verification fails with malformed token."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            with pytest.raises(InvalidTokenError, match="Invalid operation token"):
                manager.verify_token("invalid.token.here", "password_reset")

    def test_get_token_info_success(self):
        """Test getting token information without operation validation."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            email = "test@example.com"
            operation_type = "password_reset"
            
            before_generation = datetime.now(timezone.utc)
            token = manager.generate_token(email, operation_type)
            after_generation = datetime.now(timezone.utc)
            
            info = manager.get_token_info(token)
            
            assert info['email'] == email.lower()
            assert info['operation_type'] == operation_type
            assert info['issuer'] == 'zentropy-security'
            assert isinstance(info['expires_at'], datetime)
            assert isinstance(info['issued_at'], datetime)
            assert isinstance(info['token_id'], str)
            
            # Check timing (allow 2 seconds tolerance for JWT timestamp truncation)
            tolerance = timedelta(seconds=2)
            assert (before_generation - tolerance) <= info['issued_at'] <= (after_generation + tolerance)

    def test_get_token_info_expired(self):
        """Test getting info from expired token."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            # Generate token with very short expiry
            original_expiry = manager.expiry_minutes
            manager.expiry_minutes = 0  # Expire immediately
            
            token = manager.generate_token("test@example.com", "password_reset")
            
            # Restore original expiry and wait
            manager.expiry_minutes = original_expiry
            time.sleep(1)  # Wait for token to expire
            
            with pytest.raises(ExpiredTokenError, match="Operation token has expired"):
                manager.get_token_info(token)

    def test_tokens_are_unique(self):
        """Test that different tokens are generated for the same input."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            email = "test@example.com"
            operation_type = "password_reset"
            
            token1 = manager.generate_token(email, operation_type)
            token2 = manager.generate_token(email, operation_type)
            
            assert token1 != token2
            
            # Both should be valid
            assert manager.verify_token(token1, operation_type) == email.lower()
            assert manager.verify_token(token2, operation_type) == email.lower()
            
            # Should have different JTIs
            info1 = manager.get_token_info(token1)
            info2 = manager.get_token_info(token2)
            assert info1['token_id'] != info2['token_id']


class TestConvenienceFunctions:
    """Test the convenience functions."""

    def test_generate_operation_token_function(self):
        """Test the convenience function for generating tokens."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            token = generate_operation_token("test@example.com", "password_reset")
            
            assert isinstance(token, str)
            assert len(token.split('.')) == 3  # Valid JWT format

    def test_verify_operation_token_function(self):
        """Test the convenience function for verifying tokens."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            email = "test@example.com"
            operation_type = "password_reset"
            
            token = generate_operation_token(email, operation_type)
            verified_email = verify_operation_token(token, operation_type)
            
            assert verified_email == email.lower()

    def test_convenience_functions_integration(self):
        """Test that convenience functions work together."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            email = "Test@Example.Com"  # Mixed case
            operation_type = "username_recovery"
            
            # Generate token
            token = generate_operation_token(email, operation_type)
            
            # Verify token
            verified_email = verify_operation_token(token, operation_type)
            
            assert verified_email == email.lower()


class TestSecurityProperties:
    """Test security properties of the token system."""

    def test_tokens_cannot_be_reused_across_operations(self):
        """Test that tokens for one operation cannot be used for another."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            email = "test@example.com"
            
            # Generate token for password reset
            reset_token = generate_operation_token(email, "password_reset")
            
            # Verify it works for password reset
            assert verify_operation_token(reset_token, "password_reset") == email
            
            # Verify it fails for password change
            with pytest.raises(InvalidOperationError):
                verify_operation_token(reset_token, "password_change")

    def test_token_expiration_timing(self):
        """Test that tokens expire at the expected time."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            manager = OperationTokenManager()
            
            # Set short expiry for testing
            manager.expiry_minutes = 1
            
            token = manager.generate_token("test@example.com", "password_reset")
            
            # Should work immediately
            assert manager.verify_token(token, "password_reset") == "test@example.com"
            
            # Mock time to be after expiration
            with patch('jwt.decode') as mock_decode:
                mock_decode.side_effect = jwt.ExpiredSignatureError("Token expired")
                
                with pytest.raises(ExpiredTokenError, match="Operation token has expired"):
                    manager.verify_token(token, "password_reset")

    def test_different_emails_get_different_tokens(self):
        """Test that different emails get different tokens even for same operation."""
        with patch.dict(os.environ, {'SECRET_KEY': 'test-secret-key'}):
            operation_type = "password_reset"
            
            token1 = generate_operation_token("user1@example.com", operation_type)
            token2 = generate_operation_token("user2@example.com", operation_type)
            
            assert token1 != token2
            
            # Each should only work for its respective email
            assert verify_operation_token(token1, operation_type) == "user1@example.com"
            assert verify_operation_token(token2, operation_type) == "user2@example.com"