"""
Test Configuration and Fixtures - Simplified and Clear

This file provides straightforward test fixtures that any developer can understand:
- Isolated test database setup
- Test client fixtures
- No magic, no auto-detection
- Explicit dependencies
"""
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from api.main import app
from api.database import Base, get_db


@pytest.fixture(scope="function")
def test_db_engine():
    """Create isolated test database engine using in-memory SQLite."""
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
def db(test_db_engine) -> Generator[Session, None, None]:
    """
    Provides a clean test database session for each test.
    
    Use this fixture when your test needs to interact with the database directly.
    Example:
        def test_user_creation(db):
            user = User(email="test@example.com")
            db.add(user)
            db.commit()
    """
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
def client(db: Session) -> TestClient:
    """
    Provides a test client with isolated database.
    
    Use this fixture when your test needs to make API calls.
    The client automatically uses the isolated test database.
    Example:
        def test_register_endpoint(client):
            response = client.post("/api/auth/register", json=user_data)
            assert response.status_code == 201
    """
    def override_get_db():
        """Override database dependency with test database."""
        try:
            yield db
        finally:
            pass  # Session cleanup handled by db fixture
    
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db
    
    test_client = TestClient(app)
    
    yield test_client
    
    # Cleanup: Remove dependency override
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def api_client() -> TestClient:
    """
    Provides a simple test client without database isolation.
    
    Use this fixture for tests that don't need database access,
    like testing API validation or error handling.
    Example:
        def test_health_endpoint(api_client):
            response = api_client.get("/health")
            assert response.status_code == 200
    """
    return TestClient(app)


# Utility functions for common test patterns
def create_test_user(db: Session, email: str = "test@example.com", **kwargs):
    """
    Helper function to create a test user with sensible defaults.
    
    Args:
        db: Database session
        email: User email (default: test@example.com)
        **kwargs: Additional user fields
    
    Returns:
        User: Created user instance
    """
    from api.database import User
    
    user_data = {
        "email": email,
        "first_name": "Test",
        "last_name": "User",
        "password_hash": "hashed_password_123",
        "organization": "Test Corp",
        **kwargs
    }
    
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_team(db: Session, name: str = "Test Team", **kwargs):
    """
    Helper function to create a test team with sensible defaults.
    
    Args:
        db: Database session
        name: Team name (default: Test Team)
        **kwargs: Additional team fields
    
    Returns:
        Team: Created team instance
    """
    from api.database import Team
    
    team_data = {
        "name": name,
        "description": f"Description for {name}",
        **kwargs
    }
    
    team = Team(**team_data)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team