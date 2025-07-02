# Zentropy - Product Management Platform

A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Python FastAPI, React, PostgreSQL, and TypeScript. Streamlines product development from planning to delivery.

## Features

- **Sprint Capacity Planning**: Calculate team capacity based on velocity and availability
- **Team Management**: User roles, permissions, and team collaboration tools  
- **Project Workflows**: Track projects from planning to delivery
- **Calendar Integration**: Manage PTO, holidays, and team availability
- **User Authentication**: Secure login, registration, and session management
- **Real-time Collaboration**: Team-based project management and communication

## Project Structure

```
api/                 # Python FastAPI backend
├── main.py          # FastAPI application and configuration
├── auth.py          # Authentication and JWT handling
├── database.py      # Database connection and models (SQLAlchemy)
├── schemas.py       # Pydantic request/response schemas
└── routers/         # API route handlers organized by feature
    ├── auth.py
    ├── users.py
    ├── teams.py
    ├── calendar_entries.py
    └── invitations.py

src/client/          # React TypeScript frontend
├── App.tsx          # Main React application
├── main.tsx         # React 18 root setup
├── components/      # Reusable UI components
├── pages/           # Page-level components
├── styles.css       # Global styles and CSS custom properties
└── types/           # TypeScript type definitions

scripts/             # Development and utility scripts
├── dev-startup.js   # Intelligent development server orchestration
├── stop.js          # Clean shutdown of all services
├── check-ports.js   # Port availability checker
└── setup-database.sh # Database initialization
```

## Architecture Overview

- **Backend**: Python FastAPI with SQLAlchemy ORM and PostgreSQL database
- **Frontend**: React 18 with TypeScript, Vite build tool, and TailwindCSS
- **Authentication**: JWT tokens with bcrypt password hashing
- **Development**: Docker PostgreSQL + Python uvicorn + React Vite dev server
- **Quality**: Comprehensive linting, formatting, and type checking for both Python and TypeScript

## Development Approach

This project follows a layered architecture approach:
1. **Layer 1**: Foundation (Project Structure, Database, Web Server)
2. **Layer 2**: Core Data Models (Users, Teams, Projects)
3. **Layer 3**: Business Logic (Workflows, Permissions, Validation)
4. **Layer 4**: Product Management Engine (Capacity, Planning, Tracking)
5. **Layer 5**: User Interface (Dashboard, Forms, Collaboration Tools)
6. **Layer 6**: Integration & Polish (Real-time Updates, Notifications)

Each layer builds upon the previous one, ensuring a solid foundation for comprehensive product management.