import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { app } from "../../server/app";
import { pool } from "../../database/connection";
import { UserModel } from "../../models/User";

// Type for API response body
interface CreateUserResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
	is_active: boolean;
	last_login_at: string | null;
	created_at: string;
	updated_at: string;
}

describe("Registration Default Role Tests", () => {
	// Cleanup function to remove test users
	const cleanupTestUsers = async (): Promise<void> => {
		const testEmails = [
			"basic_user_test@example.com",
			"explicit_role_test@example.com"
		];
		
		for (const email of testEmails) {
			await pool.query("DELETE FROM users WHERE email = $1", [email]);
		}
	};

	beforeEach(async (): Promise<void> => {
		await cleanupTestUsers();
	});

	afterEach(async (): Promise<void> => {
		await cleanupTestUsers();
	});

	describe("User Registration Default Role", () => {
		it("should default new user registrations to basic_user role", async (): Promise<void> => {
			// ARRANGE
			const registrationData = {
				email: "basic_user_test@example.com",
				password: "SecurePassword123!",
				first_name: "Basic",
				last_name: "User"
				// Note: no role specified, should default to basic_user
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/users")
				.send(registrationData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as CreateUserResponse;
			expect(responseBody).toBeDefined();
			expect(responseBody.role).toBe("basic_user");
			expect(responseBody.email).toBe(registrationData.email);
			expect(responseBody.first_name).toBe(registrationData.first_name);
			expect(responseBody.last_name).toBe(registrationData.last_name);

			// Verify in database
			const user = await UserModel.findByEmail(registrationData.email);
			expect(user).toBeDefined();
			expect(user?.role).toBe("basic_user");
		});

		it("should still allow explicit role assignment during registration", async (): Promise<void> => {
			// ARRANGE
			const registrationData = {
				email: "explicit_role_test@example.com",
				password: "SecurePassword123!",
				first_name: "Team",
				last_name: "Lead",
				role: "team_lead" as const
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/users")
				.send(registrationData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as CreateUserResponse;
			expect(responseBody).toBeDefined();
			expect(responseBody.role).toBe("team_lead");
			expect(responseBody.email).toBe(registrationData.email);

			// Verify in database
			const user = await UserModel.findByEmail(registrationData.email);
			expect(user).toBeDefined();
			expect(user?.role).toBe("team_lead");
		});

		it("should reject invalid role assignments", async (): Promise<void> => {
			// ARRANGE
			const registrationData = {
				email: "invalid_role_test@example.com",
				password: "SecurePassword123!",
				first_name: "Invalid",
				last_name: "Role",
				role: "admin" // Invalid role
			};

			// ACT & ASSERT
			await request(app as Application)
				.post("/api/users")
				.send(registrationData)
				.expect(500); // Should fail due to database constraint

			// Verify user was not created
			const user = await UserModel.findByEmail(registrationData.email);
			expect(user).toBeNull();
		});
	});

	describe("Principle of Least Privilege", () => {
		it("should implement principle of least privilege with basic_user as default", async (): Promise<void> => {
			// ARRANGE
			const registrationData = {
				email: "least_privilege_test@example.com",
				password: "SecurePassword123!",
				first_name: "Least",
				last_name: "Privilege"
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/users")
				.send(registrationData)
				.expect(201);

			// ASSERT - User should have minimal privileges
			const responseBody = response.body as CreateUserResponse;
			expect(responseBody.role).toBe("basic_user");
			
			// Verify the user exists with basic_user role
			const user = await UserModel.findByEmail(registrationData.email);
			expect(user?.role).toBe("basic_user");
			expect(user?.is_active).toBe(true);

			// CLEANUP
			if (user) {
				await pool.query("DELETE FROM users WHERE email = $1", [registrationData.email]);
			}
		});
	});
});