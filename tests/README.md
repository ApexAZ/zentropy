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

Our frontend testing uses a **Hybrid Approach**: we test business logic separately from the UI, which makes our tests faster and more resilient.

1.  **Extract Logic**: First, pull any complex validation, data formatting, or state management out of your component and into a pure utility function (`src/client/utils/`) or a custom hook (`src/client/hooks/`). Write fast, simple unit tests for that extracted logic.
2.  **Create the Component Test File**: e.g., `src/client/components/__tests__/YourComponent.test.tsx`.
3.  **Test the User's Goal**: The component test should verify the user's workflow, not the component's internal state.

    ```typescript
    it('allows a user to create a new widget and see it in the list', async () => {
      // 1. Arrange: Render the component and set up the user simulator.
      const user = userEvent.setup();
      render(<WidgetPage />);
      // Mock any API calls the component will make.

      // 2. Act: Simulate the user's actions.
      await user.type(screen.getByLabelText(/widget name/i), 'My Test Widget');
      await user.click(screen.getByRole('button', { name: /save widget/i }));

      // 3. Assert: Check for the expected outcome on the screen.
      expect(await screen.findByText(/widget created successfully/i)).toBeInTheDocument();
      expect(await screen.findByText(/my test widget/i)).toBeInTheDocument();
    });
    ```

### Step 4: Frontend API Mocking: Robustness is Mandatory

When testing frontend components that fetch data, it is critical to create mocks that are robust and resilient to changes in component implementation, such as the double-render behavior of React's StrictMode.

**The Problem: Fragile Mocks**

A common but fragile pattern is to chain `.mockResolvedValueOnce()` for each expected API call.

```typescript
// ❌ FRAGILE: This test can easily break
it('does something with fetched data', async () => {
  mockFetch
    .mockResolvedValueOnce(...) // for /api/teams
    .mockResolvedValueOnce(...) // for /api/users
    .mockResolvedValueOnce(...) // for /api/entries
  
  render(<MyComponent />);
  // ...
});
```

This test is brittle because it assumes a precise number and order of API calls. If React's StrictMode causes a `useEffect` to run twice, the mock queue will be exhausted prematurely, leading to `undefined` responses and crashes.

**The Solution: Robust Mocks with `mockImplementation`**

The mandatory pattern for this project is to use `.mockImplementation()`. This creates a stateful mock that responds based on the URL, regardless of how many times it is called.

```typescript
// ✅ ROBUST: This test is resilient
it('does something with fetched data', async () => {
  mockFetch.mockImplementation((url) => {
    if (url.includes('/api/v1/teams')) {
      return Promise.resolve({ ok: true, json: async () => mockTeams });
    }
    if (url.includes('/api/v1/users')) {
      return Promise.resolve({ ok: true, json: async () => mockUsers });
    }
    if (url.includes('/api/v1/calendar_entries')) {
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
  });

  render(<MyComponent />);
  // ...
});
```
This approach is more declarative and far less likely to break, making our test suite more reliable and easier to maintain.

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

- **What it is**: A system in `tests/conftest.py` that provides an isolated, in-memory SQLite database for each test function.
- **How it works**: When a test function requests the `client` or `db` fixture, `pytest` provides a fresh, isolated database session and/or test client.
- **Benefit**: This completely prevents test contamination and pollution of the main development database, making tests 100% reliable.

### Available Test Fixtures

The following fixtures are available in `tests/conftest.py` for use in your tests:

#### Database and Client Fixtures
- **`test_db_engine`** - Creates an isolated SQLite database engine for each test
- **`db`** - Provides a clean database session for direct database operations
- **`client`** - Provides a FastAPI TestClient with isolated database dependency injection

#### Authentication and User Fixtures
- **`current_user`** - Creates a verified test user (`current@user.com`) for standard authentication testing
- **`auth_headers`** - Creates JWT authentication headers for the current user
- **`admin_user`** - Creates an admin user with `UserRole.ADMIN` privileges
- **`admin_auth_headers`** - Creates JWT authentication headers for the admin user
- **`user_with_known_password`** - Creates a user with known password (`OldPassword123!`) for password management tests

#### Email and Rate Limiting Fixtures
- **`clean_mailpit`** - Ensures Mailpit is clean before and after each test (use only when you need pre-test cleanup)
- **`auto_clean_mailpit`** - Automatically cleans Mailpit after every test (runs automatically, no need to explicitly use)
- **`mailpit_disabled`** - Disables email sending for tests that don't need it
- **`test_rate_limits`** - Configures generous but realistic rate limits for testing (prevents 429 errors)

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

- **Rate Limiting**: Always use the `test_rate_limits` fixture for tests that make multiple API calls or could trigger rate limiting
- **Email Testing**: The `auto_clean_mailpit` fixture runs automatically, so you don't need to explicitly use it unless you need pre-test cleanup
- **Authentication**: Use `auth_headers` for standard user tests and `admin_auth_headers` for admin-only operations
- **Database Isolation**: All fixtures ensure complete test isolation - no test data will leak between tests or pollute the main database

## 4. Static Analysis & Code Quality: The Pipeline is the Law

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

## 5. Running Tests & Quality Checks

### Essential Commands

```bash
# Run the complete test suite (Python + React)
npm run test

# Run the full quality pipeline (lint, format, type-check, test)
# This is the command to run before committing.
npm run quality

# Auto-fix all possible formatting and linting issues
npm run fix
```

### Advanced Commands

```bash
# Run only Python tests
npm run test:python

# Run only Frontend tests
npm run test:frontend

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
