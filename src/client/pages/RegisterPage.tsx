import React, { useState, useEffect } from 'react'

interface RegisterData {
  first_name: string
  last_name: string
  email: string
  role: string
  password: string
  confirm_password: string
  terms_agreement: boolean
}

interface PasswordRequirements {
  length: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  symbol: boolean
}

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    password: '',
    confirm_password: '',
    terms_agreement: false
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false
  })
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
  })
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Check password requirements whenever password changes
  useEffect(() => {
    const password = formData.password
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      symbol: /[!@#$%^&*]/.test(password)
    }
    
    setPasswordRequirements(requirements)
    
    // Calculate strength
    const validCount = Object.values(requirements).filter(Boolean).length
    setPasswordStrength(validCount)
  }, [formData.password])

  // Check email availability with debounce
  useEffect(() => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailAvailable(null)
      return
    }

    const timeoutId = setTimeout(() => void (async (): Promise<void> => {
      try {
        const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(formData.email)}`)
        const data = await response.json() as { available: boolean }
        setEmailAvailable(data.available)
      } catch (err) {
        // console.error('Error checking email availability:', err)
        setEmailAvailable(null)
      }
    })(), 500)

    return () => clearTimeout(timeoutId)
  }, [formData.email])

  // Hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    } else if (formData.first_name.length > 50) {
      newErrors.first_name = 'First name must be less than 50 characters'
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    } else if (formData.last_name.length > 50) {
      newErrors.last_name = 'Last name must be less than 50 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    } else if (emailAvailable === false) {
      newErrors.email = 'This email address is already registered'
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select your role'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!Object.values(passwordRequirements).every(Boolean)) {
      newErrors.password = 'Password does not meet all requirements'
    }

    // Confirm password validation
    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password'
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match'
    }

    // Terms agreement validation
    if (!formData.terms_agreement) {
      newErrors.terms = 'You must agree to the Terms of Service and Privacy Policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          password: formData.password
        })
      })

      if (!response.ok) {
        const errorData = await response.json() as { message?: string }
        throw new Error(errorData.message ?? 'Registration failed')
      }

      // Show success modal
      setShowSuccessModal(true)

    } catch (err) {
      // console.error('Registration error:', err)
      setToast({
        message: err instanceof Error ? err.message : 'Registration failed. Please try again.',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedirectToDashboard = (): void => {
    window.location.href = '/dashboard'
  }

  const togglePasswordVisibility = (field: 'password' | 'confirm'): void => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
    switch (strength) {
      case 0:
      case 1: return { label: 'Very Weak', color: 'text-red-600' }
      case 2: return { label: 'Weak', color: 'text-orange-500' }
      case 3: return { label: 'Fair', color: 'text-yellow-500' }
      case 4: return { label: 'Good', color: 'text-green-500' }
      case 5: return { label: 'Excellent', color: 'text-green-600' }
      default: return { label: '', color: '' }
    }
  }

  const getPasswordStrengthBarColor = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1: return 'bg-red-600'
      case 2: return 'bg-orange-500'
      case 3: return 'bg-yellow-500'
      case 4: return 'bg-green-500'
      case 5: return 'bg-green-600'
      default: return 'bg-gray-200'
    }
  }

  const getPasswordStrengthWidth = (strength: number): string => {
    return `${(strength / 5) * 100}%`
  }

  const isFormValid = (): boolean => {
    return formData.first_name &&
           formData.last_name &&
           formData.email &&
           formData.role &&
           formData.password &&
           formData.confirm_password &&
           formData.terms_agreement &&
           Object.values(passwordRequirements).every(Boolean) &&
           formData.password === formData.confirm_password &&
           emailAvailable !== false
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="text-center p-8 border-b border-gray-200 bg-gray-50">
              <h1 className="text-2xl font-bold text-blue-500 mb-4">
                <a href="/" className="no-underline text-blue-500">Zentropy</a>
              </h1>
              <h2 className="text-gray-900 text-2xl font-semibold mb-2">Create Your Account</h2>
              <p className="text-gray-600 text-sm">Join your team&apos;s capacity planning workspace</p>
            </div>

            {/* Registration Form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="p-8" noValidate>
              {/* Personal Information */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="first-name" className="block font-medium text-gray-700 text-sm">First Name</label>
                    <input 
                      type="text" 
                      id="first-name" 
                      name="first_name" 
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                      required 
                      autoComplete="given-name"
                      maxLength={50}
                      placeholder="Enter your first name"
                    />
                    {errors.first_name && (
                      <div className="text-sm text-red-600 mt-1">{errors.first_name}</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="last-name" className="block font-medium text-gray-700 text-sm">Last Name</label>
                    <input 
                      type="text" 
                      id="last-name" 
                      name="last_name" 
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                      required 
                      autoComplete="family-name"
                      maxLength={50}
                      placeholder="Enter your last name"
                    />
                    {errors.last_name && (
                      <div className="text-sm text-red-600 mt-1">{errors.last_name}</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-6">
                  <label htmlFor="email" className="block font-medium text-gray-700 text-sm">Email Address</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                    required 
                    autoComplete="email"
                    placeholder="Enter your email address"
                  />
                  {errors.email && (
                    <div className="text-sm text-red-600 mt-1">{errors.email}</div>
                  )}
                  {emailAvailable === true && (
                    <div className="text-sm text-green-600 mt-1">✓ Email is available</div>
                  )}
                  {emailAvailable === false && (
                    <div className="text-sm text-red-600 mt-1">✗ Email is already registered</div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="role" className="block font-medium text-gray-700 text-sm">Role</label>
                  <select 
                    id="role" 
                    name="role" 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                    required
                  >
                    <option value="">Select your role</option>
                    <option value="team_member">Team Member</option>
                    <option value="team_lead">Team Lead</option>
                  </select>
                  {errors.role && (
                    <div className="text-sm text-red-600 mt-1">{errors.role}</div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">Team Leads can manage team settings and member access</div>
                </div>
              </div>

              {/* Password Security */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 pb-2 border-b border-gray-200">Password Security</h3>
                
                <div className="flex flex-col gap-2 mb-6">
                  <label htmlFor="password" className="block font-medium text-gray-700 text-sm">Password</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showPasswords.password ? 'text' : 'password'}
                      id="password" 
                      name="password" 
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-3 pr-20 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                      required 
                      autoComplete="new-password"
                      placeholder="Create a secure password"
                      minLength={8}
                      maxLength={128}
                    />
                    <button 
                      type="button" 
                      onClick={() => togglePasswordVisibility('password')}
                      className="absolute right-3 bg-none border-none cursor-pointer p-1 text-gray-500 transition-colors duration-200 rounded-sm hover:text-gray-700 hover:bg-gray-100"
                    >
                      <span className="text-sm">{showPasswords.password ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="text-sm text-red-600 mt-1">{errors.password}</div>
                  )}
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-sm">
                      <div className="text-sm font-medium text-gray-700 mb-1">Password Strength:</div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthBarColor(passwordStrength)}`}
                          style={{ width: getPasswordStrengthWidth(passwordStrength) }}
                        ></div>
                      </div>
                      <div className={`text-sm font-medium ${getPasswordStrengthLabel(passwordStrength).color}`}>
                        {getPasswordStrengthLabel(passwordStrength).label}
                      </div>
                    </div>
                  )}
                  
                  {/* Password Requirements */}
                  <div className="mt-2 p-2 bg-gray-50 rounded-sm">
                    <div className="text-sm font-medium text-gray-700 mb-2">Password must contain:</div>
                    <ul className="list-none m-0 p-0">
                      <li className={`flex items-center gap-2 text-sm mb-1 transition-colors duration-200 ${passwordRequirements.length ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="text-xs font-bold min-w-4 text-center">{passwordRequirements.length ? '✓' : '✗'}</span>
                        At least 8 characters
                      </li>
                      <li className={`flex items-center gap-2 text-sm mb-1 transition-colors duration-200 ${passwordRequirements.uppercase ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="text-xs font-bold min-w-4 text-center">{passwordRequirements.uppercase ? '✓' : '✗'}</span>
                        One uppercase letter (A-Z)
                      </li>
                      <li className={`flex items-center gap-2 text-sm mb-1 transition-colors duration-200 ${passwordRequirements.lowercase ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="text-xs font-bold min-w-4 text-center">{passwordRequirements.lowercase ? '✓' : '✗'}</span>
                        One lowercase letter (a-z)
                      </li>
                      <li className={`flex items-center gap-2 text-sm mb-1 transition-colors duration-200 ${passwordRequirements.number ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="text-xs font-bold min-w-4 text-center">{passwordRequirements.number ? '✓' : '✗'}</span>
                        One number (0-9)
                      </li>
                      <li className={`flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.symbol ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="text-xs font-bold min-w-4 text-center">{passwordRequirements.symbol ? '✓' : '✗'}</span>
                        One symbol (!@#$%^&*)
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="confirm-password" className="block font-medium text-gray-700 text-sm">Confirm Password</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showPasswords.confirm ? 'text' : 'password'}
                      id="confirm-password" 
                      name="confirm_password" 
                      value={formData.confirm_password}
                      onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                      className="w-full p-3 pr-20 border border-gray-300 rounded-md text-base leading-6 transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" 
                      required 
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                    />
                    <button 
                      type="button" 
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 bg-none border-none cursor-pointer p-1 text-gray-500 transition-colors duration-200 rounded-sm hover:text-gray-700 hover:bg-gray-100"
                    >
                      <span className="text-sm">{showPasswords.confirm ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <div className="text-sm text-red-600 mt-1">{errors.confirm_password}</div>
                  )}
                </div>
              </div>

              {/* Terms and Privacy */}
              <div className="mb-8">
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-3 cursor-pointer text-sm leading-6">
                    <input 
                      type="checkbox" 
                      id="terms-agreement" 
                      name="terms_agreement" 
                      checked={formData.terms_agreement}
                      onChange={(e) => setFormData({ ...formData, terms_agreement: e.target.checked })}
                      required 
                      className="mt-1"
                    />
                    <span className="text-gray-700">
                      I agree to the <button type="button" className="text-blue-500 no-underline font-medium transition-colors duration-200 hover:text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0">Terms of Service</button> and 
                      <button type="button" className="text-blue-500 no-underline font-medium transition-colors duration-200 hover:text-blue-600 hover:underline bg-transparent border-none cursor-pointer p-0"> Privacy Policy</button>
                    </span>
                  </label>
                  {errors.terms && (
                    <div className="text-sm text-red-600 mt-1">{errors.terms}</div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={!isFormValid() || isLoading}
                className={`w-full justify-center relative inline-flex items-center gap-2 p-3 px-6 border-none rounded-md text-base font-medium transition-all duration-200 ${
                  isFormValid() && !isLoading
                    ? 'bg-blue-500 text-white cursor-pointer hover:bg-blue-600 hover:-translate-y-px hover:shadow-md'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="inline-block w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" width="16" height="16" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Rate Limiting Info */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md m-4">
              <div className="text-xl flex-shrink-0">ℹ️</div>
              <div className="text-sm text-gray-600 leading-5">
                For security, only 2 account registrations are allowed per hour from each location.
              </div>
            </div>

            {/* Alternative Actions */}
            <div className="p-8 pt-0 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account? 
                <a href="/login" className="text-blue-500 no-underline font-medium transition-colors duration-200 hover:text-blue-600 hover:underline"> Sign in here</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[1100] min-w-[300px] rounded-md shadow-lg animate-[slideIn_0.3s_ease]">
          <div className={`flex justify-between items-center gap-2 p-4 ${
            toast.type === 'success' ? 'bg-green-50 border border-green-200' : 
            toast.type === 'error' ? 'bg-red-50 border border-red-200' : 
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className={`flex-1 text-sm leading-5 ${
              toast.type === 'success' ? 'text-green-700' : 
              toast.type === 'error' ? 'text-red-700' : 
              'text-blue-700'
            }`}>
              {toast.message}
            </div>
            <button 
              onClick={() => setToast(null)}
              className="opacity-80 transition-opacity duration-200 hover:opacity-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Registration Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-6">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto text-center p-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-gray-900 mb-4 text-xl font-semibold">Account Created Successfully!</h3>
            <p className="text-gray-600 mb-8 leading-6">
              Welcome to Zentropy! Your account has been created and you&apos;re now logged in.
            </p>
            <div className="flex justify-end gap-4">
              <button 
                onClick={handleRedirectToDashboard}
                className="inline-flex items-center gap-2 p-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default RegisterPage