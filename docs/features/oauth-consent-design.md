# OAuth Consent Flow Architecture Design

**Created:** 2025-07-28  
**Status:** Design Phase  
**Priority:** High

## 🎯 **Problem Statement**

The current OAuth system automatically links OAuth providers to existing email-based accounts without explicit user consent. This occurs in `api/oauth_base.py:_handle_existing_user()` lines 35-47 where the system:

1. Detects existing user with same email
2. **Automatically** sets OAuth provider ID and changes auth to HYBRID
3. Returns "account_linked" without user approval

## 🏗️ **Current Architecture Analysis**

### **Automatic Linking Logic (PROBLEM)**
```python
# api/oauth_base.py:_handle_existing_user()
else:
    # Auto-link OAuth to existing LOCAL account (industry standard)
    # This provides seamless UX while maintaining security since OAuth
    # provider has already verified email ownership
    existing_user.last_login_at = datetime.now(timezone.utc)
    setattr(existing_user, config.user_id_field, provider_user_id)
    existing_user.auth_provider = AuthProvider.HYBRID  # Support both methods
    db.commit()
    return existing_user, "account_linked"
```

### **Identified Touchpoints**
- **Backend Core**: `api/oauth_base.py` (`_handle_existing_user`, `get_or_create_oauth_user`)
- **Backend Routes**: `api/routers/auth.py` (`/auth/oauth`), `api/routers/users.py` (`/me/link-oauth`)
- **Frontend Components**: `SignInMethods.tsx`, `useMultiProviderOAuth.ts`
- **Frontend Services**: `OAuthProviderService.ts`

## 🎨 **Proposed Consent Flow Architecture**

### **Design Principles**
1. **Explicit Consent** - User must explicitly approve account linking
2. **Backward Compatibility** - All existing functionality preserved
3. **Security First** - Enhanced security with audit trail
4. **Zero Technical Debt** - Clean implementation, obsolete code removed
5. **Progressive Enhancement** - Feature flag controlled rollout

### **New User Flow**

```
Current Auto-Link Flow:
OAuth Sign-In → Detect Existing Account → AUTO-LINK → Success

New Consent Flow:
OAuth Sign-In → Detect Existing Account → Consent Modal → User Decision
                                                        ↓
                        Link Accounts ←←←←←←←←←←←←←←←←←←
                        Create Separate Account ←←←←←←←
```

### **Detailed Flow Design**

#### **Phase 1: Account Detection & Consent Request**
1. User initiates OAuth sign-in
2. System detects existing account with same email
3. **NEW**: Instead of auto-linking, return `consent_required` status
4. Frontend presents consent modal with clear information

#### **Phase 2: User Consent Decision**
**Option A: Link Accounts (Consent Given)**
- User explicitly approves account linking
- System proceeds with current linking logic
- Audit trail records consent decision
- Return `account_linked` with consent timestamp

**Option B: Create Separate Account (Consent Denied)**
- User chooses to keep accounts separate
- Handle email conflict (suggest different email/username)
- Create new isolated account
- Return `account_created` with separation flag

#### **Phase 3: Audit & Security Enhancement**
- All consent decisions logged with timestamp, IP, user agent
- Enhanced security validations
- Rate limiting for consent requests
- Revocation capabilities for linked accounts

## 🛠️ **Implementation Architecture**

### **Database Schema Changes**

#### **New Table: oauth_consent_log**
```sql
CREATE TABLE oauth_consent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    client_ip INET,
    user_agent TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE NULL,
    INDEX idx_oauth_consent_user_provider (user_id, provider),
    INDEX idx_oauth_consent_email (email),
    INDEX idx_oauth_consent_timestamp (consent_timestamp)
);
```

#### **Enhanced User Model**
```python
# Add consent tracking fields
class User(Base):
    # ... existing fields ...
    oauth_consent_given: Mapped[Dict[str, bool]] = mapped_column(JSON, default=dict)
    oauth_consent_timestamps: Mapped[Dict[str, datetime]] = mapped_column(JSON, default=dict)
```

### **Backend Implementation**

#### **Modified oauth_base.py**
```python
class ConsentRequiredResponse:
    """Response when OAuth consent is required."""
    action: str = "consent_required"
    provider: str
    existing_email: str
    provider_display_name: str
    security_context: Dict[str, Any]

def _handle_existing_user_with_consent(
    db: Session,
    existing_user: User,
    config: OAuthProviderConfig,
    provider_user_id: str,
    user_info: Mapping[str, Any],
    consent_given: Optional[bool] = None
) -> Union[Tuple[User, str], ConsentRequiredResponse]:
    """Enhanced user handling with explicit consent requirement."""
    
    # Check if consent is required
    if existing_user.auth_provider not in [config.auth_provider_enum, AuthProvider.HYBRID]:
        if consent_given is None:
            # Return consent requirement instead of auto-linking
            return ConsentRequiredResponse(
                provider=config.name,
                existing_email=existing_user.email,
                provider_display_name=config.display_name,
                security_context={
                    "existing_auth_method": existing_user.auth_provider.value,
                    "provider_email_verified": user_info.get("email_verified", True)
                }
            )
        elif consent_given:
            # User explicitly consented - proceed with linking
            return _link_oauth_with_consent(db, existing_user, config, provider_user_id, user_info)
        else:
            # User denied consent - handle account separation
            return _handle_consent_denied(db, config, user_info)
    
    # Existing logic for same-provider sign-ins
    return _handle_same_provider_signin(db, existing_user, config, provider_user_id)
```

#### **New Consent Management Service**
```python
class OAuthConsentService:
    """Service for managing OAuth consent decisions and audit trail."""
    
    @staticmethod
    def record_consent_decision(
        db: Session,
        user: User,
        provider: str,
        provider_user_id: str,
        consent_given: bool,
        client_ip: str,
        user_agent: str
    ) -> None:
        """Record consent decision with full audit trail."""
        
    @staticmethod
    def check_existing_consent(
        db: Session,
        email: str,
        provider: str
    ) -> Optional[bool]:
        """Check if user has previously given consent for this provider."""
        
    @staticmethod
    def revoke_oauth_consent(
        db: Session,
        user: User,
        provider: str
    ) -> None:
        """Revoke previously given OAuth consent."""
```

### **Frontend Implementation**

#### **New Consent Modal Component**
```typescript
interface OAuthConsentModalProps {
    isOpen: boolean;
    provider: string;
    providerDisplayName: string;
    existingEmail: string;
    securityContext: {
        existing_auth_method: string;
        provider_email_verified: boolean;
    };
    onConsent: (decision: 'link' | 'separate') => void;
    onCancel: () => void;
}

export function OAuthConsentModal({ 
    isOpen, 
    provider, 
    providerDisplayName,
    existingEmail,
    securityContext,
    onConsent,
    onCancel 
}: OAuthConsentModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onCancel}>
            <div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
                <h2 className="font-heading-medium text-text-contrast mb-4">
                    Link {providerDisplayName} Account?
                </h2>
                
                <div className="space-y-4 mb-6">
                    <p className="font-body text-text-primary">
                        We found an existing account with the email <strong>{existingEmail}</strong>.
                    </p>
                    
                    <div className="border-layout-background bg-content-background rounded border p-4">
                        <h3 className="font-interface font-medium text-text-contrast mb-2">
                            You can:
                        </h3>
                        <ul className="space-y-2 font-interface text-text-primary">
                            <li>• <strong>Link accounts</strong> - Use both password and {providerDisplayName} to sign in</li>
                            <li>• <strong>Create separate account</strong> - Keep {providerDisplayName} account isolated</li>
                        </ul>
                    </div>
                    
                    <div className="bg-neutral-50 rounded border p-3">
                        <p className="font-caption text-text-primary">
                            <strong>Current account:</strong> {securityContext.existing_auth_method} authentication
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                    <Button 
                        variant="secondary" 
                        onClick={onCancel}
                        size="medium"
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => onConsent('separate')}
                        size="medium"
                    >
                        Create Separate Account
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => onConsent('link')}
                        size="medium"
                    >
                        Link Accounts
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
```

#### **Enhanced OAuth Hook**
```typescript
export function useOAuthWithConsent(config: OAuthConfig) {
    const [consentRequired, setConsentRequired] = useState<ConsentRequiredData | null>(null);
    const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
    
    const handleOAuthResponse = useCallback(async (response: OAuthResponse) => {
        if (response.action === 'consent_required') {
            setConsentRequired(response);
            setIsConsentModalOpen(true);
            return;
        }
        
        // Handle normal OAuth responses
        onSuccess(response);
    }, [onSuccess]);
    
    const handleConsentDecision = useCallback(async (decision: 'link' | 'separate') => {
        if (!consentRequired) return;
        
        try {
            // Call consent endpoint with decision
            const response = await OAuthProviderService.processConsentDecision({
                provider: consentRequired.provider,
                decision,
                context: consentRequired.security_context
            });
            
            setIsConsentModalOpen(false);
            setConsentRequired(null);
            onSuccess(response);
        } catch (error) {
            onError(error.message);
        }
    }, [consentRequired, onSuccess, onError]);
    
    return {
        // ... existing OAuth functionality ...
        consentRequired,
        isConsentModalOpen,
        handleConsentDecision,
        cancelConsent: () => {
            setIsConsentModalOpen(false);
            setConsentRequired(null);
        }
    };
}
```

### **New API Endpoints**

#### **Consent Decision Endpoint**
```python
@auth_router.post("/oauth/consent", response_model=OAuthResponse)
async def process_oauth_consent(
    request: OAuthConsentRequest,
    db: Session = Depends(get_db),
    client_ip: str = Depends(get_client_ip)
):
    """Process user's OAuth consent decision."""
    
    # Validate consent request
    # Record consent decision with audit trail
    # Process based on user decision (link or separate)
    # Return appropriate OAuth response
```

#### **Consent History Endpoint**
```python
@router.get("/me/oauth-consent-history", response_model=List[OAuthConsentRecord])
async def get_oauth_consent_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's OAuth consent history for transparency."""
```

## 🔒 **Security Enhancements**

### **Audit Trail**
- All consent decisions logged with full context
- IP address, user agent, timestamp tracking
- Consent revocation capabilities
- Security event logging for compliance

### **Rate Limiting**
- Consent requests limited to prevent abuse
- Progressive delays for repeated consent denials
- IP-based and user-based rate limiting

### **Enhanced Validations**
- Email ownership verification maintained
- Provider token validation enhanced
- Cross-provider security checks
- Domain-based security policies

## 🧪 **Testing Strategy**

### **Backend Tests**
- Consent decision logic validation
- Audit trail verification
- Security boundary testing
- Rate limiting effectiveness

### **Frontend Tests**
- Consent modal user interactions
- Error handling scenarios
- Accessibility compliance
- Cross-browser compatibility

### **Integration Tests**
- End-to-end consent flows
- Provider-specific consent scenarios
- Error recovery testing
- Performance impact assessment

## 📈 **Migration & Rollout Strategy**

### **Phase 1: Foundation (Week 1)**
- Implement database schema
- Create consent tracking service
- Add feature flag system

### **Phase 2: Backend Implementation (Week 2)**
- Modify OAuth processing logic
- Add consent endpoints
- Implement audit trail system

### **Phase 3: Frontend Implementation (Week 3)**
- Create consent modal component
- Enhance OAuth hooks
- Update existing components

### **Phase 4: Testing & Rollout (Week 4)**
- Comprehensive testing
- Gradual feature flag rollout
- Monitor and optimize

## 🎯 **Success Metrics**

### **Security Metrics**
- 100% explicit consent for account linking
- Complete audit trail for all OAuth operations
- Zero security regressions
- Enhanced transparency for users

### **User Experience Metrics**
- Clear consent flow completion rate >95%
- User satisfaction with consent process
- Reduced support tickets about account linking
- Maintained authentication success rates

### **Technical Metrics**
- Zero breaking changes to existing functionality
- Clean codebase with no obsolete fragments
- Comprehensive test coverage >95%
- Performance impact <50ms additional latency

---

This design ensures we understand all dependencies, manage implementation risk, maintain existing functionality, and eliminate technical debt while providing users with explicit control over their account linking decisions.