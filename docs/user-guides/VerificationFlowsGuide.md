# Email Verification Flows User Guide

## Overview

Zentropy uses secure email verification for all security-sensitive operations to protect your account. This guide explains how to use the various verification flows, what to expect, and how to troubleshoot common issues.

## 🔐 Why Email Verification?

Email verification adds an extra layer of security to sensitive operations:

- **Password Changes**: Verify it's really you changing your password
- **Password Resets**: Securely reset forgotten passwords
- **Account Changes**: Confirm important account modifications

All verification flows use **6-digit codes** sent to your email that expire in **10 minutes** for your security.

---

## 🔄 Password Change (For Logged-In Users)

Use this when you want to change your password while logged into your account.

### Step-by-Step Process

#### **Step 1: Start Password Change**

1. **Go to Profile Settings**
   - Click your profile picture or name in the top-right corner
   - Select **"Profile"** or **"Account Settings"**
   - Navigate to the **"Security"** section

2. **Click "Change Password"**
   - You'll see a button labeled **"Change Password"**
   - Click it to start the secure password change process

#### **Step 2: Enter Your New Password**

1. **Fill in the Password Form**
   ```
   New Password: [Enter your desired new password]
   Confirm New Password: [Enter the same password again]
   ```

2. **Password Requirements**
   - **Minimum 8 characters**
   - **Include uppercase letters** (A-Z)
   - **Include lowercase letters** (a-z) 
   - **Include numbers** (0-9)
   - **Include symbols** (!@#$%^&*)
   - **Maximum 128 characters**

3. **Click "Send Verification Code"**
   - The system will send a 6-digit code to your email
   - You'll see a message: *"Verification code sent to your@email.com"*

#### **Step 3: Verify Your Email**

1. **Check Your Email**
   - Look for an email from Zentropy with subject: *"Password Change Verification Code"*
   - **Check your spam folder** if you don't see it within 2 minutes

2. **Enter the 6-Digit Code**
   ```
   Verification Code: [123456]
   ```
   - The code expires in **10 minutes**
   - Only numbers are allowed
   - The code is exactly 6 digits

3. **Click "Verify Code"**
   - If successful, you'll proceed to the final step
   - If the code is wrong, you'll see an error message

#### **Step 4: Complete Password Change**

1. **Enter Your Current Password**
   ```
   Current Password: [Your existing password]
   New Password: [Will be pre-filled from Step 2]
   Confirm New Password: [Will be pre-filled from Step 2]
   ```

2. **Click "Change Password"**
   - Your password will be updated immediately
   - You'll see a success message: *"Password changed successfully!"*
   - **You'll remain logged in** with your new password

### ✅ Success!

Your password has been changed! You can now use your new password for future logins.

### Common Issues

**❓ "I didn't receive the verification email"**
- Check your spam/junk folder
- Wait up to 5 minutes for delivery
- Click **"Resend Code"** to send a new verification email
- Verify your email address is correct in your profile

**❓ "The verification code expired"**
- Codes expire after 10 minutes for security
- Go back and click **"Send Verification Code"** again
- Check your email for the new code

**❓ "My current password is wrong"**
- Double-check you're entering your current (old) password correctly
- If you've forgotten it, use the **"Forgot Password"** flow instead

---

## 🔓 Forgot Password (Password Reset)

Use this when you can't remember your password and need to reset it.

### Step-by-Step Process

#### **Step 1: Start Password Reset**

1. **Go to the Login Page**
   - Visit the Zentropy login page
   - Look for the **"Forgot Password?"** link
   - Click the link to start the reset process

#### **Step 2: Enter Your Email**

1. **Provide Your Email Address**
   ```
   Email Address: [your@email.com]
   ```

2. **Click "Send Reset Code"**
   - A verification code will be sent to your email
   - You'll see: *"If an account with that email exists, a verification code has been sent"*
   - **Note**: This message appears whether or not your email is in our system (for security)

#### **Step 3: Verify Your Email**

1. **Check Your Email**
   - Look for an email from Zentropy with subject: *"Password Reset Verification Code"*
   - **Check your spam folder** if you don't see it within 2 minutes

2. **Enter the 6-Digit Code**
   ```
   Verification Code: [123456]
   ```
   - The code expires in **10 minutes**
   - Only numbers are allowed

3. **Click "Verify Code"**
   - If your email exists in our system and the code is correct, you'll proceed
   - If there's an issue, you'll see an error message

#### **Step 4: Set Your New Password**

1. **Create Your New Password**
   ```
   New Password: [Enter your new password]
   Confirm New Password: [Enter the same password again]
   ```

2. **Password Requirements** (same as password change)
   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, and symbols

3. **Click "Reset Password"**
   - Your password will be reset immediately
   - You'll see: *"Password reset successfully!"*
   - **You'll need to log in** with your new password

### ✅ Success!

Your password has been reset! You can now log in with your new password.

### Common Issues

**❓ "I entered my email but nothing happened"**
- For security, we don't reveal whether an email exists in our system
- If your email is registered, you'll receive a verification code
- Check your spam folder and wait up to 5 minutes

**❓ "I received the code but it doesn't work"**
- Make sure you're entering the code exactly as shown in the email
- Codes expire after 10 minutes - request a new one if needed
- Only use the most recent code if you requested multiple

---


## 🛡️ Security Features

### Email Verification Codes

- **6-digit numeric codes** (e.g., 123456)
- **10-minute expiration** for security
- **Single-use only** - each code can only be used once
- **Rate limited** - prevents spam and abuse

### Operation Tokens

- **Invisible to users** - handled automatically by the system
- **10-minute expiration** - short-lived for security
- **Operation-specific** - can't be used for different purposes
- **Single-use only** - become invalid after use

### Rate Limiting

To prevent abuse, we limit how often you can request codes:

| Action | Limit |
|--------|-------|
| Send verification codes | 3 requests per 5 minutes |
| Verify codes | 5 attempts per 15 minutes |
| Password operations | 5 attempts per 15 minutes |

If you hit these limits, wait a few minutes before trying again.

---

## 📧 Email Guidelines

### Checking Your Email

1. **Primary Inbox**: Check your main inbox first
2. **Spam/Junk Folder**: Always check here if you don't see the email
3. **Promotions Tab**: Gmail users should check the Promotions tab
4. **Wait Time**: Allow up to 5 minutes for email delivery

### Email Not Arriving?

1. **Verify Email Address**: Make sure your profile has the correct email
2. **Check Filters**: Look for email filters that might be redirecting Zentropy emails
3. **Whitelist Domain**: Add Zentropy's domain to your email whitelist
4. **Try Resend**: Use the "Resend Code" button after waiting 2-3 minutes

### Email Security

- **Don't share codes**: Never share verification codes with anyone
- **Check sender**: Verify emails are from the official Zentropy domain
- **Recent codes only**: Always use the most recently received code

---

## 🚨 Troubleshooting

### Common Error Messages

**"Invalid verification code"**
- Double-check you entered the code correctly
- Make sure you're using the most recent code
- Check that the code hasn't expired (10 minutes)

**"Verification code expired"**
- Request a new code using the "Resend Code" button
- Complete the verification within 10 minutes of receiving the new code

**"Too many requests"**
- You've hit the rate limit - wait 5-15 minutes before trying again
- Don't repeatedly click send - one request is enough

**"Current password is incorrect"**
- For password changes, make sure you're entering your current password correctly
- If you've forgotten your current password, use the "Forgot Password" flow instead

**"Passwords don't match"**
- Make sure your "New Password" and "Confirm Password" are identical
- Check for extra spaces or different capitalization

### Browser Issues

**Form not responding**
- Try refreshing the page
- Clear your browser cache
- Try a different browser or incognito/private mode

**Email links not working**
- Copy and paste the verification code manually instead of clicking links
- Make sure you're not using an expired email

### Account Locked or Suspended

If your account has been locked due to security concerns:
1. **Wait 24 hours** before trying again
2. **Contact support** if the issue persists
3. **Provide verification** of your identity if requested

---

## 💡 Best Practices

### Password Security

- **Use unique passwords** for different accounts
- **Use a password manager** to generate and store strong passwords
- **Change passwords regularly** (every 6-12 months)
- **Don't reuse old passwords**

### Email Security

- **Keep your email secure** - it's the key to your Zentropy account
- **Enable two-factor authentication** on your email account
- **Use a secure email provider**
- **Monitor for suspicious activity**

### Verification Security

- **Complete verification quickly** - don't leave codes unused
- **Don't share verification codes** with anyone
- **Report suspicious emails** claiming to be from Zentropy
- **Log out from shared computers** after changing passwords

---

## 📞 Getting Help

### Self-Service Options

1. **Try the troubleshooting steps** in this guide first
2. **Check the FAQ** on our website
3. **Restart the verification process** if you encounter issues

### Contact Support

If you still need help:

1. **Email Support**: Include details about:
   - What verification flow you were using
   - What error message you received
   - What browser and device you're using
   - Whether you received any verification emails

2. **Response Time**: We typically respond within 24 hours

3. **Security Verification**: For account security, we may ask you to verify your identity

---

## 🔄 Recent Updates

This verification system was updated to provide:
- **Enhanced security** with email verification for all sensitive operations
- **Improved user experience** with clear step-by-step flows
- **Better error messages** to help you resolve issues quickly
- **Consistent design** across all verification flows

### What Changed?

If you used Zentropy before this update:
- **Password changes now require email verification** (previously only required current password)
- **Password resets use the new multi-step flow** (previously was a single-step process)
- **Improved security** with time-limited verification codes

All changes are designed to better protect your account while maintaining ease of use.

---

*Last updated: January 22, 2025*  
*Version: 1.0.0*