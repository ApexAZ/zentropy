/**
 * Consolidated UI Core Utilities
 * Combines user-display-utils, navigation-display-utils, and profile-ui-utils
 * into a single comprehensive module for all UI-related functionality
 */

import type { User, UserRole } from "../models/User";
import { sanitizeInput } from "./validation-core";

// ============= TYPE DEFINITIONS =============

/**
 * Interface for formatted user display data
 */
export interface UserDisplayData {
	id: string;
	displayName: string;
	email: string;
	role: UserRole;
	roleDisplayName: string;
}

/**
 * Interface for user display information
 */
export interface UserDisplayInfo {
	name: string;
	role: string;
}

/**
 * Interface for navigation state data
 */
export interface NavigationStateData {
	isAuthenticated: boolean;
	userInfo?: UserDisplayInfo;
	containerClasses: string[];
	userInfoDisplay: {
		visible: boolean;
		text: string;
	};
	logoutButtonDisplay: {
		visible: boolean;
		text: string;
		action?: string;
	};
}

/**
 * Interface for logout workflow data
 */
export interface LogoutWorkflowData {
	apiUrl: string;
	requestConfig: RequestInit;
	successMessage: string;
	errorHandling: {
		clearSession: boolean;
		redirectToLogin: boolean;
	};
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
 * Profile form validation result
 */
export interface ProfileFormValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: ProfileFormData;
}

/**
 * Profile display data interface
 */
export interface ProfileDisplayData {
	fullName: string;
	roleText: string;
	roleBadgeClass: string;
	lastLoginFormatted: string;
	createdDateFormatted?: string;
	updatedDateFormatted?: string;
}

/**
 * Basic user profile interface for display data creation
 */
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

// ============= USER DISPLAY UTILITIES =============

/**
 * Format user data for display in search results
 *
 * @param user - User object to format
 * @returns UserDisplayData - Formatted display data
 */
export function formatUserForDisplay(user: User): UserDisplayData {
	return {
		id: user.id,
		displayName: `${user.first_name} ${user.last_name}`,
		email: user.email,
		role: user.role,
		roleDisplayName: formatRoleForDisplay(user.role)
	};
}

/**
 * Format user role for display
 *
 * @param role - User role to format
 * @returns Formatted role string for display
 */
export function formatRoleForDisplay(role: UserRole): string {
	return ROLE_DISPLAY_MAP[role] ?? role;
}

/**
 * Pre-compiled regexes for XSS prevention and input validation - optimized performance
 */
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]*>/;
const HTML_TAG_REGEX_GLOBAL = /<[^>]*>/g;
const DANGEROUS_CHARS_REGEX = /[<>'"&()]/g;
const NETWORK_ERROR_REGEX = /network|fetch|connection/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Role display mappings for performance optimization - O(1) lookups instead of switch statements
 */
const ROLE_DISPLAY_MAP: Record<UserRole, string> = {
	basic_user: "Basic User",
	team_member: "Team Member",
	team_lead: "Team Lead"
};

const ROLE_DISPLAY_MAP_NAVIGATION: Record<string, string> = {
	team_lead: "Team Lead",
	team_member: "Team Member",
	basic_user: "User"
};

/**
 * Sanitize search input to prevent XSS attacks
 *
 * @param input - Raw input string
 * @returns Sanitized input string with HTML tags and content removed
 */
export function sanitizeSearchInput(input: string): string {
	// Remove script tags and their content completely
	let sanitized = input.replace(SCRIPT_TAG_REGEX, "");
	// Remove all other HTML tags (keeping content)
	sanitized = sanitized.replace(HTML_TAG_REGEX_GLOBAL, "");
	return sanitized;
}

/**
 * Validate if user has permissions for team management
 *
 * @param user - User object to check permissions for
 * @returns true if user can manage teams, false otherwise
 */
export function validateTeamManagementPermissions(user: User): boolean {
	// Only team leads can manage team membership
	return user.role === "team_lead";
}

/**
 * Validate search query input
 *
 * @param query - Search query to validate
 * @returns true if query is valid, false otherwise
 */
export function validateSearchQuery(query: string): boolean {
	// Check for basic validation rules
	if (typeof query !== "string") {
		return false;
	}

	// Allow empty queries
	if (query.trim() === "") {
		return true;
	}

	// Check minimum length for meaningful search
	if (query.trim().length < 1) {
		return false;
	}

	// Check maximum length to prevent abuse
	if (query.length > 100) {
		return false;
	}

	// Check for basic XSS prevention (no HTML tags)
	if (HTML_TAG_REGEX.test(query)) {
		return false;
	}

	return true;
}

/**
 * Determine if search should be performed based on query length
 *
 * @param query - Search query string
 * @returns true if search should be performed, false otherwise
 */
export function shouldPerformSearch(query: string): boolean {
	const sanitized = sanitizeSearchInput(query).trim();
	return sanitized.length >= 2 || sanitized.length === 0;
}

/**
 * Create error message for display
 *
 * @param error - Error object or message
 * @param context - Context where error occurred
 * @returns Formatted error message for display
 */
export function createErrorMessage(error: unknown, context = "operation"): string {
	if (error instanceof Error) {
		return error.message;
	}
	return `Failed to ${context}`;
}

// Network error regex already defined above for consolidated regex section

/**
 * Determine if error is a network error that should show retry option
 *
 * @param error - Error object or message
 * @returns true if retry option should be shown, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		return NETWORK_ERROR_REGEX.test(error.message);
	}
	return false;
}

// ============= NAVIGATION DISPLAY UTILITIES =============

/**
 * Get user-friendly role display name
 *
 * @param role - User role from system
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: string): string {
	return ROLE_DISPLAY_MAP_NAVIGATION[role] ?? "User";
}

/**
 * Format user display text for navigation
 *
 * @param userInfo - User information object
 * @returns Formatted display string
 */
export function formatUserDisplayText(userInfo: UserDisplayInfo): string {
	const roleDisplay = getRoleDisplayName(userInfo.role);
	return `${userInfo.name} (${roleDisplay})`;
}

/**
 * Determine navigation state based on authentication status
 *
 * @param isAuthenticated - Whether user is authenticated
 * @param userInfo - User information (required if authenticated)
 * @returns Complete navigation state configuration
 */
export function calculateNavigationState(isAuthenticated: boolean, userInfo?: UserDisplayInfo): NavigationStateData {
	if (isAuthenticated && userInfo) {
		return {
			isAuthenticated: true,
			userInfo,
			containerClasses: ["authenticated"],
			userInfoDisplay: {
				visible: true,
				text: formatUserDisplayText(userInfo)
			},
			logoutButtonDisplay: {
				visible: true,
				text: "Logout",
				action: "logout"
			}
		};
	}

	return {
		isAuthenticated: false,
		containerClasses: ["unauthenticated"],
		userInfoDisplay: {
			visible: false,
			text: ""
		},
		logoutButtonDisplay: {
			visible: false,
			text: ""
		}
	};
}

/**
 * Create logout API request configuration
 *
 * @returns Request configuration for logout API call
 */
export function createLogoutRequest(): RequestInit {
	return {
		method: "POST",
		credentials: "include" as RequestCredentials,
		headers: {
			"Content-Type": "application/json"
		}
	};
}

/**
 * Build logout API URL
 *
 * @returns URL for logout endpoint
 */
export function buildLogoutApiUrl(): string {
	return "/api/users/logout";
}

/**
 * Create logout workflow configuration
 *
 * @returns Complete logout workflow data
 */
export function createLogoutWorkflow(): LogoutWorkflowData {
	return {
		apiUrl: buildLogoutApiUrl(),
		requestConfig: createLogoutRequest(),
		successMessage: "You have been logged out successfully.",
		errorHandling: {
			clearSession: true,
			redirectToLogin: true
		}
	};
}

/**
 * Determine logout redirect message based on response
 *
 * @param success - Whether logout was successful
 * @param errorMessage - Error message if unsuccessful
 * @returns Appropriate redirect message
 */
export function getLogoutRedirectMessage(success: boolean, errorMessage?: string): string {
	if (success) {
		return "You have been logged out successfully.";
	}

	if (errorMessage) {
		return `Logout incomplete: ${errorMessage}`;
	}

	return "Network error during logout. Please try again.";
}

/**
 * Validate user role for display purposes
 *
 * @param role - Role string to validate
 * @returns Whether role is a valid user role
 */
export function isValidUserRole(role: string): role is UserRole {
	const validRoles: UserRole[] = ["basic_user", "team_member", "team_lead"];
	return validRoles.includes(role as UserRole);
}

// Dangerous chars regex already defined above for consolidated regex section

/**
 * Sanitize user display name to prevent XSS
 *
 * @param name - User name to sanitize
 * @returns Sanitized name safe for display
 */
export function sanitizeUserDisplayName(name: string): string {
	if (!name || typeof name !== "string") {
		return "";
	}

	return name
		.trim()
		.replace(SCRIPT_TAG_REGEX, "") // Remove script tags and their content completely for security
		.replace(HTML_TAG_REGEX_GLOBAL, "") // Remove other HTML tags but keep content
		.replace(DANGEROUS_CHARS_REGEX, "") // Remove dangerous characters including parentheses
		.substring(0, 100); // Limit length
}

/**
 * Create safe user display info with validation and sanitization
 *
 * @param name - User name
 * @param role - User role
 * @returns Validated and sanitized user display info
 */
export function createSafeUserDisplayInfo(name: string, role: string): UserDisplayInfo {
	return {
		name: sanitizeUserDisplayName(name),
		role: isValidUserRole(role) ? role : "basic_user"
	};
}

/**
 * Generate standardized navigation HTML structure
 *
 * @returns HTML string for navigation
 */
export function createNavigationHTML(): string {
	return `
		<div class="logo">
			<h1>Capacity Planner</h1>
		</div>
		<ul class="nav-menu">
			<li><a href="team-configuration.html">Dashboard</a></li>
			<li><a href="teams.html">Teams</a></li>
			<li><a href="calendar.html">Calendar</a></li>
		</ul>
		<div class="nav-auth">
			<div id="user-info" class="user-info" style="display: none;"></div>
			<button id="logout-btn" class="btn btn-secondary logout-btn" style="display: none;" data-action="logout">
				Logout
			</button>
		</div>
	`;
}

/**
 * Determine CSS classes for navigation container based on auth state
 *
 * @param isAuthenticated - Authentication status
 * @returns Array of CSS classes to apply
 */
export function getNavigationContainerClasses(isAuthenticated: boolean): string[] {
	return isAuthenticated ? ["authenticated"] : ["unauthenticated"];
}

/**
 * Calculate element visibility based on authentication state
 *
 * @param isAuthenticated - Authentication status
 * @returns Visibility configuration for navigation elements
 */
export function calculateElementVisibility(isAuthenticated: boolean): {
	userInfo: boolean;
	logoutButton: boolean;
} {
	return {
		userInfo: isAuthenticated,
		logoutButton: isAuthenticated
	};
}

/**
 * Create error handling configuration for logout scenarios
 *
 * @param errorType - Type of error that occurred
 * @returns Error handling configuration
 */
export function createLogoutErrorConfig(errorType: "api" | "network" | "timeout"): {
	clearSession: boolean;
	redirectToLogin: boolean;
	defaultMessage: string;
} {
	switch (errorType) {
		case "api":
			return {
				clearSession: true,
				redirectToLogin: true,
				defaultMessage: "Logout incomplete due to server error"
			};
		case "network":
			return {
				clearSession: true,
				redirectToLogin: true,
				defaultMessage: "Network error during logout. Please try again."
			};
		case "timeout":
			return {
				clearSession: true,
				redirectToLogin: true,
				defaultMessage: "Logout timed out. Please try again."
			};
		default:
			return {
				clearSession: true,
				redirectToLogin: true,
				defaultMessage: "Logout failed. Please try again."
			};
	}
}

// ============= PROFILE UI UTILITIES =============

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

		// Format: "January 15, 2024 (2 days ago)" - use UTC to avoid timezone issues
		const formatted = date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "UTC"
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

// Email regex already defined above for consolidated regex section

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
	if (!formData.email.trim()) {
		errors.email = "Email is required";
	} else if (!EMAIL_REGEX.test(formData.email.trim())) {
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
