/**
 * Profile Page Coordination Utilities
 *
 * Following hybrid testing pattern - extract coordination logic into pure functions
 * that can be tested independently from DOM manipulation.
 *
 * These functions handle the business logic of profile page state management,
 * leaving DOM manipulation to the UI layer.
 */

import type { UserProfile } from "./profile-utils.js";

/**
 * Possible states for the profile page
 */
export type ProfilePageState =
	| { type: "redirect_to_login" }
	| { type: "loading" }
	| { type: "show_profile"; profileData: UserProfile }
	| { type: "show_error"; errorMessage: string };

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
 * Profile form data interface
 */
export interface ProfileFormData {
	first_name: string;
	last_name: string;
	email: string;
}

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
 * Extract form data from an HTML form element
 * Pure function - easily testable
 */
export function extractProfileFormData(formElements: Record<string, { value: string }>): ProfileFormData {
	return {
		first_name: formElements.first_name?.value?.trim() ?? "",
		last_name: formElements.last_name?.value?.trim() ?? "",
		email: formElements.email?.value?.trim() ?? ""
	};
}

/**
 * Determine if a profile form submission should proceed
 * Pure function - easily testable
 */
export function shouldProceedWithSubmission(
	formData: ProfileFormData,
	validationResult: { isValid: boolean; errors: Record<string, string> }
): { proceed: boolean; reason?: string } {
	if (!validationResult.isValid) {
		const firstError = Object.values(validationResult.errors)[0];
		return {
			proceed: false,
			reason: firstError ?? "Validation failed"
		};
	}

	// Check for empty required fields
	if (!formData.first_name || !formData.last_name || !formData.email) {
		return {
			proceed: false,
			reason: "All fields are required"
		};
	}

	return { proceed: true };
}

/**
 * Create error object for authentication issues
 * Pure function - easily testable
 */
export function createAuthError(error: Error): { type: "server"; message: string; redirectRequired: boolean } {
	return {
		type: "server" as const,
		message: error.message || "Unknown error",
		redirectRequired: true
	};
}

/**
 * Determine the sequence of operations for profile initialization
 * Pure function - easily testable
 */
export function getProfileInitializationSteps(sessionInfo: SessionInfo | null): string[] {
	const steps: string[] = ["initialize_navigation"];

	if (!sessionInfo) {
		steps.push("redirect_to_login");
		return steps;
	}

	steps.push("show_loading_state", "fetch_profile_data", "setup_event_listeners");

	return steps;
}
