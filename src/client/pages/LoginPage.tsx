import React, { useState, useEffect } from 'react'

interface LoginData {
  email: string
  password: string
  remember: boolean
}

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
    remember: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  // Hide success toast after 3 seconds
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => setShowSuccessToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessToast])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setGeneralError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      if (!response.ok) {
        const errorData = await response.json() as { detail?: string; message?: string }
        throw new Error(errorData.detail ?? errorData.message ?? 'Login failed')
      }

      const data = await response.json() as { access_token?: string }
      
      // Store the token
      if (data.access_token) {
        localStorage.setItem('authToken', data.access_token)
      }
      
      // Show success toast
      setShowSuccessToast(true)
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/dashboard' // or handle routing appropriately
      }, 1500)

    } catch (err) {
      // console.error('Login error:', err)
      setGeneralError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e: React.MouseEvent): void => {
    e.preventDefault()
    // TODO: Implement forgot password functionality
    alert('Forgot password functionality not yet implemented')
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4 px-8 shadow-sm text-center">
        <h1 className="m-0 mb-4 text-3xl">
          <a href="/" className="no-underline text-blue-500 font-bold">Zentropy</a>
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h2 className="text-gray-900 text-2xl font-semibold mb-2">Welcome Back</h2>
              <p className="text-gray-600 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="font-medium text-gray-700 text-sm">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  autoComplete="email"
                  placeholder="your.email@company.com"
                  className="p-3 border border-gray-300 rounded-md text-base transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                />
                {errors.email && (
                  <span className="text-sm text-red-600 mt-1">{errors.email}</span>
                )}
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="font-medium text-gray-700 text-sm">Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-12 flex-1 p-3 border border-gray-300 rounded-md text-base transition-all duration-200 bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 bg-none border-none cursor-pointer p-1 text-gray-500 transition-colors duration-200 rounded-sm hover:text-gray-700 hover:bg-gray-100 focus:outline-2 focus:outline-blue-500 focus:outline-offset-2"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    <span className="text-base select-none">{showPassword ? '🙈' : '👁'}</span>
                  </button>
                </div>
                {errors.password && (
                  <span className="text-sm text-red-600 mt-1">{errors.password}</span>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={formData.remember}
                    onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                    className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  Keep me signed in
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center relative inline-flex items-center gap-2 p-3 px-6 bg-blue-500 text-white border-none rounded-md text-base font-medium text-center no-underline cursor-pointer transition-all duration-200 hover:bg-blue-600 hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></span>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-gray-600 no-underline text-sm transition-colors duration-200 hover:text-blue-500 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>
            </form>

            {/* General Error Message */}
            {generalError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4 animate-[slideDown_0.3s_ease-out]">
                <div className="flex items-center gap-2">
                  <span className="error-icon">⚠️</span>
                  <span className="text-red-600 text-sm font-medium">{generalError}</span>
                </div>
              </div>
            )}

            {/* Registration Link */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                Don&apos;t have an account?{' '}
                <a
                  href="/register"
                  className="text-blue-500 no-underline font-medium transition-colors duration-200 hover:text-blue-600 hover:underline"
                >
                  Create one now
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-5 right-5 z-[1100] min-w-[300px] rounded-md shadow-lg animate-[slideIn_0.3s_ease] bg-green-50 border border-green-200">
          <div className="flex justify-between items-center gap-2 p-4">
            <span className="text-green-600 text-xl font-bold">✓</span>
            <span className="flex-1 text-green-700 text-sm font-medium">Login successful! Redirecting...</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-8 text-center shadow-lg min-w-[200px]">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 text-sm m-0">Signing you in...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

export default LoginPage