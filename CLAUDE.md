# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zentropy - A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Python FastAPI backend, React frontend, and PostgreSQL database.

**📋 See documentation files below for additional project information and guidance**

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
- **Quality Check**: `npm run test` + `npm run lint` + `npm run format`
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
npm run test                              # Run tests with Vitest → vitest (direct)
npm run lint                          # Auto-fix ESLint issues (React components only) → eslint (direct)
npm run format                        # Format React code with Prettier → prettier (direct)

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

### **Development Environment Orchestration & Documentation Audit** (2025-07-01 23:50:00 -07:00)
- ✅ **Service Isolation Testing** - Started database, API, and client individually to verify each works correctly
- ✅ **Root Cause Resolution** - Identified user URL confusion (port 3000 vs 5173) and timeout interpretation issues  
- ✅ **Intelligent Startup System** - Created comprehensive orchestration script with service detection and health checks
- ✅ **Command Documentation** - Reorganized all commands by usage order with proper script mappings and tool references
- ✅ **Code Audit & Cleanup** - Removed obsolete scripts, fixed startup script issues, verified all command mappings
- ✅ **Production Ready Environment** - All services start reliably with proper dependency validation and conflict prevention

### **Key Technical Achievements**
- **🎯 Smart Orchestration**: Created `scripts/dev-startup.js` with service detection, health checks, and sequential startup
- **📋 Command Organization**: Reorganized documentation by workflow (setup → dev → testing → production)
- **🔧 Script Cleanup**: Removed `start-with-timeout.js`, fixed startup script logic errors
- **📊 Comprehensive Documentation**: Added script mappings, port references, and diagnostic commands
- **🚀 One-Command Solution**: `npm run dev` now intelligently manages entire development environment
- **✅ Fully Functional**: Zentropy application working at http://localhost:5173 with API at :3000
