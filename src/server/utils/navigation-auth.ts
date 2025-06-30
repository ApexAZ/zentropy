/**
 * Navigation Authentication Integration
 * Provides authentication-aware navigation functionality across all pages
 * Integrates with auth-utils for session management and security
 */

import { checkSessionStatus, clearSessionInfo, redirectToLogin, handleAuthError, type AuthError } from "./auth-core.js";

// Type definitions for navigation authentication
export interface UserDisplayInfo {
	name: string;
	role: string;
}

export interface NavigationElements {
	container: HTMLElement | null;
	userInfo: HTMLElement | null;
	logoutButton: HTMLElement | null;
}

// API Response interfaces following ESLint patterns
interface LogoutResponse {
	message: string;
}

interface ErrorResponse {
	message?: string;
}

/**
 * Initialize navigation with authentication state
 * Checks session and updates navigation accordingly
 */
export function initializeNavigation(containerId: string): void {
	if (typeof document === "undefined") {
		return;
	}

	const container = document.getElementById(containerId);
	if (!container) {
		// eslint-disable-next-line no-console
		console.warn(`Navigation container '${containerId}' not found`);
		return;
	}

	// Set up event listeners for logout functionality
	setupNavigationEventListeners(container);

	// Check authentication status and update navigation
	void checkAuthenticationOnLoad();
}

/**
 * Check authentication status on page load and update navigation
 */
export async function checkAuthenticationOnLoad(): Promise<void> {
	try {
		const sessionStatus = await checkSessionStatus();

		if (sessionStatus.isValid && sessionStatus.user) {
			// Update navigation for authenticated user
			updateNavigationState(true, {
				name: sessionStatus.user.name,
				role: sessionStatus.user.role
			});
		} else {
			// Handle unauthenticated state
			updateNavigationState(false);

			// Handle specific error cases
			if (sessionStatus.expired) {
				const authError: AuthError = {
					type: "expired",
					message: "Your session has expired. Please log in again.",
					redirectRequired: true
				};
				handleAuthError(authError);
			} else if (sessionStatus.error) {
				const authError: AuthError = {
					type: "unauthorized",
					message: sessionStatus.error,
					redirectRequired: true
				};
				handleAuthError(authError);
			}
		}
	} catch (error) {
		// Handle network or other errors
		// eslint-disable-next-line no-console
		console.error("Error checking authentication status:", error);

		updateNavigationState(false);

		const authError: AuthError = {
			type: "network",
			message: "Unable to verify authentication. Please check your connection.",
			redirectRequired: false
		};
		handleAuthError(authError);
	}
}

/**
 * Handle logout functionality
 * Calls logout API, clears session, and redirects to login
 */
export async function handleLogout(): Promise<void> {
	try {
		const response = await fetch("/api/users/logout", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			}
		});

		if (response.ok) {
			// Successful logout
			const data = (await response.json()) as LogoutResponse;
			// eslint-disable-next-line no-console
			console.log("Logout successful:", data.message);

			// Clear session data
			clearSessionInfo();

			// Update navigation state
			updateNavigationState(false);

			// Redirect to login page
			redirectToLogin();
		} else {
			// Handle logout API errors
			const errorData = (await response.json()) as ErrorResponse;
			const errorMessage = errorData.message ?? "Logout failed";

			// eslint-disable-next-line no-console
			console.error("Logout error:", errorMessage);

			// Still clear session locally even if server logout failed
			clearSessionInfo();
			updateNavigationState(false);

			// Redirect with error message
			redirectToLogin();
		}
	} catch (error) {
		// Handle network errors during logout
		const errorMessage = error instanceof Error ? error.message : "Network error during logout";
		// eslint-disable-next-line no-console
		console.error("Network error during logout:", errorMessage);

		// Clear session data locally
		clearSessionInfo();
		updateNavigationState(false);

		// Redirect to login with error message
		redirectToLogin();
	}
}

/**
 * Update navigation state based on authentication status
 * Shows/hides elements and updates user information
 */
export function updateNavigationState(isAuthenticated: boolean, userInfo?: UserDisplayInfo): void {
	const elements = getNavigationElements();

	if (isAuthenticated && userInfo) {
		// Show authenticated navigation elements
		showAuthenticatedNavigation(elements, userInfo);
	} else {
		// Show unauthenticated navigation state
		showUnauthenticatedNavigation(elements);
	}
}

/**
 * Set up event listeners for navigation elements
 */
function setupNavigationEventListeners(container: HTMLElement): void {
	// Use event delegation for logout button clicks
	container.addEventListener("click", (event: Event) => {
		const target = event.target as HTMLElement;
		const action = target.dataset.action;

		if (action === "logout") {
			event.preventDefault();
			void handleLogout();
		}
	});
}

/**
 * Get navigation DOM elements with null safety
 */
function getNavigationElements(): NavigationElements {
	if (typeof document === "undefined") {
		return { container: null, userInfo: null, logoutButton: null };
	}

	return {
		container: document.getElementById("nav-container"),
		userInfo: document.getElementById("user-info"),
		logoutButton: document.getElementById("logout-btn")
	};
}

/**
 * Show navigation elements for authenticated users
 */
function showAuthenticatedNavigation(elements: NavigationElements, userInfo: UserDisplayInfo): void {
	// Display user information
	if (elements.userInfo) {
		const roleDisplay = getRoleDisplayName(userInfo.role);
		elements.userInfo.textContent = `${userInfo.name} (${roleDisplay})`;
		elements.userInfo.style.display = "block";
	}

	// Show logout button
	if (elements.logoutButton) {
		elements.logoutButton.style.display = "block";
		elements.logoutButton.textContent = "Logout";
		elements.logoutButton.dataset.action = "logout";
	}

	// Add authenticated class to container for styling
	if (elements.container) {
		elements.container.classList.add("authenticated");
		elements.container.classList.remove("unauthenticated");
	}
}

/**
 * Show navigation elements for unauthenticated users
 */
function showUnauthenticatedNavigation(elements: NavigationElements): void {
	// Hide user information
	if (elements.userInfo) {
		elements.userInfo.style.display = "none";
		elements.userInfo.textContent = "";
	}

	// Hide logout button
	if (elements.logoutButton) {
		elements.logoutButton.style.display = "none";
		elements.logoutButton.textContent = "";
		delete elements.logoutButton.dataset.action;
	}

	// Add unauthenticated class to container for styling
	if (elements.container) {
		elements.container.classList.add("unauthenticated");
		elements.container.classList.remove("authenticated");
	}
}

/**
 * Get user-friendly role display name
 */
function getRoleDisplayName(role: string): string {
	switch (role) {
		case "team_lead":
			return "Team Lead";
		case "team_member":
			return "Team Member";
		default:
			return "User";
	}
}

/**
 * Create standardized navigation HTML structure
 * Ensures consistency across all pages
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
 * Initialize standardized navigation for any page
 * Creates consistent navigation structure and applies authentication state
 */
export function initializeStandardNavigation(containerId: string): void {
	if (typeof document === "undefined") {
		return;
	}

	const container = document.getElementById(containerId);
	if (!container) {
		// eslint-disable-next-line no-console
		console.warn(`Navigation container '${containerId}' not found`);
		return;
	}

	// Insert standardized navigation HTML
	container.innerHTML = createNavigationHTML();

	// Initialize authentication functionality
	initializeNavigation(containerId);
}
