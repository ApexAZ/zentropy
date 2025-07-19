# Zentropy Testing & Quality Handbook

**Purpose**: This is the **comprehensive guide** for unit and integration testing in the Zentropy project, covering backend (pytest) and frontend (vitest) testing strategies.

## 1. Global Mock Architecture - Structured Testing at Scale

**Purpose**: A 3-level hierarchy for systematic, high-performance testing across the entire frontend codebase.

### **Architecture Overview**

```
Level 1: Module-Level Service Mocking (Primary) → Component Integration Tests
Level 2: Service Factory Mocking (Scenarios)    → Complex Workflow Tests  
Level 3: Hook-Level Mocking (Specialized)       → Component Unit Tests
```

**Key Benefits:**
- **99%+ Performance Improvement**: Service mocks vs fetch polling patterns
- **Enterprise Scalability**: TypeScript interfaces ensure consistency across 1000+ tests
- **Developer Experience**: IntelliSense support, self-documenting test patterns
- **Zero Regressions**: Maintains full user behavior validation while optimizing execution

### **Level 1: Module-Level Service Mocking (Primary Pattern)**

**When to Use**: 90% of component tests - direct service interaction testing

```typescript
// Clean module-level mock with sensible defaults
vi.mock("../../services/UserService", () => ({
  UserService: {
    getCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    getAccountSecurity: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Set up default successful responses
  (UserService.getCurrentUser as any).mockResolvedValue(mockUser);
  (UserService.getAccountSecurity as any).mockResolvedValue(mockSecurity);
});

it("should update user profile successfully", async () => {
  (UserService.updateProfile as any).mockResolvedValue(updatedUser);
  
  renderWithFullEnvironment(<ProfilePage />, {
    providers: { toast: true }
  });
  
  await fastStateSync();
  
  fastUserActions.click(screen.getByText("Edit Profile"));
  fastUserActions.replaceText(screen.getByLabelText("First Name"), "Updated");
  fastUserActions.click(screen.getByText("Save Changes"));
  
  await fastStateSync();
  
  expect(screen.getByText("Profile updated successfully!")).toBeInTheDocument();
  expect(UserService.updateProfile).toHaveBeenCalledWith({
    first_name: "Updated",
    // ... other fields
  });
});
```

**Benefits of Level 1:**
- **Clean**: No fetch URL mocking, direct service method calls
- **Fast**: Immediate mock responses, no network simulation
- **Maintainable**: Service interface changes automatically surface in tests
- **Reliable**: Consistent mock behavior across test runs

### **Level 2: Service Factory Mocking (Scenario-Driven)**

**When to Use**: Complex workflows, pre-configured scenarios, cross-service integration

```typescript
import { 
  createUserServiceMocks, 
  UserServiceScenarios,
  createTeamServiceMocks,
  TeamServiceScenarios
} from "../mocks/serviceMocks";

it("should handle user with multiple team memberships", async () => {
  const testEnv = renderWithFullEnvironment(<DashboardPage />, {
    providers: { toast: true, auth: true, organization: true },
    mocks: {
      userService: UserServiceScenarios.standardUser(),
      teamService: TeamServiceScenarios.teamWithMultipleMembers(),
      projectService: ProjectServiceScenarios.standardProject()
    }
  });
  
  await fastStateSync();
  
  expect(screen.getByText("Welcome back, Test User")).toBeInTheDocument();
  expect(screen.getByText("3 teams")).toBeInTheDocument();
  
  // Access mocks for verification
  expect(testEnv.mocks.teamService.getTeamMembers).toHaveBeenCalled();
  
  testEnv.cleanup();
});
```

**Available Service Scenarios:**
- `AuthServiceScenarios`: `successfulSignIn()`, `failedSignIn()`, `rateLimited()`, `expiredSession()`
- `UserServiceScenarios`: `standardUser()`, `googleLinked()`, `passwordUpdateFailed()`
- `TeamServiceScenarios`: `standardTeam()`, `noTeams()`, `teamWithMultipleMembers()`
- `ProjectServiceScenarios`: `standardProject()`, `personalProjectsOnly()`, `noProjects()`
- `OrganizationServiceScenarios`: `domainFound()`, `domainNotFound()`, `organizationFull()`

### **Level 3: Hook-Level Mocking (Specialized)**

**When to Use**: Component unit tests, hook behavior isolation, OAuth components

```typescript
// Environment-aware OAuth hooks (auto-detection)
it("should render OAuth provider buttons", async () => {
  // useGoogleOAuth automatically detects test environment and provides fast mocks
  // No manual mocking required!
  renderWithFullEnvironment(<SecurityTab />, {
    providers: { toast: true }
  });
  
  await fastStateSync();
  
  expect(screen.getByText("Google")).toBeInTheDocument();
  expect(screen.getByText("Microsoft")).toBeInTheDocument();
  expect(screen.getByText("GitHub")).toBeInTheDocument();
});

// Manual hook mocking for specialized behavior
vi.mock("../../hooks/useCustomHook", () => ({
  useCustomHook: () => ({
    data: mockData,
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}));
```

### **Test Utilities & Performance Optimizations**

```typescript
// Fast rendering with structured environment setup
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "../utils/testRenderUtils";

// Provider combinations for different test needs
const testEnv = ProviderCombinations.toastOnly(<SimpleComponent />);
const testEnv = ProviderCombinations.withAuth(<AuthComponent />, mockUser);
const testEnv = ProviderCombinations.withOrganization(<OrgComponent />, { user, organization });

// Scenario-based environments
const testEnv = TestScenarios.authenticatedUser(<Component />);
const testEnv = TestScenarios.unauthenticatedUser(<Component />);
const testEnv = TestScenarios.networkError(<Component />);

// Fast user interactions (19ms vs 2000ms+ timeouts)
fastUserActions.click(button);
fastUserActions.type(input, "text");
fastUserActions.replaceText(input, "new text");

// Fast state synchronization (replaces waitFor patterns)
await fastStateSync();
```

### **Migration from Legacy Patterns**

```typescript
// ❌ OLD PATTERN: Global fetch mocking
const mockFetch = vi.fn();
global.fetch = mockFetch;
mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });

// ✅ NEW PATTERN: Module-level service mocking
vi.mock("../../services/UserService", () => ({
  UserService: { getCurrentUser: vi.fn() }
}));
(UserService.getCurrentUser as any).mockResolvedValue(data);

// ❌ OLD PATTERN: Complex manual OAuth mocking
vi.mock('../hooks/useGoogleOAuth', () => ({
  useGoogleOAuth: () => {
    const [isReady, setIsReady] = useState(false);
    useEffect(() => {
      const timer = setTimeout(() => setIsReady(true), 30000); // 30s delay!
      return () => clearTimeout(timer);
    }, []);
    return { isReady };
  }
}));

// ✅ NEW PATTERN: Environment-aware OAuth hooks (automatic)
// No manual mocking needed - hooks auto-detect test environment
renderWithFullEnvironment(<SecurityTab />, { providers: { toast: true } });
```

## 2. Quality Philosophy: Test What Can Break

Our testing strategy is built on a simple, powerful idea: **write meaningful tests that prevent real bugs.** We favor clarity and effectiveness over dogma.

- **TDD is Mandatory**: Write tests, then write the code, run the test, then refactor the code for robustness
- **Focus on Behavior**: Test what the user experiences and what the code _does_, not its internal implementation details.
- **Zero-Tolerance for Lint**: All code must pass static analysis checks (`npm run quality`) before it is considered complete.

## 3. The Core Testing Workflow

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

### Step 3: Writing a Frontend Test with Global Mock Architecture

Use the **Global Mock Architecture** for structured, high-performance testing that achieves 99%+ speed improvements.

1.  **Extract Logic**: First, pull any complex validation, data formatting, or state management out of your component and into a pure utility function (`src/client/utils/`) or a custom hook (`src/client/hooks/`). Write fast, simple unit tests for that extracted logic.
2.  **Create the Component Test File**: e.g., `src/client/components/__tests__/YourComponent.test.tsx`.
3.  **Choose Your Mock Level**: Select the appropriate level from the Global Mock Architecture based on your testing needs.
4.  **Test the User's Goal**: Verify the user's workflow using structured mock patterns.

**Level 1 Example (Primary Pattern - Module-Level Service Mocking):**
```typescript
// Clean module-level mock
vi.mock("../../services/WidgetService", () => ({
  WidgetService: {
    getWidgets: vi.fn(),
    createWidget: vi.fn(),
    updateWidget: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  (WidgetService.getWidgets as any).mockResolvedValue([]);
});

it('allows a user to create a new widget and see it in the list', async () => {
  // 1. Arrange: Configure service mock responses
  (WidgetService.createWidget as any).mockResolvedValue(mockWidget);
  (WidgetService.getWidgets as any).mockResolvedValueOnce([mockWidget]);
  
  renderWithFullEnvironment(<WidgetPage />, {
    providers: { toast: true }
  });
  
  await fastStateSync();

  // 2. Act: Use fast user interactions
  fastUserActions.type(screen.getByLabelText(/widget name/i), 'My Test Widget');
  fastUserActions.click(screen.getByRole('button', { name: /save widget/i }));

  await fastStateSync();

  // 3. Assert: Check for the expected outcome
  expect(screen.getByText(/widget created successfully/i)).toBeInTheDocument();
  expect(screen.getByText(/my test widget/i)).toBeInTheDocument();
  expect(WidgetService.createWidget).toHaveBeenCalledWith({
    name: 'My Test Widget'
  });
});
```

**Level 2 Example (Scenario-Driven):**
```typescript
it('handles complex widget workflow with multiple services', async () => {
  const testEnv = renderWithFullEnvironment(<WidgetDashboard />, {
    providers: { toast: true, auth: true },
    mocks: {
      widgetService: WidgetServiceScenarios.withMultipleWidgets(),
      userService: UserServiceScenarios.standardUser(),
      teamService: TeamServiceScenarios.standardTeam()
    }
  });
  
  await fastStateSync();
  
  expect(screen.getByText("5 widgets")).toBeInTheDocument();
  expect(testEnv.mocks.widgetService.getWidgets).toHaveBeenCalled();
  
  testEnv.cleanup();
});
```

### Step 4: Global Mock Architecture Implementation Patterns

The Global Mock Architecture provides **enterprise-grade testing patterns** that achieve 99%+ speed improvements while maintaining full user behavior validation.

#### **🚀 Global Mock Architecture Patterns**

**1. Module-Level Service Mocking (Primary Pattern)**
```typescript
// ✅ CLEAN: Direct service method mocking
vi.mock("../../services/TeamService", () => ({
  TeamService: {
    getTeam: vi.fn(),
    getTeamMembers: vi.fn(),
    updateTeamBasicInfo: vi.fn(),
    addTeamMember: vi.fn()
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
  (TeamService.getTeam as any).mockResolvedValue(mockTeam);
  (TeamService.getTeamMembers as any).mockResolvedValue(mockMembers);
});

it('should update team information successfully', async () => {
  (TeamService.updateTeamBasicInfo as any).mockResolvedValue(updatedTeam);
  
  renderWithFullEnvironment(<TeamConfigurationPage />, {
    providers: { toast: true }
  });
  
  await fastStateSync();
  
  fastUserActions.click(screen.getByText("Edit Team"));
  fastUserActions.replaceText(screen.getByLabelText(/team name/i), "Updated Team");
  fastUserActions.click(screen.getByText("Save Changes"));
  
  await fastStateSync();
  
  expect(screen.getByText("Team updated successfully!")).toBeInTheDocument();
  expect(TeamService.updateTeamBasicInfo).toHaveBeenCalledWith(mockTeam.id, {
    name: "Updated Team"
  });
});
```

**2. Service Factory Scenarios (Complex Workflows)**
```typescript
// ✅ SCENARIOS: Pre-configured service behaviors
import { TeamServiceScenarios, UserServiceScenarios } from "../mocks/serviceMocks";

it('should handle team with no members scenario', async () => {
  const testEnv = renderWithFullEnvironment(<TeamPage />, {
    providers: { toast: true, auth: true },
    mocks: {
      teamService: TeamServiceScenarios.noTeams(),
      userService: UserServiceScenarios.standardUser()
    }
  });
  
  await fastStateSync();
  
  expect(screen.getByText("No teams found")).toBeInTheDocument();
  expect(screen.getByText("Create your first team")).toBeInTheDocument();
  
  testEnv.cleanup();
});
```

**3. Environment-Aware OAuth Hooks (Specialized)**
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

**4. Structured Test Environment Setup**
```typescript
// ✅ STRUCTURED: Full environment with provider combinations
import { renderWithFullEnvironment, ProviderCombinations, TestScenarios } from "../utils/testRenderUtils";

// Basic provider setup
const testEnv = ProviderCombinations.toastOnly(<SimpleComponent />);
const testEnv = ProviderCombinations.withAuth(<AuthComponent />, mockUser);
const testEnv = ProviderCombinations.withOrganization(<OrgComponent />, { user, organization });

// Scenario-based setup
const testEnv = TestScenarios.authenticatedUser(<Component />);
const testEnv = TestScenarios.unauthenticatedUser(<Component />);
const testEnv = TestScenarios.networkError(<Component />);

// Custom mock combinations
const testEnv = renderWithFullEnvironment(<ComplexComponent />, {
  providers: { toast: true, auth: true, organization: true },
  mocks: {
    userService: createUserServiceMocks({
      getCurrentUser: vi.fn().mockResolvedValue(customUser)
    }),
    teamService: TeamServiceScenarios.teamWithMultipleMembers(),
    projectService: ProjectServiceScenarios.noProjects()
  }
});

// Access mocks for verification
expect(testEnv.mocks.userService.getCurrentUser).toHaveBeenCalled();

// Automatic cleanup
testEnv.cleanup();
```

**5. Legacy Pattern Migration**
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

**6. Fast User Interaction Utilities**
```typescript
// ✅ FAST: Direct DOM events (19ms vs 2000ms+ timeouts)
fireEvent.click(button);
fireEvent.change(input, { target: { value: "test" } });

// ❌ SLOW: Simulated human timing (causes timeouts with fake timers)
await user.click(button);
```

**7. Synchronous Helper Functions**
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

**8. Fast State Synchronization**
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

#### **When to Use Each Level**

**Level 1 - Module-Level Service Mocking (90% of tests):**
- Component integration tests
- User workflow validation
- Service method verification
- Fast, direct testing patterns
- Standard CRUD operations

**Level 2 - Service Factory Scenarios (Complex workflows):**
- Multi-service integration
- Pre-configured error scenarios
- Cross-component workflows
- User permission variations
- Complex business logic scenarios

**Level 3 - Hook-Level Mocking (Specialized cases):**
- Component unit tests
- Hook behavior isolation
- OAuth components (environment-aware)
- Custom hook testing
- Edge case isolation

#### **Available Service Mock Factories**

```typescript
// Authentication scenarios
AuthServiceScenarios.successfulSignIn()
AuthServiceScenarios.failedSignIn()
AuthServiceScenarios.rateLimited()
AuthServiceScenarios.expiredSession()

// User management scenarios
UserServiceScenarios.standardUser()
UserServiceScenarios.googleLinked()
UserServiceScenarios.passwordUpdateFailed()

// Team scenarios
TeamServiceScenarios.standardTeam()
TeamServiceScenarios.noTeams()
TeamServiceScenarios.teamWithMultipleMembers()
TeamServiceScenarios.teamNotFound()

// Project scenarios
ProjectServiceScenarios.standardProject()
ProjectServiceScenarios.personalProjectsOnly()
ProjectServiceScenarios.noProjects()
ProjectServiceScenarios.projectNotFound()

// Organization scenarios
OrganizationServiceScenarios.domainFound()
OrganizationServiceScenarios.domainNotFound()
OrganizationServiceScenarios.organizationFull()
OrganizationServiceScenarios.noPermissions()

// OAuth provider scenarios
OAuthProviderServiceScenarios.googleOnly()
OAuthProviderServiceScenarios.multipleProviders()
OAuthProviderServiceScenarios.noProviders()
```

#### **Performance Results**
- **ProfilePage Security Tab**: 447ms for 33 tests (vs 16+ seconds with timer polling)
- **OAuth Hook Performance**: Immediate mock responses (vs 30-second timer delays)
- **Overall Improvement**: 99%+ faster execution with zero test regressions
- **Maintains**: Full user behavior validation and production OAuth functionality

**Mock Consolidation**

For complex test files like `App.test.tsx`, mocks are consolidated at the top of the file for better organization and reusability. This includes creating helper functions to manage mock state. While Vitest's hoisting behavior prevents the use of a central `__mocks__` directory, this in-file consolidation provides similar benefits.

### Step 5: Global Mock Architecture Files

**Core Architecture Files:**
- `src/client/__tests__/setup/globalMocks.ts` - Core mock registry and TypeScript interfaces
- `src/client/__tests__/mocks/serviceMocks.ts` - Service-specific mock factories and scenarios
- `src/client/__tests__/utils/testRenderUtils.ts` - Enhanced rendering utilities and provider combinations
- `src/client/__tests__/setup/mockArchitecture.test.tsx` - Architecture validation tests
- `src/client/__tests__/examples/MockArchitectureDemo.test.tsx` - Usage examples and patterns

**Integration Examples:**
- `src/client/pages/__tests__/ProfilePage.test.tsx` - Level 1 module-level service mocking
- `src/client/pages/__tests__/TeamConfigurationPage.test.tsx` - Level 1 with comprehensive CRUD operations
- `src/client/pages/__tests__/CalendarPage.test.tsx` - Level 1 with calendar-specific scenarios
- `src/client/components/__tests__/AccountSecuritySection.test.tsx` - Level 3 hook-level OAuth mocking

### Step 6: Backend Test Directory Structure

To improve organization and maintainability, the `tests/` directory mirrors the structure of the `api/` directory. This makes it easy to locate tests related to specific parts of the application.

-   `tests/routers/`: Tests for API endpoints in `api/routers/`.
-   `tests/services/`: Tests for service-layer logic (e.g., `google_oauth.py`).
-   `tests/models/`: Tests for SQLAlchemy models and database logic.
-   `tests/auth/`: Tests related to authentication, roles, and permissions.
-   `tests/oauth/`: Tests related to OAuth integrations.
-   `tests/core/`: Core application tests, such as startup and integration checks.
-   `tests/functional/`: Functional tests that cover user workflows.

When adding new tests, place them in the corresponding subdirectory.

## 4. The Backend Test Isolation System

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

## 5. Test Performance Optimization

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

## 6. Static Analysis & Code Quality: The Pipeline is the Law

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

## 7. ESLint Integration - Gentle Rails for Global Mock Architecture

The codebase includes **ESLint rules** that guide developers toward Global Mock Architecture patterns without forcing adoption. These create "gentle rails" that encourage better testing practices.

### **What the ESLint Rules Do**

#### **For Test Files Only** (`src/client/**/*.test.{ts,tsx}`, `src/client/**/__tests__/**/*.{ts,tsx}`)

**🚨 Discourage Legacy Patterns:**
```typescript
// ⚠️ ESLint Warning: "Consider using module-level service mocking instead of global.fetch"
global.fetch = vi.fn();

// ⚠️ ESLint Warning: "Consider using service mock scenarios instead of manual fetch response mocking"
mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
```

**💡 Encourage Better Infrastructure:**
```typescript
// ⚠️ ESLint Warning: "Consider using renderWithFullEnvironment for 99%+ performance improvement"
import { render } from '@testing-library/react';

// ✅ Preferred (no warning)
import { renderWithFullEnvironment } from '../../__tests__/utils/testRenderUtils';
```

**🎯 Guide High-Performance Testing Patterns:**
```typescript
// ⚠️ ESLint Warning: "Consider using act() with fastStateSync() instead of waitFor"
import { waitFor } from '@testing-library/react';
await waitFor(() => expect(screen.getByText("Loading")).toBeInTheDocument());

// ⚠️ ESLint Warning: "Consider using fireEvent with fastUserActions for immediate interactions"
import userEvent from '@testing-library/user-event';
const user = userEvent.setup();
await user.click(button);

// ⚠️ ESLint Warning: "Consider using vi.useFakeTimers() for predictable timing"
vi.useRealTimers(); // In beforeEach (should only be in afterEach)

// ✅ Preferred (no warnings) - High-performance patterns
await fastStateSync(); // 19ms vs 2000ms+ waitFor
fastUserActions.click(button); // Immediate vs userEvent delays
vi.useFakeTimers(); // Predictable timing + faster execution
```

### **Developer Experience Features**

#### **VS Code Snippets** (`.vscode/typescript.json`)
- **`mocksvc`** → Complete module-level service mock
- **`testenv`** → renderWithFullEnvironment test template  
- **`mocksetup`** → beforeEach mock configuration
- **`mockscenario`** → Service scenario usage
- **`fastactions`** → Fast user interaction patterns
- **`gmatest`** → Complete test file template

#### **Snippet Optimization** (`.vscode/settings.json`)
- Snippets appear at top of autocomplete suggestions
- Enhanced TypeScript IntelliSense for mock patterns
- Module export completions for service imports

### **ESLint Rule Details**

```javascript
// eslint.config.js - Test file specific rules
{
  files: ['src/client/**/*.test.{ts,tsx}', 'src/client/**/__tests__/**/*.{ts,tsx}'],
  rules: {
    // Allow explicit any for mock type assertions  
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Discourage global.fetch assignments
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'AssignmentExpression[left.object.name="global"][left.property.name="fetch"]',
        message: '💡 Consider using module-level service mocking instead of global.fetch'
      }
    ],
    
    // Encourage renderWithFullEnvironment
    'no-restricted-imports': [
      'warn',
      {
        paths: [{
          name: '@testing-library/react',
          importNames: ['render'],
          message: '⚡ Consider using renderWithFullEnvironment for 99%+ performance improvement'
        }]
      }
    ]
  }
}
```

### **Philosophy: Guidance, Not Enforcement**

- **Warnings, not errors** - Won't break builds or block productivity
- **Educational messages** - Point to documentation and benefits
- **Gradual adoption** - Old patterns still work during transition
- **Context-aware** - Rules only apply to test files
- **Performance-focused** - Emphasize measurable improvements (99%+ faster)

### **Benefits for New Developers**

1. **Immediate feedback** in VS Code as they type
2. **Clear guidance** toward preferred patterns
3. **No productivity blocking** - warnings don't prevent commits
4. **Learning-friendly** - Messages explain why and link to docs
5. **Snippet acceleration** - Type `mocksvc` and get complete template

### **ESLint Output Example**

```bash
/src/client/pages/__tests__/TeamsPage.test.tsx
  9:1   warning  💡 Consider using module-level service mocking instead of global.fetch
  41:47 warning  🚀 Consider using service mock scenarios for cleaner tests
  3:10  warning  ⚡ Consider using renderWithFullEnvironment for 99%+ performance improvement
```

This creates a **learning-friendly environment** where developers naturally discover better patterns through their normal workflow, without forced adoption or breaking changes.

## 8. Running Tests & Quality Checks

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
