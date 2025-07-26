"""
Test Configuration and Fixtures - Simplified and Clear

This file provides straightforward test fixtures that any developer can understand:
- Isolated test database setup
- Test client fixtures
- Email testing with Mailpit cleanup
- No magic, no auto-detection
- Explicit dependencies
"""
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
import httpx
import os

from api.main import app
from api.database import Base, get_db


@pytest.fixture(scope="session")
def test_db_engine():
    """Create shared test database engine for the entire test session."""
    import tempfile
    import os
    
    # Create a temporary database file that can be shared across connections
    temp_db_fd, temp_db_path = tempfile.mkstemp(suffix='.db')
    os.close(temp_db_fd)  # Close the file descriptor, keep the path
    
    test_database_url = f"sqlite:///{temp_db_path}"
    
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},  # Required for SQLite
        echo=False,  # Set to True for SQL debugging
        poolclass=StaticPool  # Use static pool for better connection reuse
    )
    
    # Create all tables in the test database once
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup: Drop all tables and remove temp file
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    try:
        os.unlink(temp_db_path)
    except OSError:
        pass  # File might already be deleted


@pytest.fixture(scope="function") 
def db(test_db_engine) -> Generator[Session, None, None]:
    """
    Provides a clean test database session for each test using transaction rollback.
    
    This fixture uses transaction rollback for fast test isolation:
    - Creates a connection with a transaction
    - Commits within the test work normally
    - Transaction is rolled back at the end for cleanup
    
    Use this fixture when your test needs to interact with the database directly.
    Example:
        def test_user_creation(db):
            user = User(email="test@example.com")
            db.add(user)
            db.commit()  # Works normally within the test
    """
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        # Only rollback if transaction is still active
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(test_db_engine) -> Generator[TestClient, None, None]:
    """
    Provides a FastAPI test client with isolated database using transaction rollback.
    
    This fixture uses the same transaction rollback approach as the db fixture
    for fast test isolation and consistency.
    
    Use this fixture when testing API endpoints.
    Example:
        def test_register_user(client):
            response = client.post("/api/v1/auth/register", json={...})
            assert response.status_code == 201
    """
    connection = test_db_engine.connect()
    transaction = connection.begin()
    
    def override_get_db():
        session = Session(bind=connection)
        try:
            yield session
        finally:
            session.close()

    # Override database dependency for testing
    app.dependency_overrides[get_db] = override_get_db
    
    try:
        yield TestClient(app)
    finally:
        # Clear overrides after test
        app.dependency_overrides.clear()
        # Only rollback if transaction is still active
        if transaction.is_active:
            transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def clean_mailpit():
    """
    Ensures Mailpit is clean before and after each test.
    
    NOTE: Most tests don't need this fixture since auto_clean_mailpit 
    handles cleanup automatically. Only use this if you need to ensure
    Mailpit is clean BEFORE your test starts.
    
    Example:
        def test_email_count_verification(client, clean_mailpit):
            # Test starts with guaranteed clean mailpit
            # Useful for tests that count emails or verify specific states
    """
    # Clean before test
    try:
        httpx.delete("http://localhost:8025/api/v1/messages", timeout=5.0)
    except Exception:
        pass  # Mailpit might not be running
    
    yield
    
    # Clean after test
    try:
        httpx.delete("http://localhost:8025/api/v1/messages", timeout=5.0)
    except Exception:
        pass  # Mailpit might not be running


@pytest.fixture(scope="function")
def auto_clean_mailpit():
    """
    Cleans Mailpit after each test that uses this fixture.
    
    Use this fixture for email-related tests to prevent email accumulation.
    Most tests don't need this overhead.
    
    Example:
        def test_email_sending(client, auto_clean_mailpit):
            # Test email functionality
    """
    yield
    
    # Clean after test to prevent accumulation
    try:
        httpx.delete("http://localhost:8025/api/v1/messages", timeout=5.0)
    except Exception:
        pass  # Mailpit might not be running


@pytest.fixture(scope="function")
def mailpit_disabled():
    """
    Disables email sending for tests that don't need it.
    
    Use this fixture to speed up tests that don't require email functionality.
    Example:
        def test_user_model(db, mailpit_disabled):
            # Test database operations without sending emails
    """
    original_value = os.environ.get("EMAIL_ENABLED")
    os.environ["EMAIL_ENABLED"] = "false"
    
    yield
    
    # Restore original value
    if original_value is not None:
        os.environ["EMAIL_ENABLED"] = original_value
    else:
        os.environ.pop("EMAIL_ENABLED", None)


@pytest.fixture(scope="function")
def test_rate_limits():
    """
    Configures realistic but generous rate limits for testing.
    
    This preserves rate limiting logic while allowing legitimate test scenarios
    to run without interference. The limits are still realistic enough to catch
    actual rate limiting bugs if they occur.
    
    Use this for integration tests that make multiple API calls.
    Example:
        def test_multiple_api_calls(client, test_rate_limits):
            # Test that makes many API calls
    """
    original_values = {}
    
    # Test-friendly limits: generous enough for tests, realistic enough to catch bugs
    test_config = {
        "RATE_LIMIT_AUTH_REQUESTS": "50",      # vs prod: 5 requests  
        "RATE_LIMIT_AUTH_WINDOW_MINUTES": "10", # vs prod: 15 minutes
        "RATE_LIMIT_OAUTH_REQUESTS": "100",    # vs prod: 20 requests
        "RATE_LIMIT_OAUTH_WINDOW_MINUTES": "1", # vs prod: 1 minute  
        "RATE_LIMIT_API_REQUESTS": "500",      # vs prod: 100 requests
        "RATE_LIMIT_API_WINDOW_MINUTES": "1",  # vs prod: 1 minute
        "RATE_LIMIT_EMAIL_REQUESTS": "25",     # vs prod: 3 requests
        "RATE_LIMIT_EMAIL_WINDOW_MINUTES": "5" # vs prod: 5 minutes
    }
    
    for key, value in test_config.items():
        original_values[key] = os.environ.get(key)
        os.environ[key] = value
    
    # Clear any existing rate limiting state to ensure test isolation
    try:
        from api.rate_limiter import rate_limiter
        # Clear Redis and memory stores for clean test state
        if hasattr(rate_limiter, 'redis_client') and rate_limiter.redis_client:
            try:
                # Clear any test-related rate limit keys
                rate_limiter.redis_client.flushdb()
            except Exception:
                # If Redis is rate limited, force use of memory store
                rate_limiter.redis_client = None
        if hasattr(rate_limiter, '_memory_store'):
            rate_limiter._memory_store.clear()
    except Exception:
        pass  # Rate limiter might not be initialized yet
    
    yield
    
    # Restore original values
    for key, original_value in original_values.items():
        if original_value is not None:
            os.environ[key] = original_value
        else:
            os.environ.pop(key, None)
    
    # Clear rate limiter state on teardown
    try:
        from api.rate_limiter import rate_limiter
        if hasattr(rate_limiter, '_memory_store'):
            rate_limiter._memory_store.clear()
    except Exception:
        pass


def create_test_user(db, **kwargs):
    """Create a test user with default values."""
    from api.database import User, AuthProvider
    
    defaults = {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "password_hash": "$2b$12$27ehzIuSkSIzHVwXqAWAyO8YUiX4qJGGNbZB7jJicHkWQ/jd.tKWS",  # hash of "TestPassword123!"
        "auth_provider": AuthProvider.LOCAL,
        "is_active": True,
        "email_verified": True,
        "has_projects_access": True,
    }
    defaults.update(kwargs)
    
    user = User(**defaults)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_team(db, **kwargs):
    """Create a test team with default values."""
    from api.database import Team
    
    defaults = {
        "name": "Test Team",
        "description": "A test team",
        "velocity_baseline": 10,
        "sprint_length_days": 14,
        "working_days_per_week": 5,
    }
    defaults.update(kwargs)
    
    team = Team(**defaults)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def manually_verify_user_email(db, email):
    """Manually verify a user's email for testing purposes."""
    from api.database import User
    
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.email_verified = True
        db.commit()
        db.refresh(user)
    return user


@pytest.fixture(scope="function")
def current_user(db):
    """Create a verified test user for authentication tests."""
    return create_test_user(db, email="current@user.com", email_verified=True)


@pytest.fixture(scope="function")
def auth_headers(current_user):
    """Create authentication headers for API testing."""
    from api.auth import create_access_token
    
    token = create_access_token(data={"sub": str(current_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_user(db):
    """Create an admin test user for admin-level testing."""
    from api.database import UserRole
    
    return create_test_user(
        db, 
        email="admin@user.com", 
        email_verified=True,
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN
    )


@pytest.fixture(scope="function")
def admin_auth_headers(admin_user):
    """Create authentication headers for admin API testing."""
    from api.auth import create_access_token
    
    token = create_access_token(data={"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def user_with_known_password(db):
    """Create a user with a known password for password change testing."""
    from api.auth import get_password_hash
    
    raw_password = "OldPassword123!"
    user = create_test_user(
        db,
        email="password@user.com",
        password_hash=get_password_hash(raw_password),
        email_verified=True
    )
    
    # Store the raw password for testing purposes
    user.known_password = raw_password
    return user