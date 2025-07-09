"""
Test SECRET_KEY security validation
"""
import os
import pytest
from unittest.mock import patch
import importlib
import sys


def test_production_secret_key_validation():
    """Test that production environment requires explicit SECRET_KEY"""
    # Remove auth module if already imported to test fresh import
    if 'api.auth' in sys.modules:
        del sys.modules['api.auth']
    
    with patch.dict(os.environ, {'NODE_ENV': 'production'}, clear=False):
        # Remove SECRET_KEY if it exists
        with patch.dict(os.environ, {}, clear=False):
            if 'SECRET_KEY' in os.environ:
                os.environ.pop('SECRET_KEY')
            
            # Should raise ValueError in production without SECRET_KEY
            with pytest.raises(ValueError, match="SECRET_KEY environment variable must be explicitly set in production"):
                import api.auth  # noqa: F401


def test_production_with_secret_key():
    """Test that production works when SECRET_KEY is provided"""
    # Remove auth module if already imported to test fresh import
    if 'api.auth' in sys.modules:
        del sys.modules['api.auth']
    
    with patch.dict(os.environ, {
        'NODE_ENV': 'production', 
        'SECRET_KEY': 'test_production_key'
    }, clear=False):
        # Should work fine with explicit SECRET_KEY
        import api.auth
        assert api.auth.SECRET_KEY == 'test_production_key'


def test_development_mode_generates_warning(capsys):
    """Test that development mode generates warning for missing SECRET_KEY"""
    # Remove auth module if already imported to test fresh import
    if 'api.auth' in sys.modules:
        del sys.modules['api.auth']
    
    with patch.dict(os.environ, {'NODE_ENV': 'development'}, clear=False):
        # Remove SECRET_KEY if it exists
        with patch.dict(os.environ, {}, clear=False):
            if 'SECRET_KEY' in os.environ:
                os.environ.pop('SECRET_KEY')
            
            # Should generate warning but continue
            import api.auth  # noqa: F401
            captured = capsys.readouterr()
            assert "WARNING: Using randomly generated SECRET_KEY" in captured.out


def test_development_with_explicit_secret_key():
    """Test that development mode works with explicit SECRET_KEY"""
    # Remove auth module if already imported to test fresh import
    if 'api.auth' in sys.modules:
        del sys.modules['api.auth']
    
    with patch.dict(os.environ, {
        'NODE_ENV': 'development',
        'SECRET_KEY': 'explicit_dev_key'
    }, clear=False):
        # Should use explicit key without warning
        import api.auth
        assert api.auth.SECRET_KEY == 'explicit_dev_key'


def teardown_function():
    """Clean up module imports after each test"""
    if 'api.auth' in sys.modules:
        del sys.modules['api.auth']