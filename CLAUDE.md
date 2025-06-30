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
- ✅ **Server Issue Resolution** (2025-06-29) - Bulletproof recovery systems implemented
- ✅ **Project Transformation** (2025-06-30) - Complete zentropy rebrand with optimized scripts

## Current Session Recap

### **Frontend Quality & Validation Setup** (2025-06-30 14:45:00 -07:00)
- ✅ **Index Page Creation** - Created main index.html with consistent header styling and navigation
- ✅ **Header Standardization** - Updated all pages to use "Zentropy" branding with clickable logo links
- ✅ **HTML Validation Added** - Integrated html-validate for semantic HTML validation (57 → 0 errors)
- ✅ **CSS Validation Added** - Integrated Stylelint for CSS best practices (178 → 0 errors)
- ✅ **CSS Cleanup Complete** - Fixed syntax errors, removed 22 duplicate selectors, modernized color/shadow syntax
- ✅ **CSS Reset Added** - Comprehensive CSS reset with font-size: 100% and explicit inheritance
- ✅ **Quality Pipeline Enhanced** - Updated scripts for HTML/CSS validation in build process
- 🔄 **Current Status**: Zero validation errors across TypeScript, HTML, and CSS

## Documentation Files

- **CLAUDETasks.md** - Current roadmap and task tracking
- **CLAUDETaskArchive.md** - Historical completed work record
- **CLAUDETroubleshooting.md** - Server issue troubleshooting guide
- **CLAUDEQuality.md** - Code quality standards and testing
- **CLAUDEFeatures.md** - Feature specifications
- **CLAUDEESLintRules.md** - ESLint configuration standards