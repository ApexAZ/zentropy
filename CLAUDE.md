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

### **Performance Testing & Analysis**
- **Vite Bundle Analyzer** - React bundle size analysis
  - *Why*: Identify large dependencies, prevent bundle bloat, optimize load times
  - *Usage*: `npm run perf:build-analyze` for bundle inspection
- **Lighthouse CI** - Automated web performance auditing
  - *Why*: Performance, accessibility, SEO, and best practices scoring
  - *Usage*: `npm run analyze:lighthouse` for comprehensive audits
- **Locust** - Python-based API load testing
  - *Why*: Validate backend performance under concurrent load, Python-native tooling
  - *Usage*: `locust -f performance/locustfile.py` for interactive load testing

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
- **Quality Obsessed MANDATORY TDD Practices - TESTS FIRST**: Write tests before code, every time, no exceptions
  - **Python Backend**: Write pytest tests before implementing API endpoints, database models, or business logic
  - **React Frontend**: Write React Testing Library tests before creating components or features
  - **Test Coverage**: All new code must have corresponding tests that fail first, then pass after implementation
  - **Red-Green-Refactor**: Follow strict TDD cycle - failing test → minimal code → refactor → repeat
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

### **Quick Start (Most Common)**
```bash
# 🚀 Development (run daily)
npm run dev                    # Start full development environment (API + React + DB)
npm run stop                   # Stop all services cleanly

# ✅ Quality Check (before commits)
npm run quality                # Full quality pipeline: lint + format + type-check + test (178 tests)

# 📊 Performance Analysis (periodic)
npm run perf:build-analyze     # Build + analyze bundle size (current: 300KB)
```

### **Setup Commands (run once)**
```bash
npm run install:all            # Install all dependencies (npm + Python)
./scripts/setup-database.sh     # Initialize PostgreSQL database schema
```

### **Development Services**
```bash
# Individual Services
npm run dev:api                # Python FastAPI server only (port 3000)
npm run dev:client             # React dev server only (port 5173)  
npm run dev:database           # PostgreSQL container only
npm run dev:check              # Check if ports 3000/5173 are available

# Service Management
npm run stop                   # Stop all services (API, client, database)
npm run dev:fallback           # Backup dev command using concurrently
```

### **Quality & Testing (178 Tests Total)**
```bash
# Full Quality Pipeline
npm run quality                # Complete pipeline: lint + format + type-check + test
npm run quality:pre-commit     # Fast pre-commit validation

# Testing (178 tests: 77 Python + 101 React)
npm run test                   # All tests (Python + React)
npm run test:python            # Python tests only (pytest)
npm run test:react             # React tests only (Vitest)
npm run test:pre-commit        # Startup validation tests

# Code Quality
npm run lint                   # Lint Python + TypeScript
npm run format                 # Format Python + TypeScript
npm run type-check             # Type check Python + TypeScript

# Individual Language Quality
npm run lint:python            # Python: flake8 linting
npm run format:python          # Python: black formatting
npm run type-check:python      # Python: mypy type checking
npm run lint:typescript        # React/TypeScript: ESLint + React hooks validation
npm run format:typescript      # React/TypeScript: Prettier + TailwindCSS formatting
npm run type-check:typescript  # React/TypeScript: TypeScript compiler + React component types
```

### **Performance & Analysis**
```bash
# Bundle Analysis
npm run perf:build-analyze     # Build + analyze React bundle (current: 300KB)
npm run analyze:bundle         # Analyze existing bundle size
npm run analyze:lighthouse     # Lighthouse performance audit

# Load Testing (Python Locust)
locust -f performance/locustfile.py --host=http://localhost:3000              # Interactive (Web UI at :8089)
locust -f performance/locustfile.py --host=http://localhost:3000 -u 10 -t 30s # Quick test (10 users, 30s)

# Performance Targets
# Frontend: Bundle < 1MB ✅, Performance > 70%, LCP < 4s, FCP < 2s  
# Backend: API < 200ms (95th %), 50+ concurrent users, DB queries < 50ms
```

### **Build & Production**
```bash
npm run build                  # Build React app for production
npm run clean                  # Remove build artifacts
npm start                      # Start production Python API server
npm run install:python         # Install Python dependencies only
```

### **Health Checks & Diagnostics**
```bash
# Service Health
curl http://localhost:3000/health    # API + database status
curl http://localhost:5173           # React dev server  
curl http://localhost:3000/docs      # FastAPI documentation

# System Diagnostics  
npm run dev:check                    # Port availability check
lsof -i :3000 -i :5173 -i :5432     # Process using ports
ps aux | grep -E 'uvicorn|vite|postgres'  # Running dev processes

# Database
docker ps | grep zentropy           # Container status
docker exec zentropy_db pg_isready -U dev_user -d zentropy  # Connection test
```

### **Test Coverage Breakdown**
```
📊 178 Total Tests (8x increase from 22)

🐍 Python Backend (77 tests)
├── Authentication (25): Password hashing, JWT tokens, auth flows
├── API Endpoints (30): Auth, users, teams, calendar CRUD  
├── Database Models (17): SQLAlchemy validation for 7 models
└── Startup Tests (5): Server reliability, environment validation

⚛️ React Frontend (101 tests)  
├── LoginPage (15): Form validation, authentication flows
├── CalendarPage (20): CRUD operations, filtering, modals
├── TeamsPage (25): Team management, validation, CRUD
├── RegisterPage (25): Registration flow, password requirements  
└── ProfilePage (16): Profile updates, password changes

🛠️ Testing Infrastructure
├── Python: pytest + FastAPI TestClient + httpx + pytest-mock
├── React: Vitest + React Testing Library + Jest DOM + user-event
└── Patterns: Mock-based, async/await, form validation, API errors
```

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
- ✅ **Comprehensive Codebase Cleanup** (2025-07-02) - Deleted 117 obsolete files, eliminated all technical debt from TypeScript migration
- ✅ **Development Environment Optimization** (2025-07-02) - Startup validation suite and process optimization
- ✅ **Complete Backend Migration** (2025-07-01) - TypeScript/Express → Python/FastAPI with full reliability
- ✅ **Architecture Streamlined** (2025-07-01) - Clean separation: Python API + React frontend

## Current Session Recap

### **Performance Testing Infrastructure & Quality Enhancement** (2025-07-02 22:05:00 -07:00)
- ✅ **Comprehensive Performance Tools** - Implemented lightweight performance testing suite with bundle analysis, Lighthouse CI, and API load testing
- ✅ **Frontend Performance Monitoring** - Added Vite bundle analyzer (300KB bundle), Lighthouse CI auditing, and automated performance measurement
- ✅ **Backend Load Testing** - Integrated Locust Python-based load testing with interactive scenarios for API endpoint validation
- ✅ **Development Build Optimization** - Fixed Vite configuration and build pipeline for proper bundle analysis and performance measurement
- ✅ **Documentation Enhancement** - Updated CLAUDE.md with comprehensive performance command documentation and established performance targets

### **Key Performance Achievements**
- **📊 Bundle Analysis**: 300KB total bundle size (well under 1MB target) with detailed size breakdown and asset analysis
- **🚀 Performance Commands**: 
  - `npm run perf:build-analyze` - Complete build + bundle analysis pipeline
  - `npm run analyze:bundle` - Bundle size and contents analysis
  - `npm run analyze:lighthouse` - Web performance auditing
  - `locust -f performance/locustfile.py` - Interactive API load testing
- **🎯 Performance Targets**: Frontend < 1MB bundle, > 70% performance score; Backend < 200ms API response, 50+ concurrent users
- **🛠️ Tools Integration**: Vite Bundle Analyzer, Lighthouse CI, Locust load testing with comprehensive documentation and usage examples
- **📋 Future-Ready Infrastructure**: Performance testing foundation ready for pre-production validation and optimization cycles
