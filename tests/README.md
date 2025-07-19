# Zentropy Testing & Quality Handbook

**Purpose**: This is the **comprehensive guide** for unit and integration testing in the Zentropy project, covering backend (pytest) and frontend (vitest) testing strategies.

## 1. Quality Philosophy: Test What Can Break

Our testing strategy is built on a simple, powerful idea: **write meaningful tests that prevent real bugs.** We favor clarity and effectiveness over dogma.

- **TDD is Mandatory**: Write tests, then write the code, run the test, then refactor the code for robustness
- **Focus on Behavior**: Test what the user experiences and what the code _does_, not its internal implementation details.
- **Zero-Tolerance for Lint**: All code must pass static analysis checks (`npm run quality`) before it is considered complete.

## 2. The Core Testing Workflow

This is the practical, step-by-step guide for adding new, tested features.

### Step 1: What Are You Building?

- **A new API endpoint?** -> Write a **Backend Integration Test**.
- **A new UI component or page?** -> Write a **Frontend Workflow Test**.

### Step 2: Writing a Backend Test (API Endpoints)

1.  **Create the Test File**: Place your test file in a subdirectory that mirrors the `api/` structure. For example, a test for an endpoint in `api/routers/your_feature.py` should be placed in `tests/routers/test_your_feature.py`.
2.  **Write the Test Function**:
    - Use a descriptive name: `test_create_widget_as_authorized_user()`.
    - **Crucially, add the `client` and `db` fixtures to the function signature.** This automatically enables the isolated test database.
3.  **Follow the Arrange-Act-Assert Pattern**:

    ```python
    # The `client` and `db` fixtures are requested, so auto-isolation is activated.
    def test_create_widget_as_authorized_user(client, db):
        # 1. Arrange: Set up the test data and state.
        test_user = create_test_user(db)
        auth_headers = get_auth_headers(test_user)
        widget_data = {"name": "My New Widget", "value": 100}

        # 2. Act: Perform the single action being tested.
        response = client.post("/api/v1/widgets", json=widget_data, headers=auth_headers)

        # 3. Assert: Verify the outcome.
        assert response.status_code == 201
        assert response.json()["name"] == "My New Widget"
        assert db.query(Widget).count() == 1 # Verify database state
    ```

### Step 3: Writing a Frontend Test (UI Components & Pages)

Our frontend testing uses a **High-Performance Approach**: we test user behavior with optimized patterns that achieve 99%+ speed improvements.

1.  **Extract Logic**: First, pull any complex validation, data formatting, or state management out of your component and into a pure utility function (`src/client/utils/`) or a custom hook (`src/client/hooks/`). Write fast, simple unit tests for that extracted logic.
2.  **Create the Component Test File**: e.g., `src/client/components/__tests__/YourComponent.test.tsx`.
3.  **Test the User's Goal**: The component test should verify the user's workflow using our optimized patterns.

    ```typescript
    it('allows a user to create a new widget and see it in the list', async () => {
      // 1. Arrange: Mock API calls with 3-mock pattern
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockWidget) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockWidgets) });
      
      render(<WidgetPage />);
      
      await act(async () => {
        await Promise.resolve(); // Let React finish initialization
      });

      // 2. Act: Use fireEvent for fast user interactions
      fireEvent.change(screen.getByLabelText(/widget name/i), { target: { value: 'My Test Widget' } });
      fireEvent.click(screen.getByRole('button', { name: /save widget/i }));

      await act(async () => {
        await Promise.resolve(); // Let React process updates
      });

      // 3. Assert: Check for the expected outcome
      expect(screen.getByText(/widget created successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/my test widget/i)).toBeInTheDocument();
    });
    ```

### Step 4: Frontend Performance Optimization Patterns

Our frontend tests use **performance-optimized patterns** that achieve 99%+ speed improvements while maintaining full user behavior validation.

#### **🚀 High-Performance Test Patterns**

**1. Environment-Aware OAuth Hooks (Primary Pattern)**
```typescript
// ✅ AUTOMATIC: OAuth hooks auto-detect test environment and return fast mocks
// ✅ No manual mocking needed - useGoogleOAuth automatically handles environment detection
// ✅ 99%+ performance improvement: eliminates 30-second timer polling in tests
it('renders component with OAuth functionality', async () => {
  // useGoogleOAuth automatically detects test environment via:
  // 1. VITE_OAUTH_MOCK_MODE environment variable
  // 2. Mocked fetch detection (component test context)
  // Returns immediate deterministic mocks, preserving full production functionality
  
  render(<ComponentWithOAuth />);
  
  await act(async () => {
    await Promise.resolve();
  });
  
  expect(screen.getByText("OAuth Provider")).toBeInTheDocument();
});
```

**2. Upfront API Mocking for Component Initialization**
```typescript
// ✅ FAST: Mock all component initialization API calls upfront
it('loads component data successfully', async () => {
  // Mock whatever API calls your component makes on mount
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData1) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData2) });
    // Add more .mockResolvedValueOnce() calls as needed
  
  render(<YourComponent />);
  
  await act(async () => {
    await Promise.resolve(); // Let React finish updates
  });
  
  expect(screen.getByDisplayValue("Expected Content")).toBeInTheDocument();
});
```

**3. fireEvent for User Interactions**
```typescript
// ✅ FAST: Direct DOM events (19ms vs 2000ms+ timeouts)
fireEvent.click(button);
fireEvent.change(input, { target: { value: "test" } });

// ❌ SLOW: Simulated human timing (causes timeouts with fake timers)
await user.click(button);
```

**4. Synchronous Helper Functions**
```typescript
// ✅ FAST: No async complexity
const fillForm = (data) => {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: data.name } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: data.email } });
};

// ❌ SLOW: Async helpers with userEvent
const fillForm = async (data) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/name/i), data.name);
};
```

**5. Simple act() Pattern**
```typescript
// ✅ FAST: Let React finish updates
await act(async () => {
  await Promise.resolve();
});
expect(screen.getByText("Result")).toBeInTheDocument();

// ❌ COMPLEX: Polling with waitFor
await waitFor(() => {
  expect(screen.getByText("Result")).toBeInTheDocument();
});
```

#### **When to Use Different Patterns**

**Environment-Aware OAuth Hooks (Primary Pattern):**
- Components using OAuth functionality (useGoogleOAuth - fully implemented)
- Automatically detects test environment and provides immediate deterministic mocks
- Eliminates timer polling delays (30-second timeouts → immediate responses)
- Zero manual mocking required for component tests
- Preserves full OAuth functionality in development/production
- Pattern ready for extension to useMicrosoftOAuth, useGitHubOAuth

**Fast Patterns (Upfront Mocking + fireEvent):**
- Component initialization tests
- User interaction workflows  
- Form submission tests
- Modal and dialog tests
- 99% of frontend unit/integration tests

**Robust Patterns (mockImplementation):**
- Complex components with unpredictable API call patterns
- Tests that need to handle React StrictMode double renders
- Integration tests spanning multiple components

```typescript
// ✅ ROBUST: For complex/unpredictable scenarios
mockFetch.mockImplementation((url) => {
  if (url.includes('/api/v1/teams')) {
    return Promise.resolve({ ok: true, json: async () => mockTeams });
  }
  return Promise.reject(new Error(`Unhandled: ${url}`));
});
```

#### **Performance Results**
- **ProfilePage Security Tab**: 447ms for 33 tests (vs 16+ seconds with timer polling)
- **OAuth Hook Performance**: Immediate mock responses (vs 30-second timer delays)
- **Overall Improvement**: 99%+ faster execution with zero test regressions
- **Maintains**: Full user behavior validation and production OAuth functionality

**Mock Consolidation**

For complex test files like `App.test.tsx`, mocks are consolidated at the top of the file for better organization and reusability. This includes creating helper functions to manage mock state. While Vitest's hoisting behavior prevents the use of a central `__mocks__` directory, this in-file consolidation provides similar benefits.

### Step 5: Backend Test Directory Structure

To improve organization and maintainability, the `tests/` directory mirrors the structure of the `api/` directory. This makes it easy to locate tests related to specific parts of the application.

-   `tests/routers/`: Tests for API endpoints in `api/routers/`.
-   `tests/services/`: Tests for service-layer logic (e.g., `google_oauth.py`).
-   `tests/models/`: Tests for SQLAlchemy models and database logic.
-   `tests/auth/`: Tests related to authentication, roles, and permissions.
-   `tests/oauth/`: Tests related to OAuth integrations.
-   `tests/core/`: Core application tests, such as startup and integration checks.
-   `tests/functional/`: Functional tests that cover user workflows.

When adding new tests, place them in the corresponding subdirectory.

## 3. The Backend Test Isolation System

To ensure a clean, isolated database for your Python tests, explicitly request the `client` and `db` fixtures in your test functions.

- **What it is**: A high-performance system in `tests/conftest.py` that provides an isolated database using transaction rollback for each test function.
- **How it works**: When a test function requests the `client` or `db` fixture, `pytest` provides a database session within a transaction that gets rolled back after the test completes.
- **Performance**: This system achieves **8x faster test execution** (18.8ms vs 156ms per test) compared to database recreation approaches.
- **Benefit**: This completely prevents test contamination and pollution of the main development database, making tests 100% reliable and fast.

### Available Test Fixtures

The following fixtures are available in `tests/conftest.py` for use in your tests:

#### Database and Client Fixtures (High-Performance)
- **`test_db_engine`** - Creates a shared SQLite database engine for the entire test session (session-scoped)
- **`db`** - Provides a clean database session using transaction rollback for fast isolation (function-scoped)
- **`client`** - Provides a FastAPI TestClient with isolated database using transaction rollback (function-scoped)

#### Authentication and User Fixtures
- **`current_user`** - Creates a verified test user (`current@user.com`) for standard authentication testing
- **`auth_headers`** - Creates JWT authentication headers for the current user
- **`admin_user`** - Creates an admin user with `UserRole.ADMIN` privileges
- **`admin_auth_headers`** - Creates JWT authentication headers for the admin user
- **`user_with_known_password`** - Creates a user with known password (`OldPassword123!`) for password management tests

#### Email and Rate Limiting Fixtures (Opt-in for Performance)
- **`clean_mailpit`** - Ensures Mailpit is clean before and after each test (use only when you need pre-test cleanup)
- **`auto_clean_mailpit`** - Cleans Mailpit after test completion (opt-in, use only for email tests)
- **`mailpit_disabled`** - Disables email sending for tests that don't need it
- **`test_rate_limits`** - Configures generous but realistic rate limits for testing (opt-in, use only for rate-limited tests)

#### Helper Functions
- **`create_test_user(db, **kwargs)`** - Creates a test user with customizable attributes
- **`create_test_team(db, **kwargs)`** - Creates a test team with customizable attributes
- **`manually_verify_user_email(db, email)`** - Manually verifies a user's email for testing purposes

#### Usage Examples

```python
# Basic API endpoint test
def test_create_widget(client, db, auth_headers):
    widget_data = {"name": "Test Widget"}
    response = client.post("/api/v1/widgets", json=widget_data, headers=auth_headers)
    assert response.status_code == 201

# Admin-only endpoint test
def test_admin_operation(client, db, admin_auth_headers):
    response = client.get("/api/v1/admin/users", headers=admin_auth_headers)
    assert response.status_code == 200

# Password management test
def test_change_password(client, db, user_with_known_password):
    # user_with_known_password.known_password contains the raw password
    password_data = {
        "current_password": user_with_known_password.known_password,
        "new_password": "NewPassword123!"
    }
    response = client.post("/api/v1/users/change-password", json=password_data)
    assert response.status_code == 200

# Email-sending test with rate limiting
def test_send_email(client, db, test_rate_limits):
    # test_rate_limits prevents 429 Too Many Requests errors
    response = client.post("/api/v1/auth/send-verification", json={"email": "test@example.com"})
    assert response.status_code == 200
    # auto_clean_mailpit fixture automatically cleans up test emails

# Custom user creation
def test_custom_user_scenario(client, db):
    user = create_test_user(db, email="custom@example.com", role=UserRole.ADMIN)
    assert user.role == UserRole.ADMIN
```

#### Important Notes

- **Rate Limiting**: Use the `test_rate_limits` fixture only for tests that make multiple API calls or could trigger rate limiting
- **Email Testing**: Use the `auto_clean_mailpit` fixture only for tests that send emails (opt-in for performance)
- **Authentication**: Use `auth_headers` for standard user tests and `admin_auth_headers` for admin-only operations
- **Database Isolation**: All fixtures ensure complete test isolation - no test data will leak between tests or pollute the main database

## 4. Test Performance Optimization

### High-Performance Test Architecture

Our test suite achieves **dramatic performance improvements** across both backend and frontend:

#### **Backend Performance (8x Improvement)**
```python
# High-performance fixture pattern in conftest.py
@pytest.fixture(scope="session")
def test_db_engine():
    """Shared database engine for entire test session"""
    engine = create_engine(DATABASE_URL, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function") 
def db(test_db_engine):
    """Transaction rollback for fast test isolation"""
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:
            transaction.rollback()
        connection.close()
```

#### **Frontend Performance (99%+ Improvement)**
```typescript
// ✅ FAST: 3-Mock Pattern + fireEvent + act()
it('should complete user workflow', async () => {
  // 1. Mock all component API calls upfront
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData1) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData2) });
  
  render(<Component />);
  
  // 2. Let React finish initialization
  await act(async () => {
    await Promise.resolve();
  });
  
  // 3. Use fireEvent for immediate interactions
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  // 4. Let React process updates
  await act(async () => {
    await Promise.resolve();
  });
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### Performance Metrics

#### **Backend Performance**
- **Test Speed**: 18.8ms per test (vs 156ms baseline)
- **Total Time**: 11.4s for 606 tests (vs 94.8s baseline) 
- **Improvement**: 8x faster execution
- **Parallel Execution**: 8 workers by default

#### **Frontend Performance**  
- **Test Speed**: 534ms for 23 tests (vs 32+ seconds with timeouts)
- **Individual Tests**: 19ms average (vs 2000ms+ timeouts)
- **Improvement**: 99%+ faster execution
- **Zero Regressions**: All tests maintain full user behavior validation

### Universal Optimization Principles

1. **Session-scoped Resources**: Share expensive setup (database engine, mock configuration)
2. **Function-scoped Isolation**: Clean state per test (transaction rollback, mock clearing)
3. **Eliminate Async Complexity**: Use direct patterns (fireEvent vs userEvent)
4. **Batch Operations**: Mock all API calls upfront, not one-by-one
5. **Zero Tolerance**: No performance optimizations that break test reliability

### Performance Best Practices

#### **Backend**
```python
# ✅ Use opt-in fixtures for expensive operations
def test_email_functionality(client, db, auto_clean_mailpit):
    # Only use auto_clean_mailpit for email tests
    
def test_rate_limited_endpoint(client, db, test_rate_limits):
    # Only use test_rate_limits for tests that need it
```

#### **Frontend**
```typescript
// ✅ Clean imports - only what you need
import { render, screen, fireEvent, act } from "@testing-library/react";
// ❌ Don't import: waitFor, userEvent (unless specifically needed)

// ✅ Synchronous helper functions
const fillForm = (data) => {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: data.name } });
};

// ✅ Upfront mocking for component initialization
mockFetch
  .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData1) })
  .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData2) });
  // Add as many mockResolvedValueOnce calls as your component needs
```

## 5. Static Analysis & Code Quality: The Pipeline is the Law

We enforce a strict, consistent, and automated approach to code quality. The linters, type checkers, and test runners are not suggestions; they are the law. This ensures the codebase remains readable, maintainable, and free of common errors and warnings. These checks are run automatically by pre-commit hooks.

### Philosophy: Zero Tolerance for Errors and Warnings

- **If the quality pipeline (`npm run quality`) fails, your code is not ready.** No exceptions. This includes any linting errors, type-checking failures, test failures, or **any warnings** (such as deprecation notices).
- **The build will fail on warnings.** We have configured our tooling (e.g., `pytest.ini`) to treat warnings as errors, ensuring that potential issues are addressed proactively.
- **Automate Everything**: We use tools to format and fix issues automatically. Use `npm run fix` before every commit.
- **Consistency is Key**: All code, regardless of author, must look and feel the same.

### Our Tooling

- **Formatting**: **Prettier** for TypeScript/React and **Black** for Python. These are opinionated formatters that handle all stylistic choices.
    - _Your job is to write the code, their job is to format it._
    - **Configuration**: `.prettierrc`, `.prettierignore`, `pyproject.toml` (for Black).
- **Linting**: **ESLint** for TypeScript/React and **Flake8** for Python. These tools catch potential bugs, enforce best practices, and prevent unsafe patterns.
    - **Configuration**: `eslint.config.js` is the source of truth for all frontend linting rules.
- **Type Checking**: **TypeScript (tsc)** for the frontend and **pyright** for the backend. This is our first line of defense against runtime errors.
    - **Configuration**: `tsconfig.json`, `pyrightconfig.json`.

### Key ESLint/TypeScript Guidelines

While the full configuration is in `eslint.config.js`, these are the most important principles we enforce:

- **No `any`**: The `any` type is forbidden. If you need an escape hatch, use `unknown` and perform type-safe validation.
- **No Unsafe Operations**: Rules like `@typescript-eslint/no-unsafe-assignment` and `@typescript-eslint/no-unsafe-call` are enabled to prevent runtime type errors.
- **Strict Type Checking**: All `strict` flags in `tsconfig.json` are enabled. This includes `noImplicitReturns` and `noUncheckedIndexedAccess`.
- **Explicit Return Types**: Functions must have explicit return types to ensure clarity and prevent bugs.

### How to Comply

1.  **Install the Recommended VS Code Extensions**: `dbaeumer.vscode-eslint` and `ms-python.black-formatter`. This will give you real-time feedback.
2.  **Run `npm run fix` Often**: This command will automatically format your code with Prettier/Black and fix any auto-fixable ESLint errors.
3.  **Run `npm run quality` Before Committing**: This is the same check the CI pipeline runs. If it passes on your machine, it will pass in the pipeline.

## 6. Running Tests & Quality Checks

### Essential Commands

```bash
# Run the complete test suite (Python + React)
npm run test

# Run the full quality pipeline (format, lint, type-check, test)
# This is the command to run before committing.
npm run quality

# Auto-fix all possible formatting and linting issues
npm run fix
```

### Advanced Commands

```bash
# Run only backend tests (parallel execution, ~11s)
npm run test:backend

# Run only frontend tests (optimized, ~2s)
npm run test:frontend

# Run specific test file to verify optimization patterns
npm run test:frontend -- --run src/client/components/__tests__/YourComponent.test.tsx

# Run React tests with coverage
vitest run --coverage

# Run the full linting suite
npm run lint

# Run the full formatting suite
npm run format

# Run the full type-checking suite
npm run type-check
```

## Related Testing Documentation

### Complete Testing Strategy
For a comprehensive view of all testing layers in Zentropy:
- **[Test Coverage Matrix](../docs/testing/TestCoverage.md)** - Cross-layer test coverage mapping showing unit, integration, and E2E test relationships

### End-to-End Testing
For complete user workflow testing:
- **[E2E Testing Guide](../tests-e2e/README.md)** - Playwright-based browser testing for user workflows and cross-system integration
- **Commands**: `npm run test:e2e`, `npm run test:e2e:ui`

### When to Use Each Testing Layer
- **Unit Tests** (this guide): Business logic, individual functions, component behavior
- **Integration Tests** (this guide): API contracts, database interactions, component integration
- **E2E Tests** (see above): Complete user journeys, cross-browser validation, email workflows
