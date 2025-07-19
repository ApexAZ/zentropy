# Mock Strategy Hierarchy Documentation
## Zentropy Test Mock Architecture Decision Matrix

**Version**: 1.0  
**Created**: 2025-01-19  
**Last Updated**: 2025-01-19  
**Status**: Active

---

## Overview

The Zentropy test suite uses a **hierarchical mock strategy** to provide consistent, maintainable, and performant testing patterns. This document defines the three mock levels, when to use each, and provides concrete examples for implementation.

### Architecture Principles

1. **Performance First**: All mock patterns prioritize fast test execution
2. **Type Safety**: Full TypeScript support with realistic mock interfaces
3. **Behavioral Focus**: Tests verify user-visible behavior, not implementation details
4. **Consistent Patterns**: Standardized approaches across all test files
5. **Easy Debugging**: Clear mock call tracking and verification

---

## Mock Strategy Hierarchy

### Level 1: Global Fetch Mocking (Lowest Level)
**Best For**: Integration-style tests, error handling, network conditions, service testing

#### When to Use
- Testing actual HTTP request/response cycles
- Validating error handling and network failures
- Service layer unit tests
- End-to-end component workflows
- Rate limiting and timeout scenarios

#### Pattern Implementation
```typescript
import { setupTestEnvironment } from '../utils/testRenderUtils';

describe('AuthService Integration Tests', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  
  beforeEach(() => {
    testEnv = setupTestEnvironment({
      mocks: {
        fetch: vi.fn()
      }
    });
  });
  
  afterEach(() => {
    testEnv.cleanup();
  });
  
  it('should handle successful sign in', async () => {
    // Mock fetch response
    testEnv.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          token: 'test-token', 
          user: { email: 'test@example.com' } 
        })
      } as Response);
    
    const result = await AuthService.signIn({
      email: 'test@example.com',
      password: 'password'
    });
    
    expect(result.token).toBe('test-token');
    expect(testEnv.fetch).toHaveBeenCalledWith('/api/v1/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' })
    });
  });
  
  it('should handle network errors', async () => {
    testEnv.fetch.mockRejectedValueOnce(new Error('Network error'));
    
    await expect(AuthService.signIn({
      email: 'test@example.com',
      password: 'password'
    })).rejects.toThrow('Network error');
  });
});
```

#### Advantages
- Tests actual HTTP layer behavior
- Validates request construction
- Tests error handling and edge cases
- Realistic network simulation

#### Disadvantages
- More setup required
- Slower than higher-level mocks
- Requires knowledge of API contracts

---

### Level 2: Service Mocking (Mid Level)
**Best For**: Component integration tests, business logic validation, user workflow testing

#### When to Use
- Testing component behavior with service dependencies
- Validating business logic flows
- User interaction scenarios
- Cross-service integration testing
- Most component tests

#### Pattern Implementation
```typescript
import { renderWithFullEnvironment } from '../utils/testRenderUtils';
import { createAuthServiceMocks, AuthServiceScenarios } from '../mocks/serviceMocks';

describe('SignInForm Component', () => {
  it('should handle successful sign in', async () => {
    const authMocks = createAuthServiceMocks({
      signIn: vi.fn().mockResolvedValue({
        token: 'test-token',
        user: { email: 'test@example.com', name: 'Test User' }
      })
    });
    
    const testEnv = renderWithFullEnvironment(<SignInForm />, {
      providers: { toast: true, auth: true },
      mocks: { authService: authMocks }
    });
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify service was called
    expect(authMocks.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
    
    // Verify user feedback
    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
    
    testEnv.cleanup();
  });
  
  it('should handle failed sign in', async () => {
    const authMocks = AuthServiceScenarios.failedSignIn();
    
    const testEnv = renderWithFullEnvironment(<SignInForm />, {
      providers: { toast: true, auth: true },
      mocks: { authService: authMocks }
    });
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'invalid@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'wrongpassword' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
    
    testEnv.cleanup();
  });
});
```

#### Advantages
- Balances realism with simplicity
- Focuses on business logic
- Easy mock customization
- Good performance
- Clear separation of concerns

#### Disadvantages
- Requires service interface knowledge
- Less coverage of HTTP layer details

---

### Level 3: Hook/Context Mocking (Highest Level)
**Best For**: Component unit tests, UI-focused testing, isolated rendering tests

#### When to Use
- Testing component rendering and UI behavior
- Isolating components from complex dependencies
- Testing loading states and error boundaries
- Simple component functionality
- Fast unit tests

#### Pattern Implementation
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the hook completely
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock the service at module level
vi.mock('../../services/AuthService', () => ({
  AuthService: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

describe('UserProfile Component Unit Tests', () => {
  const mockUseAuth = vi.mocked(useAuth);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should display user information when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { 
        name: 'John Doe', 
        email: 'john@example.com' 
      },
      loading: false,
      error: null,
      signOut: vi.fn()
    });
    
    render(<UserProfile />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
  
  it('should display loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      error: null,
      signOut: vi.fn()
    });
    
    render(<UserProfile />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('should handle sign out', () => {
    const mockSignOut = vi.fn();
    
    mockUseAuth.mockReturnValue({
      user: { name: 'John Doe', email: 'john@example.com' },
      loading: false,
      error: null,
      signOut: mockSignOut
    });
    
    render(<UserProfile />);
    
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
```

#### Advantages
- Fastest execution
- Complete isolation
- Simple setup
- Focused on UI behavior

#### Disadvantages
- Less integration coverage
- May miss interaction bugs
- Requires more mock setup

---

## Decision Matrix

| Test Scenario | Recommended Level | Alternative Level | Reasoning |
|---------------|-------------------|-------------------|-----------|
| **Service Unit Tests** | Level 1 (Fetch) | None | Need to test actual HTTP behavior |
| **Service Error Handling** | Level 1 (Fetch) | Level 2 (Service) | Network errors are fetch-level concerns |
| **Component Integration** | Level 2 (Service) | Level 1 (Fetch) | Focus on business logic, not HTTP details |
| **User Workflow Tests** | Level 2 (Service) | Level 1 (Fetch) | Service mocks provide realistic behavior |
| **Component Unit Tests** | Level 3 (Hook) | Level 2 (Service) | UI-focused, fast execution |
| **Loading State Tests** | Level 3 (Hook) | Level 2 (Service) | Hook mocks easily control loading states |
| **Error Boundary Tests** | Level 3 (Hook) | Level 2 (Service) | Hook mocks can trigger specific error states |
| **Form Validation** | Level 2 (Service) | Level 3 (Hook) | Validation often involves service calls |
| **Navigation Tests** | Level 3 (Hook) | Level 2 (Service) | Routing is typically hook-driven |
| **Performance Tests** | Level 3 (Hook) | Level 2 (Service) | Fast execution for performance validation |

## Mock Level Selection Guide

### Choose Level 1 (Fetch) When:
- ✅ Testing service layer functionality
- ✅ Validating HTTP request/response handling
- ✅ Testing network error scenarios
- ✅ Verifying request construction
- ✅ Testing rate limiting and timeouts
- ✅ End-to-end workflow validation

### Choose Level 2 (Service) When:
- ✅ Testing component business logic
- ✅ Validating user interactions
- ✅ Testing cross-service integration
- ✅ Most component integration tests
- ✅ Testing service error handling in components
- ✅ Validating data flow through components

### Choose Level 3 (Hook) When:
- ✅ Testing component rendering
- ✅ Testing UI state changes
- ✅ Isolating component functionality
- ✅ Testing loading and error states
- ✅ Fast unit test execution
- ✅ Testing component props and events

---

## Migration Guidelines

### From Current Patterns to New Architecture

#### Pattern A: Global fetch = vi.fn() → Level 1 (Fetch)
```typescript
// BEFORE (Current Pattern)
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve(mockData)
});

// AFTER (Level 1 Pattern)
const testEnv = setupTestEnvironment({
  mocks: {
    fetch: vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) })
  }
});
```

#### Pattern B: Service vi.mock() → Level 2 (Service)
```typescript
// BEFORE (Current Pattern)  
vi.mock("../../services/AuthService", () => ({
  AuthService: {
    signIn: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

// AFTER (Level 2 Pattern)
const testEnv = renderWithFullEnvironment(<Component />, {
  providers: { toast: true, auth: true },
  mocks: {
    authService: createAuthServiceMocks({
      signIn: vi.fn().mockResolvedValue(customResponse)
    })
  }
});
```

#### Pattern C: Hook vi.mock() → Level 3 (Hook)
```typescript
// BEFORE (Current Pattern)
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

// AFTER (Level 3 Pattern - No Change Needed)
// This pattern is already optimal for Level 3 tests
vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn()
}));
```

---

## Performance Considerations

### Mock Level Performance Comparison
- **Level 3 (Hook)**: ~5-15ms per test ⚡ Fastest
- **Level 2 (Service)**: ~15-30ms per test 🚀 Fast  
- **Level 1 (Fetch)**: ~25-50ms per test ✅ Good

### Performance Best Practices

1. **Use Level 3 for unit tests** when component isolation is sufficient
2. **Use Level 2 for most integration tests** - best balance of speed and coverage
3. **Use Level 1 sparingly** for service tests and complex error scenarios
4. **Batch similar tests** in the same describe block to reuse mock setup
5. **Use scenario mocks** to avoid repetitive mock configuration

### Performance Monitoring
```typescript
import { MockPerformanceMonitor } from '../utils/performanceMonitoring';

describe('Performance-Critical Tests', () => {
  beforeEach(() => {
    MockPerformanceMonitor.startTiming(expect.getState().currentTestName);
  });
  
  afterEach(() => {
    const duration = MockPerformanceMonitor.endTiming(expect.getState().currentTestName);
    if (duration > 100) {
      console.warn(`Slow test detected: ${duration}ms`);
    }
  });
});
```

---

## Common Anti-Patterns to Avoid

### ❌ Mixing Mock Levels Unnecessarily
```typescript
// DON'T: Using multiple levels when one would suffice
vi.mock('../../hooks/useAuth'); // Level 3
global.fetch = vi.fn();          // Level 1
const authMocks = createAuthServiceMocks(); // Level 2
```

### ❌ Over-Mocking Simple Components
```typescript
// DON'T: Complex service mocks for simple UI tests
const testEnv = renderWithFullEnvironment(<SimpleButton />, {
  mocks: { authService: createAuthServiceMocks() } // Overkill
});

// DO: Simple render for simple components
render(<SimpleButton onClick={mockOnClick} />);
```

### ❌ Under-Mocking Integration Tests
```typescript
// DON'T: Hook mocks for complex integration tests
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => mockState }));
// This misses service interaction validation

// DO: Service mocks for integration tests
const testEnv = renderWithFullEnvironment(<AuthFlow />, {
  mocks: { authService: createAuthServiceMocks() }
});
```

### ❌ Inconsistent Mock Cleanup
```typescript
// DON'T: Manual, incomplete cleanup
afterEach(() => {
  vi.clearAllMocks(); // Misses global mocks
});

// DO: Use testEnv.cleanup()
afterEach(() => {
  testEnv.cleanup(); // Comprehensive cleanup
});
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "Mock not working as expected"
**Cause**: Wrong mock level for the test scenario  
**Solution**: Review decision matrix and choose appropriate level

#### Issue: "Tests are too slow"
**Cause**: Using Level 1 (Fetch) when Level 2 (Service) would suffice  
**Solution**: Migrate to higher-level mocks for better performance

#### Issue: "Missing integration coverage"
**Cause**: Using Level 3 (Hook) for integration tests  
**Solution**: Use Level 2 (Service) mocks to test service interactions

#### Issue: "TypeScript errors with mocks"
**Cause**: Incorrect mock interface types  
**Solution**: Use provided mock types from `globalMocks.ts`

#### Issue: "Mock pollution between tests"
**Cause**: Inadequate cleanup between tests  
**Solution**: Always call `testEnv.cleanup()` in `afterEach`

---

## Examples Repository

### Complete Test Examples

#### Example 1: Service Test (Level 1)
```typescript
// File: AuthService.test.ts
import { setupTestEnvironment } from '../utils/testRenderUtils';
import { AuthService } from '../../services/AuthService';

describe('AuthService', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  
  beforeEach(() => {
    testEnv = setupTestEnvironment();
  });
  
  afterEach(() => {
    testEnv.cleanup();
  });
  
  it('should handle rate limiting', async () => {
    testEnv.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' })
      } as Response);
    
    await expect(AuthService.signIn({
      email: 'test@example.com',
      password: 'password'
    })).rejects.toThrow('Rate limit exceeded');
  });
});
```

#### Example 2: Component Integration Test (Level 2)
```typescript
// File: AuthModal.test.tsx
import { renderWithFullEnvironment } from '../utils/testRenderUtils';
import { AuthServiceScenarios } from '../mocks/serviceMocks';
import { AuthModal } from '../../components/AuthModal';

describe('AuthModal Integration', () => {
  it('should handle complete sign in flow', async () => {
    const authMocks = AuthServiceScenarios.successfulSignIn();
    
    const testEnv = renderWithFullEnvironment(<AuthModal isOpen={true} />, {
      providers: { toast: true, auth: true },
      mocks: { authService: authMocks }
    });
    
    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify success
    await waitFor(() => {
      expect(authMocks.signIn).toHaveBeenCalled();
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
    
    testEnv.cleanup();
  });
});
```

#### Example 3: Component Unit Test (Level 3)
```typescript
// File: UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { UserAvatar } from '../../components/UserAvatar';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

describe('UserAvatar Unit Tests', () => {
  const mockUseAuth = vi.mocked(useAuth);
  
  it('should display user initials when no avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'John Doe', avatar_url: null },
      loading: false
    });
    
    render(<UserAvatar />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
```

---

## Conclusion

The hierarchical mock strategy provides a clear, performance-oriented approach to testing in the Zentropy codebase. By following the decision matrix and examples in this document, developers can:

- **Choose the right mock level** for each test scenario
- **Achieve optimal performance** while maintaining good coverage
- **Write maintainable tests** with consistent patterns
- **Debug issues effectively** with clear mock boundaries

For questions or updates to this strategy, please refer to the [Global Mock Architecture Standardization Plan](./GlobalMockArchitectureStandardizationPlan.md) or create an issue in the project repository.