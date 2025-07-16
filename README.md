# Zentropy - Product Management Platform

A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Python FastAPI, React, PostgreSQL, and TypeScript. Streamlines product development from planning to delivery.

## Getting Started

Follow these steps to get the Zentropy development environment up and running on your local machine.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- [Python](https://www.python.org/downloads/) (3.8+) and `pip`
- [Node.js](https://nodejs.org/en/download/) (16+) and `npm`

### 1. Clone the Repository

```bash
git clone <repository-url>
cd zentropy
```

### 2. Configure Environment Variables

Copy the example environment file. No changes are needed for local development, but this file is required.

```bash
cp .env.example .env
```

### 3. Install Dependencies

Install both backend and frontend dependencies.

```bash
# Install Python dependencies
python3 -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### 4. Launch Backend Services

Start the PostgreSQL database, Redis, and Mailpit using Docker.

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL**: Database server on port 5432
- **Redis**: Cache and rate limiting on port 6379  
- **Mailpit**: Email testing server on port 1025 (SMTP) and 8025 (Web UI)

### 5. Set Up the Database

Initialize the database schema and create the necessary tables.

```bash
npm run dev:database
```

### 6. Run the Application

Start the FastAPI backend and the React frontend with a single command.

```bash
npm run dev
```

You should now be able to access:
- **Frontend**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:3000/docs`
- **Mailpit Email Testing**: `http://localhost:8025`

## Development and Code Quality

This project enforces a strict set of code quality standards to ensure maintainability, readability, and consistency. All contributions are expected to pass the automated quality checks.

### Quality Tooling

We use a combination of industry-standard tools to analyze and format the code:

- **Python (Backend):**
    - `flake8`: For linting and style checking.
    - `black`: For automated, opinionated code formatting.
    - `pyright`: For static type checking.
- **TypeScript (Frontend):**
    - `ESLint`: For linting and identifying issues in TypeScript and React code.
    - `Prettier`: For automated code formatting.

### Running Quality Checks

Before committing any code, please run the full quality pipeline to ensure your changes meet our standards.

```bash
# Run all linting, formatting, type-checking, and ensure no warnings are present
npm run quality
```

To automatically fix many of the formatting and linting issues, you can use:

```bash
# Auto-fix formatting and linting issues
npm run fix
```

### Pre-commit Hooks

We use **Husky** to manage pre-commit hooks. When you commit your changes, a subset of the quality checks will run automatically. The commit will be aborted if any issues are found. This ensures that no code that violates our standards is introduced into the repository.

### Running Tests

The project has a comprehensive three-layer testing strategy covering unit, integration, and end-to-end tests:

```bash
# Run all tests (backend + frontend)
npm run test

# Run backend tests only (Python/pytest)
npm run test:backend

# Run frontend tests only (TypeScript/vitest)
npm run test:frontend

# Run end-to-end tests (complete user workflows)
npm run test:e2e

# Run complete quality pipeline (format, lint, type-check, test)
npm run quality
```

**Testing Layers:**
- **Unit & Integration Tests**: `pytest` (backend) and `vitest` (frontend) for fast feedback
- **End-to-End Tests**: `Playwright` for complete user workflow validation across browsers
- **Quality Pipeline**: Comprehensive validation including linting, formatting, type-checking, and all tests

For detailed testing strategies and guidelines, see our [Testing Documentation](#testing-documentation).

## Email Testing with Mailpit

Zentropy includes email verification functionality for user registration. During development, we use **Mailpit** to test email sending without actually sending emails to real addresses.

### How to Use Mailpit

1. **Start Mailpit**: It automatically starts when you run `docker-compose up -d`
2. **Access Web Interface**: Open `http://localhost:8025` in your browser
3. **Test Email Sending**: Register a new user account and check Mailpit for the verification email
4. **View Emails**: All emails sent by the application will appear in the Mailpit interface

### Email Configuration

The application uses the following email settings for development:
- **SMTP Server**: localhost:1025 (Mailpit)
- **From Address**: noreply@zentropy.local
- **From Name**: Zentropy
- **TLS**: Disabled (safe for local development)

For production deployment, update the email configuration in your `.env` file with your actual SMTP provider details.

## Features

- **Sprint Capacity Planning**: Calculate team capacity based on velocity and availability
- **Team Management**: User roles, permissions, and team collaboration tools  
- **Project Workflows**: Track projects from planning to delivery
- **Calendar Integration**: Manage PTO, holidays, and team availability
- **User Authentication**: Secure login, registration, and session management
- **Real-time Collaboration**: Team-based project management and communication

## Architecture & Tech Stack

This project uses a modern, decoupled architecture with a Python backend and a React frontend, following a layered design approach to ensure separation of concerns.

### Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Development & Testing**: Docker, High-performance three-layer testing with `pytest`, `vitest`, and `Playwright`

### High-Level Architecture

The system is composed of three main parts:

1.  **React Frontend**: A single-page application built with Vite that handles all user interface and interactions.
2.  **FastAPI Backend**: A Python-based API that serves data to the frontend and handles all business logic.
3.  **PostgreSQL Database**: The primary data store, managed via Docker for consistent development environments.

### Project Structure

The codebase is organized into distinct directories with clear responsibilities:

```
/api/           # Python FastAPI backend
/src/client/    # React TypeScript frontend
/tests/         # Unit and integration tests (high-performance)
/tests-e2e/     # End-to-end tests with Playwright
/scripts/       # Development and utility scripts
/docs/          # Project-wide documentation
/examples/      # End-to-end feature examples
```

## Project Documentation

This project includes extensive documentation to help you understand the architecture, code, and development patterns.

### Core Architecture & Development
- **[Architecture Deep Dive](./docs/architecture/README.md)**: A comprehensive analysis of the system architecture, technology stack, and design patterns.
- **[Database Schema](./docs/database-erd.md)**: The complete Entity Relationship Diagram (ERD) and data model details.
- **[API Module](./api/README.md)**: Documentation for the backend FastAPI application.
- **[API Routers](./api/routers/README.md)**: RESTful endpoint documentation with authentication and validation patterns.

### Testing Documentation
- **[Unit & Integration Testing](./tests/README.md)**: Comprehensive guide to high-performance backend (pytest) and frontend (vitest) testing strategies, quality pipeline, and TDD practices.
- **[End-to-End Testing](./tests-e2e/README.md)**: Playwright browser testing for complete user workflows and cross-system validation.
- **[Test Coverage Matrix](./docs/testing/TestCoverage.md)**: Cross-layer test coverage mapping with performance metrics across unit, integration, and E2E tests.

### Frontend Development
- **[UI Components](./src/client/components/README.md)**: A guide to the reusable React components and design system.
- **[React Hooks](./src/client/hooks/README.md)**: Custom hooks for state management, API interactions, and business logic.
- **[Service Layer](./src/client/services/README.md)**: Frontend services that bridge React components with backend APIs.

### Examples & Guides
- **[Examples Overview](./examples/README.md)**: Complete working examples of extending the Zentropy application.
- **[Adding New Features](./examples/adding-new-feature/README.md)**: A step-by-step guide to adding a new CRUD feature from the database to the UI.
- **[Creating UI Components](./examples/ui-component/README.md)**: Learn how to build reusable components that follow our design system.
- **[Performance Testing](./performance/README.md)**: Performance testing tools and configurations for load testing, optimization, and high-performance test execution.