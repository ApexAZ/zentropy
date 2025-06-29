import { TeamModel } from "../models/Team";
import { UserModel } from "../models/User";
import type { User, UserRole } from "../models/User";
import type { Team, CreateTeamData, TeamMembership } from "../models/Team";

/**
 * Interface for team creation result with role promotion information
 */
export interface TeamCreationResult {
	team: Team;
	userPromoted: boolean;
	membership: TeamMembership;
}

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
	try {
		const allTeams = await TeamModel.findAll();
		const userTeams = allTeams.filter(team => team.created_by === userId);
		return userTeams.length === 0;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error checking user's team count:", error);
		throw error;
	}
}

/**
 * Promote a user to team_lead role
 * 
 * @param userId - ID of the user to promote
 * @returns Promise<User> - the updated user with team_lead role
 * @throws Error if promotion fails or user not found
 */
export async function promoteUserToTeamLead(userId: string): Promise<User> {
	try {
		const updatedUser = await UserModel.update(userId, { role: "team_lead" });
		if (!updatedUser) {
			throw new Error("Failed to promote user to team lead");
		}
		return updatedUser;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error promoting user to team lead:", error);
		throw error;
	}
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
	try {
		return await TeamModel.addMember(teamId, userId);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error adding user as team member:", error);
		throw error;
	}
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
export async function handleTeamCreationWithRolePromotion(
	teamData: CreateTeamData
): Promise<TeamCreationResult> {
	if (!teamData.created_by) {
		throw new Error("Team creator user ID is required");
	}

	try {
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
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error in team creation workflow:", error);
		throw error;
	}
}