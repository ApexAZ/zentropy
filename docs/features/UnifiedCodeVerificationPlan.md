# Unified Code Verification Implementation Plan

**Feature**: Unified email code verification system for all security operations  
**Created**: 2025-01-20  
**Status**: Planning  
**Estimated Timeline**: 4-6 weeks  
**Priority**: High (Security Enhancement)

## 📋 Overview

Implement a consistent email verification code system across all security-sensitive operations to improve user experience, security posture, and code maintainability.

### **Current State**
✅ Email verification during registration  
✅ EmailVerificationResendButton with excellent UX  
✅ Rate limiting infrastructure (`/api/rate_limiter.py`)  
✅ Backend verification endpoints (`/api/routers/auth.py`)  

### **Target State**
🎯 Unified verification flow for all security operations  
🎯 Consistent UX patterns across password changes, resets, and recovery  
🎯 Reusable components and backend infrastructure  
🎯 Enhanced security with multi-step verification  

---

## 🏗️ Implementation Phases

### **Phase 1: Backend Infrastructure Extension**
**Estimated Time**: 1 week  
**Risk Level**: Low  
**Dependencies**: None  

#### **Goals**
- Extend existing verification system to support multiple operation types
- Add secure operation tokens for multi-step flows
- Maintain backward compatibility with existing registration flow

#### **1.1 Database Schema Extension**

**File**: `/api/database.py`  
**Action**: Extend verification code model

```python
# Add to existing User model or create new table
class VerificationCode(Base):
    __tablename__ = "verification_codes"
    
    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # NEW FIELD
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_verification_codes_lookup', 'email', 'operation_type', 'used_at'),
    )
```

**Migration Required**: Create database migration for new fields

#### **1.2 Operation Type Enum**

**File**: `/api/schemas.py`  
**Action**: Define security operation types

```python
from enum import Enum

class SecurityOperationType(str, Enum):
    """Types of security operations requiring verification"""
    EMAIL_VERIFICATION = "email_verification"      # Existing - registration
    PASSWORD_RESET = "password_reset"              # NEW - forgot password
    PASSWORD_CHANGE = "password_change"            # NEW - change password while authenticated  
    USERNAME_RECOVERY = "username_recovery"        # NEW - forgot username
    EMAIL_CHANGE = "email_change"                  # FUTURE - change email address
    TWO_FACTOR_SETUP = "two_factor_setup"          # FUTURE - 2FA setup
```

#### **1.3 Enhanced Backend Endpoints**

**File**: `/api/routers/auth.py`  
**Action**: Extend existing verification endpoints

```python
# NEW: Unified security code sending
@router.post("/send-security-code")
async def send_security_code(
    request: SecurityCodeRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Send verification code for various security operations.
    Extends existing email verification to support multiple operation types.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.EMAIL)
    
    # Validate operation type and user context
    validate_operation_context(request.operation_type, current_user, request.email)
    
    # Generate and store code (reuse existing logic)
    code = generate_verification_code()
    store_verification_code(request.email, code, request.operation_type, db)
    
    # Send email (reuse existing email service)
    background_tasks.add_task(
        send_verification_email, 
        request.email, 
        code, 
        request.operation_type
    )
    
    return {"message": f"Verification code sent to {request.email}"}

# NEW: Unified code verification with operation tokens
@router.post("/verify-security-code")
async def verify_security_code(
    request: VerifySecurityCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Verify code and return operation token for secure multi-step flows.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
    
    # Verify code (reuse existing logic)
    is_valid = verify_code_for_operation(
        request.email, 
        request.code, 
        request.operation_type, 
        db
    )
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Generate secure operation token (short-lived, single-use)
    operation_token = generate_operation_token(request.email, request.operation_type)
    
    return {
        "operation_token": operation_token,
        "expires_in": 600  # 10 minutes
    }
```

#### **1.4 Pydantic Schemas**

**File**: `/api/schemas.py`  
**Action**: Add request/response schemas

```python
class SecurityCodeRequest(BaseModel):
    email: EmailStr
    operation_type: SecurityOperationType
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "operation_type": "password_change"
            }
        }

class VerifySecurityCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$")
    operation_type: SecurityOperationType

class OperationTokenResponse(BaseModel):
    operation_token: str
    expires_in: int
```

#### **1.5 Operation Token Security**

**File**: `/api/security.py` (new file)  
**Action**: Implement secure operation tokens

```python
import jwt
from datetime import datetime, timedelta
from typing import Optional

class OperationTokenManager:
    """Manages secure, short-lived tokens for multi-step security operations"""
    
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY")
        self.algorithm = "HS256"
        self.expiry_minutes = 10  # Short-lived tokens
    
    def generate_token(self, email: str, operation_type: str) -> str:
        """Generate a secure operation token"""
        payload = {
            "email": email,
            "operation_type": operation_type,
            "exp": datetime.utcnow() + timedelta(minutes=self.expiry_minutes),
            "iat": datetime.utcnow(),
            "jti": str(uuid.uuid4())  # Unique token ID
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, expected_operation: str) -> Optional[str]:
        """Verify operation token and return email if valid"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("operation_type") != expected_operation:
                return None
                
            return payload.get("email")
        except jwt.InvalidTokenError:
            return None

# Global instance
operation_token_manager = OperationTokenManager()
```

#### **Phase 1 Deliverables**
- [ ] Database migration for operation types
- [ ] Extended backend endpoints (`send-security-code`, `verify-security-code`)
- [ ] Operation token security system
- [ ] Pydantic schemas for new requests
- [ ] Unit tests for backend extension
- [ ] Backward compatibility verification

#### **Phase 1 Testing Requirements**
```python
# Test files to create/update:
# tests/routers/test_security_operations.py
# tests/security/test_operation_tokens.py
# tests/integration/test_unified_verification.py

# Key test scenarios:
- Send code for different operation types
- Verify code and receive operation token
- Token expiry and validation
- Rate limiting on new endpoints
- Backward compatibility with existing registration
```

---

### **Phase 2: Frontend Component Refactoring**
**Estimated Time**: 1 week  
**Risk Level**: Medium  
**Dependencies**: Phase 1 complete  

#### **Goals**
- Extract reusable verification components from existing EmailVerificationResendButton
- Create unified SecurityCodeFlow component
- Maintain existing functionality while enabling reuse

#### **2.1 Refactor EmailVerificationResendButton**

**File**: `/src/client/components/EmailVerificationResendButton.tsx`  
**Action**: Make operation-type aware

```typescript
// Enhanced to support multiple operation types
interface EmailVerificationResendButtonProps {
    userEmail: string;
    operationType?: SecurityOperationType;  // NEW: Support different operations
    onResendSuccess?: () => void;
}

const EmailVerificationResendButton: React.FC<EmailVerificationResendButtonProps> = ({
    userEmail,
    operationType = SecurityOperationType.EMAIL_VERIFICATION,  // Default to existing behavior
    onResendSuccess
}) => {
    // Update API call to use new unified endpoint
    const response = await AuthService.sendSecurityCode(userEmail, operationType);
    
    // Rest of component remains the same - excellent UX preserved
};
```

#### **2.2 Create Reusable SecurityCodeFlow Component**

**File**: `/src/client/components/SecurityCodeFlow.tsx` (new file)  
**Action**: Extract and generalize verification flow

```typescript
interface SecurityCodeFlowProps {
    userEmail: string;
    operationType: SecurityOperationType;
    onCodeVerified: (operationToken: string) => void;
    onCancel?: () => void;
    title?: string;
    description?: string;
}

export const SecurityCodeFlow: React.FC<SecurityCodeFlowProps> = ({
    userEmail,
    operationType,
    onCodeVerified,
    onCancel,
    title = "Verify Your Email",
    description = "Enter the verification code sent to your email"
}) => {
    const [code, setCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCodeSubmit = async () => {
        try {
            setIsVerifying(true);
            setError(null);
            
            const result = await AuthService.verifySecurityCode(userEmail, code, operationType);
            onCodeVerified(result.operation_token);
            
        } catch (err: any) {
            setError(err.message || "Invalid verification code");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Card>
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-secondary text-sm mt-1">{description}</p>
                    <p className="text-secondary text-sm">Code sent to: {userEmail}</p>
                </div>

                <div className="space-y-3">
                    <Input
                        id="verification-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        className="text-center text-lg tracking-widest"
                        autoComplete="one-time-code"
                    />
                    
                    {error && (
                        <p className="text-error text-sm">{error}</p>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <EmailVerificationResendButton 
                        userEmail={userEmail}
                        operationType={operationType}
                    />
                    
                    <div className="space-x-2">
                        {onCancel && (
                            <Button variant="secondary" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                        <Button 
                            onClick={handleCodeSubmit}
                            disabled={code.length !== 6 || isVerifying}
                            isLoading={isVerifying}
                        >
                            Verify Code
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};
```

#### **2.3 Update AuthService**

**File**: `/src/client/services/AuthService.ts`  
**Action**: Add unified verification methods

```typescript
// Add to existing AuthService class
class AuthService {
    // NEW: Unified security code sending
    static async sendSecurityCode(
        email: string, 
        operationType: SecurityOperationType
    ): Promise<{ message: string }> {
        const response = await fetch('/api/v1/auth/send-security-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, operation_type: operationType })
        });
        
        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }
        
        return response.json();
    }

    // NEW: Unified code verification
    static async verifySecurityCode(
        email: string,
        code: string,
        operationType: SecurityOperationType
    ): Promise<{ operation_token: string; expires_in: number }> {
        const response = await fetch('/api/v1/auth/verify-security-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, operation_type: operationType })
        });
        
        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }
        
        return response.json();
    }
    
    // Keep existing sendEmailVerification for backward compatibility
    static async sendEmailVerification(email: string) {
        return this.sendSecurityCode(email, SecurityOperationType.EMAIL_VERIFICATION);
    }
}
```

#### **2.4 Create TypeScript Types**

**File**: `/src/client/types/security.ts` (new file)  
**Action**: Define frontend types

```typescript
export enum SecurityOperationType {
    EMAIL_VERIFICATION = "email_verification",
    PASSWORD_RESET = "password_reset", 
    PASSWORD_CHANGE = "password_change",
    USERNAME_RECOVERY = "username_recovery"
}

export interface SecurityCodeFlowStep {
    step: 'input' | 'verification' | 'complete';
    data?: any;
}

export interface OperationTokenResponse {
    operation_token: string;
    expires_in: number;
}
```

#### **Phase 2 Deliverables**
- [ ] Refactored EmailVerificationResendButton with operation type support
- [ ] New SecurityCodeFlow reusable component
- [ ] Extended AuthService with unified methods
- [ ] TypeScript types for security operations
- [ ] Storybook stories for new components
- [ ] Unit tests for frontend components

#### **Phase 2 Testing Requirements**
```typescript
// Test files to create/update:
// src/client/components/__tests__/SecurityCodeFlow.test.tsx
// src/client/components/__tests__/EmailVerificationResendButton.test.tsx (updated)
// src/client/services/__tests__/AuthService.test.ts (updated)

// Key test scenarios:
- SecurityCodeFlow with different operation types
- Code input validation and formatting
- Error handling and display
- Resend button functionality with new operation types
- Backward compatibility with existing email verification
```

---

### **Phase 3: Password Change Implementation**
**Estimated Time**: 1 week  
**Risk Level**: Medium  
**Dependencies**: Phases 1-2 complete  

#### **Goals**
- Implement secure password change flow with email verification
- Add to existing Profile page
- Maintain current password requirement + add email verification

#### **3.1 Backend Password Change Endpoint**

**File**: `/api/routers/users.py`  
**Action**: Add secure password change endpoint

```python
# NEW: Secure password change with verification
@router.post("/me/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password with current password + email verification.
    Requires operation token from verified security code.
    """
    # Apply rate limiting (currently missing!)
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
    
    # Verify operation token
    email = operation_token_manager.verify_token(
        request.operation_token, 
        SecurityOperationType.PASSWORD_CHANGE
    )
    
    if not email or email.lower() != current_user.email.lower():
        raise HTTPException(status_code=400, detail="Invalid operation token")
    
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password strength
    validate_password_strength(request.new_password)
    
    # Update password
    new_password_hash = hash_password(request.new_password)
    current_user.password_hash = new_password_hash
    current_user.password_changed_at = datetime.utcnow()
    
    db.commit()
    
    # Log security event
    logger.info(f"Password changed for user {current_user.id}")
    
    return {"message": "Password changed successfully"}

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    operation_token: str = Field(..., min_length=1)
```

#### **3.2 Frontend Password Change Component**

**File**: `/src/client/components/PasswordChangeForm.tsx` (new file)  
**Action**: Create multi-step password change form

```typescript
interface PasswordChangeFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
    onSuccess,
    onCancel
}) => {
    const [step, setStep] = useState<'password' | 'verification' | 'complete'>('password');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [operationToken, setOperationToken] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { user } = useAuth();

    const handlePasswordSubmit = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                setError("New passwords don't match");
                return;
            }
            
            // Send verification code
            await AuthService.sendSecurityCode(user.email, SecurityOperationType.PASSWORD_CHANGE);
            setStep('verification');
            
        } catch (err: any) {
            setError(err.message || "Failed to send verification code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeVerified = (token: string) => {
        setOperationToken(token);
        setStep('complete');
    };

    const handlePasswordChange = async () => {
        try {
            setIsLoading(true);
            
            await AuthService.changePassword(currentPassword, newPassword, operationToken!);
            onSuccess?.();
            
        } catch (err: any) {
            setError(err.message || "Failed to change password");
            // If token expired, go back to verification
            if (err.message?.includes('token')) {
                setStep('verification');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'verification') {
        return (
            <SecurityCodeFlow
                userEmail={user.email}
                operationType={SecurityOperationType.PASSWORD_CHANGE}
                onCodeVerified={handleCodeVerified}
                onCancel={() => setStep('password')}
                title="Verify Password Change"
                description="To change your password, please verify your email address"
            />
        );
    }

    if (step === 'complete') {
        return (
            <Card>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Complete Password Change</h3>
                    
                    <div className="space-y-3">
                        <Input
                            type="password"
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                        
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        
                        <Input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>
                    
                    {error && <p className="text-error text-sm">{error}</p>}
                    
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handlePasswordChange}
                            disabled={!currentPassword || !newPassword || !confirmPassword || isLoading}
                            isLoading={isLoading}
                        >
                            Change Password
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    // Step 1: Password input
    return (
        <Card>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Change Password</h3>
                <p className="text-secondary text-sm">
                    Enter your new password. You'll need to verify your email address to complete the change.
                </p>
                
                <div className="space-y-3">
                    <Input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    
                    <Input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    
                    <PasswordRequirements password={newPassword} />
                </div>
                
                {error && <p className="text-error text-sm">{error}</p>}
                
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handlePasswordSubmit}
                        disabled={!newPassword || !confirmPassword || isLoading}
                        isLoading={isLoading}
                    >
                        Send Verification Code
                    </Button>
                </div>
            </div>
        </Card>
    );
};
```

#### **3.3 Update ProfilePage**

**File**: `/src/client/pages/ProfilePage.tsx`  
**Action**: Integrate new password change component

```typescript
// Add to existing ProfilePage security tab
const SecurityTab = () => {
    const [showPasswordChange, setShowPasswordChange] = useState(false);

    return (
        <div className="space-y-6">
            {/* Existing account security section */}
            <AccountSecuritySection 
                onSecurityUpdate={handleSecurityUpdate}
                onError={handleError}
            />
            
            {/* NEW: Password Management Section */}
            <Card title="Password Management">
                {!showPasswordChange ? (
                    <div className="space-y-4">
                        <p className="text-secondary">
                            Change your password to keep your account secure. 
                            You'll need to verify your email address to complete the change.
                        </p>
                        <Button onClick={() => setShowPasswordChange(true)}>
                            Change Password
                        </Button>
                    </div>
                ) : (
                    <PasswordChangeForm
                        onSuccess={() => {
                            setShowPasswordChange(false);
                            showSuccess("Password changed successfully!");
                        }}
                        onCancel={() => setShowPasswordChange(false)}
                    />
                )}
            </Card>
        </div>
    );
};
```

#### **3.4 Update UserService**

**File**: `/src/client/services/UserService.ts`  
**Action**: Add password change method

```typescript
// Add to existing UserService class
class UserService {
    static async changePassword(
        currentPassword: string,
        newPassword: string,
        operationToken: string
    ): Promise<{ message: string }> {
        const response = await fetch('/api/v1/users/me/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                operation_token: operationToken
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to change password');
        }
        
        return response.json();
    }
}
```

#### **Phase 3 Deliverables**
- [ ] Backend password change endpoint with rate limiting
- [ ] PasswordChangeForm component with multi-step flow
- [ ] Integration with ProfilePage
- [ ] UserService password change method
- [ ] Form validation and error handling
- [ ] Success/failure user feedback

#### **Phase 3 Testing Requirements**
```typescript
// Test files to create/update:
// tests/routers/test_password_change.py
// src/client/components/__tests__/PasswordChangeForm.test.tsx
// src/client/pages/__tests__/ProfilePage.test.tsx (updated)
// src/client/services/__tests__/UserService.test.ts (updated)

// Key test scenarios:
- Complete password change flow (3 steps)
- Current password validation
- New password strength requirements
- Operation token validation and expiry
- Rate limiting on password change endpoint
- Error handling at each step
```

---

### **Phase 4: Forgot Password Implementation**
**Estimated Time**: 1 week  
**Risk Level**: Low  
**Dependencies**: Phases 1-2 complete  

#### **Goals**
- Implement secure password reset flow for unauthenticated users
- Add "Forgot Password" link to AuthModal
- Reuse SecurityCodeFlow component

#### **4.1 Backend Password Reset Endpoints**

**File**: `/api/routers/auth.py`  
**Action**: Add password reset endpoint

```python
# NEW: Password reset endpoint
@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using operation token from email verification.
    For unauthenticated users who forgot their password.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
    
    # Verify operation token
    email = operation_token_manager.verify_token(
        request.operation_token,
        SecurityOperationType.PASSWORD_RESET
    )
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Find user by email
    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        # Don't reveal if email exists, return success anyway for security
        return {"message": "If the email exists, the password has been reset"}
    
    # Validate new password strength
    validate_password_strength(request.new_password)
    
    # Update password
    user.password_hash = hash_password(request.new_password)
    user.password_changed_at = datetime.utcnow()
    
    # Invalidate all existing sessions for security
    user.session_invalidated_at = datetime.utcnow()
    
    db.commit()
    
    # Log security event
    logger.info(f"Password reset completed for user {user.id}")
    
    return {"message": "Password reset successfully"}

class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)
    operation_token: str = Field(..., min_length=1)
```

#### **4.2 Frontend Forgot Password Flow**

**File**: `/src/client/components/ForgotPasswordFlow.tsx` (new file)  
**Action**: Create password reset component

```typescript
interface ForgotPasswordFlowProps {
    onComplete?: () => void;
    onCancel?: () => void;
}

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({
    onComplete,
    onCancel
}) => {
    const [step, setStep] = useState<'email' | 'verification' | 'password' | 'complete'>('email');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [operationToken, setOperationToken] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailSubmit = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Validate email format
            if (!AuthService.validateEmail(email)) {
                setError("Please enter a valid email address");
                return;
            }
            
            // Send reset code
            await AuthService.sendSecurityCode(email, SecurityOperationType.PASSWORD_RESET);
            setStep('verification');
            
        } catch (err: any) {
            // Don't reveal if email exists for security
            setStep('verification');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeVerified = (token: string) => {
        setOperationToken(token);
        setStep('password');
    };

    const handlePasswordReset = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                setError("Passwords don't match");
                return;
            }
            
            await AuthService.resetPassword(newPassword, operationToken!);
            setStep('complete');
            
        } catch (err: any) {
            setError(err.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'verification') {
        return (
            <SecurityCodeFlow
                userEmail={email}
                operationType={SecurityOperationType.PASSWORD_RESET}
                onCodeVerified={handleCodeVerified}
                onCancel={() => setStep('email')}
                title="Check Your Email"
                description="Enter the reset code sent to your email address"
            />
        );
    }

    if (step === 'password') {
        return (
            <Card>
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Set New Password</h3>
                    <p className="text-secondary text-sm">
                        Enter your new password for {email}
                    </p>
                    
                    <div className="space-y-3">
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        
                        <Input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                        
                        <PasswordRequirements password={newPassword} />
                    </div>
                    
                    {error && <p className="text-error text-sm">{error}</p>}
                    
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setStep('verification')}>
                            Back
                        </Button>
                        <Button 
                            onClick={handlePasswordReset}
                            disabled={!newPassword || !confirmPassword || isLoading}
                            isLoading={isLoading}
                        >
                            Reset Password
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    if (step === 'complete') {
        return (
            <Card>
                <div className="text-center space-y-4">
                    <div className="text-success text-4xl">✓</div>
                    <h3 className="text-lg font-semibold">Password Reset Complete</h3>
                    <p className="text-secondary">
                        Your password has been reset successfully. You can now sign in with your new password.
                    </p>
                    <Button onClick={onComplete}>
                        Continue to Sign In
                    </Button>
                </div>
            </Card>
        );
    }

    // Step 1: Email input
    return (
        <Card>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Reset Your Password</h3>
                <p className="text-secondary text-sm">
                    Enter your email address and we'll send you a code to reset your password.
                </p>
                
                <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
                
                {error && <p className="text-error text-sm">{error}</p>}
                
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleEmailSubmit}
                        disabled={!email || isLoading}
                        isLoading={isLoading}
                    >
                        Send Reset Code
                    </Button>
                </div>
            </div>
        </Card>
    );
};
```

#### **4.3 Update AuthModal**

**File**: `/src/client/components/AuthModal.tsx`  
**Action**: Add forgot password link and flow

```typescript
// Add to existing AuthModal component
const AuthModal = ({ isOpen, onClose, onSuccess, auth }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');

    // Add forgot password handling
    const handleForgotPasswordComplete = () => {
        setMode('signin');
        // Could show success toast here
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <Card>
                {mode === 'forgot-password' ? (
                    <ForgotPasswordFlow
                        onComplete={handleForgotPasswordComplete}
                        onCancel={() => setMode('signin')}
                    />
                ) : (
                    <div>
                        {/* Existing sign in/up forms */}
                        
                        {mode === 'signin' && (
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    className="text-interactive hover:text-interactive-hover text-sm"
                                >
                                    Forgot your password?
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </Modal>
    );
};
```

#### **4.4 Update AuthService**

**File**: `/src/client/services/AuthService.ts`  
**Action**: Add password reset method

```typescript
// Add to existing AuthService class
class AuthService {
    static async resetPassword(
        newPassword: string,
        operationToken: string
    ): Promise<{ message: string }> {
        const response = await fetch('/api/v1/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_password: newPassword,
                operation_token: operationToken
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reset password');
        }
        
        return response.json();
    }
}
```

#### **Phase 4 Deliverables**
- [ ] Backend password reset endpoint
- [ ] ForgotPasswordFlow component
- [ ] AuthModal integration with forgot password link
- [ ] AuthService reset password method
- [ ] Multi-step password reset flow
- [ ] Success confirmation and redirect

#### **Phase 4 Testing Requirements**
```typescript
// Test files to create/update:
// tests/routers/test_password_reset.py
// src/client/components/__tests__/ForgotPasswordFlow.test.tsx
// src/client/components/__tests__/AuthModal.test.tsx (updated)

// Key test scenarios:
- Complete password reset flow (4 steps)
- Email validation and submission
- Code verification reuse
- New password validation
- Token expiry handling
- Security: Don't reveal if email exists
```

---

### **Phase 5: Username Recovery Implementation**
**Estimated Time**: 0.5 weeks  
**Risk Level**: Low  
**Dependencies**: Phases 1-2 complete  

#### **Goals**
- Implement username recovery for users who forgot their username
- Add "Forgot Username" link to AuthModal
- Simple flow to send username to verified email

#### **5.1 Backend Username Recovery Endpoint**

**File**: `/api/routers/auth.py`  
**Action**: Add username recovery endpoint

```python
# NEW: Username recovery endpoint
@router.post("/recover-username")
async def recover_username(
    request: RecoverUsernameRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Send username to user's email after verification.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_rate_limit(client_ip, RateLimitType.AUTH)
    
    # Verify operation token
    email = operation_token_manager.verify_token(
        request.operation_token,
        SecurityOperationType.USERNAME_RECOVERY
    )
    
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Find user by email
    user = db.query(User).filter(User.email.ilike(email)).first()
    
    if user:
        # Send username via email
        background_tasks.add_task(
            send_username_recovery_email,
            user.email,
            user.first_name,
            user.email  # Username is email in this system
        )
    
    # Always return success for security (don't reveal if email exists)
    return {"message": "If the email exists, the username has been sent"}

class RecoverUsernameRequest(BaseModel):
    operation_token: str = Field(..., min_length=1)
```

#### **5.2 Frontend Username Recovery Flow**

**File**: `/src/client/components/UsernameRecoveryFlow.tsx` (new file)  
**Action**: Create simple username recovery component

```typescript
interface UsernameRecoveryFlowProps {
    onComplete?: () => void;
    onCancel?: () => void;
}

export const UsernameRecoveryFlow: React.FC<UsernameRecoveryFlowProps> = ({
    onComplete,
    onCancel
}) => {
    const [step, setStep] = useState<'email' | 'verification' | 'complete'>('email');
    const [email, setEmail] = useState('');
    const [operationToken, setOperationToken] = useState<string>();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailSubmit = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Validate email format
            if (!AuthService.validateEmail(email)) {
                setError("Please enter a valid email address");
                return;
            }
            
            // Send verification code
            await AuthService.sendSecurityCode(email, SecurityOperationType.USERNAME_RECOVERY);
            setStep('verification');
            
        } catch (err: any) {
            // Don't reveal if email exists for security
            setStep('verification');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeVerified = async (token: string) => {
        try {
            setOperationToken(token);
            
            // Automatically recover username after verification
            await AuthService.recoverUsername(token);
            setStep('complete');
            
        } catch (err: any) {
            setError(err.message || "Failed to recover username");
        }
    };

    if (step === 'verification') {
        return (
            <SecurityCodeFlow
                userEmail={email}
                operationType={SecurityOperationType.USERNAME_RECOVERY}
                onCodeVerified={handleCodeVerified}
                onCancel={() => setStep('email')}
                title="Verify Your Email"
                description="Enter the code sent to your email to recover your username"
            />
        );
    }

    if (step === 'complete') {
        return (
            <Card>
                <div className="text-center space-y-4">
                    <div className="text-success text-4xl">✓</div>
                    <h3 className="text-lg font-semibold">Username Sent</h3>
                    <p className="text-secondary">
                        Your username has been sent to {email}. Check your email and then try signing in.
                    </p>
                    <Button onClick={onComplete}>
                        Continue to Sign In
                    </Button>
                </div>
            </Card>
        );
    }

    // Step 1: Email input
    return (
        <Card>
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recover Your Username</h3>
                <p className="text-secondary text-sm">
                    Enter your email address and we'll send your username to you.
                </p>
                
                <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                />
                
                {error && <p className="text-error text-sm">{error}</p>}
                
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleEmailSubmit}
                        disabled={!email || isLoading}
                        isLoading={isLoading}
                    >
                        Send Username
                    </Button>
                </div>
            </div>
        </Card>
    );
};
```

#### **5.3 Update AuthModal for Username Recovery**

**File**: `/src/client/components/AuthModal.tsx`  
**Action**: Add username recovery option

```typescript
// Add to existing AuthModal component
const AuthModal = ({ isOpen, onClose, onSuccess, auth }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password' | 'forgot-username'>('signin');

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <Card>
                {mode === 'forgot-username' ? (
                    <UsernameRecoveryFlow
                        onComplete={() => setMode('signin')}
                        onCancel={() => setMode('signin')}
                    />
                ) : mode === 'forgot-password' ? (
                    <ForgotPasswordFlow
                        onComplete={() => setMode('signin')}
                        onCancel={() => setMode('signin')}
                    />
                ) : (
                    <div>
                        {/* Existing sign in/up forms */}
                        
                        {mode === 'signin' && (
                            <div className="mt-4 text-center space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    className="text-interactive hover:text-interactive-hover text-sm block w-full"
                                >
                                    Forgot your password?
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-username')}
                                    className="text-interactive hover:text-interactive-hover text-sm block w-full"
                                >
                                    Forgot your username?
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </Modal>
    );
};
```

#### **Phase 5 Deliverables**
- [ ] Backend username recovery endpoint
- [ ] UsernameRecoveryFlow component
- [ ] AuthModal integration
- [ ] Email template for username recovery
- [ ] AuthService recovery method

#### **Phase 5 Testing Requirements**
```typescript
// Test files to create:
// tests/routers/test_username_recovery.py
// src/client/components/__tests__/UsernameRecoveryFlow.test.tsx

// Key test scenarios:
- Complete username recovery flow
- Email validation
- Code verification
- Username email sending
- Security: Don't reveal if email exists
```

---

### **Phase 6: Testing & Optimization**
**Estimated Time**: 1 week  
**Risk Level**: Low  
**Dependencies**: All previous phases  

#### **Goals**
- Comprehensive testing of unified system
- Performance optimization
- Security audit
- Documentation updates

#### **6.1 Integration Testing**

**File**: `/tests/integration/test_unified_verification.py` (new file)

```python
class TestUnifiedVerificationIntegration:
    """Test complete flows across all security operations"""
    
    def test_password_change_complete_flow(self, client, db, auto_clean_mailpit):
        """Test complete authenticated password change flow"""
        # 1. Register and login user
        # 2. Send security code for password change
        # 3. Verify code and get operation token
        # 4. Change password with token
        # 5. Verify old password no longer works
        # 6. Verify new password works
        
    def test_password_reset_complete_flow(self, client, db, auto_clean_mailpit):
        """Test complete unauthenticated password reset flow"""
        # 1. Register user
        # 2. Send security code for password reset
        # 3. Verify code and get operation token  
        # 4. Reset password with token
        # 5. Verify old password no longer works
        # 6. Verify new password works
        
    def test_username_recovery_complete_flow(self, client, db, auto_clean_mailpit):
        """Test complete username recovery flow"""
        # 1. Register user
        # 2. Send security code for username recovery
        # 3. Verify code and get operation token
        # 4. Recover username
        # 5. Verify email was sent
        
    def test_rate_limiting_across_operations(self, client, test_rate_limits):
        """Test that rate limiting works correctly across different operations"""
        # Test each operation type respects its rate limits
        # Test IP-based vs user-based rate limiting
        
    def test_operation_token_security(self, client, db):
        """Test operation token security and expiry"""
        # Test token expiry
        # Test token reuse prevention
        # Test cross-operation token usage
```

#### **6.2 Frontend End-to-End Testing**

**File**: `/src/client/__tests__/integration/unified-verification.test.tsx` (new file)

```typescript
describe('Unified Verification System Integration', () => {
    beforeEach(() => {
        // Setup test environment with mocked backends
        setupMockBackend();
    });

    it('should complete password change flow with verification', async () => {
        // 1. Render authenticated app
        // 2. Navigate to password change
        // 3. Enter new password
        // 4. Verify email code entry
        // 5. Complete password change
        // 6. Verify success message
    });

    it('should complete forgot password flow', async () => {
        // 1. Render auth modal
        // 2. Click forgot password
        // 3. Enter email
        // 4. Enter verification code
        // 5. Set new password
        // 6. Verify success and redirect to login
    });

    it('should handle rate limiting gracefully', async () => {
        // 1. Trigger rate limit on security code sending
        // 2. Verify countdown timer appears
        // 3. Verify button disabled during cooldown
        // 4. Verify automatic re-enabling
    });
});
```

#### **6.3 Performance Optimization**

**Database Optimization**:
```sql
-- Add indexes for efficient verification code lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_codes_active 
ON verification_codes (email, operation_type, used_at) 
WHERE used_at IS NULL;

-- Add index for cleanup queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_codes_cleanup 
ON verification_codes (expires_at) 
WHERE used_at IS NULL;
```

**Backend Optimization**:
```python
# Add cleanup task for expired verification codes
@router.on_event("startup")
async def setup_cleanup_task():
    """Setup periodic cleanup of expired verification codes"""
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        cleanup_expired_verification_codes,
        'interval',
        hours=1,
        id='cleanup_verification_codes'
    )
    scheduler.start()

async def cleanup_expired_verification_codes():
    """Remove expired verification codes to keep database clean"""
    with SessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        db.query(VerificationCode).filter(
            VerificationCode.expires_at < cutoff
        ).delete()
        db.commit()
```

**Frontend Optimization**:
```typescript
// Lazy load security components to reduce bundle size
const SecurityCodeFlow = lazy(() => import('./SecurityCodeFlow'));
const PasswordChangeForm = lazy(() => import('./PasswordChangeForm'));
const ForgotPasswordFlow = lazy(() => import('./ForgotPasswordFlow'));

// Add component memoization to prevent unnecessary re-renders
export const SecurityCodeFlow = memo(SecurityCodeFlowComponent);
```

#### **6.4 Security Audit**

**Security Checklist**:
- [ ] Operation tokens are properly signed and time-limited
- [ ] Rate limiting applied to all security endpoints
- [ ] Email enumeration attacks prevented
- [ ] CSRF protection on all endpoints
- [ ] Input validation on all parameters
- [ ] Proper error handling without information leakage
- [ ] Session invalidation on password changes
- [ ] Audit logging for all security operations

#### **6.5 Documentation Updates**

**File**: `/docs/api/security-operations.md` (new file)

```markdown
# Security Operations API

## Overview
Unified email verification system for security-sensitive operations.

## Endpoints

### POST /api/v1/auth/send-security-code
Send verification code for security operations.

**Rate Limit**: 3 requests per 5 minutes (EMAIL type)

**Request Body**:
```json
{
  "email": "user@example.com",
  "operation_type": "password_change"
}
```

### POST /api/v1/auth/verify-security-code
Verify code and receive operation token.

**Rate Limit**: 5 requests per 15 minutes (AUTH type)

## Operation Types
- `email_verification`: Account registration
- `password_change`: Change password (authenticated)
- `password_reset`: Reset password (unauthenticated)
- `username_recovery`: Recover forgotten username

## Security Considerations
- Operation tokens expire in 10 minutes
- Tokens are single-use only
- Rate limiting prevents abuse
- Email enumeration attacks prevented
```

#### **Phase 6 Deliverables**
- [ ] Comprehensive integration tests
- [ ] Frontend E2E tests
- [ ] Performance optimizations
- [ ] Security audit completion
- [ ] API documentation
- [ ] User guide documentation
- [ ] Migration guide for existing users

---

## 📊 Progress Tracking

### **Overall Status**: Not Started

| Phase | Status | Start Date | End Date | Assignee | Notes |
|-------|--------|------------|----------|----------|--------|
| 1. Backend Infrastructure | ⏳ Not Started | | | | Database schema ready to implement |
| 2. Frontend Refactoring | ⏳ Not Started | | | | EmailVerificationResendButton pattern identified |
| 3. Password Change | ⏳ Not Started | | | | Security gap - needs immediate attention |
| 4. Forgot Password | ⏳ Not Started | | | | |
| 5. Username Recovery | ⏳ Not Started | | | | |
| 6. Testing & Optimization | ⏳ Not Started | | | | |

### **Key Milestones**

- [ ] **Security Gap Fixed**: Password changes require rate limiting + verification
- [ ] **Backend Infrastructure**: Unified verification system working
- [ ] **Component Reusability**: SecurityCodeFlow component reusable across flows
- [ ] **User Experience**: Consistent verification UX across all security operations
- [ ] **Security Hardening**: Operation tokens and proper rate limiting implemented
- [ ] **Testing Complete**: Full test coverage for all flows
- [ ] **Documentation**: Complete API and user documentation

### **Risks & Mitigation**

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing email verification | High | Low | Maintain backward compatibility in Phase 1 |
| User confusion with new flows | Medium | Medium | Consistent UX patterns, clear messaging |
| Security vulnerabilities | High | Low | Security audit in Phase 6, code review |
| Performance impact | Medium | Low | Database optimization, lazy loading |

### **Dependencies**

- **External**: None
- **Internal**: Existing rate limiting system, email verification infrastructure
- **Database**: Migration required for operation types
- **Frontend**: Component refactoring required

---

## 🔧 Developer Resources

### **Key Files to Reference**

**Existing Implementation (Study These)**:
- `/api/rate_limiter.py` - Rate limiting system
- `/api/routers/auth.py` - Email verification endpoints  
- `/src/client/components/EmailVerificationResendButton.tsx` - Perfect UX pattern
- `/src/client/services/AuthService.ts` - API integration pattern

**Files to Create/Modify**:
- `/api/database.py` - Add operation types to verification codes
- `/api/security.py` - Operation token management
- `/src/client/components/SecurityCodeFlow.tsx` - Reusable verification component
- `/src/client/components/PasswordChangeForm.tsx` - Password change with verification

### **Testing Strategy**

**Backend Testing**:
```bash
# Run security operation tests
pytest tests/routers/test_security_operations.py -v

# Run integration tests
pytest tests/integration/test_unified_verification.py -v

# Run with rate limiting
pytest tests/ -k "rate_limit" -v
```

**Frontend Testing**:
```bash
# Run component tests
npm test -- SecurityCodeFlow.test.tsx

# Run integration tests
npm test -- unified-verification.test.tsx

# Run with rate limiting scenarios
npm test -- --testNamePattern="rate.limit"
```

### **Configuration Required**

**Environment Variables**:
```bash
# Operation token security
SECRET_KEY=your-secret-key-here

# Rate limiting (existing)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_AUTH_REQUESTS=5
RATE_LIMIT_EMAIL_REQUESTS=3

# Email service (existing)
EMAIL_SERVICE_ENABLED=true
```

### **Rollback Plan**

If issues arise during implementation:

1. **Phase 1**: Database migration can be rolled back
2. **Phase 2**: Components are additive, can disable new flows
3. **Phase 3+**: Feature flags can disable new endpoints
4. **Emergency**: Revert to existing email verification only

### **Success Metrics**

- [ ] **Security**: Password changes require verification (closes security gap)
- [ ] **UX**: Consistent verification flow across all security operations
- [ ] **Performance**: No degradation in existing flows
- [ ] **Adoption**: New flows successfully handle user recovery scenarios
- [ ] **Maintainability**: Code reuse across verification components

---

## 📞 Support & Questions

For implementation questions or clarifications:

1. **Architecture Questions**: Review existing `/api/rate_limiter.py` implementation
2. **UX Questions**: Study `EmailVerificationResendButton.tsx` pattern
3. **Security Questions**: Consult OWASP guidelines and existing auth patterns
4. **Testing Questions**: Follow existing test patterns in `/tests/` directory

**Contact**: Development team for clarifications on specific implementation details.