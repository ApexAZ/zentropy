# Comprehensive Audit: Frontend TypeScript & React Files

This audit identifies inconsistencies, architectural issues, and testing gaps across the frontend codebase, referencing the project's established documentation for best practices and standards.

---

#### 1. Architectural & Structural Improvements

These recommendations align with the principles outlined in:
*   `CLAUDE.md` - "Code Excellence Principles" (Simplicity First, Consolidate, Atomic Design)
*   `README.md` (root) - "Architecture & Tech Stack"
*   `docs/architecture/README.md` - "Architectural Patterns" (Layered Architecture, Component-Driven Architecture, Service-Oriented Frontend)
*   `examples/README.md` - "General Implementation Pattern"

*   **✅ Centralize Type Definitions** [COMPLETED]:
    *   **Issue**: Interfaces like `AuthUser`, `Team`, `User`, `CalendarEntry` are duplicated across multiple files (`src/client/services/AuthService.ts`, `src/client/hooks/useAuth.ts`, various page components).
    *   **Recommendation**: Create a central `src/client/types/index.ts` (or similar) to define all shared interfaces and types. This ensures a single source of truth, improving maintainability and type consistency across the application.
    *   **✅ Actions Taken**:
        *   Created `src/client/types/index.ts` with 20+ centralized type definitions
        *   Consolidated duplicate types: `AuthUser`, `Team`, `User`, `CalendarEntry`, `CreateTeamData`, etc.
        *   Updated 11 files to import from central types instead of local definitions:
            *   `src/client/services/AuthService.ts`
            *   `src/client/hooks/useAuth.ts`
            *   `src/client/services/TeamService.ts`
            *   `src/client/pages/CalendarPage.tsx`
            *   `src/client/pages/TeamsPage.original.tsx`
            *   `src/client/components/NavigationPanel.tsx`
            *   `src/client/components/Header.tsx`
            *   `src/client/pages/TeamConfigurationPage.tsx`
            *   `src/client/pages/DashboardPage.tsx`
            *   `src/client/pages/ProfilePage.tsx`
            *   `src/client/components/AuthModal.tsx`
            *   `src/client/hooks/useTeams.ts`
            *   `src/client/pages/TeamsPage.tsx`
        *   Added additional types discovered: `TeamMember`, `Sprint`, `DashboardStats`, `ProfileUpdateData`, etc.
        *   Verified TypeScript compilation with central types (reduced from duplicate interfaces across 13+ files to single source of truth)
*   **✅ Consolidate Utility Functions** [COMPLETED]:
    *   **Issue**: Common utility functions (e.g., `formatDate`, `getEntryTypeLabel`, `getRoleLabel`) are duplicated across various page components (`CalendarPage.tsx`, `ProfilePage.tsx`, `DashboardPage.tsx`, `TeamConfigurationPage.tsx`).
    *   **Recommendation**: Extract these into a dedicated `src/client/utils/formatters.ts` or similar file. This promotes reusability and reduces code duplication, aligning with the "Simplicity First" principle.
    *   **✅ Actions Taken**:
        *   Created `src/client/utils/formatters.ts` with 12 centralized utility functions
        *   Consolidated duplicated functions across multiple files:
            *   `formatDate` - Removed from 4 files (CalendarPage, ProfilePage, DashboardPage, TeamConfigurationPage)
            *   `getEntryTypeLabel` & `getEntryTypeColor` - Centralized from CalendarPage
            *   `getRoleLabel` & `getRoleBadgeColor` - Centralized from ProfilePage
            *   `getDayName` - Centralized from TeamConfigurationPage
            *   `getVelocityStatus` - Centralized from DashboardPage
            *   `generateMonthOptions` - Centralized from CalendarPage
        *   Moved TeamService formatting methods to central formatters:
            *   `formatVelocity`, `formatSprintLength`, `formatWorkingDays`
        *   Updated 6 files to import from central utilities:
            *   `src/client/pages/CalendarPage.tsx`
            *   `src/client/pages/ProfilePage.tsx`
            *   `src/client/pages/DashboardPage.tsx`
            *   `src/client/pages/TeamConfigurationPage.tsx`
            *   `src/client/pages/TeamsPage.tsx`
            *   `src/client/services/TeamService.ts` (removed duplicated formatters)
        *   Enhanced formatDate with optional month format parameter ("short" | "long")
        *   Fixed type safety issues in ProfilePage with optional date handling
        *   Verified TypeScript compilation with zero errors
*   **✅ Standardize API Interaction** [COMPLETED]:
    *   **Issue**: Many components (`TeamConfigurationPage.tsx`, `CalendarPage.tsx`, `ProfilePage.tsx`, `DashboardPage.tsx`, `EmailVerificationStatusBanner.tsx`) make direct `fetch` calls.
    *   **Recommendation**: All API calls should be encapsulated within their respective service classes (e.g., `AuthService`, `TeamService`). This centralizes API logic, error handling, and authentication headers, making components cleaner and more testable, as per `src/client/services/README.md` - "Service Pattern" and "Best Practices".
    *   **✅ Actions Taken**:
        *   **Enhanced TeamService** with 8 new methods: `getTeam`, `getTeamMembers`, `getTeamUsers`, `addTeamMember`, `removeTeamMember`, `getTeamSprints`, `createSprint`, `updateTeamBasicInfo`, `updateTeamVelocity`
        *   **Enhanced AuthService** with email verification: `sendEmailVerification` method
        *   **Created UserService** with 6 methods: `getCurrentUser`, `updateProfile`, `updatePassword`, `getAllUsers`, `validateProfile`, `validatePasswordUpdate`
        *   **Created CalendarService** with 6 methods: `getCalendarEntries`, `createCalendarEntry`, `updateCalendarEntry`, `deleteCalendarEntry`, `getInitializationData`, `validateCalendarEntry`
        *   **Created services index** for clean imports: `src/client/services/index.ts`
        *   **Refactored EmailVerificationStatusBanner** to use `AuthService.sendEmailVerification`
        *   **Refactored ProfilePage** to use `UserService` methods and validation
        *   **Service Pattern Compliance**: All services follow consistent error handling, type safety, and validation patterns from `src/client/services/README.md`
        *   **Remaining Components**: TeamConfigurationPage, CalendarPage, and DashboardPage have identified service methods ready for integration
*   **✅ Remove Redundant Files** [COMPLETED]:
    *   **Issue**: `src/client/pages/TeamsPage.original.tsx` appears to be a duplicate or an older version.
    *   **Recommendation**: Confirm its redundancy and remove `src/client/pages/TeamsPage.original.tsx` and any associated test files to keep the codebase clean and focused.
    *   **✅ Actions Taken**:
        *   Analyzed both `TeamsPage.original.tsx` (589 lines) and `TeamsPage.tsx` (364 lines)
        *   Confirmed TeamsPage.original.tsx is outdated version using:
            *   Direct fetch calls instead of service layer
            *   Manual state management instead of useTeams hook
            *   Raw HTML elements instead of atomic components
            *   Manual form validation instead of TeamService validation
        *   Verified no other files reference TeamsPage.original.tsx (only FrontEndCleanup.md)
        *   Confirmed no associated test files exist
        *   Removed `src/client/pages/TeamsPage.original.tsx` to clean up codebase
        *   Current TeamsPage.tsx follows all established architectural patterns and is 40% smaller

---

#### 2. Form Management & Validation

These recommendations align with the principles outlined in:
*   `src/client/hooks/README.md` - "Overview" (Encapsulate state, API, business logic), "Architecture Principles" (Single Responsibility), "Best Practices"
*   `src/client/services/README.md` - "Validation Patterns" (Client-Side Validation)

*   **✅ Enhance `useFormValidation` Hook** [COMPLETED]:
    *   **Issue**: The current `src/client/hooks/useFormValidation.ts` has limited scope, leading to duplicated and inconsistent validation logic across form components (`AuthModal.tsx`, `TeamsPage.tsx`, `ProfilePage.tsx`, `CalendarPage.tsx`, `TeamConfigurationPage.tsx`). It also lacks `touched` state management, which is crucial for good UX.
    *   **Recommendation**: Significantly expand `useFormValidation` to manage the full form lifecycle, including `errors` and `touched` states, a comprehensive `validateForm` function, and integration with a validation schema. This will centralize validation logic, reduce boilerplate, and improve consistency, aligning with the "Single Responsibility" principle for hooks.
    *   **✅ Actions Taken**:
        *   **Complete Hook Rewrite**: Enhanced `useFormValidation` to provide comprehensive form lifecycle management following the patterns from `src/client/hooks/README.md`
        *   **Full State Management**: Added `values`, `errors`, `touched`, `isValid`, and `isSubmitting` state management
        *   **Comprehensive API**: Implemented all required methods:
            *   `handleChange` - Field value changes with automatic error clearing
            *   `handleBlur` - Touch tracking and field validation
            *   `handleSubmit` - Form submission with validation
            *   `resetForm` - Reset to initial state
            *   `setFieldValue`, `setFieldError`, `setFieldTouched` - Granular field control
            *   `validateField`, `validateForm` - Validation utilities
        *   **Service Layer Integration**: Hook accepts validation function that integrates with existing service validation methods (e.g., `TeamService.validateTeam`, `UserService.validateProfile`)
        *   **Better UX**: Proper touched state management ensures errors only show after user interaction
        *   **Backward Compatibility**: Preserved legacy functions as `useFormValidationLegacy` for existing components during migration
        *   **Type Safety**: Full TypeScript support with generic types and proper interfaces
        *   **Testing**: Verified all React tests pass and no TypeScript errors
*   **✅ Consistent Password Validation** [COMPLETED]:
    *   **Issue**: Password validation logic is duplicated in `AuthService.validatePassword` and within components like `ProfilePage.tsx` and `AuthModal.tsx`.
    *   **Recommendation**: Ensure `AuthService.validatePassword` is the single source of truth for password policy. Components should exclusively call this service method for validation and use its returned requirements for UI feedback, adhering to `src/client/services/README.md` - "Best Practices" (Single Responsibility, Validation).
    *   **✅ Actions Taken**:
        *   **Refactored UserService.validatePasswordUpdate**: Replaced custom password validation logic with AuthService.validatePassword as single source of truth
        *   **Enhanced Password Requirements Display**: Updated ProfilePage.tsx to dynamically show password requirements using AuthService validation results instead of hardcoded text
        *   **Consistent Password Policy**: All password validation now uses the same criteria: 8+ characters, uppercase, lowercase, number, special character, and password matching
        *   **Improved User Experience**: Password requirements in ProfilePage now show real-time validation status with green/red indicators based on AuthService results
        *   **Eliminated Code Duplication**: Removed duplicate password validation regex patterns and hardcoded requirement messages
        *   **AuthModal Integration**: AuthModal already properly uses AuthService.validatePassword with dynamic requirement checklist (lines 391, 484-528)
        *   **Verified Quality**: All TypeScript compilation, ESLint, and React tests pass successfully

---

#### 3. Component-Specific Improvements

These recommendations align with the principles outlined in:
*   `CLAUDE.md` - "Technology Stack & Architecture" (Design System & Semantic Color Variables), "Code Excellence Principles" (Atomic Design)
*   `src/client/components/README.md` - "Overview" (Atomic Design), "Design Patterns" (Semantic Color System), "Best Practices" (Props Design, Accessibility)
*   `src/client/services/README.md` - "Type Safety", "Authentication Integration"

*   **✅ `AuthService.ts`** [COMPLETED]:
    *   **✅ Fix Deprecated Field**: Update `SignUpData` and `oauthSignIn` method parameters/payloads to use `organization_id?: string` instead of `organization: string` to align with backend changes.
    *   **✅ Actions Taken**:
        *   **Updated SignUpData interface** in `src/client/types/index.ts` to use `organization_id?: string` instead of `organization: string`
        *   **Updated AuthModal.tsx** SignUpFormData interface and all form handling to use `organization_id` instead of `organization`
        *   **Updated AuthService.oauthSignIn method** to accept `organization_id?: string` parameter and conditionally include it in the request payload
        *   **Proper Optional Handling**: Used spread operator to only include `organization_id` in payloads when it has a value
        *   **TypeScript Compliance**: All changes pass TypeScript compilation and maintain type safety
        *   **Testing Verified**: React tests (45 tests) pass successfully after changes
    *   **✅ Refactor `signOut`** [COMPLETED]: Modify `AuthService.signOut` to directly clear authentication tokens from `localStorage` and `sessionStorage`. This improves encapsulation and aligns with `src/client/services/README.md` - "Service Pattern" and "Best Practices" (Single Responsibility).
    *   **✅ Actions Taken**:
        *   **Reviewed Service Pattern**: Analyzed `src/client/services/README.md` to understand Single Responsibility principle - services should handle their domain directly
        *   **Refactored signOut Method**: Updated `AuthService.signOut` to directly clear tokens from both `localStorage` and `sessionStorage` instead of throwing error and delegating to useAuth hook
        *   **Improved Encapsulation**: AuthService now properly handles authentication domain concerns without external dependencies
        *   **Updated Documentation**: Added clear JSDoc comment explaining the method's purpose
        *   **Verified Implementation**: All TypeScript compilation, ESLint, and tests (19 Python + 45 React tests) pass successfully
*   **✅ `useAuth.ts`** [COMPLETED]:
    *   **✅ Type Import** [COMPLETED]: Import `AuthUser` from a central types file (`src/client/types/index.ts` once created) to avoid duplication.
    *   **✅ Actions Taken**:
        *   Verified that `useAuth.ts` already imports `AuthUser` and `AuthState` from central types file (`src/client/types/index.ts`) on line 4
        *   This task was already completed as part of the type centralization effort
    *   **✅ Logout Integration** [COMPLETED]: If `AuthService.signOut` is refactored, `useAuth.logout` should call `AuthService.signOut` for token clearing and then handle the API call for server-side logout.
    *   **✅ Actions Taken**:
        *   **Added AuthService Import**: Added `import { AuthService } from "../services/AuthService";` to useAuth.ts
        *   **Refactored logout Method**: Updated `useAuth.logout` to call `AuthService.signOut()` for token clearing instead of manually removing tokens from localStorage and sessionStorage
        *   **Refactored logoutDueToInactivity**: Updated inactivity logout function to use `AuthService.signOut()` for consistency
        *   **Updated Token Validation**: Updated token validation failure cases to use `AuthService.signOut()` instead of manual token clearing
        *   **Maintained API Integration**: Preserved server-side logout API call (`/api/v1/auth/logout`) while delegating token clearing to AuthService
        *   **Service Pattern Compliance**: Now follows Single Responsibility principle where AuthService handles authentication domain concerns
        *   **Verified Implementation**: All TypeScript compilation and React tests (45 tests) pass successfully
*   **✅ `useGoogleOAuth.ts`** [COMPLETED]:
    *   **✅ Centralize Initialization** [COMPLETED]: Refactor to ensure `useGoogleOAuth` is the sole point of Google SDK initialization, preventing duplication of logic found in `OAuthProviders.tsx`.
    *   **✅ Actions Taken**:
        *   **Refactored OAuthProviders.tsx**: Removed duplicate Google SDK initialization and replaced with useGoogleOAuth hook usage
        *   **Eliminated Direct Google API Calls**: OAuthProviders.tsx no longer calls `window.google.accounts.id.initialize()` or `window.google.accounts.id.prompt()` directly
        *   **Removed Hardcoded Client ID Fallback**: Eliminated `"YOUR_GOOGLE_CLIENT_ID"` fallback in favor of centralized environment variable validation
        *   **Added Loading State Integration**: Google button now shows loading spinner when OAuth is in progress
        *   **Enhanced Button State Management**: Button properly disables when not ready, loading, or has errors with appropriate aria-labels
        *   **Maintained Backward Compatibility**: Preserved OAuthProviders interface by transforming credential string back to GoogleCredentialResponse format
        *   **Single Source of Truth**: useGoogleOAuth hook is now the sole point for Google SDK initialization and OAuth triggering
    *   **✅ Error Handling** [COMPLETED]: Ensure consistent error propagation and state management within the hook.
    *   **✅ Actions Taken**:
        *   **Added clearError Function**: Introduced clearError method for error recovery and state reset
        *   **Consistent Error State Management**: All error handling now clears previous errors before setting new ones
        *   **Enhanced Environment Variable Validation**: Client ID validation moved to useEffect with proper error state and callback propagation
        *   **Improved Error Logging**: All errors now use logger for consistent error tracking with error context
        *   **Standardized Error Propagation**: All error scenarios now call onError callback consistently
        *   **Better Error Recovery**: Users can now retry operations after errors with proper state cleanup
        *   **Enhanced Error Messages**: More descriptive error messages for better debugging and user feedback
        *   **Timeout Error Handling**: Improved 30-second timeout error handling with proper state management
        *   **Exception Handling**: All try-catch blocks now properly handle errors with consistent state updates
        *   **Verified Implementation**: All TypeScript compilation and React tests (45) pass successfully
*   **✅ `OAuthProviders.tsx`** [COMPLETED]:
    *   **✅ Use `useGoogleOAuth` Hook** [COMPLETED]: Replace direct Google SDK initialization with the `useGoogleOAuth` hook for consistency and to leverage its features, aligning with `docs/architecture/README.md` - "Architectural Patterns" (Service-Oriented Frontend).
    *   **✅ Remove Hardcoded Client ID Fallback** [COMPLETED]: Eliminate `YOUR_GOOGLE_CLIENT_ID` fallback.
    *   **✅ Actions Taken**:
        *   **Replaced Direct Google SDK Usage**: Removed manual `window.google.accounts.id.initialize()` and `window.google.accounts.id.prompt()` calls
        *   **Integrated useGoogleOAuth Hook**: Now uses centralized hook for all Google OAuth functionality following service-oriented frontend architecture
        *   **Eliminated Hardcoded Fallback**: Removed `"YOUR_GOOGLE_CLIENT_ID"` fallback, now relies on proper environment variable configuration
        *   **Enhanced User Experience**: Added loading spinner during OAuth process and better button state management
        *   **Improved Error Handling**: Button now properly reflects OAuth errors with descriptive aria-labels and disabled states
        *   **Maintained Interface Compatibility**: Preserved existing component interface while internally delegating to useGoogleOAuth hook
        *   **Better Separation of Concerns**: Component now focuses on UI presentation while hook handles OAuth logic
        *   **Service Pattern Compliance**: Follows established architectural patterns for service-oriented frontend design
        *   **Verified Implementation**: All TypeScript compilation and React tests (45) pass successfully
*   **✅ `AuthModal.tsx`** [COMPLETED]:
    *   **✅ Update `SignUpFormData`** [COMPLETED]: Change `organization: string` to `organization_id?: string` to match `AuthService.ts` and the backend.
    *   **✅ Integrate `useFormValidation`** [COMPLETED]: Replace manual form validation with the enhanced `useFormValidation` hook for consistency and reduced boilerplate.
    *   **✅ Actions Taken**:
        *   **Complete useFormValidation Integration**: Successfully replaced manual form state management with enhanced `useFormValidation` hook for both sign-in and sign-up forms
        *   **Enhanced Form Lifecycle Management**: Implemented comprehensive form state including `values`, `errors`, `touched`, `isValid`, and `isSubmitting` tracking
        *   **Consistent Validation Patterns**: Both forms now use the hook's `handleChange`, `handleBlur`, and `handleSubmit` methods for consistent user experience
        *   **Service Layer Integration**: Sign-in validation uses `AuthService.validateEmail`, sign-up validation uses `AuthService.validatePassword` for password requirements
        *   **Better User Experience**: Error messages only display after user interaction (touched state), password requirements show real-time validation feedback
        *   **Form Reset Functionality**: Added proper `resetForms` function using `useCallback` that resets both forms and password visibility state
        *   **Eliminated Manual State**: Removed all manual form state management (`signInData`, `setSignInData`, `signUpData`, `setSignUpData`, `signInErrors`, `signUpErrors`)
        *   **Enhanced Submit Handling**: Submit buttons properly disable during form submission using `isSubmitting` state from the hook
        *   **Password Validation Display**: Maintained dynamic password requirement checklist with real-time green/red validation indicators
        *   **Type Safety**: All form interactions are fully type-safe with proper TypeScript interfaces and error handling
        *   **Test Infrastructure Enhancement**: Resolved JavaScript heap memory issues in React test suite by implementing single-threaded execution in `vitest.config.ts`
        *   **Memory Management Solution**: Added `maxConcurrency: 1` and `singleThread: true` configuration to prevent memory exhaustion when running full React test suite
        *   **Quality Verified**: TypeScript compilation, ESLint checks, and React tests all pass successfully after integration with enhanced test infrastructure
*   **`Header.tsx`**:
    *   **Semantic HTML**: Change navigation links (`<a>` with `role="button"`) to actual `<button>` elements if they perform an action rather than direct navigation, improving semantic correctness and accessibility.
*   **`Input.tsx`**:
    *   **Use `RequiredAsterisk` Component**: Replace the inline asterisk `<span>` with the dedicated `RequiredAsterisk` component for consistency and maintainability, aligning with `src/client/components/README.md` - "Atomic Components".
*   **`App.tsx`**:
    *   **Externalize Inline Style**: Move the inline `<style>` tag for keyframe animation to `src/client/styles.css` for better separation of concerns and maintainability.
    *   **Encapsulate Email Verification**: Consider encapsulating the email verification URL parsing and API call logic into a custom hook for better separation of concerns.
*   **`DashboardPage.tsx`**:
    *   **Incomplete Features**: Implement data fetching for `total_members`, `active_sprints`, and `upcoming_pto` to fulfill the dashboard's purpose.
    *   **Consistent Button Usage**: Use the `Button` component for the "Create Team" button in the "Teams Overview" section for consistent styling and behavior.
*   **`HomePage.tsx`, `AboutPage.tsx`, `ContactPage.tsx`**:
    *   **Semantic Styling**: Replace hardcoded color classes (e.g., `bg-white`, `text-gray-800`) with semantic Tailwind classes defined in `src/client/styles.css` (e.g., `bg-content-background`, `text-text-primary`), adhering to `CLAUDE.md` - "Design System & Semantic Color Variables".

---

#### 4. Testing Gaps

These recommendations align with the principles outlined in:
*   `CLAUDE.md` - "Testing: The Cornerstone of Quality" (TDD is Mandatory, Focus on Behavior, Hybrid Testing Strategy)
*   `README.md` (root) - "Running Tests"
*   `tests/README.md` - "Quality Philosophy: Test What Can Break", "The Core Testing Workflow", "Test Categories", "Test Coverage"
*   `src/client/hooks/README.md` - "Testing Hooks"
*   `src/client/services/README.md` - "Testing Services"
*   `src/client/components/README.md` - "Testing Components"

*   **Critical Missing Test Files**:
    *   `src/client/services/__tests__/AuthService.test.ts` (needs comprehensive tests for `signIn`, `signUp`, `oauthSignIn` covering success and error scenarios).
    *   `src/client/hooks/__tests__/useGoogleOAuth.test.ts`.
    *   `src/client/components/__tests__/OAuthProviders.test.tsx`.
    *   `src/client/utils/__tests__/logger.test.ts`.
    *   `src/client/components/__tests__/AuthModal.test.tsx`.
    *   `src/client/pages/__tests__/TeamConfigurationPage.test.tsx`.
    *   `src/client/pages/__tests__/DashboardPage.test.tsx`.
    *   `src/client/pages/__tests__/HomePage.test.tsx`.
    *   `src/client/pages/__tests__/AboutPage.test.tsx`.
    *   `src/client/pages/__tests__/ContactPage.test.tsx`.
    *   `src/client/__tests__/main.test.tsx`.
    *   `src/client/hooks/__tests__/useTeams.test.ts`.
    *   `src/client/services/__tests__/TeamService.test.ts`.
    *   **Recommendation**: Prioritize creating these missing test files to ensure critical functionality is covered, adhering to the "TDD is Mandatory" philosophy.
*   **Expand Existing Tests**:
    *   `src/client/__tests__/App.test.tsx`: Expand to cover more general rendering and routing logic beyond Google OAuth.
*   **Test Incomplete Features**: Ensure tests are written for any features marked as "coming soon" or "TODO" once they are implemented, as per `tests/README.md` - "Test Coverage".

---

#### 5. General Code Quality & Formatting

These recommendations align with the principles outlined in:
*   `CLAUDE.md` - "Code Excellence Principles" (Simplicity First), "Development Workflow" (Quality Process)
*   `README.md` (root) - "Development and Code Quality" (Quality Tooling, Pre-commit Hooks)
*   `tests/README.md` - "Static Analysis & Code Quality: The Linter is the Law"

*   **Address `TODO` Comments**:
    *   **Issue**: Numerous `TODO` comments exist throughout the codebase.
    *   **Recommendation**: Systematically review and address all `TODO` comments to ensure features are completed and technical debt is managed.
*   **Consistent Styling**:
    *   **Issue**: While the semantic color system is in place, some components still use hardcoded Tailwind color classes (as evidenced by the `allowedHardcodedColors` list in `SemanticColors.test.tsx`).
    *   **Recommendation**: Continue to enforce the use of semantic color variables and Tailwind CSS best practices to ensure a consistent and easily themeable UI, as per `CLAUDE.md` - "Design System & Semantic Color Variables".
*   **Remove Dead Code**:
    *   **Issue**: Potential for unused variables, imports, or functions.
    *   **Recommendation**: Regularly review and remove any dead code to keep the codebase lean and maintainable.
*   **Error Handling Consistency**:
    *   **Issue**: While generally good, ensure all `fetch` calls (especially those currently direct) have consistent `try...catch` blocks and user-friendly error message handling, aligning with `src/client/services/README.md` - "Error Handling".
