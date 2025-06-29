/**
 * Password Change Utilities
 * Security-first implementation for password change functionality
 * Following hybrid testing approach with comprehensive pure function testing
 */

import { sanitizeInput } from "./validation.js";

/**
 * Password change form data interface
 */
export interface PasswordChangeFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

/**
 * Password change validation result interface
 */
export interface PasswordChangeValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: PasswordChangeFormData;
}

/**
 * Password change API request configuration interface
 */
export interface PasswordChangeRequest {
	url: string;
	options: {
		method: string;
		headers: Record<string, string>;
		credentials: RequestCredentials;
		body: string;
	};
}

/**
 * Password change API response interface
 */
export interface PasswordChangeResponse {
	success: boolean;
	message: string;
	rateLimited?: boolean;
	requiresReauth?: boolean;
}

/**
 * Password change data for API requests (subset of form data)
 */
export interface PasswordChangeData {
	currentPassword: string;
	newPassword: string;
}

/**
 * Sanitize password change input to prevent XSS attacks
 * @param input - Raw form input data
 * @returns Sanitized form data
 */
export function sanitizePasswordChangeInput(input: PasswordChangeFormData): PasswordChangeFormData {
	return {
		currentPassword: sanitizeInput(input.currentPassword || ""),
		newPassword: sanitizeInput(input.newPassword || ""),
		confirmPassword: sanitizeInput(input.confirmPassword || "")
	};
}

/**
 * Validate password change form data with comprehensive security checks
 * @param formData - The form data to validate
 * @returns Validation result with errors and sanitized data
 */
export function validatePasswordChangeForm(formData: PasswordChangeFormData): PasswordChangeValidationResult {
	const errors: Record<string, string> = {};

	// Handle null/undefined inputs
	const safeFormData = {
		currentPassword: formData.currentPassword || "",
		newPassword: formData.newPassword || "",
		confirmPassword: formData.confirmPassword || ""
	};

	// Sanitize inputs first
	const sanitizedData = sanitizePasswordChangeInput(safeFormData);

	// Validate current password
	if (!sanitizedData.currentPassword.trim()) {
		errors.currentPassword = "Current password is required";
	}

	// Validate new password
	if (!sanitizedData.newPassword.trim()) {
		errors.newPassword = "New password is required";
	} else {
		// Password strength validation
		const newPassword = sanitizedData.newPassword;

		// Length requirements (check first)
		if (newPassword.length < 8) {
			errors.newPassword = "New password must be at least 8 characters long";
		} else if (newPassword.length > 128) {
			errors.newPassword = "New password is too long (maximum 128 characters)";
		} else {
			// Complexity requirements (only check if length is valid)
			const hasUppercase = /[A-Z]/.test(newPassword);
			const hasLowercase = /[a-z]/.test(newPassword);
			const hasNumbers = /\d/.test(newPassword);
			const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

			const missingRequirements = [];
			if (!hasUppercase) {
				missingRequirements.push("uppercase letters");
			}
			if (!hasLowercase) {
				missingRequirements.push("lowercase letters");
			}
			if (!hasNumbers) {
				missingRequirements.push("numbers");
			}
			if (!hasSymbols) {
				missingRequirements.push("special characters");
			}

			if (missingRequirements.length > 0) {
				errors.newPassword = `Password must contain ${missingRequirements.join(", ")}`;
			} else {
				// Only check for same password if validation passes so far
				if (sanitizedData.currentPassword && sanitizedData.newPassword === sanitizedData.currentPassword) {
					errors.newPassword = "New password must be different from current password";
				}
			}
		}
	}

	// Validate password confirmation
	if (!sanitizedData.confirmPassword.trim()) {
		errors.confirmPassword = "Password confirmation is required";
	} else if (sanitizedData.newPassword !== sanitizedData.confirmPassword) {
		errors.confirmPassword = "Passwords do not match";
	}

	const isValid = Object.keys(errors).length === 0;

	const result: PasswordChangeValidationResult = {
		isValid,
		errors
	};

	if (isValid) {
		result.sanitizedData = sanitizedData;
	}

	return result;
}

/**
 * Create password change API request configuration
 * @param userId - The user ID to update password for
 * @param passwordData - The password change data
 * @returns Request configuration for password change API
 */
export function createPasswordChangeRequest(userId: string, passwordData: PasswordChangeData): PasswordChangeRequest {
	return {
		url: `/api/users/${userId}/password`,
		options: {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include" as RequestCredentials,
			body: JSON.stringify({
				currentPassword: passwordData.currentPassword,
				newPassword: passwordData.newPassword
			})
		}
	};
}

/**
 * Handle password change API response with comprehensive error handling
 * @param response - The fetch response from password change API
 * @returns Processed response data
 */
export async function handlePasswordChangeResponse(response: Response): Promise<PasswordChangeResponse> {
	try {
		// Try to parse JSON response
		const responseText = await response.text();

		if (!responseText.trim()) {
			return {
				success: false,
				message: "Invalid response from server"
			};
		}

		let responseData: { message?: string };
		try {
			responseData = JSON.parse(responseText) as { message?: string };
		} catch {
			return {
				success: false,
				message: "Invalid response format from server"
			};
		}

		// Handle different status codes
		switch (response.status) {
			case 200:
				return {
					success: true,
					message: responseData.message ?? "Password updated successfully"
				};

			case 400:
				return {
					success: false,
					message: responseData.message ?? "Invalid password data"
				};

			case 401:
				return {
					success: false,
					message: responseData.message ?? "Session expired. Please log in again.",
					requiresReauth: true
				};

			case 429:
				return {
					success: false,
					message: responseData.message ?? "Too many password change attempts. Please try again later.",
					rateLimited: true
				};

			case 500:
			default:
				return {
					success: false,
					message: responseData.message ?? "Server error occurred while updating password"
				};
		}
	} catch {
		return {
			success: false,
			message: "Network error occurred while updating password"
		};
	}
}
