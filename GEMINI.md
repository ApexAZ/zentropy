# Gemini Onboarding Guide: Zentropy Project

This document provides the essential context for working on the Zentropy codebase. Adhere strictly to these guidelines, patterns, and architectural decisions.

## 1. Project Overview

Zentropy is a comprehensive Product Management platform built with a Python/FastAPI backend and a React/TypeScript frontend. The project prioritizes code excellence, a robust testing culture, and a seamless developer experience.

**Core Goal**: A high-quality, maintainable, and scalable application.
**Primary Reference**: `CLAUDE.md` is the main source of truth for architecture and development workflow.

## 2. Technology Stack & Architecture
@README.md

For a high-level overview of the project's architecture and tech stack, refer to the main `README.md`. The architecture is a decoupled frontend/backend system.

### Backend (Python)
- **Framework**: FastAPI with Uvicorn.
- **ORM**: SQLAlchemy for PostgreSQL.
- **Database**: PostgreSQL, managed via Docker.
- **Authentication**: JWT tokens (`python-jose`) with bcrypt password hashing (`passlib`).
- **Key Directories**: `api/` (source), `tests/` (tests).
- **Reference**: See `api/README.md` for backend patterns.

### Frontend (TypeScript/React)
- **Framework**: React with TypeScript.
- **Build Tool**: Vite (root is `src/client/`).
- **Styling**: TailwindCSS with a **semantic color system**. Do not use literal color classes (e.g., `bg-blue-500`); use semantic classes like `bg-interactive`. The color definitions are in `tailwind.config.js` as the single source of truth.
- **Component Architecture**: Atomic Design (`atoms`, `molecules`, `organisms`). Reusable components are a priority. See `src/client/components/README.md`.
- **State Management**: Custom hooks (`useAuth`, `useTeams`). See `src/client/hooks/README.md`.
- **API Interaction**: Centralized in service classes (`AuthService`, `TeamService`). See `src/client/services/README.md`.

## 3. Development Workflow

### Core Commands
- `npm run dev`: Starts the full development environment (API + React + DB). **Note**: This may not work in all remote execution environments; manual startup might be needed.
- `npm run quality`: **RUN THIS BEFORE COMMITTING.** It runs the full quality pipeline (lint, format, type-check, test). This command enforces a **zero-tolerance policy for errors and warnings**, ensuring code quality and consistency.
- `npm run test`: Runs the complete test suite (Python + React).
- `npm run fix`: Auto-fixes formatting and linting issues.

### Environment Variables
- **Backend**: `.env` in the project root.
- **Frontend**: `src/client/.env.local`. This is critical due to Vite's root configuration.
- **Reference**: `MULTIDEV.md` for multi-machine setup.

### SECRET_KEY Configuration

The `SECRET_KEY` environment variable is crucial for JWT token security.

- **Production Requirement**: `SECRET_KEY` MUST be explicitly set in production environments. If not set, the application will raise a `ValueError` and refuse to start. **Without an explicitly set `SECRET_KEY` in production, the application generates a random key on each restart, invalidating all existing JWT tokens and posing a significant security risk.**
- **Development Behavior**: In development, a random `SECRET_KEY` will be generated if not set, but a warning will be issued. This is acceptable for local development but **not** for production.
- **Generating a Secure Key**:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
  Add the output to your `.env` file (or production environment configuration).

## 4. Testing: The Cornerstone of Quality

This project has a **mandatory TDD culture** and a robust testing infrastructure. For comprehensive details on our testing philosophy, backend test isolation, and frontend hybrid testing strategy, refer to:

- **`tests/README.md`**: Details the auto-isolation testing system for the backend and our overall testing workflow.
- **`CLAUDE.md`**: Provides the primary guide for development workflow, including mandatory TDD practices.
- **`CLAUDEQuality.md`**: Explains the hybrid testing strategy for the frontend in detail.

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

## 5. Code Excellence Principles

The project is undergoing a "Code Excellence" transformation. Follow these principles from `CodeCleanup.md`:
- **Simplicity First**: Write clear, purposeful code.
- **Consolidate**: Prefer single, unified components and services over multiple, scattered ones (e.g., `AuthModal` replaced three separate modals).
- **RESTful & Intuitive APIs**: Follow the established versioned (`/api/v1/`) and RESTful patterns.
- **Atomic Design**: Build and use reusable components.

### Task and Session Management

To ensure seamless collaboration and accurate progress tracking, adhere to the following task and session management standards:

- **Timestamp Format**: "YYYY-MM-DD HH:MM:SS (timezone)" for all tasks and session recaps.
- **Completion Tracking**: Include start/completion timestamps and duration calculations.
- **Session Continuity**: Timestamps enable seamless session resumption and progress measurement.
- **Documentation**: Maintain task progression history in `CLAUDETasks.md` for planning and retrospectives.

#### Session Recap Management

- **Archive Workflow**: When adding new session recaps to `CLAUDE.md`, automatically move previous session recaps to `CLAUDETaskArchive.md`.
- **Compaction Pattern**: Convert detailed session recaps to compact ✅ completed format following established archive structure.
- **Retention Policy**: Keep only current session recap in `CLAUDE.md`, archive all previous sessions.
- **Format Consistency**: Use "✅ **Session Name** (Date) - Brief achievement summary" pattern for archived sessions.

### Pyright Configuration & VS Code Integration

**Perfect VS Code/CLI consistency achieved through pyright migration from mypy.**

- **File**: `pyrightconfig.json` - FastAPI-optimized type checking configuration.
- **Mode**: `"basic"` - Balanced strictness for production code quality.
- **Integration**: Uses same engine as VS Code Pylance extension.
- **Performance**: 3-5x faster than mypy, with incremental analysis.

**Key Benefits:**
- ✅ **Perfect VS Code Consistency**: Identical errors between IDE and CLI.
- ✅ **Superior Performance**: Fast type checking with minimal overhead.
- ✅ **FastAPI Compatibility**: Optimized for dependency injection patterns.
- ✅ **SQLAlchemy Support**: Better handling of ORM type patterns.
- ✅ **Zero Bypasses**: No type checking shortcuts in production code.

## 6. Key Documentation Files

For deeper dives, refer to these files. They are the project's memory.

- **`CLAUDE.md`**: The **primary guide**. Covers architecture, development workflow, testing, and project status in great detail.
- **`README.md`**: High-level project overview.
- **`CodeCleanup.md`**: The vision and roadmap for making the codebase best-in-class. Outlines the 10 pillars of code excellence.
- **`CLAUDEQuality.md`**: Explains the hybrid testing strategy for the frontend.
- **`tests/README.md`**: Details the auto-isolation testing system for the backend.
- **`zentropy_prd.md`**: The product requirements document.
- **`docs/architecture/README.md`**: A detailed analysis of the system architecture.
- **`examples/`**: Contains end-to-end guides for adding new features and components.
- **Module READMEs**:
    - `api/README.md`
    - `api/routers/README.md`
    - `src/client/components/README.md`
    - `src/client/hooks/README.md`
    - `src/client/services/README.md`