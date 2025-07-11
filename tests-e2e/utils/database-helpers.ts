import { exec } from "child_process";
import { promisify } from "util";
import { config, generateTestEmail } from "../config/environment";

const execAsync = promisify(exec);

/**
 * Database Helpers for E2E Tests
 * 
 * Provides utilities for:
 * - Creating test users
 * - Cleaning up test data
 * - Validating database state
 * - Managing user data for tests
 */
export class DatabaseHelpers {
	private createdUsers: string[] = [];
	private createdOrganizations: string[] = [];
	
	/**
	 * Create a test user via the existing database utilities
	 */
	async createTestUser(options: {
		email?: string;
		password?: string;
		firstName?: string;
		lastName?: string;
		emailType?: "local" | "google" | "victim" | "e2e";
		verified?: boolean;
		authProvider?: "LOCAL" | "GOOGLE" | "HYBRID";
	} = {}) {
		const email = options.email || generateTestEmail(options.emailType || "e2e");
		const password = options.password || config.testUsers.defaultPassword;
		const firstName = options.firstName || config.testUsers.defaultUser.firstName;
		const lastName = options.lastName || config.testUsers.defaultUser.lastName;
		
		// Track created user for cleanup
		this.createdUsers.push(email);
		
		// For E2E tests, we create users via the API to simulate real registration
		const response = await fetch(`${config.backend.baseUrl}/api/v1/auth/register`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email,
				password,
				first_name: firstName,
				last_name: lastName,
			}),
		});
		
		if (!response.ok) {
			throw new Error(`Failed to create test user: ${response.statusText}`);
		}
		
		const userData = await response.json();
		
		// If user should be verified, mark as verified
		if (options.verified !== false) {
			await this.verifyUserEmail(email);
		}
		
		return {
			email,
			password,
			firstName,
			lastName,
			...userData,
		};
	}
	
	/**
	 * Manually verify a user's email (bypassing email verification flow)
	 */
	async verifyUserEmail(email: string) {
		try {
			// Use the database utility to manually verify email
			await execAsync(`python3 scripts/db_utils.py find ${email}`);
			// Note: In a real implementation, we'd need a database script to mark email as verified
			// For now, we'll assume the registration process handles this
		} catch (error) {
			console.warn(`Could not verify email for ${email}:`, error);
		}
	}
	
	/**
	 * Delete a test user by email
	 */
	async deleteUser(email: string) {
		try {
			await execAsync(`python3 scripts/db_utils.py delete "${email}"`);
			// Remove from tracking
			this.createdUsers = this.createdUsers.filter(user => user !== email);
		} catch (error) {
			console.warn(`Could not delete user ${email}:`, error);
		}
	}
	
	/**
	 * Check if a user exists in the database
	 */
	async userExists(email: string): Promise<boolean> {
		try {
			const { stdout } = await execAsync(`python3 scripts/db_utils.py find "${email}"`);
			return stdout.trim().length > 0;
		} catch (error) {
			return false;
		}
	}
	
	/**
	 * Get user data from database
	 */
	async getUser(email: string): Promise<any> {
		try {
			const { stdout } = await execAsync(`python3 scripts/db_utils.py find "${email}"`);
			// Parse the output - this would need to be adapted based on the actual script output
			return JSON.parse(stdout);
		} catch (error) {
			throw new Error(`User ${email} not found`);
		}
	}
	
	/**
	 * Count total users in database
	 */
	async getUserCount(): Promise<number> {
		try {
			const { stdout } = await execAsync("python3 scripts/db_utils.py count");
			return parseInt(stdout.trim(), 10);
		} catch (error) {
			console.warn("Could not get user count:", error);
			return 0;
		}
	}
	
	/**
	 * Clean up all test users created during this test session
	 */
	async cleanup() {
		for (const email of this.createdUsers) {
			await this.deleteUser(email);
		}
		
		// Clean up any organizations created
		for (const orgId of this.createdOrganizations) {
			await this.deleteOrganization(orgId);
		}
		
		this.createdUsers = [];
		this.createdOrganizations = [];
	}
	
	/**
	 * Clean up all test users matching pattern
	 */
	async cleanupTestUsers() {
		const patterns = Object.values(config.testUsers.emailPatterns);
		
		for (const pattern of patterns) {
			const searchPattern = pattern.replace("+{id}", "+");
			try {
				await execAsync(`python3 scripts/db_utils.py delete "${searchPattern}"`);
			} catch (error) {
				// Users may not exist, which is fine
			}
		}
	}
	
	/**
	 * Create a test organization (placeholder for future implementation)
	 */
	async createTestOrganization(name: string = "Test Organization") {
		// This would be implemented when organization management is needed
		const orgId = `test-org-${Date.now()}`;
		this.createdOrganizations.push(orgId);
		return { id: orgId, name };
	}
	
	/**
	 * Delete a test organization (placeholder for future implementation)
	 */
	async deleteOrganization(orgId: string) {
		// This would be implemented when organization management is needed
		this.createdOrganizations = this.createdOrganizations.filter(id => id !== orgId);
	}
	
	/**
	 * Validate database state for a specific test scenario
	 */
	async validateUserState(email: string, expectedState: {
		authProvider?: "LOCAL" | "GOOGLE" | "HYBRID";
		emailVerified?: boolean;
		hasPassword?: boolean;
		googleId?: string | null;
	}) {
		const user = await this.getUser(email);
		
		const validations: { [key: string]: boolean } = {};
		
		if (expectedState.authProvider) {
			validations.authProvider = user.auth_provider === expectedState.authProvider;
		}
		
		if (expectedState.emailVerified !== undefined) {
			validations.emailVerified = user.email_verified === expectedState.emailVerified;
		}
		
		if (expectedState.hasPassword !== undefined) {
			validations.hasPassword = (user.password_hash !== null) === expectedState.hasPassword;
		}
		
		if (expectedState.googleId !== undefined) {
			validations.googleId = user.google_id === expectedState.googleId;
		}
		
		// Return validation results
		const failed = Object.entries(validations).filter(([_, valid]) => !valid);
		if (failed.length > 0) {
			throw new Error(`User state validation failed for ${email}: ${failed.map(([key]) => key).join(", ")}`);
		}
		
		return true;
	}
}