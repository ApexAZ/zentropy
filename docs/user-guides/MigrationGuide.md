# Migration Guide: Legacy to Unified Verification System

## Overview

This guide helps you migrate from Zentropy's legacy password management system to the new unified email verification system. The new system provides enhanced security while maintaining ease of use.

---

## 🔄 What's Changing?

### Before (Legacy System)
- **Simple password change**: Only required current password
- **Basic password reset**: Direct reset without verification steps
- **No email verification**: Security relied solely on password knowledge
- **Single-step flows**: Limited security validation

### After (New Unified System)
- **Email-verified password change**: Requires current password + email verification
- **Multi-step password reset**: Email verification → password creation
- **Enhanced security**: JWT operation tokens with time limits
- **Rate limiting**: Protection against abuse and attacks

---

## 📅 Migration Timeline

| Phase | Description | Timeline | Status |
|-------|-------------|----------|--------|
| **Phase 1** | New system deployed alongside legacy | ✅ Complete | Both systems available |
| **Phase 2** | User education and gradual migration | **Current** | Voluntary adoption |
| **Phase 3** | Legacy system deprecation warnings | Coming Soon | 30-day notice |
| **Phase 4** | Legacy system removal | Future | Complete migration |

---

## 🚀 For End Users

### Immediate Changes

#### **Password Changes Now Require Email Verification**

**Old Flow:**
1. Enter current password
2. Enter new password
3. Click "Change Password" ✅ Done

**New Flow:**
1. Enter new password (twice for confirmation)
2. Click "Send Verification Code"
3. Check email for 6-digit code
4. Enter verification code
5. Enter current password + confirm new password
6. Click "Change Password" ✅ Done

#### **Password Reset is Now Multi-Step**

**Old Flow:**
1. Enter email address
2. Click link in email
3. Set new password ✅ Done

**New Flow:**
1. Enter email address
2. Click "Send Reset Code"
3. Check email for 6-digit code
4. Enter verification code
5. Set new password ✅ Done

### New Features Available


### What Stays The Same

- **Login process**: No changes to how you log in
- **Profile management**: All other profile updates work the same
- **Password requirements**: Same strength requirements
- **Account linking**: OAuth providers (Google, etc.) unchanged

---

## 💻 For Developers

### API Changes

#### **Backend Endpoints**

**New Endpoints** (Use These):
```
POST /api/v1/auth/send-security-code        # Send verification codes
POST /api/v1/auth/verify-security-code      # Verify codes, get operation tokens
POST /api/v1/auth/reset-password            # Reset password with operation token
POST /api/v1/users/me/secure-change-password # Secure password change
```

**Legacy Endpoints** (Deprecated):
```
POST /api/v1/users/me/change-password       # ⚠️ DEPRECATED - Simple password change
```

#### **Frontend Services**

**UserService Methods**:

**New (Recommended):**
```typescript
// Use this for new implementations
UserService.changePassword(currentPassword, newPassword, operationToken)
```

**Legacy (Deprecated):**
```typescript
// ⚠️ DEPRECATED - Will be removed
UserService.updatePassword({ current_password, new_password })
```

### Migration Steps for Developers

#### **Step 1: Update Frontend Components**

**Replace Legacy Password Change Forms:**

```typescript
// ❌ OLD: Direct password change
const handlePasswordChange = async () => {
  await UserService.updatePassword({
    current_password: currentPassword,
    new_password: newPassword
  });
};

// ✅ NEW: Use PasswordChangeForm component
import { PasswordChangeForm } from '../components/PasswordChangeForm';

const MyComponent = () => (
  <PasswordChangeForm 
    onSuccess={() => showToast("Password changed!")}
    onCancel={() => setShowModal(false)}
  />
);
```

#### **Step 2: Update API Calls**

**Backend Integration:**

```typescript
// ❌ OLD: Direct endpoint call
fetch('/api/v1/users/me/change-password', {
  method: 'POST',
  body: JSON.stringify({ current_password, new_password })
});

// ✅ NEW: Use unified verification flow
// 1. Send verification code
await AuthService.sendSecurityCode(userEmail, 'password_change');
// 2. Verify code and get operation token
const { operation_token } = await AuthService.verifySecurityCode(userEmail, code, 'password_change');
// 3. Change password with token
await UserService.changePassword(currentPassword, newPassword, operation_token);
```

#### **Step 3: Update Tests**

**Test Migration:**

```typescript
// ❌ OLD: Simple password change test
it('should change password', async () => {
  const result = await UserService.updatePassword({
    current_password: 'old',
    new_password: 'new'
  });
  expect(result.message).toBe('Password updated successfully!');
});

// ✅ NEW: Multi-step verification test
it('should change password with verification', async () => {
  // Mock the full flow
  const mockOperationToken = 'mock-token';
  vi.mocked(AuthService.sendSecurityCode).mockResolvedValue({});
  vi.mocked(AuthService.verifySecurityCode).mockResolvedValue({
    operation_token: mockOperationToken
  });
  vi.mocked(UserService.changePassword).mockResolvedValue({
    message: 'Password changed successfully'
  });

  // Test the component flow
  renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} />);
  
  // Complete all steps...
  expect(UserService.changePassword).toHaveBeenCalledWith(
    'current', 'new', mockOperationToken
  );
});
```

### Code Examples

#### **Complete Migration Example**

**Before (Legacy Component):**
```typescript
// LegacyPasswordChange.tsx
import React, { useState } from 'react';
import { UserService } from '../services/UserService';

export const LegacyPasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await UserService.updatePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      alert('Password changed!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="password" 
        placeholder="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <input 
        type="password" 
        placeholder="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        Change Password
      </button>
    </form>
  );
};
```

**After (New System):**
```typescript
// ModernPasswordChange.tsx
import React from 'react';
import { PasswordChangeForm } from '../components/PasswordChangeForm';
import { useToast } from '../contexts/ToastContext';

export const ModernPasswordChange = ({ onClose }) => {
  const { showSuccess, showError } = useToast();

  return (
    <PasswordChangeForm
      onSuccess={() => {
        showSuccess('Password changed successfully!');
        onClose();
      }}
      onCancel={onClose}
    />
  );
};
```

---

## 🔧 For System Administrators

### Deployment Considerations

#### **Database Changes**
- **No schema changes required** - new system uses existing user tables
- **New tables added**: Used operation tokens, verification codes
- **Cleanup service**: Automatically removes expired codes and tokens

#### **Configuration Updates**

**Environment Variables:**
```bash
# Email service configuration (if not already set)
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password

# Rate limiting (optional - has defaults)
RATE_LIMIT_EMAIL_REQUESTS=3
RATE_LIMIT_EMAIL_WINDOW_MINUTES=5
RATE_LIMIT_AUTH_REQUESTS=5
RATE_LIMIT_AUTH_WINDOW_MINUTES=15

# Redis for rate limiting (optional - falls back to in-memory)
REDIS_URL=redis://localhost:6379
```

**Security Settings:**
```bash
# Operation token security (should already be set)
SECRET_KEY=your-secret-key-for-jwt-signing

# Token expiration (optional - defaults to 10 minutes)
OPERATION_TOKEN_EXPIRY_MINUTES=10
```

#### **Monitoring**

**Key Metrics to Monitor:**
- Email delivery success rate (should be >99%)
- Verification code success rate (should be >95%)
- User completion rate for new flows (should be >90%)
- Rate limiting triggers (monitor for abuse)

**Alerts to Set Up:**
- Email delivery failures >1%
- Verification failures >10% 
- High rate limiting activity
- Support ticket volume increases

### Rollback Plan

If issues arise, you can temporarily disable the new system:

```bash
# Environment flag to force legacy mode (emergency only)
FORCE_LEGACY_PASSWORD_CHANGE=true
```

**Note**: This should only be used in emergencies as it bypasses security improvements.

---

## 📊 For Product/Business Teams

### User Impact Analysis

#### **Conversion Metrics**

**Expected User Behavior:**
- **90%+ adoption** within 30 days of education campaign
- **<5% support ticket increase** during transition period
- **Improved security** with email verification for all password operations

#### **Support Preparation**

**Common User Questions:**
1. "Why do I need to verify my email to change my password?"
   - **Answer**: Enhanced security to protect your account from unauthorized changes

2. "I didn't receive the verification email"
   - **Answer**: Check spam folder, wait 5 minutes, or use "Resend Code" button

3. "The verification code expired"
   - **Answer**: Codes expire after 10 minutes for security - request a new one

4. "This is more complicated than before"
   - **Answer**: The extra step significantly improves account security while only adding ~2 minutes

#### **Communication Templates**

**Email Announcement:**
```
Subject: Important Security Update - Enhanced Password Protection

Hi [Name],

We're enhancing account security with email verification for password changes. 

What's New:
• Password changes now require email verification
• Improved protection against unauthorized access

What This Means:
• Changing your password takes one additional step (email verification)
• Your account is now more secure
• The process is still quick and easy

Need Help?
Visit our updated guide: [link to user guide]

Thanks for your understanding as we work to keep your account secure.

The Zentropy Team
```

### Rollout Strategy

#### **Phase 1: Soft Launch (Current)**
- New system available alongside legacy
- Optional migration for early adopters
- Documentation and support materials ready

#### **Phase 2: User Education (Week 2-3)**
- Email announcement to all users
- In-app notifications about changes
- Updated help documentation

#### **Phase 3: Encouraged Migration (Week 4-5)**
- Gentle prompts to use new system
- Benefits messaging in UI
- Support team prepared for questions

#### **Phase 4: Legacy Deprecation (Week 6-7)**
- Warning messages in legacy flows
- 30-day notice before removal
- Final migration push

#### **Phase 5: Legacy Removal (Week 8+)**
- Legacy endpoints disabled
- Full migration to new system
- Post-migration monitoring

---

## 🧪 Testing Your Migration

### Pre-Migration Testing

#### **Backend Testing**
```bash
# Test new endpoints
curl -X POST /api/v1/auth/send-security-code \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "operation_type": "password_change"}'

# Test legacy endpoint still works
curl -X POST /api/v1/users/me/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "old", "new_password": "new"}'
```

#### **Frontend Testing**
```typescript
// Test both old and new components work
describe('Password Change Migration', () => {
  it('legacy component still works', () => {
    renderWithProviders(<LegacyPasswordChange />);
    // Test legacy flow...
  });

  it('new component works', () => {
    renderWithProviders(<PasswordChangeForm />);
    // Test new flow...
  });
});
```

### Post-Migration Validation

#### **Smoke Tests**
1. **New user registration** - should use new system by default
2. **Password change** - should require email verification
3. **Password reset** - should use multi-step flow

#### **Load Testing**
- Test email delivery under load
- Verify rate limiting works correctly
- Test database performance with new tables

---

## ❓ Frequently Asked Questions

### For Users

**Q: Do I need to do anything to migrate?**
A: No action required. Your next password change will automatically use the new secure system.

**Q: Will my current password still work?**
A: Yes, your password remains the same. Only the password change process is enhanced.

**Q: What if I don't receive verification emails?**
A: Check your spam folder and use the "Resend Code" button. Contact support if issues persist.

### For Developers

**Q: Can I use both systems during migration?**
A: Yes, both legacy and new endpoints work during the transition period.

**Q: When will legacy endpoints be removed?**
A: Legacy endpoints will be deprecated with 30 days notice, likely 6-8 weeks after new system launch.

**Q: How do I test the new flows?**
A: Use the provided test fixtures and mock services. See the testing guide for examples.

### For Administrators

**Q: What monitoring should I set up?**
A: Monitor email delivery rates, verification success rates, and user completion rates.

**Q: How do I handle user complaints about complexity?**
A: Emphasize security benefits and point to user guides. Most users adapt within a few uses.

**Q: What's the rollback plan if there are issues?**
A: Temporary legacy mode flag available for emergencies, but new system should be stable.

---

## 📞 Support and Resources

### Documentation Links
- **User Guide**: `/docs/user-guides/VerificationFlowsGuide.md`
- **API Documentation**: `/docs/api/security-operations.md`
- **Quick Reference**: `/docs/user-guides/VerificationFlowsQuickReference.md`

### Development Resources
- **Component Library**: `src/client/components/PasswordChangeForm.tsx`
- **Service Layer**: `src/client/services/AuthService.ts`, `UserService.ts`
- **Test Examples**: `src/client/__tests__/integration/unified-verification.test.tsx`

### Support Contacts
- **Technical Issues**: Development team
- **User Questions**: Customer support
- **Security Concerns**: Security team

---

## 🎯 Success Criteria

### Migration Complete When:
- [ ] 95%+ users successfully use new password change flow
- [ ] <2% increase in support tickets after 30 days
- [ ] All legacy endpoints can be safely removed
- [ ] Email delivery success rate >99%
- [ ] User satisfaction scores maintain current levels

### Performance Targets:
- [ ] Email verification codes delivered in <30 seconds
- [ ] Complete password change flow in <3 minutes
- [ ] System handles 10x current load without degradation
- [ ] Zero security incidents related to verification system

---

*Migration Guide Version: 1.0.0*  
*Last Updated: January 22, 2025*  
*Next Review: February 15, 2025*