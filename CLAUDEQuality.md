# Quality Standards and Testing Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Testing Architecture](#testing-architecture)
3. [Hybrid Testing Strategy](#hybrid-testing-strategy)
4. [Standards & Patterns](#standards--patterns)
5. [Code Quality Standards](#code-quality-standards)
6. [Project Testing Implementation](#project-testing-implementation)
7. [Development Commands](#development-commands)
8. [Maintenance & Migration](#maintenance--migration)

---

## Quick Start

### Essential Commands
```bash
npm test                    # Run all tests
npm run test:quality        # Tests + ESLint + TypeScript check
npm run lint                # Fix code quality issues
npm run type-check          # Verify TypeScript safety
```

### Quality Metrics
- All tests passing with 100% reliability (470+ tests)
- 0 ESLint errors/warnings with strict TypeScript compilation
- Comprehensive test coverage across all architectural layers

### TDD Workflow (MANDATORY)
1. **🔴 Red**: Write failing test describing desired functionality
2. **🟢 Green**: Write minimal code to make test pass
3. **🔄 Refactor**: Improve code while keeping tests green
4. **🔍 Lint**: Ensure code quality with ESLint
5. **🔁 Repeat**: Continue for each increment

---

## Testing Architecture

### Testing Pyramid
```
    /\
   /UI\      ← Few Integration Tests (Expensive, Slow)
  /____\
 /  API \     ← Some API Tests (Medium Cost, Speed)  
/__UNIT__\    ← Many Unit Tests (Cheap, Fast)
```

### Four-Layer Strategy
- **Unit Tests**: Pure business logic and utility functions
- **API Tests**: Route-specific behavior and transformations  
- **Integration Tests**: End-to-end workflows across all layers
- **Frontend Tests**: UI logic, DOM manipulation, and hybrid approaches

---

## Hybrid Testing Strategy

### Philosophy: Test What Can Break

Our hybrid testing approach focuses on **meaningful testing** that actually prevents bugs, rather than testing implementation details or creating complex mocks that don't add value.

### Core Principles

#### 1. Extract Pure Functions for Unit Testing
```typescript
// ❌ AVOID: Testing complex DOM manipulation with mocks
describe("Complex DOM Integration Test", () => {
    it("should mock entire DOM and test nothing meaningful", () => {
        // Complex JSDOM setup that tests mock behavior, not real logic
    });
});

// ✅ PREFERRED: Extract pure functions and test them directly
describe("Validation Utilities", () => {
    it("should sanitize XSS input", () => {
        const maliciousInput = '<script>alert("xss")</script>Hello';
        const result = sanitizeInput(maliciousInput);
        expect(result).toBe("Hello");
        expect(result).not.toContain("<script>");
    });
    
    it("should validate return URLs against open redirect attacks", () => {
        expect(isValidReturnUrl("/dashboard", "https://example.com")).toBe(true);
        expect(isValidReturnUrl("//evil.com", "https://example.com")).toBe(false);
    });
});
```

#### 2. Test Security-Critical Logic
Focus testing on functions that handle security-sensitive operations:
- Input sanitization (XSS prevention)
- URL validation (open redirect prevention)  
- Authentication flows
- Password validation
- Error handling for different API response codes

```typescript
describe("Security-Critical Functions", () => {
    it("should prevent XSS in all input sanitization", () => {
        expect(sanitizeInput("javascript:alert('xss')")).toBe("alert('xss')");
        expect(sanitizeInput("<img src=x onerror=alert(1)>")).toBe("");
    });
    
    it("should validate email formats against injection", () => {
        const result = validateLoginForm("test@example.com", "password");
        expect(result.isValid).toBe(true);
        
        const maliciousResult = validateLoginForm("'; DROP TABLE users; --", "password");
        expect(maliciousResult.isValid).toBe(false);
    });
});
```

#### 3. Test API Client Logic
Extract API request logic into pure functions that can be easily tested:

```typescript
// Pure function for creating requests
export function createLoginRequest(email: string, password: string): RequestInit {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include" as RequestCredentials,
        body: JSON.stringify({ email, password })
    };
}

// Test the pure function
describe("API Client Utilities", () => {
    it("should create correct login request configuration", () => {
        const request = createLoginRequest("test@example.com", "password");
        
        expect(request.method).toBe("POST");
        expect(request.credentials).toBe("include");
        expect(JSON.parse(request.body as string)).toEqual({
            email: "test@example.com",
            password: "password"
        });
    });
});
```

#### 4. Avoid Testing Implementation Details
```typescript
// ❌ AVOID: Testing internal implementation
it("should call specific DOM methods in correct order", () => {
    const mockAddEventListener = vi.fn();
    document.addEventListener = mockAddEventListener;
    // Testing how code works, not what it accomplishes
});

// ✅ PREFERRED: Test behavior and outcomes
it("should display error when validation fails", () => {
    const result = validateLoginForm("", "");
    expect(result.isValid).toBe(false);
    expect(result.emailError).toContain("required");
    expect(result.passwordError).toContain("required");
});
```

### Implementation Strategy

#### Step 1: Identify Testable Logic
Ask: "What logic in this component could have bugs?"
- Input validation and sanitization
- API request construction
- Error handling for different scenarios
- Business rule validation
- Data transformations

#### Step 2: Extract Pure Functions
Move testable logic to utility modules:
```typescript
// src/utils/validation.ts
export function sanitizeInput(input: string): string { /* ... */ }
export function validateLoginForm(email: string, password: string): LoginValidationResult { /* ... */ }

// src/utils/api-client.ts  
export function createLoginRequest(email: string, password: string): RequestInit { /* ... */ }
export function handleApiResponse<T>(response: Response): Promise<T> { /* ... */ }
```

#### Step 3: Write Comprehensive Unit Tests
Test all edge cases and error scenarios:
```typescript
describe("sanitizeInput", () => {
    it("should remove script tags", () => { /* ... */ });
    it("should remove all HTML tags", () => { /* ... */ });
    it("should remove dangerous protocols", () => { /* ... */ });
    it("should handle empty and invalid inputs", () => { /* ... */ });
    it("should preserve normal text", () => { /* ... */ });
});
```

#### Step 4: Use Extracted Functions in Components
The original component becomes simpler and more maintainable:
```typescript
// Before: Complex inline validation logic
function validateLoginForm(): boolean {
    // 50+ lines of inline validation logic
}

// After: Clean component using tested utilities
function validateLoginForm(): boolean {
    if (!emailInput || !passwordInput) return false;
    
    const result = validateLoginFormUtil(emailInput.value, passwordInput.value);
    showValidationErrors(result);
    return result.isValid;
}
```

### Benefits of Hybrid Approach

#### ✅ **Meaningful Test Coverage**
- Tests catch real bugs in validation, sanitization, and API handling
- Security-critical functions are thoroughly tested
- Edge cases and error scenarios are covered

#### ✅ **Maintainable Test Suite**  
- Pure functions are easy to test and understand
- No complex mock setup or DOM simulation
- Tests remain stable as UI implementation changes

#### ✅ **Scalable Architecture**
- Utility functions can be reused across components
- Clear separation between UI logic and business logic
- ESLint compliance from the start

#### ✅ **Faster Development**
- Pure functions can be developed and tested in isolation
- No need for complex integration test setup
- Immediate feedback on logic correctness

### Testing Layer Responsibilities

#### 1️⃣ Utility Tests (`src/__tests__/utils/`)
**Purpose**: Test pure functions and business logic

✅ **Test**: Input validation, sanitization, API client functions, data transformations
❌ **Don't Test**: DOM manipulation, UI state, complex integration workflows

```typescript
describe("Validation Utilities", () => {
    it("should sanitize malicious input", () => {
        const result = sanitizeInput('<script>alert("xss")</script>Hello');
        expect(result).toBe("Hello");
    });
});
```

#### 2️⃣ API Tests (`src/__tests__/api/`)
**Purpose**: Route-specific concerns and transformations

✅ **Test**: Security transformations, route edge cases, request/response formatting  
❌ **Don't Test**: Business logic, utility functions, UI behavior

#### 3️⃣ Integration Tests (`src/__tests__/integration/`)
**Purpose**: End-to-end workflows and cross-feature testing

✅ **Test**: Complete workflows, cross-system integration, HTTP cycles
❌ **Don't Test**: Pure function logic, input validation details

#### 4️⃣ Frontend Tests (`src/__tests__/frontend/`)
**Purpose**: Light integration tests for critical UI workflows

✅ **Test**: Critical user flows, error display, form submission workflows
❌ **Don't Test**: Pure function logic (tested in utils), complex DOM simulation

### Example: Authentication UI Implementation

This demonstrates our hybrid approach in practice:

**Utility Functions (Heavily Tested)**:
```typescript
// 39 tests covering all edge cases
export function sanitizeInput(input: string): string;
export function validateLoginForm(email: string, password: string): LoginValidationResult;
export function isValidReturnUrl(url: string, origin: string): boolean;

// 18 tests covering API logic  
export function createLoginRequest(email: string, password: string): RequestInit;
export function handleApiResponse<T>(response: Response): Promise<T>;
export function makeLoginRequest(email: string, password: string): Promise<LoginResponse>;
```

**Component Implementation (Uses Tested Utilities)**:
```typescript
// Clean component that delegates to tested functions
async function performLogin(email: string, password: string): Promise<void> {
    try {
        const data = await makeLoginRequest(email, password);
        handleSuccessfulLogin(data);
    } catch (error) {
        handleLoginError(error);
    }
}
```

**Result**: 57 meaningful tests covering security, validation, and API logic with 100% ESLint compliance.

---

## Standards & Patterns

### Mock Integration

#### Standard Mock Setup
```typescript
// Standard database mock pattern
vi.mock("../../database/connection", () => ({
    pool: {
        query: vi.fn()
    }
}));

// Get mocked pool for testing
const mockPool = vi.mocked(pool);

// Helper functions for common scenarios
const mockSuccessfulQuery = (returnValue: any) => {
    const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
    mockPool.query.mockResolvedValue({ rows, rowCount: rows.length });
};
```

#### Type-Safe Mocks
```typescript
const mockUserModel = UserModel as {
    findAll: Mock;
    findById: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
};
```

### Test Data Factory

#### Factory Pattern
```typescript
export class TestDataFactory {
    static createTestUser(overrides: Partial<User> = {}): User {
        return {
            id: "test-user-" + Math.random().toString(36).substring(2, 11),
            email: "test@example.com",
            password_hash: "hashed_password_123",
            first_name: "Test",
            last_name: "User",
            role: "team_member" as UserRole,
            is_active: true,
            last_login_at: null,
            created_at: new Date("2024-01-01T00:00:00.000Z"),
            updated_at: new Date("2024-01-01T00:00:00.000Z"),
            ...overrides
        };
    }
}
```

### Assertion Helpers

#### Core Assertions
```typescript
export class AssertionHelpers {
    // Async error testing
    static async expectAsyncError(
        promise: Promise<any>,
        expectedMessage: string,
        context?: string
    ): Promise<void> {
        await expect(promise).rejects.toThrow(expectedMessage);
    }

    // Database call verification
    static expectDatabaseCall(
        mockQuery: Mock,
        expectedSql: string,
        expectedParams: any[]
    ): void {
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining(expectedSql),
            expectedParams
        );
    }
}
```

---

## Code Quality Standards

### ESLint Integration
ESLint is an integral part of the test suite and must pass for code to be considered complete:

```bash
# Complete TDD workflow with linting
npm test                    # Run tests (must pass)
npm run lint                # Check code quality (must pass)
npm run type-check          # Verify TypeScript safety (must pass)

# Combined quality check (recommended)
npm run test:quality        # Run tests + lint + format + type-check together
```

**ESLint Standards Enforced:**
- **Type Safety**: No `any` types without proper ESLint disable comments
- **Error Handling**: Consistent error patterns and null checking
- **Function Signatures**: Explicit return types required
- **Security**: No unsafe DOM access or global variable pollution
- **Consistency**: Consistent code formatting and naming conventions

### Test Structure (AAA Pattern)
```typescript
it("should create user with valid data", async () => {
    // ARRANGE
    const userData = TestDataFactory.createUserData();
    const expectedUser = TestDataFactory.createTestUser(userData);
    mockSuccessfulQuery(expectedUser);

    // ACT
    const result = await UserModel.create(userData);

    // ASSERT
    DomainAssertionHelpers.expectValidUser(result);
    expect(result.email).toBe(userData.email);
});
```

### Coverage Requirements
- **Unit Tests**: Every public method must have comprehensive test coverage
- **Error Cases**: Always test both success and failure scenarios
- **Edge Cases**: Test boundary conditions, null inputs, invalid data
- **Integration**: Test full workflows and cross-feature interactions

---

## Project Testing Implementation

### Testing Metrics

| Layer | Tests | Coverage Type |
|-------|-------|---------------|
| Utility Functions (Hybrid Approach) | 57 | Pure function testing |
| Working Days Calculator | 21 | Unit + Integration |
| Team Management | 142 | Unit + API + Integration |
| Calendar Entry Management | 100+ | Backend + Frontend + Integration |
| Authentication System | 57 | Hybrid (utilities + light integration) |
| Error Handling | 15+ | Specialized helpers across all layers |
| **Total** | **470+** | **100% passing** |

### Hybrid Testing Success Stories

#### Authentication UI (Task 1A Completed)
**Approach**: Extract pure functions → Test thoroughly → Use in components

**Results**:
- 39 validation utility tests (XSS prevention, email validation, return URL safety)
- 18 API client utility tests (request configuration, response handling, error scenarios)
- 100% ESLint compliance from the start
- Scalable foundation for registration, profile management, session handling

**Benefits Demonstrated**:
- Security-critical logic thoroughly tested
- Components became simpler and more maintainable
- No complex DOM mocking required
- Fast test execution with meaningful coverage

### VS Code Integration Setup

#### Required Extensions
- **Vitest Test Explorer** - Real-time test execution and results
- **Error Lens** - Inline error display
- **ESLint** - Code quality enforcement
- **TypeScript** - Language support

#### Configuration Files
```json
// .vscode/settings.json
{
    "vitest.enable": true,
    "vitest.commandLine": "npm run test",
    "vitest.exclude": ["**/node_modules/**", "**/dist/**"],
    "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

---

## Development Commands

### Essential Commands
```bash
# Core Testing
npm test                    # Run complete test suite (470+ tests)
npm run test:watch         # Run tests in watch mode
npm run test:quality       # Tests + lint + format + type-check (RECOMMENDED)

# Code Quality
npm run lint               # ESLint code quality check with automatic fixes
npm run type-check         # TypeScript type checking
npm run format             # Prettier code formatting with fixes

# Development
npm run dev                # Start dev server with test setup
npm run build              # Build TypeScript + copy static files + lint check
docker-compose up -d       # Start PostgreSQL test database
```

### Test Execution Patterns
```bash
# By Layer
npm test src/__tests__/utils/           # Utility function tests (hybrid approach)
npm test src/__tests__/models/         # Model layer tests (business logic)
npm test src/__tests__/api/            # API layer tests (routes/security)
npm test src/__tests__/integration/    # Integration tests (workflows)

# Specific Features
npm test src/__tests__/utils/validation.test.ts    # Input validation and sanitization
npm test src/__tests__/utils/api-client.test.ts    # API client utilities
```

---

## Maintenance & Migration

### Hybrid Testing Migration Guidelines

#### When Adding New Frontend Features
1. **Identify Testable Logic**: What functions could have bugs?
2. **Extract Pure Functions**: Move business logic to utility modules
3. **Write Comprehensive Unit Tests**: Test all edge cases and error scenarios
4. **Use ESLint Compliance**: Follow strict TypeScript standards from the start
5. **Keep Components Simple**: Delegate to tested utility functions

#### Migrating Existing Frontend Code
```typescript
// ❌ BEFORE: Complex component with inline logic
function handleFormSubmit(event: Event): void {
    // 50+ lines of validation, API calls, error handling
    // Difficult to test, prone to bugs
}

// ✅ AFTER: Clean component using tested utilities
function handleFormSubmit(event: Event): void {
    event.preventDefault();
    
    const formData = getFormData();
    if (!validateFormData(formData)) return;
    
    performApiRequest(formData)
        .then(handleSuccess)
        .catch(handleError);
}
```

### Benefits of Hybrid Approach
- **Faster Development**: Pure functions can be developed and tested in isolation
- **Better Security**: Security-critical functions are thoroughly tested
- **Easier Maintenance**: Clear separation between UI and business logic
- **Scalable Architecture**: Utility functions can be reused across components
- **ESLint Compliance**: Type-safe code from the start

### Summary

This comprehensive testing strategy ensures:

### **Quality Assurance**
- **Meaningful Testing**: Focus on logic that can have bugs, not implementation details
- **Security Focus**: Comprehensive testing of XSS prevention, input validation, API security
- **Type Safety**: 100% ESLint compliance with strict TypeScript standards
- **Error Handling**: Standardized error testing across all layers

### **Development Efficiency**
- **Hybrid Approach**: Extract pure functions for easy testing, keep components simple
- **TDD Process**: Test-first development with immediate feedback
- **Reusable Patterns**: Utility functions and assertion helpers for rapid development
- **Fast Execution**: Pure function tests run quickly without complex setup

### **Scalability & Maintenance**
- **Clean Architecture**: Clear separation between UI logic and business logic
- **Documented Patterns**: Complete standards for hybrid testing approach
- **Migration Guidelines**: Clear paths for upgrading existing code
- **Future-Proof**: Patterns that scale with application complexity

The hybrid testing approach provides the best balance of meaningful coverage, development speed, and maintainability while ensuring security and type safety throughout the application.