import type { UserRole } from "../models/User";

/**
 * Available permission actions in the system
 */
export type PermissionAction =
	| "access_teams"
	| "create_team"
	| "manage_team"
	| "view_team_details"
	| "add_members"
	| "remove_members"
	| "send_invitations"
	| "modify_team_settings";

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
	hasPermission: boolean;
	message: string;
	redirectToUpgrade: boolean;
}

/**
 * Complete set of user permissions
 */
export interface UserPermissions {
	canAccessTeams: boolean;
	canCreateTeam: boolean;
	canManageTeam: boolean;
	canViewTeamDetails: boolean;
	canAddMembers: boolean;
	canRemoveMembers: boolean;
	canSendInvitations: boolean;
	canModifyTeamSettings: boolean;
}

/**
 * Check if user can access team-related features
 * Basic users need to join a team first
 */
export function canUserAccessTeams(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
		case "team_member":
			return true;
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can create new teams
 * All users can create teams (basic users get promoted to team_lead)
 */
export function canUserCreateTeam(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
		case "team_member":
		case "basic_user":
			return true;
		default:
			return false;
	}
}

/**
 * Check if user can manage team settings and members
 * Only team leads can manage teams
 */
export function canUserManageTeam(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
			return true;
		case "team_member":
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can view team details and information
 * Team members and leads can view, basic users cannot
 */
export function canUserViewTeamDetails(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
		case "team_member":
			return true;
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can add new members to teams
 * Only team leads can add members
 */
export function canUserAddMembers(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
			return true;
		case "team_member":
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can remove members from teams
 * Only team leads can remove members
 */
export function canUserRemoveMembers(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
			return true;
		case "team_member":
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can send team invitations
 * Only team leads can send invitations
 */
export function canUserSendInvitations(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
			return true;
		case "team_member":
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Check if user can modify team settings
 * Only team leads can modify team settings
 */
export function canUserModifyTeamSettings(role: UserRole): boolean {
	switch (role) {
		case "team_lead":
			return true;
		case "team_member":
		case "basic_user":
			return false;
		default:
			return false;
	}
}

/**
 * Validate user permissions for a specific action
 * Returns detailed result with message and redirect information
 */
export function validateUserPermissions(role: UserRole, action: PermissionAction): PermissionCheckResult {
	if (!role) {
		return {
			hasPermission: false,
			message: "You do not have sufficient permissions to perform this action.",
			redirectToUpgrade: false
		};
	}

	let hasPermission = false;

	switch (action) {
		case "access_teams":
			hasPermission = canUserAccessTeams(role);
			break;
		case "create_team":
			hasPermission = canUserCreateTeam(role);
			break;
		case "manage_team":
			hasPermission = canUserManageTeam(role);
			break;
		case "view_team_details":
			hasPermission = canUserViewTeamDetails(role);
			break;
		case "add_members":
			hasPermission = canUserAddMembers(role);
			break;
		case "remove_members":
			hasPermission = canUserRemoveMembers(role);
			break;
		case "send_invitations":
			hasPermission = canUserSendInvitations(role);
			break;
		case "modify_team_settings":
			hasPermission = canUserModifyTeamSettings(role);
			break;
		default:
			return {
				hasPermission: false,
				message: "Unknown permission action requested.",
				redirectToUpgrade: false
			};
	}

	if (hasPermission) {
		return {
			hasPermission: true,
			message: "",
			redirectToUpgrade: false
		};
	}

	// Generate appropriate error message
	const message = getRestrictedActionMessage(role, action);
	const redirectToUpgrade = shouldRedirectToUpgrade(role, action);

	return {
		hasPermission: false,
		message,
		redirectToUpgrade
	};
}

/**
 * Get user-friendly message for permission restrictions
 */
export function getRestrictedActionMessage(role: UserRole, action: PermissionAction): string {
	switch (action) {
		case "access_teams":
		case "view_team_details":
			if (role === "basic_user") {
				return "You need to join a team to access team features. Create a new team or ask a team lead to invite you.";
			}
			break;
		case "manage_team":
		case "add_members":
		case "remove_members":
		case "send_invitations":
		case "modify_team_settings":
			if (role === "team_member") {
				return "Only team leads can perform this action. Contact your team lead if you need to make changes.";
			}
			if (role === "basic_user") {
				return "You need to join a team and become a team lead to perform this action.";
			}
			break;
		case "create_team":
			// This should not happen since all roles can create teams
			return "You do not have permission to create teams.";
		default:
			return "You do not have sufficient permissions to perform this action.";
	}

	return "You do not have sufficient permissions to perform this action.";
}

/**
 * Determine if user should be redirected to upgrade their access
 * Basic users should be redirected to join/create teams
 */
export function shouldRedirectToUpgrade(role: UserRole, action: PermissionAction): boolean {
	if (role === "basic_user") {
		switch (action) {
			case "access_teams":
			case "view_team_details":
				return true;
			default:
				return false;
		}
	}
	return false;
}

/**
 * Get complete permission set for a user role
 * Useful for UI components that need to check multiple permissions
 */
export function getUserPermissions(role: UserRole): UserPermissions {
	return {
		canAccessTeams: canUserAccessTeams(role),
		canCreateTeam: canUserCreateTeam(role),
		canManageTeam: canUserManageTeam(role),
		canViewTeamDetails: canUserViewTeamDetails(role),
		canAddMembers: canUserAddMembers(role),
		canRemoveMembers: canUserRemoveMembers(role),
		canSendInvitations: canUserSendInvitations(role),
		canModifyTeamSettings: canUserModifyTeamSettings(role)
	};
}

/**
 * Check if user has any team-related permissions
 * Useful for showing/hiding entire sections of UI
 */
export function hasAnyTeamPermissions(role: UserRole): boolean {
	const permissions = getUserPermissions(role);
	return Object.values(permissions).some(permission => permission === true);
}

/**
 * Check if user is effectively a team lead
 * Used for UI elements that should only show for team leads
 */
export function isEffectiveTeamLead(role: UserRole): boolean {
	return role === "team_lead";
}

/**
 * Check if user is at least a team member
 * Used for UI elements that should show for members and leads
 */
export function isAtLeastTeamMember(role: UserRole): boolean {
	return role === "team_member" || role === "team_lead";
}

/**
 * Get role display name for UI
 */
export function getRoleDisplayName(role: UserRole): string {
	switch (role) {
		case "basic_user":
			return "Basic User";
		case "team_member":
			return "Team Member";
		case "team_lead":
			return "Team Lead";
		default:
			return "Unknown Role";
	}
}

/**
 * Get role description for UI
 */
export function getRoleDescription(role: UserRole): string {
	switch (role) {
		case "basic_user":
			return "Can manage profile and create teams. Join a team to access more features.";
		case "team_member":
			return "Can view team information and manage personal calendar entries.";
		case "team_lead":
			return "Can manage teams, add/remove members, and control team settings.";
		default:
			return "Unknown role with limited permissions.";
	}
}
