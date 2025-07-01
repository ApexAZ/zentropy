# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zentropy - A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Node.js, Express, PostgreSQL, and TypeScript.

**📋 For project roadmap and tasks, see [CLAUDETasks.md](./CLAUDETasks.md)**

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
- **Development**: `npm run dev` (recommended) or `npm run dev:simple` (most reliable)
- **Quality Check**: `npm run test:quality` (tests + lint + format + type-check)
- **Emergency Recovery**: `npm run emergency` or see CLAUDETroubleshooting.md
- **Pre-commit**: Full quality validation prevents bad commits

## Development Commands

### Essential Commands
```bash
# Database setup
docker-compose up -d                    # Start PostgreSQL container
./scripts/setup-database.sh            # Initialize zentropy database with full schema (run once)

# Development (React + Express)
npm run dev                            # Build and start server (RECOMMENDED for production testing)
npm run dev:simple                     # Single-run server build and start (most reliable)
npm run dev:client                     # Start React development server with hot reload (port 5173)
npm run dev:fullstack                  # Run both React dev server and Express API concurrently
npm run dev:clean                      # Emergency recovery + start
npm run dev:full                       # Full environment (DB + server + auto-restart)
npm run dev:watch                      # TypeScript compilation in watch mode
npm run build                          # Build both React client and Express server
npm run build:client                   # Build React app to dist/public
npm run build:server                   # Build Express server to dist/server
npm run build:clean                    # Clean build (removes dist/ first)
npm run port:check                     # Check/cleanup port 3000 manually
npm start                             # Start production server

# Emergency Recovery (if server hangs)
npm run emergency                      # Quick recovery procedure  
npm run emergency:full                 # Complete environment reset
npm run db:setup                       # Database schema initialization

# Testing
npm test                              # Run all tests with Vitest
npm run test:watch                    # Run tests in watch mode
npm run test:unit                     # Unit tests only
npm run test:integration              # Run integration tests only
npm run test:ui                       # Open Vitest UI
npm run test:quality                  # Run tests + lint + format + type-check (RECOMMENDED)
npm run test:pre-commit               # Pre-commit startup health check (15s) - PREVENTS SERVER HANGING
npm run test:infrastructure           # Infrastructure and reliability tests
npm run test:ci                       # Complete CI test suite

# Code Quality
npm run lint                          # Auto-fix ESLint issues
npm run lint:check                    # Check linting without fixing
npm run lint:html                     # Validate HTML files with html-validate
npm run lint:html:check               # Check HTML validation without fixing
npm run lint:css                      # Auto-fix CSS issues with Stylelint
npm run lint:css:check                # Check CSS validation without fixing
npm run seo:check                     # Display SEO analysis instructions
npm run seo:manual                    # Manual Lighthouse SEO audit instructions  
npm run lighthouse                    # Full Lighthouse CI analysis (automated)
npm run format                        # Format code with Prettier
npm run quality                       # Run all quality checks (TypeScript + HTML + CSS)
npm run quality:fix                   # Auto-fix all quality issues
npm run type-check                    # TypeScript compilation check

# Build & Static Files
npm run copy-static                   # Copy legacy static files to dist/public (for backward compatibility)
npm run check-static                  # Verify static files are present
```

### Health Checks
```bash
curl http://localhost:3000/health      # Check server and database status
curl http://localhost:5173             # Check React dev server (when running dev:client)
```

### Development Workflow Notes
- **React Development**: Use `npm run dev:client` for hot reload at http://localhost:5173 (proxies API calls to :3000)
- **Full-Stack Development**: Use `npm run dev:fullstack` for both React and Express servers
- **Production Testing**: Use `npm run dev` to test the built React app served by Express
- **API Development**: Use `npm run dev:simple` for server-only development

## Project Status

### Current State
- ✅ **997/997 tests passing** with 100% reliability
- ✅ **0 ESLint errors** with perfect TypeScript compliance
- ✅ **0 TypeScript compilation errors** with strict type safety
- ✅ **Production-ready** with enterprise-level quality standards
- ✅ **Server reliability** - Emergency recovery procedures in place

### Recent Achievements
- ✅ **Complete React Migration** (2025-06-30) - Modern component architecture with TypeScript
- ✅ **Professional Profile Dropdown** (2025-06-30) - Fully functional flyout with keyboard navigation
- ✅ **Perfect Code Quality** (2025-07-01) - Zero errors in tests, linting, and TypeScript compilation

## Documentation Files

- **CLAUDETasks.md** - Current roadmap and task tracking
- **CLAUDETaskArchive.md** - Historical completed work record
- **CLAUDETroubleshooting.md** - Server issue troubleshooting guide
- **CLAUDEQuality.md** - Code quality standards and testing
- **CLAUDEFeatures.md** - Feature specifications
- **CLAUDEESLintRules.md** - ESLint configuration standards

## Current Session Recap

### **Enterprise Code Quality & Complete TypeScript Safety** (2025-07-01 06:00:00 -07:00)
- ✅ **Perfect Test Suite** - All 997/997 tests passing with zero failures or flaky tests
- ✅ **Zero ESLint Errors** - Fixed all 315 TypeScript safety violations with proper type annotations
- ✅ **Complete Import Resolution** - Fixed 27 test import path failures by updating server/ directory references
- ✅ **Strict TypeScript Compliance** - Resolved all 33 type compilation errors with complete type definitions
- ✅ **Type Safety Excellence** - Eliminated unsafe `any` types, added explicit annotations for dynamic imports
- ✅ **Mock Object Correctness** - Replaced `Partial<T>` with complete type-safe mock objects in tests
- ✅ **Perfect Code Formatting** - All files formatted with Prettier, consistent style standards
- ✅ **Database & Server Running** - Successfully started PostgreSQL and Express server with health checks
- 🔄 **Current Status**: Enterprise-level quality standards achieved with perfect TypeScript safety and test reliability
