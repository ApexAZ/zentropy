"""
OAuth Router Migration Strategy

This module provides a careful migration path from original OAuth modules
to consolidated implementations with rollback capability.

CRITICAL SECURITY: This migration maintains all existing functionality while
adding security enhancements. Any failures should result in immediate rollback.
"""

import os
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

# Migration flag - consolidated implementations enabled by default for production use
# Can be overridden with USE_CONSOLIDATED_OAUTH=false for testing/debugging if needed
USE_CONSOLIDATED_OAUTH = os.getenv("USE_CONSOLIDATED_OAUTH", "true").lower() == "true"

# Consolidated imports (new security-hardened implementations)
consolidated_available = False
try:
    from .google_oauth_consolidated import (
        process_google_oauth as process_google_oauth_consolidated,
    )
    from .microsoft_oauth_consolidated import (
        process_microsoft_oauth as process_microsoft_oauth_consolidated,
    )
    from .github_oauth_consolidated import (
        process_github_oauth as process_github_oauth_consolidated,
    )

    consolidated_available = True
except ImportError as e:
    print(f"Warning: Consolidated OAuth modules not available: {e}")

# Original imports (fallback implementations) - graceful handling for removed files
try:
    from .google_oauth import (  # type: ignore
        process_google_oauth as process_google_oauth_original,
    )
except ImportError:
    print(
        "Note: Original google_oauth.py has been removed - "
        "using consolidated implementation only"
    )
    process_google_oauth_original = None

try:
    from .microsoft_oauth import (  # type: ignore
        process_microsoft_oauth as process_microsoft_oauth_original,
    )
except ImportError:
    print(
        "Note: Original microsoft_oauth.py has been removed - "
        "using consolidated implementation only"
    )
    process_microsoft_oauth_original = None

try:
    from .github_oauth import (  # type: ignore
        process_github_oauth as process_github_oauth_original,
    )
except ImportError:
    print(
        "Note: Original github_oauth.py has been removed - "
        "using consolidated implementation only"
    )
    process_github_oauth_original = None


def process_google_oauth_safe(
    db: Session,
    credential: str,
    client_ip: str = "unknown",
    consent_given: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Safe Google OAuth processing with migration support.

    Uses consolidated implementation if enabled and available,
    otherwise falls back to original implementation.
    """
    if USE_CONSOLIDATED_OAUTH and consolidated_available:
        try:
            return process_google_oauth_consolidated(
                db, credential, client_ip, consent_given
            )
        except Exception as e:
            if process_google_oauth_original is not None:
                print(
                    f"Consolidated Google OAuth failed, falling back to original: {e}"
                )
                return process_google_oauth_original(db, credential, client_ip)
            else:
                print(
                    f"Consolidated Google OAuth failed and no fallback available: {e}"
                )
                raise
    else:
        if process_google_oauth_original is not None:
            return process_google_oauth_original(db, credential, client_ip)
        else:
            print(
                "Original Google OAuth not available, using consolidated implementation"
            )
            return process_google_oauth_consolidated(
                db, credential, client_ip, consent_given
            )


def process_microsoft_oauth_safe(
    db: Session,
    authorization_code: str,
    client_ip: str = "unknown",
    consent_given: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Safe Microsoft OAuth processing with migration support.

    Uses consolidated implementation if enabled and available,
    otherwise falls back to original implementation.
    """
    if USE_CONSOLIDATED_OAUTH and consolidated_available:
        try:
            return process_microsoft_oauth_consolidated(
                db, authorization_code, client_ip, consent_given
            )
        except Exception as e:
            if process_microsoft_oauth_original is not None:
                print(
                    f"Consolidated Microsoft OAuth failed, "
                    f"falling back to original: {e}"
                )
                return process_microsoft_oauth_original(
                    db, authorization_code, client_ip
                )
            else:
                print(
                    f"Consolidated Microsoft OAuth failed "
                    f"and no fallback available: {e}"
                )
                raise
    else:
        if process_microsoft_oauth_original is not None:
            return process_microsoft_oauth_original(db, authorization_code, client_ip)
        else:
            print(
                "Original Microsoft OAuth not available, "
                "using consolidated implementation"
            )
            return process_microsoft_oauth_consolidated(
                db, authorization_code, client_ip, consent_given
            )


def process_github_oauth_safe(
    db: Session,
    authorization_code: str,
    client_ip: str = "unknown",
    consent_given: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Safe GitHub OAuth processing with migration support.

    Uses consolidated implementation if enabled and available,
    otherwise falls back to original implementation.
    """
    if USE_CONSOLIDATED_OAUTH and consolidated_available:
        try:
            return process_github_oauth_consolidated(
                db, authorization_code, client_ip, consent_given
            )
        except Exception as e:
            if process_github_oauth_original is not None:
                print(
                    f"Consolidated GitHub OAuth failed, falling back to original: {e}"
                )
                return process_github_oauth_original(db, authorization_code, client_ip)
            else:
                print(
                    f"Consolidated GitHub OAuth failed and no fallback available: {e}"
                )
                raise
    else:
        if process_github_oauth_original is not None:
            return process_github_oauth_original(db, authorization_code, client_ip)
        else:
            print(
                "Original GitHub OAuth not available, using consolidated implementation"
            )
            return process_github_oauth_consolidated(
                db, authorization_code, client_ip, consent_given
            )


def get_migration_status() -> Dict[str, Any]:
    """Get current migration status for monitoring."""
    return {
        "use_consolidated_oauth": USE_CONSOLIDATED_OAUTH,
        "consolidated_available": consolidated_available,
        "migration_active": USE_CONSOLIDATED_OAUTH and consolidated_available,
        "fallback_mode": not (USE_CONSOLIDATED_OAUTH and consolidated_available),
    }
