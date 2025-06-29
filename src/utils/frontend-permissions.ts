import {
	getUserPermissions,
	validateUserPermissions,
	getRestrictedActionMessage,
	shouldRedirectToUpgrade,
	getRoleDisplayName,
	type UserPermissions,
	type PermissionAction
} from "./permission-controls";
import type { UserRole } from "../models/User";

/**
 * UI-specific permission check result
 */
export interface UIPermissionResult {
	allowed: boolean;
	message: string;
	shouldRedirect: boolean;
}

/**
 * Get user permissions for frontend use
 * Returns comprehensive permission object for UI logic
 */
export function checkUserPermissions(role: UserRole): UserPermissions {
	return getUserPermissions(role);
}

/**
 * Check if UI action should be allowed
 * Simple wrapper around permission validation
 */
export function checkUIPermission(role: UserRole, action: PermissionAction): UIPermissionResult {
	const result = validateUserPermissions(role, action);

	return {
		allowed: result.hasPermission,
		message: result.message,
		shouldRedirect: result.redirectToUpgrade
	};
}

/**
 * Get user-friendly role display name
 * Safe for use in UI elements
 */
export function formatRoleForDisplay(role: UserRole): string {
	return getRoleDisplayName(role);
}

/**
 * Check if user should see team-related UI elements
 * Used for showing/hiding navigation items
 */
export function shouldShowTeamFeatures(role: UserRole): boolean {
	const permissions = getUserPermissions(role);
	return permissions.canAccessTeams;
}

/**
 * Check if user should see management UI elements
 * Used for showing/hiding admin controls
 */
export function shouldShowManagementFeatures(role: UserRole): boolean {
	const permissions = getUserPermissions(role);
	return permissions.canManageTeam;
}

/**
 * Get upgrade path message for basic users
 * Provides helpful guidance for role progression
 */
export function getUpgradeMessage(role: UserRole, action: PermissionAction): string {
	if (shouldRedirectToUpgrade(role, action)) {
		return "Create a team or ask to be invited to access team features.";
	}
	return getRestrictedActionMessage(role, action);
}

/**
 * Check if action requires team lead permissions
 * Quick check for UI element states
 */
export function requiresTeamLead(action: PermissionAction): boolean {
	const teamLeadActions: PermissionAction[] = [
		"manage_team",
		"add_members",
		"remove_members",
		"send_invitations",
		"modify_team_settings"
	];
	return teamLeadActions.includes(action);
}

/**
 * Get CSS class for role-based styling
 * Returns safe CSS class names for role-based UI styling
 */
export function getRoleStyleClass(role: UserRole): string {
	switch (role) {
		case "basic_user":
			return "user-role-basic";
		case "team_member":
			return "user-role-member";
		case "team_lead":
			return "user-role-lead";
		default:
			return "user-role-unknown";
	}
}

/**
 * Determine if user can perform bulk operations
 * Used for enabling/disabling bulk action UI
 */
export function canPerformBulkOperations(role: UserRole): boolean {
	return role === "team_lead";
}

/**
 * Get permission status for multiple actions
 * Efficient way to check permissions for multiple UI elements
 */
export function getPermissionStatus(role: UserRole, actions: PermissionAction[]): Record<PermissionAction, boolean> {
	const permissions = getUserPermissions(role);
	const result: Partial<Record<PermissionAction, boolean>> = {};

	actions.forEach(action => {
		switch (action) {
			case "access_teams":
				result[action] = permissions.canAccessTeams;
				break;
			case "create_team":
				result[action] = permissions.canCreateTeam;
				break;
			case "manage_team":
				result[action] = permissions.canManageTeam;
				break;
			case "view_team_details":
				result[action] = permissions.canViewTeamDetails;
				break;
			case "add_members":
				result[action] = permissions.canAddMembers;
				break;
			case "remove_members":
				result[action] = permissions.canRemoveMembers;
				break;
			case "send_invitations":
				result[action] = permissions.canSendInvitations;
				break;
			case "modify_team_settings":
				result[action] = permissions.canModifyTeamSettings;
				break;
			default:
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
				(result as any)[action] = false;
		}
	});

	return result as Record<PermissionAction, boolean>;
}
