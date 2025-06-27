import { pool } from '../database/connection';

export interface User {
	id: string;
	email: string;
	password_hash: string;
	first_name: string;
	last_name: string;
	role: 'team_lead' | 'team_member';
	created_at: Date;
	updated_at: Date;
}

export interface CreateUserData {
	email: string;
	password_hash: string;
	first_name: string;
	last_name: string;
	role: 'team_lead' | 'team_member';
}

export class UserModel {
	// Create a new user
	static async create(userData: CreateUserData): Promise<User> {
		try {
			const query = `
				INSERT INTO users (email, password_hash, first_name, last_name, role)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING *
			`;
			const values = [
				userData.email,
				userData.password_hash,
				userData.first_name,
				userData.last_name,
				userData.role
			];

			const result = await pool.query(query, values);
			return result.rows[0];
		} catch (error) {
			console.error('Error creating user:', error);
			throw error;
		}
	}

	// Find user by email
	static async findByEmail(email: string): Promise<User | null> {
		try {
			const query = 'SELECT * FROM users WHERE email = $1';
			const result = await pool.query(query, [email]);
			return result.rows[0] || null;
		} catch (error) {
			console.error('Error finding user by email:', error);
			throw error;
		}
	}

	// Find user by ID
	static async findById(id: string): Promise<User | null> {
		try {
			const query = 'SELECT * FROM users WHERE id = $1';
			const result = await pool.query(query, [id]);
			return result.rows[0] || null;
		} catch (error) {
			console.error('Error finding user by id:', error);
			throw error;
		}
	}

	// Get all users
	static async findAll(): Promise<User[]> {
		const query = 'SELECT * FROM users ORDER BY created_at DESC';
		const result = await pool.query(query);
		return result.rows;
	}

	// Update user
	static async update(id: string, updateData: Partial<CreateUserData>): Promise<User | null> {
		const fields = Object.keys(updateData);
		if (fields.length === 0) return null;

		const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
		const query = `
			UPDATE users 
			SET ${setClause}, updated_at = NOW()
			WHERE id = $1
			RETURNING *
		`;
		const values = [id, ...Object.values(updateData)];

		const result = await pool.query(query, values);
		return result.rows[0] || null;
	}

	// Delete user
	static async delete(id: string): Promise<boolean> {
		try {
			const query = 'DELETE FROM users WHERE id = $1';
			const result = await pool.query(query, [id]);
			return (result.rowCount || 0) > 0;
		} catch (error) {
			console.error('Error deleting user:', error);
			throw error;
		}
	}

	// Check if email exists
	static async emailExists(email: string): Promise<boolean> {
		const query = 'SELECT 1 FROM users WHERE email = $1';
		const result = await pool.query(query, [email]);
		return result.rows.length > 0;
	}
}