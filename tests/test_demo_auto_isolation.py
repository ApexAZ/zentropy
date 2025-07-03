"""
Demo Tests for Auto-Isolation System

These tests demonstrate that the auto-isolation system works:
1. Database tests automatically get isolation
2. Pure unit tests skip isolation
3. No manual fixture parameters needed
"""


def test_user_creation_with_auto_isolation():
    """
    This test should automatically get database isolation because:
    1. Test name contains 'user' 
    
    No fixture parameters needed!
    """
    # These should be available via auto-isolation
    user_data = {
        "email": "auto@example.com",
        "password": "Password123!",
        "first_name": "Auto",
        "last_name": "User",
        "organization": "Auto Org",
        "terms_agreement": True
    }
    
    # client and db_session should be automatically available
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    
    # Import User model inside test to trigger isolation detection
    from api.database import User
    
    # Query the isolated database
    user = db_session.query(User).filter(User.email == "auto@example.com").first()
    assert user is not None
    assert user.email == "auto@example.com"


def test_database_operations_auto_detected():
    """
    This test should get auto-isolation because:
    1. Test name contains 'database'
    """
    # Import User model inside test
    from api.database import User
    
    # Create user directly in database
    user = User(
        email="database@example.com",
        first_name="Database",
        last_name="Test",
        organization="DB Org",
        password_hash="hashed"
    )
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    assert user.id is not None
    assert user.email == "database@example.com"


def test_auth_endpoint_auto_detected():
    """
    This test should get auto-isolation because:
    1. Test name contains 'auth'
    """
    # Test login endpoint
    login_data = {
        "email": "auth@example.com",
        "password": "Password123!"
    }
    
    # First register a user
    register_data = {
        "email": "auth@example.com",
        "password": "Password123!",
        "first_name": "Auth",
        "last_name": "Test",
        "organization": "Auth Org",
        "terms_agreement": True
    }
    
    # Register
    register_response = client.post("/api/auth/register", json=register_data)
    assert register_response.status_code == 201
    
    # Login
    login_response = client.post("/api/auth/login", json=login_data)
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


# Pure unit tests (should NOT get isolation)
def test_pure_utility_function():
    """
    This test should NOT get auto-isolation because:
    1. No database-related imports in test name
    2. No database operations
    3. Pure utility function testing
    
    Note: This test will fail if auto-isolation is incorrectly applied
    because 'client' and 'db_session' won't be available.
    """
    # Simple utility function test
    def add_numbers(a, b):
        return a + b
    
    result = add_numbers(2, 3)
    assert result == 5
    
    # Verify auto-isolation was NOT applied
    try:
        # This should fail if isolation was applied
        client.get("/")
        assert False, "Auto-isolation incorrectly applied to pure unit test"
    except NameError:
        # Expected - client should not be available
        pass


def test_string_utilities():
    """
    Another pure unit test that should NOT get isolation.
    """
    def capitalize_words(text):
        return " ".join(word.capitalize() for word in text.split())
    
    result = capitalize_words("hello world")
    assert result == "Hello World"
    
    # Verify no database globals are available
    try:
        from api.database import User
        db_session.query(User)
        assert False, "Database session incorrectly available in pure unit test"
    except NameError:
        # Expected - db_session should not be available
        pass