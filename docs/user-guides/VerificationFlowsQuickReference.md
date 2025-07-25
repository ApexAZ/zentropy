# Email Verification Flows - Quick Reference

## At a Glance

| Flow | Authentication Required | Steps | Primary Use Case |
|------|------------------------|-------|------------------|
| **Password Change** | ✅ Yes | 3 steps | Logged-in users changing password |
| **Password Reset** | ❌ No | 3 steps | Users who forgot their password |
| **Username Recovery** | ❌ No | 2 steps | Users who forgot their username |

---

## 🔄 Flow Diagrams

### Password Change Flow
```
[Step 1: Password Entry] → [Step 2: Email Verification] → [Step 3: Confirmation]
      ↓                           ↓                            ↓
Enter new password        Verify 6-digit code         Enter current password
                                                      → Password changed ✅
```

### Password Reset Flow
```
[Step 1: Email Entry] → [Step 2: Email Verification] → [Step 3: New Password]
      ↓                       ↓                            ↓
Enter email address     Verify 6-digit code         Set new password
                                                     → Password reset ✅
```

### Username Recovery Flow
```
[Step 1: Email Entry] → [Step 2: Email Verification] → [Username Sent]
      ↓                       ↓                            ↓
Enter email address     Verify 6-digit code         Username emailed ✅
```

---

## 🔐 Security Specifications

### Verification Codes
- **Format**: 6-digit numeric (000000-999999)
- **Expiration**: 10 minutes
- **Usage**: Single-use only
- **Delivery**: Email only

### Operation Tokens
- **Format**: JWT (invisible to users)
- **Expiration**: 10 minutes
- **Usage**: Single-use only
- **Scope**: Operation-specific

### Rate Limits
- **Send codes**: 3 per 5 minutes (per IP)
- **Verify codes**: 5 per 15 minutes (per IP)
- **Password operations**: 5 per 15 minutes (per IP)

---

## 📧 Email Templates

### Verification Code Email
```
Subject: [Operation] Verification Code - Zentropy

Hi [Name],

Your verification code is: 123456

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
The Zentropy Team
```

### Username Recovery Email
```
Subject: Your Zentropy Username

Hi [Name],

Your Zentropy username is: user@example.com

You can use this to log in at: [login_url]

Best regards,
The Zentropy Team
```

---

## 🚨 Common User Issues & Solutions

### "I didn't receive the email"
**Solution Steps**:
1. Check spam/junk folder
2. Wait up to 5 minutes
3. Use "Resend Code" button
4. Verify email address in profile

### "Verification code doesn't work"
**Possible Causes**:
- Expired (>10 minutes old)
- Already used
- Typo in entry
- Using old code

**Solution**: Request new code

### "Too many requests"
**Cause**: Hit rate limit
**Solution**: Wait 5-15 minutes before retrying

### "Current password is wrong"
**For Password Change**:
- User entering wrong current password
**Solution**: Use Forgot Password flow instead

---

## 💻 Technical Details

### Backend Endpoints
- `POST /api/v1/auth/send-security-code`
- `POST /api/v1/auth/verify-security-code`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/recover-username`
- `POST /api/v1/users/me/secure-change-password`

### Frontend Components
- `SecurityCodeFlow.tsx` - Email verification step
- `PasswordChangeForm.tsx` - 3-step password change
- `ForgotPasswordFlow.tsx` - 3-step password reset

### Operation Types
- `email_verification` - Account registration
- `password_change` - Authenticated password change
- `password_reset` - Unauthenticated password reset
- `username_recovery` - Username recovery

---

## 🎯 Support Scripts

### Quick Diagnostic Questions
1. **What flow were you using?** (Change password / Reset password / Recover username)
2. **Did you receive any emails?** (Check spam folder)
3. **What error message did you see?** (Exact text)
4. **How long ago did you request the code?** (Codes expire in 10 minutes)
5. **Have you tried this multiple times?** (Rate limiting check)

### Verification Checklist
- [ ] User checked spam folder
- [ ] User using correct email address
- [ ] Code is less than 10 minutes old
- [ ] User entering code correctly (6 digits, numbers only)
- [ ] User hasn't hit rate limits
- [ ] Browser cookies/JavaScript enabled

### Escalation Criteria
- User reports not receiving emails after 24 hours
- User account appears locked/suspended
- Technical errors in verification system
- Suspected security compromise

---

## 📊 Success Metrics

### Expected Success Rates
- **Email delivery**: >99%
- **Code verification**: >95%
- **Complete flow**: >90%

### Common Drop-off Points
1. **Email not received** (~3-5% of users)
2. **Code entry errors** (~2-3% of users)
3. **Code expiration** (~1-2% of users)

### Monitoring Alerts
- Email delivery failure rate >1%
- Code verification failure rate >10%
- Rate limit hits >100 per hour
- Support ticket volume spike

---

## 🔧 Development Notes

### Testing
- Use test fixtures for verification codes
- Mock email service in integration tests
- Test all error conditions and edge cases

### Configuration
- Rate limits configurable via environment variables
- Email templates stored in configuration
- Code expiration time configurable

### Monitoring
- Track email delivery success/failure
- Monitor verification code usage patterns
- Alert on unusual failure rates

---

*For detailed API documentation, see: `/docs/api/security-operations.md`*  
*For full user guide, see: `/docs/user-guides/VerificationFlowsGuide.md`*  

*Last updated: January 22, 2025*