/**
 * API client utilities for making HTTP requests
 * Pure functions for creating request configurations
 */

/**
 * Login request data interface
 */
export interface LoginRequestData {
	email: string;
	password: string;
}

/**
 * Login response data interface
 */
export interface LoginResponse {
	message: string;
	user?: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
	};
}

/**
 * API error response interface
 */
export interface ApiErrorResponse {
	message: string;
	error?: string;
	field?: string;
}

/**
 * Creates a fetch request configuration for login
 */
export function createLoginRequest(email: string, password: string): RequestInit {
	return {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		credentials: "include" as RequestCredentials,
		body: JSON.stringify({ email, password })
	};
}

/**
 * Creates a fetch request configuration for session check
 */
export function createSessionCheckRequest(): RequestInit {
	return {
		method: "GET",
		credentials: "include" as RequestCredentials
	};
}

/**
 * Handles API response and extracts typed data
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const errorData = (await response.json()) as ApiErrorResponse;
		throw new Error(errorData.message ?? "API request failed");
	}

	return response.json() as Promise<T>;
}

/**
 * Makes a login API request
 */
export async function makeLoginRequest(email: string, password: string): Promise<LoginResponse> {
	const response = await fetch("/api/users/login", createLoginRequest(email, password));
	return handleApiResponse<LoginResponse>(response);
}

/**
 * Makes a session check API request
 */
export async function makeSessionCheckRequest(): Promise<LoginResponse> {
	const response = await fetch("/api/users/session", createSessionCheckRequest());
	return handleApiResponse<LoginResponse>(response);
}
