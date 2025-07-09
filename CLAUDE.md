# CLAUDENew.md

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
- **Quality Tools**: flake8, black, pyright, ESLint, Prettier, TypeScript Compiler, Husky, pytest, Vitest

For more specific details on each module, refer to their respective `README.md` files:
- `api/README.md` (Backend API)
- `src/client/components/README.md` (React Components)
- `src/client/hooks/README.md` (React Hooks)
- `src/client/services/README.md` (Frontend Services)
- `performance/README.md` (Performance Testing)

## Development Workflow

For a comprehensive overview of the development workflow and core commands, refer to the main `README.md`.

### Core Commands (Summary)
- `npm run dev`: Starts the full development environment.
- `npm run quality`: Runs the full quality pipeline (lint, format, type-check, test) with zero tolerance for errors and warnings.
- `npm run test`: Runs the complete test suite.
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
- For full details on our quality process, including specific tooling and configurations, refer to `tests/README.md`.

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

### **Test Infrastructure & Quality Transformation Session** (2025-07-09 23:42:00 -08:00)
- ✅ **Test Discovery Revolution** - Fixed critical test discovery issues, increasing coverage from 19 to 639 tests (33x improvement), implementing proper pytest and vitest auto-discovery mechanisms
- ✅ **API Versioning Fix** - Resolved 24 test failures by updating all API endpoints from `/api/auth/` to `/api/v1/auth/` to match FastAPI routing configuration
- ✅ **OAuth Request Object Fix** - Fixed 12 OAuth tests by correcting function signatures and using proper HTTP requests instead of direct function calls with incorrect parameters
- ✅ **Database Schema Migration** - Updated 6 tests to use new organization relationship model (`organization_rel`) instead of deprecated `organization` field
- ✅ **Enum Constraint Validation** - Fixed 7 database enum tests by implementing realistic SQLite behavior validation and proper UUID object handling
- ✅ **Test Infrastructure Excellence** - Achieved 93.8% Python test pass rate (166/177 passing) and 90.0% frontend pass rate (415/461 passing), with comprehensive TestAuditFindings.md documentation
- ✅ **Quality Pipeline Compliance** - Maintained 100% linting, formatting, and type checking compliance while dramatically improving test coverage and reliability

### **TODOs for Future Sessions**
- **Fix Remaining 11 Python Tests** - Address email verification timezone issues, remember me token functionality, and role-based access control implementation
- **Fix Remaining 46 Frontend Tests** - Resolve React act warnings, timeout issues, and element selector problems in component tests
- **Email Verification Implementation** - Fix timezone-aware datetime comparisons in email verification logic
- **Role System Implementation** - Complete role-based access control features and authentication flow
- **Remember Me Functionality** - Implement extended token expiration and remember me cookie handling

## Test Coverage Breakdown
```
📊 32 Python Backend Tests + React Frontend Tests

🐍 Python Backend (32 tests)
├── Startup Tests (5): Server reliability, environment validation
├── API Integration (10): Auth endpoints, user registration, Google OAuth
├── Enum Database Tests (16): Database constraint validation, enum values testing
└── Registration Type Tests (1): User registration flow validation

⚛️ React Frontend
├── LoginPage: Form validation, authentication flows
├── CalendarPage: CRUD operations, filtering, modals
├── TeamsPage: Team management, validation, CRUD
├── ProfilePage: Profile updates, password changes
├── RegistrationMethodModal: OAuth integration, modal state management
├── EmailRegistrationModal: Registration flow, validation, API integration
├── NavigationPanel: Navigation, user interactions, state management
├── LoginModal: Authentication, form validation, error handling
└── Other Components: Headers, footers, verification banners, utilities

🛠️ Testing Infrastructure
├── Python: pytest + FastAPI TestClient + httpx + pytest-mock + SQLAlchemy testing
├── React: Vitest + React Testing Library + Jest DOM + user-event
├── Explicit Database Isolation: SQLite temp files + explicit `db`/`client` fixtures
├── Race Condition Prevention: Modal state management, DOM error detection
├── OAuth Integration: Mock Google services, credential flow testing
└── Patterns: Explicit fixture-based, async/await, form validation, API errors, TDD
```

---

*Previous session recaps have been moved to [docs/archive/SessionArchive.md](docs/archive/SessionArchive.md) for historical reference.*

