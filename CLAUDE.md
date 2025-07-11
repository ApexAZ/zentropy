# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zentropy - A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Python FastAPI backend, React frontend, and PostgreSQL database.

## Technology Stack & Architecture

@README.md

For a high-level overview of the project's architecture and tech stack, refer to the main `README.md`. For a detailed analysis of the technology stack and architectural patterns, refer to `docs/architecture/README.md`.

### Key Technologies

- **Backend**: Python (FastAPI, SQLAlchemy, PostgreSQL, Uvicorn)
- **Frontend**: TypeScript (React, Vite, TailwindCSS)
- **Authentication**: JWT tokens, Google OAuth
- **Quality Tools**: flake8, black, pyright, ESLint, Prettier, TypeScript Compiler, Husky, pytest, Vitest, Playwright

For more specific details on each module, refer to their respective `README.md` files:

- `api/README.md` (Backend API)
- `src/client/components/README.md` (React Components)
- `src/client/hooks/README.md` (React Hooks)
- `src/client/services/README.md` (Frontend Services)
- `tests/README.md` (Unit & Integration Testing)
- `tests-e2e/README.md` (End-to-End Testing with Playwright)
- `performance/README.md` (Performance Testing)

## Development Workflow

For a comprehensive overview of the development workflow and core commands, refer to the main `README.md`.

### Core Commands (Summary)

- `npm run dev`: Starts the full development environment.
- `npm run quality`: Runs the full quality pipeline (lint, format, type-check, test) with zero tolerance for errors and warnings.
- `npm run test`: Runs the complete unit and integration test suite.
- `npm run test:e2e`: Runs end-to-end tests with Playwright.
- `npm run fix`: Auto-fixes formatting and linting issues.

### Environment Variables (Summary)

- **Backend**: `.env` in the project root.
- **Frontend**: `src/client/.env.local`.
- For multi-machine setup, refer to `MULTIDEV.md`.

### SECRET_KEY Configuration

The `SECRET_KEY` environment variable is crucial for JWT token security.

- **Production Requirement**: `SECRET_KEY` MUST be explicitly set in production environments. If not set, the application will raise a `ValueError` and refuse to start.
- **Development Behavior**: In development, a random `SECRET_KEY` will be generated if not set, but a warning will be issued. This is acceptable for local development but **not** for production.
- **Generating a Secure Key**:
    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```
    Add the output to your `.env` file (or production environment configuration).

### Quality Process

- **Quality Obsessed MANDATORY TDD Practices - TESTS FIRST**: Write tests before code, every time, no exceptions.
- **Zero Tolerance for Warnings**: The quality pipeline is configured to fail on any warnings (e.g., deprecation notices) to ensure code is always up-to-date and following best practices.
- **Three-Layer Testing Strategy**: Comprehensive testing across unit, integration, and end-to-end layers for maximum confidence.

For full details on our quality process, including specific tooling and configurations:
- **Unit & Integration Testing**: `tests/README.md` - Backend (pytest) and frontend (vitest) testing strategies
- **End-to-End Testing**: `tests-e2e/README.md` - Playwright browser testing for complete user workflows
- **Test Coverage Matrix**: `docs/testing/TestCoverage.md` - Cross-layer test coverage relationships

### 🔒 TEST ISOLATION STANDARD (MANDATORY)

**CRITICAL**: All tests MUST use isolated test databases to prevent main database pollution.

#### **Problem Solved**

- **Database Pollution**: Integration tests were creating real users in the main PostgreSQL database
- **Test Contamination**: Tests affected each other through shared database state
- **Production Risk**: Main database mixed with test data, causing user cleanup issues

#### **Solution: Explicit Test Database System**

- **Central Configuration**: `tests/conftest.py` provides isolated test database fixtures.
- **In-Memory SQLite**: Each test gets a fresh, isolated in-memory database.
- **Automatic Cleanup**: Database created/destroyed per test function.
- **FastAPI Integration**: Database dependency injection for API endpoint testing.

#### **Implementation Requirements**

```python
# tests/conftest.py - Central test configuration
@pytest.fixture(scope="function")
def test_db_engine():
    """Create isolated test database engine using in-memory SQLite."""
    test_database_url = "sqlite:///:memory:"
    engine = create_engine(test_database_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture(scope="function")
def test_db_session(test_db_engine):
    """Create isolated database session for each test."""
    SessionLocal = sessionmaker(bind=test_db_engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="function")
def client(test_db_session):
    """Create test client with isolated database."""
    def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

#### **MANDATORY Usage Pattern**

```python
# ✅ CORRECT - Uses isolated test database
def test_user_creation(client, db):
    """Test user creation with isolated database."""
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201

    # Safe to query - isolated database
    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user is not None

# ❌ INCORRECT - Uses main database (FORBIDDEN)
def test_user_creation_wrong():
    """DON'T DO THIS - pollutes main database."""
    with next(get_db()) as db:  # ❌ Uses main database
        user = User(email="test@example.com")
        db.add(user)
        db.commit()
```

#### **Test Categories & Requirements**

- **Unit Tests**: Always use isolated fixtures from `conftest.py`
- **Integration Tests**: Must use `client` fixture with database dependency override
- **API Tests**: Use `TestClient` with isolated database session
- **Database Tests**: Use `db` fixture for direct database operations

#### **Enforcement**

- **Code Review**: All new tests must follow isolation pattern
- **No Main Database**: Tests using `get_db()` directly are forbidden
- **Fixture Usage**: All database tests must use fixtures from `conftest.py`
- **Documentation**: This standard must be followed without exception

## Documentation Files

For deeper dives, refer to these files. They are the project's memory.

### Task and Session Management

- **Timestamp Format**: "YYYY-MM-DD HH:MM:SS (timezone)" for all tasks and session recaps
- **Completion Tracking**: Include start/completion timestamps and duration calculations
- **Session Continuity**: Timestamps enable seamless session resumption and progress measurement
- **Documentation**: Maintain task progression history in CLAUDETasks.md for planning and retrospectives

#### Session Recap Management

- **Archive Workflow**: When adding new session recaps to CLAUDE.md, automatically move previous session recaps to CLAUDETaskArchive.md
- **Compaction Pattern**: Convert detailed session recaps to compact ✅ completed format following established archive structure
- **Retention Policy**: Keep only current session recap in CLAUDE.md, archive all previous sessions
- **Format Consistency**: Use "✅ **Session Name** (Date) - Brief achievement summary" pattern for archived sessions

## Current Session Recap

### **Documentation Architecture & Quality Excellence Session** (2025-01-11 12:00:00 PST - Completed 2025-01-11 13:00:00 PST)

- ✅ **Complete Documentation Audit** - Systematically audited all 13 README files across the project ensuring proper information placement and cross-reference tracing
- ✅ **Information Architecture Cleanup** - Fixed feature-specific details scattered across implementation guides, centralized OAuth configuration details in TestCoverage.md master registry, established clear separation between "how to test" vs "what to test"
- ✅ **Cross-Reference Standardization** - Enhanced all README files with consistent Related Documentation sections organized into logical categories (Development vs Testing & Quality), added descriptive link text explaining document coverage
- ✅ **Testing Reference Integration** - Updated all documentation to reflect three-layer testing strategy with strategic references to unit/integration/E2E testing guides and coverage matrix
- ✅ **Quality Pipeline Resolution** - Fixed vitest coverage configuration to exclude E2E test files and configuration files, achieved 92.65% frontend coverage and 91.77% backend coverage (both above 80% threshold)
- ✅ **Session Management** - Properly archived previous session recap to SessionArchive.md following established compaction patterns with timestamp retention

### **Technical Implementation**

- **Documentation Structure**: Established proper information hierarchy with implementation guides staying feature-agnostic and TestCoverage.md serving as the central feature registry
- **Cross-Reference System**: Created consistent navigation patterns with organized sections and descriptive linking between related documentation
- **Quality Configuration**: Updated vitest.config.ts to exclude tests-e2e/**, scripts/**, and configuration files from coverage calculations
- **Archive Management**: Moved completed E2E Testing Infrastructure session to archive following established compaction format

### **Documentation Flow Validation**

- **Entry Points**: README.md and CLAUDE.md provide organized testing sections with clear navigation paths
- **Core Guides**: Enhanced tests/README.md and tests-e2e/README.md with strategic cross-references avoiding duplication
- **Feature Registry**: TestCoverage.md serves as central mapping hub with OAuth configuration requirements and comprehensive status tracking
- **Supporting Documentation**: All module READMEs now have consistent Related Documentation sections with logical categorization

### **System State**: ✅ **DOCUMENTATION ARCHITECTURE COMPLETE** - Clean, navigable documentation system with proper information placement, consistent cross-references, and scalable architecture for new features

### **Quality Metrics**
- **Test Coverage**: 91.77% backend, 92.65% frontend (both above 80% threshold)
- **Test Results**: All quality pipeline checks pass (571 backend + 932 frontend tests)
- **Documentation Coverage**: 13 README files audited and enhanced with proper cross-references
- **Information Architecture**: Clean separation between implementation guides and feature registries

### **Available Next Steps**
- 🔲 **OAuth Configuration** - Set up Google OAuth test credentials to enable OAuth test scenarios (Tests 1.2, 1.4, 2.2)
- 🔲 **Additional Test Scenarios** - Implement remaining Login System Test Plan scenarios (Tests 3.1-5.2)
- 🔲 **CI/CD Integration** - Configure GitHub Actions workflow to include E2E testing in automated pipeline

---

_Previous session recaps have been moved to [docs/archive/SessionArchive.md](docs/archive/SessionArchive.md) for historical reference._
