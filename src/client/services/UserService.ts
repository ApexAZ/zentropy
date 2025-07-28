import type {
	User,
	ProfileUpdateData,
	PasswordUpdateData,
	AccountSecurityResponse,
	LinkGoogleAccountRequest,
	UnlinkGoogleAccountRequest,
	LinkAccountResponse,
	UnlinkAccountResponse
} from "../types";
import { AuthService } from "./AuthService";
import { createAuthHeaders } from "../utils/auth";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";

export class UserService {
	/**
	 * Security endpoint URLs for maintainability
	 */
	private static readonly SECURITY_ENDPOINTS = {
		GET_STATUS: "/api/v1/users/me/security",
		LINK_OAUTH: "/api/v1/users/me/link-oauth",
		UNLINK_OAUTH: "/api/v1/users/me/unlink-oauth"
	};
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Get current user profile
	 */
	static async getCurrentUser(): Promise<User> {
		const response = await fetch("/api/v1/users/me", {
			headers: createAuthHeaders()
		});
		return this.handleResponse<User>(response);
	}

	/**
	 * Validate token and get user info
	 */
	static async validateTokenAndGetUser(token: string): Promise<User> {
		const response = await fetch("/api/v1/users/me", {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			}
		});
		return this.handleResponse<User>(response);
	}

	/**
	 * Update user profile information
	 */
	static async updateProfile(profileData: ProfileUpdateData): Promise<User> {
		const response = await fetch("/api/v1/users/me", {
			method: "PUT",
			headers: createAuthHeaders(),
			body: JSON.stringify(profileData)
		});
		return this.handleResponse<User>(response);
	}

	/**
	 * Change user password (simplified flow)
	 */
	static async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
		const response = await fetch("/api/v1/users/me/change-password", {
			method: "POST",
			headers: createAuthHeaders(),
			body: JSON.stringify({
				current_password: currentPassword,
				new_password: newPassword
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.detail || errorData.message || "Failed to change password");
		}

		const data = await response.json();
		return { message: data.message || "Password changed successfully!" };
	}

	/**
	 * Get all users (for dropdown selections)
	 */
	static async getAllUsers(): Promise<User[]> {
		const response = await fetch("/api/v1/users", {
			headers: createAuthHeaders()
		});
		return this.handleResponse<User[]>(response);
	}

	/**
	 * Validate profile data
	 */
	static validateProfile(profileData: ProfileUpdateData): { isValid: boolean; errors: Record<string, string> } {
		const errors: Record<string, string> = {};

		if (!profileData.first_name.trim()) {
			errors.first_name = "First name is required";
		} else if (profileData.first_name.length > 100) {
			errors.first_name = "First name must be less than 100 characters";
		}

		if (!profileData.last_name.trim()) {
			errors.last_name = "Last name is required";
		} else if (profileData.last_name.length > 100) {
			errors.last_name = "Last name must be less than 100 characters";
		}

		if (!profileData.email.trim()) {
			errors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
			errors.email = "Please enter a valid email address";
		}

		if (!profileData.display_name || !profileData.display_name.trim()) {
			errors.display_name = "Display name is required";
		} else if (profileData.display_name.length > 100) {
			errors.display_name = "Display name must be less than 100 characters";
		}

		// Phone number validation (optional field)
		if (profileData.phone_number && profileData.phone_number.trim()) {
			const phoneNumber = profileData.phone_number.trim();

			// Check length first
			if (phoneNumber.length > 20) {
				errors.phone_number = "Phone number must be less than 20 characters";
			} else {
				// Basic phone number validation - allows common formats
				// US format with/without country code, basic international format
				const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})$|^\+\d{1,3}[-\s]?\d{1,14}$/;

				if (!phoneRegex.test(phoneNumber)) {
					errors.phone_number = "Please enter a valid phone number (e.g., +1 (555) 123-4567, 555-123-4567)";
				}
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Validate password data using AuthService as single source of truth
	 */
	static validatePasswordUpdate(passwordData: PasswordUpdateData): {
		isValid: boolean;
		errors: Record<string, string>;
	} {
		const errors: Record<string, string> = {};

		if (!passwordData.current_password) {
			errors.current_password = "Current password is required";
		}

		if (!passwordData.new_password) {
			errors.new_password = "New password is required";
		} else {
			// Use AuthService.validatePassword as single source of truth
			const passwordValidation = AuthService.validatePassword(
				passwordData.new_password,
				passwordData.confirm_new_password
			);

			if (!passwordValidation.isValid) {
				const requirements = passwordValidation.requirements;
				const missingRequirements = [];

				if (!requirements.length) missingRequirements.push("at least 8 characters");
				if (!requirements.uppercase) missingRequirements.push("one uppercase letter");
				if (!requirements.lowercase) missingRequirements.push("one lowercase letter");
				if (!requirements.number) missingRequirements.push("one number");
				if (!requirements.symbol) missingRequirements.push("one special character");

				if (missingRequirements.length > 0) {
					errors.new_password = `Password must contain ${missingRequirements.join(", ")}`;
				}
			}
		}

		if (!passwordData.confirm_new_password) {
			errors.confirm_new_password = "Please confirm your new password";
		} else if (passwordData.new_password && passwordData.new_password !== passwordData.confirm_new_password) {
			errors.confirm_new_password = "Passwords do not match";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Get current user's account security status
	 */
	static async getAccountSecurity(): Promise<AccountSecurityResponse> {
		try {
			const response = await fetch(this.SECURITY_ENDPOINTS.GET_STATUS, {
				headers: createAuthHeaders()
			});
			return await this.handleResponse<AccountSecurityResponse>(response);
		} catch (error) {
			const transformedMessage = AccountSecurityErrorHandler.getDisplayMessage(error as Error, "loading");
			throw new Error(transformedMessage);
		}
	}

	/**
	 * Link Google OAuth account to current user
	 */
	static async linkGoogleAccount(linkData: LinkGoogleAccountRequest): Promise<LinkAccountResponse> {
		try {
			const response = await fetch(this.SECURITY_ENDPOINTS.LINK_OAUTH, {
				method: "POST",
				headers: createAuthHeaders(),
				body: JSON.stringify({
					provider: "google",
					credential: linkData.google_credential
				})
			});
			const result = await this.handleResponse<{ message: string; provider_identifier: string }>(response);
			return {
				message: result.message,
				google_email: result.provider_identifier, // For backward compatibility
				success: true
			};
		} catch (error) {
			throw new Error(AccountSecurityErrorHandler.getDisplayMessage(error as Error, "linking"));
		}
	}

	/**
	 * Unlink Google OAuth account from current user
	 */
	static async unlinkGoogleAccount(unlinkData: UnlinkGoogleAccountRequest): Promise<UnlinkAccountResponse> {
		try {
			const response = await fetch(this.SECURITY_ENDPOINTS.UNLINK_OAUTH, {
				method: "POST",
				headers: createAuthHeaders(),
				body: JSON.stringify({
					provider: "google",
					password: unlinkData.password
				})
			});
			const result = await this.handleResponse<{ message: string }>(response);
			return {
				message: result.message,
				success: true
			};
		} catch (error) {
			throw new Error(AccountSecurityErrorHandler.getDisplayMessage(error as Error, "unlinking"));
		}
	}
}
