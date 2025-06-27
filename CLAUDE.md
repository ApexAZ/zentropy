# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Sprint Capacity Planning Tool for agile teams built with Node.js, Express, PostgreSQL, and TypeScript. The application helps teams calculate sprint capacity based on team velocity and calendar availability (PTO, holidays, etc.).

**📋 For project roadmap, development tasks, and implementation tracking, see [CLAUDETasks.md](./CLAUDETasks.md)**

## Development Commands

### Essential Commands
```bash
# Database setup
docker-compose up -d                    # Start PostgreSQL container

# Development
npm run dev                            # Start development server with file watching
npm run build                          # Build project (includes linting and static file copy)
npm start                             # Start production server

# Testing
npm test                              # Run all tests with Vitest
npm run test:watch                    # Run tests in watch mode
npm run test:integration              # Run integration tests only
npm run test:ui                       # Open Vitest UI

# Code Quality
npm run lint                          # Auto-fix ESLint issues
npm run lint:check                    # Check linting without fixing
npm run format                        # Format code with Prettier
npm run quality                       # Run all quality checks (lint, format, type-check)
npm run type-check                    # TypeScript compilation check

# Static Files
npm run dev:copy                      # Copy static files to dist/public
npm run check-static                  # Verify static files are present
```

### Health Checks
```bash
curl http://localhost:3000/health      # Check server and database status
```

## Architecture Overview

### High-Level Structure
```
src/
├── server/          # Express app configuration and middleware
├── routes/          # API endpoints organized by feature
├── models/          # Database models with static CRUD methods
├── services/        # Business logic (working days calculator, etc.)
├── utils/           # Shared utilities and validation
├── config/          # Environment configuration
├── database/        # Database connection and schema
├── public/          # Static frontend files (HTML, CSS, TypeScript)
└── __tests__/       # Comprehensive test suite
```

### Key Architectural Patterns

**Database Layer**: PostgreSQL with static class methods for CRUD operations
- Models extend static classes: `UserModel.create()`, `TeamModel.findById()`
- Parameterized queries with `$1, $2` syntax for SQL injection prevention
- Connection pooling managed in `src/database/connection.ts`

**API Layer**: Express.js with TypeScript request/response interfaces
- Route handlers in `src/routes/` organized by feature
- Consistent error handling and HTTP status codes
- Request body validation with TypeScript interfaces

**Frontend**: Vanilla TypeScript with event delegation pattern
- Type-safe DOM manipulation without frameworks
- Event delegation using `data-action` attributes
- Modular functions for calendar, team management, etc.

**Testing Architecture**: Comprehensive three-layer testing approach

**📋 For complete testing standards, methodology, and best practices, see [CLAUDEQuality.md](./CLAUDEQuality.md)**

## Development Standards

### Test-Driven Development (TDD)
**MANDATORY**: Always write tests before implementation. See [CLAUDEQuality.md](./CLAUDEQuality.md) for complete TDD workflow and testing standards.

### TypeScript Standards
- Strict compilation with `noImplicitReturns`, `noUncheckedIndexedAccess`
- Interface naming: `CreateXData` for creation, `XRequestBody` for API requests
- Use nullish coalescing (`??`) instead of logical OR (`||`) for safer null handling
- No `any` types - use proper type definitions

### Database Patterns
```typescript
// Model pattern
export class SomeModel {
    static async create(data: CreateSomeData): Promise<Some> {
        const query = `INSERT INTO table (col1, col2) VALUES ($1, $2) RETURNING *`;
        const result = await pool.query(query, [data.col1, data.col2]);
        return result.rows[0] as Some;
    }
}
```

### API Route Pattern
```typescript
// Request body interface
interface SomeRequestBody {
    field1: string;
    field2?: number;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SomeRequestBody;
    // Validation, business logic, response
});
```

### Frontend Event Delegation
```typescript
// Event delegation pattern
document.addEventListener('click', (event: Event) => {
    const target = event.target as HTMLElement;
    const action = target.dataset.action;
    if (!action) return;
    
    switch (action) {
        case 'some-action':
            handleSomeAction(target.dataset.someId ?? '');
            break;
    }
});
```

## Database Schema

**Core Tables**:
- `users`: User accounts with roles (team_lead, team_member)
- `teams`: Team configuration with velocity and sprint settings
- `calendar_entries`: PTO, holidays, and time-off entries
- `team_memberships`: Many-to-many relationship between users and teams

**Key Relationships**:
- Users belong to multiple teams via team_memberships
- Calendar entries link to both user_id and team_id for capacity calculation
- Working days calculator integrates with calendar entries for sprint planning

## Critical Configuration Files

- `vitest.config.ts`: Test configuration supporting both src/ and tests/ directories
- `docker-compose.yml`: PostgreSQL container setup for local development
- `src/database/init.sql`: Complete database schema with constraints
- `tsconfig.json`: Strict TypeScript compilation settings
- `package.json`: Build scripts with static file management

## Testing
Complete testing strategy, patterns, and best practices documented in [CLAUDEQuality.md](./CLAUDEQuality.md).

