import type { User, UserRole } from "../models/User";

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
	switch (role) {
		case "basic_user":
			return "Basic User";
		case "team_member":
			return "Team Member";
		case "team_lead":
			return "Team Lead";
		default:
			return role;
	}
}

/**
 * Sanitize search input to prevent XSS attacks
 *
 * @param input - Raw input string
 * @returns Sanitized input string with HTML tags and content removed
 */
export function sanitizeSearchInput(input: string): string {
	// Remove script tags and their content completely
	let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
	// Remove all other HTML tags (keeping content)
	sanitized = sanitized.replace(/<[^>]*>/g, "");
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
	if (/<[^>]*>/g.test(query)) {
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
export function createErrorMessage(error: unknown, context: string = "operation"): string {
	if (error instanceof Error) {
		return error.message;
	}
	return `Failed to ${context}`;
}

/**
 * Determine if error is a network error that should show retry option
 *
 * @param error - Error object or message
 * @returns true if retry option should be shown, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.toLowerCase().includes("network") ||
			error.message.toLowerCase().includes("fetch") ||
			error.message.toLowerCase().includes("connection")
		);
	}
	return false;
}
