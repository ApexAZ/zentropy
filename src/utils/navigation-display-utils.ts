/**
 * Navigation Display Utilities
 *
 * Pure functions for navigation display logic, role formatting, and user interface utilities.
 * These utilities enable testing business logic without complex DOM simulation.
 */

import type { UserRole } from "../models/User";

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
 * Get user-friendly role display name
 *
 * @param role - User role from system
 * @returns Human-readable role name
 */
export function getRoleDisplayName(role: string): string {
	switch (role) {
		case "team_lead":
			return "Team Lead";
		case "team_member":
			return "Team Member";
		case "basic_user":
			return "User";
		default:
			return "User";
	}
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
		.replace(/<[^>]*>/g, "") // Remove HTML tags
		.replace(/[<>'"&()]/g, "") // Remove dangerous characters including parentheses
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
