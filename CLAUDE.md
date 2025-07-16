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

### **Behavior-Focused Testing**
```typescript
// ✅ Test user outcomes
it("should allow user to sign in with valid credentials", async () => {
  const user = userEvent.setup();
  renderWithToast(<AuthModal />);

  await user.type(screen.getByLabelText(/email/i), "test@example.com");
  await user.click(screen.getByRole("button", { name: /sign in/i }));

  await waitFor(() => expect(mockOnSuccess).toHaveBeenCalled());
});
// ❌ Test implementation details
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
2. **Simplify Google OAuth** 🔴 - Replace with `@react-oauth/google`  
3. **State Management** 🔴 - Replace prop drilling with Zustand
4. **Routing Library** 🔴 - Replace manual routing with `react-router-dom`
5. **Refactor AuthModal** 🟡 - Break into smaller components

**Timestamps**: "YYYY-MM-DD HH:MM:SS (timezone)"

---

## 🎯 KEY PRINCIPLES

**Quality First**: Zero tolerance for warnings, TDD workflow mandatory
**Type Safety**: Explicit types, no `any`, comprehensive interfaces  
**Test Isolation**: Fresh database per test, no pollution
**User Focus**: Behavior-driven tests, excellent error handling
**Composition**: Small, focused components over monoliths
**Security**: Multi-layer protection with graceful degradation
