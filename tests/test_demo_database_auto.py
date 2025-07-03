"""
Demo Database Tests - Should Get Auto-Isolation

These tests should automatically get isolation because they have database operations.
"""


def test_user_registration_auto_isolation():
    """
    This test should automatically get database isolation because:
    - Test name contains 'user'
    
    No fixture parameters needed!
    """
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
    
    from api.database import User
    user = db_session.query(User).filter(User.email == "auto@example.com").first()
    assert user is not None
    assert user.email == "auto@example.com"


def test_database_operations():
    """
    This test should get auto-isolation because:
    - Test name contains 'database'
    """
    from api.database import User
    
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


def test_auth_flow():
    """
    This test should get auto-isolation because:
    - Test name contains 'auth'
    """
    # Register user
    register_data = {
        "email": "auth@example.com",
        "password": "Password123!",
        "first_name": "Auth",
        "last_name": "Test",
        "organization": "Auth Org",
        "terms_agreement": True
    }
    
    register_response = client.post("/api/auth/register", json=register_data)
    assert register_response.status_code == 201
    
    # Login
    login_data = {
        "email": "auth@example.com",
        "password": "Password123!"
    }
    
    login_response = client.post("/api/auth/login", json=login_data)
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()