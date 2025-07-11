# React Hooks Module Documentation

## Overview

The `hooks/` module contains custom React hooks that encapsulate complex state management, API interactions, and business logic. These hooks follow React best practices and provide a clean interface for components to access application functionality.

## Architecture Principles

1. **Single Responsibility**: Each hook has one clear purpose
2. **Composition over Inheritance**: Hooks can use other hooks
3. **Error Handling**: All hooks handle errors gracefully
4. **Type Safety**: Full TypeScript support with proper types
5. **Testing**: All hooks are thoroughly tested

## Available Hooks

### `useAuth` - Authentication Management

Manages user authentication state and operations:

```typescript
const {
  user,           // Current user object or null
  isLoading,      // Loading state during auth checks
  error,          // Any authentication errors
  signIn,         // Sign in with email/password
  signUp,         // Register new user
  signOut,        // Sign out current user
  updateProfile   // Update user profile
} = useAuth();
```

**Example Usage:**
```typescript
function LoginForm() {
  const { signIn, error, isLoading } = useAuth();
  
  const handleSubmit = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      // Redirect on success
    } catch (err) {
      // Error is also available in hook state
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error">{error.message}</Alert>}
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

**Implementation Details:**
- Stores auth token in localStorage
- Automatically refreshes user data on mount
- Clears all auth data on sign out
- Handles token expiration gracefully

### `useGoogleOAuth` - Google Authentication

Handles Google OAuth integration:

```typescript
const {
  isReady,        // Google SDK loaded and ready
  isLoading,      // OAuth flow in progress
  error,          // Any OAuth errors
  signInWithGoogle // Initiate Google sign-in
} = useGoogleOAuth();
```

**Example Usage:**
```typescript
function GoogleSignInButton() {
  const { signInWithGoogle, isReady, isLoading, error } = useGoogleOAuth();
  
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      console.log('Signed in:', result.user);
    } catch (err) {
      // Handle error
    }
  };
  
  return (
    <button 
      onClick={handleGoogleSignIn}
      disabled={!isReady || isLoading}
    >
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}
```

**Configuration:**
- Requires `VITE_GOOGLE_CLIENT_ID` environment variable
- Automatically loads Google SDK
- Handles popup blockers gracefully

### `useTeams` - Team Management

Manages team operations and state:

```typescript
const {
  teams,          // Array of user's teams
  currentTeam,    // Currently selected team
  isLoading,      // Loading state
  error,          // Any errors
  createTeam,     // Create new team
  updateTeam,     // Update team details
  deleteTeam,     // Delete team
  inviteMembers,  // Send team invitations
  selectTeam      // Switch current team
} = useTeams();
```

**Example Usage:**
```typescript
function TeamSelector() {
  const { teams, currentTeam, selectTeam, isLoading } = useTeams();
  
  if (isLoading) return <Spinner />;
  
  return (
    <select 
      value={currentTeam?.id} 
      onChange={(e) => selectTeam(e.target.value)}
    >
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}
```

**Features:**
- Caches team data to reduce API calls
- Automatically syncs with backend
- Handles team member permissions
- Optimistic updates for better UX

### `useFormValidation` - Form State Management

Simplifies form validation and state management:

```typescript
const {
  values,         // Current form values
  errors,         // Validation errors
  touched,        // Which fields have been touched
  isValid,        // Overall form validity
  isSubmitting,   // Submission state
  handleChange,   // Input change handler
  handleBlur,     // Input blur handler
  handleSubmit,   // Form submit handler
  resetForm,      // Reset to initial values
  setFieldValue,  // Set specific field value
  setFieldError   // Set specific field error
} = useFormValidation({
  initialValues: { email: '', password: '' },
  validationSchema: schema,
  onSubmit: async (values) => {
    // Handle form submission
  }
});
```

**Example Usage:**
```typescript
function ContactForm() {
  const form = useFormValidation({
    initialValues: {
      name: '',
      email: '',
      message: ''
    },
    validationSchema: yup.object({
      name: yup.string().required('Name is required'),
      email: yup.string().email('Invalid email').required('Email is required'),
      message: yup.string().min(10, 'Message too short').required('Message is required')
    }),
    onSubmit: async (values) => {
      await sendContactForm(values);
    }
  });
  
  return (
    <form onSubmit={form.handleSubmit}>
      <input
        name="name"
        value={form.values.name}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.name && form.errors.name && (
        <span className="error">{form.errors.name}</span>
      )}
      
      <input
        name="email"
        type="email"
        value={form.values.email}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.email && form.errors.email && (
        <span className="error">{form.errors.email}</span>
      )}
      
      <textarea
        name="message"
        value={form.values.message}
        onChange={form.handleChange}
        onBlur={form.handleBlur}
      />
      {form.touched.message && form.errors.message && (
        <span className="error">{form.errors.message}</span>
      )}
      
      <button type="submit" disabled={!form.isValid || form.isSubmitting}>
        {form.isSubmitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

**Validation Features:**
- Real-time validation
- Touch tracking for better UX
- Async validation support
- Field-level error handling
- Integration with Yup schemas

## Creating Custom Hooks

### Hook Naming Convention

- Always start with `use` prefix
- Use descriptive names: `useTeamMembers`, not `useData`
- Match the resource/feature: `useAuth`, `useCalendar`

### Basic Hook Pattern

```typescript
// hooks/useExample.ts
import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/ApiService';

interface UseExampleReturn {
  data: ExampleData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useExample(id: string): UseExampleReturn {
  const [data, setData] = useState<ExampleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await ApiService.getExample(id);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, isLoading, error, refetch: fetchData };
}
```

### Advanced Hook Pattern with Context

```typescript
// context/ExampleContext.tsx
const ExampleContext = createContext<ExampleContextValue | null>(null);

export function ExampleProvider({ children }: { children: ReactNode }) {
  // Shared state and logic
  return (
    <ExampleContext.Provider value={contextValue}>
      {children}
    </ExampleContext.Provider>
  );
}

// hooks/useExample.ts
export function useExample() {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within ExampleProvider');
  }
  return context;
}
```

## Testing Hooks

Use React Testing Library's `renderHook`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter());
    
    expect(result.current.count).toBe(0);
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.count).toBe(1);
  });
  
  it('should handle async operations', async () => {
    const { result } = renderHook(() => useAsyncData());
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

## Best Practices

### 1. **Memoization**
Use `useMemo` and `useCallback` to prevent unnecessary rerenders:

```typescript
const expensiveValue = useMemo(() => 
  computeExpensiveValue(data), [data]
);

const stableCallback = useCallback((id: string) => {
  // Do something with id
}, [/* dependencies */]);
```

### 2. **Error Boundaries**
Hooks should handle errors gracefully:

```typescript
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  setError(error);
  // Optionally report to error tracking service
  console.error('Hook error:', error);
}
```

### 3. **Cleanup**
Always cleanup subscriptions and timers:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something
  }, 1000);
  
  return () => clearTimeout(timer);
}, []);
```

### 4. **Type Safety**
Define clear interfaces for hook returns:

```typescript
interface UseDataReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

### 5. **Dependency Arrays**
Be explicit about dependencies:

```typescript
// ❌ Bad - missing dependency
useEffect(() => {
  fetchUser(userId);
}, []); // userId should be in deps

// ✅ Good
useEffect(() => {
  fetchUser(userId);
}, [userId]);
```

## Common Patterns

### Debounced Values
```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}
```

### Local Storage Sync
```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const setStoredValue = useCallback((newValue: T) => {
    setValue(newValue);
    window.localStorage.setItem(key, JSON.stringify(newValue));
  }, [key]);
  
  return [value, setStoredValue] as const;
}
```

### API Fetch Hook
```typescript
export function useApiData<T>(endpoint: string) {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: true,
    error: null
  });
  
  useEffect(() => {
    const abortController = new AbortController();
    
    (async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setState({ data, isLoading: false, error: null });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setState(prev => ({ ...prev, isLoading: false, error }));
        }
      }
    })();
    
    return () => abortController.abort();
  }, [endpoint]);
  
  return state;
}
```

## Performance Tips

1. **Avoid Creating Functions in Render**
   ```typescript
   // ❌ Bad
   <button onClick={() => handleClick(id)}>
   
   // ✅ Good
   const onClick = useCallback(() => handleClick(id), [id]);
   <button onClick={onClick}>
   ```

2. **Use React.memo for Expensive Components**
   ```typescript
   const ExpensiveComponent = React.memo(({ data }) => {
     // Component logic
   });
   ```

3. **Batch State Updates**
   ```typescript
   // React automatically batches these
   setState1(value1);
   setState2(value2);
   setState3(value3);
   ```

## Related Documentation

### Frontend Development
- **[React Components](../components/README.md)** - UI components that consume these hooks
- **[Service Layer](../services/README.md)** - API services that hooks integrate with

### Testing & Quality
- **[Unit & Integration Testing](../../../tests/README.md)** - Hook testing with renderHook and comprehensive patterns
- **[End-to-End Testing](../../../tests-e2e/README.md)** - User workflow validation using hook-powered components