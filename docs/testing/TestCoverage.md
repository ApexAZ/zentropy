# Zentropy Test Coverage Matrix

This document provides a comprehensive mapping of test coverage across all three testing layers in the Zentropy application. It serves as the single source of truth for understanding what is tested, where, and how.

## Test Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Unit Tests    │    │Integration Tests│    │   E2E Tests     │
│   (Fast/Isolated)│    │ (API/Component) │    │ (User Workflows)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ↓                        ↓                        ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│Backend: pytest │    │Backend: pytest │    │  Playwright     │
│Frontend: vitest│    │Frontend: vitest │    │ (All browsers)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Authentication System Coverage

### Core Authentication Flows

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Auth-1.1** | Email/Password Registration | ✅ AuthService.test.ts<br>✅ useAuth.test.ts | ✅ test_auth_router.py<br>✅ AuthModal.test.tsx | ✅ registration.spec.ts | **Complete** |
| **Auth-1.2** | Google OAuth Registration | ⚠️ Missing frontend unit | ✅ test_google_oauth.py<br>✅ OAuthProviders.test.tsx | ⚠️ Skipped (OAuth config required) | **Partial** |
| **Auth-1.3** | Email/Password Login | ✅ AuthService.test.ts<br>✅ useAuth.test.ts | ✅ test_auth_router.py<br>✅ AuthModal.test.tsx | ✅ login.spec.ts | **Complete** |
| **Auth-1.4** | Google OAuth Login | ⚠️ Missing frontend unit | ✅ test_google_oauth.py<br>✅ OAuthProviders.test.tsx | ⚠️ Skipped (OAuth config required) | **Partial** |

### Email Verification System (NEW)

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Auth-6.1** | Central Verification Service | ✅ test_verification_service.py<br>(19 test cases) | ✅ Code generation, validation<br>✅ Rate limiting, security | 📋 Planned | **Backend Complete** |
| **Auth-6.2** | Verification Code API Endpoint | ✅ Business logic coverage | ✅ test_verify_code_endpoint.py<br>(12 test cases) | 📋 Planned | **API Complete** |
| **Auth-6.3** | Code-Based Email Verification | ✅ test_email_verification.py<br>(16 test cases) | ✅ Updated for code system<br>✅ Legacy token compatibility | 📋 Planned | **Integration Complete** |
| **Auth-6.4** | EmailVerificationPage Component | ✅ EmailVerificationPage.test.tsx<br>(25+ test cases) | ✅ React component testing<br>✅ API integration tests | 📋 Planned | **Frontend Complete** |
| **Auth-6.5** | Verification System Security | ✅ Attempt tracking, isolation<br>✅ Cross-user security | ✅ SQL injection protection<br>✅ Rate limiting enforcement | 📋 Planned | **Security Complete** |

### Security & Account Management

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Auth-2.1** | LOCAL User Security Status | ✅ UserService.test.ts | ✅ test_users_router.py | ✅ security-status.spec.ts | **Complete** |
| **Auth-2.2** | GOOGLE User Security Status | ✅ UserService.test.ts | ✅ test_users_router.py | ⚠️ Skipped (OAuth config required) | **Partial** |
| **Auth-3.1** | Link Google Account | ⚠️ Missing frontend unit | ✅ test_account_linking.py | 📋 Planned | **In Progress** |
| **Auth-3.2** | HYBRID Login Methods | ⚠️ Missing frontend unit | ✅ test_account_linking.py | 📋 Planned | **In Progress** |
| **Auth-3.3** | Unlink Google Account | ⚠️ Missing frontend unit | ✅ test_account_linking.py | 📋 Planned | **In Progress** |

### Security Boundaries (Critical)

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Auth-4.1** | Email Mismatch Prevention | ✅ Logic in services | ✅ test_account_linking.py | 📋 Planned | **Backend Ready** |
| **Auth-4.2** | Duplicate Account Prevention | ✅ Logic in services | ✅ test_account_linking.py | 📋 Planned | **Backend Ready** |
| **Auth-5.1** | Account Takeover Prevention | ✅ Logic validation | ✅ test_security_critical.py | 📋 Planned | **Critical Priority** |

## Team Management Coverage

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Team-1.1** | Create Team | ✅ TeamService.test.ts<br>✅ useTeams.test.ts | ✅ test_teams_router.py<br>✅ TeamsPage.test.tsx | 📋 Planned | **Backend Ready** |
| **Team-1.2** | Join Team | ✅ TeamService.test.ts | ✅ test_teams_router.py | 📋 Planned | **Backend Ready** |
| **Team-1.3** | Team Permissions | ✅ Role system tests | ✅ test_role_system.py | 📋 Planned | **Backend Ready** |

## Project Management Coverage

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Proj-1.1** | Create Project | ✅ ProjectService.test.ts<br>✅ useProject.test.ts | ✅ test_projects_router.py<br>✅ ProjectCreationModal.test.tsx | 📋 Planned | **Backend Ready** |
| **Proj-1.2** | Project Workflows | ✅ Service layer tests | ✅ test_projects_router.py | 📋 Planned | **Backend Ready** |

## Calendar Integration Coverage

| Test ID | Description | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-------------|------------|-------------------|-----------|--------|
| **Cal-1.1** | Calendar Entries | ✅ CalendarService.test.ts | ✅ test_calendar_entries_router.py<br>✅ CalendarPage.test.tsx | 📋 Planned | **Backend Ready** |

## Coverage Statistics

### Current Coverage by Layer
- **Unit Tests**: 
  - Backend: 91.77% (571 tests)
  - Frontend: 92.65% (943 tests) *Updated with new verification tests*
- **Integration Tests**: Comprehensive API coverage (Backend + Frontend)
- **E2E Tests**: 3/26 Login System tests implemented

### Coverage by Feature Area
- **Authentication**: 75% complete (core flows + email verification complete, security boundaries pending)
- **Email Verification**: 95% complete (comprehensive test coverage, E2E pending)
- **Team Management**: 40% complete (backend ready, E2E pending)
- **Project Management**: 40% complete (backend ready, E2E pending)
- **Calendar Integration**: 30% complete (backend ready, E2E pending)

### Recent Audit Improvements (2025-01-13)
**Comprehensive Email Verification System Audit Completed**
- ✅ **47 new verification tests** added across all layers
- ✅ **6 critical implementation bugs** fixed in VerificationCodeService  
- ✅ **Timezone compatibility** resolved between SQLite (tests) and PostgreSQL (production)
- ✅ **API endpoint security** enhanced with proper validation and error handling
- ✅ **React component compliance** achieved (hooks rules, accessibility standards)
- ✅ **Backward compatibility** maintained with legacy token-based verification

**Test Performance Optimization Completed**
- ✅ **8x faster backend tests** (18.8ms vs 156ms per test)
- ✅ **Transaction rollback architecture** for fast test isolation
- ✅ **Parallel execution** by default (8 workers)
- ✅ **Zero regressions** across all 606 backend tests
- ✅ **Opt-in expensive fixtures** (rate limits, email cleanup)
- ✅ **Total test suite time** reduced from 102s to 19s

## Test Execution Strategy

### Daily Development (Fast Feedback)
```bash
npm run test                    # Unit + Integration (~19 seconds)
```
**When to use**: Every code change, before committing
**Coverage**: Business logic, API contracts, component behavior
**Performance**: 
- Backend: 11.4s for 606 tests (18.8ms per test)
- Frontend: 7.4s for 1306 tests (5.7ms per test)
- Total: ~19s for 1912 tests (10ms per test average)

### Feature Development (Comprehensive)
```bash
npm run test:feature auth       # All auth tests (all layers)
npm run test:e2e -- tests/auth/ # E2E for auth features only
```
**When to use**: Feature completion, before PR
**Coverage**: Complete feature validation across all layers

### Pre-Release (Full Regression)
```bash
npm run quality                 # Everything + quality checks
npm run test:e2e               # Full E2E suite
```
**When to use**: Before releases, weekly regression
**Coverage**: Full application validation

## Test Maintenance Workflow

### Adding New Features
1. **Plan Coverage**: Update this matrix with planned tests
2. **Implement Tests**: Follow the three-layer approach
   - Unit tests (business logic)
   - Integration tests (API/component contracts)  
   - E2E tests (user workflows)
3. **Update Matrix**: Mark tests as complete
4. **Verify Coverage**: Ensure all layers are implemented

### Updating Existing Features
1. **Impact Analysis**: Check this matrix for affected tests
2. **Update Tests**: Modify tests in all affected layers
3. **Regression Check**: Run related test suites
4. **Update Documentation**: Keep matrix current

### Debugging Test Failures
1. **Layer Identification**: Which layer failed?
   - Unit → Logic issue
   - Integration → Contract/API issue
   - E2E → User experience issue
2. **Root Cause**: Use layer clues to guide investigation
3. **Fix Strategy**: Update appropriate test layer(s)

## Configuration Requirements

### OAuth Testing Setup (Auth-1.2, Auth-1.4, Auth-2.2)
**Current Status**: ⚠️ Skipped - OAuth configuration required

**Requirements to Enable**:
1. **Google OAuth Test Credentials**: Configure test client ID and secret
2. **OAuth Sandbox Environment**: Set up isolated OAuth testing environment  
3. **Environment Variables**: Set `E2E_MOCK_OAUTH=false` to enable real OAuth flows
4. **Test Data**: Configure `testgoogle+{id}@gmail.com` email patterns for Google users

**Manual Cleanup Commands**:
```bash
python3 scripts/db_utils.py delete "testgoogle+"
```

### Email Testing Patterns
- **LOCAL Users**: `testlocal+{id}@zentropy.test`
- **GOOGLE Users**: `testgoogle+{id}@gmail.com` (requires OAuth setup)
- **HYBRID Users**: Same email for both LOCAL and GOOGLE auth methods
- **General E2E**: `e2e+test+{id}@zentropy.test`
- **Verification Testing**: Random email patterns with isolated test database for verification code validation

## Email Verification System Details

### Central VerificationCodeService Architecture
The email verification system uses a **Central Verification Code Service** that supports multiple verification types with consistent security, rate limiting, and audit trails.

#### Supported Verification Types
- **EMAIL_VERIFICATION**: 6-digit codes, 15min expiry, 3 attempts, 1min rate limit
- **TWO_FACTOR_AUTH**: 6-digit codes, 5min expiry, 3 attempts, 1min rate limit  
- **PASSWORD_RESET**: 6-digit codes, 30min expiry, 5 attempts, 2min rate limit
- **ACCOUNT_RECOVERY**: 6-digit codes, 60min expiry, 3 attempts, 5min rate limit
- **SENSITIVE_ACTION**: 6-digit codes, 10min expiry, 2 attempts, 1min rate limit

#### Security Features
- **Rate Limiting**: Prevents spam and brute force attacks
- **Attempt Tracking**: Tracks and enforces maximum verification attempts
- **Code Isolation**: Verification codes isolated between users and types
- **Automatic Cleanup**: Expired and used codes automatically cleaned up
- **Timezone Handling**: Compatible with SQLite (tests) and PostgreSQL (production)

#### Test Coverage Breakdown
- **`test_verification_service.py` (19 tests)**: Core service logic, security, utilities
- **`test_verify_code_endpoint.py` (12 tests)**: API endpoint validation, error handling
- **`test_email_verification.py` (16 tests)**: Integration with legacy system, full flows
- **`EmailVerificationPage.test.tsx` (25+ tests)**: React component behavior, API integration

#### Implementation Quality Fixes
- **Timezone Compatibility**: Fixed datetime comparisons between test and production databases
- **Attempt Tracking**: Fixed failed verification attempts not being properly recorded
- **Max Attempts Logic**: Fixed maximum attempts exceeded not preventing further attempts
- **Endpoint Integration**: Updated API to properly validate verification types and use central service
- **React Compliance**: Fixed hooks rule violations and accessibility issues

## Gaps and Priorities

### High Priority Gaps
1. **OAuth Configuration**: Complete setup to enable Auth-1.2, Auth-1.4, Auth-2.2
2. **Account Linking E2E**: Auth-3.x tests (security critical)
3. **Account Takeover E2E**: Auth-5.1 (security critical)
4. **Email Verification E2E**: Auth-6.x code-based verification user workflows

### Medium Priority Gaps
1. **Team Management E2E**: Complete user workflows
2. **Project Management E2E**: Complete user workflows
3. **Cross-feature Workflows**: Multi-feature user journeys

### Recently Completed (2025-01-13)
1. ✅ **Email Verification Backend**: Complete central verification service with security
2. ✅ **Email Verification API**: Comprehensive endpoint testing and validation
3. ✅ **Email Verification Frontend**: React component with accessibility compliance
4. ✅ **Verification System Integration**: Legacy compatibility and migration path

### Low Priority Gaps
1. **Performance Testing**: Load testing, performance benchmarks
2. **Accessibility Testing**: Screen reader, keyboard navigation
3. **Cross-browser Validation**: Extended browser matrix

## Future Enhancements

### Planned Additions
- **Visual Regression Testing**: Screenshot comparison
- **API Load Testing**: Performance validation
- **Mobile E2E Testing**: Touch interactions, responsive design
- **Accessibility E2E**: Screen reader simulation

### Automation Improvements
- **Test Data Management**: Improved seeding and cleanup
- **Parallel Test Execution**: Faster E2E test runs
- **Smart Test Selection**: Run only tests affected by changes
- **Performance Monitoring**: Track test execution times

---

**Last Updated**: 2025-01-13 (Email Verification System Audit Completed)  
**Maintained By**: Development Team  
**Review Schedule**: Weekly during active development  

## Key Test Files Reference

### Email Verification System (NEW)
- **Backend Service**: `tests/services/test_verification_service.py` - Central verification code service (19 tests)
- **API Endpoint**: `tests/routers/test_verify_code_endpoint.py` - /api/v1/auth/verify-code testing (12 tests)  
- **Integration**: `tests/services/test_email_verification.py` - Full verification flow integration (16 tests)
- **Frontend Component**: `src/client/pages/__tests__/EmailVerificationPage.test.tsx` - React component testing (25+ tests)

### Legacy Email Systems (Maintained)
- **Token-based verification**: Still supported for backward compatibility
- **Email services**: Integrated with new central verification service

## Related Documentation

### Core Testing Guides
- **[Unit & Integration Testing](../../tests/README.md)** - Backend (pytest) and frontend (vitest) testing strategies, quality pipeline, TDD practices
- **[End-to-End Testing](../../tests-e2e/README.md)** - Playwright browser testing for complete user workflows and cross-system validation

### Project Documentation  
- **[Architecture Overview](../architecture/README.md)** - System architecture including testing architecture section
- **[Main Project Guide](../../README.md)** - Getting started, quality standards, and comprehensive documentation index