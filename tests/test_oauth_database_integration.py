"""
OAuth Database Integration Tests

Critical security tests for OAuth user model functionality with real database operations.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

from api.database import Base, User, AuthProvider


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


class TestOAuthDatabaseIntegration:
    """Critical OAuth security tests with real database operations."""
    
    def test_local_user_defaults_in_database(self, db_session):
        """Test that local auth users get proper defaults when inserted to database."""
        user = User(
            email="local@example.com",
            first_name="Local",
            last_name="User",
            password_hash="$2b$12$hashed_password",
            organization="Test Org"
        )
        
        # Before database insert - no defaults applied
        assert user.auth_provider is None  # Not yet applied
        assert user.id is None  # Not yet applied
        
        # Insert to database
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # After database insert - defaults should be applied
        assert user.auth_provider == AuthProvider.LOCAL
        assert user.is_active is True
        assert user.has_projects_access is True
        assert user.google_id is None
        assert user.id is not None
        assert user.created_at is not None
    
    def test_google_oauth_user_in_database(self, db_session):
        """Test Google OAuth user creation in database."""
        google_user = User(
            email="oauth@gmail.com",
            first_name="OAuth",
            last_name="User",
            organization="Google Inc",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_123456789",
            password_hash=None  # OAuth users don't need password
        )
        
        # Insert to database
        db_session.add(google_user)
        db_session.commit()
        db_session.refresh(google_user)
        
        # Verify OAuth user in database
        assert google_user.email == "oauth@gmail.com"
        assert google_user.auth_provider == AuthProvider.GOOGLE
        assert google_user.google_id == "google_123456789"
        assert google_user.password_hash is None
        assert google_user.is_active is True  # Default
        assert google_user.has_projects_access is True  # Default
        assert google_user.id is not None
        assert google_user.created_at is not None
    
    def test_google_id_uniqueness_constraint(self, db_session):
        """Test that google_id must be unique."""
        # Create first Google user
        user1 = User(
            email="user1@gmail.com",
            first_name="User",
            last_name="One",
            organization="Test",
            auth_provider=AuthProvider.GOOGLE,
            google_id="duplicate_id",
            password_hash=None
        )
        db_session.add(user1)
        db_session.commit()
        
        # Try to create second user with same google_id
        user2 = User(
            email="user2@gmail.com",
            first_name="User",
            last_name="Two", 
            organization="Test",
            auth_provider=AuthProvider.GOOGLE,
            google_id="duplicate_id",  # Same as user1
            password_hash=None
        )
        db_session.add(user2)
        
        # Should raise integrity error due to unique constraint
        with pytest.raises(Exception):  # SQLite raises IntegrityError, Postgres raises different error
            db_session.commit()
    
    def test_user_can_have_local_and_google_accounts_different_emails(self, db_session):
        """Test that the same person can have both local and Google accounts with different emails."""
        # Local account
        local_user = User(
            email="user@company.com",
            first_name="John",
            last_name="Doe",
            organization="Company",
            password_hash="$2b$12$hashed",
            auth_provider=AuthProvider.LOCAL
        )
        
        # Google account (different email)
        google_user = User(
            email="john.doe@gmail.com",
            first_name="John",
            last_name="Doe", 
            organization="Company",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_john_doe",
            password_hash=None
        )
        
        db_session.add_all([local_user, google_user])
        db_session.commit()
        
        # Both should exist successfully
        assert local_user.id != google_user.id
        assert local_user.email != google_user.email
        assert local_user.auth_provider == AuthProvider.LOCAL
        assert google_user.auth_provider == AuthProvider.GOOGLE
    
    def test_oauth_user_password_hash_can_be_null(self, db_session):
        """Test that OAuth users can have NULL password_hash."""
        oauth_user = User(
            email="oauth@example.com",
            first_name="OAuth",
            last_name="User",
            organization="Test",
            auth_provider=AuthProvider.GOOGLE,
            google_id="google_oauth_user",
            password_hash=None  # Explicitly NULL
        )
        
        db_session.add(oauth_user)
        db_session.commit()
        db_session.refresh(oauth_user)
        
        assert oauth_user.password_hash is None
        assert oauth_user.auth_provider == AuthProvider.GOOGLE
        assert oauth_user.google_id == "google_oauth_user"
    
    def test_local_user_requires_password_hash(self, db_session):
        """Test that local users should have password_hash (business logic, not DB constraint)."""
        # This is more of a business rule test - the DB allows NULL password_hash
        # but our application logic should require it for local users
        local_user_no_password = User(
            email="nopass@example.com",
            first_name="No",
            last_name="Password",
            organization="Test",
            auth_provider=AuthProvider.LOCAL,
            password_hash=None  # This should be caught by business logic
        )
        
        # Database will allow this, but our auth logic should prevent it
        db_session.add(local_user_no_password)
        db_session.commit()
        
        # This passes at DB level - we need to enforce at application level
        assert local_user_no_password.password_hash is None
        assert local_user_no_password.auth_provider == AuthProvider.LOCAL
        # Note: We'll add business logic validation in the auth endpoints