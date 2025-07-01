import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PoolClient } from "pg";
import { pool } from "../../server/database/connection";

// Type for database query results
interface UserQueryResult {
	rows: Array<{
		id?: string;
		role?: string;
	}>;
}

describe("Database Role Schema Update", () => {
	let testClient: PoolClient;

	beforeEach(async (): Promise<void> => {
		testClient = await pool.connect();
	});

	afterEach((): void => {
		if (testClient) {
			testClient.release();
		}
	});

	describe("Role Constraint Updates", () => {
		it("should allow basic_user role in users table", async (): Promise<void> => {
			// ARRANGE - Create a test user with basic_user role
			const testUser = {
				email: "basicuser@test.com",
				password_hash: "$2b$12$test.hash.for.basic.user",
				first_name: "Basic",
				last_name: "User",
				role: "basic_user"
			};

			// ACT & ASSERT - Should not throw constraint violation
			await expect(
				testClient.query(
					`INSERT INTO users (email, password_hash, first_name, last_name, role) 
					 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
					[testUser.email, testUser.password_hash, testUser.first_name, testUser.last_name, testUser.role]
				)
			).resolves.toBeDefined();

			// CLEANUP
			await testClient.query("DELETE FROM users WHERE email = $1", [testUser.email]);
		});

		it("should still allow existing team_member role", async (): Promise<void> => {
			// ARRANGE
			const testUser = {
				email: "teammember@test.com",
				password_hash: "$2b$12$test.hash.for.team.member",
				first_name: "Team",
				last_name: "Member",
				role: "team_member"
			};

			// ACT & ASSERT
			await expect(
				testClient.query(
					`INSERT INTO users (email, password_hash, first_name, last_name, role) 
					 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
					[testUser.email, testUser.password_hash, testUser.first_name, testUser.last_name, testUser.role]
				)
			).resolves.toBeDefined();

			// CLEANUP
			await testClient.query("DELETE FROM users WHERE email = $1", [testUser.email]);
		});

		it("should still allow existing team_lead role", async (): Promise<void> => {
			// ARRANGE
			const testUser = {
				email: "teamlead@test.com",
				password_hash: "$2b$12$test.hash.for.team.lead",
				first_name: "Team",
				last_name: "Lead",
				role: "team_lead"
			};

			// ACT & ASSERT
			await expect(
				testClient.query(
					`INSERT INTO users (email, password_hash, first_name, last_name, role) 
					 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
					[testUser.email, testUser.password_hash, testUser.first_name, testUser.last_name, testUser.role]
				)
			).resolves.toBeDefined();

			// CLEANUP
			await testClient.query("DELETE FROM users WHERE email = $1", [testUser.email]);
		});

		it("should reject invalid role values", async (): Promise<void> => {
			// ARRANGE
			const testUser = {
				email: "invalidrole@test.com",
				password_hash: "$2b$12$test.hash.for.invalid.role",
				first_name: "Invalid",
				last_name: "Role",
				role: "admin" // Invalid role
			};

			// ACT & ASSERT - Should throw constraint violation
			await expect(
				testClient.query(
					`INSERT INTO users (email, password_hash, first_name, last_name, role) 
					 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
					[testUser.email, testUser.password_hash, testUser.first_name, testUser.last_name, testUser.role]
				)
			).rejects.toThrow();
		});
	});

	describe("Default Role for New Users", () => {
		it("should default to basic_user when role is not specified", async (): Promise<void> => {
			// ARRANGE
			const testUser = {
				email: "defaultrole@test.com",
				password_hash: "$2b$12$test.hash.for.default.role",
				first_name: "Default",
				last_name: "Role"
			};

			// ACT - Insert without specifying role
			const result = (await testClient.query(
				`INSERT INTO users (email, password_hash, first_name, last_name) 
				 VALUES ($1, $2, $3, $4) RETURNING role`,
				[testUser.email, testUser.password_hash, testUser.first_name, testUser.last_name]
			)) as UserQueryResult;

			// ASSERT
			expect(result.rows[0]?.role).toBe("basic_user");

			// CLEANUP
			await testClient.query("DELETE FROM users WHERE email = $1", [testUser.email]);
		});
	});
});
