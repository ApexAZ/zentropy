/**
 * Auth Core Module - Consolidated Authentication System
 *
 * Consolidates functionality from:
 * - auth-utils.ts (session management, validation, security)
 * - navigation-auth.ts (authentication-aware navigation)
 * - login-validation.ts (pure validation functions)
 * - login-api.ts (API request building and response parsing)
 * - password-change-utils.ts (password change validation and API)
 *
 * Follows security-first approach with comprehensive error handling
 * Implements containerized architecture with clear module boundaries
 */

import { sanitizeInput } from "./validation.js";

// Type definitions - consolidating all auth-related interfaces
export interface SessionStatus {
	isValid: boolean;
	user: SessionInfo | null;
	error?: string;
	expired?: boolean;
}

export interface SessionInfo {
	id: string;
	email: string;
	name: string;
	role: string;
	lastCheck?: number;
}

export interface AuthError {
	type: "expired" | "unauthorized" | "network" | "server";
	message: string;
	redirectRequired: boolean;
}

export interface LoginFormData {
	email: string;
	password: string;
}

export interface LoginValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: LoginFormData;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

export interface LoginApiResponse {
	success: true;
	message: string;
	user?: LoginUser;
}

export interface LoginApiError {
	success: false;
	message: string;
	error?: string;
}

export interface LoginRequest {
	url: string;
	options: RequestInit;
}

export interface PasswordChangeFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface PasswordChangeValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: PasswordChangeFormData;
}

export interface PasswordChangeRequest {
	url: string;
	options: RequestInit;
}

export interface PasswordChangeApiResponse {
	success: true;
	message: string;
}

export interface PasswordChangeApiError {
	success: false;
	message: string;
	error?: string;
}

export interface UserDisplayInfo {
	name: string;
	role: string;
}

export interface NavigationElements {
	container: HTMLElement | null;
	userInfo: HTMLElement | null;
	logoutButton: HTMLElement | null;
}

// API Response interfaces
interface SessionCheckResponse {
	user: SessionInfo;
}

// Constants
const SESSION_STORAGE_KEY = "user";
const SESSION_WARNING_ID = "session-warning";

/**
 * AuthCore - Consolidated Authentication Module
 * Provides all authentication-related functionality in a single containerized module
 */
export class AuthCore {
	// ========================
	// SESSION MANAGEMENT (from auth-utils)
	// ========================

	/**
	 * Check current session status with the server
	 * Returns session validity and user information
	 */
	async checkSessionStatus(): Promise<SessionStatus> {
		try {
			const response = await fetch("/api/users/me", {
				method: "GET",
				credentials: "include"
			});

			if (response.ok) {
				const data = (await response.json()) as SessionCheckResponse;
				return {
					isValid: true,
					user: {
						...data.user,
						lastCheck: Date.now()
					}
				};
			} else if (response.status === 401) {
				return {
					isValid: false,
					user: null,
					error: "Session expired or unauthorized",
					expired: true
				};
			} else {
				return {
					isValid: false,
					user: null,
					error: `Server error: ${response.status}`
				};
			}
		} catch (error) {
			return {
				isValid: false,
				user: null,
				error: `network error: ${error instanceof Error ? error.message : "Unknown error"}`
			};
		}
	}

	/**
	 * Clear all session information
	 */
	clearSessionInfo(): void {
		if (typeof sessionStorage !== "undefined") {
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
			sessionStorage.clear();
		}
	}

	/**
	 * Get session information from local storage
	 * Returns null if no valid session data exists
	 */
	getSessionInfo(): SessionInfo | null {
		try {
			if (typeof sessionStorage === "undefined") {
				return null;
			}

			const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);

			if (!sessionData || sessionData.trim() === "") {
				return null;
			}

			const parsed: unknown = JSON.parse(sessionData);

			// Validate that we have the required fields with type safety
			if (
				!parsed ||
				typeof parsed !== "object" ||
				parsed === null ||
				!("id" in parsed) ||
				!("email" in parsed) ||
				typeof (parsed as Record<string, unknown>).id !== "string" ||
				typeof (parsed as Record<string, unknown>).email !== "string"
			) {
				return null;
			}

			return parsed as SessionInfo;
		} catch {
			// Invalid JSON or other parsing error
			return null;
		}
	}

	/**
	 * Redirect to login page with current location for return redirect
	 */
	redirectToLogin(): void {
		if (typeof window !== "undefined") {
			const currentPath = encodeURIComponent(window.location.pathname);
			window.location.href = `/login.html?redirect=${currentPath}`;
		}
	}

	/**
	 * Handle authentication errors with appropriate user feedback
	 */
	handleAuthError(error: AuthError): void {
		// Log auth errors for debugging (allows console in auth context)
		// eslint-disable-next-line no-console
		console.warn(`Auth error (${error.type}): ${error.message}`);

		if (error.redirectRequired) {
			this.clearSessionInfo();
			this.redirectToLogin();
		}

		// Remove any existing warning
		const existingWarning = document.getElementById(SESSION_WARNING_ID);
		if (existingWarning) {
			existingWarning.remove();
		}

		// Create warning message
		const warning = document.createElement("div");
		warning.id = SESSION_WARNING_ID;
		warning.className = "auth-warning";
		warning.textContent = error.message;
		warning.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: #fee;
			border: 1px solid #fcc;
			color: #c66;
			padding: 15px;
			border-radius: 4px;
			z-index: 10000;
			max-width: 300px;
		`;

		document.body.appendChild(warning);

		// Auto-remove warning after 5 seconds
		setTimeout(() => {
			warning.remove();
		}, 5000);
	}

	// ========================
	// LOGIN VALIDATION (from login-validation)
	// ========================

	/**
	 * Validate email format using regex
	 */
	isValidEmail(email: string): boolean {
		// More strict email validation
		const emailRegex =
			/^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

		// Additional checks for edge cases
		if (email.includes("..") || email.includes("@@")) {
			return false;
		}

		return emailRegex.test(email);
	}

	/**
	 * Validate login form data
	 */
	validateLoginForm(data: LoginFormData): LoginValidationResult {
		const errors: Record<string, string> = {};

		// Email validation
		if (!data.email) {
			errors.email = "Email is required";
		} else if (!this.isValidEmail(data.email)) {
			errors.email = "Invalid email format";
		}

		// Password validation
		if (!data.password) {
			errors.password = "Password is required";
		} else if (data.password.length < 1) {
			errors.password = "Password cannot be empty";
		}

		const isValid = Object.keys(errors).length === 0;

		if (isValid) {
			return {
				isValid,
				errors,
				sanitizedData: this.sanitizeLoginInput(data)
			};
		} else {
			return {
				isValid,
				errors
			};
		}
	}

	/**
	 * Sanitize login input to prevent XSS
	 */
	sanitizeLoginInput(data: LoginFormData): LoginFormData {
		return {
			email: sanitizeInput(data.email),
			password: sanitizeInput(data.password)
		};
	}

	// ========================
	// LOGIN API (from login-api)
	// ========================

	/**
	 * Create login request configuration
	 */
	createLoginRequest(credentials: LoginCredentials): LoginRequest {
		return {
			url: "/api/users/login",
			options: {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(credentials),
				credentials: "include" as RequestCredentials
			}
		};
	}

	/**
	 * Make login request to server
	 */
	async makeLoginRequest(credentials: LoginCredentials): Promise<LoginApiResponse | LoginApiError> {
		try {
			const request = this.createLoginRequest(credentials);
			const response = await fetch(request.url, request.options);

			return await this.handleLoginResponse(response);
		} catch (error) {
			return {
				success: false,
				message: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
				error: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}

	/**
	 * Handle login response from server
	 */
	async handleLoginResponse(response: Response): Promise<LoginApiResponse | LoginApiError> {
		try {
			const data = (await response.json()) as unknown;

			if (response.ok) {
				const responseData = data as { message?: string; user?: LoginUser };
				if (responseData.user) {
					return {
						success: true,
						message: responseData.message ?? "Login successful",
						user: responseData.user
					};
				} else {
					return {
						success: true,
						message: responseData.message ?? "Login successful"
					};
				}
			} else {
				const errorData = data as { message?: string; error?: string };
				if (errorData.error) {
					return {
						success: false,
						message: errorData.message ?? "Login failed",
						error: errorData.error
					};
				} else {
					return {
						success: false,
						message: errorData.message ?? "Login failed"
					};
				}
			}
		} catch (error) {
			return {
				success: false,
				message: "Failed to parse server response",
				error: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}

	// ========================
	// PASSWORD CHANGE (from password-change-utils)
	// ========================

	/**
	 * Validate password change form data
	 */
	validatePasswordChangeForm(data: PasswordChangeFormData): PasswordChangeValidationResult {
		const errors: Record<string, string> = {};

		// Current password validation
		if (!data.currentPassword) {
			errors.currentPassword = "Current password is required";
		}

		// New password validation
		if (!data.newPassword) {
			errors.newPassword = "New password is required";
		} else if (data.newPassword.length < 8) {
			errors.newPassword = "Password must be at least 8 characters long";
		} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(data.newPassword)) {
			errors.newPassword = "Password must contain uppercase, lowercase, number and special character";
		}

		// Confirm password validation
		if (!data.confirmPassword) {
			errors.confirmPassword = "Please confirm your new password";
		} else if (data.newPassword !== data.confirmPassword) {
			errors.confirmPassword = "Passwords do not match";
		}

		// Additional validation
		if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
			errors.newPassword = "New password must be different from current password";
		}

		const isValid = Object.keys(errors).length === 0;

		if (isValid) {
			return {
				isValid,
				errors,
				sanitizedData: this.sanitizePasswordChangeInput(data)
			};
		} else {
			return {
				isValid,
				errors
			};
		}
	}

	/**
	 * Create password change request configuration
	 */
	createPasswordChangeRequest(data: PasswordChangeFormData): PasswordChangeRequest {
		return {
			url: "/api/users/change-password",
			options: {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					currentPassword: data.currentPassword,
					newPassword: data.newPassword
				}),
				credentials: "include" as RequestCredentials
			}
		};
	}

	/**
	 * Handle password change response from server
	 */
	async handlePasswordChangeResponse(
		response: Response
	): Promise<PasswordChangeApiResponse | PasswordChangeApiError> {
		try {
			const data = (await response.json()) as unknown;

			if (response.ok) {
				const responseData = data as { message?: string };
				return {
					success: true,
					message: responseData.message ?? "Password changed successfully"
				};
			} else {
				const errorData = data as { message?: string; error?: string };
				if (errorData.error) {
					return {
						success: false,
						message: errorData.message ?? "Password change failed",
						error: errorData.error
					};
				} else {
					return {
						success: false,
						message: errorData.message ?? "Password change failed"
					};
				}
			}
		} catch (error) {
			return {
				success: false,
				message: "Failed to parse server response",
				error: error instanceof Error ? error.message : "Unknown error"
			};
		}
	}

	/**
	 * Sanitize password change input to prevent XSS
	 */
	sanitizePasswordChangeInput(data: PasswordChangeFormData): PasswordChangeFormData {
		return {
			currentPassword: sanitizeInput(data.currentPassword),
			newPassword: sanitizeInput(data.newPassword),
			confirmPassword: sanitizeInput(data.confirmPassword)
		};
	}

	// ========================
	// NAVIGATION AUTH (from navigation-auth)
	// ========================

	/**
	 * Initialize navigation with authentication
	 */
	async initializeNavigation(): Promise<void> {
		try {
			const sessionStatus = await this.checkSessionStatus();

			if (sessionStatus.isValid && sessionStatus.user) {
				this.updateUserDisplay({
					name: sessionStatus.user.name,
					role: sessionStatus.user.role
				});
				this.setupLogoutHandler();
			} else {
				this.redirectToLogin();
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Navigation initialization failed:", error);
			this.redirectToLogin();
		}
	}

	/**
	 * Update user display in navigation
	 */
	updateUserDisplay(userInfo: UserDisplayInfo): void {
		const userInfoElement = document.getElementById("user-info");
		if (userInfoElement) {
			userInfoElement.textContent = `${userInfo.name} (${userInfo.role})`;
		}
	}

	/**
	 * Setup logout button event handler
	 */
	private setupLogoutHandler(): void {
		const logoutButton = document.getElementById("logout-btn");
		if (logoutButton) {
			logoutButton.addEventListener("click", () => {
				void this.handleLogout();
			});
		}
	}

	/**
	 * Validate return URL for security (prevent open redirects)
	 */
	validateReturnUrl(url: string): boolean {
		if (!url || url.trim() === "") {
			return false;
		}

		const trimmedUrl = url.trim();

		// Block dangerous protocols
		const dangerousProtocols = ["javascript:", "data:", "vbscript:"];
		if (dangerousProtocols.some(protocol => trimmedUrl.toLowerCase().startsWith(protocol.toLowerCase()))) {
			return false;
		}

		// Block protocol-relative URLs (could redirect to external sites)
		if (trimmedUrl.startsWith("//")) {
			return false;
		}

		// Allow relative URLs
		if (trimmedUrl.startsWith("/")) {
			return true;
		}

		// For absolute URLs, validate they're same-origin
		try {
			const urlObj = new URL(trimmedUrl);
			return urlObj.origin === window.location.origin;
		} catch {
			// Malformed URL
			return false;
		}
	}

	/**
	 * Handle user logout
	 */
	async handleLogout(): Promise<void> {
		try {
			const response = await fetch("/api/users/logout", {
				method: "POST",
				credentials: "include"
			});

			// Clear session regardless of server response
			this.clearSessionInfo();

			if (response.ok) {
				// eslint-disable-next-line no-console
				console.log("Logout successful");
			} else {
				// eslint-disable-next-line no-console
				console.warn("Logout request failed, but session cleared locally");
			}

			this.redirectToLogin();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Logout error:", error);
			// Still clear session and redirect even if network fails
			this.clearSessionInfo();
			this.redirectToLogin();
		}
	}
}

// Export singleton instance for consistent usage across the application
export const authCore = new AuthCore();

// Export individual functions for backward compatibility during migration
export const checkSessionStatus = authCore.checkSessionStatus.bind(authCore);
export const clearSessionInfo = authCore.clearSessionInfo.bind(authCore);
export const getSessionInfo = authCore.getSessionInfo.bind(authCore);
export const redirectToLogin = authCore.redirectToLogin.bind(authCore);
export const handleAuthError = authCore.handleAuthError.bind(authCore);
export const isValidEmail = authCore.isValidEmail.bind(authCore);
export const validateLoginForm = authCore.validateLoginForm.bind(authCore);
export const sanitizeLoginInput = authCore.sanitizeLoginInput.bind(authCore);
export const createLoginRequest = authCore.createLoginRequest.bind(authCore);
export const makeLoginRequest = authCore.makeLoginRequest.bind(authCore);
export const handleLoginResponse = authCore.handleLoginResponse.bind(authCore);
export const validatePasswordChangeForm = authCore.validatePasswordChangeForm.bind(authCore);
export const createPasswordChangeRequest = authCore.createPasswordChangeRequest.bind(authCore);
export const handlePasswordChangeResponse = authCore.handlePasswordChangeResponse.bind(authCore);
export const sanitizePasswordChangeInput = authCore.sanitizePasswordChangeInput.bind(authCore);
export const initializeNavigation = authCore.initializeNavigation.bind(authCore);
export const updateUserDisplay = authCore.updateUserDisplay.bind(authCore);
export const validateReturnUrl = authCore.validateReturnUrl.bind(authCore);
export const handleLogout = authCore.handleLogout.bind(authCore);
