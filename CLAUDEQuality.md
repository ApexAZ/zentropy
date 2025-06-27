# Quality Standards and Testing Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Testing Architecture](#testing-architecture)
3. [Standards & Patterns](#standards--patterns)
4. [Code Quality Standards](#code-quality-standards)
5. [Project Testing Implementation](#project-testing-implementation)
6. [Development Commands](#development-commands)
7. [Maintenance & Migration](#maintenance--migration)

---

## Quick Start

### Essential Commands
```bash
npm test                    # Run all tests (214 tests)
npm run test:quality        # Tests + ESLint + TypeScript check
npm run lint                # Fix code quality issues
npm run type-check          # Verify TypeScript safety
```

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

### Three-Layer Strategy
- **Unit Tests**: Business logic and model validation
- **API Tests**: Route-specific behavior and transformations  
- **Integration Tests**: End-to-end workflows across all layers

### Layer Responsibilities

### 1️⃣ Model Tests (`src/__tests__/models/`)
**Purpose**: Business logic validation and data integrity

✅ **Test**: Business rules, data integrity, edge cases, domain logic  
❌ **Don't Test**: CRUD operations, database connections, API formatting

```typescript
describe("UserModel", () => {
    describe("business logic validation", () => {
        it("should validate user creation with all required fields", async () => {
            // Test business rules, not database operations
        });
    });
});
```

### 2️⃣ API Tests (`src/__tests__/api/`)
**Purpose**: Route-specific concerns and transformations

✅ **Test**: Security transformations, route edge cases, request/response formatting  
❌ **Don't Test**: End-to-end workflows, business logic, database operations

```typescript
describe("Users API - Route Layer Specifics", () => {
    describe("Security Transformations", () => {
        it("should strip password_hash from all user responses", async () => {
            // Test security-critical transformations
        });
    });
});
```

### 3️⃣ Integration Tests (`src/__tests__/integration/`)
**Purpose**: End-to-end workflows and cross-feature testing

✅ **Test**: Complete workflows, cross-system integration, HTTP cycles, error propagation

```typescript
describe("Calendar Workflow Integration Tests", () => {
    describe("Calendar Entry Lifecycle", () => {
        it("should complete full calendar entry workflow: create -> read -> update -> delete", async () => {
            // Test complete workflows
        });
    });
});
```

### 4️⃣ Frontend Tests (`src/__tests__/frontend/`)
**Purpose**: UI logic and browser-specific concerns

✅ **Test**: DOM safety, TypeScript safety, utility functions, browser simulation

```typescript
describe("Calendar Functions", () => {
    describe("Date filtering and validation", () => {
        it("should filter calendar entries by date range", () => {
            // Test pure utility functions
        });
    });
});
```

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

const mockEmptyQuery = () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
};

const mockFailedQuery = (error = new Error("Database connection failed")) => {
    mockPool.query.mockRejectedValue(error);
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

#### Interface Compliance
- Always match actual model interfaces
- Use proper TypeScript types
- Handle Date vs string serialization correctly

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

    // Date field validation (handles both Date objects and strings)
    static expectValidDateFields(entity: any): void {
        if (entity.created_at instanceof Date) {
            expect(entity.created_at).toBeInstanceOf(Date);
            expect(entity.updated_at).toBeInstanceOf(Date);
        } else {
            expect(entity.created_at).toEqual(expect.any(String));
            expect(entity.updated_at).toEqual(expect.any(String));
        }
    }
}
```

#### Domain Assertions
```typescript
export class DomainAssertionHelpers extends AssertionHelpers {
    static expectValidUser(user: any): void {
        this.expectHasProperties(user, [
            "id", "email", "first_name", "last_name", "role"
        ]);
        this.expectValidId(user.id);
        this.expectValidEmail(user.email);
        this.expectValidDateFields(user);
        
        // Validate role
        expect(["team_lead", "team_member"]).toContain(user.role);
    }
}
```

### Import Standards

#### Import Structure
```typescript
// Test framework imports first
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// External libraries
import request from "supertest";
import express from "express";

// Internal modules (relative paths)
import { UserModel } from "../../models/User";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers } from "../helpers/assertion-helpers";
```

#### Mock Imports
```typescript
// Mock before other imports
vi.mock("../../models/User", () => ({
    UserModel: {
        findAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    }
}));

// Import after mocking
import { UserModel } from "../../models/User";
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

### ESLint Error Resolution

#### Resolution Strategy
ESLint errors must be resolved as part of the TDD cycle, not bypassed:

```bash
# 1. NEVER override ESLint without understanding the issue
# ❌ WRONG: Adding eslint-disable comments to bypass errors
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

# 2. ALWAYS fix the underlying issue
# ✅ CORRECT: Replace unsafe any types with proper interfaces
interface ApiResponse<T> {
    data?: T;
    message?: string;
}
const response = await fetch('/api') as ApiResponse<User>;
```

#### Common Issues & Solutions

1. **Unsafe `any` Types**:
   ```typescript
   // ❌ WRONG: Bypassing type safety
   const data = response.json() as any;
   
   // ✅ CORRECT: Proper type definition
   interface ApiResponse { data: User[]; message: string; }
   const data = response.json() as ApiResponse;
   ```

2. **Global Window Assignments**:
   ```typescript
   // ❌ WRONG: Global pollution
   (window as any).myFunction = myFunction;
   
   // ✅ CORRECT: Event delegation
   document.addEventListener('click', (event) => {
       const target = event.target as HTMLElement;
       if (target.dataset.action === 'my-action') {
           myFunction();
       }
   });
   ```

3. **Missing Return Types**:
   ```typescript
   // ❌ WRONG: Implicit return type
   function processData(data) { 
       return data.map(item => item.id);
   }
   
   // ✅ CORRECT: Explicit return type
   function processData(data: DataItem[]): string[] {
       return data.map(item => item.id);
   }
   ```

#### Acceptable ESLint Disables
Only disable ESLint rules in these specific scenarios:

```typescript
// ✅ ACCEPTABLE: Error logging in catch blocks
catch (error) {
    // eslint-disable-next-line no-console
    console.error('Database operation failed:', error);
}

// ✅ ACCEPTABLE: Global functions for HTML onclick (with refactoring plan)
// TODO: Refactor to use event delegation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).legacyFunction = legacyFunction;

// ✅ ACCEPTABLE: Third-party library compatibility
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const chart = new LegacyChartLibrary(data);
```

**CRITICAL**: Each ESLint disable comment must include:
1. **Why** the disable is necessary
2. **When** it will be fixed (if temporary)
3. **What** the proper solution would be

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

### Anti-Redundancy Guidelines

### What NOT to Duplicate

| Layer | API Tests | Integration Tests | Frontend Tests |
|-------|-----------|-------------------|----------------|
| **API** | ❌ CRUD ops | ❌ Standard validation | ❌ HTTP testing |
| **Model** | ❌ Business logic | ❌ Data integrity | ❌ Domain rules |
| **Integration** | ❌ Database errors | ❌ Response format | ❌ E2E workflows |

### Layer-Specific Focus

| Layer | ✅ **Should Test** |
|-------|--------------------|
| **API** | Route transformations, security, request/response formatting, parameter validation |
| **Integration** | End-to-end workflows, cross-system interactions, real HTTP cycles, error propagation |
| **Model** | Business logic, domain rules, data integrity, complex calculations |

### Error Handling Standards

### Error Testing Patterns

#### Async Errors (Database, API)
```typescript
// ✅ PREFERRED: Use AssertionHelpers for consistency
await AssertionHelpers.expectAsyncError(
    UserModel.create(invalidData),
    "Database connection failed"
);

// ✅ SPECIALIZED: Use domain-specific helpers
await AssertionHelpers.expectDatabaseError(
    UserModel.create(invalidData),
    "user creation"
);

// ❌ AVOID: Direct expect patterns
await expect(UserModel.create(invalidData)).rejects.toThrow("error");
```

#### Sync Errors (Validation, Utils)
```typescript
// ✅ PREFERRED: Use standardized helper
AssertionHelpers.expectSyncError(
    () => validateEmail("invalid"),
    ValidationError,
    "email validation"
);

// ❌ AVOID: Inline expect patterns
expect(() => validateEmail("invalid")).toThrow(ValidationError);
```

#### API Error Responses
```typescript
// ✅ STANDARDIZED: Use API-specific helpers
AssertionHelpers.expectApiError(response, 400, "Validation failed");
AssertionHelpers.expectValidationErrorResponse(response, "email", "must be valid");
AssertionHelpers.expectConflictErrorResponse(response, "Email already in use");
AssertionHelpers.expectNotFoundErrorResponse(response, "User not found");
AssertionHelpers.expectServerErrorResponse(response, "Internal server error");

// ❌ AVOID: Manual response checking
expect(response.status).toBe(400);
expect(response.body.message).toBe("Validation failed");
```

#### Validation Errors
```typescript
// ✅ STRUCTURED: Use validation-specific helper
AssertionHelpers.expectValidationError(error, "fieldName", "error message");

// ✅ TYPE-SAFE: Use error type checking
AssertionHelpers.expectErrorType(error, ValidationError, "email validation");
```

### Common Error Scenarios

#### Mock Error Setup
```typescript
// ✅ CONSISTENT: Use common error factory
const commonErrors = MockSetupHelpers.getCommonErrors();
mockFunction.mockRejectedValue(commonErrors.database);

// ✅ CONTEXTUAL: Create specific errors
const dbError = commonErrors.createDatabaseError("user creation");
mockUserModel.create.mockRejectedValue(dbError);

// ✅ VALIDATION: Create field-specific errors
const validationError = commonErrors.createValidationError("email", "must be unique");
mockValidation.mockRejectedValue(validationError);
```

#### Error Message Standards
```typescript
// ✅ EXACT MATCHING: For critical business logic
await AssertionHelpers.expectAsyncError(operation(), "Database connection failed");

// ✅ PARTIAL MATCHING: For dynamic messages
await AssertionHelpers.expectAsyncErrorContaining(operation(), "validation failed");

// ✅ BUSINESS RULES: For domain logic
await AssertionHelpers.expectBusinessRuleError(operation(), "team cannot exceed 10 members");
```

### Quality Requirements

### Code Quality Requirements
- **Readability**: Self-documenting tests with clear intent
- **Debuggability**: Proper error messages and logging
- **Scalability**: Design for growth, avoid hardcoded limits
- **Maintainability**: SOLID principles, separation of concerns
- **Consistency**: Established patterns and naming conventions
- **Error Handling**: Standardized error testing patterns

### Naming Conventions
| Type | Convention | Example |
|------|------------|----------|
| **Test Files** | `feature-name.test.ts` | `user-model.test.ts` |
| **Test Suites** | Descriptive names | `"UserModel"`, `"Calendar API"` |
| **Test Cases** | Behavior descriptions | `"should create user with valid data"` |
| **Helpers** | Clear action names | `mockSuccessfulQuery`, `expectValidUser` |

### Type Safety Standards

### TypeScript Requirements

#### Avoid 'as any'
```typescript
// ❌ AVOID: Type assertions that bypass safety
const mockCalendarEntryModel = CalendarEntryModel as any;
const mockBcrypt = bcrypt as any;

// ✅ PREFERRED: Use proper type-safe mocking
const mockCalendarEntryModel = vi.mocked(CalendarEntryModel);
const mockBcrypt = vi.mocked(bcrypt);

// ✅ ALTERNATIVE: Use specific type definitions
const mockCalendarEntryModel = CalendarEntryModel as MockedCalendarEntryModel;
```

#### Error Type Handling
```typescript
// ❌ AVOID: Unsafe error handling
catch (error) {
    expect(error.message).toContain("expected");
}

// ✅ PREFERRED: Type-safe error handling
catch (error) {
    expect((error as Error).message).toContain("expected");
}

// ✅ BEST: Use error testing helpers
await AssertionHelpers.expectAsyncError(promise, "expected message");
```

#### Mock Type Definitions
```typescript
// ✅ REQUIRED: Define proper mock types
export type MockedUserModel = {
    findAll: Mock<[], Promise<User[]>>;
    findById: Mock<[string], Promise<User | null>>;
    create: Mock<[CreateUserData], Promise<User>>;
    update: Mock<[string, Partial<User>], Promise<User | null>>;
    delete: Mock<[string], Promise<boolean>>;
};

// ✅ USAGE: Apply mock types consistently
const mockUserModel = UserModel as MockedUserModel;
```

#### Test Data Type Safety
```typescript
// ✅ REQUIRED: Use TestDataFactory for all test data
const testUser = TestDataFactory.createTestUser({
    email: "test@example.com",
    role: "team_member" as UserRole  // Proper type casting
});

// ❌ AVOID: Manual object creation with missing properties
const testUser = {
    id: "user1",
    email: "test@example.com"
    // Missing required properties: password_hash, is_active, etc.
};
```

#### Generic Types
```typescript
// ✅ PREFERRED: Use generic types for query selectors
const elements = document.querySelectorAll<HTMLElement>('.error-message');

// ✅ PREFERRED: Type-safe array operations
const users: User[] = TestDataFactory.createMultipleTestUsers(3);
users.forEach((user: User) => {
    AssertionHelpers.expectValidUser(user);
});
```

#### DOM Type Safety
```typescript
// ✅ REQUIRED: Proper DOM element casting
const inputElement = document.getElementById('email') as HTMLInputElement;
const formElement = document.getElementById('form') as HTMLFormElement;

// ✅ REQUIRED: Handle null returns safely
const element = document.getElementById('optional') as HTMLElement | null;
if (element) {
    element.style.display = 'none';
}
```

### Interface Alignment

#### Model Compliance
```typescript
// ✅ REQUIRED: Test data must match actual interfaces
interface User {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    is_active: boolean;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

// ✅ CORRECT: Include ALL required properties
const testUser = TestDataFactory.createTestUser({
    // All properties are provided by factory with proper types
});
```

#### API Response Types
```typescript
// ✅ REQUIRED: Type API responses appropriately
interface ApiResponse<T> {
    data?: T;
    message?: string;
    errors?: ValidationError[];
}

// ✅ USAGE: Type-safe response validation
const response: ApiResponse<User> = await request(app).get('/api/users/1');
AssertionHelpers.expectValidUser(response.data);
```

### Advanced Error Handling Patterns

### **Specialized Error Testing Methods**

#### **Database Error Testing**
```typescript
// ✅ STANDARD: Use specialized database error helpers
await AssertionHelpers.expectDatabaseError(
    UserModel.create(userData),
    "user creation"  // Context for debugging
);

// ✅ FACTORY: Use error factory for consistency
const commonErrors = MockSetupHelpers.getCommonErrors();
mockUserModel.create.mockRejectedValue(
    commonErrors.createDatabaseError("user creation")
);
```

#### **Validation Error Testing**
```typescript
// ✅ STRUCTURED: Use validation-specific helpers
AssertionHelpers.expectValidationError(
    error,
    "email",           // Field name
    "must be unique"   // Expected message part
);

// ✅ API RESPONSE: Use API validation helpers
AssertionHelpers.expectValidationErrorResponse(
    response,
    "email",
    "already exists"
);
```

#### **Business Rule Error Testing**
```typescript
// ✅ DOMAIN: Use business rule helpers
await AssertionHelpers.expectBusinessRuleError(
    TeamModel.addMember(teamId, userId),
    "team cannot exceed 10 members"
);

// ✅ FACTORY: Create contextual business errors
const businessError = commonErrors.createBusinessRuleError(
    "maximum sprint length is 28 days"
);
```

#### **Security Error Testing**
```typescript
// ✅ SECURITY: Use security-specific helpers
await AssertionHelpers.expectSecurityError(
    UserModel.findById(maliciousId),
    "unauthorized access attempt"
);

// ✅ RESPONSE: Test security response patterns
AssertionHelpers.expectSecurityError(
    unauthorizedRequest(),
    "insufficient permissions"
);
```

### **Error Message Consistency Standards**

#### **Message Format Standards**
```typescript
// ✅ DATABASE ERRORS: Consistent format
"Database connection failed during {operation}"
"Database query failed: {specific_error}"

// ✅ VALIDATION ERRORS: Field-specific format
"Validation failed: {field} {reason}"
"Invalid {field}: {specific_reason}"

// ✅ BUSINESS RULE ERRORS: Rule-specific format
"Business rule violation: {specific_rule}"
"Operation not allowed: {reason}"

// ✅ SECURITY ERRORS: Context-specific format
"Security violation: {context}"
"Unauthorized access: {attempted_action}"
```

#### **Error Context Requirements**
```typescript
// ✅ REQUIRED: Always provide context for database errors
const contextualError = commonErrors.createDatabaseError("user creation");
const specificError = commonErrors.createValidationError("email", "must be unique");
const businessError = commonErrors.createBusinessRuleError("team size limit exceeded");

// ✅ USAGE: Context appears in error messages for debugging
// Error: "Database connection failed during user creation"
// Error: "Validation failed: email must be unique"  
// Error: "Business rule violation: team size limit exceeded"
```

### **Mock Error Setup Standards**

#### **Consistent Error Scenarios**
```typescript
// ✅ STANDARD: Use common error scenarios
const testEnv = MockSetupHelpers.setupCompleteTestEnvironment();
const commonErrors = MockSetupHelpers.getCommonErrors();

// ✅ DATABASE: Setup database errors consistently
testEnv.database.helpers.mockFailedQuery(commonErrors.database);

// ✅ MODELS: Setup model errors with context
mockUserModel.create.mockRejectedValue(
    commonErrors.createDatabaseError("user creation")
);

// ✅ VALIDATION: Setup validation errors with field context
mockValidation.mockRejectedValue(
    commonErrors.createValidationError("email", "format invalid")
);
```

#### **Error Testing Coverage Requirements**
```typescript
// ✅ REQUIRED: Test all error scenarios for each operation
describe("UserModel.create", () => {
    it("should handle database connection failures", async () => {
        await AssertionHelpers.expectDatabaseError(/* ... */);
    });

    it("should handle validation failures", async () => {
        AssertionHelpers.expectValidationError(/* ... */);
    });

    it("should handle business rule violations", async () => {
        await AssertionHelpers.expectBusinessRuleError(/* ... */);
    });

    it("should handle duplicate key conflicts", async () => {
        await AssertionHelpers.expectAsyncError(/* ... */);
    });
});
```

### **Type Safety Migration Guidelines**

#### **Migrating from 'as any' Patterns**
```typescript
// ❌ OLD PATTERN: Unsafe type assertions
const mockModel = SomeModel as any;
const mockResponse = response as any;

// ✅ NEW PATTERN: Type-safe alternatives
const mockModel = vi.mocked(SomeModel);
const mockResponse = response as ApiResponse<ExpectedType>;

// ✅ ALTERNATIVE: Use proper type definitions
const mockModel = SomeModel as MockedSomeModel;
```

#### **Error Handling Migration**
```typescript
// ❌ OLD PATTERN: Inconsistent error testing
try {
    await operation();
    fail("Should have thrown");
} catch (error) {
    expect(error.message).toBe("some error");
}

// ✅ NEW PATTERN: Standardized error testing
await AssertionHelpers.expectAsyncError(
    operation(),
    "some error"
);
```

---

## Project Testing Implementation

### Setup and Configuration

### **Initial TDD Framework Validation**
```bash
# Baseline validation that established TDD workflow
npm test  # Should show 3 passing tests (add, subtract, multiply)
```

**Foundation Tests Created:**
- `calculator.test.js` with 3 passing tests to validate TDD framework
- `calculator.js` with basic math functions for validation
- Confirmed VS Code Test Explorer integration working in WSL

### **VS Code Integration Setup**

#### **Required Extensions**
- **Vitest Test Explorer** - Real-time test execution and results
- **Error Lens** - Inline error display
- **ESLint** - Code quality enforcement
- **TypeScript** - Language support
- **Thunder Client** - API testing (optional)

#### **Configuration Files**
**`.vscode/settings.json`:**
```json
{
    "vitest.enable": true,
    "vitest.commandLine": "npm run test",
    "vitest.exclude": ["**/node_modules/**", "**/dist/**"],
    "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom', // For frontend tests
        globals: true,
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist'],
        // Parallel execution for performance
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: false,
            },
        },
    }
});
```

**Vitest Test Execution Features**:
- **Parallel Execution**: Tests run in parallel threads for performance
- **JSDOM Environment**: Simulates browser environment for frontend tests
- **TypeScript Support**: Direct TypeScript test execution without compilation
- **Watch Mode**: Real-time test execution during development
- **Mock System**: Built-in vi.mock() for dependency mocking

#### **WSL-Specific Considerations**
- Extensions must be installed separately in WSL vs Windows environment
- Test Explorer appears in VS Code Activity Bar after proper configuration
- File path mapping works correctly with src/ and __tests__/ directories

### **Database Testing Environment**

#### **Docker PostgreSQL Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: capacity_planner_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
    volumes:
      - ./src/database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

#### **Environment Configuration**
**`.env.example`:**
```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/capacity_planner_test
PORT=3000
```

**Test-specific environment setup:**
```typescript
// In test files
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/capacity_planner_test';
```

### **Static File Management in Tests**

#### **Build Process Integration**
```bash
# Development commands that handle static files
npm run build      # TypeScript compilation + static file copy
npm run dev        # Development server with static file setup
npm run dev:copy   # Manual static file copy when needed
npm run check-static  # Verify/restore static files
```

#### **File Structure for Testing**
```
src/public/          → dist/public/
├── calendar.html    → ├── calendar.html
├── styles.css       → ├── styles.css
└── team-configuration.html → └── team-configuration.html
```

**Important:** TypeScript compiler clears `dist/` directory on full builds, so static files are automatically restored via build scripts.

## Environment Configuration

### **Complete Development Environment Setup**

#### **Database Setup**
```bash
# 1. Start PostgreSQL container
docker-compose up -d

# 2. Verify database connection
curl http://localhost:3000/health

# 3. Check database initialization
# Database schema automatically loaded from src/database/init.sql
```

**Database Test Configuration**:
```yaml
# docker-compose.yml test database
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: capacity_planner_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
```

**Test Database Features**:
- Automatic schema initialization from `src/database/init.sql`
- Connection pooling with proper cleanup between tests
- Isolated test transactions for data consistency
- Full CRUD operation testing with real PostgreSQL constraints

#### **Development Server Setup**
```bash
# Complete development workflow
npm install                    # Install dependencies
npm run build                 # Build TypeScript + copy static files
npm run dev                   # Start development server
npm test                      # Run test suite
```

#### **Health Check Endpoints**
```bash
# Verify all systems operational
curl http://localhost:3000/health                    # Server health
curl http://localhost:3000/teams.html               # Teams page
curl http://localhost:3000/calendar.html            # Calendar page
```

### **Test Environment Variables**
```typescript
// Complete test environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/capacity_planner_test';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'silent'; // Reduce test noise
```

### Capacity Planning Domain Testing

### **Sprint Capacity Planning Test Context**
**Business Domain**: Sprint Capacity Planning Tool for agile teams
- **Target Users**: Team Leads and Team Members in agile development teams  
- **Core Functionality**: Automated sprint capacity calculation based on team velocity and calendar availability
- **Phase 1 MVP**: Basic team management, calendar system, and capacity calculation
- **Phase 2**: Advanced features including React migration, multi-team support, and Azure deployment

**Key Business Rules to Test**:
- Team velocity baseline validation (must be > 0)
- Sprint length validation (must be > 0 days)
- Working days per week configuration (team-specific)
- PTO/holiday impact on sprint capacity
- Real-time capacity calculation updates
- Multi-team calendar coordination (future)

### **Working Days Calculator Testing**
**Business Logic Coverage (21 comprehensive tests):**
```typescript
describe("WorkingDaysCalculator", () => {
    // Core business rules
    it("should calculate working days excluding weekends", () => {
        // Monday to Friday = 5 working days
    });
    
    it("should exclude configured holidays", () => {
        // Handle holiday exclusions with date validation
    });
    
    it("should handle cross-month date ranges", () => {
        // Boundary testing for month transitions
    });
    
    // Integration with team data
    it("should integrate with team working days configuration", () => {
        // Use team.working_days_per_week setting
    });
});
```

**Key Testing Patterns:**
- Date range boundary validation
- Holiday and weekend exclusion logic
- Team configuration integration
- Business rule enforcement (working days per week)

### **Capacity Planning Business Logic Testing**

**Core Business Logic (21 Tests)**:
```typescript
describe("Capacity Planning Business Rules", () => {
    it("should calculate team capacity based on velocity and availability", () => {
        // velocity_baseline * working_days_available / sprint_length_days
    });
    
    it("should account for PTO impact on individual capacity", () => {
        // Reduce individual capacity when PTO overlaps sprint dates
    });
    
    it("should handle team working days configuration", () => {
        // Use team.working_days_per_week for capacity calculations
    });
    
    it("should validate sprint length boundaries", () => {
        // Sprint length must be between 1-28 days (business rule)
    });
});
```

**Key Testing Patterns for Capacity Planning**:
- Team velocity integration with calendar availability
- Sprint date range validation and boundary testing  
- Holiday and PTO exclusion from capacity calculations
- Cross-team capacity coordination (future feature)
- Real-time capacity updates when calendar entries change

### **Calendar Entry Business Logic Testing**
**Capacity Impact Calculation**:
```typescript
describe("Calendar Entry Capacity Impact", () => {
    it("should calculate capacity reduction for PTO entries", () => {
        // PTO days / total sprint days = capacity reduction percentage
    });
    
    it("should handle overlapping calendar entries", () => {
        // Detect conflicts between team member calendar entries
    });
    
    it("should update team capacity in real-time", () => {
        // Calendar changes immediately reflect in capacity calculations
    });
});
```

### **Team Management Testing**
**Comprehensive Coverage (142 tests across all layers):**

**Model Layer Tests:**
```typescript
describe("TeamModel", () => {
    it("should validate team creation with business rules", () => {
        // velocity_baseline > 0, sprint_length_days > 0, etc.
    });
    
    it("should handle team membership operations", () => {
        // Add/remove members with role validation
    });
});
```

**API Layer Tests:**
```typescript
describe("Teams API", () => {
    it("should handle team CRUD operations", () => {
        // RESTful API endpoint testing
    });
    
    it("should validate team member capacity calculations", () => {
        // Integration with calendar and working days
    });
});
```

**Integration Layer Tests:**
```typescript
describe("Team Workflow Integration", () => {
    it("should complete team creation to capacity calculation workflow", () => {
        // End-to-end team management workflow
    });
});
```

### **Calendar Integration Testing**
**Full Stack Coverage (100+ tests added):**

**Calendar Entry Validation:**
```typescript
describe("CalendarEntry", () => {
    it("should detect PTO conflicts for team members", () => {
        // Business rule: overlapping PTO detection
    });
    
    it("should calculate capacity impact on sprint planning", () => {
        // Integration with working days calculator
    });
    
    it("should handle different entry types", () => {
        // PTO, holiday, sick, personal time validation
    });
});
```

**Real-time Capacity Updates:**
```typescript
describe("Capacity Impact Calculation", () => {
    it("should update team capacity when calendar entries change", () => {
        // Live capacity calculation testing
    });
    
    it("should handle cross-team calendar interactions", () => {
        // Multi-team calendar coordination
    });
});
```

### **Vertical Slice Testing Architecture**

Following **INVEST Principles**, each feature must include:

#### **Independent Testing**
- Each slice tested in isolation
- No dependencies on incomplete features
- Self-contained test scenarios

#### **Valuable Testing**
- Tests cover complete user workflows
- End-to-end functionality validation
- Real business scenario testing

#### **Complete Stack Testing**
```typescript
// Example: Calendar Entry Vertical Slice
describe("Calendar Entry Management (Vertical Slice)", () => {
    describe("Database Layer", () => {
        // Model CRUD operations, business rules
    });
    
    describe("API Layer", () => {
        // Route handling, validation, security
    });
    
    describe("Frontend Layer", () => {
        // UI logic, form validation, DOM manipulation
    });
    
    describe("Integration Layer", () => {
        // Complete workflow from UI to database
    });
});
```

### Testing Evolution and Achievements

### **Project Testing Milestones**

#### **Phase 1: Foundation (Completed)**
```bash
# Initial TDD validation
✅ Basic calculator app: 3 passing tests
✅ VS Code Test Explorer: Working in WSL
✅ Vitest configuration: Complete
✅ Test command: `npm test` operational
```

#### **Phase 2: Core Features (Completed)**
```bash
# Working Days Calculator
✅ Business logic: 21 comprehensive tests
✅ Date validation: Boundary and edge cases
✅ Holiday handling: Configurable exclusions
✅ Team integration: Working days per week

# Team Management  
✅ Full CRUD: 142 tests (Unit + Integration + API)
✅ Role validation: Team lead vs team member
✅ Member capacity: Integration with calendar
✅ API security: Password handling, validation
```

#### **Phase 3: Calendar Implementation (Completed)**
```bash
# TDD Compliance Restoration
✅ Calendar tests: 100+ tests added
✅ Full coverage: Backend + Frontend + Integration
✅ Error scenarios: Database, validation, edge cases
✅ Security testing: XSS prevention, input validation
```

#### **Phase 4: Test Optimization (Completed)**
```bash
# Test Suite Streamlining
✅ Reduced redundancy: 288 → 214 tests (26% reduction)
✅ Eliminated overlap: Removed duplicate test files
✅ Enhanced patterns: 15+ specialized error helpers
✅ Type safety: Removed all 'as any' usage
```

### **Test Coverage by Feature**

| Feature | Tests | Coverage Type |
|---------|-------|---------------|
| Working Days Calculator | 21 | Unit + Integration |
| Team Management | 142 | Unit + API + Integration |
| Calendar Entry Management | 100+ | Backend + Frontend + Integration |
| Static File Management | 15+ | Integration + Build Process |
| Error Handling | 15+ | Specialized helpers across all layers |
| **Total** | **214** | **100% passing** |

### **Test Suite Evolution Metrics**
**Optimization History**:
- **Initial State**: 288 tests (included redundancy and obsolete tests)
- **Streamlined State**: 214 tests (26% reduction while maintaining coverage)
- **Quality Improvement**: Eliminated duplicate test files and overlapping coverage
- **Type Safety**: Removed all 'as any' usage patterns from test code
- **Error Handling**: Standardized with 15+ specialized error testing helpers

### **Quality Improvements Achieved**

#### **TDD Compliance**
- **MANDATORY**: All features now have tests written BEFORE implementation
- **STRICTLY ENFORCED**: Red-Green-Refactor workflow
- **NON-NEGOTIABLE**: Quality standards maintained

#### **Error Handling Standardization**
- Database error testing with context
- Validation error testing with field specificity  
- Security error testing with threat context
- Business rule error testing with domain rules

#### **Type Safety Enhancement**
- Eliminated all 'as any' usage patterns
- Proper mock type definitions
- Interface compliance for test data
- DOM type safety for frontend tests

### Performance Guidelines

### **Test Execution Optimization**
- **Parallel Execution**: Use Vitest's parallel capabilities
- **Mock External Dependencies**: Never hit real databases or APIs in tests
- **Efficient Test Data**: Use minimal data sets for testing
- **Cleanup**: Proper cleanup between tests to prevent interference

### **CI/CD Integration**
- Tests must pass before merging
- Coverage reporting for visibility
- Performance benchmarks to detect regressions
- Automated test execution on all changes

### Architecture-Specific Testing Patterns

### **Express API Testing**
```typescript
// RESTful API endpoint testing patterns
describe("API Endpoints", () => {
    const app = express();
    app.use(express.json());
    app.use("/api/users", usersRouter);
    
    it("should handle JSON API requests", async () => {
        const response = await request(app)
            .post("/api/users")
            .send(userData)
            .expect(201);
            
        AssertionHelpers.expectUserResponse(response.body, expectedUser);
    });
});
```

### **PostgreSQL Integration Testing**
```typescript
// Database integration patterns
describe("Database Integration", () => {
    beforeAll(async () => {
        // Start Docker container if not running
        await exec("docker-compose up -d postgres");
    });
    
    it("should handle database operations", async () => {
        // Test with real database connection
        const user = await UserModel.create(userData);
        expect(user.id).toBeDefined();
    });
    
    afterAll(async () => {
        // Cleanup test data
        await pool.query("TRUNCATE users CASCADE");
    });
});
```

### **Static File Testing**
```typescript
// Static file availability testing
describe("Static Files", () => {
    it("should serve HTML files correctly", async () => {
        const response = await request(app)
            .get("/calendar.html")
            .expect(200)
            .expect("Content-Type", /html/);
            
        expect(response.text).toContain("Team Calendar");
    });
    
    it("should handle file copying during build", () => {
        // Verify static files exist after build
        expect(fs.existsSync("dist/public/calendar.html")).toBe(true);
        expect(fs.existsSync("dist/public/styles.css")).toBe(true);
    });
});
```

### **TypeScript Compilation Testing**
```typescript
// Build process integration testing
describe("TypeScript Build Process", () => {
    it("should compile TypeScript without errors", async () => {
        const result = await exec("npx tsc --noEmit");
        expect(result.stderr).toBe("");
    });
    
    it("should preserve static files after compilation", async () => {
        await exec("npm run build");
        expect(fs.existsSync("dist/public/calendar.html")).toBe(true);
    });
});
```

---

## Development Commands

### Essential Commands
```bash
# Core Testing
npm test                    # Run complete test suite (214 tests)
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

# Health Checks
curl http://localhost:3000/health           # Server health check
curl http://localhost:3000/teams.html       # Teams page availability
curl http://localhost:3000/calendar.html    # Calendar page availability
```

### Test Execution Patterns
```bash
# By Layer
npm test src/__tests__/models/         # Model layer tests (business logic)
npm test src/__tests__/api/            # API layer tests (routes/security)
npm test src/__tests__/integration/    # Integration tests (workflows)

# Specific Files
npm test src/__tests__/services/working-days-calculator.test.ts  # Core business logic (21 tests)
npm test src/__tests__/models/Team.test.ts                       # Team management logic

# Debug Options
npm test -- --reporter=verbose --bail
npm test -- --grep="specific test name"
```

### Development Workflow
```bash
# Complete Cycle
1. docker-compose up -d && npm run build && npm test && npm run dev
2. curl http://localhost:3000/health      # Verify server health

# Before Committing
npm run test:quality                      # Tests + lint + type-check (RECOMMENDED)
# OR step by step:
npm test && npm run lint && npm run type-check

# Troubleshooting
npm run check-static       # Fix missing static files
docker-compose restart     # Restart database if connection issues
npm test -- --verbose      # Detailed test output for debugging
```

---

## Maintenance & Migration

### Maintenance Practices

### **Regular Test Maintenance**
- **Review Coverage**: Regularly audit test coverage and identify gaps
- **Refactor Tests**: Update tests when business logic changes
- **Remove Obsolete**: Delete tests for removed features
- **Update Patterns**: Keep test patterns consistent with latest standards

### **Documentation Updates**
- Update this document when introducing new patterns
- Document any deviations from standards with justification
- Maintain examples that reflect current codebase state

### Migration Guidelines

### **When Adding New Features**
1. **Write Tests First**: Follow TDD process strictly
2. **Choose Correct Layer**: Place tests in appropriate layer
3. **Use Established Patterns**: Follow existing test patterns
4. **Update Factories**: Add new test data factory methods as needed

### **When Refactoring Existing Code**
1. **Maintain Test Coverage**: Ensure all tests continue to pass
2. **Update Test Data**: Modify factories to match new interfaces
3. **Preserve Test Intent**: Keep test behavior even if implementation changes
4. **Document Changes**: Update relevant documentation

### Tools and Configuration

### **Required Dependencies**
```json
{
  "devDependencies": {
    "vitest": "^3.2.4",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12",
    "jsdom": "^22.1.0"
  }
}
```

### **VS Code Integration**
```json
{
  "settings": {
    "vitest.enable": true,
    "vitest.commandLine": "npm run test"
  }
}
```

### **Test Explorer Configuration**
- Vitest Test Explorer enabled in VS Code
- Real-time test execution and results
- Integrated debugging capabilities

---

### ESLint Integration Results

### **Successful Integration Achieved**
ESLint is now fully integrated into the test suite workflow:

```bash
# Complete quality check now available
npm run test:quality    # Tests: ✅ 214/214 passing, ESLint: 54 issues to resolve
```

**Integration Benefits:**
- **Catches Quality Issues**: ESLint runs after tests to catch code quality problems
- **Prevents Technical Debt**: Type safety and security issues are flagged immediately  
- **Enforces Standards**: Consistent code patterns and best practices
- **Blocks Unsafe Code**: No more `any` types or global pollution without proper justification

**Current Status:** All tests pass ✅, ESLint integration working ✅, 54 code quality issues identified for resolution following TDD principles.

### **Example Refactoring Success**
The window global assignment refactoring demonstrates the value of not overriding ESLint:

```typescript
// ❌ OLD: Technical debt with ESLint overrides
/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).editEntry = editEntry;

// ✅ NEW: Proper event delegation pattern
document.addEventListener('click', (event: Event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.action === 'edit-entry') {
        editEntry(target.dataset.entryId || '');
    }
});
```

**Result:** Eliminated type safety issues, improved security, maintained functionality, all tests still pass.

### Summary

This comprehensive test plan ensures:

### **Quality Assurance**
- **Consistent Quality**: All tests follow the same high standards with standardized patterns
- **Type Safety**: Comprehensive TypeScript safety with zero 'as any' usage
- **Error Handling**: Standardized error testing across all layers with specialized helpers
- **Maintainable Architecture**: Clear separation of concerns with proper abstraction

### **Development Efficiency**
- **TDD Process**: Test-first development with comprehensive coverage requirements
- **Minimal Redundancy**: Streamlined test suite (214 tests) with focused responsibilities
- **Reusable Patterns**: AssertionHelpers and MockSetupHelpers for consistent testing
- **Quick Setup**: Factory patterns and helper utilities for rapid test development

### **Scalability & Maintenance**
- **Scalable Structure**: Patterns that grow with the codebase using established conventions
- **Documentation**: Complete standards documentation for future development
- **Industry Best Practices**: Follows established testing principles and TypeScript guidelines
- **Migration Guidelines**: Clear paths for upgrading legacy test patterns

### **Technical Standards Implemented**
- **15+ Specialized Error Testing Methods**: Database, validation, security, business rule errors
- **Type-Safe Mock Definitions**: Comprehensive mock types for all models and utilities
- **Error Message Consistency**: Standardized error formats with contextual information
- **Interface Compliance**: Test data factories aligned with actual model interfaces
- **DOM Type Safety**: Proper element casting and null handling for frontend tests

### **Future Development Guidelines**
1. **Always use TestDataFactory** for creating test data to ensure type safety
2. **Always use AssertionHelpers** for error testing to maintain consistency
3. **Never use 'as any'** - use proper type definitions or vi.mocked() instead
4. **Always provide context** for error testing to aid in debugging
5. **Follow the testing pyramid** - many unit tests, some API tests, few integration tests
6. **Document new patterns** when introducing testing approaches not covered here
7. **Reference this document** for all testing decisions and implementation approaches
8. **Update this document** when new patterns or standards are established

### **Document Completeness**
This TEST-PLAN.md now contains **complete testing knowledge** from the project, including:
- ✅ All testing patterns and standards from CLAUDE.md
- ✅ Project-specific setup and configuration procedures
- ✅ Domain-specific testing approaches for capacity planning
- ✅ Complete development command reference and workflow
- ✅ Architecture-specific testing patterns
- ✅ Testing evolution history and achievements
- ✅ Type safety and error handling standards
- ✅ VS Code integration and tool setup
- ✅ Database and infrastructure testing patterns

**No additional testing information** exists in CLAUDE.md that is not covered in this comprehensive guide.

By following these guidelines, the test suite will remain robust, maintainable, type-safe, and valuable throughout the project's lifecycle. This document serves as the **single source of truth** for all testing approaches, standards, and practices for the Capacity Planner project.