# OAuth Consent Flow Fix

## Problem
When users clicked "Link Accounts" in the OAuth consent modal, the system was triggering a new OAuth authentication flow instead of processing the consent decision with the existing OAuth credential. This caused the OAuth popup to appear again unnecessarily.

## Root Cause
In `AuthModal.tsx`, the `handleConsentDecision` function was:
1. Discarding the stored OAuth credential when updating the consent decision
2. Triggering a fresh OAuth flow instead of processing the consent with the existing credential

## Solution
Modified `handleConsentDecision` to:
1. Preserve the existing OAuth credential when adding the consent decision
2. Directly call `OAuthProviderService.processOAuthConsent` with the stored credential
3. Handle the authentication response inline without triggering a new OAuth flow

## Code Changes
- **File**: `src/client/components/AuthModal.tsx`
- **Function**: `handleConsentDecision`
- **Change**: Instead of triggering a new OAuth flow, the function now:
  - Validates that both `consentResponse` and `pendingOAuthCredential` exist
  - Merges the consent decision with the existing credential
  - Calls `processOAuthConsent` with the complete data
  - Handles the authentication response directly

## Testing
- All AuthModal tests pass
- OAuth consent flow service tests pass
- The fix eliminates the duplicate OAuth popup issue

## User Experience Impact
Users now experience a smooth flow:
1. Click OAuth provider button
2. Complete OAuth authentication once
3. See consent modal if account linking is needed
4. Click "Link Accounts"
5. Accounts are linked without requiring another OAuth authentication