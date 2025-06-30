# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Management & Timestamping Standards (Established 2025-06-29)
- **Timestamp Requirement**: All tasks and sub-tasks must include date and time stamps when added to project documentation
- **Completion Tracking**: Include completion timestamps for all finished tasks and sub-tasks in CLAUDETasks.md
- **Format Standard**: Use format "YYYY-MM-DD HH:MM:SS (timezone)" for consistency across all project documentation
- **Status Tracking**: Include start times, completion times, and duration calculations where applicable
- **Progress Documentation**: Maintain clear task progression history for project planning and retrospectives
- **Session Continuity**: Timestamps enable seamless session resumption and accurate progress measurement

## Development Notes
- ✅ Streamlined development commands - removed 7 redundant/obsolete scripts
- ✅ Server hanging issue resolved - emergency recovery procedures in place
- ✅ **Enhanced pre-commit testing** - Full quality check + server startup validation prevents bad commits

## Project Overview

A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Node.js, Express, PostgreSQL, and TypeScript. The platform streamlines product development from planning to delivery, featuring sprint capacity calculations, team management, project tracking, and workflow automation.

**📋 For project roadmap, development tasks, and implementation tracking, see [CLAUDETasks.md](./CLAUDETasks.md)**

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
npm run format                        # Format code with Prettier
npm run quality                       # Run all quality checks (lint, format, type-check)
npm run type-check                    # TypeScript compilation check

# Static Files
npm run copy-static                   # Copy static files to dist/public
npm run check-static                  # Verify static files are present
```

### Health Checks
```bash
curl http://localhost:3000/health      # Check server and database status
```

## Previous Session History

### ✅ Server Issue Resolution (2025-06-29)
**Issue**: Server hanging after PC reboot - "localhost refused to connect"  
**Root Cause**: Corrupted build artifacts and import dependency caching in 29 utility files  
**Solution**: Systematic rebuilding with import testing cleared module cache corruption  
**Prevention**: Auto port cleanup, safety checks, emergency recovery scripts, streamlined commands  
**Result**: Development environment fully operational with bulletproof recovery systems

### ✅ Project Transformation & Script Optimization (2025-06-30)
**Issue**: Complete project rename from capacity-planner to zentropy + recurring server startup issues  
**Root Cause**: Complex script chaining, port management race conditions, documentation misalignment  
**Solution**: Systematic project rebrand, streamlined npm scripts (29→23), improved startup reliability  
**Prevention**: Simplified development workflow, better script organization, comprehensive documentation updates  
**Result**: Fully operational "Zentropy - Product Management Platform" with bulletproof development scripts

## Context Files for Claude Code

- **CLAUDE.md** - Project memory, session recaps, development commands
- **CLAUDETasks.md** - Project roadmap, development tasks, implementation tracking  
- **CLAUDETroubleshooting.md** - Complete server issue troubleshooting & prevention guide
- **CLAUDEQuality.md** - Code quality standards and testing approaches
- **CLAUDEFeatures.md** - Feature specifications and implementation details
- **CLAUDEESLintRules.md** - ESLint configuration and coding standards