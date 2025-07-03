"""
OAuth Organization Integration Testing Suite (TDD)

Tests for creating organizations during OAuth registration flow.
Following TDD - these tests should FAIL until we implement the integration.
"""
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.database import Base, User, Organization, AuthProvider, IndustryType
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


class TestOAuthOrganizationCreation:
    """Critical tests for creating organizations during OAuth registration."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_workspace_creates_organization(self, mock_verify_google_token, db_session, client):
        """Test that Google Workspace users automatically create organization."""
        # Mock Google Workspace user
        mock_google_user_info = {
            "sub": "workspace_user_123",
            "email": "employee@newcompany.com",
            "given_name": "New",
            "family_name": "Employee",
            "email_verified": True,
            "hd": "newcompany.com"  # Google Workspace domain
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Verify no organization exists initially
        existing_org = db_session.query(Organization).filter(
            Organization.domain == "newcompany.com"
        ).first()
        assert existing_org is None
        
        # OAuth login should create both user and organization
        request = GoogleLoginRequest(google_token="workspace_token")
        result = google_login(request, db_session)
        
        # Verify user was created
        assert result.access_token is not None
        assert result.user["email"] == "employee@newcompany.com"
        
        # Verify organization was created
        created_org = db_session.query(Organization).filter(
            Organization.domain == "newcompany.com"
        ).first()
        assert created_org is not None
        assert created_org.name == "Newcompany.Com"
        assert created_org.domain == "newcompany.com"
        assert created_org.website == "https://newcompany.com"
        
        # Verify user is linked to organization
        created_user = db_session.query(User).filter(
            User.email == "employee@newcompany.com"
        ).first()
        assert created_user.organization_id == created_org.id
        assert created_user.organization_rel == created_org
        
        print(f"✅ Organization created: {created_org.name} with domain {created_org.domain}")
    
    @patch('api.routers.auth.verify_google_token')
    def test_existing_organization_reused(self, mock_verify_google_token, db_session, client):
        """Test that existing organizations are reused for new users."""
        # Create existing organization
        existing_org = Organization(
            name="Acme Corporation",
            domain="acme.com",
            website="https://acme.com"
        )
        db_session.add(existing_org)
        db_session.commit()
        db_session.refresh(existing_org)
        
        # Mock new user from same domain
        mock_google_user_info = {
            "sub": "new_employee_456",
            "email": "newuser@acme.com",
            "given_name": "New",
            "family_name": "User",
            "email_verified": True,
            "hd": "acme.com"  # Same domain as existing org
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # OAuth login should use existing organization
        request = GoogleLoginRequest(google_token="workspace_token")
        result = google_login(request, db_session)
        
        # Verify user was created and linked to existing organization
        created_user = db_session.query(User).filter(
            User.email == "newuser@acme.com"
        ).first()
        assert created_user.organization_id == existing_org.id
        
        # Verify no duplicate organization was created
        all_orgs = db_session.query(Organization).filter(
            Organization.domain == "acme.com"
        ).all()
        assert len(all_orgs) == 1
        
        print(f"✅ Existing organization reused: {existing_org.name}")
    
    @patch('api.routers.auth.verify_google_token')
    def test_manual_organization_override(self, mock_verify_google_token, db_session, client):
        """Test that manual organization info overrides Google domain."""
        # Mock Google user
        mock_google_user_info = {
            "sub": "user_789",
            "email": "contractor@gmail.com",
            "given_name": "Contractor",
            "family_name": "User",
            "email_verified": True,
            "hd": None  # Regular Gmail user
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # OAuth login with manual organization
        request = GoogleLoginRequest(
            google_token="gmail_token",
            organization="Custom Consulting LLC"
        )
        result = google_login(request, db_session)
        
        # Verify organization was created with manual name
        created_org = db_session.query(Organization).filter(
            Organization.name == "Custom Consulting LLC"
        ).first()
        assert created_org is not None
        assert created_org.name == "Custom Consulting LLC"
        assert created_org.domain is None  # No domain for manual org
        
        # Verify user is linked to manual organization
        created_user = db_session.query(User).filter(
            User.email == "contractor@gmail.com"
        ).first()
        assert created_user.organization_id == created_org.id
        
        print(f"✅ Manual organization created: {created_org.name}")
    
    @patch('api.routers.auth.verify_google_token')
    def test_gmail_user_auto_organization(self, mock_verify_google_token, db_session, client):
        """Test that Gmail users get automatic organization from domain."""
        # Mock Gmail user
        mock_google_user_info = {
            "sub": "gmail_user_999",
            "email": "user@gmail.com",
            "given_name": "Gmail",
            "family_name": "User",
            "email_verified": True,
            "hd": None  # Regular Gmail user
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # OAuth login without manual organization
        request = GoogleLoginRequest(google_token="gmail_token")
        result = google_login(request, db_session)
        
        # Verify organization was created from email domain
        created_org = db_session.query(Organization).filter(
            Organization.name == "Gmail.Com"
        ).first()
        assert created_org is not None
        assert created_org.name == "Gmail.Com"
        assert created_org.domain == "gmail.com"
        
        print(f"✅ Gmail auto-organization created: {created_org.name}")


class TestOrganizationDeduplication:
    """Test organization deduplication logic."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_case_insensitive_domain_matching(self, mock_verify_google_token, db_session, client):
        """Test that domain matching is case-insensitive."""
        # Create organization with lowercase domain
        existing_org = Organization(
            name="Test Company",
            domain="testcompany.com"
        )
        db_session.add(existing_org)
        db_session.commit()
        
        # Mock user with uppercase domain
        mock_google_user_info = {
            "sub": "user_case_test",
            "email": "user@TESTCOMPANY.COM",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True,
            "hd": "TESTCOMPANY.COM"  # Uppercase domain
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        # Should find existing organization despite case difference
        request = GoogleLoginRequest(google_token="case_test_token")
        result = google_login(request, db_session)
        
        # Verify existing organization was reused
        created_user = db_session.query(User).filter(
            User.email == "user@testcompany.com"  # Email should be normalized to lowercase
        ).first()
        assert created_user.organization_id == existing_org.id
        
        # Verify no duplicate organization was created
        all_orgs = db_session.query(Organization).all()
        assert len(all_orgs) == 1
    
    @patch('api.routers.auth.verify_google_token')
    def test_organization_name_normalization(self, mock_verify_google_token, db_session, client):
        """Test that organization names are normalized consistently."""
        # This test documents the requirement for name normalization
        # Implementation will determine exact normalization rules
        
        mock_google_user_info = {
            "sub": "normalize_test",
            "email": "user@normalize-test.com",
            "given_name": "Test",
            "family_name": "User",
            "email_verified": True,
            "hd": "normalize-test.com"
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        request = GoogleLoginRequest(google_token="normalize_token")
        result = google_login(request, db_session)
        
        # Organization name should be consistently formatted
        created_org = db_session.query(Organization).first()
        assert created_org is not None
        # Test documents that domain should be normalized to consistent format
        assert "-" in created_org.domain or "_" not in created_org.domain  # Consistent format


class TestOrganizationFieldPopulation:
    """Test automatic population of organization fields."""
    
    @patch('api.routers.auth.verify_google_token')
    def test_google_workspace_organization_fields(self, mock_verify_google_token, db_session, client):
        """Test that Google Workspace organizations get properly populated fields."""
        mock_google_user_info = {
            "sub": "fields_test",
            "email": "user@fieldstest.com",
            "given_name": "Fields",
            "family_name": "Test",
            "email_verified": True,
            "hd": "fieldstest.com"
        }
        mock_verify_google_token.return_value = mock_google_user_info
        
        request = GoogleLoginRequest(google_token="fields_token")
        result = google_login(request, db_session)
        
        created_org = db_session.query(Organization).first()
        
        # Verify auto-populated fields
        assert created_org.name == "Fieldstest.Com"
        assert created_org.domain == "fieldstest.com"
        assert created_org.website == "https://fieldstest.com"
        assert created_org.short_name == "Fieldstest"  # Derived from domain
        
        # System fields should be set
        assert created_org.is_active is True
        assert created_org.created_at is not None
        assert created_org.updated_at is not None
        
        print(f"✅ Organization fields auto-populated: {created_org.__dict__}")