import { TeamModel } from "../models/Team";
import { UserModel } from "../models/User";
import type { User, UserRole } from "../models/User";
import type { Team, CreateTeamData, TeamMembership } from "../models/Team";

// ============= TYPE DEFINITIONS =============

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
 * UI-specific permission check result
 */
export interface UIPermissionResult {
	allowed: boolean;
	message: string;
	shouldRedirect: boolean;
}

/**
 * Interface for team creation result with role promotion information
 */
export interface TeamCreationResult {
	team: Team;
	userPromoted: boolean;
	membership: TeamMembership;
}

// ============= CORE PERMISSION FUNCTIONS =============

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

// ============= UI PERMISSION FUNCTIONS =============

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

// ============= ROLE PROMOTION FUNCTIONS =============

/**
 * Determine if a user should be promoted to team_lead based on their current role and team status
 *
 * Business Logic:
 * - Only basic_user role can be promoted
 * - Promotion only occurs when creating their first team
 * - team_member and team_lead roles are not promoted
 *
 * @param userRole - Current role of the user
 * @param isFirstTeam - Whether this is the user's first team
 * @returns true if user should be promoted, false otherwise
 */
export function shouldPromoteUserToTeamLead(userRole: UserRole, isFirstTeam: boolean): boolean {
	return userRole === "basic_user" && isFirstTeam;
}

/**
 * Check if this is the first team being created by a specific user
 *
 * @param userId - ID of the user creating the team
 * @returns Promise<boolean> - true if this is their first team, false otherwise
 * @throws Error if database query fails
 */
export async function checkIfFirstTeamForUser(userId: string): Promise<boolean> {
	const allTeams = await TeamModel.findAll();
	const userTeams = allTeams.filter(team => team.created_by === userId);
	return userTeams.length === 0;
}

/**
 * Promote a user to team_lead role
 *
 * @param userId - ID of the user to promote
 * @returns Promise<User> - the updated user with team_lead role
 * @throws Error if promotion fails or user not found
 */
export async function promoteUserToTeamLead(userId: string): Promise<User> {
	const updatedUser = await UserModel.update(userId, { role: "team_lead" });
	if (!updatedUser) {
		throw new Error("Failed to promote user to team lead");
	}
	return updatedUser;
}

/**
 * Add a user as a member of the newly created team
 *
 * @param teamId - ID of the team
 * @param userId - ID of the user to add as member
 * @returns Promise<TeamMembership> - the created membership record
 * @throws Error if membership creation fails
 */
export async function addUserAsTeamMember(teamId: string, userId: string): Promise<TeamMembership> {
	return await TeamModel.addMember(teamId, userId);
}

/**
 * Handle complete team creation workflow with automatic role promotion
 *
 * This function coordinates the entire team creation process including:
 * 1. Validate team creator exists and get their information
 * 2. Check if this is their first team (for promotion logic)
 * 3. Create the team
 * 4. Promote user to team_lead if eligible (basic_user creating first team)
 * 5. Add user as team member
 *
 * @param teamData - Team creation data including created_by field
 * @returns Promise<TeamCreationResult> - Complete result with team, promotion status, and membership
 * @throws Error if any step fails or team creator is missing
 */
export async function handleTeamCreationWithRolePromotion(teamData: CreateTeamData): Promise<TeamCreationResult> {
	if (!teamData.created_by) {
		throw new Error("Team creator user ID is required");
	}

	// Get user information
	const user = await UserModel.findById(teamData.created_by);
	if (!user) {
		throw new Error("User not found");
	}

	// Check if this is the user's first team (for promotion logic)
	const isFirstTeam = await checkIfFirstTeamForUser(teamData.created_by);

	// Create the team
	const team = await TeamModel.create(teamData);

	// Determine if user should be promoted
	const shouldPromote = shouldPromoteUserToTeamLead(user.role, isFirstTeam);

	let userPromoted = false;
	if (shouldPromote) {
		await promoteUserToTeamLead(teamData.created_by);
		userPromoted = true;
	}

	// Add user as team member
	const membership = await addUserAsTeamMember(team.id, teamData.created_by);

	return {
		team,
		userPromoted,
		membership
	};
}
