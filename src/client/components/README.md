# React Components Documentation

## Overview

The Zentropy component library follows atomic design principles with a focus on reusability, accessibility, and maintainability. All components are built with TypeScript for type safety and use our semantic color system for consistent theming.

## Architecture

```
components/
├── atoms/                    # Atomic components (buttons, inputs, cards)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── __tests__/          # Atomic component tests
├── AuthModal.tsx            # Authentication flow modal
├── NavigationPanel.tsx      # Slide-out navigation menu
├── Header.tsx              # Main application header
├── OAuthProviders.tsx      # OAuth provider selection
├── EmailVerificationStatusBanner.tsx
├── RequiredAsterisk.tsx
└── __tests__/              # Component tests
```

## Atomic Components

### Button Component

A versatile button component with multiple variants and states:

```typescript
import { Button } from './atoms/Button';

// Primary button (default)
<Button onClick={handleClick}>
  Save Changes
</Button>

// Secondary variant
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger variant
<Button variant="danger" onClick={handleDelete}>
  Delete Item
</Button>

// Icon button variant
<Button variant="icon" onClick={handleMenu}>
  ☰
</Button>

// Loading state
<Button loading={true} onClick={handleSubmit}>
  Submitting...
</Button>

// Full width
<Button fullWidth onClick={handleAction}>
  Full Width Button
</Button>

// Disabled state
<Button disabled={!isValid} onClick={handleSubmit}>
  Submit
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'icon'
- `loading`: boolean - Shows loading spinner
- `fullWidth`: boolean - Expands to container width
- `disabled`: boolean - Disables interaction
- Standard button props (onClick, type, className, etc.)

### Input Component

Multi-purpose form field supporting various input types:

```typescript
import { Input } from './atoms/Input';

// Text input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  required
/>

// Password with helper text
<Input
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  helperText="Must be at least 8 characters"
  required
/>

// Textarea
<Input
  label="Description"
  type="textarea"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>

// Select dropdown
<Input
  label="Team Role"
  type="select"
  value={role}
  onChange={(e) => setRole(e.target.value)}
>
  <option value="">Select a role</option>
  <option value="admin">Admin</option>
  <option value="member">Member</option>
  <option value="viewer">Viewer</option>
</Input>
```

**Props:**
- `label`: string - Field label
- `type`: 'text' | 'email' | 'password' | 'textarea' | 'select' | etc.
- `error`: string - Error message to display
- `helperText`: string - Helper text below input
- `required`: boolean - Shows required asterisk
- Standard input props (value, onChange, placeholder, etc.)

### Card Component

Flexible container component for displaying structured content:

```typescript
import { Card } from './atoms/Card';

// Basic card
<Card>
  <p>Simple card content</p>
</Card>

// Card with header
<Card
  title="Project Details"
  description="Overview of the current project"
>
  <p>Card body content</p>
</Card>

// Card with data display
<Card
  title="User Profile"
  data={[
    { label: "Name", value: "John Doe" },
    { label: "Email", value: "john@example.com" },
    { label: "Role", value: "Admin" }
  ]}
/>

// Card with actions and footer
<Card
  title="Team Settings"
  actions={[
    { icon: "✏️", onClick: handleEdit, label: "Edit" },
    { icon: "🗑️", onClick: handleDelete, label: "Delete" }
  ]}
  footer={
    <Button onClick={handleSave}>Save Changes</Button>
  }
>
  <p>Settings content</p>
</Card>
```

**Props:**
- `title`: string - Card header title
- `description`: string - Subtitle text
- `data`: Array<{label: string, value: string}> - Key-value pairs
- `actions`: Array<{icon: string, onClick: () => void, label: string}>
- `footer`: ReactNode - Footer content
- `children`: ReactNode - Main card content

## Application Components

### AuthModal

Comprehensive authentication modal with multiple flows:

```typescript
import { AuthModal } from './AuthModal';

<AuthModal
  isOpen={showAuth}
  onClose={() => setShowAuth(false)}
  onSuccess={(result) => {
    console.log('Authenticated:', result.user);
    // Handle successful authentication
  }}
  initialMode="signin" // or "signup" or "method"
/>
```

**Features:**
- Three modes: method selection, sign in, sign up
- Google OAuth integration
- Form validation with real-time feedback
- Remember me functionality
- Password strength indicators
- Toast notifications for errors

### NavigationPanel

Slide-out navigation menu with user options:

```typescript
import { NavigationPanel } from './NavigationPanel';

<NavigationPanel
  isOpen={showNav}
  onClose={() => setShowNav(false)}
  auth={authState}
  currentPage={currentPage}
  onPageChange={(page) => setCurrentPage(page)}
  onSignOut={handleSignOut}
  onShowAuth={(mode) => {
    setAuthMode(mode);
    setShowAuth(true);
  }}
/>
```

**Features:**
- Authenticated vs unauthenticated states
- Projects sub-menu with expand/collapse
- Keyboard navigation support
- Smooth slide animation
- Click-outside to close

### Header

Main application header with branding and navigation:

```typescript
import { Header } from './Header';

<Header
  currentPage={currentPage}
  auth={authState}
  onPageChange={(page) => navigate(`/${page}`)}
  onSignOut={handleSignOut}
  onShowAuth={(mode) => openAuthModal(mode)}
/>
```

**Features:**
- Zentropy branding
- Navigation links with active states
- Integrated NavigationPanel
- Responsive design

### OAuthProviders

OAuth provider selection grid:

```typescript
import { OAuthProviders } from './OAuthProviders';

<OAuthProviders
  onSuccess={(result) => {
    console.log('OAuth success:', result);
    // Handle OAuth authentication
  }}
  onError={(error) => {
    console.error('OAuth error:', error);
    // Handle OAuth errors
  }}
/>
```

**Features:**
- Google OAuth (active)
- GitHub, Microsoft, Apple (coming soon)
- Visual grid layout
- Loading states
- Error handling

## Design Patterns

### Semantic Color System

All components use semantic color classes defined in `tailwind.config.js` as the single source of truth:

```css
/* Semantic classes used throughout components */
.bg-interactive        /* Interactive elements (buttons, links) */
.bg-interactive-hover  /* Hover states */
.bg-content-background /* Form backgrounds, cards */
.bg-layout-background  /* Page sections, borders */
.text-primary         /* Main text color */
.text-contrast        /* High contrast text */
```

**Color Management:**
- All semantic colors are defined in `tailwind.config.js` under `theme.extend.colors`
- Includes both base colors (interactive, layout-background, etc.) and semantic state colors (error, success, warning, neutral)
- To modify colors, update the values in `tailwind.config.js` - this is the canonical source
- The `styles.css` file contains spacing and radius variables only, not colors

### Consistent Spacing

Use Tailwind spacing utilities consistently:
- `p-4` for standard padding
- `gap-4` for consistent spacing between elements
- `space-y-4` for vertical spacing in forms

### Focus States

All interactive elements have consistent focus states:

```css
focus:border-interactive
focus:shadow-interactive
focus:outline-none
```

## Creating New Components

### Component Template

```typescript
// components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export function MyComponent({ 
  title, 
  onAction,
  children 
}: MyComponentProps) {
  return (
    <div className="bg-content-background p-4 rounded-lg border border-layout-background">
      <h2 className="text-xl font-semibold text-primary mb-4">
        {title}
      </h2>
      {children}
      {onAction && (
        <Button onClick={onAction} className="mt-4">
          Take Action
        </Button>
      )}
    </div>
  );
}
```

### Component Guidelines

1. **TypeScript First**: Define interfaces for all props
2. **Semantic Colors**: Use the semantic color system
3. **Accessibility**: Include ARIA labels and keyboard support
4. **Composition**: Build with smaller components when possible
5. **Testing**: Write user-focused tests

### Test Template

```typescript
// components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render with title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onAction when button clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    
    render(
      <MyComponent title="Test" onAction={onAction}>
        Content
      </MyComponent>
    );
    
    await user.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

## Component Composition

### Building Complex UIs

Combine atomic components to create features:

```typescript
function UserProfileCard({ user }: { user: User }) {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <Card
      title="User Profile"
      actions={[
        { 
          icon: "✏️", 
          onClick: () => setIsEditing(true),
          label: "Edit Profile"
        }
      ]}
    >
      {isEditing ? (
        <form>
          <Input
            label="Name"
            value={user.name}
            onChange={handleNameChange}
            required
          />
          <Input
            label="Email"
            type="email"
            value={user.email}
            onChange={handleEmailChange}
            required
          />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave}>Save</Button>
            <Button 
              variant="secondary" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      )}
    </Card>
  );
}
```

## Best Practices

### 1. **Component Size**
- Keep components focused on a single responsibility
- Extract complex logic into custom hooks
- Break down large components into smaller ones

### 2. **Props Design**
```typescript
// ✅ Good - Clear, typed props
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  onClick: () => void;
}

// ❌ Bad - Ambiguous props
interface ButtonProps {
  type?: string;
  state?: any;
  handler: Function;
}
```

### 3. **State Management**
- Use local state for UI-only concerns
- Lift state up when shared between components
- Use custom hooks for complex state logic

### 4. **Performance**
- Memoize expensive computations with `useMemo`
- Use `React.memo` for expensive components
- Avoid creating functions in render

### 5. **Accessibility**
```typescript
// Always include proper ARIA attributes
<button
  onClick={handleClick}
  aria-label="Close dialog"
  aria-pressed={isPressed}
>
  ×
</button>

// Ensure keyboard navigation
<div
  role="menu"
  onKeyDown={handleKeyDown}
  tabIndex={0}
>
```

## Testing Components

### Testing Principles

1. **Test user behavior, not implementation**
2. **Use Testing Library queries in order of preference**
3. **Write tests that give confidence**

### Query Priority

```typescript
// 1. Queries accessible to everyone
getByRole, getByLabelText, getByPlaceholderText, getByText

// 2. Semantic queries
getByAltText, getByTitle

// 3. Test IDs (last resort)
getByTestId
```

### Common Test Patterns

```typescript
// Testing form submission
it('should submit form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  render(<MyForm onSubmit={onSubmit} />);
  
  await user.type(screen.getByLabelText(/name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(onSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com'
  });
});

// Testing conditional rendering
it('should show error state', () => {
  render(<MyComponent error="Something went wrong" />);
  
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Something went wrong'
  );
});
```

## Migration Guide

When updating existing components:

1. **Replace hardcoded colors** with semantic classes
2. **Add TypeScript types** if missing
3. **Ensure accessibility** attributes are present
4. **Write tests** if they don't exist
5. **Document props** with JSDoc comments

## Related Documentation

- [Hooks Documentation](../hooks/README.md)
- [Testing Guide](../../../tests/README.md)
- [Design System](../../../CLAUDE.md#design-system--semantic-color-variables)