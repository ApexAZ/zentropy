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

### **Layer 1: Project Structure (ACTIVE)**

#### **1.1 Folder Organization** 
- **Status**: ✅ Completed
- **Dependencies**: None
- **Tasks**:
  - [x] Create backend structure: `src/server/`, `src/models/`, `src/routes/`
  - [x] Create frontend structure: `src/client/`, `src/public/`
  - [x] Create shared utilities: `src/shared/`
  - [x] Create test structure: `src/__tests__/` or parallel test files
  - [x] Document folder structure purpose in README

#### **1.2 TypeScript Build Configuration**
- **Status**: Pending
- **Dependencies**: 1.1 Folder Organization
- **Tasks**:
  - [ ] Update `tsconfig.json` for web application structure
  - [ ] Add build output configuration for development and production
  - [ ] Configure module resolution for web application patterns
  - [ ] Set up source maps for debugging
  - [ ] Add strict type checking appropriate for learning

#### **1.3 Package Dependencies**
- **Status**: Pending
- **Dependencies**: 1.1 Folder Organization
- **Tasks**:
  - [ ] Add Express and related middleware
  - [ ] Add database connectivity packages (pg, @types/pg)
  - [ ] Add development utilities (nodemon, concurrently)
  - [ ] Update existing packages if needed

#### **1.4 Build Tooling & Scripts**
- **Status**: Pending
- **Dependencies**: 1.2 TypeScript Config, 1.3 Package Dependencies
- **Tasks**:
  - [ ] Add TypeScript compilation scripts
  - [ ] Set up development server with auto-reload
  - [ ] Configure concurrent frontend/backend development
  - [ ] Add linting and formatting tools (ESLint, Prettier)

#### **1.5 Environment Configuration**
- **Status**: Pending
- **Dependencies**: 1.1 Folder Organization
- **Tasks**:
  - [ ] Create `.env` template for configuration
  - [ ] Set up environment variable loading
  - [ ] Configure development vs production settings
  - [ ] Add environment validation

**Execution Order**: 1.1 → 1.2 → 1.3 → 1.4 → 1.5

## Current Session Status
- Completed: PRD analysis, scope reduction, technology stack alignment, dependency-based roadmap
- Active: Layer 1 Project Structure - starting with folder organization
- Next: Implement folder structure, then TypeScript configuration
- Status: Ready to begin hands-on development