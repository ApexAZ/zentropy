import type {
	AuthUser,
	SignInCredentials,
	SignUpData,
	AuthResponse,
	PasswordValidationResult,
	APIError,
	CustomError
} from "../types";

export class AuthService {
	/**
	 * Sign in with email and password
	 */
	static async signIn(credentials: SignInCredentials): Promise<{ token: string; user: AuthUser; action?: string }> {
		const response = await fetch("/api/v1/auth/login-json", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(credentials)
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Login failed");
		}

		const data: AuthResponse = await response.json();

		const result: { token: string; user: AuthUser; action?: string } = {
			token: data.access_token,
			user: {
				email: data.user.email,
				name: data.user.display_name || "",
				has_projects_access: data.user.has_projects_access,
				email_verified: data.user.email_verified
			}
		};

		if (data.action) {
			result.action = data.action;
		}

		return result;
	}

	/**
	 * Sign up with email registration
	 */
	static async signUp(userData: SignUpData): Promise<{ message: string }> {
		const response = await fetch("/api/v1/auth/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(userData)
		});

		if (!response.ok) {
			const errorData: APIError = await response.json();

			// Handle structured error responses
			if (typeof errorData.detail === "object" && errorData.detail.error_type) {
				// Extract the error type and message
				const errorType = errorData.detail.error_type;
				const errorMessage = errorData.detail.detail || "Registration failed";

				// Create custom error with type information
				const error = new Error(errorMessage) as CustomError;
				error.type = errorType;
				throw error;
			}

			// Handle simple string errors (backward compatibility)
			throw new Error((errorData.detail as string) || "Registration failed");
		}

		const data: { message: string } = await response.json();

		return {
			message: data.message
		};
	}

	/**
	 * Sign in with OAuth providers
	 */
	static async oauthSignIn(
		provider: "google" | "microsoft" | "github",
		credential: string
	): Promise<{ token: string; user: AuthUser; action?: string }> {
		// Use unified OAuth endpoint with provider-specific request format
		let requestBody: object;

		switch (provider) {
			case "google":
				requestBody = { provider: "google", credential };
				break;
			case "microsoft":
				requestBody = { provider: "microsoft", authorization_code: credential };
				break;
			case "github":
				requestBody = { provider: "github", authorization_code: credential };
				break;
			default:
				throw new Error(`OAuth provider "${provider}" is not supported`);
		}

		const response = await fetch("/api/v1/auth/oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorData = await response.json();
			const errorMessage = errorData.detail?.error || errorData.detail || "OAuth authentication failed";
			throw new Error(errorMessage);
		}

		const data: AuthResponse = await response.json();

		const result: { token: string; user: AuthUser; action?: string } = {
			token: data.access_token,
			user: {
				email: data.user.email,
				name: data.user.display_name || "",
				has_projects_access: data.user.has_projects_access,
				email_verified: data.user.email_verified
			}
		};

		if (data.action) {
			result.action = data.action;
		}

		return result;
	}

	/**
	 * Sign out - clear authentication tokens from storage
	 */
	static async signOut(): Promise<void> {
		// Clear authentication tokens from both storage locations
		localStorage.removeItem("authToken");
		sessionStorage.removeItem("authToken");
	}

	/**
	 * Validate password strength
	 */
	static validatePassword(password: string, confirmPassword?: string): PasswordValidationResult {
		const requirements = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
			match: confirmPassword !== undefined && confirmPassword !== "" ? password === confirmPassword : false
		};

		const isValid = Object.values(requirements).every(req => req);

		return {
			isValid,
			requirements
		};
	}

	/**
	 * Validate email format
	 */
	static validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	/**
	 * Send email verification
	 */
	static async sendEmailVerification(email: string): Promise<{ message: string }> {
		const response = await fetch("/api/v1/auth/send-verification", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ email })
		});

		if (!response.ok) {
			const errorData = await response.json();
			// Preserve HTTP response structure for rate limiting
			const error = new Error(
				errorData.detail?.message || errorData.detail || "Failed to send verification email"
			);
			(error as any).response = {
				status: response.status,
				data: errorData
			};
			throw error;
		}

		const data = await response.json();
		return { message: data.message || "Verification email sent! Please check your inbox." };
	}

	/**
	 * Verify email with code
	 */
	static async verifyCode(
		email: string,
		code: string,
		verificationType: string = "email_verification"
	): Promise<{ message: string; success: boolean; user_id: string }> {
		const response = await fetch("/api/v1/auth/verify-code", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				email,
				code,
				verification_type: verificationType
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Code verification failed");
		}

		const data = await response.json();
		return {
			message: data.message || "Email verified successfully",
			success: data.success || true,
			user_id: data.user_id
		};
	}

	/**
	 * Reset password using user ID from email verification (simplified flow)
	 */
	static async resetPasswordWithUserId(newPassword: string, userId: string): Promise<{ message: string }> {
		// For now, create a simple token from user_id - this is temporary
		// In a real system, we'd want a proper signed token, but for simplicity we'll use user_id
		const simpleToken = `verified_user_${userId}`;
		return this.resetPassword(newPassword, simpleToken);
	}

	/**
	 * Reset password using operation token from verification
	 */
	static async resetPassword(newPassword: string, operationToken: string): Promise<{ message: string }> {
		const response = await fetch("/api/v1/auth/reset-password", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				new_password: newPassword,
				operation_token: operationToken
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Failed to reset password");
		}

		const data = await response.json();
		return { message: data.message || "Password reset successfully" };
	}
}
