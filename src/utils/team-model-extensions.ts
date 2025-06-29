import { pool } from "../database/connection";
import type { UserRole } from "../models/User";

/**
 * Extended team membership interface with role support
 */
export interface TeamMembershipWithRole {
	id: string;
	team_id: string;
	user_id: string;
	role: UserRole;
	joined_at: Date;
	created_at: Date;
	updated_at: Date;
}

/**
 * Interface for creating team membership
 */
export interface CreateTeamMembershipData {
	team_id: string;
	user_id: string;
	role: UserRole;
}

/**
 * Extended TeamModel class with role-based membership operations
 */
export class TeamModelExtensions {
	/**
	 * Add user to team with specific role
	 *
	 * @param membershipData - Data for creating team membership
	 * @returns Promise<TeamMembershipWithRole> - Created membership record
	 */
	static async addMemberWithRole(membershipData: CreateTeamMembershipData): Promise<TeamMembershipWithRole> {
		try {
			const query = `
				INSERT INTO team_memberships (team_id, user_id, role)
				VALUES ($1, $2, $3)
				RETURNING *
			`;
			const values = [membershipData.team_id, membershipData.user_id, membershipData.role];

			const result = await pool.query(query, values);
			return result.rows[0] as TeamMembershipWithRole;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error adding team member with role:", error);
			throw error;
		}
	}

	/**
	 * Get all team memberships for a team
	 *
	 * @param teamId - ID of the team
	 * @returns Promise<TeamMembershipWithRole[]> - Array of team memberships
	 */
	static async getTeamMemberships(teamId: string): Promise<TeamMembershipWithRole[]> {
		try {
			const query = `
				SELECT * FROM team_memberships 
				WHERE team_id = $1 
				ORDER BY joined_at DESC
			`;
			const result = await pool.query(query, [teamId]);
			return result.rows as TeamMembershipWithRole[];
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error getting team memberships:", error);
			throw error;
		}
	}

	/**
	 * Check if user is already a member of the team
	 *
	 * @param teamId - ID of the team
	 * @param userId - ID of the user
	 * @returns Promise<TeamMembershipWithRole | null> - Existing membership or null
	 */
	static async findExistingMembership(teamId: string, userId: string): Promise<TeamMembershipWithRole | null> {
		try {
			const query = `
				SELECT * FROM team_memberships 
				WHERE team_id = $1 AND user_id = $2
			`;
			const result = await pool.query(query, [teamId, userId]);
			return (result.rows[0] as TeamMembershipWithRole) || null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding existing membership:", error);
			throw error;
		}
	}

	/**
	 * Update user role in team
	 *
	 * @param teamId - ID of the team
	 * @param userId - ID of the user
	 * @param newRole - New role to assign
	 * @returns Promise<TeamMembershipWithRole | null> - Updated membership or null
	 */
	static async updateMemberRole(
		teamId: string,
		userId: string,
		newRole: UserRole
	): Promise<TeamMembershipWithRole | null> {
		try {
			const query = `
				UPDATE team_memberships 
				SET role = $3, updated_at = NOW()
				WHERE team_id = $1 AND user_id = $2
				RETURNING *
			`;
			const result = await pool.query(query, [teamId, userId, newRole]);
			return (result.rows[0] as TeamMembershipWithRole) || null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error updating member role:", error);
			throw error;
		}
	}

	/**
	 * Remove user from team
	 *
	 * @param teamId - ID of the team
	 * @param userId - ID of the user
	 * @returns Promise<boolean> - True if member was removed
	 */
	static async removeMember(teamId: string, userId: string): Promise<boolean> {
		try {
			const query = "DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2";
			const result = await pool.query(query, [teamId, userId]);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error removing team member:", error);
			throw error;
		}
	}

	/**
	 * Get team members with their roles
	 *
	 * @param teamId - ID of the team
	 * @returns Promise<Array> - Array of users with their team roles
	 */
	static async getMembersWithRoles(teamId: string): Promise<
		Array<{
			id: string;
			email: string;
			first_name: string;
			last_name: string;
			role: UserRole;
			is_active: boolean;
			team_role: UserRole;
			joined_at: Date;
		}>
	> {
		try {
			const query = `
				SELECT 
					u.id, u.email, u.first_name, u.last_name, u.role, u.is_active,
					tm.role as team_role, tm.joined_at
				FROM users u
				JOIN team_memberships tm ON u.id = tm.user_id
				WHERE tm.team_id = $1
				ORDER BY tm.joined_at DESC
			`;
			const result = await pool.query(query, [teamId]);
			return result.rows as Array<{
				id: string;
				email: string;
				first_name: string;
				last_name: string;
				role: UserRole;
				is_active: boolean;
				team_role: UserRole;
				joined_at: Date;
			}>;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error getting members with roles:", error);
			throw error;
		}
	}
}
