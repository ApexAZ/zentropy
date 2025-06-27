# Test Plan and Best Practices Guide

## Overview

This document outlines the comprehensive testing strategy, patterns, and best practices developed for the Capacity Planner project. It serves as the definitive guide for maintaining consistent, high-quality testing across all development phases.

## Testing Philosophy

### Core Principles
- **Test-Driven Development (TDD)**: Always write tests before implementation
- **Layer Separation**: Each test layer has distinct, non-overlapping responsibilities
- **Quality Over Quantity**: Focus on meaningful tests rather than coverage metrics
- **Maintainability**: Tests should be self-documenting and easy to update
- **Industry Standards**: Follow established testing pyramid principles

### Testing Pyramid Structure
```
    /\
   /UI\      ← Few E2E/Integration Tests (Expensive, Slow)
  /____\
 /  API \     ← Some API/Route Tests (Medium Cost, Medium Speed)  
/__UNIT__\    ← Many Unit Tests (Cheap, Fast)
```

## Test Architecture

### Layer Responsibilities

#### **1. Model Tests** (`src/__tests__/models/`)
**Purpose**: Business logic validation and data integrity
**Focus Areas**:
- Business rule validation
- Data model integrity
- Edge case handling
- Domain-specific logic

**What NOT to test**:
- Basic CRUD operations (covered by integration tests)
- Database connection issues (mocked)
- API request/response formatting

**Example Pattern**:
```typescript
describe("UserModel", () => {
    describe("business logic validation", () => {
        it("should validate user creation with all required fields", async () => {
            // Test business rules, not database operations
        });
    });
});
```

#### **2. API Tests** (`src/__tests__/api/`)
**Purpose**: Route-specific concerns and transformations
**Focus Areas**:
- Security transformations (password hashing/stripping)
- Route-specific edge cases
- Request/response formatting
- Model interaction specifics

**What NOT to test**:
- End-to-end workflows (use integration tests)
- Business logic (use model tests)
- Database operations (mocked)

**Example Pattern**:
```typescript
describe("Users API - Route Layer Specifics", () => {
    describe("Security Transformations", () => {
        it("should strip password_hash from all user responses", async () => {
            // Test security-critical transformations
        });
    });
});
```

#### **3. Integration Tests** (`src/__tests__/integration/`)
**Purpose**: End-to-end workflows and cross-feature testing
**Focus Areas**:
- Complete user workflows
- Cross-system integration
- Real HTTP request cycles
- Error handling across layers

**Example Pattern**:
```typescript
describe("Calendar Workflow Integration Tests", () => {
    describe("Calendar Entry Lifecycle", () => {
        it("should complete full calendar entry workflow: create -> read -> update -> delete", async () => {
            // Test complete workflows
        });
    });
});
```

#### **4. Frontend Tests** (`src/__tests__/frontend/`)
**Purpose**: UI logic and browser-specific concerns
**Focus Areas**:
- DOM manipulation safety
- TypeScript type safety
- Utility function logic
- Browser environment simulation

**Example Pattern**:
```typescript
describe("Calendar Functions", () => {
    describe("Date filtering and validation", () => {
        it("should filter calendar entries by date range", () => {
            // Test pure utility functions
        });
    });
});
```

## Testing Standards and Patterns

### **Mock Integration Standards**

#### **Consistent Mock Setup**
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

#### **Type-Safe Mock Definitions**
```typescript
const mockUserModel = UserModel as {
    findAll: Mock;
    findById: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
};
```

### **Test Data Factory Pattern**

#### **Centralized Test Data Creation**
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

#### **Interface Alignment**
- Always match actual model interfaces
- Use proper TypeScript types
- Handle Date vs string serialization correctly

### **Assertion Helper Standards**

#### **Standardized Assertion Patterns**
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

#### **Domain-Specific Assertions**
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

### **Import Pattern Standards**

#### **Consistent Import Structure**
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

#### **Mock Import Pattern**
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

## TDD Workflow Standards

### **Mandatory TDD Process**
1. **Red**: Write a failing test that describes the desired functionality
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: Continue cycle for each small increment

### **Test Structure (Arrange-Act-Assert)**
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

### **Test Coverage Requirements**
- **Unit Tests**: Every public method must have comprehensive test coverage
- **Error Cases**: Always test both success and failure scenarios
- **Edge Cases**: Test boundary conditions, null inputs, invalid data
- **Integration**: Test full workflows and cross-feature interactions

## Anti-Redundancy Guidelines

### **What NOT to Duplicate**

#### **Between API and Integration Tests**
- ❌ Basic CRUD operations
- ❌ Standard validation scenarios
- ❌ Database error handling
- ❌ Response format testing

#### **Between Model and API Tests**
- ❌ Business logic validation
- ❌ Data integrity checks
- ❌ Domain rule enforcement

#### **Between Integration and Frontend Tests**
- ❌ HTTP request/response testing
- ❌ End-to-end workflow validation

### **Layer-Specific Focus Areas**

#### **API Tests Should Focus On**
- ✅ Route-specific transformations
- ✅ Security concerns (password handling)
- ✅ Request/response formatting
- ✅ Route parameter validation

#### **Integration Tests Should Focus On**
- ✅ End-to-end workflows
- ✅ Cross-system interactions
- ✅ Real HTTP request cycles
- ✅ Error propagation across layers

#### **Model Tests Should Focus On**
- ✅ Business logic validation
- ✅ Domain rule enforcement
- ✅ Data model integrity
- ✅ Complex calculations

## Error Handling Standards

### **Standardized Error Testing Patterns**

#### **Async Error Testing** (Database, API calls):
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

#### **Sync Error Testing** (Validation, utilities):
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

#### **API Error Response Testing**:
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

#### **Validation Error Testing**:
```typescript
// ✅ STRUCTURED: Use validation-specific helper
AssertionHelpers.expectValidationError(error, "fieldName", "error message");

// ✅ TYPE-SAFE: Use error type checking
AssertionHelpers.expectErrorType(error, ValidationError, "email validation");
```

### **Common Error Scenarios**

#### **Mock Error Setup**:
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

#### **Error Message Standards**:
```typescript
// ✅ EXACT MATCHING: For critical business logic
await AssertionHelpers.expectAsyncError(operation(), "Database connection failed");

// ✅ PARTIAL MATCHING: For dynamic messages
await AssertionHelpers.expectAsyncErrorContaining(operation(), "validation failed");

// ✅ BUSINESS RULES: For domain logic
await AssertionHelpers.expectBusinessRuleError(operation(), "team cannot exceed 10 members");
```

## Quality Standards

### **Code Quality Requirements**
- **Readability**: Tests must be self-documenting with clear intent
- **Debuggability**: Include proper error messages and logging
- **Scalability**: Design for growth - avoid hardcoded limits
- **Maintainability**: Follow SOLID principles and separation of concerns
- **Consistency**: Adhere to established patterns and naming conventions
- **Error Handling**: Use standardized error testing patterns for all scenarios

### **Naming Conventions**
- **Test Files**: `feature-name.test.ts`
- **Test Suites**: Descriptive feature names (`"UserModel"`, `"Calendar API"`)
- **Test Cases**: Behavior-driven descriptions (`"should create user with valid data"`)
- **Helper Functions**: Clear action names (`mockSuccessfulQuery`, `expectValidUser`)

### **Error Handling Standards**
- All database operations wrapped in try-catch blocks
- Descriptive error messages with context
- Consistent error propagation patterns
- Proper mock error scenario coverage

## Environment Configuration

### **Test Environment Setup**
```typescript
// Vitest configuration
export default defineConfig({
    test: {
        environment: 'jsdom', // For frontend tests
        setupFiles: ['src/test-setup.ts'],
        globals: true
    }
});
```

### **Mock Environment Variables**
```typescript
// Test-specific environment setup
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
```

## Performance Guidelines

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

## Maintenance Practices

### **Regular Test Maintenance**
- **Review Coverage**: Regularly audit test coverage and identify gaps
- **Refactor Tests**: Update tests when business logic changes
- **Remove Obsolete**: Delete tests for removed features
- **Update Patterns**: Keep test patterns consistent with latest standards

### **Documentation Updates**
- Update this document when introducing new patterns
- Document any deviations from standards with justification
- Maintain examples that reflect current codebase state

## Migration Guidelines

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

## Tools and Configuration

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

## Summary

This test plan ensures:
- **Consistent Quality**: All tests follow the same high standards
- **Maintainable Architecture**: Clear separation of concerns
- **Efficient Development**: TDD process with minimal redundancy
- **Scalable Structure**: Patterns that grow with the codebase
- **Industry Best Practices**: Follows established testing principles

By following these guidelines, the test suite will remain robust, maintainable, and valuable throughout the project's lifecycle.