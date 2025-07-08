# Gemini Onboarding Guide: Zentropy Project

This document provides the essential context for working on the Zentropy codebase. Adhere strictly to these guidelines, patterns, and architectural decisions.

## 1. Project Overview

Zentropy is a comprehensive Product Management platform built with a Python/FastAPI backend and a React/TypeScript frontend. The project prioritizes code excellence, a robust testing culture, and a seamless developer experience.

**Core Goal**: A high-quality, maintainable, and scalable application.
**Primary Reference**: `CLAUDE.md` is the main source of truth for architecture and development workflow.

## 2. Technology Stack & Architecture

The architecture is a decoupled frontend/backend system.

### Backend (Python)
- **Framework**: FastAPI with Uvicorn.
- **ORM**: SQLAlchemy for PostgreSQL.
- **Database**: PostgreSQL, managed via Docker.
- **Authentication**: JWT tokens (`python-jose`) with bcrypt password hashing (`passlib`).
- **Key Directories**: `api/` (source), `tests/` (tests).
- **Reference**: See `api/README.md` for backend patterns.

### Frontend (TypeScript/React)
- **Framework**: React with TypeScript.
- **Build Tool**: Vite (root is `src/client/`).
- **Styling**: TailwindCSS with a **semantic color system**. Do not use literal color classes (e.g., `bg-blue-500`); use semantic classes like `bg-interactive`. The color definitions are in `src/client/styles.css`.
- **Component Architecture**: Atomic Design (`atoms`, `molecules`, `organisms`). Reusable components are a priority. See `src/client/components/README.md`.
- **State Management**: Custom hooks (`useAuth`, `useTeams`). See `src/client/hooks/README.md`.
- **API Interaction**: Centralized in service classes (`AuthService`, `TeamService`). See `src/client/services/README.md`.

## 3. Development Workflow

### Core Commands
- `npm run dev`: Starts the full development environment (API + React + DB). **Note**: This may not work in all remote execution environments; manual startup might be needed.
- `npm run quality`: **RUN THIS BEFORE COMMITTING.** It runs the full quality pipeline (lint, format, type-check, tests).
- `npm run test`: Runs the complete test suite (Python + React).
- `npm run fix`: Auto-fixes formatting and linting issues.

### Environment Variables
- **Backend**: `.env` in the project root.
- **Frontend**: `src/client/.env.local`. This is critical due to Vite's root configuration.
- **Reference**: `MULTIDEV.md` for multi-machine setup.

## 4. Testing: The Cornerstone of Quality

This project has a **mandatory TDD culture** and a unique, powerful testing infrastructure.

### The Auto-Isolation System (Python)
- **What it is**: A system in `tests/conftest.py` that **automatically provides an isolated, in-memory SQLite database for any test that needs it.**
- **How it works**: It detects the need for a database based on test name patterns (e.g., `_user_creation_`), fixture requests, or module imports (e.g., importing a database model).
- **Your Task**: When writing a backend test that touches the database, simply write the test logic. The isolation is handled for you. You can use the `client` and `db` fixtures as needed.
- **Reference**: `tests/README.md` and `CLAUDE.md` have detailed explanations.

### Hybrid Testing Strategy (Frontend)
- **Philosophy**: Test meaningful user behavior, not implementation details.
- **Pattern**: Extract pure, testable logic (validation, API request formatting) from components into utility modules. Write comprehensive unit tests for these utilities. Keep component tests focused on user workflows.
- **Reference**: `CLAUDEQuality.md` provides a deep dive into this strategy.

## 5. Code Excellence Principles

The project is undergoing a "Code Excellence" transformation. Follow these principles from `CodeCleanup.md`:
- **Simplicity First**: Write clear, purposeful code.
- **Consolidate**: Prefer single, unified components and services over multiple, scattered ones (e.g., `AuthModal` replaced three separate modals).
- **RESTful & Intuitive APIs**: Follow the established versioned (`/api/v1/`) and RESTful patterns.
- **Atomic Design**: Build and use reusable components.

## 6. Key Documentation Files

For deeper dives, refer to these files. They are the project's memory.

- **`CLAUDE.md`**: The **primary guide**. Covers architecture, development workflow, testing, and project status in great detail.
- **`README.md`**: High-level project overview.
- **`CodeCleanup.md`**: The vision and roadmap for making the codebase best-in-class. Outlines the 10 pillars of code excellence.
- **`CLAUDEQuality.md`**: Explains the hybrid testing strategy for the frontend.
- **`tests/README.md`**: Details the auto-isolation testing system for the backend.
- **`zentropy_prd.md`**: The product requirements document.
- **`docs/architecture/README.md`**: A detailed analysis of the system architecture.
- **`examples/`**: Contains end-to-end guides for adding new features and components.
- **Module READMEs**:
    - `api/README.md`
    - `api/routers/README.md`
    - `src/client/components/README.md`
    - `src/client/hooks/README.md`
    - `src/client/services/README.md`
