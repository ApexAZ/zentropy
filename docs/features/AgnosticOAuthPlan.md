# Agnostic OAuth Implementation Plan

## Executive Summary

This document provides a detailed implementation plan for migrating from Google-only OAuth to a multi-provider OAuth system supporting Google, Microsoft, and GitHub. The plan is broken into small, 10-15 minute chunks to enable incremental progress and easy rollbacks.

## Current State Analysis

### ✅ **What Exists and is Working**
- **Google OAuth**: Complete implementation through `useGoogleOAuth` hook
- **Account Linking**: Working Google-specific API endpoints (`/api/v1/users/me/link-google`, `/api/v1/users/me/unlink-google`)
- **Frontend Services**: `UserService.linkGoogleAccount()`, `UserService.unlinkGoogleAccount()`
- **UI Components**: Complete `AccountSecuritySection` with Google linking/unlinking
- **Abstraction Layer**: `OAuthProviderService` exists but **is not being used**

### ✅ **What Exists but is Unused** 
- **OAuthProviderService**: Complete abstraction layer with 31 tests
- **Enhanced Types**: `OAuthProvider`, `LinkOAuthProviderRequest`, `UnlinkOAuthProviderRequest`, etc.
- **GoogleOAuthIntegration**: Wrapper class for the abstraction layer
- **Generic OAuth Operations**: `linkProvider()`, `unlinkProvider()` methods

### ❌ **What Needs Implementation**
- **Microsoft OAuth**: Backend + frontend implementation
- **GitHub OAuth**: Backend + frontend implementation  
- **Multi-Provider UI**: Components that handle multiple providers
- **Migration**: Adopt existing abstraction layer in real components

### ❌ **Current Usage Pattern (Direct Google)**
```typescript
// What's actually being used:
AccountSecuritySection → useAccountSecurity → useGoogleOAuth → UserService.linkGoogleAccount()

// What exists but is unused:
OAuthProviderService.linkProvider({ provider: 'google', credential: token })
```

## Implementation Strategy

The plan follows a **low-risk, incremental approach** with these principles:
1. **Small chunks**: Each task takes 10-15 minutes
2. **Immediate testing**: Run tests after each chunk
3. **Easy rollbacks**: Each step can be undone quickly
4. **Zero downtime**: No breaking changes to existing functionality
5. **Progressive enhancement**: Add new providers without disrupting current ones

---

## Phase 1: Foundation Migration (Adopt Existing Abstraction)

### **Objective**: Migrate current Google OAuth to use existing `OAuthProviderService` abstraction

### **Benefits**: 
- Validates that abstraction layer works correctly
- Creates foundation for adding new providers
- Zero risk (abstraction wraps existing implementation)

---

### **1.1 Update useAccountSecurity Hook** ⏱️ **10 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useAccountSecurity.ts`

**Current Pattern**:
```typescript
// Lines 121, 212: Direct UserService calls
await UserService.linkGoogleAccount(linkRequest)
await UserService.unlinkGoogleAccount(unlinkRequest)
```

**Target Pattern**:
```typescript
// Use OAuthProviderService abstraction
await OAuthProviderService.linkProvider({ 
  credential: linkRequest.google_credential,
  provider: 'google' 
})
await OAuthProviderService.unlinkProvider({
  password: unlinkRequest.password,
  provider: 'google'
})
```

**Status**: ❌ **Pending**

**Detailed Changes**:
1. **Add import** at top of file (line 4):
   ```typescript
   import { OAuthProviderService } from "../services/OAuthProviderService";
   ```

2. **Update handleGoogleOAuthSuccess** (lines 121):
   ```typescript
   // Replace:
   await Promise.race([UserService.linkGoogleAccount(linkRequest), timeoutPromise]);
   
   // With:
   await Promise.race([
     OAuthProviderService.linkProvider({ 
       credential: linkRequest.google_credential,
       provider: 'google' 
     }), 
     timeoutPromise
   ]);
   ```

3. **Update handleUnlinkGoogle** (line 212):
   ```typescript
   // Replace:
   await Promise.race([UserService.unlinkGoogleAccount(unlinkRequest), timeoutPromise]);
   
   // With:
   await Promise.race([
     OAuthProviderService.unlinkProvider({
       password: unlinkRequest.password,
       provider: 'google'
     }), 
     timeoutPromise
   ]);
   ```

**Testing**: Run `npm test src/client/hooks/__tests__/useAccountSecurity.test.tsx` to verify no regressions

---

### **1.2 Update Type Definitions** ⏱️ **5 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useAccountSecurity.ts`

**Current**: Using Google-specific request types
**Target**: Use generic OAuth request types from abstraction

**Status**: ❌ **Pending**

**Changes**:
1. **Update imports** (line 6):
   ```typescript
   // Replace:
   import type { AccountSecurityResponse, LinkGoogleAccountRequest, UnlinkGoogleAccountRequest } from "../types";
   
   // With:
   import type { AccountSecurityResponse, LinkOAuthProviderRequest, UnlinkOAuthProviderRequest } from "../types";
   ```

2. **Update local variable types** (lines 109, 200):
   ```typescript
   // Replace LinkGoogleAccountRequest with LinkOAuthProviderRequest
   // Replace UnlinkGoogleAccountRequest with UnlinkOAuthProviderRequest
   ```

**Testing**: TypeScript compilation should pass with no errors

---

### **1.3 Remove Google-Specific UserService Dependencies** ⏱️ **5 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useAccountSecurity.ts`

**Current**: Imports `UserService` for Google operations
**Target**: Only import `UserService` for `getAccountSecurity()`

**Status**: ❌ **Pending**

**Changes**:
1. **Keep UserService import** (line 2) - still needed for `getAccountSecurity()`
2. **Verify no other UserService Google methods** are being called

**Testing**: All tests should continue passing

---

### **1.4 Validation Testing** ⏱️ **10 minutes**

**Objective**: Ensure abstraction layer works exactly like direct implementation

**Status**: ❌ **Pending**

**Testing Tasks**:
1. **Run all account security tests**: `npm test AccountSecurity`
2. **Manually test Google linking** in browser (if available)
3. **Verify no console errors**
4. **Check network requests** use same endpoints (`/api/v1/users/me/link-google`)

**Expected Results**:
- All tests pass (no regressions)
- Google OAuth linking works identically
- Network requests unchanged (abstraction uses same endpoints)

---

## Phase 2: Microsoft OAuth Implementation

### **Objective**: Add Microsoft as second OAuth provider

---

### **2.1 Register Microsoft Provider** ⏱️ **5 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/services/OAuthProviderService.ts`

**Current**: Only Google in `PROVIDER_REGISTRY` (lines 20-30)
**Target**: Add Microsoft provider configuration

**Status**: ❌ **Pending**

**Changes**:
1. **Add Microsoft to PROVIDER_REGISTRY** (line 27):
   ```typescript
   microsoft: {
     name: "microsoft",
     displayName: "Microsoft",
     iconClass: "fab fa-microsoft",
     brandColor: "#0078d4"
   }
   ```

2. **Update OAuthProviders constant** (line 285):
   ```typescript
   export const OAuthProviders = {
     GOOGLE: "google",
     MICROSOFT: "microsoft"
   } as const;
   ```

**Testing**: `npm test OAuthProviderService` should pass

---

### **2.2 Create Microsoft OAuth Hook** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useMicrosoftOAuth.ts` (NEW FILE)

**Pattern**: Follow exact structure of `useGoogleOAuth.ts`

**Status**: ❌ **Pending**

**Implementation**:
```typescript
import { useState, useCallback, useEffect } from "react";

interface UseMicrosoftOAuthProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
}

interface UseMicrosoftOAuthReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  triggerOAuth: () => void;
  clearError: () => void;
}

export function useMicrosoftOAuth({ onSuccess, onError }: UseMicrosoftOAuthProps): UseMicrosoftOAuthReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Microsoft OAuth SDK
  useEffect(() => {
    // TODO: Load Microsoft OAuth SDK
    // For now, mark as ready for testing
    setIsReady(true);
  }, []);

  const triggerOAuth = useCallback(() => {
    setIsLoading(true);
    setError(null);

    // TODO: Implement Microsoft OAuth flow
    // For now, simulate success for testing
    setTimeout(() => {
      setIsLoading(false);
      onSuccess("mock-microsoft-credential");
    }, 1000);
  }, [onSuccess]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isReady,
    isLoading,
    error,
    triggerOAuth,
    clearError
  };
}
```

**Testing**: Create test file and verify hook structure matches `useGoogleOAuth`

---

### **2.3 Add Microsoft Backend Endpoints** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/api/routers/users.py`

**Current**: Google-specific endpoints at lines with `link-google`, `unlink-google`
**Target**: Add Microsoft-specific endpoints

**Status**: ❌ **Pending**

**Changes**:
1. **Add LinkMicrosoftRequest schema**:
   ```python
   class LinkMicrosoftRequest(BaseModel):
       microsoft_credential: str
   ```

2. **Add link-microsoft endpoint**:
   ```python
   @router.post("/me/link-microsoft", response_model=MessageResponse)
   def link_microsoft_account(
       request: LinkMicrosoftRequest,
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db)
   ):
       # TODO: Implement Microsoft OAuth verification
       # For now, return success for testing
       return {"message": "Microsoft account linked successfully", "microsoft_email": "test@microsoft.com"}
   ```

3. **Add unlink-microsoft endpoint**:
   ```python
   @router.post("/me/unlink-microsoft", response_model=MessageResponse)
   def unlink_microsoft_account(
       request: UnlinkGoogleAccountRequest,  # Reuse same password request
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db)
   ):
       # TODO: Implement Microsoft unlinking
       return {"message": "Microsoft account unlinked successfully"}
   ```

**Testing**: API endpoints should be accessible (return mock responses)

---

### **2.4 Update OAuthProviderService Routing** ⏱️ **10 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/services/OAuthProviderService.ts`

**Current**: All requests route to Google endpoints (lines 128, 164)
**Target**: Route based on provider name

**Status**: ❌ **Pending**

**Changes**:
1. **Update linkProvider method** (line 119):
   ```typescript
   static async linkProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
     const validation = this.validateLinkRequest(request);
     if (!validation.isValid) {
       throw new Error(`Invalid link request: ${validation.errors.join(", ")}`);
     }

     // Route based on provider
     switch (request.provider) {
       case 'google':
         return this.linkGoogleProvider(request);
       case 'microsoft':
         return this.linkMicrosoftProvider(request);
       default:
         throw new Error(`Unsupported provider: ${request.provider}`);
     }
   }
   ```

2. **Add linkMicrosoftProvider method**:
   ```typescript
   private static async linkMicrosoftProvider(request: LinkOAuthProviderRequest): Promise<OAuthOperationResponse> {
     const response = await fetch("/api/v1/users/me/link-microsoft", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         ...createAuthHeaders()
       },
       body: JSON.stringify({
         microsoft_credential: request.credential
       })
     });

     const result = await this.handleResponse<{ message: string; microsoft_email: string }>(response);

     return {
       message: result.message,
       success: true,
       provider: request.provider,
       provider_identifier: result.microsoft_email
     };
   }
   ```

3. **Update unlinkProvider similarly** for Microsoft routing

**Testing**: `npm test OAuthProviderService` should pass with Microsoft provider

---

### **2.5 Test Microsoft Integration** ⏱️ **10 minutes**

**Objective**: Verify Microsoft provider works through abstraction layer

**Status**: ❌ **Pending**

**Testing Tasks**:
1. **Unit tests**: Test Microsoft provider registration and validation
2. **Service tests**: Test `OAuthProviderService.linkProvider({ provider: 'microsoft' })`
3. **Integration test**: Verify routing to Microsoft endpoints
4. **Mock validation**: Ensure mock responses work correctly

**Expected Results**:
- Microsoft appears in `getAvailableProviders()`
- Validation accepts Microsoft requests
- Service routes to `/api/v1/users/me/link-microsoft`

---

## Phase 3: GitHub OAuth Implementation

### **Objective**: Add GitHub as third OAuth provider (same pattern as Microsoft)

---

### **3.1 Register GitHub Provider** ⏱️ **5 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/services/OAuthProviderService.ts`

**Status**: ❌ **Pending**

**Changes**: Add GitHub to `PROVIDER_REGISTRY` following Microsoft pattern

---

### **3.2 Create GitHub OAuth Hook** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useGitHubOAuth.ts` (NEW FILE)

**Status**: ❌ **Pending**

**Implementation**: Copy Microsoft hook structure, update for GitHub

---

### **3.3 Add GitHub Backend Endpoints** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/api/routers/users.py`

**Status**: ❌ **Pending**

**Changes**: Add `/me/link-github` and `/me/unlink-github` endpoints

---

### **3.4 Update OAuthProviderService Routing** ⏱️ **10 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/services/OAuthProviderService.ts`

**Status**: ❌ **Pending**

**Changes**: Add GitHub case to switch statements and routing methods

---

### **3.5 Test GitHub Integration** ⏱️ **10 minutes**

**Status**: ❌ **Pending**

**Testing**: Same pattern as Microsoft testing

---

## Phase 4: Multi-Provider UI Enhancement

### **Objective**: Update UI components to handle multiple OAuth providers

---

### **4.1 Create ProviderStatusCard Component** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/components/ProviderStatusCard.tsx` (NEW FILE)

**Objective**: Reusable component for individual provider status/actions

**Status**: ❌ **Pending**

**Interface**:
```typescript
interface ProviderStatusCardProps {
  provider: OAuthProvider;
  isLinked: boolean;
  providerEmail?: string;
  onLink: () => void;
  onUnlink: () => void;
  linkingLoading?: boolean;
  unlinkingLoading?: boolean;
}
```

**Features**:
- Provider icon and name display
- Link/unlink buttons with loading states
- Status indicators (linked/unlinked)
- Provider-specific styling

---

### **4.2 Create Multi-Provider Hook** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/hooks/useMultiProviderOAuth.ts` (NEW FILE)

**Objective**: Manage OAuth state for multiple providers

**Status**: ❌ **Pending**

**Interface**:
```typescript
interface UseMultiProviderOAuthReturn {
  providers: OAuthProvider[];
  linkProvider: (providerName: string) => void;
  unlinkProvider: (providerName: string, password: string) => Promise<void>;
  getProviderState: (providerName: string) => OAuthProviderState;
  isProviderLinked: (providerName: string) => boolean;
}
```

**Integration**: Use `useMicrosoftOAuth`, `useGitHubOAuth`, existing `useGoogleOAuth`

---

### **4.3 Update AccountSecuritySection for Multi-Provider** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/src/client/components/AccountSecuritySection.tsx`

**Current**: Google-specific UI and logic
**Target**: Multi-provider UI with provider list

**Status**: ❌ **Pending**

**Changes**:
1. **Replace Google-specific UI** with provider list
2. **Use ProviderStatusCard** for each provider
3. **Integrate useMultiProviderOAuth** hook
4. **Preserve existing password confirmation modal**

**Design**:
```typescript
// Replace single Google section with:
providers.map(provider => (
  <ProviderStatusCard 
    key={provider.name}
    provider={provider}
    isLinked={securityStatus.providers.includes(provider.name)}
    onLink={() => linkProvider(provider.name)}
    onUnlink={(password) => unlinkProvider(provider.name, password)}
  />
))
```

---

### **4.4 Update Backend Security Response** ⏱️ **15 minutes**

**File**: `/home/brianhusk/repos/zentropy/api/routers/users.py`

**Current**: Google-specific response format
**Target**: Multi-provider response format

**Status**: ❌ **Pending**

**Changes**:
1. **Add provider fields** to User model for Microsoft and GitHub
2. **Update security endpoint** to return all provider statuses
3. **Create enhanced response** format:
   ```python
   {
     "email_auth_linked": True,
     "oauth_providers": [
       {"provider": "google", "linked": True, "identifier": "user@gmail.com"},
       {"provider": "microsoft", "linked": False},
       {"provider": "github", "linked": False}
     ]
   }
   ```

---

### **4.5 Test Multi-Provider UI** ⏱️ **15 minutes**

**Objective**: Verify all providers work in unified UI

**Status**: ❌ **Pending**

**Testing Tasks**:
1. **Provider display**: All three providers show in UI
2. **Individual linking**: Each provider can be linked independently  
3. **Mixed states**: Some providers linked, others not
4. **Loading states**: Proper loading indicators per provider
5. **Error handling**: Provider-specific error messages

---

## Phase 5: Enhanced Backend Implementation

### **Objective**: Replace mock endpoints with real OAuth integration

---

### **5.1 Microsoft OAuth Backend Integration** ⏱️ **15 minutes**

**Files**: 
- `/home/brianhusk/repos/zentropy/api/microsoft_oauth.py` (NEW FILE)
- `/home/brianhusk/repos/zentropy/api/routers/users.py` (UPDATE)

**Status**: ❌ **Pending**

**Implementation**: Real Microsoft OAuth verification and token handling

---

### **5.2 GitHub OAuth Backend Integration** ⏱️ **15 minutes**

**Files**:
- `/home/brianhusk/repos/zentropy/api/github_oauth.py` (NEW FILE)
- `/home/brianhusk/repos/zentropy/api/routers/users.py` (UPDATE)

**Status**: ❌ **Pending**

**Implementation**: Real GitHub OAuth verification and token handling

---

### **5.3 Database Schema Updates** ⏱️ **10 minutes**

**File**: `/home/brianhusk/repos/zentropy/api/models.py`

**Current**: Only `google_id` field on User model
**Target**: Add `microsoft_id` and `github_id` fields

**Status**: ❌ **Pending**

**Changes**:
```python
class User(Base):
    # ... existing fields ...
    google_id: Optional[str] = Column(String, unique=True, index=True)
    microsoft_id: Optional[str] = Column(String, unique=True, index=True)  # NEW
    github_id: Optional[str] = Column(String, unique=True, index=True)     # NEW
```

---

### **5.4 Frontend Hook Real Implementation** ⏱️ **15 minutes each**

**Files**: 
- `/home/brianhusk/repos/zentropy/src/client/hooks/useMicrosoftOAuth.ts`
- `/home/brianhusk/repos/zentropy/src/client/hooks/useGitHubOAuth.ts`

**Status**: ❌ **Pending**

**Implementation**: Replace mock implementations with real OAuth SDK integration

---

## Phase 6: Comprehensive Testing

### **Objective**: Full end-to-end testing of multi-provider OAuth

---

### **6.1 Unit Test Coverage** ⏱️ **15 minutes**

**Files**: 
- Test all new hooks (`useMicrosoftOAuth`, `useGitHubOAuth`, `useMultiProviderOAuth`)
- Test enhanced `OAuthProviderService` with all providers
- Test new UI components (`ProviderStatusCard`)

**Status**: ❌ **Pending**

---

### **6.2 Integration Testing** ⏱️ **15 minutes**

**Objective**: Test complete workflows for each provider

**Status**: ❌ **Pending**

**Scenarios**:
- Link/unlink Google (existing functionality preserved)
- Link/unlink Microsoft (new functionality)
- Link/unlink GitHub (new functionality)
- Multiple providers linked simultaneously
- Error scenarios for each provider

---

### **6.3 UI/UX Testing** ⏱️ **10 minutes**

**Objective**: Verify user experience across all providers

**Status**: ❌ **Pending**

**Testing**:
- All providers display correctly
- Loading states work per provider
- Error messages are provider-specific
- Password confirmation works for all providers

---

## Documentation Updates

### **Update Migration Guide** ⏱️ **10 minutes**

**File**: `/home/brianhusk/repos/zentropy/docs/features/OAuthProviderMigrationGuide.md`

**Status**: ❌ **Pending**

**Updates**: Reflect that abstraction layer is now in use and multi-provider is implemented

---

## Risk Mitigation

### **Rollback Strategy**
Each phase can be independently rolled back:
- **Phase 1**: Revert hook changes to use `UserService` directly
- **Phase 2-3**: Remove new provider registrations and endpoints
- **Phase 4**: Revert UI to Google-only
- **Phase 5-6**: Use mock implementations if real OAuth fails

### **Testing Strategy**
- Run tests after each 10-15 minute chunk
- Manual testing of critical workflows
- Staging environment validation before production

### **Zero-Downtime Approach**
- All changes are additive (no breaking changes)
- Existing Google OAuth continues working throughout
- New providers are opt-in until fully validated

## Success Metrics

### **Phase 1 Success**
- ✅ All existing tests pass
- ✅ Google OAuth works identically through abstraction
- ✅ Zero regressions in functionality

### **Phases 2-3 Success**  
- ✅ Microsoft and GitHub providers registered
- ✅ Mock endpoints respond correctly
- ✅ Service routing works for all providers

### **Phase 4 Success**
- ✅ UI displays all three providers
- ✅ Individual provider linking works
- ✅ Mixed provider states handled correctly

### **Phases 5-6 Success**
- ✅ Real OAuth integration works
- ✅ Database stores multiple provider IDs
- ✅ Comprehensive test coverage

## Timeline Estimate

| Phase | Tasks | Est. Time | Total |
|-------|-------|-----------|-------|
| **Phase 1** | 4 tasks | 30 minutes | 30 min |
| **Phase 2** | 5 tasks | 60 minutes | 1.5 hours |
| **Phase 3** | 5 tasks | 60 minutes | 2.5 hours |
| **Phase 4** | 5 tasks | 75 minutes | 4 hours |
| **Phase 5** | 4 tasks | 55 minutes | 5 hours |
| **Phase 6** | 3 tasks | 40 minutes | 5.5 hours |

**Total Implementation Time**: ~5.5 hours across multiple work sessions

## Next Steps

1. **Begin Phase 1**: Migrate to abstraction layer (lowest risk)
2. **Validate Foundation**: Ensure abstraction works before adding providers
3. **Incremental Provider Addition**: Add Microsoft, then GitHub
4. **UI Enhancement**: Multi-provider interface
5. **Real OAuth Integration**: Replace mocks with actual OAuth
6. **Comprehensive Testing**: Full validation

This plan provides a clear, low-risk path to multi-provider OAuth with easy rollbacks and incremental validation at each step.