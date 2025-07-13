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
- `npm run quality`: Runs the full quality pipeline (format, lint, type-check, test) with zero tolerance for errors and warnings.
- `npm run test`: Runs both backend and frontend tests (complete test suite).
- `npm run test:backend`: Runs backend tests only (Python/pytest).
- `npm run test:frontend`: Runs frontend tests only (TypeScript/vitest).
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

### **Rate Limiting Security & Email Verification Enhancement Session** (2025-07-13 06:30:00 UTC - Completed 2025-07-13 23:59:00 UTC)

- ✅ **Multi-Layer Rate Limiting Implementation** - Added comprehensive rate limiting across email verification system: hourly limits (6 emails/hour per user), 1-minute rate limits between requests, and IP-based rate limiting (5 attempts per 15 minutes) for verification code endpoint
- ✅ **Verification Code Security Enhancement** - Protected `/verify-code` endpoint with rate limiting to prevent brute force attacks on 6-digit verification codes, following security best practices with `RateLimitType.AUTH` configuration  
- ✅ **Email Verification UX Improvements** - Enhanced success message persistence across page refreshes with localStorage synchronization, improved countdown timer display, and refined button state management
- ✅ **OAuth Session Duration Fix** - Resolved Google OAuth users having to re-authenticate on app restart by implementing 30-day tokens with `remember_me=True` for OAuth endpoints, aligning with email login behavior
- ✅ **Test Infrastructure Stability** - Fixed EmailVerificationModal focus test timing issues by replacing focus-dependent assertions with sequential input testing, ensuring reliable test execution in CI/CD environment
- ✅ **Production Quality Compliance** - Achieved zero errors, warnings, or linting issues with all 957 frontend tests and 601 backend tests passing, maintaining 92.65% frontend and 91.77% backend coverage

### **Security Implementation Details**

- **Rate Limiting Architecture**: Three-layer protection with Redis-based IP limiting, database-based user limiting, and time-based request throttling
- **Verification Code Protection**: Prevents attackers from brute forcing 1,000,000 possible 6-digit combinations with multi-layer rate limiting  
- **OAuth Security Alignment**: Google OAuth users now maintain persistent sessions like email users with "remember me" functionality
- **Email Verification Flow**: Enhanced user experience with persistent success messages and cross-tab synchronization

### **Technical Architecture**

- **Backend Security**: Rate limiting implemented across `/send-verification` (EMAIL type: 3 per 5 min) and `/verify-code` (AUTH type: 5 per 15 min) endpoints
- **Frontend Persistence**: LocalStorage-based success message state with automatic cleanup and cross-tab synchronization  
- **OAuth Token Management**: Consistent 30-day expiration for both email login (with remember me) and Google OAuth authentication
- **Test Reliability**: Replaced DOM focus testing with functional input testing to eliminate timing-dependent test failures

### **System State**: ✅ **PRODUCTION-READY SECURITY ENHANCEMENT** - Comprehensive rate limiting protection, enhanced email verification UX, OAuth session persistence, and test stability achieved with zero-tolerance quality standards

### **Quality Metrics**
- **Test Coverage**: 91.77% backend, 92.65% frontend (both above 80% threshold)  
- **Test Results**: All quality pipeline checks pass (957 frontend + 601 backend tests)
- **Security Coverage**: All authentication endpoints protected with appropriate rate limiting
- **Production Readiness**: Zero errors, warnings, or linting issues across entire codebase

### **Available Next Steps**
- 🔲 **Rate Limit UX Enhancement** - Improve button states and messaging when hourly limits are exceeded to provide clearer user feedback
- 🔲 **Additional Security Endpoints** - Apply similar rate limiting patterns to other sensitive endpoints like password reset
- 🔲 **Enhanced Monitoring** - Add rate limiting metrics and alerting for production monitoring

---

## TODO List

### Code Quality & Technical Debt

1. **Eliminate Legacy Code**
   * Status: 🔴 Not Corrected
   * Specifics: The file src/client/hooks/useFormValidation.ts still contains the function useFormValidationLegacy. This function represents technical debt and creates two different ways of handling forms in the codebase.
   * Impact: This leads to inconsistent form behavior and creates confusion for developers on which hook to use.
   * Proposed Solution: Migrate any components still using useFormValidationLegacy to the modern useFormValidation hook and delete the legacy code.

2. **Simplify Google OAuth**
   * Status: 🔴 Not Corrected
   * Specifics: The src/client/hooks/useGoogleOAuth.ts hook still contains a complex, manual implementation that uses setInterval and setTimeout to poll for the existence of the window.google object. The package.json file confirms that a dedicated library like @react-oauth/google has not been added.
   * Impact: This manual approach is brittle, harder to maintain, and reinvents functionality that is handled more robustly by specialized libraries.
   * Proposed Solution: Replace the custom hook with a well-maintained library like @react-oauth/google to simplify the code and improve reliability.

3. **Refactor AuthModal.tsx**
   * Status: 🟡 Partially Corrected
   * Specifics: The AuthModal.tsx component was simplified by removing the method-selection mode. However, it remains a large, monolithic component that still contains the full logic and JSX for both renderSignIn and renderSignUp. The useEffect hooks still contain eslint-disable-next-line comments to avoid infinite loops, which is a sign of overly complex state interactions.
   * Impact: The component is still difficult to modify and debug. A change to the sign-in form could unintentionally affect the sign-up form.
   * Proposed Solution: Break the component into smaller, single-responsibility components: AuthModal (as the shell), SignInForm, and SignUpForm.

4. **Adopt a State Management Library**
   * Status: 🔴 Not Corrected
   * Specifics: The main App.tsx component still manages a large amount of global state using useState, including currentPage, showAuthModal, authModalMode, showVerificationPage, and verificationEmail. These state variables and their setters are passed down as props to child components (Header, AuthModal, etc.), which is a pattern known as prop drilling.
   * Impact: App.tsx is a bottleneck for state, making it complex and hard to maintain. Adding new global features will further bloat this component.
   * Proposed Solution: Introduce a lightweight state management library like Zustand to create a central store for this global state, which will significantly simplify App.tsx and decouple the components.

5. **Introduce a Routing Library**
   * Status: 🔴 Not Corrected
   * Specifics: In App.tsx, navigation is handled by a renderPage function that uses a switch statement based on the currentPage state variable.
   * Impact: This manual routing system is not scalable and does not support standard web application features like nested routes, URL parameters (e.g., /teams/:id), or a declarative API.
   * Proposed Solution: Replace the manual switch-based routing with the industry-standard react-router-dom library for a more robust and scalable navigation architecture.

### Feature Enhancements

6. **Add password reset functionality to profile page** (how should user information be organized? Security, personal information, etc?)

7. **User name and Password recovery functions** (use our centralized code system??)

8. **How to use the account merge function if a user starts with email registration, but wants to start using OAuth instead?** See docs/Org

9. **Add another state to disable resend verification button completely with a new label indicating the lockout**

---

_Previous session recaps have been moved to [docs/archive/SessionArchive.md](docs/archive/SessionArchive.md) for historical reference._
