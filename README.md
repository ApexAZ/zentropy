# Zentropy - Product Management Platform

A comprehensive Product Management platform with project workflows, team collaboration, and capacity planning built with Node.js, Express, PostgreSQL, and TypeScript. Streamlines product development from planning to delivery.

## Features

- **Sprint Capacity Planning**: Calculate team capacity based on velocity and availability
- **Team Management**: User roles, permissions, and team collaboration tools  
- **Project Workflows**: Track projects from planning to delivery
- **Calendar Integration**: Manage PTO, holidays, and team availability
- **User Authentication**: Secure login, registration, and session management
- **Real-time Collaboration**: Team-based project management and communication

## Project Structure

```
src/
├── server/          # Express server, middleware, app configuration
├── routes/          # API route handlers and endpoint definitions
├── models/          # Database models, schemas, and data access layer
├── client/          # Frontend TypeScript code, components, utilities
├── public/          # Static assets (HTML, CSS, images, client-side JS)
├── shared/          # Shared utilities, types, and constants used by both client and server
└── __tests__/       # Test files for all components
```

## Folder Purposes

- **server/**: Contains the Express application setup, middleware configuration, and server initialization
- **routes/**: API endpoints organized by feature (users, teams, calendar, projects, workflows)
- **models/**: Database entities, query builders, and data validation logic
- **client/**: Frontend application logic, user interface components, and client-side utilities
- **public/**: Static files served directly by the web server (HTML templates, CSS, bundled JavaScript)
- **shared/**: Code shared between frontend and backend (TypeScript interfaces, constants, utility functions)
- **__tests__/**: Test files following the same structure as the source code

## Development Approach

This project follows a layered architecture approach:
1. **Layer 1**: Foundation (Project Structure, Database, Web Server)
2. **Layer 2**: Core Data Models (Users, Teams, Projects)
3. **Layer 3**: Business Logic (Workflows, Permissions, Validation)
4. **Layer 4**: Product Management Engine (Capacity, Planning, Tracking)
5. **Layer 5**: User Interface (Dashboard, Forms, Collaboration Tools)
6. **Layer 6**: Integration & Polish (Real-time Updates, Notifications)

Each layer builds upon the previous one, ensuring a solid foundation for comprehensive product management.