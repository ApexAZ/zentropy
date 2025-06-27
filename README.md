# Sprint Capacity Planning Tool

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
- **routes/**: API endpoints organized by feature (users, teams, calendar, capacity)
- **models/**: Database entities, query builders, and data validation logic
- **client/**: Frontend application logic, user interface components, and client-side utilities
- **public/**: Static files served directly by the web server (HTML templates, CSS, bundled JavaScript)
- **shared/**: Code shared between frontend and backend (TypeScript interfaces, constants, utility functions)
- **__tests__/**: Test files following the same structure as the source code

## Development Approach

This project follows a layered architecture approach:
1. **Layer 1**: Foundation (Project Structure, Database, Web Server)
2. **Layer 2**: Core Data Models  
3. **Layer 3**: Business Logic
4. **Layer 4**: Capacity Engine
5. **Layer 5**: User Interface
6. **Layer 6**: Integration & Polish

Each layer builds upon the previous one, ensuring a solid foundation for learning and development.