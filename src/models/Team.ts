import { pool } from '../database/connection';
import { User } from './User';

export interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_by?: string;
	created_at: Date;
	updated_at: Date;
}

export interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline?: number;
	sprint_length_days?: number;
	working_days_per_week?: number;
	created_by?: string;
}

export interface TeamMembership {
	id: string;
	team_id: string;
	user_id: string;
	joined_at: Date;
}

export class TeamModel {
	// Create a new team
	static async create(teamData: CreateTeamData): Promise<Team> {
		try {
			const query = `
				INSERT INTO teams (name, description, velocity_baseline, sprint_length_days, working_days_per_week, created_by)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *
			`;
			const values = [
				teamData.name,
				teamData.description || null,
				teamData.velocity_baseline || 0,
				teamData.sprint_length_days || 14,
				teamData.working_days_per_week || 5,
				teamData.created_by || null
			];

			const result = await pool.query(query, values);
			return result.rows[0];
		} catch (error) {
			console.error('Error creating team:', error);
			throw error;
		}
	}

	// Find team by ID
	static async findById(id: string): Promise<Team | null> {
		const query = 'SELECT * FROM teams WHERE id = $1';
		const result = await pool.query(query, [id]);
		return result.rows[0] || null;
	}

	// Get all teams
	static async findAll(): Promise<Team[]> {
		const query = 'SELECT * FROM teams ORDER BY created_at DESC';
		const result = await pool.query(query);
		return result.rows;
	}

	// Update team
	static async update(id: string, updateData: Partial<CreateTeamData>): Promise<Team | null> {
		const fields = Object.keys(updateData);
		if (fields.length === 0) return null;

		const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
		const query = `
			UPDATE teams 
			SET ${setClause}, updated_at = NOW()
			WHERE id = $1
			RETURNING *
		`;
		const values = [id, ...Object.values(updateData)];

		const result = await pool.query(query, values);
		return result.rows[0] || null;
	}

	// Delete team
	static async delete(id: string): Promise<boolean> {
		const query = 'DELETE FROM teams WHERE id = $1';
		const result = await pool.query(query, [id]);
		return (result.rowCount || 0) > 0;
	}

	// Add user to team
	static async addMember(teamId: string, userId: string): Promise<TeamMembership> {
		const query = `
			INSERT INTO team_memberships (team_id, user_id)
			VALUES ($1, $2)
			RETURNING *
		`;
		const result = await pool.query(query, [teamId, userId]);
		return result.rows[0];
	}

	// Remove user from team
	static async removeMember(teamId: string, userId: string): Promise<boolean> {
		const query = 'DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2';
		const result = await pool.query(query, [teamId, userId]);
		return (result.rowCount || 0) > 0;
	}

	// Get team members
	static async getMembers(teamId: string): Promise<User[]> {
		const query = `
			SELECT u.* FROM users u
			JOIN team_memberships tm ON u.id = tm.user_id
			WHERE tm.team_id = $1
			ORDER BY u.first_name, u.last_name
		`;
		const result = await pool.query(query, [teamId]);
		return result.rows;
	}

	// Get teams for a user
	static async getTeamsForUser(userId: string): Promise<Team[]> {
		const query = `
			SELECT t.* FROM teams t
			JOIN team_memberships tm ON t.id = tm.team_id
			WHERE tm.user_id = $1
			ORDER BY t.name
		`;
		const result = await pool.query(query, [userId]);
		return result.rows;
	}

	// Check if user is member of team
	static async isMember(teamId: string, userId: string): Promise<boolean> {
		const query = 'SELECT 1 FROM team_memberships WHERE team_id = $1 AND user_id = $2';
		const result = await pool.query(query, [teamId, userId]);
		return result.rows.length > 0;
	}
}