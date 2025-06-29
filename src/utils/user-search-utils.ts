import { UserModel } from "../models/User";
import type { User, UserRole } from "../models/User";

/**
 * Interface for user search parameters
 */
export interface UserSearchParams {
	query: string;
	role?: UserRole | undefined;
	currentUserId: string;
	limit: number;
}

/**
 * Sanitized user data for search results (without password hash)
 */
export interface SanitizedUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: UserRole;
	is_active: boolean;
	last_login_at: Date | null;
	created_at: Date;
	updated_at: Date;
}

/**
 * Search users by email, first name, or last name with case-insensitive matching
 * 
 * @param users - Array of users to search through
 * @param query - Search query string
 * @returns Filtered array of users matching the search query
 */
export function searchUsers(users: User[], query: string): User[] {
	// If query is empty, return all active users
	if (!query.trim()) {
		return users.filter(user => user.is_active);
	}

	const searchTerm = query.toLowerCase().trim();
	
	return users.filter(user => {
		// Only search active users
		if (!user.is_active) {
			return false;
		}

		// Search in email, first name, and last name
		const email = user.email.toLowerCase();
		const firstName = user.first_name.toLowerCase();
		const lastName = user.last_name.toLowerCase();

		return email.includes(searchTerm) || 
			firstName.includes(searchTerm) || 
			lastName.includes(searchTerm);
	});
}

/**
 * Filter users by their role
 * 
 * @param users - Array of users to filter
 * @param role - User role to filter by
 * @returns Filtered array of users with the specified role
 */
export function filterUsersByRole(users: User[], role: UserRole): User[] {
	return users.filter(user => user.role === role);
}

/**
 * Exclude the current user from the search results
 * 
 * @param users - Array of users to filter
 * @param currentUserId - ID of the current user to exclude
 * @returns Filtered array of users without the current user
 */
export function excludeCurrentUser(users: User[], currentUserId: string): User[] {
	return users.filter(user => user.id !== currentUserId);
}

/**
 * Remove sensitive data (password hash) from user object for search results
 * 
 * @param user - User object to sanitize
 * @returns Sanitized user object without password hash
 */
export function sanitizeUserForSearch(user: User): SanitizedUser {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password_hash, ...sanitizedUser } = user;
	return sanitizedUser;
}

/**
 * Perform comprehensive user search with filtering, exclusion, and sanitization
 * 
 * This function orchestrates the complete user search workflow:
 * 1. Fetch all users from the database
 * 2. Apply search query filtering
 * 3. Apply role filtering (if specified)
 * 4. Exclude current user from results
 * 5. Apply result limit
 * 6. Sanitize user data for safe response
 * 
 * @param params - Search parameters including query, role filter, current user, and limit
 * @returns Promise<SanitizedUser[]> - Array of sanitized users matching search criteria
 * @throws Error if database query fails
 */
export async function performUserSearch(params: UserSearchParams): Promise<SanitizedUser[]> {
	const { query, role, currentUserId, limit } = params;

	try {
		// Fetch all users from database
		const allUsers = await UserModel.findAll();

		// Apply search query filtering
		let filteredUsers = searchUsers(allUsers, query);

		// Apply role filtering if specified
		if (role) {
			filteredUsers = filterUsersByRole(filteredUsers, role);
		}

		// Exclude current user from results
		filteredUsers = excludeCurrentUser(filteredUsers, currentUserId);

		// Apply limit to results
		const limitedUsers = filteredUsers.slice(0, limit);

		// Sanitize user data for response
		return limitedUsers.map(user => sanitizeUserForSearch(user));
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error performing user search:", error);
		throw error;
	}
}

/**
 * Validate user search query to prevent potential issues
 * 
 * @param query - Search query to validate
 * @returns true if query is valid, false otherwise
 */
export function validateSearchQuery(query: string): boolean {
	// Check for basic validation rules
	if (typeof query !== "string") {
		return false;
	}

	// Allow empty queries (returns all active users)
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
 * Validate search limit parameter
 * 
 * @param limit - Limit value to validate
 * @returns Validated and normalized limit value
 */
export function validateSearchLimit(limit: number): number {
	// Default limit if not provided or invalid
	if (!limit || typeof limit !== "number" || isNaN(limit)) {
		return 20;
	}

	// Minimum limit
	if (limit < 1) {
		return 1;
	}

	// Maximum limit to prevent performance issues
	if (limit > 100) {
		return 100;
	}

	return Math.floor(limit);
}

/**
 * Check if user has permission to search for other users
 * Only team_lead users can search for users to add to teams
 * 
 * @param userRole - Role of the user performing the search
 * @returns true if user has search permission, false otherwise
 */
export function hasUserSearchPermission(userRole: UserRole): boolean {
	// Only team leads can search for users to add to teams
	return userRole === "team_lead";
}