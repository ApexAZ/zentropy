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

### **Header UI Optimization & Semantic Design Session** (2025-01-12 23:00:00 PST - Completed 2025-01-12 23:15:00 PST)

- ✅ **Email Verification Button Optimization** - Reduced button height by 20% (`!py-1.5` → `!py-1`) while maintaining width, creating more compact resend button for better visual proportion in header
- ✅ **Warning Text Enhancement** - Increased "Email verification required" text size by 50% (`text-sm` → `text-lg`) for improved visibility and prominence in header messaging
- ✅ **User Icon Button Expansion** - Increased user profile icon button by 25% (`h-10 w-10` → `h-12 w-12`, `24px` → `30px` SVG) for better visual balance and interaction target size
- ✅ **Flyout Navigation Sizing** - Matched flyout navigation button dimensions to user icon (`h-12 w-12`, `28px` SVG) for consistent header button sizing across left and right sides
- ✅ **Semantic Color Implementation** - Applied proper semantic color scheme to flyout navigation (`!text-interactive hover:!text-interactive-hover`) maintaining steel blue consistency throughout header
- ✅ **Visual Spacing Optimization** - Trimmed unnecessary spacing from user icon button (`mr-3` → `mr-1`, `p-2` → `p-1`) for tighter, cleaner header layout
- ✅ **Tailwind CSS Linting Investigation** - Researched and tested Tailwind v4 linting options, discovered `eslint-plugin-tailwindcss` incompatibility, properly reverted all configuration changes while maintaining existing quality standards

### **Technical Implementation**

- **Button Sizing Strategy**: Used `!important` modifiers to override variant defaults while preserving component architecture and accessibility
- **Semantic Color Consistency**: Applied steel blue (#6A8BA7) interactive color across all header navigation elements for unified visual language
- **Proportional Design**: Achieved consistent button sizing (12x12) across header while maintaining individual component functionality
- **Quality Compliance**: All changes pass comprehensive quality pipeline (943 frontend + 571 backend tests, 92.65% frontend coverage, 91.77% backend coverage)

### **Visual Design Improvements**

- **Header Balance**: Created consistent visual weight between left (flyout navigation) and right (user profile) header sections
- **Text Hierarchy**: Enhanced warning message prominence while reducing button visual weight for proper information priority
- **Interactive Elements**: Improved touch targets and hover states while maintaining accessibility standards
- **Spacing Optimization**: Reduced visual clutter through strategic margin and padding adjustments

### **System State**: ✅ **HEADER UI OPTIMIZATION COMPLETE** - Balanced, accessible header design with consistent semantic colors, proportional button sizing, and optimized visual hierarchy for enhanced user experience

### **Quality Metrics**
- **Test Coverage**: 91.77% backend, 92.65% frontend (both above 80% threshold)
- **Test Results**: All quality pipeline checks pass (943 frontend + 571 backend tests)
- **UI Components**: 4 components updated with full test coverage maintained
- **Design System**: Semantic color compliance achieved across all header elements

### **Available Next Steps**
- 🔲 **Custom Tailwind Linting** - Implement custom ESLint rules and extended SemanticColors.test.tsx for comprehensive Tailwind v4 validation
- 🔲 **Responsive Header Design** - Optimize header layout for mobile and tablet viewports
- 🔲 **Additional UI Components** - Apply similar visual optimization principles to other interface sections

---

_Previous session recaps have been moved to [docs/archive/SessionArchive.md](docs/archive/SessionArchive.md) for historical reference._
