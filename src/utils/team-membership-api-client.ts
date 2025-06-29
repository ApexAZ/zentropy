import type { UserRole } from "../models/User";
import type { ValidationResult } from "./team-membership-utils";

/**
 * Interface for add member API response
 */
export interface AddMemberApiResponse {
	membership: {
		id: string;
		userId: string;
		teamId: string;
		role: UserRole;
		joinedAt: string;
	};
	user: {
		id: string;
		email: string;
		displayName: string;
	};
	success: boolean;
	message: string;
	roleChanged?: boolean;
}

/**
 * Build URL for adding a member to a team
 *
 * @param teamId - ID of the team
 * @returns API endpoint URL for adding team member
 */
export function buildAddMemberUrl(teamId: string): string {
	return `/api/teams/${teamId}/members`;
}

/**
 * Create request configuration for adding a member to a team
 *
 * @param userId - ID of the user to add
 * @param role - Role to assign to the user
 * @returns RequestInit configuration object
 */
export function createAddMemberRequest(userId: string, role: UserRole): RequestInit {
	return {
		method: "POST",
		credentials: "include" as RequestCredentials,
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			userId,
			role
		})
	};
}

/**
 * Handle add member API response
 *
 * @param response - Fetch response object
 * @returns Promise<AddMemberApiResponse> - Parsed response data
 * @throws Error if response is not ok or parsing fails
 */
export async function handleAddMemberResponse(response: Response): Promise<AddMemberApiResponse> {
	if (!response.ok) {
		let errorMessage = "Failed to add user to team";
		try {
			const errorData = (await response.json()) as { message?: string };
			errorMessage = errorData.message ?? errorMessage;
		} catch {
			// If JSON parsing fails, use default message
		}
		throw new Error(errorMessage);
	}

	return (await response.json()) as AddMemberApiResponse;
}

/**
 * Validate parameters for adding member to team
 *
 * @param teamId - ID of the team
 * @param userId - ID of the user to add
 * @param role - Role to assign
 * @returns Validation result with errors if any
 */
export function validateAddMemberParams(teamId: string, userId: string, role: UserRole): ValidationResult {
	const errors: string[] = [];

	// Validate team ID
	if (!teamId || teamId.trim() === "") {
		errors.push("Team ID is required");
	} else if (/<[^>]*>/g.test(teamId)) {
		errors.push("Invalid characters in team ID");
	}

	// Validate user ID
	if (!userId || userId.trim() === "") {
		errors.push("User ID is required");
	} else if (/<[^>]*>/g.test(userId)) {
		errors.push("Invalid characters in user ID");
	}

	// Validate role
	const validRoles: UserRole[] = ["basic_user", "team_member", "team_lead"];
	if (!role || !validRoles.includes(role)) {
		errors.push("Invalid role specified");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Make complete API request to add user to team
 *
 * @param teamId - ID of the team
 * @param userId - ID of the user to add
 * @param role - Role to assign to the user
 * @returns Promise<AddMemberApiResponse> - Response data from API
 * @throws Error if validation fails or API request fails
 */
export async function makeAddMemberRequest(
	teamId: string,
	userId: string,
	role: UserRole
): Promise<AddMemberApiResponse> {
	// Validate parameters first
	const validation = validateAddMemberParams(teamId, userId, role);
	if (!validation.isValid) {
		throw new Error(validation.errors[0]); // Throw first validation error
	}

	try {
		const url = buildAddMemberUrl(teamId);
		const requestConfig = createAddMemberRequest(userId, role);

		const response = await fetch(url, requestConfig);
		return await handleAddMemberResponse(response);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Network error");
	}
}
