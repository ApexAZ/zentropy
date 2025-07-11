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
  - Frontend: 80.25% (932 tests)
- **Integration Tests**: Comprehensive API coverage (Backend + Frontend)
- **E2E Tests**: 3/26 Login System tests implemented

### Coverage by Feature Area
- **Authentication**: 60% complete (core flows done, security boundaries pending)
- **Team Management**: 40% complete (backend ready, E2E pending)
- **Project Management**: 40% complete (backend ready, E2E pending)
- **Calendar Integration**: 30% complete (backend ready, E2E pending)

## Test Execution Strategy

### Daily Development (Fast Feedback)
```bash
npm run test                    # Unit + Integration (~2-3 minutes)
```
**When to use**: Every code change, before committing
**Coverage**: Business logic, API contracts, component behavior

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

## Gaps and Priorities

### High Priority Gaps
1. **OAuth Configuration**: Complete setup to enable Auth-1.2, Auth-1.4, Auth-2.2
2. **Account Linking E2E**: Auth-3.x tests (security critical)
3. **Account Takeover E2E**: Auth-5.1 (security critical)

### Medium Priority Gaps
1. **Team Management E2E**: Complete user workflows
2. **Project Management E2E**: Complete user workflows
3. **Cross-feature Workflows**: Multi-feature user journeys

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

**Last Updated**: 2025-01-11  
**Maintained By**: Development Team  
**Review Schedule**: Weekly during active development  

## Related Documentation

### Core Testing Guides
- **[Unit & Integration Testing](../../tests/README.md)** - Backend (pytest) and frontend (vitest) testing strategies, quality pipeline, TDD practices
- **[End-to-End Testing](../../tests-e2e/README.md)** - Playwright browser testing for complete user workflows and cross-system validation

### Project Documentation  
- **[Architecture Overview](../architecture/README.md)** - System architecture including testing architecture section
- **[Main Project Guide](../../README.md)** - Getting started, quality standards, and comprehensive documentation index