// Profile utilities for user profile management
// Following ESLint strict TypeScript standards

/**
 * User profile interface for type safety
 */
export interface UserProfile {
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

/**
 * Profile validation result interface
 */
export interface ProfileValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

/**
 * Profile update request configuration interface
 */
export interface ProfileUpdateRequest {
	url: string;
	options: {
		method: string;
		headers: Record<string, string>;
		credentials: RequestCredentials;
		body: string;
	};
}

/**
 * Profile input data for updates (subset of UserProfile)
 */
export interface ProfileUpdateData {
	first_name?: string;
	last_name?: string;
	email?: string;
	[key: string]: unknown;
}

/**
 * Fetches user profile data from the API
 * @param userId - The user ID to fetch profile for
 * @returns Promise resolving to user profile data
 * @throws Error for invalid responses or network issues
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
	if (!userId || userId.trim() === "") {
		throw new Error("User ID is required");
	}

	try {
		const response = await fetch(`/api/users/${userId}`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			credentials: "include"
		});

		if (!response.ok) {
			const errorData = (await response.json()) as { message?: string };
			const errorMessage = errorData.message ?? "Unknown error occurred";
			throw new Error(`Failed to fetch profile: ${errorMessage}`);
		}

		const profileData = (await response.json()) as UserProfile;
		return profileData;
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Failed to fetch profile")) {
			throw error;
		}
		throw new Error("Network error occurred while fetching profile");
	}
}

/**
 * Validates profile data for completeness and format
 * @param profileData - The profile data to validate
 * @returns Validation result with errors if any
 */
export function validateProfileData(profileData: Partial<UserProfile>): ProfileValidationResult {
	const errors: Record<string, string> = {};

	// Required field validation
	if (!profileData.id || profileData.id.trim() === "") {
		errors.id = "User ID is required";
	}

	if (!profileData.email || profileData.email.trim() === "") {
		errors.email = "Email is required";
	} else {
		// Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(profileData.email)) {
			errors.email = "Please enter a valid email address";
		}
	}

	if (!profileData.first_name || profileData.first_name.trim() === "") {
		errors.first_name = "First name is required";
	} else if (profileData.first_name.length > 100) {
		errors.first_name = "First name must be 100 characters or less";
	}

	if (!profileData.last_name || profileData.last_name.trim() === "") {
		errors.last_name = "Last name is required";
	} else if (profileData.last_name.length > 100) {
		errors.last_name = "Last name must be 100 characters or less";
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Sanitizes profile input to prevent XSS attacks
 * @param input - The profile input data to sanitize
 * @returns Sanitized profile data
 */
export function sanitizeProfileInput(input: ProfileUpdateData): ProfileUpdateData {
	const sanitized: ProfileUpdateData = {};

	// Helper function to sanitize individual string values
	const sanitizeString = (value: unknown): string => {
		if (value === null || value === undefined) {
			return "";
		}

		let stringValue = String(value);

		// Remove dangerous protocols - check for these first and return empty if found
		if (/^(javascript|data|vbscript):/gi.test(stringValue)) {
			// For data: URLs, completely remove them as they can contain arbitrary content
			if (/^data:/gi.test(stringValue)) {
				return "";
			}
			// For javascript: and vbscript:, remove the protocol part
			stringValue = stringValue.replace(/^(javascript|vbscript):/gi, "");
		}

		// Remove HTML tags and their contents for script, style, and other dangerous tags
		stringValue = stringValue.replace(/<(script|style|object|embed|iframe)[^>]*>.*?<\/\1>/gis, "");

		// Remove all remaining HTML tags
		stringValue = stringValue.replace(/<[^>]*>/g, "");

		// Remove HTML entities that could be used for XSS
		stringValue = stringValue.replace(/&[#\w]+;/g, "");

		return stringValue.trim();
	};

	// Sanitize each field
	if ("first_name" in input) {
		sanitized.first_name = sanitizeString(input.first_name);
	}

	if ("last_name" in input) {
		sanitized.last_name = sanitizeString(input.last_name);
	}

	if ("email" in input) {
		sanitized.email = sanitizeString(input.email);
	}

	// Copy other fields as-is (they should be validated separately)
	Object.keys(input).forEach(key => {
		if (!["first_name", "last_name", "email"].includes(key)) {
			sanitized[key] = input[key];
		}
	});

	return sanitized;
}

/**
 * Creates API request configuration for profile updates
 * @param userId - The user ID to update
 * @param profileData - The profile data to update
 * @returns Request configuration object
 */
export function createProfileUpdateRequest(userId: string, profileData: ProfileUpdateData): ProfileUpdateRequest {
	// Sanitize input data before creating request
	const sanitizedData = sanitizeProfileInput(profileData);

	return {
		url: `/api/users/${userId}`,
		options: {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include",
			body: JSON.stringify(sanitizedData)
		}
	};
}

/**
 * Handles API response from profile operations
 * @param response - The fetch Response object
 * @returns Promise resolving to response data
 * @throws Error for non-success responses
 */
export async function handleProfileApiResponse<T>(response: Response): Promise<T> {
	let responseData: { message?: string; errors?: Record<string, string> };

	try {
		responseData = (await response.json()) as { message?: string; errors?: Record<string, string> };
	} catch {
		throw new Error("Server returned invalid response");
	}

	if (response.ok) {
		return responseData as T;
	}

	// Handle specific error status codes
	const errorMessage = responseData.message ?? "An unexpected error occurred";

	switch (response.status) {
		case 400:
			throw new Error(errorMessage);
		case 401:
			throw new Error(errorMessage);
		case 403:
			throw new Error(errorMessage);
		case 429:
			throw new Error(errorMessage);
		case 500:
			throw new Error(errorMessage);
		default:
			throw new Error(errorMessage);
	}
}
