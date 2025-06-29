import type { UserRole } from "../models/User";

/**
 * Interface for user search response from API
 */
export interface UserSearchResponse {
	users: Array<{
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: UserRole;
		is_active: boolean;
		created_at: string;
		updated_at: string;
	}>;
	query: string;
	roleFilter: string | null;
	limit: number;
	count: number;
	hasMore: boolean;
}

/**
 * Build search URL with query parameters
 *
 * @param query - Search query string
 * @param role - Optional role filter
 * @param limit - Result limit
 * @returns Complete search URL with parameters
 */
export function buildUserSearchUrl(query: string, role?: UserRole, limit: number = 20): string {
	const searchParams = new URLSearchParams();
	searchParams.append("q", query);
	if (role) {
		searchParams.append("role", role);
	}
	searchParams.append("limit", limit.toString());

	return `/api/users/search?${searchParams.toString()}`;
}

/**
 * Create request configuration for user search API call
 *
 * @param _query - Search query string (unused in request config)
 * @param _role - Optional role filter (unused in request config)
 * @param _limit - Result limit (unused in request config)
 * @returns RequestInit configuration object
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createUserSearchRequest(_query: string, _role?: UserRole, _limit?: number): RequestInit {
	return {
		method: "GET",
		credentials: "include" as RequestCredentials
	};
}

/**
 * Handle user search API response
 *
 * @param response - Fetch response object
 * @returns Promise<UserSearchResponse> - Parsed search results
 * @throws Error if response is not ok or parsing fails
 */
export async function handleUserSearchResponse(response: Response): Promise<UserSearchResponse> {
	if (!response.ok) {
		const errorData = (await response.json()) as { message: string };
		throw new Error(errorData.message);
	}

	return (await response.json()) as UserSearchResponse;
}

/**
 * Perform complete user search API call
 *
 * @param query - Search query string
 * @param role - Optional role filter
 * @param limit - Result limit
 * @returns Promise<UserSearchResponse> - Search results from API
 * @throws Error if API request fails
 */
export async function makeUserSearchRequest(
	query: string,
	role?: UserRole,
	limit: number = 20
): Promise<UserSearchResponse> {
	try {
		const url = buildUserSearchUrl(query, role, limit);
		const requestConfig = createUserSearchRequest(query, role, limit);

		const response = await fetch(url, requestConfig);
		return await handleUserSearchResponse(response);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Network error");
	}
}
