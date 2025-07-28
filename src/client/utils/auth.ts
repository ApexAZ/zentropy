/**
 * Authentication utilities for token management
 *
 * This module provides utilities for managing authentication tokens
 * across the application, supporting both session and persistent storage.
 *
 * Enhanced with improved atomic operations while maintaining backward compatibility.
 */

import { secureTokenStorage } from "./secure_storage";

/**
 * Get the current authentication token from storage
 * Maintains synchronous API for backward compatibility
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
	// Use synchronous approach for backward compatibility
	// Priority: sessionStorage first (current session), then localStorage (remember me)
	const sessionToken = sessionStorage.getItem("authToken");
	if (sessionToken) {
		return sessionToken;
	}

	const localToken = localStorage.getItem("authToken");
	if (localToken) {
		return localToken;
	}

	return null;
}

/**
 * Get the current authentication token from storage (async with atomic protection)
 * Recommended for new code that can handle async operations
 * @returns Promise resolving to the authentication token or null if not found
 */
export async function getAuthTokenAsync(): Promise<string | null> {
	return await secureTokenStorage.getToken();
}

/**
 * Set the authentication token in storage
 * Maintains synchronous API for backward compatibility
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
 * Set the authentication token in storage (async with atomic protection)
 * Recommended for new code that can handle async operations
 * @param token - The JWT token to store
 * @param remember - Whether to use persistent storage (localStorage) or session storage
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function setAuthTokenAsync(token: string, remember: boolean = false): Promise<boolean> {
	return await secureTokenStorage.setToken(token, remember);
}

/**
 * Clear all authentication tokens from storage
 * Maintains synchronous API for backward compatibility
 */
export function clearAuthToken(): void {
	localStorage.removeItem("authToken");
	sessionStorage.removeItem("authToken");
}

/**
 * Clear all authentication tokens from storage (async with atomic protection)
 * Recommended for new code that can handle async operations
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function clearAuthTokenAsync(): Promise<boolean> {
	return await secureTokenStorage.clearTokens();
}

/**
 * Check if user is currently authenticated
 * Maintains synchronous API for backward compatibility
 * @returns True if an authentication token exists
 */
export function isAuthenticated(): boolean {
	return getAuthToken() !== null;
}

/**
 * Check if user is currently authenticated (async with atomic protection)
 * Recommended for new code that can handle async operations
 * @returns Promise resolving to true if an authentication token exists
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
	return await secureTokenStorage.hasToken();
}

/**
 * Create authenticated fetch headers
 * Maintains synchronous API for backward compatibility
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
 * Create authenticated fetch headers (async with atomic protection)
 * Recommended for new code that can handle async operations
 * @returns Promise resolving to headers object with authentication and content type
 */
export async function createAuthHeadersAsync(): Promise<Record<string, string>> {
	const token = await secureTokenStorage.getToken();
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
 * Maintains existing API for backward compatibility
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

/**
 * Make an authenticated fetch request with atomic token handling
 * Enhanced version with better token consistency guarantees
 * @param url - The URL to fetch
 * @param options - Fetch options (method, body, etc.)
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @param retries - Number of retry attempts (default: 1)
 * @returns Promise resolving to the fetch Response
 */
export async function authenticatedFetchAtomic(
	url: string,
	options: RequestInit = {},
	timeout: number = 10000,
	retries: number = 1
): Promise<Response> {
	const headers = await createAuthHeadersAsync();

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

			// Check for token expiration and handle accordingly
			if (response.status === 401) {
				// Token may be invalid - clear it to prevent future use
				await secureTokenStorage.clearTokens();
			}

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

// ===== New Security-Enhanced Utilities =====

/**
 * Rotate authentication token for security
 * @param newToken - The new JWT token to store
 * @param currentRememberMe - Current storage mode (auto-detected if not provided)
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function rotateAuthToken(newToken: string, currentRememberMe?: boolean): Promise<boolean> {
	return await secureTokenStorage.rotateToken(newToken, currentRememberMe);
}

/**
 * Get current token storage mode
 * @returns Promise resolving to storage mode: "remember" | "session" | "none"
 */
export async function getTokenStorageMode(): Promise<"remember" | "session" | "none"> {
	return await secureTokenStorage.getStorageMode();
}

/**
 * Verify token storage consistency
 * Checks for conflicts or issues in token storage
 * @returns Promise resolving to consistency check results
 */
export async function verifyTokenConsistency(): Promise<{ consistent: boolean; issues: string[] }> {
	return await secureTokenStorage.verifyStorageConsistency();
}
