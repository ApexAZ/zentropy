import { pool } from "../database/connection";
import { PasswordService } from "../services/password-service";
import type { PasswordValidationOptions } from "../utils/password-policy";

/**
 * User role enumeration for type safety
 */
export const USER_ROLES = {
	BASIC_USER: "basic_user",
	TEAM_MEMBER: "team_member",
	TEAM_LEAD: "team_lead"
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
	readonly password: string;
	readonly first_name: string;
	readonly last_name: string;
	readonly role: UserRole;
}

/**
 * Data required to create a new user with pre-hashed password (internal use)
 */
export interface CreateUserWithHashData {
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
 * Password update data
 */
export interface UpdatePasswordData {
	readonly currentPassword: string;
	readonly newPassword: string;
}

/**
 * Password history entry
 */
export interface PasswordHistoryEntry {
	readonly id: string;
	readonly user_id: string;
	readonly password_hash: string;
	readonly created_at: Date;
}

/**
 * User data access layer with comprehensive CRUD operations
 */
export class UserModel {
	private static readonly passwordService = PasswordService.create();

	/**
	 * Create a new user with secure password handling
	 */
	static async create(userData: CreateUserData, validationOptions?: PasswordValidationOptions): Promise<User> {
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
		if (!userData.password?.trim()) {
			throw new Error("Password is required");
		}

		// Check if email already exists
		const emailExists = await this.emailExists(userData.email);
		if (emailExists) {
			throw new Error("Email already exists");
		}

		try {
			// Prepare validation options
			const options: PasswordValidationOptions = {
				userInfo: {
					email: userData.email,
					firstName: userData.first_name,
					lastName: userData.last_name
				},
				...validationOptions
			};

			// Hash password with validation
			const { hash: passwordHash } = await this.passwordService.hashPasswordWithValidation(
				userData.password,
				options
			);

			const query = `
				INSERT INTO users (email, password_hash, first_name, last_name, role)
				VALUES ($1, $2, $3, $4, $5)
				RETURNING *
			`;
			const values = [
				userData.email.trim().toLowerCase(),
				passwordHash,
				userData.first_name.trim(),
				userData.last_name.trim(),
				userData.role
			];

			const result = await pool.query(query, values);
			if (!result.rows[0]) {
				throw new Error("Failed to create user");
			}

			const user = result.rows[0] as User;

			// Add password to history
			await this.addPasswordToHistory(user.id, passwordHash);

			return user;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error creating user:", error);
			throw error;
		}
	}

	/**
	 * Create a new user with pre-hashed password (for internal use/migration)
	 */
	static async createWithHash(userData: CreateUserWithHashData): Promise<User> {
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
		if (!userData.password_hash?.trim()) {
			throw new Error("Password hash is required");
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
			const query = "SELECT * FROM users WHERE LOWER(email) = LOWER($1)";
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

	// Update user (non-password fields)
	static async update(id: string, updateData: UpdateUserData): Promise<User | null> {
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
		const values: unknown[] = [id];
		Object.values(updateData).forEach(value => values.push(value));

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
		const query = "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)";
		const result = await pool.query(query, [email]);
		return result.rows.length > 0;
	}

	/**
	 * Verify user credentials
	 */
	static async verifyCredentials(email: string, password: string): Promise<User | null> {
		try {
			const user = await this.findByEmail(email);
			if (!user) {
				return null;
			}

			const isValid = await this.passwordService.verifyPassword(password, user.password_hash);
			if (!isValid) {
				return null;
			}

			return user;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error verifying credentials:", error);
			throw error;
		}
	}

	/**
	 * Update user password with validation and history tracking
	 */
	static async updatePassword(userId: string, passwordData: UpdatePasswordData): Promise<boolean> {
		try {
			// Find user
			const user = await this.findById(userId);
			if (!user) {
				throw new Error("User not found");
			}

			// Verify current password
			const isCurrentPasswordValid = await this.passwordService.verifyPassword(
				passwordData.currentPassword,
				user.password_hash
			);
			if (!isCurrentPasswordValid) {
				throw new Error("Current password is incorrect");
			}

			// Check password reuse against history manually (since hashes can't be compared directly)
			const previousHashes = await this.getPasswordHistory(userId);
			for (const hash of previousHashes) {
				const isReused = await this.passwordService.verifyPassword(passwordData.newPassword, hash);
				if (isReused) {
					throw new Error("Password validation failed: Password has been used recently and cannot be reused");
				}
			}

			// Validate new password (without history check since we did it manually)
			const validationOptions: PasswordValidationOptions = {
				userInfo: {
					email: user.email,
					firstName: user.first_name,
					lastName: user.last_name
				}
			};

			// Hash new password with validation
			const { hash: newPasswordHash } = await this.passwordService.hashPasswordWithValidation(
				passwordData.newPassword,
				validationOptions
			);

			// Update password in database
			const updateQuery = `
				UPDATE users 
				SET password_hash = $1, updated_at = NOW()
				WHERE id = $2
			`;
			await pool.query(updateQuery, [newPasswordHash, userId]);

			// Add new password to history
			await this.addPasswordToHistory(userId, newPasswordHash);

			// Clean up old password history (keep last 5)
			await this.cleanupPasswordHistory(userId);

			return true;
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error updating password:", error);
			throw error;
		}
	}

	/**
	 * Get user's password history (for validation)
	 */
	static async getPasswordHistory(userId: string, limit = 5): Promise<string[]> {
		try {
			const query = `
				SELECT password_hash 
				FROM password_history 
				WHERE user_id = $1 
				ORDER BY created_at DESC 
				LIMIT $2
			`;
			const result = await pool.query(query, [userId, limit]);
			return result.rows.map((row: { password_hash: string }) => row.password_hash);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error getting password history:", error);
			throw error;
		}
	}

	/**
	 * Add password to history
	 */
	private static async addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
		try {
			const query = `
				INSERT INTO password_history (user_id, password_hash)
				VALUES ($1, $2)
			`;
			await pool.query(query, [userId, passwordHash]);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error adding password to history:", error);
			throw error;
		}
	}

	/**
	 * Clean up old password history entries (keep only the most recent ones)
	 */
	private static async cleanupPasswordHistory(userId: string, keepCount = 5): Promise<void> {
		try {
			const query = `
				DELETE FROM password_history
				WHERE user_id = $1
				AND id NOT IN (
					SELECT id FROM password_history
					WHERE user_id = $1
					ORDER BY created_at DESC
					LIMIT $2
				)
			`;
			await pool.query(query, [userId, keepCount]);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error cleaning password history:", error);
			throw error;
		}
	}

	/**
	 * Update last login timestamp
	 */
	static async updateLastLogin(userId: string): Promise<void> {
		try {
			const query = `
				UPDATE users 
				SET last_login_at = NOW(), updated_at = NOW()
				WHERE id = $1
			`;
			await pool.query(query, [userId]);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error updating last login:", error);
			throw error;
		}
	}
}
