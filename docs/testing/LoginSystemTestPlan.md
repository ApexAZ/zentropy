# **Login System Test Plan**

## **Overview**

This document provides a comprehensive test plan for Zentropy's secure authentication and account linking system. The test plan covers three authentication types: LOCAL (email/password), GOOGLE (OAuth), and HYBRID (both methods), along with the secure account linking functionality.

## **Test Environment Setup**

### **Prerequisites**
- Development environment running (`npm run dev`)
- Mailpit email server (`http://localhost:8025`)
- Google OAuth configured (`GOOGLE_CLIENT_ID` environment variable)
- Test email accounts available (recommend using `+` notation for unique addresses)

### **Test Data Requirements**
- Test emails: Use format `testuser+[scenario]@yourdomain.com`
- Test passwords: Use `TestPassword123!` for consistency
- Google test accounts: Separate Google accounts for OAuth testing

---

## **Phase 1: Core Authentication Testing**

### **Test 1.1: Email/Password Registration (LOCAL User)**
**Objective**: Verify standard email/password user creation

**Steps**:
1. Navigate to registration page
2. Fill form:
   - Email: `testlocal+reg@yourdomain.com`
   - Password: `TestPassword123!`
   - First Name: `Test`
   - Last Name: `User`
3. Submit registration
4. Check Mailpit for verification email
5. Click verification link
6. Verify account activation

**Expected Results**:
- ✅ Registration succeeds
- ✅ Verification email sent to Mailpit
- ✅ Email verification activates account
- ✅ User created with `AuthProvider.LOCAL`
- ✅ Can log in with email/password

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

**Test Data**:
```json
{
  "email": "testlocal+reg@yourdomain.com",
  "password": "TestPassword123!",
  "auth_provider": "LOCAL",
  "email_verified": true
}
```

---

### **Test 1.2: Google OAuth Registration (GOOGLE User)**
**Objective**: Verify Google OAuth user creation

**Steps**:
1. Navigate to registration/login page
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify successful registration
5. Check user profile creation

**Expected Results**:
- ✅ Google OAuth flow completes
- ✅ User created with `AuthProvider.GOOGLE`
- ✅ No password hash stored
- ✅ Email marked as verified (Google pre-verified)
- ✅ Can log in with Google OAuth

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

**Test Data**:
```json
{
  "email": "testgoogle+oauth@gmail.com",
  "password_hash": null,
  "auth_provider": "GOOGLE",
  "google_id": "google_user_id_123",
  "email_verified": true
}
```

---

### **Test 1.3: Email/Password Login**
**Objective**: Verify LOCAL user authentication

**Steps**:
1. Use LOCAL user from Test 1.1
2. Navigate to login page
3. Enter credentials:
   - Email: `testlocal+reg@yourdomain.com`
   - Password: `TestPassword123!`
4. Submit login form
5. Verify successful authentication

**Expected Results**:
- ✅ Login succeeds
- ✅ JWT token generated
- ✅ User redirected to dashboard
- ✅ Session established correctly

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 1.4: Google OAuth Login**
**Objective**: Verify GOOGLE user authentication

**Steps**:
1. Use GOOGLE user from Test 1.2
2. Navigate to login page
3. Click "Sign in with Google"
4. Complete Google OAuth flow
5. Verify successful authentication

**Expected Results**:
- ✅ OAuth login succeeds
- ✅ JWT token generated
- ✅ User redirected to dashboard
- ✅ Session established correctly

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 2: Account Security Status**

### **Test 2.1: LOCAL User Security Status**
**Objective**: Verify security status API for email-only users

**API Test**:
```bash
GET /api/v1/users/me/security
Authorization: Bearer {jwt_token}
```

**Expected Response**:
```json
{
  "email_auth_linked": true,
  "google_auth_linked": false,
  "google_email": null
}
```

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 2.2: GOOGLE User Security Status**
**Objective**: Verify security status API for OAuth-only users

**API Test**:
```bash
GET /api/v1/users/me/security
Authorization: Bearer {jwt_token}
```

**Expected Response**:
```json
{
  "email_auth_linked": false,
  "google_auth_linked": true,
  "google_email": "testgoogle+oauth@gmail.com"
}
```

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 3: Account Linking (Happy Path)**

### **Test 3.1: Link Google Account to LOCAL User**
**Objective**: Convert LOCAL user to HYBRID user

**Preconditions**:
- LOCAL user from Test 1.1 logged in
- Google account with **same email address** available

**Steps**:
1. Call security status API (should show Google unlinked)
2. Initiate Google linking:
   ```bash
   POST /api/v1/users/me/link-google
   Authorization: Bearer {jwt_token}
   Content-Type: application/json
   
   {
     "google_credential": "{google_jwt_token}"
   }
   ```
3. Complete Google OAuth flow with **same email**
4. Verify linking success
5. Check updated security status

**Expected Results**:
- ✅ Response: `{"message": "Google account linked successfully"}`
- ✅ User `auth_provider` updated to `HYBRID`
- ✅ `google_id` field populated
- ✅ Security status shows both methods linked

**Verification API**:
```bash
GET /api/v1/users/me/security
```

**Expected Response**:
```json
{
  "email_auth_linked": true,
  "google_auth_linked": true,
  "google_email": "testlocal+reg@yourdomain.com"
}
```

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 3.2: Verify HYBRID Login Methods**
**Objective**: Confirm both authentication methods work for HYBRID user

**Test 3.2a: Email/Password Login**
1. Log out HYBRID user
2. Log in with email/password
3. Verify access to same account

**Test 3.2b: Google OAuth Login**
1. Log out HYBRID user
2. Log in with Google OAuth
3. Verify access to same account

**Expected Results**:
- ✅ Both login methods succeed
- ✅ Same user ID and profile data
- ✅ Same permissions and access rights

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 3.3: Unlink Google Account**
**Objective**: Convert HYBRID user back to LOCAL user

**Preconditions**:
- HYBRID user from Test 3.1 logged in

**Steps**:
1. Verify current HYBRID status
2. Initiate Google unlinking:
   ```bash
   POST /api/v1/users/me/unlink-google
   Authorization: Bearer {jwt_token}
   Content-Type: application/json
   
   {
     "password": "TestPassword123!"
   }
   ```
3. Verify unlinking success
4. Check updated security status

**Expected Results**:
- ✅ Response: `{"message": "Google account unlinked successfully"}`
- ✅ User `auth_provider` updated to `LOCAL`
- ✅ `google_id` field cleared
- ✅ Can still login with email/password
- ✅ Cannot login with Google OAuth

**Verification API**:
```bash
GET /api/v1/users/me/security
```

**Expected Response**:
```json
{
  "email_auth_linked": true,
  "google_auth_linked": false,
  "google_email": null
}
```

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 4: Security Boundary Testing**

### **Test 4.1: Email Mismatch Prevention**
**Objective**: Verify linking requires matching email addresses

**Steps**:
1. Log in as LOCAL user: `testlocal+security@yourdomain.com`
2. Attempt to link Google account with different email: `different+email@yourdomain.com`
3. Submit linking request

**Expected Results**:
- ❌ Status Code: `400 Bad Request`
- ❌ Error: `"Google email must match your account email"`
- ✅ No linking occurs
- ✅ User remains LOCAL-only

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 4.2: Duplicate Google Account Prevention**
**Objective**: Prevent one Google account linking to multiple users

**Setup**:
1. User A: `testlocal+dup1@yourdomain.com` (LOCAL)
2. User B: `testlocal+dup2@yourdomain.com` (LOCAL)
3. Google account: `testgoogle+shared@yourdomain.com`

**Steps**:
1. Link Google account to User A (should succeed)
2. Attempt to link same Google account to User B

**Expected Results**:
- ✅ User A linking succeeds
- ❌ User B linking fails with `409 Conflict`
- ❌ Error: `"This Google account is already linked to another user"`

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 4.3: Already Linked Prevention**
**Objective**: Prevent duplicate linking

**Steps**:
1. Use HYBRID user (already has Google linked)
2. Attempt to link Google account again

**Expected Results**:
- ❌ Status Code: `400 Bad Request`
- ❌ Error: `"Google account is already linked to your account"`

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 4.4: Password Required for Unlinking**
**Objective**: Verify password protection prevents lockout

**Steps**:
1. Log in as HYBRID user
2. Attempt to unlink with wrong password:
   ```bash
   POST /api/v1/users/me/unlink-google
   {
     "password": "WrongPassword123!"
   }
   ```

**Expected Results**:
- ❌ Status Code: `400 Bad Request`
- ❌ Error: `"Invalid password"`
- ✅ Google account remains linked

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 4.5: Cannot Unlink Without Password Backup**
**Objective**: Prevent lockout for Google-only users

**Steps**:
1. Create pure GOOGLE user (no password set)
2. Attempt to unlink Google account with any password

**Expected Results**:
- ❌ Status Code: `400 Bad Request`
- ❌ Error: `"Cannot unlink Google account: no password set. Set a password first."`
- ✅ User cannot lock themselves out

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 5: Account Takeover Prevention (Critical Security)**

### **Test 5.1: Google OAuth Cannot Hijack LOCAL Accounts**
**Objective**: Verify critical security fix prevents account takeover

**Setup**:
1. Create LOCAL user: `victim+security@yourdomain.com`
2. User has password: `VictimPassword123!`

**Attack Simulation**:
1. Attacker tries Google OAuth login with same email
2. Google account: `victim+security@yourdomain.com` (different owner)

**Steps**:
1. Log out completely
2. Navigate to login page
3. Click "Sign in with Google"
4. Complete Google OAuth with victim's email address

**Expected Results (Security)**:
- ❌ Status Code: `409 Conflict`
- ❌ Error: `"This email is already registered with a different authentication method"`
- ❌ Error Type: `"email_different_provider"`
- ✅ No login granted
- ✅ LOCAL account remains secure
- ✅ Attacker cannot access account

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 5.2: LOCAL Login Cannot Access Google Accounts**
**Objective**: Verify bidirectional protection

**Setup**:
1. Create GOOGLE user: `googlevictim+security@yourdomain.com`
2. User has no password (Google-only)

**Attack Simulation**:
1. Attacker tries email/password login
2. Uses any password

**Expected Results**:
- ❌ Login fails (no password exists)
- ✅ Cannot access Google account via password guessing
- ✅ Must use proper Google OAuth

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 6: Authentication & Authorization**

### **Test 6.1: Unauthenticated Access Prevention**
**Objective**: Verify all account linking requires authentication

**Tests**:
```bash
# Without Authorization header
GET /api/v1/users/me/security
POST /api/v1/users/me/link-google
POST /api/v1/users/me/unlink-google
```

**Expected Results**:
- ❌ Status Code: `403 Forbidden` for all endpoints
- ✅ No account information exposed
- ✅ No operations permitted

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 6.2: Invalid Token Handling**
**Objective**: Verify token validation

**Tests**:
```bash
# With invalid/expired token
GET /api/v1/users/me/security
Authorization: Bearer invalid_token_here
```

**Expected Results**:
- ❌ Status Code: `401 Unauthorized`
- ❌ Error: `"Could not validate credentials"`

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 7: Error Handling & Edge Cases**

### **Test 7.1: Invalid Google Token**
**Objective**: Verify Google token validation

**Steps**:
1. Attempt to link with invalid Google credential:
   ```bash
   POST /api/v1/users/me/link-google
   {
     "google_credential": "invalid_token"
   }
   ```

**Expected Results**:
- ❌ Status Code: `400 Bad Request`
- ❌ Error: `"Google OAuth error: Invalid Google token"`

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 7.2: Missing Request Data**
**Objective**: Verify input validation

**Tests**:
```bash
# Missing Google credential
POST /api/v1/users/me/link-google
{}

# Missing password
POST /api/v1/users/me/unlink-google
{}
```

**Expected Results**:
- ❌ Status Code: `422 Unprocessable Entity`
- ❌ Validation errors for required fields

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 7.3: Database Error Handling**
**Objective**: Verify graceful error handling

**Setup**: Simulate database connectivity issues

**Expected Results**:
- ❌ Status Code: `500 Internal Server Error`
- ❌ Error: `"Failed to link/unlink Google account"`
- ✅ No data corruption
- ✅ User can retry operation

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 8: Performance & Load Testing**

### **Test 8.1: Concurrent Linking Attempts**
**Objective**: Verify race condition handling

**Steps**:
1. Simulate multiple simultaneous linking requests
2. Verify only one succeeds
3. Check data consistency

**Expected Results**:
- ✅ Only one linking operation succeeds
- ✅ No duplicate Google IDs in database
- ✅ Consistent user state

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 8.2: Session Expiration**
**Objective**: Verify session handling

**Steps**:
1. Log in and get JWT token
2. Wait for token expiration (or manually expire)
3. Attempt account linking operations

**Expected Results**:
- ❌ Operations fail with `401 Unauthorized`
- ✅ User must re-authenticate
- ✅ Can continue after fresh login

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Phase 9: Complete User Journeys**

### **Test 9.1: LOCAL → HYBRID → LOCAL Journey**
**Objective**: Full account lifecycle testing

**Timeline**:
1. Day 1: Register as LOCAL user
2. Day 2: Link Google account (become HYBRID)
3. Day 3: Use both login methods
4. Day 4: Unlink Google (back to LOCAL)
5. Day 5: Re-link Google (HYBRID again)

**Verification Points**:
- ✅ All transitions work smoothly
- ✅ No data loss during transitions
- ✅ Login methods work as expected
- ✅ Security status always accurate

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

### **Test 9.2: GOOGLE → HYBRID → LOCAL Journey**
**Objective**: Alternative user journey

**Timeline**:
1. Register as GOOGLE user
2. Set password (if UI available) → HYBRID
3. Unlink Google → LOCAL
4. Continue as LOCAL user

**Verification Points**:
- ✅ Password setting converts to HYBRID
- ✅ Can unlink Google after password set
- ✅ Account remains accessible

**Test Status**: 🟢 PASS | 🔴 FAIL | ⚪ NOT TESTED
**Notes**: [Optional: Any issues, observations, or specific details]
**Tested Date**: [YYYY-MM-DD]

---

## **Test Execution Guidelines**

### **Test Data Management**
- Use unique email addresses for each test
- Clean up test users after each phase
- Use consistent passwords for easier debugging
- Document any test data that needs persistence

### **API Testing Tools**
- **Postman/Insomnia**: For API endpoint testing
- **curl**: For command-line testing
- **Browser DevTools**: For frontend integration testing
- **JWT Debugger**: For token validation

### **Logging & Monitoring**
- Monitor application logs during testing
- Check database state after each test
- Verify no security-sensitive information in logs
- Document any unexpected behavior

### **Test Environment Reset**
Between major test phases:
1. Clear test database of created users
2. Clear JWT tokens and sessions
3. Clear browser cookies/local storage
4. Restart application services if needed

---

## **Pass/Fail Criteria**

### **Must Pass (Critical)**
- ✅ Account takeover prevention (Test 5.1)
- ✅ Authentication required for all operations (Test 6.1)
- ✅ Password required for unlinking (Test 4.4)
- ✅ Email verification for linking (Test 4.1)
- ✅ No lockout scenarios (Test 4.5)

### **Should Pass (Important)**
- ✅ All happy path scenarios (Phase 3)
- ✅ All boundary conditions (Phase 4)
- ✅ Error handling (Phase 7)
- ✅ User journey completeness (Phase 9)

### **Could Pass (Nice-to-Have)**
- ✅ Performance under load (Test 8.1)
- ✅ Advanced error recovery scenarios

---

## **Test Report Template**

For each test, document:

```markdown
### Test [X.Y]: [Test Name]
**Status**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
**Execution Date**: [Date]
**Tester**: [Name]

**Results**:
- Expected: [What should happen]
- Actual: [What actually happened]
- Evidence: [Screenshots, logs, API responses]

**Issues Found**:
- [List any bugs or unexpected behavior]

**Notes**:
- [Additional observations]
```

This comprehensive test plan ensures the security, functionality, and usability of Zentropy's authentication and account linking system.