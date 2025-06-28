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
npm run test:quality                  # Run tests + lint + format + type-check (RECOMMENDED)

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

### Environment Setup
```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your database credentials and session secret
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
├── client/          # Frontend TypeScript code and components (currently minimal)
├── shared/          # Shared utilities and types (currently minimal)
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

@CLAUDEQuality.md
**Testing Architecture**: Comprehensive three-layer testing approach

### Test-Driven Development (TDD)
**MANDATORY**: Always write tests before implementation. See [CLAUDEQuality.md](./CLAUDEQuality.md) for complete TDD workflow and testing standards.
**📋 For complete testing standards, methodology, and best practices, see [CLAUDEQuality.md](./CLAUDEQuality.md)**

## Development Standards

**Security-Critical TDD Requirements**:
- **Algorithm verification**: All security algorithms (Levenshtein distance, password strength, etc.) must have tests that verify correct behavior
- **Edge case coverage**: Security functions must test boundary conditions, unicode handling, concurrent operations
- **Threshold calibration**: Password strength scoring must be tested against expected ranges
- **Never assume security works**: Always verify through tests that similarity detection, password policies, etc. function as designed

### TypeScript Standards
@CLAUDEESLintRules.md
**MANDATORY**: **MANDATORY**: Always write code using TypeScript standards. See [CLAUDEESLintRules.md](./CLAUDEESLintRules.md) for complete TDD workflow and testing standards.


### Security Standards
**CRITICAL**: Security implementations must never compromise on algorithmic rigor
- **Password hashing**: bcrypt with minimum 12 salt rounds
- **Password similarity detection**: Full Levenshtein distance algorithm (never simplified alternatives)
- **Password validation**: Multi-layered approach - length, complexity, forbidden patterns, user info detection, reuse prevention
- **Password strength thresholds**: Very Weak <20, Weak 20-39, Fair 40-59, Good 60-79, Excellent 80+
- **Similarity threshold**: 70% similarity triggers reuse prevention
- **Rate limiting**: Protection against brute force and automated attacks
  - Login: 5 attempts per 15 minutes per IP+email
  - Password updates: 3 attempts per 30 minutes per IP+user
  - User creation: 2 attempts per hour per IP
  - General API: 100 requests per 15 minutes per IP
- **Input validation**: Comprehensive validation for all security-critical functions
- **Test coverage**: All security algorithms must have comprehensive test coverage including edge cases

### Service Architecture Patterns
```typescript
// Validation utility pattern (static methods for stateless operations)
export class PasswordPolicy {
    static validatePassword(password: string, options?: ValidationOptions): ValidationResult {
        // Pure validation logic
    }
}

// Service pattern (instance methods for stateful/async operations)  
export class PasswordService {
    async hashPassword(password: string): Promise<string> {
        // Stateful operations with external dependencies
    }
}
```

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
- `.env.example`: Environment configuration template
- `src/config/environment.ts`: Type-safe environment variable handling

## Testing
Complete testing strategy, patterns, and best practices documented in [CLAUDEQuality.md](./CLAUDEQuality.md).

## Current Project Status
@CLAUDETasks.md
See [CLAUDETasks.md](./CLAUDETasks.md) for current implementation status, roadmap, and task tracking.

## Temporary Session Recap (2025-06-28)
**Current Work**: Systematic ESLint Compliance Improvement
- ✅ **36% reduction** in ESLint problems: 684 → 438 issues
- ✅ **33% reduction** in ESLint errors: 488 → 327 errors  
- ✅ **11 files** made fully ESLint compliant
- ✅ 405 tests passing (100% success rate)
- ✅ Established consistent type-safe patterns for test files
- ✅ Fixed critical unsafe assignment/member access issues

**Next Steps**: 
1. Continue ESLint error reduction in integration test files
2. Address model test files with complex mocking patterns
3. Complete remaining unsafe assignment fixes
4. Target achieving 0 ESLint errors across entire codebase

**Resume Point**: Continue with `src/__tests__/integration/i-session-authentication.test.ts` (28 errors) - see CLAUDETasks.md for detailed plan

