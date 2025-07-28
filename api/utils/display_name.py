"""
Display name generation utilities for consistent user display across the application.

This module provides centralized logic for generating user display names that matches
the frontend TypeScript implementation in src/client/utils/formatters.ts
"""

from typing import Optional


def generate_display_name(
    registration_type: str,
    first_name: Optional[str],
    last_name: Optional[str],
    display_name: Optional[str],
    email: str,
) -> str:
    """
    Generate display name using consistent business logic across frontend and backend.

    Business logic:
    - If registration = "github_oauth", then Display Name = GitHub username
      (from display_name field)
    - Else if First and Last name both exist, then Display Name = "First Last"
    - Else Display Name = email address

    Args:
        registration_type: Type of registration (e.g., "email", "github_oauth",
                           "google_oauth")
        first_name: User's first name (can be None or empty)
        last_name: User's last name (can be None or empty)
        display_name: Provider-specific display name (e.g., GitHub username)
        email: User's email address (fallback)

    Returns:
        Computed display name string
    """
    # For GitHub OAuth users, use their GitHub username (stored in display_name)
    if registration_type == "github_oauth" and display_name:
        return display_name

    # If both first and last names exist and are non-empty, combine them
    if first_name and last_name and first_name.strip() and last_name.strip():
        return f"{first_name.strip()} {last_name.strip()}"

    # Fallback to email address
    return email


def generate_display_name_from_user(user) -> str:
    """
    Generate display name from a User database model.

    Args:
        user: User database model with required attributes

    Returns:
        Computed display name string
    """
    return generate_display_name(
        registration_type=user.registration_type,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=user.display_name,
        email=user.email,
    )
