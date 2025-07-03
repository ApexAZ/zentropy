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

### **Design System & Semantic Color Variables**
- **Semantic Color System** - Purpose-based color variables defined in `styles.css` using Tailwind v4 `@theme` directive
  - *Why*: Easy theme changes, maintainable design system, semantic naming that describes purpose not appearance
  - *Usage*: Use semantic classes like `bg-interactive`, `text-primary` for consistent styling
  - *Benefits*: Change entire site colors by updating 6 values in `styles.css`

#### **Semantic Color Variables (2025-07-02):**
```css
/* Change these values in styles.css to update entire site theme */
--color-layout-background: #F0F0F0;     /* Cool light gray - page backgrounds, borders, sections */
--color-content-background: #FFFFFF;    /* White - form containers, input fields */
--color-interactive: #6A8BA7;           /* Steel blue - buttons, links, focus states */
--color-interactive-hover: #B8D4F0;     /* Pastel blue - hover effects and feedback */
--color-text-primary: #4A4A4A;          /* Dark gray - headings, body text, labels */
--color-text-contrast: #000000;         /* Black - high contrast when needed */
```

#### **Tailwind Semantic Classes:**
```
Layout: layout-background, content-background
Interactive: interactive, interactive-hover  
Text: text-primary, text-contrast
Focus: focus:border-interactive, focus:shadow-interactive
```

#### **Design Principles:**
- **Semantic Naming**: Classes describe purpose (interactive) not appearance (blue)
- **Single Source of Truth**: Change colors in one place (styles.css) to update entire site
- **Maintainable**: No find/replace across files when changing themes
- **Consistent**: Prevents color drift and ensures brand cohesion
- **Accessible**: Proper contrast ratios maintained through semantic usage

#### **Usage Examples:**
```tsx
// Primary interactive button
<button className="bg-interactive hover:bg-interactive-hover hover:text-text-primary text-white">

// Form containers  
<div className="bg-content-background border border-layout-background">

// Layout sections
<div className="bg-layout-background text-text-primary">

// Interactive links
<a className="text-interactive hover:text-interactive-hover">

// Form inputs with focus
<input className="bg-content-background border border-layout-background focus:border-interactive focus:shadow-interactive">
```

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

### **Vite Configuration & Environment Variables**
- **Root Directory**: Vite configured with `root: "src/client"` in `vite.config.ts`
  - *Why*: Separates React client code from Python API code
  - *Critical*: Environment files must be placed in `src/client/` directory, not project root
- **Environment File Locations**:
  - **Frontend Variables**: `src/client/.env.local` (contains `VITE_GOOGLE_CLIENT_ID`)
  - **Backend Variables**: `.env` (contains `GOOGLE_CLIENT_ID`, database config)
  - *Why*: Vite only reads env files from its configured root directory
- **Development Server**: Vite proxy configuration routes API calls to Python backend
  - *Configuration*: `/api` and `/health` routes proxied to `http://localhost:3000`
  - *Why*: Enables seamless frontend-backend communication during development

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
npm run quality                # Full quality pipeline: lint + format + type-check + test (194 tests)

# 📊 Performance Analysis (periodic)
npm run perf:build-analyze     # Build + analyze bundle size (current: 300KB)
```

### **⚠️ IMPORTANT: Claude Code Development Server Limitation**
**Claude Code cannot run `npm run dev` due to timeout conflicts with long-running processes.**

**Manual Server Startup Required:**
```bash
# User must start development servers manually from terminal:
npm run dev                    # Start all services in separate terminal
# OR start individual services:
npm run dev:database          # PostgreSQL container (port 5432)
npm run dev:api               # Python FastAPI (port 3000)  
npm run dev:client            # React/Vite (port 5173)
```

**Claude Code Compatibility:**
- ✅ **Can run**: `npm run quality`, `npm run test`, `npm run build`, `npm run stop`
- ✅ **Can run**: Individual commands, linting, formatting, type checking
- ❌ **Cannot run**: `npm run dev` (times out due to persistent server processes)
- ❌ **Cannot run**: Long-running development servers (use manual terminal startup)

**⚠️ IMPORTANT: Vite Environment Variables**
- **Frontend env files**: Must be in `src/client/.env.local` (NOT project root)
- **Backend env files**: Located in project root `.env`
- **Reason**: Vite config sets `root: "src/client"` so Vite only reads env files from that directory
- **After env changes**: Restart Vite server to pick up new environment variables

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

### **Quality & Testing (194 Tests Total)**
```bash
# Full Quality Pipeline
npm run quality                # Complete pipeline: lint + format + type-check + test
npm run quality:pre-commit     # Fast pre-commit validation
npm run quality:full           # Extended quality pipeline with full test suite

# Testing (194 tests: 103 Python + 91 React)
npm run test                   # All tests (Python + React)
npm run test:python            # Python tests only (pytest) - includes role system tests
npm run test:react             # React tests only (Vitest)
npm run test:pre-commit        # Startup validation tests
npm run test:full              # Complete test suite with extended coverage
npm run test:roles             # Role system tests only (enum validation, hierarchy, database constraints)

# Code Quality
npm run lint                   # Lint Python + TypeScript
npm run format                 # Format Python + TypeScript
npm run type-check             # Type check Python + TypeScript

# Individual Language Quality
npm run lint:python            # Python: flake8 linting
npm run format:python          # Python: black formatting
npm run type-check:python      # Python: mypy type checking (strict mode with --ignore-missing-imports)
npm run type-check:python:strict # Python: mypy with strict mode and error codes
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
📊 194 Total Tests (9x increase from 22)

🐍 Python Backend (103 tests)
├── Authentication (25): Password hashing, JWT tokens, auth flows
├── API Endpoints (30): Auth, users, teams, calendar CRUD  
├── Database Models (17): SQLAlchemy validation for 7 models
├── Role System (26): Role enums, database constraints, hierarchy, integration
│   ├── Enum Validation (4): UserRole, TeamRole, InvitationStatus enums
│   ├── Database Constraints (5): Default roles, enum database validation
│   ├── Role Hierarchy (2): Permission level validation and inheritance
│   ├── API Integration (13): Role-based access control and workflows
│   └── Schema Integration (2): Pydantic validation with enum types
└── Startup Tests (5): Server reliability, environment validation

⚛️ React Frontend (91 tests)  
├── LoginPage (15): Form validation, authentication flows
├── CalendarPage (20): CRUD operations, filtering, modals
├── TeamsPage (25): Team management, validation, CRUD
├── RegisterPage (25): Registration flow, password requirements  
└── ProfilePage (6): Profile updates, password changes

🛠️ Testing Infrastructure
├── Python: pytest + FastAPI TestClient + httpx + pytest-mock + SQLAlchemy testing
├── React: Vitest + React Testing Library + Jest DOM + user-event
├── Role System: Mock database, enum validation, type-safe constraints
└── Patterns: Mock-based, async/await, form validation, API errors, TDD
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

### **Comprehensive Email Verification Implementation Session** (2025-07-03 12:45:00 -07:00)
- ✅ **Test-Driven Development (TDD)** - Implemented complete email verification following strict TDD methodology with 13 comprehensive tests written first
- ✅ **Database Schema Enhancement** - Added email verification fields to User model: `email_verified`, `email_verification_token`, `email_verification_expires_at`
- ✅ **Secure Token System** - Implemented cryptographically secure 32-character token generation with 24-hour expiration using Python `secrets` module
- ✅ **Backend API Endpoints** - Created `/api/auth/send-verification` and `/api/auth/verify-email/{token}` endpoints with proper error handling and security
- ✅ **Registration Integration** - Updated registration flow to automatically generate verification tokens and send verification emails (simulated)
- ✅ **Login Response Enhancement** - Added `email_verified` status to all login responses for frontend state management
- ✅ **Google OAuth Auto-Verification** - Google OAuth users are automatically marked as verified since Google validates emails
- ✅ **Terms Agreement Validation** - Added required terms acceptance to registration with proper schema validation
- ✅ **Email Enumeration Protection** - Implemented security best practices to prevent revealing if email addresses exist in the system
- ✅ **Comprehensive Quality Fixes** - Fixed all Python flake8 linting errors, mypy type checking issues, and formatting inconsistencies

### **Current Technical Status**
- **🧪 Test Coverage**: 139 total tests passing (15 Python + 124 React) - All email verification tests passing
- **🔧 Code Quality**: Complete quality pipeline success - zero linting, formatting, or type checking errors
- **🛡️ Security Implementation**: Production-ready email verification with secure token handling and proper expiration
- **📧 Email Simulation**: Complete email verification flow with terminal output simulation for development testing
- **🏗️ Database Schema**: Updated PostgreSQL schema with proper email verification constraints and relationships
- **📊 Production Ready**: All components tested and validated with comprehensive error handling

### **Email Verification Features Implemented**
- **Registration Flow**: New users automatically receive verification emails with secure tokens
- **Verification Endpoints**: RESTful API endpoints for sending and verifying email tokens
- **Token Security**: Cryptographically secure tokens with proper expiration (24 hours)
- **Email Resend**: Users can request new verification emails if tokens expire or are lost
- **Status Tracking**: All login responses include email verification status for frontend handling
- **Error Handling**: Comprehensive validation and error responses for all edge cases

### **Testing & Quality Assurance**
- **TDD Methodology**: All features implemented test-first with failing tests driving implementation
- **13 Email Verification Tests**: Database models, API endpoints, security, error handling, and complete flow testing
- **Quality Pipeline**: All linting (flake8, ESLint), formatting (black, Prettier), and type checking (mypy, tsc) passing
- **Integration Testing**: Full registration → email verification → login flow validated
- **Security Testing**: Token generation, expiration, and email enumeration protection verified

### **Ready for Production**
- **Email Service Integration**: Backend ready for real email service integration (SendGrid, AWS SES, etc.)
- **Frontend Integration**: API endpoints ready for React frontend email verification flow implementation
- **Database Migration**: Schema successfully updated with email verification fields
- **Documentation**: Comprehensive implementation with security best practices and proper error handling

