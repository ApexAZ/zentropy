"""
Tests for Email Service

Tests email functionality including SMTP integration with Mailpit for local development.
"""

import pytest
from unittest.mock import patch, MagicMock
import os
import asyncio
from api.email_service import EmailService, send_verification_email, send_password_reset_email


class TestEmailService:
    """Test the EmailService class functionality."""
    
    def test_email_service_initialization(self):
        """Test EmailService initialization with default values."""
        service = EmailService()
        
        assert service.smtp_server == "localhost"
        assert service.smtp_port == 1025
        assert service.smtp_username == ""
        assert service.smtp_password == ""
        assert service.smtp_use_tls is False
        assert service.from_email == "noreply@zentropy.local"
        assert service.from_name == "Zentropy"
        assert service.email_enabled is True
        assert service.from_address == "Zentropy <noreply@zentropy.local>"
    
    def test_email_service_initialization_with_env_vars(self):
        """Test EmailService initialization with environment variables."""
        with patch.dict(os.environ, {
            "SMTP_SERVER": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "user@example.com",
            "SMTP_PASSWORD": "password123",
            "SMTP_USE_TLS": "true",
            "SMTP_FROM_EMAIL": "test@example.com",
            "SMTP_FROM_NAME": "Test Service",
            "EMAIL_ENABLED": "false"
        }):
            service = EmailService()
            
            assert service.smtp_server == "smtp.example.com"
            assert service.smtp_port == 587
            assert service.smtp_username == "user@example.com"
            assert service.smtp_password == "password123"
            assert service.smtp_use_tls is True
            assert service.from_email == "test@example.com"
            assert service.from_name == "Test Service"
            assert service.email_enabled is False
            assert service.from_address == "Test Service <test@example.com>"
    
    @patch('api.email_service.aiosmtplib.send')
    async def test_send_email_success(self, mock_send):
        """Test successful email sending."""
        mock_send.return_value = None
        
        service = EmailService()
        result = await service.send_email(
            to_email="test@example.com",
            subject="Test Subject",
            html_content="<h1>Test HTML</h1>",
            text_content="Test text content"
        )
        
        assert result is True
        mock_send.assert_called_once()
    
    @patch('api.email_service.aiosmtplib.send')
    async def test_send_email_failure(self, mock_send):
        """Test email sending failure."""
        mock_send.side_effect = Exception("SMTP Error")
        
        service = EmailService()
        result = await service.send_email(
            to_email="test@example.com",
            subject="Test Subject",
            html_content="<h1>Test HTML</h1>"
        )
        
        assert result is False
        mock_send.assert_called_once()
    
    @patch('api.email_service.aiosmtplib.send')
    async def test_send_email_disabled(self, mock_send):
        """Test email sending when disabled."""
        with patch.dict(os.environ, {"EMAIL_ENABLED": "false"}):
            service = EmailService()
            result = await service.send_email(
                to_email="test@example.com",
                subject="Test Subject",
                html_content="<h1>Test HTML</h1>"
            )
            
            assert result is True
            mock_send.assert_not_called()
    
    @patch('api.email_service.aiosmtplib.send')
    def test_send_email_sync_success(self, mock_send):
        """Test synchronous email sending."""
        mock_send.return_value = None
        
        service = EmailService()
        result = service.send_email_sync(
            to_email="test@example.com",
            subject="Test Subject",
            html_content="<h1>Test HTML</h1>",
            text_content="Test text content"
        )
        
        assert result is True
        mock_send.assert_called_once()
    
    @patch('api.email_service.aiosmtplib.send')
    def test_send_email_sync_failure(self, mock_send):
        """Test synchronous email sending failure."""
        mock_send.side_effect = Exception("SMTP Error")
        
        service = EmailService()
        result = service.send_email_sync(
            to_email="test@example.com",
            subject="Test Subject",
            html_content="<h1>Test HTML</h1>"
        )
        
        assert result is False
        mock_send.assert_called_once()


class TestEmailFunctions:
    """Test the email utility functions."""
    
    @patch('api.email_service.email_service.send_email_sync')
    def test_send_verification_email(self, mock_send):
        """Test sending verification email."""
        mock_send.return_value = True
        
        result = send_verification_email(
            email="test@example.com",
            token="test-token-123",
            user_name="Test User"
        )
        
        assert result is True
        mock_send.assert_called_once()
        
        # Check that the call was made with correct parameters
        call_args = mock_send.call_args
        assert call_args[1]["to_email"] == "test@example.com"
        assert call_args[1]["subject"] == "Please verify your email address"
        assert "test-token-123" in call_args[1]["html_content"]
        assert "Test User" in call_args[1]["html_content"]
        assert "test-token-123" in call_args[1]["text_content"]
        assert "Test User" in call_args[1]["text_content"]
    
    @patch('api.email_service.email_service.send_email_sync')
    def test_send_password_reset_email(self, mock_send):
        """Test sending password reset email."""
        mock_send.return_value = True
        
        result = send_password_reset_email(
            email="test@example.com",
            token="reset-token-456",
            user_name="Test User"
        )
        
        assert result is True
        mock_send.assert_called_once()
        
        # Check that the call was made with correct parameters
        call_args = mock_send.call_args
        assert call_args[1]["to_email"] == "test@example.com"
        assert call_args[1]["subject"] == "Reset your Zentropy password"
        assert "reset-token-456" in call_args[1]["html_content"]
        assert "Test User" in call_args[1]["html_content"]
        assert "reset-token-456" in call_args[1]["text_content"]
        assert "Test User" in call_args[1]["text_content"]
    
    @patch('api.email_service.email_service.send_email_sync')
    def test_send_verification_email_failure(self, mock_send):
        """Test verification email sending failure."""
        mock_send.return_value = False
        
        result = send_verification_email(
            email="test@example.com",
            token="test-token-123",
            user_name="Test User"
        )
        
        assert result is False
        mock_send.assert_called_once()
    
    @patch('api.email_service.email_service.send_email_sync')
    def test_send_password_reset_email_failure(self, mock_send):
        """Test password reset email sending failure."""
        mock_send.return_value = False
        
        result = send_password_reset_email(
            email="test@example.com",
            token="reset-token-456",
            user_name="Test User"
        )
        
        assert result is False
        mock_send.assert_called_once()


class TestEmailContent:
    """Test email content generation."""
    
    def test_verification_email_content(self):
        """Test verification email content generation."""
        with patch('api.email_service.email_service.send_email_sync') as mock_send:
            mock_send.return_value = True
            
            send_verification_email(
                email="test@example.com",
                token="test-token-123",
                user_name="John Doe"
            )
            
            call_args = mock_send.call_args
            html_content = call_args[1]["html_content"]
            text_content = call_args[1]["text_content"]
            
            # Check HTML content
            assert "Welcome to Zentropy!" in html_content
            assert "Hello John Doe," in html_content
            assert "http://localhost:5173/verify-email/test-token-123" in html_content
            assert "24 hours" in html_content
            assert "Verify Email Address" in html_content
            
            # Check text content
            assert "Welcome to Zentropy!" in text_content
            assert "Hello John Doe," in text_content
            assert "http://localhost:5173/verify-email/test-token-123" in text_content
            assert "24 hours" in text_content
    
    def test_email_template_security(self):
        """Test that email templates properly escape user input."""
        with patch('api.email_service.email_service.send_email_sync') as mock_send:
            mock_send.return_value = True
            
            # Test with potentially malicious user input
            send_verification_email(
                email="test@example.com",
                token="safe-token",
                user_name="<script>alert('xss')</script>"
            )
            
            call_args = mock_send.call_args
            html_content = call_args[1]["html_content"]
            
            # Should not contain executable script tags
            assert "<script>" not in html_content
            assert "alert('xss')" not in html_content
            # Should contain escaped or sanitized version
            assert "&lt;script&gt;" in html_content or "script" not in html_content.lower()
    
    def test_email_link_formatting(self):
        """Test that email verification links are properly formatted."""
        with patch('api.email_service.email_service.send_email_sync') as mock_send:
            mock_send.return_value = True
            
            # Test with various token formats
            test_cases = [
                "simple-token",
                "token_with_underscores",
                "token-with-dashes",
                "TokenWithMixedCase123"
            ]
            
            for token in test_cases:
                send_verification_email(
                    email="test@example.com",
                    token=token,
                    user_name="Test User"
                )
                
                call_args = mock_send.call_args
                html_content = call_args[1]["html_content"]
                
                # Check that link is properly formatted
                expected_link = f"http://localhost:5173/verify-email/{token}"
                assert expected_link in html_content
                
                # Check that link appears in both button and text versions
                assert f'href="{expected_link}"' in html_content
                assert f'<a href="{expected_link}">' in html_content
    
    def test_password_reset_email_content(self):
        """Test password reset email content generation."""
        with patch('api.email_service.email_service.send_email_sync') as mock_send:
            mock_send.return_value = True
            
            send_password_reset_email(
                email="test@example.com",
                token="reset-token-456",
                user_name="Jane Smith"
            )
            
            call_args = mock_send.call_args
            html_content = call_args[1]["html_content"]
            text_content = call_args[1]["text_content"]
            
            # Check HTML content
            assert "Password Reset Request" in html_content
            assert "Hello Jane Smith," in html_content
            assert "http://localhost:5173/reset-password/reset-token-456" in html_content
            assert "1 hour" in html_content
            assert "Reset Password" in html_content
            
            # Check text content
            assert "Password Reset Request" in text_content
            assert "Hello Jane Smith," in text_content
            assert "http://localhost:5173/reset-password/reset-token-456" in text_content
            assert "1 hour" in text_content