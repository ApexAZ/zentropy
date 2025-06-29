import type { User, UserRole } from "../models/User";

/**
 * Interface for validation results
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Interface for team membership conflicts
 */
export interface MembershipConflictResult {
	canAdd: boolean;
	conflict: string | null;
}

/**
 * Interface for membership request data
 */
export interface MembershipRequest {
	userId: string;
	teamId: string;
	role: UserRole;
}

/**
 * Interface for existing team membership
 */
export interface TeamMembership {
	user_id: string;
	team_id: string;
	role: UserRole;
}

/**
 * Interface for membership database record
 */
export interface MembershipRecord {
	id: string;
	user_id: string;
	team_id: string;
	role: UserRole;
	joined_at: Date;
	created_at: Date;
	updated_at: Date;
}

/**
 * Interface for user data in responses
 */
export interface UserResponseData {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
}

/**
 * Interface for formatted membership response
 */
export interface MembershipResponse {
	membership: {
		id: string;
		userId: string;
		teamId: string;
		role: UserRole;
		joinedAt: Date;
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
 * Type for conflict types
 */
export type ConflictType = "duplicate_membership" | "role_conflict" | "unknown_conflict";

/**
 * Validate if a user can be added to a team
 *
 * @param user - User to validate
 * @param teamId - ID of the team
 * @returns Validation result with errors if any
 */
export function validateTeamMembership(user: User, teamId: string): ValidationResult {
	const errors: string[] = [];

	// Validate user ID
	if (!user.id || user.id.trim() === "") {
		errors.push("Invalid user ID");
	}

	// Validate team ID
	if (!teamId || teamId.trim() === "") {
		errors.push("Invalid team ID");
	}

	// Validate user is active
	if (!user.is_active) {
		errors.push("User account is not active");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Check if a user can be added to a team (no existing membership)
 *
 * @param userId - ID of the user to add
 * @param teamId - ID of the team
 * @param existingMembers - Array of existing team memberships
 * @returns Result indicating if user can be added and any conflicts
 */
export function canAddUserToTeam(
	userId: string,
	teamId: string,
	existingMembers: TeamMembership[]
): MembershipConflictResult {
	// Check if user is already a member of this team
	const existingMembership = existingMembers.find(member => member.user_id === userId && member.team_id === teamId);

	if (existingMembership) {
		return {
			canAdd: false,
			conflict: "User is already a member of this team"
		};
	}

	return {
		canAdd: true,
		conflict: null
	};
}

/**
 * Determine the appropriate role for a user when adding to a team
 *
 * @param currentRole - User's current role
 * @returns Role to assign for team membership
 */
export function determineUserRoleForTeam(currentRole: UserRole): UserRole {
	switch (currentRole) {
		case "basic_user":
			return "team_member"; // Promote basic users to team member
		case "team_member":
			return "team_member"; // Maintain team member role
		case "team_lead":
			return "team_lead"; // Maintain team lead role
		default:
			return "team_member"; // Default fallback
	}
}

/**
 * Create appropriate conflict message for membership issues
 *
 * @param conflictType - Type of conflict encountered
 * @param userName - Name of the user (optional)
 * @param teamName - Name of the team (optional)
 * @returns Formatted conflict message
 */
export function createMembershipConflictMessage(
	conflictType: ConflictType,
	userName: string = "User",
	teamName: string = "this team"
): string {
	const userDisplay = userName || "User";
	const teamDisplay = teamName || "this team";

	switch (conflictType) {
		case "duplicate_membership":
			return `${userDisplay} is already a member of ${teamDisplay}`;
		case "role_conflict":
			return `${userDisplay} cannot be added to ${teamDisplay} due to role restrictions`;
		case "unknown_conflict":
		default:
			return `Cannot add ${userDisplay} to ${teamDisplay}`;
	}
}

/**
 * Validate membership request data
 *
 * @param request - Membership request to validate
 * @returns Validation result with errors if any
 */
export function validateMembershipRequest(request: MembershipRequest): ValidationResult {
	const errors: string[] = [];

	// Validate userId
	if (!request.userId || request.userId.trim() === "") {
		errors.push("User ID is required");
	} else if (/<[^>]*>/g.test(request.userId)) {
		errors.push("Invalid characters in user ID");
	}

	// Validate teamId
	if (!request.teamId || request.teamId.trim() === "") {
		errors.push("Team ID is required");
	} else if (/<[^>]*>/g.test(request.teamId)) {
		errors.push("Invalid characters in team ID");
	}

	// Validate role
	const validRoles: UserRole[] = ["basic_user", "team_member", "team_lead"];
	if (!request.role || !validRoles.includes(request.role)) {
		errors.push("Invalid role specified");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Sanitize membership request data to prevent XSS and injection attacks
 *
 * @param request - Raw membership request data
 * @returns Sanitized membership request
 */
export function sanitizeMembershipData(request: MembershipRequest): MembershipRequest {
	return {
		userId: request.userId
			.trim()
			.replace(/<[^>]*>/g, "")
			.replace(/[()]/g, ""),
		teamId: request.teamId
			.trim()
			.replace(/<[^>]*>/g, "")
			.replace(/[()]/g, ""),
		role: request.role
	};
}

/**
 * Format membership response for API consumption
 *
 * @param membershipRecord - Database membership record
 * @param userData - User data for response
 * @param roleChanged - Whether user role was changed during addition
 * @returns Formatted response object
 */
export function formatMembershipResponse(
	membershipRecord: MembershipRecord,
	userData: UserResponseData,
	roleChanged: boolean = false
): MembershipResponse {
	const displayName = `${userData.first_name} ${userData.last_name}`.trim() || "User";

	let message = `${displayName} successfully added to team`;
	if (roleChanged) {
		message += ` and promoted to team member`;
	}

	return {
		membership: {
			id: membershipRecord.id,
			userId: membershipRecord.user_id,
			teamId: membershipRecord.team_id,
			role: membershipRecord.role,
			joinedAt: membershipRecord.joined_at
		},
		user: {
			id: userData.id,
			email: userData.email,
			displayName
		},
		success: true,
		message,
		roleChanged
	};
}
