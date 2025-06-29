/**
 * Profile Business Logic
 * Pure functions extracted from profile.ts following hybrid testing approach
 * These functions handle core business logic without DOM dependencies for easy testing
 */

import { sanitizeInput } from "./validation.js";
import {
	validateProfileFormData,
	createProfileDisplayData,
	type ProfileFormData,
	type ProfileDisplayData
} from "./profile-ui-utils.js";

// Re-export types for test consumption
export type { ProfileFormData } from "./profile-ui-utils.js";

// Core profile interfaces
export interface UserProfile {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role?: "team_lead" | "team_member";
	is_active?: boolean;
	last_login_at?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ProfileUpdateData {
	first_name: string;
	last_name: string;
	email: string;
	[key: string]: unknown;
}

export interface ProfileBusinessLogicResult {
	success: boolean;
	data?: ProfileDisplayData;
	error?: string;
	validationErrors?: Record<string, string>;
}

export interface ProfileUpdateResult {
	success: boolean;
	data?: UserProfile;
	error?: string;
	validationErrors?: Record<string, string>;
}

/**
 * Process user profile data for display
 * Handles validation, sanitization, and formatting
 */
export function processProfileForDisplay(userProfile: UserProfile): ProfileBusinessLogicResult {
	try {
		// Validate required fields
		if (!userProfile.id || !userProfile.email) {
			return {
				success: false,
				error: "Invalid profile data: missing required fields"
			};
		}

		// Create display data using UI utilities
		const displayData = createProfileDisplayData(userProfile);

		return {
			success: true,
			data: displayData
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error processing profile"
		};
	}
}

/**
 * Validate and sanitize profile update data
 * Returns sanitized data if valid, or validation errors
 */
export function validateProfileUpdate(formData: ProfileFormData): ProfileBusinessLogicResult {
	try {
		// Use existing validation utility
		const validationResult = validateProfileFormData(formData);

		if (!validationResult.isValid) {
			return {
				success: false,
				validationErrors: validationResult.errors
			};
		}

		// Additional business logic validation
		if (validationResult.sanitizedData) {
			// Check for suspicious patterns in names
			const { first_name, last_name, email } = validationResult.sanitizedData;

			if (first_name.toLowerCase() === last_name.toLowerCase()) {
				return {
					success: false,
					validationErrors: {
						last_name: "Last name should be different from first name"
					}
				};
			}

			// Validate email domain (basic check)
			const emailParts = email.split("@");
			if (emailParts.length !== 2 || !emailParts[1]?.includes(".")) {
				return {
					success: false,
					validationErrors: {
						email: "Please enter a valid email address"
					}
				};
			}
		}

		return {
			success: true
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown validation error"
		};
	}
}

/**
 * Calculate profile completeness percentage
 * Used for profile completion indicators
 */
export function calculateProfileCompleteness(userProfile: UserProfile): number {
	let completedFields = 0;
	const totalFields = 4; // first_name, last_name, email, role

	if (userProfile.first_name?.trim()) {
		completedFields++;
	}
	if (userProfile.last_name?.trim()) {
		completedFields++;
	}
	if (userProfile.email?.trim()) {
		completedFields++;
	}
	if (userProfile.role) {
		completedFields++;
	}

	return Math.round((completedFields / totalFields) * 100);
}

/**
 * Generate profile security recommendations
 * Based on profile data and activity patterns
 */
export function generateSecurityRecommendations(userProfile: UserProfile): string[] {
	const recommendations: string[] = [];

	// Check last login
	if (!userProfile.last_login_at) {
		recommendations.push("Consider logging in regularly to keep your account secure");
	} else {
		const lastLogin = new Date(userProfile.last_login_at);
		const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

		if (daysSinceLogin > 30) {
			recommendations.push("It's been a while since your last login. Consider updating your password");
		}
	}

	// Check for weak name patterns
	if (
		userProfile.first_name &&
		userProfile.last_name &&
		userProfile.first_name.toLowerCase() === userProfile.last_name.toLowerCase()
	) {
		recommendations.push("Consider using your full legal name for better account verification");
	}

	// Check email domain
	const emailDomain = userProfile.email?.split("@")[1];
	if (emailDomain && ["gmail.com", "yahoo.com", "hotmail.com"].includes(emailDomain.toLowerCase())) {
		recommendations.push("Consider using your work email for better team integration");
	}

	return recommendations;
}

/**
 * Format profile data for API submission
 * Ensures data is properly formatted for backend
 */
export function formatProfileForSubmission(formData: ProfileFormData): ProfileUpdateData {
	return {
		first_name: sanitizeInput(formData.first_name.trim()),
		last_name: sanitizeInput(formData.last_name.trim()),
		email: formData.email.trim().toLowerCase()
	};
}

/**
 * Check if profile data has changed
 * Used to determine if save button should be enabled
 */
export function hasProfileChanged(original: UserProfile, updated: ProfileFormData): boolean {
	return (
		original.first_name !== updated.first_name.trim() ||
		original.last_name !== updated.last_name.trim() ||
		original.email !== updated.email.trim().toLowerCase()
	);
}

/**
 * Validate profile access permissions
 * Ensure user can edit the profile they're trying to access
 */
export function validateProfileAccess(currentUserId: string, profileUserId: string, currentUserRole: string): boolean {
	// Users can always edit their own profile
	if (currentUserId === profileUserId) {
		return true;
	}

	// Team leads can edit team member profiles
	if (currentUserRole === "team_lead") {
		return true;
	}

	// Team members cannot edit other profiles
	return false;
}
