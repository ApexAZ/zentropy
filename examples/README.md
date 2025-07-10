# Zentropy Examples

This directory contains complete, working examples of how to extend the Zentropy application. Each example includes backend changes, frontend changes, tests, and step-by-step implementation guides.

## Available Examples

### 1. [Adding a New CRUD Feature](./adding-new-feature/)
**Complete end-to-end example of adding a "Projects" feature**

Learn how to:
- Create database models with SQLAlchemy
- Implement RESTful API endpoints
- Build React components with TypeScript
- Write comprehensive tests
- Follow established patterns

**Includes:** Database model, API router, React service, custom hook, UI components, and tests.

### 2. [Creating a Reusable UI Component](./ui-component/)
**Build a custom component following atomic design principles**

Learn how to:
- Follow the established component patterns
- Implement the semantic color system
- Add proper TypeScript types
- Write component tests
- Document component usage

**Includes:** Component implementation, usage examples, tests, and documentation.

### 3. [Adding a New OAuth Provider](./oauth-provider/)
**Integrate GitHub OAuth alongside existing Google OAuth**

Learn how to:
- Extend the OAuth system
- Add new authentication flows
- Update the UI for multiple providers
- Handle provider-specific data
- Test OAuth integrations

**Includes:** Backend OAuth handler, frontend integration, provider selection UI, and tests.

## How to Use These Examples

### 1. **Study the Structure**
Each example follows the same pattern:
```
example-name/
├── README.md           # Step-by-step guide
├── backend/           # API changes
├── frontend/          # React changes
├── tests/             # Test examples
└── migration.md       # Database changes (if needed)
```

### 2. **Follow the Guide**
- Read the `README.md` for overview and steps
- Copy code snippets and adapt to your needs
- Follow the testing examples
- Use the migration guide for database changes

### 3. **Adapt for Your Feature**
- Use examples as templates
- Follow the established patterns
- Maintain consistency with existing code
- Write tests following the examples

## General Implementation Pattern

All examples follow this consistent pattern:

### Backend Implementation
1. **Database Model** (`api/database.py`)
2. **Pydantic Schemas** (`api/schemas.py`)
3. **API Router** (`api/routers/`)
4. **Register Router** (`api/main.py`)
5. **Database Migration** (if needed)

### Frontend Implementation
1. **TypeScript Types** (shared interfaces)
2. **API Service** (`src/client/services/`)
3. **Custom Hook** (`src/client/hooks/`)
4. **React Components** (`src/client/components/`)
5. **Page Integration** (`src/client/pages/`)

### Testing Implementation
1. **Backend Tests** (`tests/`)
2. **Frontend Tests** (`src/client/**/__tests__/`)
3. **Integration Tests** (API + UI)

## Development Workflow

### 1. **Start with the Backend**
```bash
# Add database model
# Create API schemas
# Implement router endpoints
# Register in main.py
```

### 2. **Build the Frontend**
```bash
# Create service layer
# Build custom hook
# Create UI components
# Integrate into pages
```

### 3. **Write Tests**
```bash
# Backend API tests
# Frontend component tests
# Integration tests
```

### 4. **Test End-to-End**
```bash
npm run dev          # Start development servers
npm test             # Run all tests
npm run quality      # Check code quality
```

## Code Quality Standards

All examples demonstrate:

### ✅ **Type Safety**
- TypeScript interfaces for all data
- Pydantic schemas for API validation
- Proper error handling with types

### ✅ **Testing**
- Unit tests for business logic
- Integration tests for API endpoints
- Component tests for UI behavior

### ✅ **Documentation**
- Clear README with step-by-step guide
- Code comments explaining complex logic
- Usage examples for all public APIs

### ✅ **Consistency**
- Follow established naming conventions
- Use semantic color system
- Match existing code patterns

### ✅ **Security**
- Proper authentication checks
- Input validation and sanitization
- Rate limiting where appropriate

### 💡 Pro Tip: Robust API Mocking in Tests

When writing frontend tests, always use a robust mocking strategy for API calls. Instead of chaining multiple `.mockResolvedValueOnce()`, use `.mockImplementation()` to create a resilient mock that can handle multiple calls without breaking.

For a detailed guide and examples, see the **Frontend API Mocking** section in the main [Testing & Quality Handbook](../tests/README.md).

## Example Usage Snippets

### Quick Reference for Common Tasks

#### Adding a New Database Model
```python
# In api/database.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, DateTime
import uuid
from datetime import datetime, timezone

class NewModel(Base):
    __tablename__ = "new_models"
    
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="new_models")
```

#### Creating a Service Class
```typescript
// In src/client/services/
export class NewService {
  private static readonly API_BASE = '/api/v1/new-resource';
  
  static async create(data: CreateData): Promise<Resource> {
    const response = await fetch(this.API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(data)
    });
    
    return this.handleResponse<Resource>(response);
  }
}
```

#### Building a Custom Hook
```typescript
// In src/client/hooks/
export function useNewFeature() {
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const create = useCallback(async (createData: CreateData) => {
    try {
      setLoading(true);
      const newItem = await NewService.create(createData);
      setData(prev => [...prev, newItem]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { data, create, loading, error };
}
```

## Contributing New Examples

### Suggesting New Examples
If you have ideas for new examples:
1. Open an issue describing the example
2. Explain what patterns it would demonstrate
3. Outline the learning objectives

### Creating Examples
When creating new examples:
1. Follow the established directory structure
2. Include complete, working code
3. Write comprehensive documentation
4. Add thorough test coverage
5. Demonstrate best practices

## Getting Help

### Resources
- **Architecture Guide**: `/docs/architecture/README.md`
- **Module Documentation**: Individual README files in each module
- **Testing Guide**: `/tests/README.md`
- **API Documentation**: Auto-generated at `http://localhost:3000/docs`

### Support
- Review existing examples for patterns
- Check module documentation for specific guidance
- Use the auto-isolation testing system for reliable tests
- Follow the semantic color system for UI consistency

---

**Happy coding!** These examples will help you extend Zentropy while maintaining the established quality and consistency standards.