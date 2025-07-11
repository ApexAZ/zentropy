# Example: Creating a Reusable UI Component

This example shows how to create a custom `Badge` component following Zentropy's atomic design principles and semantic color system.

## What You'll Learn

- How to follow atomic design patterns
- How to implement the semantic color system
- How to add proper TypeScript types
- How to write comprehensive component tests
- How to document component usage

## Component Overview

We'll create a **Badge** component that:
- Displays status indicators, counts, or labels
- Supports multiple variants (info, success, warning, error)
- Follows the semantic color system
- Has proper accessibility attributes
- Includes comprehensive tests

## Implementation

### Step 1: Component Implementation

Create `src/client/components/atoms/Badge.tsx`:

```typescript
import React from 'react';

export interface BadgeProps {
  /** The content to display inside the badge */
  children: React.ReactNode;
  
  /** Visual variant of the badge */
  variant?: 'info' | 'success' | 'warning' | 'error' | 'neutral';
  
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether the badge should be rounded (pill shape) */
  rounded?: boolean;
  
  /** Whether the badge has a border */
  outlined?: boolean;
  
  /** Additional CSS classes */
  className?: string;
  
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

/**
 * Badge component for displaying status indicators, counts, or labels
 * 
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" size="sm">3</Badge>
 * <Badge variant="warning" outlined>Pending</Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  rounded = false,
  outlined = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}: BadgeProps) {
  // Base classes for all badges
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-colors',
    'duration-200'
  ];
  
  // Size-specific classes
  const sizeClasses = {
    sm: ['text-xs', 'px-2', 'py-0.5', 'min-w-[1.25rem]', 'h-5'],
    md: ['text-sm', 'px-2.5', 'py-0.5', 'min-w-[1.5rem]', 'h-6'],
    lg: ['text-base', 'px-3', 'py-1', 'min-w-[2rem]', 'h-8']
  };
  
  // Variant-specific classes using semantic colors
  const variantClasses = {
    info: outlined 
      ? ['bg-content-background', 'text-interactive', 'border', 'border-interactive']
      : ['bg-interactive', 'text-white'],
    success: outlined
      ? ['bg-content-background', 'text-green-600', 'border', 'border-green-600']
      : ['bg-green-500', 'text-white'],
    warning: outlined
      ? ['bg-content-background', 'text-orange-600', 'border', 'border-orange-600']
      : ['bg-orange-500', 'text-white'],
    error: outlined
      ? ['bg-content-background', 'text-red-600', 'border', 'border-red-600']
      : ['bg-red-500', 'text-white'],
    neutral: outlined
      ? ['bg-content-background', 'text-text-primary', 'border', 'border-layout-background']
      : ['bg-layout-background', 'text-text-primary']
  };
  
  // Border radius classes
  const roundedClasses = rounded 
    ? ['rounded-full'] 
    : ['rounded'];
  
  // Combine all classes
  const allClasses = [
    ...baseClasses,
    ...sizeClasses[size],
    ...variantClasses[variant],
    ...roundedClasses,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <span
      className={allClasses}
      aria-label={ariaLabel}
      role="status"
      {...props}
    >
      {children}
    </span>
  );
}

// Export types for external use
export type { BadgeProps };
```

### Step 2: Component Tests

Create `src/client/components/atoms/__tests__/Badge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('should render with default props', () => {
    render(<Badge>Default</Badge>);
    
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Default');
    expect(badge).toHaveClass('bg-layout-background', 'text-text-primary');
  });
  
  it('should render different variants', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByRole('status')).toHaveClass('bg-green-500', 'text-white');
    
    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByRole('status')).toHaveClass('bg-red-500', 'text-white');
    
    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByRole('status')).toHaveClass('bg-orange-500', 'text-white');
    
    rerender(<Badge variant="info">Info</Badge>);
    expect(screen.getByRole('status')).toHaveClass('bg-interactive', 'text-white');
  });
  
  it('should render different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByRole('status')).toHaveClass('text-xs', 'h-5');
    
    rerender(<Badge size="md">Medium</Badge>);
    expect(screen.getByRole('status')).toHaveClass('text-sm', 'h-6');
    
    rerender(<Badge size="lg">Large</Badge>);
    expect(screen.getByRole('status')).toHaveClass('text-base', 'h-8');
  });
  
  it('should render outlined variant', () => {
    render(<Badge variant="success" outlined>Outlined</Badge>);
    
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass(
      'bg-content-background',
      'text-green-600',
      'border',
      'border-green-600'
    );
  });
  
  it('should render rounded variant', () => {
    render(<Badge rounded>Rounded</Badge>);
    
    expect(screen.getByRole('status')).toHaveClass('rounded-full');
  });
  
  it('should accept custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>);
    
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });
  
  it('should have proper accessibility attributes', () => {
    render(<Badge aria-label="Custom label">Badge</Badge>);
    
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', 'Custom label');
  });
  
  it('should render numeric content', () => {
    render(<Badge variant="error" size="sm">{5}</Badge>);
    
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('5');
    expect(badge).toHaveClass('text-xs');
  });
  
  it('should handle zero values', () => {
    render(<Badge>{0}</Badge>);
    
    expect(screen.getByRole('status')).toHaveTextContent('0');
  });
  
  it('should render with semantic color classes', () => {
    render(<Badge variant="info">Info Badge</Badge>);
    
    const badge = screen.getByRole('status');
    // Test that semantic color classes are applied
    expect(badge).toHaveClass('bg-interactive');
  });
});
```

### Step 3: Storybook Stories (Optional)

If using Storybook, create `src/client/components/atoms/Badge.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error', 'neutral'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const Outlined: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="info" outlined>Info</Badge>
      <Badge variant="success" outlined>Success</Badge>
      <Badge variant="warning" outlined>Warning</Badge>
      <Badge variant="error" outlined>Error</Badge>
    </div>
  ),
};

export const Rounded: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge rounded>Pill</Badge>
      <Badge variant="error" size="sm" rounded>3</Badge>
      <Badge variant="success" rounded>Online</Badge>
    </div>
  ),
};

export const Numbers: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge variant="error" size="sm" rounded>5</Badge>
      <Badge variant="info" size="sm" rounded>99+</Badge>
      <Badge variant="success" size="sm" rounded>0</Badge>
    </div>
  ),
};

export const RealWorldExamples: Story = {
  render: () => (
    <div className="space-y-4">
      {/* Status indicators */}
      <div className="flex items-center gap-2">
        <span>User Status:</span>
        <Badge variant="success" size="sm">Online</Badge>
      </div>
      
      {/* Notification count */}
      <div className="flex items-center gap-2">
        <span>Notifications</span>
        <Badge variant="error" size="sm" rounded>3</Badge>
      </div>
      
      {/* Project status */}
      <div className="flex items-center gap-2">
        <span>Project:</span>
        <Badge variant="warning" outlined>In Progress</Badge>
      </div>
      
      {/* Feature flags */}
      <div className="flex items-center gap-2">
        <span>Beta Feature:</span>
        <Badge variant="info" size="sm">BETA</Badge>
      </div>
    </div>
  ),
};
```

### Step 4: Usage Examples

Create usage examples in your components:

```typescript
// Example: User status in NavigationPanel
import { Badge } from '../atoms/Badge';

function UserProfile({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2">
      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
      <span>{user.name}</span>
      <Badge 
        variant={user.isOnline ? "success" : "neutral"} 
        size="sm"
        rounded
      >
        {user.isOnline ? "Online" : "Offline"}
      </Badge>
    </div>
  );
}

// Example: Project status in ProjectCard
import { ProjectStatus } from '../services/ProjectService';

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const getVariant = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'on_hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };
  
  return (
    <Badge variant={getVariant(status)} outlined>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}

// Example: Notification count in Header
function NotificationIcon({ count }: { count: number }) {
  return (
    <div className="relative">
      <button className="p-2">
        🔔
      </button>
      {count > 0 && (
        <Badge 
          variant="error" 
          size="sm" 
          rounded 
          className="absolute -top-1 -right-1"
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </div>
  );
}

// Example: Team role badges
function TeamMemberList({ members }: { members: TeamMember[] }) {
  const getRoleVariant = (role: TeamRole) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'LEAD': return 'warning';
      case 'MEMBER': return 'info';
      default: return 'neutral';
    }
  };
  
  return (
    <div className="space-y-2">
      {members.map(member => (
        <div key={member.id} className="flex items-center justify-between">
          <span>{member.user.name}</span>
          <Badge 
            variant={getRoleVariant(member.role)} 
            size="sm"
            outlined
          >
            {member.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}
```

### Step 5: Export and Documentation

Add to `src/client/components/atoms/index.ts`:

```typescript
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
```

Update `src/client/components/README.md` to include the new Badge component:

```markdown
### Badge Component

A versatile badge component for status indicators, counts, and labels:

```typescript
import { Badge } from './atoms/Badge';

// Status indicators
<Badge variant="success">Active</Badge>
<Badge variant="error">Error</Badge>

// Notification counts
<Badge variant="error" size="sm" rounded>5</Badge>

// Outlined style
<Badge variant="warning" outlined>Pending</Badge>
```

**Props:**
- `variant`: 'info' | 'success' | 'warning' | 'error' | 'neutral'
- `size`: 'sm' | 'md' | 'lg'
- `rounded`: boolean - Pill shape
- `outlined`: boolean - Border style
```

## Key Patterns Demonstrated

### ✅ **Atomic Design**
- Single responsibility (status/count display)
- Composable with other components
- Reusable across the application

### ✅ **Semantic Color System**
- Uses semantic classes (`bg-interactive`, `text-primary`)
- Consistent with design system
- Easy theme changes

### ✅ **TypeScript Best Practices**
- Comprehensive interface with JSDoc
- Proper prop types and defaults
- Type exports for external use

### ✅ **Accessibility**
- Proper ARIA roles and labels
- Semantic HTML structure
- Screen reader friendly

### ✅ **Testing Strategy**
- Unit tests for all variants
- Accessibility testing
- Edge case coverage

### ✅ **Documentation**
- JSDoc comments
- Usage examples
- Storybook stories (optional)

## Component Design Principles

### 1. **Flexibility**
- Multiple variants for different use cases
- Size options for different contexts
- Outlined style for subtle indicators

### 2. **Consistency**
- Follows established color patterns
- Matches existing component API design
- Uses semantic naming conventions

### 3. **Performance**
- Lightweight implementation
- Minimal re-renders
- Efficient class composition

### 4. **Maintainability**
- Clear prop interface
- Comprehensive tests
- Well-documented usage

This Badge component demonstrates how to create atomic components that integrate seamlessly with the Zentropy design system while maintaining flexibility and reusability.

## Related Documentation

### Frontend Development
- **[React Components](../../src/client/components/README.md)** - Component architecture patterns and atomic design principles
- **[Design System](../../CLAUDE.md#design-system--semantic-color-variables)** - Semantic color system and styling standards
- **[React Hooks](../../src/client/hooks/README.md)** - Custom hooks for component state management

### Testing & Quality
- **[Unit & Integration Testing](../../tests/README.md)** - Component testing with React Testing Library and user interaction patterns
- **[End-to-End Testing](../../tests-e2e/README.md)** - Complete user workflow testing across component interactions