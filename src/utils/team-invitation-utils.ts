import crypto from "crypto";
import type { UserRole } from "../models/User";

/**
 * Interface for invitation data input
 */
export interface InvitationData {
	teamId: string;
	invitedEmail: string;
	invitedBy: string;
	role: UserRole;
}

/**
 * Interface for invitation response (accept/decline)
 */
export interface InvitationResponse {
	token: string;
	action: "accept" | "decline";
}

/**
 * Interface for validation results
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

/**
 * Type for invitation status
 */
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

/**
 * Interface for invitation database record
 */
export interface InvitationRecord {
	id: string;
	team_id: string;
	invited_email: string;
	invited_by: string;
	role: UserRole;
	status: InvitationStatus;
	token: string;
	expires_at: Date;
	created_at: Date;
	updated_at: Date;
}

/**
 * Interface for formatted invitation response
 */
export interface FormattedInvitation {
	id: string;
	teamId: string;
	teamName: string;
	invitedEmail: string;
	inviterName: string;
	role: UserRole;
	status: InvitationStatus;
	expiresAt: string;
	createdAt: string;
	message: string;
}

/**
 * Validate invitation data for creating new invitations
 * 
 * @param data - Invitation data to validate
 * @returns Validation result with errors if any
 */
export function validateInvitationData(data: InvitationData): ValidationResult {
	const errors: string[] = [];

	// Validate team ID
	if (!data.teamId || typeof data.teamId !== "string" || data.teamId.trim() === "") {
		errors.push("Team ID is required");
	} else if (/<[^>]*>/g.test(data.teamId)) {
		errors.push("Invalid characters in team ID");
	}

	// Validate invited email
	if (!data.invitedEmail || typeof data.invitedEmail !== "string" || data.invitedEmail.trim() === "") {
		errors.push("Invited email is required");
	} else {
		// Check email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(data.invitedEmail) || /<[^>]*>/g.test(data.invitedEmail)) {
			errors.push("Invalid email format");
		} else if (data.invitedEmail.length > 320) { // RFC 5321 limit
			errors.push("Email is too long");
		}
	}

	// Validate inviter ID
	if (!data.invitedBy || typeof data.invitedBy !== "string" || data.invitedBy.trim() === "") {
		errors.push("Inviter ID is required");
	} else if (/<[^>]*>/g.test(data.invitedBy)) {
		errors.push("Invalid characters in inviter ID");
	}

	// Validate role
	const validRoles: UserRole[] = ["basic_user", "team_member", "team_lead"];
	if (!data.role || !validRoles.includes(data.role)) {
		errors.push("Invalid role specified");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Sanitize invitation data to prevent XSS and injection attacks
 * 
 * @param data - Raw invitation data
 * @returns Sanitized invitation data
 */
export function sanitizeInvitationData(data: InvitationData): InvitationData {
	return {
		teamId: data.teamId.trim().replace(/<[^>]*>/g, "").replace(/[()[\]]/g, ""),
		invitedEmail: data.invitedEmail.trim(), // Email format validation handles security
		invitedBy: data.invitedBy.trim().replace(/<[^>]*>/g, "").replace(/[()[\]]/g, ""),
		role: data.role
	};
}

/**
 * Create a cryptographically secure invitation token
 * 
 * @returns Secure random token string
 */
export function createInvitationToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

/**
 * Check if an invitation has expired
 * 
 * @param expiresAt - Expiration date of the invitation
 * @returns True if invitation has expired
 */
export function isInvitationExpired(expiresAt: Date): boolean {
	return expiresAt.getTime() <= Date.now();
}

/**
 * Check if a user can invite others to a team based on their role
 * 
 * @param userRole - Role of the user attempting to invite
 * @returns True if user can send invitations
 */
export function canUserInviteToTeam(userRole: UserRole): boolean {
	return userRole === "team_lead";
}

/**
 * Validate invitation response (accept/decline action)
 * 
 * @param response - Invitation response data
 * @returns Validation result with errors if any
 */
export function validateInvitationResponse(response: InvitationResponse): ValidationResult {
	const errors: string[] = [];

	// Validate token
	if (!response.token || response.token.trim() === "") {
		errors.push("Invitation token is required");
	} else if (/<[^>]*>/g.test(response.token)) {
		errors.push("Invalid characters in invitation token");
	}

	// Validate action
	const validActions: Array<"accept" | "decline"> = ["accept", "decline"];
	if (!response.action || !validActions.includes(response.action)) {
		errors.push("Invalid action. Must be 'accept' or 'decline'");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Format invitation record for API response
 * 
 * @param invitation - Database invitation record
 * @param teamName - Name of the team (optional)
 * @param inviterName - Name of the person who sent invitation (optional)
 * @returns Formatted invitation object for response
 */
export function formatInvitationForResponse(
	invitation: InvitationRecord,
	teamName: string = "Unknown Team",
	inviterName: string = "Unknown User"
): FormattedInvitation {
	const displayTeamName = teamName || "Unknown Team";
	const displayInviterName = inviterName || "Unknown User";

	return {
		id: invitation.id,
		teamId: invitation.team_id,
		teamName: displayTeamName,
		invitedEmail: invitation.invited_email,
		inviterName: displayInviterName,
		role: invitation.role,
		status: invitation.status,
		expiresAt: invitation.expires_at.toISOString(),
		createdAt: invitation.created_at.toISOString(),
		message: `You have been invited to join ${displayTeamName} as a ${invitation.role} by ${displayInviterName}`
	};
}

/**
 * Get expiration date for new invitations
 * 
 * @param daysFromNow - Number of days from now for expiration (default: 7)
 * @returns Date object for invitation expiration
 */
export function getInvitationExpiryDate(daysFromNow: number = 7): Date {
	return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

/**
 * Create invitation message for email notifications
 * 
 * @param teamName - Name of the team
 * @param inviterName - Name of the inviter
 * @param role - Role being offered
 * @param token - Invitation token for acceptance link
 * @returns Formatted invitation message
 */
export function createInvitationMessage(
	teamName: string,
	inviterName: string,
	role: UserRole,
	token: string
): string {
	return `${inviterName} has invited you to join ${teamName} as a ${role}. Click the link to accept or decline this invitation. Token: ${token}`;
}

/**
 * Check if invitation can be acted upon (not expired, still pending)
 * 
 * @param invitation - Invitation record to check
 * @returns True if invitation can be accepted/declined
 */
export function canActOnInvitation(invitation: InvitationRecord): boolean {
	return invitation.status === "pending" && !isInvitationExpired(invitation.expires_at);
}

/**
 * Determine if a user should be promoted when accepting an invitation
 * 
 * @param currentRole - User's current role
 * @param invitedRole - Role they're being invited for
 * @returns True if user should be promoted
 */
export function shouldPromoteUserOnAccept(currentRole: UserRole, invitedRole: UserRole): boolean {
	if (currentRole === "basic_user" && (invitedRole === "team_member" || invitedRole === "team_lead")) {
		return true;
	}
	if (currentRole === "team_member" && invitedRole === "team_lead") {
		return true;
	}
	return false;
}