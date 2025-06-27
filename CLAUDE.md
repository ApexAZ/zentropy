# Capacity Planner Project Memory

## Project Overview
- Building a Sprint Capacity Planning Tool for agile teams
- **Phase 1 MVP**: Basic team management, calendar system, and capacity calculation
- **Phase 2**: Advanced features including React migration, multi-team support, and Azure deployment
- **Target Users**: Team Leads and Team Members in agile development teams
- **Core Functionality**: Automated sprint capacity calculation based on team velocity and calendar availability

## Development Preferences
- Use clear, descriptive variable names
- Follow consistent code formatting
- Add comments only when explicitly requested

## Test-Driven Development (TDD) Requirements
### **CRITICAL: Always Write Tests First**
- **MANDATORY**: Write unit tests BEFORE implementing any new functionality
- **Test Structure**: Follow Arrange-Act-Assert pattern consistently
- **Coverage**: Every public method must have comprehensive test coverage
- **Error Cases**: Always test both success and failure scenarios
- **Edge Cases**: Test boundary conditions, null inputs, invalid data
- **Mocking**: Use consistent mocking patterns for database and external dependencies

### **TDD Workflow (STRICTLY ENFORCE)**
1. **Red**: Write a failing test that describes the desired functionality
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: Continue cycle for each small increment of functionality

### **Quality Standards (NON-NEGOTIABLE)**
- **Readability**: Code must be self-documenting with clear intent
- **Debuggability**: Include proper error messages and logging for troubleshooting
- **Scalability**: Design for growth - avoid hardcoded limits, use efficient algorithms
- **Maintainability**: Follow SOLID principles and separation of concerns
- **Consistency**: Adhere to established patterns and naming conventions
- **Industry Standards**: Follow TypeScript/Node.js best practices

## Coding Standards & Patterns
### Import Standards
- Use ES6 import syntax consistently: `import { item } from 'module'`
- Use relative paths for internal modules: `import { pool } from '../database/connection'`
- Avoid namespace imports (`import * as`) unless necessary

### TypeScript Standards
- Use proper union types: `(Date | string)[]` instead of `any[]`
- Consistent interface naming: `CreateXData` for creation interfaces
- Use optional properties with `?` for nullable fields
- Consistent null handling: `|| null` for database inserts, `|| 0` for numbers

### Error Handling Standards
- Wrap all database operations in try-catch blocks
- Log errors with descriptive context: `console.error('Error creating user:', error)`
- Always re-throw errors to preserve stack traces: `throw error`
- Use consistent null safety: `(result.rowCount || 0) > 0`

### Database Model Standards
- Use static class methods for all CRUD operations
- Consistent method naming: `create`, `findById`, `findAll`, `update`, `delete`
- Always use parameterized queries with `$1, $2, etc.`
- Return `Promise<T>` for single items, `Promise<T[]>` for arrays
- Return `Promise<boolean>` for delete operations
- Use `RETURNING *` for insert/update operations

### Code Style Standards
- Use tabs for indentation (as per user preference)
- Double quotes for strings (as per user preference)
- Semicolons required (as per user preference)
- Consistent query formatting with proper indentation
- Use descriptive variable names: `setClause`, `values`, `result`

### Naming Conventions (ENFORCE CONSISTENTLY)
- **Classes**: PascalCase (`UserModel`, `TeamService`)
- **Functions/Methods**: camelCase (`createUser`, `calculateCapacity`)
- **Variables**: camelCase (`userData`, `sprintLength`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_TEAM_SIZE`, `DEFAULT_SPRINT_DAYS`)
- **Files**: kebab-case (`user-service.ts`, `capacity-calculator.ts`)
- **Database Tables**: snake_case (`team_memberships`, `calendar_entries`)
- **Interfaces**: PascalCase with descriptive suffixes (`CreateUserData`, `SprintConfig`)

### Architecture Standards (MAINTAIN SCALABILITY)
- **Single Responsibility**: Each class/function has one clear purpose
- **Dependency Injection**: Pass dependencies rather than hardcoding them
- **Error Boundaries**: Proper error handling at appropriate layers
- **Logging**: Structured logging for production debugging
- **Performance**: Consider time complexity and database query efficiency
- **Security**: Input validation, SQL injection prevention, sensitive data handling

## Project Structure
- Main project directory: capacity-planner/

## Setup Complete
- Installed Vitest package for TDD workflow
- Created basic calculator app with tests to validate TDD framework
- Tests: calculator.test.js with 3 passing tests (add, subtract, multiply)
- Implementation: calculator.js with basic math functions
- Test command: `npm test` (working correctly)
- VS Code setup: Successfully got Vitest Test Explorer working in WSL
- Created vitest.config.js and .vscode/settings.json to enable Test Explorer
- Test Explorer now visible in Activity Bar - TDD setup complete

## Technical Stack
- **Frontend**: Vanilla TypeScript (Phase 1) → React + TypeScript (Phase 2)
- **Backend**: Node.js + Express with RESTful API
- **Database**: PostgreSQL (Docker for local development)
- **Testing**: Vitest with TDD approach
- **Hosting**: Local development (Phase 1) → Azure (Phase 2)

## Development Approach
- **Learning-focused**: Start with simpler vanilla TypeScript to understand fundamentals
- **Vertical Slices**: Build complete features from database to frontend for immediate testing
- **INVEST Principles**: All feature development follows INVEST criteria for optimal feedback
- **TDD-First**: ALWAYS write comprehensive tests before any implementation
- **Iterative**: Each slice should be fully functional and testable before moving to next
- **Quality-Driven**: Prioritize readability, debuggability, and scalability over speed
- **Pattern Consistency**: Follow established patterns religiously for maintainability

## Vertical Slice Development Standards (INVEST)
### **INVEST Criteria for All Feature Development**
- **Independent**: Each slice should be self-contained and not dependent on other unfinished slices
- **Negotiable**: Scope can be adjusted based on learning and feedback during implementation  
- **Valuable**: Each slice delivers working functionality that users can actually test and interact with
- **Estimable**: Slice scope should be small enough to complete and test within a reasonable timeframe
- **Small**: Keep slices minimal - focus on core functionality, avoid feature creep
- **Testable**: Each slice must include both automated tests and manual functional testing

### **Vertical Slice Structure Requirements**
- **Full Stack**: Every slice must include database → API → frontend → tests
- **End-to-End Functionality**: Users should be able to complete a real workflow through the web interface
- **Immediate Feedback**: Each slice should be demonstrable and testable upon completion
- **Iterative Validation**: Validate assumptions and gather feedback before building the next slice
- **Progressive Enhancement**: Each slice builds upon previous functionality without breaking existing features

## Development Roadmap (Vertical Slice Approach)

### **Foundation Complete ✅**
- **Database Setup**: PostgreSQL schema, Docker setup, connection pooling
- **Project Structure**: TypeScript build config, folder organization, basic tooling
- **Basic Web Server**: Express server with JSON API endpoints
- **Core Data Models**: User, Team, CalendarEntry models with full CRUD operations
- **Working Days Calculator**: Complete business logic with comprehensive unit tests (21 tests)

### **Vertical Slice 1: Working Days Calculator Interface** ✅ **COMPLETED**
- **HTML Form Interface**: Date inputs, working days configuration, submit functionality
- **API Endpoint**: Accept form data, process with existing calculator, return results
- **Static File Serving**: Configure Express to serve HTML/CSS/JS files
- **Results Display**: Show calculated working days, holidays, weekends excluded
- **Integration Tests**: Test full form submission → API → response workflow
- **Functional Testing**: Manual testing through browser interface

### **Vertical Slice 2: Team Management** ✅ **COMPLETED**
- **Team Creation Form**: Name, description, velocity, sprint length inputs
- **Team List Page**: Display existing teams, edit/delete functionality
- **Member Management**: Add/remove team members with role selection
- **API Endpoints**: Full CRUD operations for teams and memberships
- **Database Integration**: Use existing Team and User models
- **Testing**: Unit tests for API + functional tests for web interface
- **Comprehensive Testing**: 142 tests passing (Unit + Integration + API tests)

### **Vertical Slice 3: Calendar Entry Management**
- **PTO Entry Form**: Date range picker, entry type selection, description
- **Calendar View**: Month view showing team member availability
- **Capacity Impact Display**: Real-time calculation of sprint capacity impact
- **API Endpoints**: CRUD operations for calendar entries
- **Integration**: Connect calendar entries to working days calculator
- **Testing**: Full workflow testing from PTO entry to capacity calculation

### **Vertical Slice 4: Sprint Capacity Dashboard**
- **Sprint Generator**: Auto-create sprints based on team configuration
- **Capacity Dashboard**: Real-time capacity visualization with team availability
- **Sprint Planning Interface**: Adjust capacity, view team member schedules
- **Complete Workflow**: End-to-end capacity planning from team setup to sprint delivery
- **Advanced Features**: Multi-team support, capacity forecasting, reporting

## Key Features (Phase 1 MVP)
1. **Basic User Management**: Team Lead vs Team Member roles
2. **Single Team Management**: Create team, manage members, set velocity baseline
3. **Core Calendar**: Log PTO/holidays, basic date range selection
4. **Capacity Calculation**: Automated sprint capacity based on availability
5. **Simple Dashboard**: Display current sprint capacity with real-time updates

## Current Session Status - 2025-06-27 EVENING
- **Status**: JavaScript → TypeScript migration COMPLETE, Server operational
- **Active Server**: Running on http://localhost:3000 with database connected
- **Teams Page**: Fully functional at http://localhost:3000/teams.html
- **Test Suite**: Cleaned up and streamlined - 182 tests passing
- **GitHub**: Latest commit 970ee39 - all changes committed and pushed

### **Major Accomplishments This Session** ✅ **COMPLETED**
1. **Complete JS → TS Migration**: 
   - Converted all source JavaScript files to TypeScript with strict type safety
   - Fixed 24+ linting errors with proper type assertions and null safety
   - Updated build pipeline for TypeScript compilation
   
2. **Frontend TypeScript Implementation**:
   - `/src/public/teams.ts` - Complete team management with interfaces and type safety
   - DOM type assertions, nullish coalescing, proper error handling
   - 50 new frontend TypeScript tests across 3 test files
   
3. **Test Suite Overhaul**:
   - Removed obsolete integration tests for deleted pages/utilities
   - Fixed broken imports after shared utilities deletion
   - Created replacement `test-data-factory.ts` for consistent test data
   - Streamlined from 25+ test files to 11 focused, relevant files
   - All 182 tests passing with TypeScript alignment

4. **Server Integration Success**:
   - Express server serving TypeScript-compiled JavaScript
   - Static file serving working for HTML, CSS, and compiled JS
   - Health check endpoint operational with database connection
   - Teams page rendering properly with all assets

## Next Steps for Tomorrow's Session
### **Priority 1: Database Integration & API Testing**
1. **Start Database Container**: 
   - `docker-compose up -d` to start PostgreSQL
   - Verify database connection and schema creation
   - Test all API endpoints: GET/POST/PUT/DELETE /api/teams

2. **Complete Team Workflow Testing**:
   - Test team creation form through browser
   - Verify validation errors display properly
   - Test team editing and deletion workflows
   - Confirm API integration works end-to-end

### **Priority 2: Calendar Integration (Vertical Slice 3)**
1. **Calendar Entry Management**:
   - Build PTO entry form interface
   - Implement calendar view for team availability
   - Connect calendar entries to capacity calculations

2. **Working Days Integration**:
   - Link calendar entries to working days calculator
   - Real-time capacity impact display
   - Test full workflow from PTO entry to capacity calculation

### **Priority 3: Sprint Capacity Dashboard (Vertical Slice 4)**
1. **Sprint Management**:
   - Auto-generate sprints based on team configuration
   - Sprint planning interface with capacity visualization
   - Complete end-to-end capacity planning workflow

## Current Development Tasks

### **Foundation + Team Management** ✅ **COMPLETED**
- [x] **Project Structure**: TypeScript config, build pipeline, static file serving
- [x] **Database Setup**: PostgreSQL schema, Docker container, connection pooling  
- [x] **Data Models**: User, Team, CalendarEntry models with full CRUD operations
- [x] **Express Server**: JSON API endpoints with TypeScript compilation
- [x] **Working Days Calculator**: Complete business logic with 21 comprehensive tests
- [x] **Team Management UI**: Complete TypeScript interface with type safety
- [x] **Team API Endpoints**: RESTful API with validation and error handling
- [x] **JavaScript → TypeScript Migration**: All source files converted with strict typing
- [x] **Test Suite Cleanup**: 182 tests passing, obsolete tests removed
- [x] **Server Integration**: Teams page fully operational at http://localhost:3000/teams.html

### **Testing Strategy Documentation** ✅ **COMPLETED**
- **Test Architecture**: Three-layer testing approach (Unit → API → Integration)
- **Mock Strategy**: Consistent mocking patterns using Vitest vi.mock()
- **Date Handling**: Proper serialization testing with expect.any(String)
- **Error Scenarios**: Comprehensive validation and database error testing
- **TypeScript Integration**: Full type safety in tests with proper mock typing

## Files Created This Session
### Configuration Files:
- `tsconfig.json` - TypeScript configuration with path mapping
- `docker-compose.yml` - PostgreSQL container setup
- `.env` / `.env.example` - Environment configuration
- `.gitignore` - Git ignore patterns

### Database Layer:
- `src/database/init.sql` - Complete database schema
- `src/database/connection.ts` - Connection pool management

### Data Models:
- `src/models/User.ts` - User CRUD operations with roles  
- `src/models/Team.ts` - Team management with memberships
- `src/models/CalendarEntry.ts` - Calendar entries with conflict detection

### Server:
- `src/server/index.ts` - Express server with health checks

### Package Configuration:
- Updated `package.json` with dependencies and build scripts

## Test Quality Audit Summary ✅ **COMPLETED**

### Test Architecture Improvements:
- **Created Base Test Classes**: Established `BaseHtmlValidator`, `IntegrationHttpClient`, `BaseTestScenarios` in `/tests/shared/base-integration-test.ts`
- **Consistent Test Patterns**: All integration tests now extend base classes for HTML validation, HTTP requests, and security testing
- **Test Data Factories**: Implemented factory pattern for creating test data with `TestDataFactory` base class and specialized extensions
- **Reduced Code Duplication**: Eliminated repetitive validation logic across test files

### Files Refactored:
1. **Integration Tests**:
   - `tests/integration/calendar-interface.test.ts` - Now extends base classes, uses consistent validation patterns
   - `tests/integration/team-configuration.test.ts` - Refactored to use base HTTP client and validators
   
2. **Unit Tests**:
   - `src/__tests__/services/working-days-calculator.test.ts` - Enhanced with specialized test data factory
   - `src/__tests__/models/User.test.ts` - Added test data factories for consistent mock data
   - `src/__tests__/models/Team.test.ts` - Implemented factory pattern for team and membership data

### Test Quality Standards Established:
- **Consistent Error Handling**: All tests use standardized error assertion patterns
- **Security Testing**: Base security tests for path traversal protection added to all integration tests
- **HTML Validation**: Standardized HTML structure validation with reusable methods
- **Mock Data Management**: Factory pattern ensures consistent test data across all tests

### Testing Strategy Documentation:
- Base classes provide foundation for future test development
- Factory pattern scales easily for new models and data types
- Integration tests follow consistent HTTP client patterns
- All tests maintain separation of concerns with specialized validators

## Comprehensive Code Audit ✅ **IN PROGRESS**

### **Critical Infrastructure Improvements Applied:**

1. **TypeScript Configuration Enhanced**:
   - Added strict compilation flags: `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
   - Improved type safety and error detection
   - Better IntelliSense and development experience

2. **Code Quality Tools Added**:
   - **ESLint**: TypeScript-specific linting rules and best practices
   - **Prettier**: Consistent code formatting across the project
   - **Quality Scripts**: `npm run quality` for comprehensive checks

3. **Database Schema Improvements**:
   - Added data validation constraints for email, names, and business rules
   - Enhanced with `is_active` flags and audit fields
   - Improved constraint naming and validation logic

4. **HTML SEO & Accessibility**:
   - Added meta descriptions, keywords, and proper robots directives
   - Favicon support and consistent head structure
   - Semantic markup improvements

5. **Validation & Error Handling**:
   - Created `/src/utils/validation.ts` with comprehensive input validation
   - Type-safe validation functions with descriptive error messages
   - Consistent error handling patterns

6. **Environment Configuration**:
   - Added `/src/config/environment.ts` with type-safe configuration
   - Proper environment variable validation and defaults
   - Configuration for database, server, and logging settings

### **Build Process Improvements**:
- Integrated linting into build process (`npm run build`)
- Added quality checks: `lint`, `format`, `type-check`
- Enhanced development workflow with consistent tooling

## Recent Cleanup ✅ **COMPLETED**
- **Removed Redundant File**: Deleted `working-days-results.html` from both `src/public` and `dist/public`
- **Architecture Simplification**: Eliminated standalone results page in favor of integrated calendar-first approach
- **Documentation Updated**: Updated file structure documentation to reflect current state
- **Build System Verified**: Confirmed static file management works correctly with reduced file set

## Current Session Status
- **Completed**: Foundation setup, data models, Working Days Calculator, Test Quality Audit, and File Cleanup
- **Approach**: Calendar-first vertical slices with comprehensive TDD approach and quality standards
- **Status**: Core systems operational with streamlined interface and production-ready test infrastructure
- **Server**: Running at http://localhost:3000 with team configuration and calendar interfaces
- **Database**: PostgreSQL container with complete schema and models
- **Testing**: 58 tests passing with consistent patterns and factory-based data generation
- **File Structure**: Simplified to 3 core files (calendar.html, team-configuration.html, styles.css)
- **Next Phase**: Document testing strategy and continue with remaining vertical slices
- **GitHub Repository**: Connected to https://github.com/ApexAZ/capacity-planner

## Static File Management ✅ **SOLVED**

### **Problem**: Files kept getting deleted from `dist/public` during development
### **Root Cause**: TypeScript compiler (`tsc`) clears entire `dist` directory on each build
### **Solution Implemented**:

1. **Build Process Improved**:
   - `npm run build`: Now copies static files BEFORE TypeScript compilation
   - Added incremental TypeScript builds to reduce full rebuilds
   - Static files are preserved during incremental compilation

2. **Development Workflow**:
   - `npm run dev`: Copies static files before starting watch mode
   - `npm run dev:copy`: Manual command to re-copy static files if needed
   - Auto-check on postbuild ensures files are always present

3. **Automatic Recovery**:
   - Created `/scripts/ensure-static-files.js` script
   - Detects missing static files and automatically restores them
   - Runs after every build via `postbuild` hook
   - Can be run manually with `npm run check-static`

4. **File Structure Maintained**:
   ```
   src/public/          → dist/public/
   ├── calendar.html    → ├── calendar.html
   ├── styles.css       → ├── styles.css
   └── team-configuration.html → └── team-configuration.html
   ```

### **Prevention Measures**:
- TypeScript incremental builds reduce full directory clearing
- Static files copied before compilation, not after
- Automatic detection and recovery system prevents data loss
- Clear separation between compiled TypeScript and static assets

## Development Commands
- **Start Database**: `docker-compose up -d`
- **Build Project**: `npm run build` (includes static file copy and verification)
- **Start Dev Server**: `npm run dev` (includes static file setup)
- **Copy Static Files**: `npm run dev:copy` (manual copy when needed)
- **Check Static Files**: `npm run check-static` (verify/restore static files)
- **Run Tests**: `npm test`
- **Check Health**: `curl http://localhost:3000/health`