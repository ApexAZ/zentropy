"""
Test Configuration and Fixtures

This file provides centralized test configuration including:
- Isolated test database setup
- Test client fixtures 
- Database dependency overrides
- Test data cleanup
"""
import pytest
import tempfile
import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from api.main import app
from api.database import Base, get_db


# Test database configuration
@pytest.fixture(scope="function")
def test_db_engine():
    """Create isolated test database engine using in-memory SQLite."""
    # Use in-memory SQLite for fast, isolated tests
    test_database_url = "sqlite:///:memory:"
    
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},  # Required for SQLite
        echo=False  # Set to True for SQL debugging
    )
    
    # Create all tables in the test database
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Cleanup: Drop all tables after test
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function") 
def test_db_session(test_db_engine) -> Generator[Session, None, None]:
    """Create isolated test database session."""
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False, 
        bind=test_db_engine
    )
    
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        # Rollback any uncommitted changes
        session.rollback()
        session.close()


@pytest.fixture(scope="function")
def test_client(test_db_session: Session) -> TestClient:
    """Create test client with isolated database."""
    
    def override_get_db():
        """Override database dependency with test database."""
        try:
            yield test_db_session
        finally:
            pass  # Session cleanup handled by test_db_session fixture
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    
    yield client
    
    # Cleanup: Remove dependency override
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def persistent_test_db():
    """Create persistent test database file for integration tests that need it."""
    # Create temporary database file
    temp_dir = tempfile.mkdtemp()
    test_db_path = os.path.join(temp_dir, "test_zentropy.db")
    test_database_url = f"sqlite:///{test_db_path}"
    
    engine = create_engine(
        test_database_url,
        echo=False
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )
    
    yield TestingSessionLocal, test_database_url
    
    # Cleanup: Remove temporary database file
    engine.dispose()
    try:
        os.remove(test_db_path)
        os.rmdir(temp_dir)
    except (FileNotFoundError, OSError):
        pass  # File already cleaned up


# Auto-isolation detection logic
def should_apply_isolation(request) -> bool:
    """
    Determine if a test needs database isolation based on:
    - Database model imports (User, Organization, etc.)
    - Database-related test names
    - Database-related fixture dependencies
    """
    # Check test name for database-related keywords
    test_name = request.node.name.lower()
    # More specific keywords to avoid conflicts with existing tests
    database_keywords = [
        'database', 'user_creation', 'user_registration', 'auth_flow', 'oauth_flow',
        'email_verification', 'organization_creation', 'team_creation'
    ]
    
    # Only trigger for very specific database creation/management patterns
    if any(keyword in test_name for keyword in database_keywords):
        return True
    
    # Check fixture dependencies for database-related fixtures
    fixture_names = getattr(request, 'fixturenames', [])
    db_fixtures = ['test_db', 'database', 'db_session', 'test_db_session']
    
    for fixture in fixture_names:
        # More specific matching to avoid false positives like '_session_faker'
        if any(fixture.lower().endswith(db_fixture) or fixture.lower().startswith(db_fixture) 
               for db_fixture in db_fixtures):
            return True
    
    # Check module imports for database models
    test_module = getattr(request, 'module', None)
    if test_module:
        database_models = [
            'User', 'Organization', 'Team', 'TeamMembership', 'TeamInvitation',
            'CalendarEntry', 'get_db', 'Base', 'Session'
        ]
        
        # Check if module actually has these attributes (not just Mock returning True)
        module_dict = getattr(test_module, '__dict__', {})
        for model in database_models:
            if model in module_dict:
                return True
    
    return False


def setup_test_isolation():
    """Set up database isolation for a test."""
    # Create in-memory SQLite database
    test_database_url = "sqlite:///:memory:"
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
    
    # Import here to avoid circular imports
    from api.database import Base
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine
    )
    session = TestingSessionLocal()
    
    # Override database dependency
    def override_get_db():
        try:
            yield session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    client = TestClient(app)
    
    return client, session


@pytest.fixture(scope="function", autouse=True)
def auto_isolation(request):
    """
    Automatically apply database isolation when tests need it.
    
    This fixture:
    1. Detects if a test needs database isolation
    2. Sets up isolation if needed
    3. Cleans up after the test
    """
    needs_isolation = should_apply_isolation(request)
    
    if needs_isolation:
        # Set up isolation
        client, session = setup_test_isolation()
        
        # Make available globally for convenience
        import builtins
        builtins.client = client
        builtins.db_session = session
        
        try:
            yield client, session
        finally:
            # Cleanup
            session.close()
            Base.metadata.drop_all(bind=session.bind)
            session.bind.dispose()
            app.dependency_overrides.clear()
            
            # Remove globals
            if hasattr(builtins, 'client'):
                delattr(builtins, 'client')
            if hasattr(builtins, 'db_session'):
                delattr(builtins, 'db_session')
    else:
        # No isolation needed - don't set up any globals
        # Ensure globals are not available
        import builtins
        if hasattr(builtins, 'client'):
            delattr(builtins, 'client')
        if hasattr(builtins, 'db_session'):
            delattr(builtins, 'db_session')
        yield None


# Legacy fixtures for backward compatibility
# These provide the traditional fixture-based isolation for existing tests
@pytest.fixture(scope="function")
def db(test_db_session: Session) -> Session:
    """Legacy database fixture - redirects to isolated test database."""
    return test_db_session


@pytest.fixture(scope="function") 
def client(test_client: TestClient) -> TestClient:
    """Legacy client fixture - redirects to isolated test client."""
    return test_client