/**
 * Login API Client Utilities
 * Pure functions extracted from login.ts following hybrid testing approach
 * These functions handle API request building and response parsing without DOM dependencies
 */

// Type definitions for login API
export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

export interface LoginApiResponse {
	success: true;
	message: string;
	user?: LoginUser;
}

export interface LoginApiError {
	success: false;
	message: string;
	error?: string;
	field?: string;
}

export type LoginApiResult = LoginApiResponse | LoginApiError;

// Internal interfaces for response parsing
interface ApiSuccessData {
	message?: string;
	user?: LoginUser;
	[key: string]: unknown;
}

interface ApiErrorData {
	message?: string;
	error?: string;
	field?: string;
	[key: string]: unknown;
}

/**
 * Create login request configuration
 * @param credentials - Login credentials
 * @returns RequestInit configuration for fetch
 */
export function createLoginRequest(credentials: LoginCredentials): RequestInit {
	return {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		credentials: "include" as RequestCredentials, // Important for session cookies
		body: JSON.stringify({
			email: credentials.email,
			password: credentials.password
		})
	};
}

/**
 * Create session check request configuration
 * @returns RequestInit configuration for session check
 */
export function createSessionCheckRequest(): RequestInit {
	return {
		method: "GET",
		credentials: "include" as RequestCredentials
	};
}

/**
 * Parse successful login response
 * @param data - Response data from login API
 * @returns Parsed login response
 */
export function parseLoginResponse(data: ApiSuccessData): LoginApiResponse {
	const response: LoginApiResponse = {
		success: true,
		message: data.message ?? ""
	};

	if (data.user) {
		response.user = data.user;
	}

	return response;
}

/**
 * Parse error response from login API
 * @param data - Error response data
 * @returns Parsed error response
 */
export function parseErrorResponse(data: ApiErrorData): LoginApiError {
	const response: LoginApiError = {
		success: false,
		message: data.message ?? ""
	};

	if (data.error) {
		response.error = data.error;
	}

	if (data.field) {
		response.field = data.field;
	}

	return response;
}

/**
 * Handle login API response with proper error handling
 * @param response - Fetch response object
 * @returns Parsed API result
 */
export async function handleLoginResponse(response: Response): Promise<LoginApiResult> {
	try {
		const data = (await response.json()) as ApiSuccessData | ApiErrorData;

		if (response.ok) {
			return parseLoginResponse(data);
		} else {
			return parseErrorResponse(data);
		}
	} catch (error) {
		// Handle cases where response doesn't have valid JSON
		return {
			success: false,
			message: "Unable to process server response. Please try again."
		};
	}
}
