"""
Demo Pure Unit Tests - Should NOT Get Auto-Isolation

These tests should NOT get isolation because they don't use database.
"""


def test_pure_utility_function():
    """
    This test should NOT get auto-isolation because:
    - No database-related keywords in test name
    - No database operations
    
    If isolation is incorrectly applied, 'client' and 'db_session' will be available.
    """
    def add_numbers(a, b):
        return a + b
    
    result = add_numbers(2, 3)
    assert result == 5
    
    # Verify auto-isolation was NOT applied
    try:
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
        db_session.query("anything")
        assert False, "Database session incorrectly available in pure unit test"
    except NameError:
        # Expected - db_session should not be available
        pass


def test_math_operations():
    """
    Pure math test - should not get isolation.
    """
    def factorial(n):
        if n <= 1:
            return 1
        return n * factorial(n - 1)
    
    assert factorial(5) == 120
    assert factorial(0) == 1
    assert factorial(1) == 1
    
    # Verify isolation not applied
    try:
        db_session.close()
        assert False, "Database session should not exist in pure unit test"
    except NameError:
        # Expected - no database session
        pass