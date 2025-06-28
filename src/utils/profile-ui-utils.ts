/**
 * Profile UI Utilities
 * Pure functions extracted from profile.ts following hybrid testing approach
 * These functions handle UI logic without DOM dependencies for easy testing
 */

// Import only what we need - not the object sanitizer
import { sanitizeInput } from "./validation.js";

// Type definitions for profile UI utilities
export interface ProfileFormData {
	first_name: string;
	last_name: string;
	email: string;
}

export interface ProfileFormValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: ProfileFormData;
}

export interface ProfileDisplayData {
	fullName: string;
	roleText: string;
	roleBadgeClass: string;
	lastLoginFormatted: string;
	createdDateFormatted?: string;
	updatedDateFormatted?: string;
}

// Basic user profile interface for display data creation
interface UserProfileBase {
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
 * Format dates for profile display with relative time
 * @param dateString - The date string to format (ISO format or null)
 * @returns Formatted date HTML string with relative time
 */
export function formatProfileDates(dateString: string | null): string {
	if (!dateString) {
		return "Never";
	}

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return "Invalid date";
		}

		// Format: "January 15, 2024 (2 days ago)"
		const formatted = date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		});

		// Calculate relative time
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		let relative = "";
		if (diffDays === 0) {
			relative = "today";
		} else if (diffDays === 1) {
			relative = "1 day ago";
		} else if (diffDays < 30) {
			relative = `${diffDays} days ago`;
		} else if (diffDays < 365) {
			const months = Math.floor(diffDays / 30);
			relative = months === 1 ? "1 month ago" : `${months} months ago`;
		} else {
			const years = Math.floor(diffDays / 365);
			relative = years === 1 ? "1 year ago" : `${years} years ago`;
		}

		return `<span class="date-formatted">${formatted}</span> <span class="date-relative">(${relative})</span>`;

	} catch {
		return "Invalid date";
	}
}

/**
 * Get CSS class for role badge
 * @param role - The user role
 * @returns CSS class name for the role badge
 */
export function getRoleBadgeClass(role?: "team_lead" | "team_member"): string {
	return role === "team_lead" ? "team-lead" : "team-member";
}

/**
 * Format user's full name with fallback
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Formatted full name or "Unknown User" fallback
 */
export function formatUserName(firstName: string, lastName: string): string {
	const trimmedFirst = firstName.trim();
	const trimmedLast = lastName.trim();
	
	if (!trimmedFirst && !trimmedLast) {
		return "Unknown User";
	}
	
	if (!trimmedFirst) {
		return trimmedLast;
	}
	
	if (!trimmedLast) {
		return trimmedFirst;
	}
	
	return `${trimmedFirst} ${trimmedLast}`;
}

/**
 * Validate profile form data with sanitization
 * @param formData - The form data to validate
 * @returns Validation result with errors and sanitized data
 */
export function validateProfileFormData(formData: ProfileFormData): ProfileFormValidationResult {
	const errors: Record<string, string> = {};
	
	// Validate first name
	if (!formData.first_name.trim()) {
		errors.first_name = "First name is required";
	} else if (formData.first_name.length > 50) {
		errors.first_name = "First name must be less than 50 characters";
	}
	
	// Validate last name
	if (!formData.last_name.trim()) {
		errors.last_name = "Last name is required";
	} else if (formData.last_name.length > 50) {
		errors.last_name = "Last name must be less than 50 characters";
	}
	
	// Validate email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!formData.email.trim()) {
		errors.email = "Email is required";
	} else if (!emailRegex.test(formData.email)) {
		errors.email = "Please enter a valid email address";
	} else if (formData.email.length > 255) {
		errors.email = "Email must be less than 255 characters";
	}
	
	// Sanitize the data (remove XSS)
	const sanitizedData: ProfileFormData = {
		first_name: sanitizeInput(formData.first_name),
		last_name: sanitizeInput(formData.last_name),
		email: formData.email.trim().toLowerCase()
	};
	
	return {
		isValid: Object.keys(errors).length === 0,
		errors,
		sanitizedData
	};
}

/**
 * Create profile display data from user profile
 * @param userProfile - The user profile data
 * @returns Formatted display data for the UI
 */
export function createProfileDisplayData(userProfile: UserProfileBase): ProfileDisplayData {
	const fullName = formatUserName(userProfile.first_name, userProfile.last_name);
	const roleText = userProfile.role === "team_lead" ? "Team Lead" : "Team Member";
	const roleBadgeClass = getRoleBadgeClass(userProfile.role);
	const lastLoginFormatted = formatProfileDates(userProfile.last_login_at ?? null);
	
	const result: ProfileDisplayData = {
		fullName,
		roleText,
		roleBadgeClass,
		lastLoginFormatted
	};
	
	// Add optional formatted dates if available
	if (userProfile.created_at) {
		result.createdDateFormatted = formatProfileDates(userProfile.created_at);
	}
	
	if (userProfile.updated_at) {
		result.updatedDateFormatted = formatProfileDates(userProfile.updated_at);
	}
	
	return result;
}