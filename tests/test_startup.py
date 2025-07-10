"""
Lightweight startup test to prevent commits that break server startup.
Runs as part of pre-commit hook to catch common issues early.
"""

import pytest
def test_python_module_imports():
    """Test that core Python modules can be imported without errors"""
    try:
        # Core API modules
        import api.main
        import api.database  
        import api.auth
        import api.schemas
        
        # Router modules
        import api.routers.auth
        import api.routers.users
        import api.routers.teams
        import api.routers.calendar_entries
        import api.routers.invitations
        
        assert True, "All API modules imported successfully"
    except ImportError as e:
        pytest.fail(f"Failed to import API modules: {e}")
    except SyntaxError as e:
        pytest.fail(f"Syntax error in API modules: {e}")


def test_database_models_definition():
    """Test that database models are properly defined"""
    try:
        from api.database import User, Team, CalendarEntry, TeamInvitation, TeamMembership
        
        # Check that models have required SQLAlchemy attributes
        required_models = [User, Team, CalendarEntry, TeamInvitation, TeamMembership]
        for model in required_models:
            assert hasattr(model, '__tablename__'), f"{model.__name__} missing __tablename__"
            assert hasattr(model, '__table__'), f"{model.__name__} missing __table__"
            
    except ImportError as e:
        pytest.fail(f"Failed to import database models: {e}")
    except Exception as e:
        pytest.fail(f"Database model definition error: {e}")


def test_fastapi_app_creation():
    """Test that FastAPI app can be created without errors"""
    try:
        from api.main import app
        
        # Basic checks that app was created properly
        assert app is not None, "FastAPI app is None"
        assert hasattr(app, 'routes'), "FastAPI app missing routes"
        assert len(app.routes) > 0, "FastAPI app has no routes defined"
        
    except ImportError as e:
        pytest.fail(f"Failed to import FastAPI app: {e}")
    except Exception as e:
        pytest.fail(f"FastAPI app creation error: {e}")


def test_auth_functions_available():
    """Test that authentication functions are available and callable"""
    try:
        from api.auth import (
            verify_password, 
            get_password_hash, 
            create_access_token,
            verify_token,
            get_current_user
        )
        
        # Check that functions are callable
        auth_functions = [
            verify_password, 
            get_password_hash, 
            create_access_token,
            verify_token,
            get_current_user
        ]
        
        for func in auth_functions:
            assert callable(func), f"{func.__name__} is not callable"
            
    except ImportError as e:
        pytest.fail(f"Failed to import auth functions: {e}")


def test_environment_variables():
    """Test that required environment variables have defaults or are set"""
    try:
        from api.database import DATABASE_URL
        
        # Check that database URL is properly constructed
        assert DATABASE_URL is not None, "DATABASE_URL is None"
        assert "postgresql://" in DATABASE_URL, "DATABASE_URL is not a PostgreSQL URL"
        
    except Exception as e:
        pytest.fail(f"Environment variable error: {e}")


if __name__ == "__main__":
    # Run with verbose output when called directly
    pytest.main([__file__, "-v"])