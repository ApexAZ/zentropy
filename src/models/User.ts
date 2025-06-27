import { pool } from "../database/connection";

/**
 * User role enumeration for type safety
 */
export const USER_ROLES = {
	TEAM_LEAD: "team_lead",
	TEAM_MEMBER: "team_member"
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Complete user entity interface
 */
export interface User {
	readonly id: string;
	readonly email: string;
	readonly password_hash: string;
	readonly first_name: string;
	readonly last_name: string;
	readonly role: UserRole;
	readonly is_active: boolean;
	readonly last_login_at: Date | null;
	readonly created_at: Date;
	readonly updated_at: Date;
}

/**
 * Data required to create a new user
 */
export interface CreateUserData {
	readonly email: string;
	readonly password_hash: string;
	readonly first_name: string;
	readonly last_name: string;
	readonly role: UserRole;
}

/**
 * Data that can be updated for an existing user
 */
export interface UpdateUserData {
	readonly email?: string;
	readonly first_name?: string;
	readonly last_name?: string;
	readonly role?: UserRole;
	readonly is_active?: boolean;
}

/**
 * User data access layer with comprehensive CRUD operations
 */
export class UserModel {
	/**
	 * Create a new user with validation
	 */
	static async create(userData: CreateUserData): Promise<User> {
		// Input validation
		if (!userData.email?.trim()) {
			throw new Error("Email is required");
		}
		if (!userData.first_name?.trim()) {
			throw new Error("First name is required");
		}
		if (!userData.last_name?.trim()) {
			throw new Error("Last name is required");
		}

		try {
			const query = `
				INSERT INTO users (email, password_hash, first_name, last_name, role)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING *
			`;
			const values = [
				userData.email.trim().toLowerCase(),
				userData.password_hash,
				userData.first_name.trim(),
				userData.last_name.trim(),
				userData.role
			];

			const result = await pool.query(query, values);
			if (!result.rows[0]) {
				throw new Error("Failed to create user");
			}
			return result.rows[0] as User;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error creating user:", error);
			throw error;
		}
	}

	// Find user by email
	static async findByEmail(email: string): Promise<User | null> {
		try {
			const query = "SELECT * FROM users WHERE email = $1";
			const result = await pool.query(query, [email]);
			return (result.rows[0] as User) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding user by email:", error);
			throw error;
		}
	}

	// Find user by ID
	static async findById(id: string): Promise<User | null> {
		try {
			const query = "SELECT * FROM users WHERE id = $1";
			const result = await pool.query(query, [id]);
			return (result.rows[0] as User) ?? null;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error finding user by id:", error);
			throw error;
		}
	}

	// Get all users
	static async findAll(): Promise<User[]> {
		const query = "SELECT * FROM users ORDER BY created_at DESC";
		const result = await pool.query(query);
		return result.rows as User[];
	}

	// Update user
	static async update(id: string, updateData: Partial<CreateUserData>): Promise<User | null> {
		const fields = Object.keys(updateData);
		if (fields.length === 0) {
			return null;
		}

		const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");
		const query = `
			UPDATE users 
			SET ${setClause}, updated_at = NOW()
			WHERE id = $1
			RETURNING *
		`;
		const values = [id, ...Object.values(updateData)];

		const result = await pool.query(query, values);
		return (result.rows[0] as User) ?? null;
	}

	// Delete user
	static async delete(id: string): Promise<boolean> {
		try {
			const query = "DELETE FROM users WHERE id = $1";
			const result = await pool.query(query, [id]);
			return (result.rowCount ?? 0) > 0;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error deleting user:", error);
			throw error;
		}
	}

	// Check if email exists
	static async emailExists(email: string): Promise<boolean> {
		const query = "SELECT 1 FROM users WHERE email = $1";
		const result = await pool.query(query, [email]);
		return result.rows.length > 0;
	}
}
