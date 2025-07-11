# Zentropy E2E Testing with Playwright

This directory contains end-to-end tests for the Zentropy application using Playwright. These tests validate complete user workflows across the frontend and backend, including authentication, email verification, and API integration.

## Quick Start

```bash
# Install Playwright dependencies (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run tests with UI (debugging)
npm run test:e2e:ui

# Run tests in headed mode
npm run test:e2e:headed
```

## Prerequisites

Before running E2E tests, ensure:

1. **Development environment is running**:
   ```bash
   npm run dev
   ```

2. **Services are available**:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3000`
   - PostgreSQL: `localhost:5432`
   - Mailpit: `http://localhost:8025`

3. **Environment is clean**:
   - Tests will automatically clean up test data
   - Mailpit emails are cleared before/after tests

## Test Structure

```
tests-e2e/
├── tests/                  # Test files
│   ├── auth/              # Authentication tests
│   │   ├── registration.spec.ts
│   │   ├── login.spec.ts
│   │   └── security-status.spec.ts
│   └── ...                # Additional test categories
├── pages/                 # Page Object Models
│   ├── base-page.ts       # Base page functionality
│   ├── auth-page.ts       # Authentication interactions
│   └── ...                # Additional page objects
├── utils/                 # Test utilities
│   ├── auth-helpers.ts    # Authentication utilities
│   ├── database-helpers.ts # Database management
│   └── mailpit-helpers.ts # Email testing
├── fixtures/              # Test fixtures
│   └── base.ts           # Extended test fixtures
├── config/               # Configuration
│   └── environment.ts    # Environment settings
├── global-setup.ts       # Global test setup
├── global-teardown.ts    # Global test cleanup
└── README.md             # This file
```

## Test Categories

### Authentication Tests

#### Core Authentication (`tests/auth/`)
- **Registration Tests**: Email/password registration flows
- **Login Tests**: Email/password authentication  
- **Security Status**: API endpoint validation for user security state

#### Current Test Coverage
For complete test status across all authentication scenarios, see:
- **[Test Coverage Matrix](../docs/testing/TestCoverage.md)** - Authentication System Coverage section

## Test Data Management

### Email Addresses
Tests use unique email addresses with patterns:
- `testlocal+{id}@zentropy.test` - Standard test users
- `e2e+test+{id}@zentropy.test` - General E2E tests

For provider-specific patterns, see the [Test Coverage Matrix](../docs/testing/TestCoverage.md).

### Automatic Cleanup
- Test users are automatically deleted after each test
- Database state is cleaned between tests
- Mailpit emails are cleared before/after tests

### Manual Cleanup
```bash
# Clean up test users manually if needed
python3 scripts/db_utils.py delete "testlocal+"
python3 scripts/db_utils.py delete "e2e+test+"
```

## Configuration

### Environment Variables
```bash
# Frontend URL (default: http://localhost:5173)
E2E_FRONTEND_URL=http://localhost:5173

# Backend URL (default: http://localhost:3000)  
E2E_BACKEND_URL=http://localhost:3000

# Mailpit URL (default: http://localhost:8025)
E2E_MAILPIT_URL=http://localhost:8025

# Test mode configuration
E2E_MOCK_OAUTH=true
```

### Timeouts
- Navigation: 30 seconds
- Actions: 10 seconds
- Assertions: 5 seconds
- Email verification: 15 seconds
- Complex workflows: 30 seconds

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from "../../fixtures/base";
import { AuthPage } from "../../pages/auth-page";
import { generateTestEmail } from "../../config/environment";

test.describe("Feature Tests", () => {
  test("should do something", async ({ page, db, mailpit, auth }) => {
    // Arrange
    const email = generateTestEmail("local", "test");
    const testUser = await db.createTestUser({ email });
    
    // Act
    const authPage = new AuthPage(page);
    await authPage.login(email, "TestPassword123!");
    
    // Assert
    expect(await authPage.isLoggedIn()).toBe(true);
  });
});
```

### Available Fixtures
- `db`: Database helpers for user management
- `mailpit`: Email testing and verification
- `auth`: Authentication flows and JWT management
- `page`: Standard Playwright page object

### Page Objects
Use page objects for consistent element interactions:
```typescript
const authPage = new AuthPage(page);
await authPage.openAuthModal();
await authPage.login(email, password);
```

## Debugging

### Visual Debugging
```bash
# Run with browser UI
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed
```

### Debug Output
- Screenshots on failure: `tests-e2e-results/screenshots/`
- Videos on failure: `tests-e2e-results/videos/`
- Test reports: `tests-e2e-report/index.html`

### Common Issues

**Services not running**:
```
Error: Required service Frontend is not running
```
Solution: Run `npm run dev` first

**Database connection issues**:
```
Error: Could not clean test database
```
Solution: Ensure PostgreSQL is running via `docker-compose up -d`

**Email verification timeouts**:
```
Error: No email received for user@example.com within 15000ms
```
Solution: Check Mailpit is running at `http://localhost:8025`

## Feature-Specific Testing

### Test Status and Configuration
For feature-specific test requirements, setup instructions, and current status:
- **[Test Coverage Matrix](../docs/testing/TestCoverage.md)** - Complete feature coverage status and configuration requirements

### Adding New Features
When adding tests for new features, update both:
1. This guide with any new patterns or utilities
2. The Test Coverage Matrix with test status and requirements

## CI/CD Integration

### Test Execution
```bash
# Full test suite with coverage
npm run quality

# E2E tests only
npm run test:e2e
```

### Browser Support
Tests run on:
- Chromium (primary)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

### Parallel Execution
- Tests run in parallel for speed
- Retries: 2 attempts in CI, 0 locally
- Workers: Limited to 1 in CI for stability

## Maintenance

### Regular Tasks
1. **Update test data**: Ensure email patterns remain unique
2. **Review timeouts**: Adjust based on CI performance
3. **Clean up selectors**: Update data-testid attributes as needed
4. **Monitor flaky tests**: Review retry logs and stabilize

### Test Plan Updates
When updating the **Login System Test Plan**:
1. Update corresponding test files
2. Add new test scenarios as needed  
3. Update status tracking in test plan document
4. Verify test coverage remains comprehensive

## Contributing

### Adding New Tests
1. Follow existing patterns in `tests/auth/`
2. Use the base fixtures and page objects
3. Include proper test data cleanup
4. Add descriptive test names following the test plan

### Updating Page Objects
1. Add new elements to appropriate page objects
2. Use `data-testid` attributes for reliable selectors
3. Include error handling and wait logic
4. Maintain consistency with existing patterns

## Related Testing Documentation

### Unit & Integration Testing
E2E tests complement our comprehensive unit and integration test suites:
- **[Testing & Quality Handbook](../tests/README.md)** - Unit and integration testing strategies for backend (pytest) and frontend (vitest)
- **Commands**: `npm run test`, `npm run test:python`, `npm run test:frontend`

### Complete Testing Strategy
For a comprehensive view of all testing layers:
- **[Test Coverage Matrix](../docs/testing/TestCoverage.md)** - Cross-layer test coverage showing how unit, integration, and E2E tests work together

### Testing Layer Strategy
- **Unit Tests** (see above): Fast feedback for business logic and component behavior
- **Integration Tests** (see above): API contracts and database interactions
- **E2E Tests** (this guide): Complete user workflows and cross-system validation

This E2E testing framework provides comprehensive coverage of Zentropy's authentication system while maintaining high reliability and clear documentation for future development.