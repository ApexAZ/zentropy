import { pool } from "../database/connection";
import crypto from "crypto";

interface DatabaseRow {
	[key: string]: unknown;
}

export interface Session {
	id: string;
	user_id: string;
	session_token: string;
	ip_address?: string;
	user_agent?: string;
	created_at: Date;
	updated_at: Date;
	expires_at: Date;
	is_active: boolean;
}

export interface CreateSessionData {
	user_id: string;
	ip_address?: string;
	user_agent?: string;
	expires_at?: Date;
}

export interface SessionWithUser extends Session {
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
		is_active: boolean;
	};
}

export class SessionModel {
	/**
	 * Generate a cryptographically secure session token
	 */
	private static generateSessionToken(): string {
		return crypto.randomBytes(32).toString("hex");
	}

	/**
	 * Calculate default session expiration (24 hours from now)
	 */
	private static getDefaultExpiration(): Date {
		const expiration = new Date();
		expiration.setHours(expiration.getHours() + 24);
		return expiration;
	}

	/**
	 * Create a new session for a user
	 */
	static async create(data: CreateSessionData): Promise<Session> {
		const sessionToken = this.generateSessionToken();
		const expiresAt = data.expires_at ?? this.getDefaultExpiration();

		const query = `
			INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`;

		const values = [data.user_id, sessionToken, data.ip_address ?? null, data.user_agent ?? null, expiresAt];

		const result = await pool.query(query, values);
		return result.rows[0] as Session;
	}

	/**
	 * Find a session by its token
	 */
	static async findByToken(sessionToken: string): Promise<Session | null> {
		const query = `
			SELECT * FROM sessions 
			WHERE session_token = $1 
			AND is_active = true 
			AND expires_at > NOW()
		`;

		const result = await pool.query(query, [sessionToken]);
		return (result.rows[0] as Session) || null;
	}

	/**
	 * Find a session with user data by token
	 */
	static async findByTokenWithUser(sessionToken: string): Promise<SessionWithUser | null> {
		const query = `
			SELECT 
				s.*,
				u.id as user_id,
				u.email,
				u.first_name,
				u.last_name,
				u.role,
				u.is_active as user_is_active
			FROM sessions s
			JOIN users u ON s.user_id = u.id
			WHERE s.session_token = $1 
			AND s.is_active = true 
			AND s.expires_at > NOW()
			AND u.is_active = true
		`;

		const result = await pool.query(query, [sessionToken]);
		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0] as DatabaseRow;
		return {
			id: row.id as string,
			user_id: row.user_id as string,
			session_token: row.session_token as string,
			ip_address: row.ip_address as string,
			user_agent: row.user_agent as string,
			created_at: row.created_at as Date,
			updated_at: row.updated_at as Date,
			expires_at: row.expires_at as Date,
			is_active: row.is_active as boolean,
			user: {
				id: row.user_id as string,
				email: row.email as string,
				first_name: row.first_name as string,
				last_name: row.last_name as string,
				role: row.role as string,
				is_active: row.user_is_active as boolean
			}
		} as SessionWithUser;
	}

	/**
	 * Find all active sessions for a user
	 */
	static async findByUserId(userId: string): Promise<Session[]> {
		const query = `
			SELECT * FROM sessions 
			WHERE user_id = $1 
			AND is_active = true 
			AND expires_at > NOW()
			ORDER BY created_at DESC
		`;

		const result = await pool.query(query, [userId]);
		return result.rows as Session[];
	}

	/**
	 * Update session's last activity timestamp
	 */
	static async updateActivity(sessionToken: string): Promise<Session | null> {
		const query = `
			UPDATE sessions 
			SET updated_at = NOW() 
			WHERE session_token = $1 
			AND is_active = true 
			AND expires_at > NOW()
			RETURNING *
		`;

		const result = await pool.query(query, [sessionToken]);
		return (result.rows[0] as Session) || null;
	}

	/**
	 * Invalidate a specific session
	 */
	static async invalidate(sessionToken: string): Promise<boolean> {
		const query = `
			UPDATE sessions 
			SET is_active = false, updated_at = NOW() 
			WHERE session_token = $1
		`;

		const result = await pool.query(query, [sessionToken]);
		return result.rowCount !== null && result.rowCount > 0;
	}

	/**
	 * Invalidate all sessions for a user
	 */
	static async invalidateAllForUser(userId: string): Promise<number> {
		const query = `
			UPDATE sessions 
			SET is_active = false, updated_at = NOW() 
			WHERE user_id = $1 AND is_active = true
		`;

		const result = await pool.query(query, [userId]);
		return result.rowCount ?? 0;
	}

	/**
	 * Clean up expired sessions (should be run periodically)
	 */
	static async cleanupExpired(): Promise<number> {
		const query = `
			DELETE FROM sessions 
			WHERE expires_at < NOW() OR is_active = false
		`;

		const result = await pool.query(query);
		return result.rowCount ?? 0;
	}

	/**
	 * Extend session expiration
	 */
	static async extendExpiration(sessionToken: string, additionalHours = 24): Promise<Session | null> {
		const query = `
			UPDATE sessions 
			SET 
				expires_at = expires_at + INTERVAL '${additionalHours} hours',
				updated_at = NOW()
			WHERE session_token = $1 
			AND is_active = true 
			AND expires_at > NOW()
			RETURNING *
		`;

		const result = await pool.query(query, [sessionToken]);
		return (result.rows[0] as Session) || null;
	}

	/**
	 * Get session statistics for monitoring
	 */
	static async getStats(): Promise<{
		total_active: number;
		expired_count: number;
		users_with_sessions: number;
	}> {
		const query = `
			SELECT 
				COUNT(*) FILTER (WHERE is_active = true AND expires_at > NOW()) as total_active,
				COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_count,
				COUNT(DISTINCT user_id) FILTER (WHERE is_active = true AND expires_at > NOW()) as users_with_sessions
			FROM sessions
		`;

		const result = await pool.query(query);
		const row = result.rows[0] as DatabaseRow;
		return {
			total_active: Number(row.total_active),
			expired_count: Number(row.expired_count),
			users_with_sessions: Number(row.users_with_sessions)
		};
	}
}
