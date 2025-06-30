/**
 * Consolidated Profile Core Utilities
 * Combines profile-business-logic, profile-coordination-utils, and profile-utils
 * into a single comprehensive module for all profile-related functionality
 */

import { sanitizeInput } from "./validation-core";
import { validateProfileFormData, createProfileDisplayData } from "./ui-core";

// ============= CONSTANTS AND OPTIMIZATIONS =============

/**
 * Pre-compiled regex for email validation - performance optimization
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Personal email domains for security recommendations - O(1) lookup
 */
const PERSONAL_EMAIL_DOMAINS = new Set(["gmail.com", "yahoo.com", "hotmail.com"]);

/**
 * Profile field weights for completeness calculation
 */
const PROFILE_FIELD_WEIGHTS = {
	TOTAL_FIELDS: 4,
	REQUIRED_FIELDS: ["first_name", "last_name", "email", "role"] as const
};

/**
 * Time constants for security recommendations
 */
const TIME_CONSTANTS = {
	DAYS_TO_MS: 1000 * 60 * 60 * 24,
	STALE_LOGIN_THRESHOLD_DAYS: 30
} as const;

// ============= TYPE DEFINITIONS =============

/**
 * Core user profile interface
 */
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

/**
 * Profile form data interface
 */
export interface ProfileFormData {
	first_name: string;
	last_name: string;
	email: string;
}

/**
 * Profile update data interface
 */
export interface ProfileUpdateData {
	first_name?: string;
	last_name?: string;
	email?: string;
	[key: string]: unknown;
}

/**
 * Business logic result interface
 */
export interface ProfileBusinessLogicResult {
	success: boolean;
	data?: unknown;
	error?: string;
	validationErrors?: Record<string, string>;
}

/**
 * Session information interface
 */
export interface SessionInfo {
	id: string;
	email: string;
	name: string;
	role: string;
}

/**
 * Possible states for the profile page
 */
export type ProfilePageState =
	| { type: "redirect_to_login" }
	| { type: "loading" }
	| { type: "show_profile"; profileData: UserProfile }
	| { type: "show_error"; errorMessage: string };

/**
 * Profile validation result interface
 */
export interface ProfileValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

/**
 * Profile update request interface
 */
export interface ProfileUpdateRequest {
	url: string;
	options: {
		method: string;
		headers: Record<string, string>;
		credentials: RequestCredentials;
		body: string;
	};
}

// ============= BUSINESS LOGIC FUNCTIONS =============

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
 * Used for profile completion indicators - optimized with constants
 */
export function calculateProfileCompleteness(userProfile: UserProfile): number {
	let completedFields = 0;

	// Optimized field checking with early returns
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

	return Math.round((completedFields / PROFILE_FIELD_WEIGHTS.TOTAL_FIELDS) * 100);
}

/**
 * Generate profile security recommendations
 * Based on profile data and activity patterns - optimized with constants
 */
export function generateSecurityRecommendations(userProfile: UserProfile): string[] {
	const recommendations: string[] = [];

	// Check last login with optimized time calculation
	if (!userProfile.last_login_at) {
		recommendations.push("Consider logging in regularly to keep your account secure");
	} else {
		const lastLogin = new Date(userProfile.last_login_at);
		const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / TIME_CONSTANTS.DAYS_TO_MS);

		if (daysSinceLogin > TIME_CONSTANTS.STALE_LOGIN_THRESHOLD_DAYS) {
			recommendations.push("It's been a while since your last login. Consider updating your password");
		}
	}

	// Check for weak name patterns - case insensitive comparison
	if (
		userProfile.first_name &&
		userProfile.last_name &&
		userProfile.first_name.toLowerCase() === userProfile.last_name.toLowerCase()
	) {
		recommendations.push("Consider using your full legal name for better account verification");
	}

	// Check email domain with optimized Set lookup - O(1) instead of array includes O(n)
	const emailDomain = userProfile.email?.split("@")[1];
	if (emailDomain && PERSONAL_EMAIL_DOMAINS.has(emailDomain.toLowerCase())) {
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

// ============= COORDINATION FUNCTIONS =============

/**
 * Determine the appropriate page state based on session, profile data, and errors
 * Pure function - easily testable
 */
export function determineProfilePageState(
	sessionInfo: SessionInfo | null,
	profileData: UserProfile | null,
	error: Error | null
): ProfilePageState {
	// No session - redirect to login
	if (!sessionInfo) {
		return { type: "redirect_to_login" };
	}

	// Error occurred - show error state
	if (error) {
		return {
			type: "show_error",
			errorMessage: error.message || "Failed to load profile"
		};
	}

	// No profile data yet - show loading
	if (!profileData) {
		return { type: "loading" };
	}

	// Success - show profile
	return {
		type: "show_profile",
		profileData
	};
}

/**
 * Extract profile form data from DOM elements
 */
export function extractProfileFormData(formElements: Record<string, { value: string }>): ProfileFormData {
	return {
		first_name: formElements.first_name?.value?.trim() ?? "",
		last_name: formElements.last_name?.value?.trim() ?? "",
		email: formElements.email?.value?.trim() ?? ""
	};
}

/**
 * Determine if submission should proceed based on validation
 */
export function shouldProceedWithSubmission(
	formData: ProfileFormData,
	validationResult: { isValid: boolean; errors: Record<string, string> }
): { proceed: boolean; reason?: string } {
	// Check validation errors
	if (!validationResult.isValid) {
		// Return the first validation error message if available
		const errorMessages = Object.values(validationResult.errors);
		const firstError = errorMessages.length > 0 ? (errorMessages[0] ?? "Validation failed") : "Validation failed";
		return {
			proceed: false,
			reason: firstError
		};
	}

	// Check for empty required fields
	const trimmedData = {
		first_name: formData.first_name.trim(),
		last_name: formData.last_name.trim(),
		email: formData.email.trim()
	};

	if (!trimmedData.first_name || !trimmedData.last_name || !trimmedData.email) {
		return {
			proceed: false,
			reason: "All fields are required"
		};
	}

	return { proceed: true };
}

/**
 * Create authentication error object
 */
export function createAuthError(error: Error): { type: "server"; message: string; redirectRequired: boolean } {
	return {
		type: "server",
		message: error.message || "Unknown error",
		redirectRequired: true
	};
}

/**
 * Get profile initialization steps based on session
 */
export function getProfileInitializationSteps(sessionInfo: SessionInfo | null): string[] {
	if (!sessionInfo) {
		return ["Redirect to login"];
	}

	const steps = [
		"Load user session",
		"Fetch profile data",
		"Initialize form",
		"Setup event handlers"
	];

	if (sessionInfo.role === "team_lead") {
		steps.push("Setup team lead permissions");
	}

	return steps;
}

// ============= API UTILITY FUNCTIONS =============

/**
 * Fetch user profile from API
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
	const response = await fetch(`/api/users/${userId}`, {
		method: "GET",
		credentials: "include",
		headers: {
			"Content-Type": "application/json"
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<UserProfile>;
}

/**
 * Validate profile data comprehensively
 */
export function validateProfileData(profileData: Partial<UserProfile>): ProfileValidationResult {
	const errors: Record<string, string> = {};

	// Validate required fields
	if (!profileData.id?.trim()) {
		errors.id = "ID is required";
	}

	if (!profileData.email?.trim()) {
		errors.email = "Email is required";
	} else {
		// Validate email format using pre-compiled regex
		if (!EMAIL_REGEX.test(profileData.email)) {
			errors.email = "Invalid email format";
		}
	}

	if (!profileData.first_name?.trim()) {
		errors.first_name = "First name is required";
	} else if (profileData.first_name.length > 50) {
		errors.first_name = "First name must be less than 50 characters";
	}

	if (!profileData.last_name?.trim()) {
		errors.last_name = "Last name is required";
	} else if (profileData.last_name.length > 50) {
		errors.last_name = "Last name must be less than 50 characters";
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Sanitize profile input to prevent XSS
 */
export function sanitizeProfileInput(input: ProfileUpdateData): ProfileUpdateData {
	const result: ProfileUpdateData = {};
	
	if (input.first_name !== undefined) {
		result.first_name = sanitizeInput(input.first_name);
	}
	if (input.last_name !== undefined) {
		result.last_name = sanitizeInput(input.last_name);
	}
	if (input.email !== undefined) {
		result.email = input.email; // Email doesn't need HTML sanitization, just validation
	}
	
	// Copy any additional properties
	Object.keys(input).forEach(key => {
		if (!["first_name", "last_name", "email"].includes(key)) {
			result[key] = input[key];
		}
	});
	
	return result;
}

/**
 * Create profile update request configuration
 */
export function createProfileUpdateRequest(userId: string, profileData: ProfileUpdateData): ProfileUpdateRequest {
	// Sanitize input data before creating request
	const sanitizedData = sanitizeProfileInput(profileData);

	return {
		url: `/api/users/${userId}`,
		options: {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include" as RequestCredentials,
			body: JSON.stringify(sanitizedData)
		}
	};
}

/**
 * Handle profile API response with proper error handling
 */
export async function handleProfileApiResponse<T>(response: Response): Promise<T> {
	if (response.ok) {
		return response.json() as Promise<T>;
	}

	// Handle error responses
	let errorMessage: string;
	try {
		const errorData = await response.json() as { error?: string };
		errorMessage = errorData.error ?? `Request failed: ${response.status} ${response.statusText}`;
	} catch {
		errorMessage = `Request failed: ${response.status} ${response.statusText}`;
	}

	throw new Error(errorMessage);
}