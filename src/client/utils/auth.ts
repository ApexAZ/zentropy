/**
 * Authentication utilities for token management
 *
 * This module provides utilities for managing authentication tokens
 * across the application, supporting both session and persistent storage.
 */

/**
 * Get the current authentication token from storage
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
	// Check session storage first (temporary login)
	const sessionToken = sessionStorage.getItem("authToken");
	if (sessionToken) {
		return sessionToken;
	}

	// Check local storage for persistent login
	const localToken = localStorage.getItem("authToken");
	if (localToken) {
		return localToken;
	}

	return null;
}

/**
 * Set the authentication token in storage
 * @param token - The JWT token to store
 * @param remember - Whether to use persistent storage (localStorage) or session storage
 */
export function setAuthToken(token: string, remember: boolean = false): void {
	if (remember) {
		// Persistent login - use localStorage
		localStorage.setItem("authToken", token);
		// Clear session storage to avoid conflicts
		sessionStorage.removeItem("authToken");
	} else {
		// Session login - use sessionStorage
		sessionStorage.setItem("authToken", token);
		// Clear localStorage to avoid conflicts
		localStorage.removeItem("authToken");
	}
}

/**
 * Clear all authentication tokens from storage
 */
export function clearAuthToken(): void {
	localStorage.removeItem("authToken");
	sessionStorage.removeItem("authToken");
}

/**
 * Check if user is currently authenticated
 * @returns True if an authentication token exists
 */
export function isAuthenticated(): boolean {
	return getAuthToken() !== null;
}

/**
 * Create authenticated fetch headers
 * @returns Headers object with authentication and content type
 */
export function createAuthHeaders(): Record<string, string> {
	const token = getAuthToken();
	const headers: Record<string, string> = {
		"Content-Type": "application/json"
	};

	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return headers;
}

/**
 * Make an authenticated fetch request with timeout and retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @param retries - Number of retry attempts (default: 1)
 * @returns Promise resolving to the fetch Response
 */
export async function authenticatedFetch(
	url: string,
	options: RequestInit = {},
	timeout: number = 10000,
	retries: number = 1
): Promise<Response> {
	const headers = createAuthHeaders();

	const fetchWithTimeout = async (fetchUrl: string, fetchOptions: RequestInit): Promise<Response> => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(fetchUrl, {
				...fetchOptions,
				headers: {
					...headers,
					...fetchOptions.headers
				},
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === "AbortError") {
				throw new Error("Request timeout");
			}
			throw error;
		}
	};

	let lastError: Error;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			return await fetchWithTimeout(url, options);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Unknown error");

			// Only retry on network errors, not on HTTP error responses
			if (attempt < retries && (lastError.message === "Request timeout" || lastError.message.includes("fetch"))) {
				await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
				continue;
			}
		}
	}

	throw lastError!;
}
