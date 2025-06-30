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

# Development (Streamlined)
npm run dev                            # Normal development with auto-restart (RECOMMENDED)
npm run dev:simple                     # Single-run server (most reliable)
npm run dev:clean                      # Emergency recovery + start
npm run dev:full                       # Full environment (DB + server + auto-restart)
npm run dev:watch                      # TypeScript compilation in watch mode
npm run build                          # Build project (includes linting and static file copy)
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

# Static Files
npm run copy-static                   # Copy static files to dist/public
npm run check-static                  # Verify static files are present
```

### Health Checks
```bash
curl http://localhost:3000/health      # Check server and database status
```

## Project Status

### Current State
- ✅ **980+ tests passing** with 100% reliability
- ✅ **0 ESLint errors** with perfect compliance
- ✅ **Production-ready** with streamlined architecture
- ✅ **Server reliability** - Emergency recovery procedures in place

### Recent Achievements
- ✅ **Complete React Migration** (2025-06-30) - Modern component architecture with TypeScript
- ✅ **Professional Profile Dropdown** (2025-06-30) - Fully functional flyout with keyboard navigation

## Documentation Files

- **CLAUDETasks.md** - Current roadmap and task tracking
- **CLAUDETaskArchive.md** - Historical completed work record
- **CLAUDETroubleshooting.md** - Server issue troubleshooting guide
- **CLAUDEQuality.md** - Code quality standards and testing
- **CLAUDEFeatures.md** - Feature specifications
- **CLAUDEESLintRules.md** - ESLint configuration standards

## Current Session Recap

### **Complete React Migration & Modern Architecture** (2025-06-30 15:30:00 -07:00)
- ✅ **Header Structure Optimization** - Standardized H1 Zentropy logo across all pages with consistent navigation
- ✅ **Metadata Enhancement** - Added author attribution and optimized title tag placement for SEO
- ✅ **Server Issue Documentation** - Created comprehensive ServerIssue-2025-06-30.md for reliability improvements
- ✅ **Layout Improvement** - Split header with Zentropy logo on left, navigation on right with responsive design
- ✅ **React Architecture Setup** - Complete migration from vanilla HTML/CSS/JS to React + TypeScript
- ✅ **Professional Profile Dropdown** - Fully functional flyout with user info, navigation, keyboard support
- ✅ **Modern Build System** - Vite for fast client builds, separate TypeScript configs for client/server
- ✅ **Component Architecture** - Reusable Header, ProfileDropdown, and page components with proper TypeScript
- ✅ **Project Structure** - Clean separation: src/client/ (React), src/server/ (Express), proper build pipeline
- ✅ **Development Workflow** - Updated npm scripts for React development with hot reload capabilities
- 🔄 **Current Status**: React application fully functional with modern component architecture, ready for complex features