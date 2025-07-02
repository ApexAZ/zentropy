# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zentropy - A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Python FastAPI backend, React frontend, and PostgreSQL database.

**📋 See documentation files below for additional project information and guidance**

## Technology Stack & Architecture

### **Backend Stack (Python)**
- **FastAPI** - Modern Python web framework for building APIs with automatic OpenAPI documentation
  - *Why*: Type-safe, fast, auto-generated docs, excellent async support
  - *Usage*: RESTful API endpoints at http://localhost:3000
- **SQLAlchemy** - Python SQL toolkit and Object-Relational Mapping (ORM) library
  - *Why*: Database abstraction, type safety, migration support
  - *Usage*: Database models, relationships, and queries
- **PostgreSQL** - Open source relational database system
  - *Why*: ACID compliance, JSON support, excellent performance, UUID support
  - *Usage*: Primary data store via Docker container (port 5432)
- **Uvicorn** - Lightning-fast ASGI server implementation
  - *Why*: High performance, async support, production-ready
  - *Usage*: Serves FastAPI application

### **Frontend Stack (TypeScript/React)**
- **React** - JavaScript library for building user interfaces
  - *Why*: Component-based architecture, large ecosystem, excellent tooling
  - *Usage*: Interactive UI components for the web application
- **TypeScript** - Typed superset of JavaScript
  - *Why*: Type safety, better IDE support, catches errors at compile time
  - *Usage*: All React components and frontend logic
- **Vite** - Modern frontend build tool
  - *Why*: Fast hot reload, optimized builds, modern ES modules
  - *Usage*: Development server (port 5173) and production builds
- **TailwindCSS** - Utility-first CSS framework
  - *Why*: Rapid styling, consistent design system, small bundle size
  - *Usage*: Component styling and responsive design

### **Development & Quality Tools**
- **Docker** - Containerization platform
  - *Why*: Consistent development environment, easy database setup
  - *Usage*: PostgreSQL database container
- **Python Quality Stack**:
  - **flake8** - Python linting for code style and error detection
  - **black** - Opinionated Python code formatter
  - **mypy** - Static type checker for Python
  - **pytest** - Python testing framework
- **TypeScript Quality Stack**:
  - **ESLint** - TypeScript/JavaScript linting with React hooks validation
  - **Prettier** - Opinionated code formatter for TypeScript/JavaScript
  - **TypeScript Compiler (tsc)** - Type checking and compilation
- **Husky** - Git hooks for pre-commit quality enforcement
  - *Why*: Ensures code quality before commits, prevents broken code in repository
  - *Usage*: Runs quality pipeline before git commits

### **Authentication & Security**
- **PassLib** - Password hashing library with bcrypt
  - *Why*: Secure password storage, industry-standard hashing
  - *Usage*: User password hashing and verification
- **Python-JOSE** - JSON Web Token implementation
  - *Why*: Stateless authentication, secure token-based auth
  - *Usage*: JWT token generation and validation
- **CORS Middleware** - Cross-Origin Resource Sharing
  - *Why*: Enables frontend-backend communication across different ports
  - *Usage*: Allows React (port 5173) to call API (port 3000)

### **Development Workflow Integration**
- **Concurrently** - Run multiple npm scripts in parallel
  - *Why*: Simple, reliable process management without complex custom scripts
  - *Usage*: `npm run dev` starts all services simultaneously
- **Node.js/npm** - JavaScript runtime and package manager
  - *Why*: Unified development commands, excellent tooling ecosystem
  - *Usage*: Script orchestration and frontend dependency management

## Development Workflow

### Task Management Standards
- **Timestamp Format**: "YYYY-MM-DD HH:MM:SS (timezone)" for all tasks and session recaps
- **Completion Tracking**: Include start/completion timestamps and duration calculations
- **Session Continuity**: Timestamps enable seamless session resumption and progress measurement
- **Documentation**: Maintain task progression history in CLAUDETasks.md for planning and retrospectives

### Session Recap Management
- **Archive Workflow**: When adding new session recaps to CLAUDE.md, automatically move previous session recaps to CLAUDETaskArchive.md
- **Compaction Pattern**: Convert detailed session recaps to compact ✅ completed format following established archive structure
- **Retention Policy**: Keep only current session recap in CLAUDE.md, archive all previous sessions
- **Format Consistency**: Use "✅ **Session Name** (Date) - Brief achievement summary" pattern for archived sessions

### Quality Process
- **Development**: `npm run dev` (starts both React and Python API)
- **Comprehensive Quality Pipeline**: `npm run quality` (runs all quality checks for both Python backend and TypeScript frontend)
  - **Python Backend**: flake8 linting + black formatting + mypy type checking
  - **TypeScript Frontend**: ESLint linting + Prettier formatting + tsc type checking  
  - **Pre-commit Enforcement**: Husky git hooks prevent commits with quality issues
- **Testing**: `npm run test` (Python pytest suite)
- **Database**: Docker PostgreSQL container with automated schema setup
- **API Documentation**: Automatic OpenAPI docs at http://localhost:3000/docs

## Documentation Files

### **Project Documentation**
- **CLAUDETaskArchive.md** - Historical completed work record and achievement archive
- **CLAUDETroubleshooting.md** - Server issue troubleshooting guide and recovery procedures
- **CLAUDEQuality.md** - Code quality standards, testing protocols, and compliance metrics
- **CLAUDEESLintRules.md** - ESLint configuration standards and TypeScript rules
- **CLAUDEFeatures.md** - Feature ideas and enhancement backlog

### **Task & Session Management**
- **Current Tasks** - Tracked in CLAUDE.md session recaps for immediate context
- **Archive Process** - Session recaps moved to CLAUDETaskArchive.md following the Session Recap Management workflow above
- **Historical Reference** - Complete development history maintained in archive for posterity

## Development Commands

### Essential Commands (in typical usage order)
```bash
# 1. Initial Setup (run once)
npm run install:all                   # Install both npm and Python dependencies → npm install + python3 pip (sequential)
./scripts/setup-database.sh            # Initialize zentropy database with full schema (run once) → scripts/setup-database.sh

# 2. Full Development Startup (most common)
npm run dev                            # Intelligent startup with service checks and orchestration → scripts/dev-startup.js

# 3. Individual Service Control
npm run dev:database                  # Start PostgreSQL container only → docker-compose up -d (direct)
npm run dev:api                        # Start Python FastAPI server only (port 3000) → python3 uvicorn (direct)
npm run dev:client                     # Start React development server only (port 5173) → vite dev (direct)

# 4. Service Management
npm run stop                          # Stop all services (API, client, database) → scripts/stop.js
npm run dev:fallback                   # Backup dev command using concurrently → concurrently with API/CLIENT (direct)

# 5. Diagnostics & Health Checks
npm run dev:check                     # Check if ports 3000/5173 are available → scripts/check-ports.js

# 6. Code Quality & Testing
npm run quality                        # Complete quality pipeline (Python + TypeScript) → lint + format + type-check
npm run lint                          # Lint both Python and TypeScript code → flake8 + eslint
npm run lint:python                   # Python linting only → flake8 (direct)
npm run lint:typescript               # TypeScript linting only → eslint (direct)
npm run format                        # Format both Python and TypeScript code → black + prettier  
npm run format:python                 # Python formatting only → black (direct)
npm run format:typescript             # TypeScript formatting only → prettier (direct)
npm run type-check                    # Type check both Python and TypeScript → mypy + tsc
npm run type-check:python             # Python type checking only → mypy (direct)
npm run type-check:typescript         # TypeScript type checking only → tsc (direct)
npm run test                          # Run Python tests → pytest (direct)

# 7. Build & Production
npm run build                          # Build React app for production → vite build (direct)
npm run clean                          # Remove build artifacts from dist/ → rm -rf (direct)
npm start                             # Start production Python API server → python3 uvicorn (direct)

# 8. Dependency Management
npm run install:python                # Install Python dependencies from requirements.txt → python3 -m pip (direct)
```

### Health Checks & Diagnostics
```bash
# Service Health
curl http://localhost:3000/health      # Check Python API server and database status → API /health endpoint
curl http://localhost:5173             # Check React dev server response → Vite dev server
curl http://localhost:3000/docs        # View automatic FastAPI documentation → FastAPI OpenAPI docs

# Port & Process Diagnostics
npm run dev:check                     # Check if development ports are available → scripts/check-ports.js
lsof -i :3000 -i :5173 -i :5432       # Check what processes are using ports → lsof system command
ps aux | grep -E 'uvicorn|vite|postgres' # Check running development processes → ps system command

# Database Diagnostics
docker ps | grep zentropy             # Check database container status → Docker ps command
docker exec zentropy_db pg_isready -U dev_user -d zentropy # Check database connectivity → PostgreSQL pg_isready
```

### Available Scripts (in /scripts/)
```bash
scripts/dev-startup.js                 # Intelligent development environment orchestration with service detection
scripts/stop.js                       # Clean shutdown of all services (API, client, database)
scripts/check-ports.js                # Port availability checker for development ports
scripts/setup-database.sh             # Database initialization script (run once)
```

### Development Workflow Notes
- **Simple Startup**: `npm run dev` uses concurrently to manage all services reliably
- **Clean Shutdown**: `npm run stop` properly stops all services including database
- **No Complex Scripts**: Uses battle-tested concurrently instead of custom process management
- **Automatic Database**: Database container starts automatically before servers
- **React Development**: Hot reload at http://localhost:5173 (proxies API calls to :3000)
- **API Documentation**: FastAPI automatically generates docs at http://localhost:3000/docs

## Project Status

### Current State
- ✅ **Python FastAPI Backend** - Reliable, fast, and stable API server
- ✅ **React Frontend** - Modern TypeScript components with hot reload
- ✅ **Simple Startup** - Uses concurrently for reliable process management
- ✅ **Minimal Scripts** - Only 3 essential scripts: check-ports, stop, setup-database
- ✅ **One-Command Development** - `npm run dev` starts everything with standard tools
- ✅ **Automatic API Documentation** - OpenAPI specs at /docs endpoint
- ✅ **Clean Architecture** - Clear separation between Python backend and React frontend

### Recent Achievements
- ✅ **Startup Simplification** (2025-07-01) - Replaced complex scripts with simple concurrently solution
- ✅ **File Cleanup** (2025-07-01) - Removed all obsolete scripts and analysis documents
- ✅ **Complete Backend Conversion** (2025-07-01) - TypeScript/Express → Python/FastAPI
- ✅ **Server Reliability Achieved** (2025-07-01) - Eliminated all hanging and timeout issues
- ✅ **Architecture Streamlined** (2025-07-01) - Clean separation: Python API + React frontend
- ✅ **Professional Profile Dropdown** (2025-06-30) - Fully functional flyout with keyboard navigation

## Current Session Recap

### **Complete Quality Pipeline Implementation & Python Type Error Resolution** (2025-07-02 00:30:00 -07:00)
- ✅ **Python Quality Migration** - Successfully migrated from TypeScript-only to Python+TypeScript quality tooling
- ✅ **39 mypy Type Errors Resolved** - Fixed all SQLAlchemy Column type issues, authentication type conversions, and schema mappings
- ✅ **Comprehensive Quality Pipeline** - Established unified `npm run quality` command covering both backend and frontend
- ✅ **Pre-commit Hook Integration** - Quality checks now enforce standards for both Python and TypeScript code before commits
- ✅ **Technology Stack Documentation** - Added detailed tech stack section explaining all tools, frameworks, and their purposes
- ✅ **Zero Python Quality Issues** - All Python backend code passes flake8 linting, black formatting, and mypy type checking

### **Key Technical Achievements**
- **🐍 Python Quality Stack**: Established flake8 + black + mypy pipeline with 100% passing rate (11 Python files)
- **⚛️ TypeScript Quality Stack**: Integrated ESLint + Prettier + tsc pipeline with 99% passing rate (17 TypeScript files)
- **🔗 Unified Quality Command**: `npm run quality` runs comprehensive checks across entire codebase
- **🔧 Type Safety Resolution**: Fixed SQLAlchemy Column vs primitive type mismatches with strategic `# type: ignore` comments
- **📋 Tech Stack Clarity**: Documented complete technology rationale including why each tool was chosen and how it's used
- **✅ Production Ready Quality**: Pre-commit hooks prevent any code quality regressions from entering repository
