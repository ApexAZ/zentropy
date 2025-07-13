# Mobile Expansion Architecture Plan

## Overview
Zentropy will require a separate mobile application (like Jira/Linear) due to the complexity of Product Management workflows. This document outlines the architectural changes needed to prepare for mobile expansion.

## Current Architecture Assessment

### ✅ What's Already Mobile-Ready

#### API-First Design
- **Service Layer**: `AuthService`, `ProjectService`, etc. are abstracted and reusable
- **Business Logic**: Core verification logic in `utils/pendingVerification.ts` is platform-agnostic
- **State Management**: Authentication and verification state can be shared

#### Clean Separation
- Services handle API communication
- Components handle UI rendering
- Utils handle business logic

### ⚠️ Areas Needing Refactoring for Mobile

#### 1. Extract Business Logic Hooks
```typescript
// Current: Mixed in components
const shouldShowVerificationNotice = 
  (auth.isAuthenticated && !auth.user?.email_verified) ||
  (!auth.isAuthenticated && pendingVerification);

// Better: Extracted hook
const { shouldShow, email } = useEmailVerificationState(auth);
```

#### 2. Create Composable Verification Components
```typescript
// Core logic component (reusable)
export function VerificationManager({ children }: { children: ReactNode }) {
  const verificationState = useEmailVerificationState();
  return (
    <VerificationContext.Provider value={verificationState}>
      {children}
    </VerificationContext.Provider>
  );
}

// Platform-specific UI components
export function DesktopVerificationNotice() { ... }
export function MobileVerificationModal() { ... }
```

#### 3. Shared Type Definitions
```typescript
// src/shared/types/verification.ts
export interface VerificationState {
  email: string;
  isRequired: boolean;
  isPending: boolean;
}

export interface VerificationActions {
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  clearPending: () => void;
}
```

## Recommended Refactoring Steps

### Phase 1: Extract Hooks (1-2 days)
1. Create `useEmailVerificationState` hook
2. Create `useAuth` improvements for mobile compatibility
3. Extract form validation hooks from components

### Phase 2: Modular Components (2-3 days)
1. Create `VerificationContext` provider
2. Break down Header verification into smaller components
3. Create composable verification component library

### Phase 3: Shared Library (1-2 days)
1. Move services to `@zentropy/shared` package
2. Move types to shared library
3. Move business logic utils to shared library

## Mobile Integration Example

With these changes, mobile app integration becomes:
```typescript
// Mobile app (React Native)
import { AuthService } from '@zentropy/shared/services';
import { useEmailVerificationState } from '@zentropy/shared/hooks';

function MobileVerificationScreen() {
  const { shouldShow, email } = useEmailVerificationState(auth);
  
  if (!shouldShow) return null;
  
  return (
    <MobileVerificationUI 
      email={email}
      onVerify={AuthService.verifyCode}
      onResend={AuthService.sendEmailVerification}
    />
  );
}
```

## Current Status: 7/10 Mobile Readiness
- **Services**: Already well-structured ✅
- **Utils**: Good separation ✅  
- **Components**: Could be more modular ⚠️
- **State**: Mixed with UI logic ⚠️

## Priority: Low
This refactoring should be done when:
1. Registration/login systems are fully stable
2. Core product features are implemented
3. Mobile app development begins

Focus remains on building product functionality first.