# Service Layer Documentation

## Overview

The Zentropy service layer provides a clean abstraction over API calls with consistent error handling, type safety, and data transformation. Services act as the bridge between React components/hooks and the backend API, following a static class pattern for stateless operations.

## Architecture

```
services/
├── AuthService.ts    # Authentication operations
├── TeamService.ts    # Team management operations
└── README.md        # This documentation
```

## Service Pattern

### Static Class Design

```typescript
export class ExampleService {
  // Base API URL
  private static readonly API_BASE = '/api/v1';
  
  // Core CRUD operations
  static async create(data: CreateData): Promise<ResponseType> {
    // Implementation
  }
  
  static async getAll(): Promise<ResponseType[]> {
    // Implementation
  }
  
  static async getById(id: string): Promise<ResponseType> {
    // Implementation
  }
  
  static async update(id: string, data: UpdateData): Promise<ResponseType> {
    // Implementation
  }
  
  static async delete(id: string): Promise<void> {
    // Implementation
  }
  
  // Validation methods
  static validate(data: any): ValidationResult {
    // Implementation
  }
}
```

### Common Service Template

```typescript
interface CreateExampleData {
  name: string;
  description?: string;
}

interface Example {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class ExampleService {
  private static readonly API_BASE = '/api/v1/examples';
  
  // Error handling helper
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: "Unknown error" 
      }));
      throw new Error(
        errorData.message || 
        `HTTP ${response.status}: ${response.statusText}`
      );
    }
    return response.json();
  }
  
  // Create operation
  static async create(data: CreateExampleData): Promise<Example> {
    const response = await fetch(this.API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    return this.handleResponse<Example>(response);
  }
  
  // List operation with optional filtering
  static async getAll(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Example[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const url = `${this.API_BASE}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    return this.handleResponse<Example[]>(response);
  }
  
  // Validation method
  static validate(data: CreateExampleData): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!data.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (data.name && data.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
```

## Existing Services

### AuthService

Authentication and user management:

```typescript
import { AuthService } from './AuthService';

// Sign in with email/password
const result = await AuthService.signIn({
  email: 'user@example.com',
  password: 'password123',
  rememberMe: true
});

// Sign up new user
const result = await AuthService.signUp({
  email: 'new@example.com',
  password: 'SecurePassword123!',
  full_name: 'New User'
});

// Google OAuth sign in
const result = await AuthService.oauthSignIn('google', googleCredential);

// Validation utilities
const passwordValid = AuthService.validatePassword('password123');
const emailValid = AuthService.validateEmail('user@example.com');
```

**AuthService Features:**
- **Multi-auth support**: Email/password and Google OAuth
- **Client-side validation**: Password strength and email format
- **Data transformation**: Converts API response to frontend format
- **Remember me**: Persistent login support

### TeamService

Team management operations:

```typescript
import { TeamService } from './TeamService';

// Create new team
const team = await TeamService.createTeam({
  name: 'Development Team',
  description: 'Main development team',
  settings: {
    velocityBaseline: 20,
    sprintDuration: 14
  }
});

// Get all teams
const teams = await TeamService.getTeams();

// Update team
const updatedTeam = await TeamService.updateTeam('team-id', {
  name: 'Updated Team Name'
});

// Delete team
await TeamService.deleteTeam('team-id');

// Validation
const validation = TeamService.validateTeam({
  name: 'Team Name',
  description: 'Description'
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

**TeamService Features:**
- **Full CRUD operations**: Create, read, update, delete teams
- **Client-side validation**: Data validation before API calls
- **Error handling**: Consistent error processing with `handleResponse`
- **Type safety**: Strongly typed interfaces for all operations

## Error Handling

### Three-Layer Error Architecture

```typescript
// 1. Service Layer - Convert HTTP errors to JavaScript errors
private static async handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: "Network error" 
    }));
    
    // Throw structured error
    throw new Error(errorData.detail || errorData.message || 'Unknown error');
  }
  return response.json();
}

// 2. Hook Layer - Catch service errors and update state
const createTeam = useCallback(async (teamData) => {
  try {
    setLoading(true);
    setError(null);
    const team = await TeamService.createTeam(teamData);
    setTeams(prev => [...prev, team]);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setLoading(false);
  }
}, []);

// 3. Component Layer - Display user-friendly errors
function TeamForm() {
  const { createTeam, error, loading } = useTeams();
  
  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Team'}
      </button>
    </form>
  );
}
```

### Error Types

```typescript
// Network errors
catch (err) {
  if (err.message.includes('fetch')) {
    setError('Network connection failed. Please check your connection.');
  }
}

// Authentication errors
if (response.status === 401) {
  setError('Authentication required. Please sign in.');
  // Redirect to login
}

// Validation errors
if (response.status === 400) {
  const errorData = await response.json();
  setError(errorData.detail || 'Invalid input data');
}

// Permission errors
if (response.status === 403) {
  setError('You do not have permission to perform this action.');
}

// Rate limiting
if (response.status === 429) {
  setError('Too many requests. Please try again later.');
}
```

## Type Safety

### Input/Output Type Separation

```typescript
// Input types (for API requests)
interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
}

interface UpdateUserData {
  full_name?: string;
  password?: string;
}

// Output types (for component consumption)
interface AuthUser {
  email: string;
  name: string;
  has_projects_access: boolean;
  email_verified: boolean;
}

// API response types (for service layer)
interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    email: string;
    first_name: string;
    last_name: string;
    has_projects_access: boolean;
    email_verified: boolean;
  };
}
```

### Data Transformation

```typescript
// Transform API response to frontend format
static transformUserData(apiUser: ApiUser): AuthUser {
  return {
    email: apiUser.email,
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    has_projects_access: apiUser.has_projects_access ?? false,
    email_verified: apiUser.email_verified ?? false
  };
}

// Transform frontend data to API format
static transformToApiFormat(userData: CreateUserData): ApiCreateUser {
  const [firstName, ...lastNameParts] = userData.full_name.split(' ');
  return {
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    first_name: firstName || '',
    last_name: lastNameParts.join(' ') || ''
  };
}
```

## Integration with Hooks

### Service → Hook → Component Pattern

```typescript
// 1. Service provides API abstraction
export class UserService {
  static async updateProfile(data: UpdateProfileData): Promise<User> {
    // API call implementation
  }
}

// 2. Hook provides React integration
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateProfile = useCallback(async (data: UpdateProfileData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await UserService.updateProfile(data);
      setUser(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { user, updateProfile, loading, error };
}

// 3. Component consumes through hook
function ProfileForm() {
  const { user, updateProfile, loading, error } = useAuth();
  
  const handleSubmit = async (formData) => {
    await updateProfile(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  );
}
```

## Validation Patterns

### Client-Side Validation

```typescript
interface ValidationRule<T> {
  field: keyof T;
  validate: (value: any) => string | null;
}

export class ValidationService {
  static validateField<T>(
    value: any,
    rules: ValidationRule<T>[]
  ): string | null {
    for (const rule of rules) {
      const error = rule.validate(value);
      if (error) return error;
    }
    return null;
  }
  
  static validateObject<T>(
    data: T,
    fieldRules: Record<keyof T, ValidationRule<T>[]>
  ): ValidationResult {
    const errors: Record<string, string> = {};
    
    for (const [field, rules] of Object.entries(fieldRules)) {
      const error = this.validateField(data[field as keyof T], rules);
      if (error) {
        errors[field] = error;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Usage in service
static validateTeam(data: CreateTeamData): ValidationResult {
  return ValidationService.validateObject(data, {
    name: [
      { field: 'name', validate: (v) => !v?.trim() ? 'Name is required' : null },
      { field: 'name', validate: (v) => v?.length > 100 ? 'Name too long' : null }
    ],
    description: [
      { field: 'description', validate: (v) => v?.length > 500 ? 'Description too long' : null }
    ]
  });
}
```

## Authentication Integration

### Token Management

```typescript
// Token utilities
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

export function setAuthToken(token: string, remember: boolean = false): void {
  if (remember) {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');
  } else {
    sessionStorage.setItem('auth_token', token);
    localStorage.removeItem('auth_token');
  }
}

export function clearAuthToken(): void {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
}

// Authenticated fetch wrapper
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });
}
```

## Testing Services

### Service Testing

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeamService } from './TeamService';

// Mock fetch globally
global.fetch = vi.fn();

describe('TeamService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create team successfully', async () => {
    const mockTeam = {
      id: '123',
      name: 'Test Team',
      description: 'Test description'
    };
    
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTeam)
    } as Response);
    
    const result = await TeamService.createTeam({
      name: 'Test Team',
      description: 'Test description'
    });
    
    expect(result).toEqual(mockTeam);
    expect(fetch).toHaveBeenCalledWith('/api/v1/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token'
      },
      body: JSON.stringify({
        name: 'Test Team',
        description: 'Test description'
      })
    });
  });
  
  it('should handle API errors', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Validation error' })
    } as Response);
    
    await expect(TeamService.createTeam({ name: '' }))
      .rejects
      .toThrow('Validation error');
  });
  
  it('should validate team data', () => {
    const validation = TeamService.validateTeam({
      name: '',
      description: 'Valid description'
    });
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.name).toBe('Team name is required');
  });
});
```

### Integration Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTeams } from '../hooks/useTeams';
import { TeamService } from './TeamService';

vi.mock('./TeamService');

describe('useTeams integration', () => {
  it('should create team and update state', async () => {
    const mockTeam = { id: '123', name: 'Test Team' };
    vi.mocked(TeamService.createTeam).mockResolvedValue(mockTeam);
    
    const { result } = renderHook(() => useTeams());
    
    await act(async () => {
      await result.current.createTeam({ name: 'Test Team' });
    });
    
    expect(result.current.teams).toContainEqual(mockTeam);
    expect(result.current.error).toBeNull();
  });
});
```

## Performance Considerations

### Caching Strategy

```typescript
// Service-level caching
class CachedService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  private static getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private static setCached(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  static async getTeams(): Promise<Team[]> {
    const cacheKey = 'teams';
    const cached = this.getCached<Team[]>(cacheKey);
    
    if (cached) return cached;
    
    const teams = await this.fetchTeams();
    this.setCached(cacheKey, teams);
    return teams;
  }
}
```

### Request Optimization

```typescript
// Debounced search
export function createDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;
  
  return (query: string): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const results = await searchFn(query);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

// Usage
const debouncedTeamSearch = createDebouncedSearch(TeamService.searchTeams);
```

## Best Practices

### 1. **Single Responsibility**
Each service handles one domain (auth, teams, projects, etc.)

### 2. **Type Safety**
Use TypeScript interfaces for all data structures

### 3. **Error Handling**
Implement consistent error handling at the service level

### 4. **Validation**
Provide client-side validation before API calls

### 5. **Authentication**
Include authentication headers in all authenticated requests

### 6. **Testing**
Write comprehensive tests for all service methods

### 7. **Documentation**
Document all public methods with JSDoc comments

```typescript
/**
 * Creates a new team with the provided data
 * @param teamData - The team creation data
 * @returns Promise resolving to the created team
 * @throws Error if validation fails or API request fails
 */
static async createTeam(teamData: CreateTeamData): Promise<Team> {
  // Implementation
}
```

## Related Documentation

- [Hooks Documentation](../hooks/README.md)
- [API Documentation](../../../api/README.md)
- [Component Integration](../components/README.md)
- [Testing Guide](../../../tests/README.md)