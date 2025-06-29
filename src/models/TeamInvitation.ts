import { pool } from "../database/connection";
import type { UserRole } from "./User";
import type { InvitationStatus, InvitationRecord } from "../utils/team-invitation-utils";

/**
 * Interface for creating team invitations
 */
export interface CreateInvitationData {
	team_id: string;
	invited_email: string;
	invited_by: string;
	role: UserRole;
	token: string;
	expires_at: Date;
}

/**
 * Interface for updating invitation status
 */
export interface UpdateInvitationData {
	status: InvitationStatus;
}

/**
 * TeamInvitation model for database operations
 */
export class TeamInvitationModel {
	/**
	 * Create a new team invitation
	 *
	 * @param invitationData - Data for creating invitation
	 * @returns Promise<InvitationRecord> - Created invitation record
	 */
	static async create(invitationData: CreateInvitationData): Promise<InvitationRecord> {
		try {
			const query = `
				INSERT INTO team_invitations (team_id, invited_email, invited_by, role, token, expires_at)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			const values = [
				invitationData.team_id,
				invitationData.invited_email,
				invitationData.invited_by,
				invitationData.role,
				invitationData.token,
				invitationData.expires_at
			];

			const result = await pool.query(query, values);
			return result.rows[0] as InvitationRecord;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error creating team invitation:", error);
			throw error;
		}
	}

	/**
	 * Find invitation by token
	 *
	 * @param token - Invitation token
	 * @returns Promise<InvitationRecord | null> - Invitation record or null
	 */
	static async findByToken(token: string): Promise<InvitationRecord | null> {
		try {
			const query = "SELECT * FROM team_invitations WHERE token = $1";
			const result = await pool.query(query, [token]);
			return (result.rows[0] as InvitationRecord) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding invitation by token:", error);
			throw error;
		}
	}

	/**
	 * Find invitation by ID
	 *
	 * @param id - Invitation ID
	 * @returns Promise<InvitationRecord | null> - Invitation record or null
	 */
	static async findById(id: string): Promise<InvitationRecord | null> {
		try {
			const query = "SELECT * FROM team_invitations WHERE id = $1";
			const result = await pool.query(query, [id]);
			return (result.rows[0] as InvitationRecord) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding invitation by ID:", error);
			throw error;
		}
	}

	/**
	 * Get all invitations for a team
	 *
	 * @param teamId - ID of the team
	 * @param status - Optional status filter
	 * @returns Promise<InvitationRecord[]> - Array of invitations
	 */
	static async findByTeam(teamId: string, status?: InvitationStatus): Promise<InvitationRecord[]> {
		try {
			let query = `
				SELECT * FROM team_invitations 
				WHERE team_id = $1
			`;
			const values: string[] = [teamId];

			if (status) {
				query += " AND status = $2";
				values.push(status);
			}

			query += " ORDER BY created_at DESC";

			const result = await pool.query(query, values);
			return result.rows as InvitationRecord[];
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding invitations by team:", error);
			throw error;
		}
	}

	/**
	 * Get all invitations for an email address
	 *
	 * @param email - Email address
	 * @param status - Optional status filter
	 * @returns Promise<InvitationRecord[]> - Array of invitations
	 */
	static async findByEmail(email: string, status?: InvitationStatus): Promise<InvitationRecord[]> {
		try {
			let query = `
				SELECT * FROM team_invitations 
				WHERE invited_email = $1
			`;
			const values: string[] = [email];

			if (status) {
				query += " AND status = $2";
				values.push(status);
			}

			query += " ORDER BY created_at DESC";

			const result = await pool.query(query, values);
			return result.rows as InvitationRecord[];
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding invitations by email:", error);
			throw error;
		}
	}

	/**
	 * Update invitation status
	 *
	 * @param id - Invitation ID
	 * @param updateData - Data to update
	 * @returns Promise<InvitationRecord | null> - Updated invitation or null
	 */
	static async update(id: string, updateData: UpdateInvitationData): Promise<InvitationRecord | null> {
		try {
			const query = `
				UPDATE team_invitations 
				SET status = $2, updated_at = NOW()
				WHERE id = $1
				RETURNING *
			`;
			const values = [id, updateData.status];

			const result = await pool.query(query, values);
			return (result.rows[0] as InvitationRecord) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error updating invitation:", error);
			throw error;
		}
	}

	/**
	 * Delete invitation
	 *
	 * @param id - Invitation ID
	 * @returns Promise<boolean> - True if invitation was deleted
	 */
	static async delete(id: string): Promise<boolean> {
		try {
			const query = "DELETE FROM team_invitations WHERE id = $1";
			const result = await pool.query(query, [id]);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error deleting invitation:", error);
			throw error;
		}
	}

	/**
	 * Check if user already has pending invitation for team
	 *
	 * @param teamId - ID of the team
	 * @param email - Email address
	 * @returns Promise<InvitationRecord | null> - Existing pending invitation or null
	 */
	static async findPendingForTeamAndEmail(teamId: string, email: string): Promise<InvitationRecord | null> {
		try {
			const query = `
				SELECT * FROM team_invitations 
				WHERE team_id = $1 AND invited_email = $2 AND status = 'pending'
				ORDER BY created_at DESC
				LIMIT 1
			`;
			const result = await pool.query(query, [teamId, email]);
			return (result.rows[0] as InvitationRecord) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding pending invitation:", error);
			throw error;
		}
	}

	/**
	 * Mark expired invitations
	 *
	 * @returns Promise<number> - Number of invitations marked as expired
	 */
	static async markExpiredInvitations(): Promise<number> {
		try {
			const query = `
				UPDATE team_invitations 
				SET status = 'expired', updated_at = NOW()
				WHERE status = 'pending' AND expires_at <= NOW()
			`;
			const result = await pool.query(query);
			return result.rowCount ?? 0;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error marking expired invitations:", error);
			throw error;
		}
	}

	/**
	 * Get invitation with team and inviter details
	 *
	 * @param token - Invitation token
	 * @returns Promise<object | null> - Invitation with related data or null
	 */
	static async findByTokenWithDetails(token: string): Promise<{
		invitation: InvitationRecord;
		team: { id: string; name: string };
		inviter: { id: string; first_name: string; last_name: string; email: string };
	} | null> {
		try {
			const query = `
				SELECT 
					ti.*,
					t.name as team_name,
					u.first_name as inviter_first_name,
					u.last_name as inviter_last_name,
					u.email as inviter_email
				FROM team_invitations ti
				JOIN teams t ON ti.team_id = t.id
				JOIN users u ON ti.invited_by = u.id
				WHERE ti.token = $1
			`;
			const result = await pool.query(query, [token]);

			if (result.rows.length === 0) {
				return null;
			}

			const row = result.rows[0] as {
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
				team_name: string;
				inviter_first_name: string;
				inviter_last_name: string;
				inviter_email: string;
			};
			return {
				invitation: {
					id: row.id,
					team_id: row.team_id,
					invited_email: row.invited_email,
					invited_by: row.invited_by,
					role: row.role,
					status: row.status,
					token: row.token,
					expires_at: row.expires_at,
					created_at: row.created_at,
					updated_at: row.updated_at
				} as InvitationRecord,
				team: {
					id: row.team_id,
					name: row.team_name
				},
				inviter: {
					id: row.invited_by,
					first_name: row.inviter_first_name,
					last_name: row.inviter_last_name,
					email: row.inviter_email
				}
			};
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding invitation with details:", error);
			throw error;
		}
	}
}
