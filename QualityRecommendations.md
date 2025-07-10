# Zentropy Quality Audit - Recommended Actions

This document outlines the actionable tasks derived from the findings in the `QualityAudit.md` file. Each task is designed to address a specific recommendation and further enhance the quality, maintainability, and robustness of the Zentropy codebase.

---

## 1. Backend Improvements (Python/FastAPI)

### Task 1.1: Implement Backend Code Coverage

-   **Recommendation**: To further enhance quality assurance, the project could benefit from implementing a code coverage tool like `pytest-cov`. This would provide a quantitative metric for test coverage and could be used to enforce a minimum coverage threshold for new contributions, ensuring that the test suite grows in lockstep with the application.
-   **Action**: 
    1.  Add `pytest-cov` to the `requirements.txt` file.
    2.  Update the `npm run test:python` script in `package.json` to include coverage reporting (e.g., `pytest --cov=api --cov-report=term-missing`).
    3.  Consider adding a coverage threshold to the `pytest.ini` configuration to fail tests if coverage drops below a certain percentage.
-   **Relevant Documentation**:
    -   `README.md` (Development and Code Quality section)

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 

### Task 1.2: Organize Test Directory Structure

-   **Recommendation**: As the number of test files grows, consider creating subdirectories within the `tests/` directory that mirror the structure of the `api/` directory (e.g., `tests/routers`, `tests/models`). This would improve the organization of the test suite and make it easier for developers to locate tests related to specific parts of the application.
-   **Action**:
    1.  Create new subdirectories within `tests/` (e.g., `tests/routers`, `tests/services`, `tests/models`).
    2.  Move existing test files into the appropriate subdirectories.
    3.  Ensure that the `pytest` command continues to discover and run all tests correctly after the reorganization.
-   **Relevant Documentation**:
    -   `tests/README.md`
    -   `api/README.md`

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 

---

## 2. Frontend Improvements (TypeScript/React)

### Task 2.1: Add Service-Level Unit Tests

-   **Recommendation**: While the frontend test suite is robust, there is an opportunity to add dedicated unit tests for the service layer. Files such as `CalendarService.ts`, `DashboardService.ts`, and `UserService.ts` currently lack specific tests. Adding service-level tests would better isolate API logic, improve maintainability, and ensure full adherence to the project's hybrid testing strategy.
-   **Action**:
    1.  Create new test files: `src/client/services/__tests__/CalendarService.test.ts`, `src/client/services/__tests__/DashboardService.test.ts`, and `src/client/services/__tests__/UserService.test.ts`.
    2.  Write unit tests for each public method in these services, mocking the `fetch` calls to isolate the service logic.
-   **Relevant Documentation**:
    -   `tests/README.md`
    -   `src/client/services/README.md`

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 

### Task 2.2: Enforce Frontend Test Coverage

-   **Recommendation**: The project provides a command to run frontend tests with coverage (`vitest run --coverage`), but there is no enforced minimum threshold. To prevent the gradual degradation of test quality, consider integrating a coverage check into the `npm run quality` pipeline.
-   **Action**:
    1.  Update the `test:frontend` script in `package.json` to include a coverage threshold check (e.g., `vitest run --coverage --coverage.failUnder=85`).
    2.  Ensure this script is included in the main `npm run quality` command.
-   **Relevant Documentation**:
    -   `README.md` (Development and Code Quality section)

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 

### Task 2.3: Add Consistent TSDoc Comments

-   **Recommendation**: While the codebase is strongly typed, many reusable components could benefit from consistent TSDoc comments for their props. This would improve the developer experience by providing inline documentation within the IDE, explaining the *purpose* and usage of each prop, not just its type.
-   **Action**:
    1.  Review the props for the atomic components in `src/client/components/atoms` (`Button.tsx`, `Card.tsx`, `Input.tsx`) and add TSDoc comments for each prop.
    2.  Review the props for complex components like `AuthModal.tsx` and `NavigationPanel.tsx` and add TSDoc comments.
-   **Relevant Documentation**:
    -   `src/client/components/README.md`

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 

### Task 2.4: Consolidate Mocks in `App.test.tsx`

-   **Recommendation**: In `App.test.tsx`, the mocks for various hooks (`useAuth`, `useGoogleOAuth`) and components are defined directly within the test file. For even better organization and reusability, these could be extracted into a central `__mocks__` directory.
-   **Action**:
    1.  Create a `src/client/__mocks__` directory.
    2.  Move the mock implementations for `useAuth`, `useGoogleOAuth`, etc., into separate files within the mocks directory.
    3.  Update `App.test.tsx` to use these centralized mocks.
-   **Relevant Documentation**:
    -   `tests/README.md`

#### Action Taken:
- **Status**: 🔲 Not Started
- **Date**: 
- **Notes**: 
- **Completed Steps**: 
- **Next Steps**: 
