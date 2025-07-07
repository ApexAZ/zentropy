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

Start the PostgreSQL database and Redis using Docker.

```bash
docker-compose up -d
```

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

## Development and Code Quality

This project enforces a strict set of code quality standards to ensure maintainability, readability, and consistency. All contributions are expected to pass the automated quality checks.

### Quality Tooling

We use a combination of industry-standard tools to analyze and format the code:

- **Python (Backend):**
    - `flake8`: For linting and style checking.
    - `black`: For automated, opinionated code formatting.
    - `mypy`: For static type checking.
- **TypeScript (Frontend):**
    - `ESLint`: For linting and identifying issues in TypeScript and React code.
    - `Prettier`: For automated code formatting.

### Running Quality Checks

Before committing any code, please run the full quality pipeline to ensure your changes meet our standards.

```bash
# Run all linting, formatting, and type-checking
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

The project has a comprehensive test suite covering both the backend and frontend. To run all tests, use the following command:

```bash
# Run all Python and React tests
npm run test
```
This command executes the `pytest` suite for the backend and the `vitest` suite for the frontend.

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
- **Development & Testing**: Docker, `pytest` for backend tests, `vitest` for frontend tests

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
/tests/         # Backend tests
/scripts/       # Development and utility scripts
/docs/          # Project-wide documentation
/examples/      # End-to-end feature examples
```

## Project Documentation

This project includes extensive documentation to help you understand the architecture, code, and development patterns.

- **[Architecture Deep Dive](./docs/architecture/README.md)**: A comprehensive analysis of the system architecture, technology stack, and design patterns.
- **[Database Schema](./docs/database-erd.md)**: The complete Entity Relationship Diagram (ERD) and data model details.
- **[Testing Guide](./tests/README.md)**: An in-depth look at our testing infrastructure and how to write tests.
- **[Adding New Features](./examples/adding-new-feature/README.md)**: A step-by-step guide to adding a new CRUD feature from the database to the UI.
- **[Creating UI Components](./examples/ui-component/README.md)**: Learn how to build reusable components that follow our design system.
- **[API Module](./api/README.md)**: Documentation for the backend FastAPI application.
- **[UI Components](./src/client/components/README.md)**: A guide to the reusable React components.