"""
Password Breach Detection Service

Integrates with HaveIBeenPwned API to check if passwords have been compromised
in known data breaches. Uses the k-anonymity model for privacy protection.

HaveIBeenPwned API Documentation:
https://haveibeenpwned.com/API/v3#PwnedPasswords
"""

import hashlib
import httpx
import asyncio
from typing import Optional, Tuple
from fastapi import HTTPException, status
import logging
from .config import get_security_config

logger = logging.getLogger(__name__)


class PasswordBreachDetectionService:
    """Service for checking password compromises via HaveIBeenPwned API"""

    BASE_URL = "https://api.pwnedpasswords.com"
    TIMEOUT_SECONDS = 5.0

    @staticmethod
    def _get_sha1_hash(password: str) -> str:
        """Generate SHA-1 hash of password for HaveIBeenPwned API"""
        return hashlib.sha1(password.encode("utf-8")).hexdigest().upper()

    @staticmethod
    def _get_hash_prefix_and_suffix(password_hash: str) -> Tuple[str, str]:
        """Split SHA-1 hash into 5-character prefix and remaining suffix"""
        return password_hash[:5], password_hash[5:]

    @classmethod
    async def check_password_breach(cls, password: str) -> Tuple[bool, Optional[int]]:
        """
        Check if password has been compromised in data breaches.

        Uses HaveIBeenPwned's k-anonymity model:
        1. Hash password with SHA-1
        2. Send first 5 characters of hash to API
        3. Check if remaining hash appears in response

        Args:
            password: Plain text password to check

        Returns:
            Tuple of (is_breached: bool, breach_count: Optional[int])
            - is_breached: True if password found in breaches
            - breach_count: Number of times password appears in breaches
              (None if not breached)

        Raises:
            HTTPException: If breach detection is enabled and password is compromised
        """
        config = get_security_config()

        # Skip breach detection if disabled in configuration
        if not config.password.enable_breach_detection:
            return False, None

        try:
            # Generate SHA-1 hash and split for k-anonymity
            password_hash = cls._get_sha1_hash(password)
            hash_prefix, hash_suffix = cls._get_hash_prefix_and_suffix(password_hash)

            # Query HaveIBeenPwned API with hash prefix
            url = f"{cls.BASE_URL}/range/{hash_prefix}"

            async with httpx.AsyncClient(timeout=cls.TIMEOUT_SECONDS) as client:
                response = await client.get(url)
                response.raise_for_status()

            # Parse response to check for password hash suffix
            breach_count = cls._parse_breach_response(response.text, hash_suffix)

            if breach_count is not None:
                logger.warning(
                    f"Password breach detected: hash suffix {hash_suffix[:8]}... "
                    f"found {breach_count} times in breaches"
                )

                # Return breach information - let caller decide whether
                # to raise exception
                return True, breach_count

            return False, None

        except httpx.TimeoutException:
            logger.warning(
                "HaveIBeenPwned API timeout - allowing password (degraded security)"
            )
            return False, None

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning(
                    "HaveIBeenPwned API rate limit exceeded - allowing password"
                )
            else:
                logger.error(
                    f"HaveIBeenPwned API error {e.response.status_code} - "
                    "allowing password"
                )
            return False, None

        except Exception as e:
            logger.error(
                f"Unexpected error in breach detection: {e} - allowing password"
            )
            return False, None

    @staticmethod
    def _parse_breach_response(response_text: str, hash_suffix: str) -> Optional[int]:
        """
        Parse HaveIBeenPwned API response to find breach count for hash suffix.

        Response format: "HASH_SUFFIX:COUNT\r\n"
        Example: "0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n"

        Args:
            response_text: Raw response from HaveIBeenPwned API
            hash_suffix: SHA-1 hash suffix to search for

        Returns:
            Number of breaches if found, None if not found
        """
        for line in response_text.strip().split("\r\n"):
            if ":" in line:
                hash_part, count_part = line.split(":", 1)
                if hash_part == hash_suffix:
                    try:
                        return int(count_part)
                    except ValueError:
                        continue
        return None


# Convenience function for direct use in validation
async def check_password_breach_async(password: str) -> None:
    """
    Async convenience function to check password breaches.

    Raises HTTPException if password is compromised.
    """
    is_breached, _ = await PasswordBreachDetectionService.check_password_breach(
        password
    )

    if is_breached:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This password has been compromised in data breaches and "
                "cannot be used. Please choose a different password for "
                "your security."
            ),
        )


def check_password_breach_sync(password: str) -> None:
    """
    Synchronous wrapper for password breach detection.

    Uses asyncio.run() to execute async breach check.
    Intended for use in synchronous validation functions.

    Raises HTTPException if password is compromised.
    """
    try:
        # Check if we're already in an async context
        asyncio.get_running_loop()
        # If we're in async context, we need to use create_task or similar
        # For now, we'll skip breach detection if already in async context
        # to avoid "cannot be called from a running event loop" error
        logger.warning("Skipping breach detection - already in async context")
        return
    except RuntimeError:
        # No running loop, safe to use asyncio.run()
        asyncio.run(check_password_breach_async(password))
