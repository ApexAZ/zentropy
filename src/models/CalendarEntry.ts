import { pool } from '../database/connection';

export interface CalendarEntry {
	id: string;
	user_id: string;
	team_id: string;
	entry_type: 'pto' | 'holiday' | 'sick' | 'personal';
	title: string;
	description?: string;
	start_date: Date;
	end_date: Date;
	all_day: boolean;
	created_at: Date;
	updated_at: Date;
}

export interface CreateCalendarEntryData {
	user_id: string;
	team_id: string;
	entry_type: 'pto' | 'holiday' | 'sick' | 'personal';
	title: string;
	description?: string;
	start_date: Date;
	end_date: Date;
	all_day?: boolean;
}

export class CalendarEntryModel {
	// Create a new calendar entry
	static async create(entryData: CreateCalendarEntryData): Promise<CalendarEntry> {
		try {
			const query = `
				INSERT INTO calendar_entries (user_id, team_id, entry_type, title, description, start_date, end_date, all_day)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING *
			`;
			const values = [
				entryData.user_id,
				entryData.team_id,
				entryData.entry_type,
				entryData.title,
				entryData.description || null,
				entryData.start_date,
				entryData.end_date,
				entryData.all_day !== undefined ? entryData.all_day : true
			];

			const result = await pool.query(query, values);
			return result.rows[0];
		} catch (error) {
			console.error('Error creating calendar entry:', error);
			throw error;
		}
	}

	// Find entry by ID
	static async findById(id: string): Promise<CalendarEntry | null> {
		const query = 'SELECT * FROM calendar_entries WHERE id = $1';
		const result = await pool.query(query, [id]);
		return result.rows[0] || null;
	}

	// Get entries for a user
	static async findByUser(userId: string): Promise<CalendarEntry[]> {
		const query = `
			SELECT * FROM calendar_entries 
			WHERE user_id = $1 
			ORDER BY start_date DESC
		`;
		const result = await pool.query(query, [userId]);
		return result.rows;
	}

	// Get entries for a team
	static async findByTeam(teamId: string): Promise<CalendarEntry[]> {
		const query = `
			SELECT * FROM calendar_entries 
			WHERE team_id = $1 
			ORDER BY start_date DESC
		`;
		const result = await pool.query(query, [teamId]);
		return result.rows;
	}

	// Get entries within date range
	static async findByDateRange(startDate: Date, endDate: Date, teamId?: string): Promise<CalendarEntry[]> {
		let query = `
			SELECT * FROM calendar_entries 
			WHERE start_date <= $2 AND end_date >= $1
		`;
		const values: (Date | string)[] = [startDate, endDate];

		if (teamId) {
			query += ' AND team_id = $3';
			values.push(teamId);
		}

		query += ' ORDER BY start_date ASC';
		const result = await pool.query(query, values);
		return result.rows;
	}

	// Update calendar entry
	static async update(id: string, updateData: Partial<CreateCalendarEntryData>): Promise<CalendarEntry | null> {
		const fields = Object.keys(updateData);
		if (fields.length === 0) return null;

		const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
		const query = `
			UPDATE calendar_entries 
			SET ${setClause}, updated_at = NOW()
			WHERE id = $1
			RETURNING *
		`;
		const values = [id, ...Object.values(updateData)];

		const result = await pool.query(query, values);
		return result.rows[0] || null;
	}

	// Delete calendar entry
	static async delete(id: string): Promise<boolean> {
		const query = 'DELETE FROM calendar_entries WHERE id = $1';
		const result = await pool.query(query, [id]);
		return (result.rowCount || 0) > 0;
	}

	// Get conflicting entries (overlapping dates for same user)
	static async findConflicts(userId: string, startDate: Date, endDate: Date, excludeId?: string): Promise<CalendarEntry[]> {
		let query = `
			SELECT * FROM calendar_entries 
			WHERE user_id = $1 AND start_date <= $3 AND end_date >= $2
		`;
		const values = [userId, startDate, endDate];

		if (excludeId) {
			query += ' AND id != $4';
			values.push(excludeId);
		}

		const result = await pool.query(query, values);
		return result.rows;
	}

	// Calculate working days affected by entries
	static async calculateWorkingDaysImpact(teamId: string, startDate: Date, endDate: Date): Promise<number> {
		const query = `
			SELECT 
				user_id,
				start_date,
				end_date
			FROM calendar_entries 
			WHERE team_id = $1 AND start_date <= $3 AND end_date >= $2
			ORDER BY user_id, start_date
		`;
		const result = await pool.query(query, [teamId, startDate, endDate]);
		
		// This is a simplified calculation - in a real app you'd account for weekends, holidays, etc.
		let totalDaysImpacted = 0;
		for (const entry of result.rows) {
			const entryStart = new Date(Math.max(entry.start_date.getTime(), startDate.getTime()));
			const entryEnd = new Date(Math.min(entry.end_date.getTime(), endDate.getTime()));
			const daysDiff = Math.ceil((entryEnd.getTime() - entryStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
			totalDaysImpacted += daysDiff;
		}
		
		return totalDaysImpacted;
	}
}