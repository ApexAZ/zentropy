"""
Test that deprecated organization field is not used in new Google OAuth flows.

This test validates that the Google OAuth implementation uses the proper
organization_id foreign key relationship instead of the deprecated organization string field.
"""
import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session

from api.database import User, Organization, AuthProvider, RegistrationType
from api.google_oauth import get_or_create_google_user, process_google_oauth


class TestDeprecatedOrganizationField:
    """Test that deprecated organization field usage is eliminated."""

    def test_google_workspace_user_uses_organization_id_not_deprecated_field(self, db: Session):
        """Test that Google Workspace users get organization_id, not deprecated organization field."""
        # Mock Google Workspace user with hosted domain
        google_info_workspace = {
            'sub': '987654321'
            'email': 'employee@testcompany.com'
            'given_name': 'Jane'
            'family_name': 'Smith'
            'email_verified': True
            'hd': 'testcompany.com'  # Google Workspace hosted domain
        }

        # Create user via Google OAuth
        user = get_or_create_google_user(db, google_info_workspace)

        # Verify organization relationship is properly set
        assert user.organization_id is not None
        assert user.organization_rel is not None
        assert user.organization_rel.domain == 'testcompany.com'
        assert user.organization_rel.name == 'Testcompany'

        # Verify deprecated field is still set for backward compatibility
        # but the primary relationship is via organization_id
        assert user.organization is not None  # Temporary compatibility
        assert user.organization == user.organization_rel.name

    def test_personal_gmail_user_has_no_organization(self, db: Session):
        """Test that personal Gmail users have no organization assignment."""
        # Mock personal Gmail user (no hosted domain)
        google_info_personal = {
            'sub': '123456789'
            'email': 'user@gmail.com'
            'given_name': 'John'
            'family_name': 'Doe'
            'email_verified': True
            # No 'hd' field - personal account
        }

        # Create user via Google OAuth
        user = get_or_create_google_user(db, google_info_personal)

        # Verify no organization relationship
        assert user.organization_id is None
        assert user.organization_rel is None

        # Verify deprecated field is empty for backward compatibility
        assert user.organization == ""

    def test_api_response_uses_organization_relationship(self, db: Session):
        """Test that API response uses organization_rel.name instead of deprecated field."""
        # Create organization first
        org = Organization(
            name="Test Corporation"
            domain="testcorp.com"
            website="https://testcorp.com"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # Create user with organization relationship
        user = User(
            email="test@testcorp.com"
            first_name="Test"
            last_name="User"
            organization_id=org.id,  # Use proper foreign key
            ,  # Different from actual org name
            auth_provider=AuthProvider.GOOGLE
            google_id="test_google_id"
            registration_type=RegistrationType.GOOGLE_OAUTH
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Mock process_google_oauth to return user info
        with patch('api.google_oauth.verify_google_token') as mock_verify:
            mock_verify.return_value = {
                'sub': 'test_google_id'
                'email': 'test@testcorp.com'
                'given_name': 'Test'
                'family_name': 'User'
                'email_verified': True
            }

            result = process_google_oauth(db, "mock_token", "127.0.0.1")

            # Verify API response uses organization relationship, not deprecated field
            assert result["user"]["organization"] == "Test Corporation"  # From organization_rel.name
            assert result["user"]["organization"] != "Old Deprecated Value"  # Not from deprecated field

    def test_organization_deduplication_works_correctly(self, db: Session):
        """Test that organization deduplication works with the new foreign key approach."""
        # First user creates organization
        google_info_1 = {
            'sub': '111111111'
            'email': 'user1@company.com'
            'given_name': 'User'
            'family_name': 'One'
            'email_verified': True
            'hd': 'company.com'
        }

        user1 = get_or_create_google_user(db, google_info_1)
        org_id_1 = user1.organization_id

        # Second user from same domain should reuse organization
        google_info_2 = {
            'sub': '222222222'
            'email': 'user2@company.com'
            'given_name': 'User'
            'family_name': 'Two'
            'email_verified': True
            'hd': 'company.com'  # Same domain
        }

        user2 = get_or_create_google_user(db, google_info_2)
        org_id_2 = user2.organization_id

        # Verify both users share the same organization
        assert org_id_1 == org_id_2
        assert user1.organization_rel == user2.organization_rel
        assert user1.organization_rel.domain == 'company.com'

        # Verify only one organization was created
        org_count = db.query(Organization).filter(Organization.domain == 'company.com').count()
        assert org_count == 1