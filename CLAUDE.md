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
- **Dependency-based**: Build in logical layers, each depending on the previous
- **TDD**: Write tests first, then implement functionality
- **Iterative**: Each layer should be functional before moving to next

## Development Roadmap (Dependency-Based)

### **Layer 1: Foundation (No Dependencies)**
- **Database Setup**: PostgreSQL schema, Docker setup, connection pooling
- **Project Structure**: TypeScript build config, folder organization, basic tooling
- **Basic Web Server**: Express server, static file serving, basic routing

### **Layer 2: Core Data Models (Depends on: Database)**
- **User Model**: User entity, basic auth, session management
- **Team Model**: Team entity, CRUD operations, database layer
- **Calendar Entry Model**: Time-off entries, date validation, database layer

### **Layer 3: Business Logic (Depends on: Data Models)**
- **Authentication System**: Login/logout, session handling, role-based access
- **Team Management**: Create team, add/remove members, team operations
- **Calendar Management**: Add/edit/delete time-off entries, date calculations

### **Layer 4: Capacity Engine (Depends on: Business Logic)**
- **Sprint Generator**: Auto-generate sprints based on team config
- **Capacity Calculator**: Core algorithm, real-time recalculation
- **Working Days Logic**: Team-specific working day configurations

### **Layer 5: User Interface (Depends on: Capacity Engine)**
- **HTML Templates**: Basic page structure, forms, navigation
- **Dashboard**: Display capacity, team info, upcoming sprints
- **Calendar Views**: Month view, entry forms, visual indicators

### **Layer 6: Integration & Polish (Depends on: UI)**
- **Real-time Updates**: WebSocket/SSE for live capacity updates
- **Validation & Error Handling**: Form validation, error pages
- **Testing Suite**: Integration tests, UI tests, data validation tests

## Key Features (Phase 1 MVP)
1. **Basic User Management**: Team Lead vs Team Member roles
2. **Single Team Management**: Create team, manage members, set velocity baseline
3. **Core Calendar**: Log PTO/holidays, basic date range selection
4. **Capacity Calculation**: Automated sprint capacity based on availability
5. **Simple Dashboard**: Display current sprint capacity with real-time updates

## Current Development Tasks

### **Layer 1: Project Structure** ✅ **COMPLETED**
- [x] **1.1 Folder Organization**: Backend/frontend structure created
- [x] **1.2 TypeScript Configuration**: Updated for web app with path mapping
- [x] **1.3 Package Dependencies**: Added Express, PostgreSQL, development tools
- [x] **1.4 Build Scripts**: TypeScript compilation, dev server, production build
- [x] **1.5 Environment Configuration**: Created .env template and configuration
- [x] **1.6 Git/GitHub Integration**: Repository initialized, connected to GitHub

### **Layer 2: Core Data Models** ✅ **COMPLETED** 
- [x] **2.1 Database Setup**: Docker Compose with PostgreSQL container
- [x] **2.2 Database Schema**: Complete schema with Users, Teams, Calendar, Sprints tables
- [x] **2.3 Connection Pool**: Database connection management with graceful shutdown
- [x] **2.4 User Model**: Full CRUD operations with role-based access
- [x] **2.5 Team Model**: Team management with member relationships
- [x] **2.6 Calendar Entry Model**: PTO/holiday tracking with conflict detection
- [x] **2.7 Basic Server**: Express server with health check endpoints

### **Layer 3: Testing & Validation** ✅ **COMPLETED**
- [x] **3.1 Docker Testing**: Docker installation verified and container startup successful
- [x] **3.2 Database Testing**: Database connection confirmed, schema working
- [x] **3.3 Server Testing**: TypeScript compilation and server startup successful
- [x] **3.4 Code Standards Audit**: All patterns and standards standardized across codebase

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

## Current Session Status
- **Completed**: Layer 1 (Project Structure), Layer 2 (Core Data Models), Layer 3 (Testing & Validation)
- **Status**: Foundation complete, all systems operational
- **Server**: Running at http://localhost:3000 with health check at `/health`
- **Database**: PostgreSQL container running with successful connections
- **Next Phase**: Ready to begin Layer 4 (Business Logic) development
- **GitHub Repository**: Connected to https://github.com/ApexAZ/capacity-planner

## Development Commands
- **Start Database**: `docker-compose up -d`
- **Build Project**: `npm run build`
- **Start Dev Server**: `npm run dev`
- **Run Tests**: `npm test`
- **Check Health**: `curl http://localhost:3000/health`