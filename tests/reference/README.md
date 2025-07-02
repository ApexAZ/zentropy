# Test Reference Documentation

This directory contains comprehensive test suites that serve as reference documentation for the API design and expected behaviors.

## Files:

- **test_api_endpoints.py** - Comprehensive API endpoint test examples
- **test_auth.py** - Authentication and security test patterns  
- **test_database_models.py** - Database model validation examples

## Purpose:

These tests were created as comprehensive examples but don't match the current API implementation. They serve as:

1. **API Design Reference** - Shows intended endpoint behaviors and response formats
2. **Test Pattern Examples** - Demonstrates thorough testing approaches
3. **Security Test Models** - Examples of authentication and authorization testing
4. **Future Enhancement Guide** - Reference for when implementing missing features

## Current Working Tests:

- `tests/test_startup.py` - Core functionality validation (used in pre-commit)
- `src/client/**/__tests__/` - React component tests (ProfileDropdown used in pre-commit)

## Integration:

When implementing new features, refer to these tests for:
- Expected error messages and status codes
- Response data structures  
- Security validation patterns
- Comprehensive test coverage approaches