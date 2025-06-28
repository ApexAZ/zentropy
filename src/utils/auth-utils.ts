/**
 * Authentication Utilities
 * Session management, validation, and security utilities for frontend authentication
 * Follows security-first approach with comprehensive error handling
 */

// Type definitions
export interface SessionStatus {
	isValid: boolean;
	user: SessionInfo | null;
	error?: string;
	expired?: boolean;
}

export interface SessionInfo {
	id: string;
	email: string;
	name: string;
	role: string;
	lastCheck?: number;
}

export interface AuthError {
	type: "expired" | "unauthorized" | "network" | "server";
	message: string;
	redirectRequired: boolean;
}

// Constants
const SESSION_STORAGE_KEY = "user";
const SESSION_WARNING_ID = "session-warning";
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Check current session status with the server
 * Returns session validity and user information
 */
// API Response interfaces
interface SessionCheckResponse {
	user: SessionInfo;
}

interface ErrorResponse {
	message?: string;
}

export async function checkSessionStatus(): Promise<SessionStatus> {
	try {
		const response = await fetch("/api/users/session", {
			method: "GET",
			credentials: "include"
		});

		if (response.ok) {
			const data = await response.json() as SessionCheckResponse;
			return {
				isValid: true,
				user: data.user
			};
		}

		// Handle specific error status codes
		const errorData = await response.json() as ErrorResponse;
		const sessionStatus: SessionStatus = {
			isValid: false,
			user: null,
			error: errorData.message ?? "Authentication failed"
		};

		// Mark as expired for session timeout
		if (response.status === 419) {
			sessionStatus.expired = true;
		}

		return sessionStatus;

	} catch (error) {
		return {
			isValid: false,
			user: null,
			error: error instanceof Error ? error.message : "Network error"
		};
	}
}

/**
 * Check if session has expired based on last check time
 */
export function isSessionExpired(lastCheck: number, sessionDuration: number = DEFAULT_SESSION_DURATION): boolean {
	const now = Date.now();
	return (now - lastCheck) >= sessionDuration;
}

/**
 * Get session information from local storage
 * Returns null if no valid session data exists
 */
export function getSessionInfo(): SessionInfo | null {
	try {
		const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
		
		if (!sessionData || sessionData.trim() === "") {
			return null;
		}

		const parsed: unknown = JSON.parse(sessionData);
		
		// Validate that we have the required fields with type safety
		if (!parsed || 
			typeof parsed !== "object" || 
			parsed === null ||
			!("id" in parsed) || 
			!("email" in parsed) ||
			typeof (parsed as Record<string, unknown>).id !== "string" ||
			typeof (parsed as Record<string, unknown>).email !== "string") {
			return null;
		}

		return parsed as SessionInfo;
	} catch {
		// Invalid JSON or other parsing error
		return null;
	}
}

/**
 * Clear session information from local storage
 */
export function clearSessionInfo(): void {
	try {
		sessionStorage.removeItem(SESSION_STORAGE_KEY);
	} catch {
		// Handle cases where sessionStorage might not be available
		// Fail silently as this is cleanup code
	}
}

/**
 * Build return URL for login redirect
 * Excludes login.html to prevent redirect loops
 */
export function buildReturnUrl(): string {
	const currentPath = window.location.pathname;
	const currentSearch = window.location.search;
	
	// Don't create return URL if already on login page
	if (currentPath === "/login.html") {
		return "/login.html";
	}

	// Build the return URL with current page and query parameters
	const returnUrl = encodeURIComponent(currentPath + currentSearch);
	return `/login.html?return=${returnUrl}`;
}

/**
 * Validate return URL to prevent open redirect attacks
 * Only allows same-origin URLs and relative paths
 */
export function validateReturnUrl(url: string): boolean {
	if (!url || url.trim() === "") {
		return false;
	}

	const trimmedUrl = url.trim();

	// Block dangerous protocols
	const dangerousProtocols = ["javascript:", "data:", "vbscript:"];
	if (dangerousProtocols.some(protocol => 
		trimmedUrl.toLowerCase().startsWith(protocol.toLowerCase())
	)) {
		return false;
	}

	// Block protocol-relative URLs (could redirect to external sites)
	if (trimmedUrl.startsWith("//")) {
		return false;
	}

	// Allow relative URLs
	if (trimmedUrl.startsWith("/")) {
		return true;
	}

	// For absolute URLs, validate they're same-origin
	try {
		const urlObj = new URL(trimmedUrl);
		return urlObj.origin === window.location.origin;
	} catch {
		// Malformed URL
		return false;
	}
}

/**
 * Redirect to login page with optional return URL and message
 */
export function redirectToLogin(message?: string): void {
	let loginUrl = buildReturnUrl();
	
	if (message) {
		const separator = loginUrl.includes("?") ? "&" : "?";
		loginUrl += `${separator}message=${encodeURIComponent(message)}`;
	}

	window.location.href = loginUrl;
}

/**
 * Handle authentication errors with appropriate actions
 */
export function handleAuthError(error: AuthError): void {
	switch (error.type) {
		case "expired":
			// Clear session and redirect for expired sessions
			clearSessionInfo();
			if (error.redirectRequired) {
				redirectToLogin(error.message);
			}
			break;

		case "unauthorized":
			// Log warning for unauthorized access
			// eslint-disable-next-line no-console
			console.warn("Auth error:", error.message);
			if (error.redirectRequired) {
				redirectToLogin(error.message);
			}
			break;

		case "network":
			// Log network errors
			// eslint-disable-next-line no-console
			console.error("Network error during authentication:", error.message);
			break;

		case "server":
			// Log server errors
			// eslint-disable-next-line no-console
			console.error("Server error during authentication:", error.message);
			break;

		default:
			// Fallback for unknown error types
			// eslint-disable-next-line no-console
			console.error("Unknown authentication error:", error.message);
			break;
	}
}

/**
 * Show session warning to user
 * Creates warning element if it doesn't exist
 */
export function showSessionWarning(message?: string, minutesRemaining: number = 5): void {
	const warningId = SESSION_WARNING_ID;
	let warningElement = document.getElementById(warningId);

	// Create warning element if it doesn't exist
	if (!warningElement) {
		warningElement = document.createElement("div");
		warningElement.id = warningId;
		warningElement.className = "session-warning";
		document.body?.appendChild(warningElement);
	}

	// Set warning message
	const defaultMessage = `Your session will expire in ${minutesRemaining} minutes. Please save your work.`;
	warningElement.textContent = message ?? defaultMessage;
	
	// Show the warning
	warningElement.style.display = "block";
}

/**
 * Hide session warning
 */
export function hideSessionWarning(): void {
	const warningElement = document.getElementById(SESSION_WARNING_ID);
	if (warningElement) {
		warningElement.style.display = "none";
	}
}