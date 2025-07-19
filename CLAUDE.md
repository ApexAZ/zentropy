# CLAUDE.md

Zentropy - Product Management platform: Python FastAPI + React + PostgreSQL

## 🚨 ARCHITECTURE RULES (NON-NEGOTIABLE)

1. **No Layer Bypassing**: Components → Hooks → Services → API
2. **No Direct API Calls**: Always use services through hooks
3. **No Test Database Pollution**: Use provided test fixtures only
4. **No Error Swallowing**: Implement three-layer error handling
5. **No Hardcoded Colors**: Use semantic color system (`bg-interactive`)
6. **No Quality Bypasses**: Zero tolerance for warnings/errors

## 🏗️ CRITICAL ARCHITECTURE PATTERNS

### **Layered Architecture (MANDATORY)**
```
Components → Hooks → Services → API → Database
```
- **Service**: Static classes, consistent error handling
- **Hook**: Business logic, loading/error states  
- **Component**: UI rendering, user-friendly errors

### **Three-Layer Error Propagation**
```typescript
// Service: HTTP → JS errors | Hook: Catch/state | Component: User display
```

### **Test Isolation Pattern**
```python
# ✅ Fresh database per test
@pytest.fixture(scope="function")
def client(test_db_engine):
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

## 📁 DIRECTORY STRUCTURE

```
src/client/
├── components/          # UI components + tests
│   ├── atoms/          # Basic building blocks
│   └── __tests__/      # Co-located tests
├── hooks/              # Business logic hooks
├── pages/              # Top-level pages
├── services/           # API communication
└── contexts/           # React providers

api/
├── models/             # SQLAlchemy models
├── routers/            # FastAPI endpoints
└── schemas/            # Pydantic schemas

tests/                  # Backend tests
└── conftest.py         # Test fixtures
```

## 🎨 CODE STYLE PREFERENCES

**Format**: Tabs, double quotes, semicolons, trailing commas  
**Naming**: camelCase (TS), snake_case (Python), kebab-case (files)  
**Booleans**: `isLoading`, `showModal`, `hasError`  
**Handlers**: `handleSubmit`, `handleClose`  
**TypeScript**: Explicit types, no `any`, use `??` not `||`

### Import Organization

```typescript
import React, { useState, useEffect, useCallback } from "react";
import { AuthService } from "../services/AuthService";
import type { AuthUser, SignInCredentials } from "../types";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import RequiredAsterisk from "./RequiredAsterisk";
```

## 🔧 ESSENTIAL PATTERNS

### **Centralized Toast System**
```typescript
// ✅ User feedback via toast context
const { showSuccess, showError } = useToast();
// ❌ Never use alert() or console.log()

// ✅ Tests: renderWithToast(ui)
const renderWithToast = (ui) => render(<ToastProvider>{ui}</ToastProvider>);
```

### **Hook-Driven State Management**
```typescript
export function useAuth() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const signIn = useCallback(async credentials => {
		try {
			setLoading(true);
			const result = await AuthService.signIn(credentials);
			setUser(result.user);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	return { user, signIn, loading, error };
}
```

### **Component Composition**
```typescript
// ✅ Small, focused components
const AuthModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <Card><AuthForm onSuccess={onSuccess} /></Card>
  </Modal>
);
// ❌ Monolithic components (500+ lines)
```

### **Form Validation**
```typescript
const { values, errors, handleChange, handleSubmit, isValid } = useFormValidation({
	initialValues: { email: "", password: "" },
	validationRules: {
		email: value => (AuthService.validateEmail(value) ? null : "Invalid email")
	}
});
```

### **Environment Configuration**
```bash
# Backend: .env
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://...

# Frontend: src/client/.env.local  
VITE_GOOGLE_CLIENT_ID=your-client-id
```

### **Semantic Color System (MANDATORY)**
```css
/* Single source: src/client/styles.css */
--color-interactive: #6A8BA7;            /* Buttons, links */
--color-interactive-hover: #B8D4F0;      /* Hover states */
--color-content-background: #FFFFFF;     /* Cards, forms */
--color-layout-background: #F0F0F0;      /* Backgrounds */
```
```typescript
// ✅ Semantic classes | ❌ Hardcoded colors
className="bg-interactive hover:bg-interactive-hover"
className="bg-blue-600 hover:bg-blue-700"  // FORBIDDEN
```

### **Centralized Utilities Pattern**
```typescript
// formatters.ts - Data presentation
export const formatDate = (dateString: string, monthFormat: "short" | "long"): string
export const getRoleLabel = (role: string): string
export const getVelocityStatus = (velocity: number): { label: string; color: string }

// errorHandling.ts - Error mapping  
export function mapAccountSecurityError(error: Error, context: string): ErrorDetails

// logger.ts - Environment-aware logging
export const logger = new Logger();
```

### **Performance Memoization**
```typescript
// Prevent re-renders
const handleSubmit = useCallback(async (values) => {
  // Implementation  
}, [dependency]);

const expensiveComputation = useMemo(() => {
  return AuthService.validatePassword(password);
}, [password]);

// Component memoization
export const ExpensiveComponent = React.memo(({ data }) => {
  // Implementation
}, (prevProps, nextProps) => prevProps.data.id === nextProps.data.id);
```

### **Rate Limiting with Graceful Degradation**
```python
@rate_limit(max_requests=5, window_seconds=300, limit_type=RateLimitType.AUTH)
async def verify_code():
    # Redis → in-memory fallback
```

## 🏛️ ARCHITECTURAL ENFORCEMENT PATTERNS

### **Organization-First Development (MANDATORY)**
```typescript
// ✅ All features require organization scoping
interface ProjectService {
  createProject(data: CreateProjectData, organizationId: string): Promise<Project>;
  getProjects(organizationId: string): Promise<Project[]>;
  // ❌ Never: getProjects(): Promise<Project[]> // Missing org scope
}

// ✅ Database models include organization relationships
class Project extends Base {
  organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"))
  organization_rel: Mapped["Organization"] = relationship("Organization")
}
```

### **UUID Primary Keys (MANDATORY)**
```python
# ✅ All entities use UUIDs for distributed system compatibility
class User(Base):
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

# ❌ Never use auto-incrementing integers
# id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
```

### **Enum-Driven Constraints**
```python
# ✅ Business logic on enums with DB constraints
class OrganizationScope(PyEnum):
    PERSONAL = "personal"
    SHARED = "shared"
    
    @classmethod
    def get_default_max_users(cls, scope: "OrganizationScope") -> Optional[int]:
        # Centralized business rules
```

### **Security-First API Design**
```python
# ✅ Always require auth + organization context
async def get_projects(
    organization_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    verify_organization_access(current_user, organization_id, db)
```

## 🚨 ANTI-PATTERNS (FORBIDDEN)

### **❌ Direct API Calls in Components**
```typescript
// ❌ FORBIDDEN: Components bypassing service layer
const MyComponent = () => {
  useEffect(() => {
    fetch('/api/v1/teams'); // Direct API call
  }, []);
};

// ❌ FORBIDDEN: Manual OAuth timer polling in tests
vi.mock('../hooks/useGoogleOAuth', () => ({
  useGoogleOAuth: () => {
    const [isReady, setIsReady] = useState(false);
    useEffect(() => {
      const timer = setTimeout(() => setIsReady(true), 30000); // Causes timeouts
      return () => clearTimeout(timer);
    }, []);
    return { isReady };
  }
}));

// ✅ CORRECT: Use service through hook
const MyComponent = () => {
  const { teams } = useTeams(); // Service abstraction
};
```

### **❌ Missing Organization Scoping**
```python
# ❌ FORBIDDEN: Global operations without organization context
def get_all_projects():
    return db.query(Project).all()

# ✅ CORRECT: Organization-scoped operations
def get_projects_for_organization(organization_id: UUID):
    return db.query(Project).filter(Project.organization_id == organization_id).all()
```

### **❌ Implementation Testing**
```typescript
// ❌ FORBIDDEN: Testing implementation details
expect(AuthService.signIn).toHaveBeenCalled();

// ❌ FORBIDDEN: Complex manual OAuth mocking
vi.mock('../hooks/useGoogleOAuth', () => ({ /* complex setup */ }));
// Use environment-aware hooks instead - automatic detection + mocking

// ✅ CORRECT: Testing user behavior
expect(mockOnSuccess).toHaveBeenCalled();
```

### **❌ Main Database in Tests**
```python
# ❌ FORBIDDEN: Tests using production database
def test_user_creation():
    with next(get_db()) as db:  # Uses main database

# ✅ CORRECT: Isolated test database
def test_user_creation(client, db):  # Uses test fixtures
```

## 🧪 TESTING PATTERNS

### **High-Performance Frontend Testing (99%+ Speed Improvement)**
```typescript
// 🚀 PRIMARY PATTERN: Environment-Aware OAuth Hooks (Automatic)
// ✅ useGoogleOAuth auto-detects test environment and returns immediate mocks
// ✅ Eliminates 30-second timer polling, achieving 99%+ performance improvement
it("should render Security tab with OAuth functionality", async () => {
  // useGoogleOAuth automatically detects test environment via:
  // 1. VITE_OAUTH_MOCK_MODE environment variable
  // 2. Mocked fetch detection (component test context)
  // Returns immediate deterministic mocks, preserving production functionality
  
  renderWithToast(<SecurityTab />);
  
  await act(async () => {
    await Promise.resolve();
  });
  
  expect(screen.getByText("Google")).toBeInTheDocument();
});

// ✅ SECONDARY PATTERN: Upfront API Mocking + fireEvent for non-OAuth components
it("should allow user to sign in with valid credentials", async () => {
  // 1. Mock all component initialization API calls upfront
  mockFetch
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUser) });
    // Add more mocks as needed for your component
  
  renderWithToast(<AuthModal />);
  
  // 2. Let React finish initialization
  await act(async () => {
    await Promise.resolve();
  });
  
  // 3. Use fireEvent for immediate interactions (19ms vs 2000ms+ timeouts)
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  
  // 4. Let React process updates
  await act(async () => {
    await Promise.resolve();
  });
  
  expect(mockOnSuccess).toHaveBeenCalled();
});

// ❌ SLOW: Manual OAuth mocking with timer polling
// vi.mock('../hooks/useGoogleOAuth', () => ({ ... })); // Complex manual setup
// ❌ SLOW: userEvent with fake timers (causes timeouts)
// const user = userEvent.setup();
// await user.type(...); // Timing conflicts with vi.useFakeTimers()
```

### **Frontend Test Optimization Patterns**
```typescript
// 🚀 PRIMARY: Environment-Aware OAuth Hooks (Zero Configuration)
// useGoogleOAuth automatically detects test environment via:
// 1. VITE_OAUTH_MOCK_MODE environment variable  
// 2. Mocked fetch detection in component test context
// Provides immediate deterministic responses, eliminating 30-second timer delays

it('OAuth component test', async () => {
  // No manual mocking needed - hooks handle environment detection automatically
  render(<ComponentWithOAuth />);
  
  await act(async () => {
    await Promise.resolve();
  });
  
  expect(screen.getByText("OAuth Ready")).toBeInTheDocument();
});

// ✅ SECONDARY: Upfront API Mocking for Non-OAuth Components
mockFetch
  .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData1) })
  .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData2) });
  // Add as many mockResolvedValueOnce calls as your component needs

// ✅ fireEvent for User Interactions
fireEvent.click(button);
fireEvent.change(input, { target: { value: "test" } });

// ✅ Synchronous Helper Functions
const fillForm = (data) => {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: data.name } });
};

// ✅ Simple act() Pattern
await act(async () => {
  await Promise.resolve();
});
expect(screen.getByText("Result")).toBeInTheDocument();

// ✅ Clean Imports
import { render, screen, fireEvent, act } from "@testing-library/react";
// Don't import: waitFor, userEvent (unless specifically needed)
```

### **High-Performance Test Architecture**
```python
# ✅ Transaction rollback for 8x speed improvement
@pytest.fixture(scope="session")
def test_db_engine():
    # Single database engine for entire test session
    engine = create_engine(DATABASE_URL, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function") 
def db(test_db_engine):
    # Per-test transaction rollback (not database recreation)
    connection = test_db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:  # Handle edge cases
            transaction.rollback()
        connection.close()
```

### **Optimized Fixture Strategy**
```python
# ✅ Opt-in fixtures for expensive operations
@pytest.fixture(scope="function")  # Not autouse=True
def test_rate_limits():
    # For tests making multiple API calls (register, login, etc.)
    # Prevents 429 errors during parallel execution
    
@pytest.fixture(scope="function")  # Not autouse=True  
def auto_clean_mailpit():
    # Only use for email-specific tests
    
# ✅ Parallel execution by default
"test:backend": "python3 -m pytest -n auto"
```

### **Rate Limiting in Parallel Tests**
```python
# ✅ Add test_rate_limits for API-intensive tests
def test_user_registration_flow(client, test_rate_limits):
    # Multiple API calls: register + login + create_project
    
# ❌ Missing fixture causes 429 errors in parallel execution
def test_user_registration_flow(client):
    # Will fail with "Rate limit exceeded" when run with -n auto
```

### **Robust Mocking**
```typescript
// ✅ Handles React StrictMode double renders
mockFetch.mockImplementation(url => {
	if (url.includes("/api/v1/teams")) {
		return Promise.resolve({ ok: true, json: async () => mockTeams });
	}
	return Promise.reject(new Error(`Unhandled: ${url}`));
});
```

## ⚡ TDD WORKFLOW (MANDATORY)

1. Write failing test (behavior-focused)
2. Write minimal code to pass test  
3. Run test (should pass)
4. Refactor for quality, security, performance
5. Run `npm run quality` (must pass)
6. Repeat until robust
7. Document status in docs/status.md
8. Pause for user feedback

## 🛠️ COMMANDS

- `npm run quality`: Full pipeline (format, lint, type-check, test) - **zero tolerance**
- `npm run test`: All tests (backend + frontend)
- `npm run fix`: Auto-fix formatting/linting
- `npm run dev`: Development environment (user must initiate)

## 📚 ESSENTIAL DOCUMENTATION

- `README.md` - Project overview
- `docs/architecture/README.md` - Architecture deep dive  
- `tests/README.md` - Testing strategies
- `docs/testing/TestCoverage.md` - Test coverage matrix
- `docs/status.md` - TODO list and project status

## 📋 CURRENT TODO LIST

**See `docs/status.md` for detailed tracking**

### High Priority
1. **Eliminate Legacy Code** 🔴 - Remove `useFormValidationLegacy`
2. **Environment-Aware OAuth** ✅ - Implemented useGoogleOAuth with automatic test detection  
3. **State Management** 🔴 - Replace prop drilling with Zustand
4. **Routing Library** 🔴 - Replace manual routing with `react-router-dom`
5. **Refactor AuthModal** 🟡 - Break into smaller components

**Timestamps**: "YYYY-MM-DD HH:MM:SS (timezone)"

---

## 🚀 PERFORMANCE OPTIMIZATION METHODOLOGY

### **Methodical Optimization Approach**
1. **Dependency Analysis**: Map all fixture dependencies before changes
2. **Risk Assessment**: Identify cascade effects and compatibility issues  
3. **Incremental Changes**: Small, testable modifications with immediate validation
4. **Zero Regressions**: Ensure 100% test compatibility throughout optimization
5. **Performance Measurement**: Baseline → Optimize → Measure → Iterate

### **Test Performance Targets**
- **Backend Test Speed**: <20ms per test (achieved: 18.8ms vs 156ms baseline)
- **Frontend Test Speed**: <50ms per test (achieved: ~25ms vs 2000ms+ timeouts)
- **OAuth Hook Performance**: Immediate responses (vs 30-second timer delays)
- **ProfilePage Security Tab**: 447ms for 33 tests (vs 16+ seconds)
- **Total Backend Suite**: <20 seconds (achieved: 11.4s vs 94.8s baseline)
- **Total Frontend Suite**: <5 seconds (achieved: <2s for optimized tests)
- **Zero Tolerance**: No failed tests, no warnings, no regressions
- **Parallel Execution**: Default behavior, not opt-in

### **Performance vs Compatibility Balance**
- **Session-scoped resources** for expensive setup (database engine)
- **Function-scoped isolation** for test safety (transaction rollback)
- **Conditional cleanup** for edge cases (`transaction.is_active`)
- **Opt-in fixtures** for specialized needs (rate limits, email cleanup)

## 🎯 KEY PRINCIPLES

**Quality First**: Zero tolerance for warnings, TDD workflow mandatory
**Type Safety**: Explicit types, no `any`, comprehensive interfaces  
**Test Isolation**: Transaction rollback per test, optimized for speed
**User Focus**: Behavior-driven tests, excellent error handling
**Composition**: Small, focused components over monoliths
**Security**: Multi-layer protection with graceful degradation
**Performance**: Methodical optimization without compromising reliability
