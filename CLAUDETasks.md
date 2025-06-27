# Project Tasks and Development Roadmap

This file contains project roadmap, development tasks, priorities, and implementation tracking for the Capacity Planner project.  This is a living document that should be updated regularly.

## Table of Contents
1. [Project Phases & Roadmap](#project-phases--roadmap)
2. [Current Implementation Status](#current-implementation-status)
3. [Development Approach](#development-approach)
4. [Learning & Development Focus](#learning--development-focus)
5. [Future Planning Items (TBD)](#future-planning-items-tbd)

---

## Project Phases & Roadmap

### Current Phase: MVP
Basic team management, calendar system, and capacity calculation

### Next Phase: Advanced Features
- React migration for improved UI/UX
- Multi-team support and coordination
- Azure deployment for production hosting

---

## Current Implementation Status

### Completed Vertical Slices 
1. **Working Days Calculator** - Comprehensive business logic with full test coverage
2. **Team Management** - Full CRUD operations and UI with 142 tests
3. **Calendar Entry Management** - PTO/holiday tracking with complete integration

### Next Priority: Sprint Capacity Dashboard =�
**Objectives**:
- Auto-generate sprints based on team configuration
- Real-time capacity visualization with team availability
- Complete end-to-end capacity planning workflow

**Quality Metrics Achieved**:
- All tests passing with 100% reliability
- 0 ESLint errors/warnings with strict TypeScript compilation
- Comprehensive test coverage across all architectural layers

---

## Development Approach

### Vertical Slice Development Standards (INVEST)

#### INVEST Criteria for All Feature Development
- **Independent**: Each slice should be self-contained and not dependent on other unfinished slices
- **Negotiable**: Scope can be adjusted based on learning and feedback during implementation
- **Valuable**: Each slice delivers working functionality that users can actually test and interact with
- **Estimable**: Slice scope should be small enough to complete and test within a reasonable timeframe
- **Small**: Keep slices minimal - focus on core functionality, avoid feature creep
- **Testable**: Each slice must include both automated tests and manual functional testing

#### Vertical Slice Structure Requirements
- **Full Stack**: Every slice must include database � API � frontend � tests
- **End-to-End Functionality**: Users should be able to complete a real workflow through the web interface
- **Immediate Feedback**: Each slice should be demonstrable and testable upon completion
- **Iterative Validation**: Validate assumptions and gather feedback before building the next slice
- **Progressive Enhancement**: Each slice builds upon previous functionality without breaking existing features

### Project Lifecycle Preferences
- **Planning approach**: Vertical slices following INVEST principles for immediate testability
- **Refactor vs rebuild decisions**: TBD (to be examined)
- **Technical debt handling**: TBD (to be examined)

---

## Learning & Development Focus

### Current Focus Areas
- **Project focus**: Web development fundamentals with capacity planning tool
- **Skills to develop**: TBD (temporary - learning options)

### Areas for Future Definition
- **Preferred session lengths**: TBD (to be examined)
- **Break reminders/focus techniques**: TBD (to be examined)
- **Context switching approach**: TBD (to be examined)

---

## Future Planning Items (TBD)

### Code Quality & Development Preferences
- [ ] **Line length limit**: TBD (temporary - learning options)
- [ ] **Learning approach**: TBD (to be examined - theory first vs hands-on first)
- [ ] **Problem-solving limits**: TBD (to be examined - research time, when to ask for help)
- [ ] **Tool stability preference**: TBD (to be examined - stable vs bleeding-edge)

### Security & Safety
- [ ] **Sensitive data handling**: TBD (to be examined)
- [ ] **Code safety checks**: TBD (to be examined)

### Maintenance & Operations
- [ ] **Dependency update approach**: TBD (to be examined - conservative vs aggressive)
- [ ] **Code cleanup frequency**: TBD (to be examined)
- [ ] **Tool update preferences**: TBD (to be examined - auto vs manual)

### Error Recovery & Backup
- [ ] **Backup strategies**: TBD (to be examined)
- [ ] **Rollback preferences**: TBD (to be examined - git revert vs manual fixes)
- [ ] **Solution documentation**: TBD (to be examined)

---

## Next Steps & Priorities

### Current Priority: User Authentication System 🔐

**Implementation Phases** (following INVEST principles and TDD methodology):

#### **Phase 1: Core Authentication Foundation**

##### **1. Password Security Service - Implementation Tasks**

**Task 1: Install bcrypt dependencies and TypeScript types**
- Install bcrypt and @types/bcrypt packages
- Verify compatibility with current Node.js version

**Task 2: Write comprehensive tests for password policy validation**
- Test minimum/maximum length requirements
- Test complexity requirements (uppercase, lowercase, numbers, symbols)
- Test forbidden patterns and common passwords
- Test password reuse prevention

**Task 3: Write tests for password hashing and verification**
- Test secure hashing with proper salt rounds (10+)
- Test password verification (correct/incorrect passwords)
- Test hash format and security properties

**Task 4: Implement password policy validation**
- Create validation functions for all password requirements
- Implement password strength scoring
- Add password reuse checking logic

**Task 5: Implement secure password hashing service**
- Create PasswordService class with bcrypt integration
- Implement hash and verify methods
- Add proper error handling and logging

**Task 6: Integrate PasswordService with existing User model**
- Update User model to use PasswordService for all password operations
- Maintain backward compatibility with existing data
- Add password history tracking

**Task 7: Update existing user creation endpoints to use secure password handling**
- Update API routes to use new password service
- Ensure all user creation paths are secured
- Add proper validation and error responses

*These tasks follow TDD methodology - write tests first, then implement functionality. Each task is small, focused, and builds upon the previous one.*

2. **Session Management System**
   - Server-side session storage with PostgreSQL
   - Secure HTTP-only cookies with proper expiration
   - Session timeout and cleanup mechanisms

3. **Authentication Middleware**
   - Route protection for existing APIs
   - Role-based access control enforcement
   - Request authentication context

4. **Login/Logout API Endpoints**
   - Secure authentication endpoints with rate limiting
   - Account lockout after failed attempts
   - Comprehensive audit logging

#### **Phase 2: User Experience & Security**
5. **Frontend Authentication UI**
   - Login/logout forms with TypeScript event delegation
   - Session timeout warnings and handling
   - Protected route management

6. **Password Management**
   - Password reset via secure email tokens
   - Self-service password change
   - Password history to prevent reuse

7. **Enhanced Security**
   - Account lockout and suspicious activity detection
   - Security headers and CSRF protection
   - Rate limiting and monitoring

#### **Phase 3: User Administration**
8. **User Registration & Management**
   - Admin user creation with secure invitations
   - Email verification system
   - User role assignment and management

9. **Multi-Team Role Support**
   - Users with different roles across teams
   - Permission inheritance and hierarchy
   - Cross-team access controls

#### **Phase 4: Enterprise Integration**
10. **Azure AD Integration**
    - OAuth 2.0 flow with Azure AD
    - User attribute and group mapping
    - Fallback authentication mechanisms

11. **Google SSO Integration**
    - Google OAuth 2.0 and Workspace support
    - Multi-provider selection UI
    - Account linking between providers

### Future Priorities
1. **Sprint Capacity Dashboard Implementation**

### Future Enhancements
2. **API Enhancements**:
   - Add proper date validation (Invalid Date handling)
   - Implement conflict checking for calendar entries
   - Add rate limiting and security headers
   - Performance optimization and caching

3. **Production Readiness**:
   - Azure deployment preparation
   - Multi-team support implementation
   - React migration planning and execution
   - Performance monitoring and optimization

---

*This document should be updated as tasks are completed and new priorities emerge. All task-related content has been moved here from CLAUDE.md to maintain clear separation between technical documentation and project management.*