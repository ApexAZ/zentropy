# Security Operations API

## Overview

The Zentropy Security Operations API provides unified email verification for security-sensitive operations. This system ensures that sensitive actions like password changes, password resets, and email recovery are properly authenticated through email verification.

### Key Features

- **Unified Security Flow**: Single system for all email-verified security operations
- **Operation Tokens**: Short-lived JWT tokens (10 minutes) for secure authorization
- **Rate Limiting**: Protection against abuse with configurable limits
- **Email Enumeration Protection**: Consistent responses that don't reveal email existence
- **Single-Use Tokens**: Operation tokens can only be used once

### Architecture

```
1. User requests security operation
2. System sends verification code to email
3. User enters code to get operation token
4. User uses operation token to complete operation
```

---

## Authentication

All endpoints except `send-security-code` require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/send-security-code` | 3 requests | 5 minutes |
| `/verify-security-code` | 5 requests | 15 minutes |
| `/reset-password` | 5 requests | 15 minutes |
| `/me/secure-change-password` | 5 requests | 15 minutes |

Rate limits are applied per IP address and use Redis for distributed rate limiting with in-memory fallback.

---

## Endpoints

### Send Security Code

**POST** `/api/v1/auth/send-security-code`

Sends a 6-digit verification code to the user's email for security operations.

#### Request Body

```json
{
  "email": "user@example.com",
  "operation_type": "password_change"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `EmailStr` | ✅ | Email address to send code to |
| `operation_type` | `string` | ✅ | Type of security operation |

#### Operation Types

| Type | Description | Authentication Required |
|------|-------------|------------------------|
| `email_verification` | Account registration verification | ❌ |
| `password_change` | Change password (authenticated users) | ✅ |
| `password_reset` | Reset forgotten password | ❌ |

#### Response

**Success (200)**
```json
{
  "message": "Verification code sent to user@example.com"
}
```

**Error Responses**
- `400 Bad Request`: Invalid email or operation type
- `429 Too Many Requests`: Rate limit exceeded (3 requests per 5 minutes)

#### Example

```bash
curl -X POST "https://api.zentropy.com/api/v1/auth/send-security-code" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "operation_type": "password_change"
  }'
```

---

### Verify Security Code

**POST** `/api/v1/auth/verify-security-code`

Verifies the 6-digit code and returns an operation token for completing the security operation.

#### Request Body

```json
{
  "email": "user@example.com",
  "code": "123456",
  "operation_type": "password_change"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `EmailStr` | ✅ | Email address that received the code |
| `code` | `string` | ✅ | 6-digit numeric verification code |
| `operation_type` | `string` | ✅ | Must match the original operation type |

#### Response

**Success (200)**
```json
{
  "operation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 600
}
```

| Field | Type | Description |
|-------|------|-------------|
| `operation_token` | `string` | JWT token for authorizing the operation |
| `expires_in` | `integer` | Token expiration time in seconds (600 = 10 minutes) |

**Error Responses**
- `400 Bad Request`: Invalid code, email, or operation type mismatch
- `410 Gone`: Verification code expired or already used
- `429 Too Many Requests`: Rate limit exceeded (5 requests per 15 minutes)

#### Example

```bash
curl -X POST "https://api.zentropy.com/api/v1/auth/verify-security-code" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "operation_type": "password_change"
  }'
```

---

### Reset Password

**POST** `/api/v1/auth/reset-password`

Resets a user's password using an operation token from the password reset flow.

#### Request Body

```json
{
  "new_password": "NewSecurePassword123!",
  "operation_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `new_password` | `string` | ✅ | New password (8-128 characters) |
| `operation_token` | `string` | ✅ | Token from `password_reset` verification |

#### Response

**Success (200)**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses**
- `400 Bad Request`: Invalid password format or token
- `401 Unauthorized`: Invalid or expired operation token
- `429 Too Many Requests`: Rate limit exceeded

#### Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- Should include uppercase, lowercase, numbers, and symbols (recommended)

#### Example

```bash
curl -X POST "https://api.zentropy.com/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewSecurePassword123!",
    "operation_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
  }'
```

---

### Secure Password Change

**POST** `/api/v1/users/me/secure-change-password`

Changes the authenticated user's password using multi-factor verification.

#### Authentication Required

This endpoint requires a valid Bearer token.

#### Request Body

```json
{
  "current_password": "CurrentPassword123!",
  "new_password": "NewSecurePassword456!",
  "operation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_password` | `string` | ✅ | User's current password |
| `new_password` | `string` | ✅ | New password (8-128 characters) |
| `operation_token` | `string` | ✅ | Token from `password_change` verification |

#### Response

**Success (200)**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses**
- `400 Bad Request`: Invalid password format or current password incorrect
- `401 Unauthorized`: Not authenticated or invalid operation token
- `429 Too Many Requests`: Rate limit exceeded

#### Multi-Step Flow

1. **Send Code**: `POST /auth/send-security-code` with `operation_type: "password_change"`
2. **Verify Code**: `POST /auth/verify-security-code` to get operation token
3. **Change Password**: Use operation token in this endpoint

#### Example

```bash
curl -X POST "https://api.zentropy.com/api/v1/users/me/secure-change-password" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "CurrentPassword123!",
    "new_password": "NewSecurePassword456!",
    "operation_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

## Security Considerations

### Operation Token Security

- **Signed JWT**: Tokens are signed with HS256 using the application secret key
- **Short-lived**: 10-minute expiration for security
- **Single-use**: Tokens are invalidated after use to prevent replay attacks
- **Operation-specific**: Tokens are bound to specific operation types
- **User-specific**: Tokens include user email for validation

### Email Enumeration Protection

All security endpoints return consistent success messages regardless of whether the email exists in the system. This prevents attackers from determining which email addresses are registered.

**Example**: Both existing and non-existing emails receive the same response:
```json
{
  "message": "If an account with that email exists, a verification code has been sent"
}
```

### Rate Limiting

- **IP-based**: Limits are applied per client IP address
- **Distributed**: Uses Redis for consistent limits across multiple servers
- **Graceful degradation**: Falls back to in-memory limiting if Redis is unavailable
- **Configurable**: Limits can be adjusted based on security requirements

### Input Validation

- **Email format**: Validated using EmailStr type
- **Code format**: Must be exactly 6 numeric digits (`^[0-9]{6}$`)
- **Password length**: 8-128 characters for new passwords
- **Token validation**: Operation tokens are validated for format and content

---

## Error Handling

### Standard Error Response

```json
{
  "detail": "Error message description"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input data |
| `401` | Unauthorized - Invalid or missing authentication |
| `410` | Gone - Resource expired or no longer available |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server-side error |

### Rate Limit Headers

When rate limited, responses include headers indicating the limit status:

```
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642680000
```

---

## Integration Examples

### Frontend Integration (TypeScript)

```typescript
// 1. Send security code
const sendCode = async (email: string, operationType: string) => {
  const response = await fetch('/api/v1/auth/send-security-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, operation_type: operationType })
  });
  return response.json();
};

// 2. Verify code and get token
const verifyCode = async (email: string, code: string, operationType: string) => {
  const response = await fetch('/api/v1/auth/verify-security-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, operation_type: operationType })
  });
  return response.json();
};

// 3. Use token for password change
const changePassword = async (currentPassword: string, newPassword: string, operationToken: string) => {
  const response = await fetch('/api/v1/users/me/secure-change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      operation_token: operationToken
    })
  });
  return response.json();
};
```

### Python Integration

```python
import requests

class SecurityAPI:
    def __init__(self, base_url: str, access_token: str = None):
        self.base_url = base_url
        self.headers = {'Content-Type': 'application/json'}
        if access_token:
            self.headers['Authorization'] = f'Bearer {access_token}'
    
    def send_security_code(self, email: str, operation_type: str):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/send-security-code',
            json={'email': email, 'operation_type': operation_type},
            headers=self.headers
        )
        return response.json()
    
    def verify_security_code(self, email: str, code: str, operation_type: str):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/verify-security-code',
            json={'email': email, 'code': code, 'operation_type': operation_type},
            headers=self.headers
        )
        return response.json()
    
    def reset_password(self, new_password: str, operation_token: str):
        response = requests.post(
            f'{self.base_url}/api/v1/auth/reset-password',
            json={'new_password': new_password, 'operation_token': operation_token},
            headers=self.headers
        )
        return response.json()
```

---

## Testing

### Test Scenarios

1. **Happy Path**: Complete security flow from code sending to operation completion
2. **Rate Limiting**: Verify rate limits are enforced correctly
3. **Token Expiry**: Test that expired tokens are rejected
4. **Invalid Codes**: Verify invalid verification codes are rejected
5. **Cross-Operation**: Ensure tokens can't be used for different operations
6. **Email Enumeration**: Verify consistent responses for existing/non-existing emails

### Example Test (pytest)

```python
def test_password_change_flow(client, db, current_user):
    # 1. Send security code
    response = client.post('/api/v1/auth/send-security-code', json={
        'email': current_user.email,
        'operation_type': 'password_change'
    })
    assert response.status_code == 200
    
    # 2. Verify code (mock the code retrieval)
    response = client.post('/api/v1/auth/verify-security-code', json={
        'email': current_user.email,
        'code': '123456',  # Mock code
        'operation_type': 'password_change'
    })
    assert response.status_code == 200
    operation_token = response.json()['operation_token']
    
    # 3. Change password
    response = client.post('/api/v1/users/me/secure-change-password', 
        json={
            'current_password': 'OldPassword123!',
            'new_password': 'NewPassword456!',
            'operation_token': operation_token
        },
        headers={'Authorization': f'Bearer {access_token}'}
    )
    assert response.status_code == 200
```

---

## Migration Notes

### From Legacy System

If migrating from a legacy password reset system:

1. Update frontend to use the new multi-step flow
2. Replace direct password reset endpoints with the unified security flow
3. Update email templates to use the new verification code format
4. Test all security flows thoroughly before deploying

### Breaking Changes

- Operation tokens are required for all security operations
- Email verification is mandatory for password changes
- Rate limiting is more restrictive than previous implementations
- Response messages have changed for security reasons

---

## Changelog

### Version 1.0.0 (Current)
- Initial implementation of unified security operations
- JWT-based operation tokens with 10-minute expiry
- Comprehensive rate limiting and security protections
- Email enumeration protection
- Multi-step verification flows

---

## Support

For API support or questions:
- **Documentation**: [Full API Documentation](../README.md)
- **Security Issues**: Report security vulnerabilities through appropriate channels
- **Rate Limit Increases**: Contact support for higher rate limits if needed