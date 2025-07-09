# Zentropy Testing & Quality Handbook

**Purpose**: This is the **single source of truth** for all testing and code quality standards in the Zentropy project.

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

1.  **Create the Test File**: e.g., `tests/test_your_feature.py`.
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

## 3. The Backend Test Isolation System

To ensure a clean, isolated database for your Python tests, explicitly request the `client` and `db` fixtures in your test functions.

- **What it is**: A system in `tests/conftest.py` that provides an isolated, in-memory SQLite database for each test function.
- **How it works**: When a test function requests the `client` or `db` fixture, `pytest` provides a fresh, isolated database session and/or test client.
- **Benefit**: This completely prevents test contamination and pollution of the main development database, making tests 100% reliable.

## 4. Static Analysis & Code Quality: The Linter is the Law

We enforce a strict, consistent, and automated approach to code quality. The linter and formatter are not suggestions; they are the law. This ensures the codebase remains readable, maintainable, and free of common errors. These checks are run automatically by pre-commit hooks.

### Philosophy: Zero Tolerance

- **If the linter fails, your code is not ready.** No exceptions.
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
