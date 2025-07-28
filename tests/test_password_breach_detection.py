"""
Tests for Password Breach Detection Service

Tests the integration with HaveIBeenPwned API for checking password compromises.
Uses mock responses to avoid hitting the actual API during tests.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException
import httpx

from api.password_breach_detection import (
    PasswordBreachDetectionService,
    check_password_breach_async,
    check_password_breach_sync,
)


class TestPasswordBreachDetectionService:
    """Test the core PasswordBreachDetectionService functionality"""

    def test_get_sha1_hash(self):
        """Test SHA-1 hash generation"""
        service = PasswordBreachDetectionService()
        
        # Test known hash values  
        assert service._get_sha1_hash("password") == "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"
        assert service._get_sha1_hash("123456") == "7C4A8D09CA3762AF61E59520943DC26494F8941B"

    def test_get_hash_prefix_and_suffix(self):
        """Test hash splitting for k-anonymity"""
        service = PasswordBreachDetectionService()
        
        hash_val = "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"
        prefix, suffix = service._get_hash_prefix_and_suffix(hash_val)
        
        assert prefix == "5BAA6"
        assert suffix == "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
        assert len(prefix) == 5
        assert len(prefix + suffix) == len(hash_val)

    def test_parse_breach_response_found(self):
        """Test parsing API response when password is found"""
        service = PasswordBreachDetectionService()
        
        # Mock response from HaveIBeenPwned API
        response_text = (
            "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
            "00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r\n"
            "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3730471\r\n"
            "011053FD0102E94D6AE2F8B83D76FAF94F:1\r\n"
        )
        
        # Test finding existing hash
        count = service._parse_breach_response(
            response_text,
            "1E4C9B93F3F0682250B6CF8331B7EE68FD8"  
        )
        assert count == 3730471

    def test_parse_breach_response_not_found(self):
        """Test parsing API response when password is not found"""
        service = PasswordBreachDetectionService()
        
        response_text = (
            "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
            "00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2\r\n"
        )
        
        # Test hash not in response
        count = service._parse_breach_response(
            response_text,
            "NONEXISTENTHASHSUFFIX"
        )
        assert count is None

    @pytest.mark.asyncio
    async def test_check_password_breach_disabled(self):
        """Test breach checking when disabled in config"""
        with patch('api.password_breach_detection.get_security_config') as mock_config:
            # Mock config with breach detection disabled
            mock_password_config = MagicMock()
            mock_password_config.enable_breach_detection = False
            mock_config.return_value.password = mock_password_config
            
            service = PasswordBreachDetectionService()
            is_breached, count = await service.check_password_breach("password123")
            
            assert is_breached is False
            assert count is None

    @pytest.mark.asyncio
    async def test_check_password_breach_clean_password(self):
        """Test breach checking with clean password"""
        with patch('api.password_breach_detection.get_security_config') as mock_config:
            # Mock config with breach detection enabled
            mock_password_config = MagicMock()
            mock_password_config.enable_breach_detection = True
            mock_config.return_value.password = mock_password_config
            
            # Mock HTTP response with clean password (not found)
            mock_response = MagicMock()
            mock_response.text = "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"
            mock_response.raise_for_status = MagicMock()
            
            with patch('httpx.AsyncClient') as mock_client:
                mock_async_client = AsyncMock()
                mock_async_client.get.return_value = mock_response
                mock_client.return_value.__aenter__.return_value = mock_async_client
                mock_client.return_value.__aexit__.return_value = None
                
                service = PasswordBreachDetectionService()
                is_breached, count = await service.check_password_breach("cleanpassword123")
                
                assert is_breached is False
                assert count is None

    @pytest.mark.asyncio
    async def test_check_password_breach_compromised_password(self):
        """Test breach checking with compromised password"""
        with patch('api.password_breach_detection.get_security_config') as mock_config:
            # Mock config with breach detection enabled
            mock_password_config = MagicMock()
            mock_password_config.enable_breach_detection = True
            mock_config.return_value.password = mock_password_config
            
            # Mock HTTP response with compromised password found
            mock_response = MagicMock()
            # "password" hashes to 5BAA61E4C9B93F3F... so suffix would be 1E4C9B93F3F...
            mock_response.text = "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3730471\r\n"
            mock_response.raise_for_status = MagicMock()
            
            with patch('httpx.AsyncClient') as mock_client:
                mock_async_client = AsyncMock()
                mock_async_client.get.return_value = mock_response
                mock_client.return_value.__aenter__.return_value = mock_async_client
                mock_client.return_value.__aexit__.return_value = None
                
                service = PasswordBreachDetectionService()
                
                # Should return breach information
                is_breached, breach_count = await service.check_password_breach("password")
                
                assert is_breached is True
                assert breach_count == 3730471

    @pytest.mark.asyncio 
    async def test_check_password_breach_api_timeout(self):
        """Test graceful degradation when API times out"""
        with patch('api.password_breach_detection.get_security_config') as mock_config:
            # Mock config with breach detection enabled
            mock_password_config = MagicMock()
            mock_password_config.enable_breach_detection = True
            mock_config.return_value.password = mock_password_config
            
            with patch('httpx.AsyncClient') as mock_client:
                mock_async_client = AsyncMock()
                mock_async_client.get.side_effect = httpx.TimeoutException("Timeout")
                mock_client.return_value.__aenter__.return_value = mock_async_client
                mock_client.return_value.__aexit__.return_value = None
                
                service = PasswordBreachDetectionService()
                
                # Should not raise exception, but allow password (degraded security)
                is_breached, count = await service.check_password_breach("password")
                
                assert is_breached is False
                assert count is None

    @pytest.mark.asyncio
    async def test_check_password_breach_api_rate_limit(self):
        """Test graceful degradation when API returns 429 rate limit"""
        with patch('api.password_breach_detection.get_security_config') as mock_config:
            # Mock config with breach detection enabled
            mock_password_config = MagicMock()
            mock_password_config.enable_breach_detection = True
            mock_config.return_value.password = mock_password_config
            
            # Mock HTTP 429 response
            mock_response = MagicMock()
            mock_response.status_code = 429
            
            with patch('httpx.AsyncClient') as mock_client:
                mock_async_client = AsyncMock()
                mock_async_client.get.side_effect = httpx.HTTPStatusError(
                    "Rate limit exceeded", request=MagicMock(), response=mock_response
                )
                mock_client.return_value.__aenter__.return_value = mock_async_client
                mock_client.return_value.__aexit__.return_value = None
                
                service = PasswordBreachDetectionService()
                
                # Should not raise exception, but allow password (degraded security)
                is_breached, count = await service.check_password_breach("password")
                
                assert is_breached is False
                assert count is None


class TestConvenienceFunctions:
    """Test the convenience functions for breach detection"""

    def test_check_password_breach_sync_no_running_loop(self):
        """Test sync wrapper when no event loop is running"""
        with patch('api.password_breach_detection.asyncio.get_running_loop') as mock_get_loop:
            # Mock no running loop (RuntimeError)
            mock_get_loop.side_effect = RuntimeError("No running loop")
            
            with patch('api.password_breach_detection.asyncio.run') as mock_run:
                with patch('api.password_breach_detection.check_password_breach_async') as mock_async:
                    mock_async.return_value = None
                    
                    # Should call asyncio.run
                    check_password_breach_sync("password")
                    
                    mock_run.assert_called_once()

    def test_check_password_breach_sync_with_running_loop(self):
        """Test sync wrapper when event loop is already running"""
        with patch('api.password_breach_detection.asyncio.get_running_loop') as mock_get_loop:
            # Mock running loop exists
            mock_get_loop.return_value = MagicMock()
            
            with patch('api.password_breach_detection.asyncio.run') as mock_run:
                # Should skip breach detection to avoid "cannot be called from running loop" error
                check_password_breach_sync("password")
                
                # asyncio.run should NOT be called
                mock_run.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_password_breach_async_convenience(self):
        """Test async convenience function"""
        with patch('api.password_breach_detection.PasswordBreachDetectionService.check_password_breach', new_callable=AsyncMock) as mock_check:
            mock_check.return_value = (False, None)
            
            # Should not raise exception
            await check_password_breach_async("password")
            
            mock_check.assert_called_once_with("password")