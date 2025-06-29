import type { UserRole } from "../models/User";
import type { ValidationResult } from "./team-invitation-utils";

/**
 * Interface for send invitation API response
 */
export interface SendInvitationApiResponse {
	invitation: {
		id: string;
		teamId: string;
		invitedEmail: string;
		role: UserRole;
		status: string;
		expiresAt: string;
	};
	message: string;
}

/**
 * Interface for invitation response API response
 */
export interface InvitationResponseApiResponse {
	membership?: {
		id: string;
		userId: string;
		teamId: string;
		role: UserRole;
		joinedAt: string;
	};
	user?: {
		id: string;
		email: string;
		displayName: string;
	};
	message: string;
}

/**
 * Build URL for sending team invitations
 *
 * @param teamId - ID of the team
 * @returns API endpoint URL for sending invitations
 */
export function buildInvitationUrl(teamId: string): string {
	return `/api/teams/${teamId}/invitations`;
}

/**
 * Build URL for responding to invitations
 *
 * @returns API endpoint URL for invitation responses
 */
export function buildInvitationResponseUrl(): string {
	return "/api/invitations/respond";
}

/**
 * Create request configuration for sending an invitation
 *
 * @param email - Email address to invite
 * @param role - Role to assign to the invited user
 * @returns RequestInit configuration object
 */
export function createSendInvitationRequest(email: string, role: UserRole): RequestInit {
	return {
		method: "POST",
		credentials: "include" as RequestCredentials,
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			email,
			role
		})
	};
}

/**
 * Create request configuration for responding to an invitation
 *
 * @param token - Invitation token
 * @param action - Accept or decline action
 * @returns RequestInit configuration object
 */
export function createInvitationResponseRequest(token: string, action: "accept" | "decline"): RequestInit {
	return {
		method: "POST",
		credentials: "include" as RequestCredentials,
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			token,
			action
		})
	};
}

/**
 * Handle invitation API response
 *
 * @param response - Fetch response object
 * @returns Promise<SendInvitationApiResponse | InvitationResponseApiResponse> - Parsed response data
 * @throws Error if response is not ok or parsing fails
 */
export async function handleInvitationApiResponse(
	response: Response
): Promise<SendInvitationApiResponse | InvitationResponseApiResponse> {
	if (!response.ok) {
		let errorMessage = "Failed to process invitation";
		try {
			const errorData = (await response.json()) as { message?: string };
			errorMessage = errorData.message ?? errorMessage;
		} catch {
			// If JSON parsing fails, use default message
		}
		throw new Error(errorMessage);
	}

	return (await response.json()) as SendInvitationApiResponse | InvitationResponseApiResponse;
}

/**
 * Validate parameters for sending invitation API request
 *
 * @param teamId - ID of the team
 * @param email - Email address to invite
 * @param role - Role to assign
 * @returns Validation result with errors if any
 */
export function validateInvitationApiParams(teamId: string, email: string, role: UserRole): ValidationResult {
	const errors: string[] = [];

	// Validate team ID
	if (!teamId || teamId.trim() === "") {
		errors.push("Team ID is required");
	} else if (/<[^>]*>/g.test(teamId)) {
		errors.push("Invalid characters in team ID");
	}

	// Validate email
	if (!email || email.trim() === "") {
		errors.push("Email is required");
	} else {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email) || /<[^>]*>/g.test(email)) {
			errors.push("Invalid email format");
		}
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
 * Make complete API request to send team invitation
 *
 * @param teamId - ID of the team
 * @param email - Email address to invite
 * @param role - Role to assign to the invited user
 * @returns Promise<SendInvitationApiResponse> - Response data from API
 * @throws Error if validation fails or API request fails
 */
export async function makeSendInvitationRequest(
	teamId: string,
	email: string,
	role: UserRole
): Promise<SendInvitationApiResponse> {
	// Validate parameters first
	const validation = validateInvitationApiParams(teamId, email, role);
	if (!validation.isValid) {
		throw new Error(validation.errors[0]); // Throw first validation error
	}

	try {
		const url = buildInvitationUrl(teamId);
		const requestConfig = createSendInvitationRequest(email, role);

		const response = await fetch(url, requestConfig);
		return (await handleInvitationApiResponse(response)) as SendInvitationApiResponse;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Network error");
	}
}

/**
 * Make complete API request to respond to invitation
 *
 * @param token - Invitation token
 * @param action - Accept or decline action
 * @returns Promise<InvitationResponseApiResponse> - Response data from API
 * @throws Error if API request fails
 */
export async function makeInvitationResponseRequest(
	token: string,
	action: "accept" | "decline"
): Promise<InvitationResponseApiResponse> {
	try {
		const url = buildInvitationResponseUrl();
		const requestConfig = createInvitationResponseRequest(token, action);

		const response = await fetch(url, requestConfig);
		return (await handleInvitationApiResponse(response)) as InvitationResponseApiResponse;
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error("Network error");
	}
}

/**
 * Validate invitation response parameters
 *
 * @param token - Invitation token
 * @param action - Accept or decline action
 * @returns Validation result with errors if any
 */
export function validateInvitationResponseParams(token: string, action: "accept" | "decline"): ValidationResult {
	const errors: string[] = [];

	// Validate token
	if (!token || token.trim() === "") {
		errors.push("Invitation token is required");
	} else if (/<[^>]*>/g.test(token)) {
		errors.push("Invalid characters in invitation token");
	}

	// Validate action
	const validActions: Array<"accept" | "decline"> = ["accept", "decline"];
	if (!action || !validActions.includes(action)) {
		errors.push("Invalid action. Must be 'accept' or 'decline'");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}
