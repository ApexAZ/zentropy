import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { app } from "../../server/app";
import { pool } from "../../database/connection";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import type { User } from "../../models/User";
import type { Session } from "../../models/Session";

interface UserSearchResponse {
	users: Array<{
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
		is_active: boolean;
		last_login_at: string | null;
		created_at: string;
		updated_at: string;
	}>;
	query: string;
	roleFilter: string | null;
	limit: number;
	count: number;
	hasMore: boolean;
}

describe("User Search API Integration Tests", () => {
	let teamLeadUser: User;
	let basicUser: User;
	let teamMemberUser: User;
	let teamLeadSession: Session;
	let basicUserSession: Session;
	let teamMemberSession: Session;

	// Cleanup function to remove test data
	const cleanupTestData = async (): Promise<void> => {
		// Clean up in order to respect foreign key constraints
		await pool.query("DELETE FROM sessions WHERE user_id LIKE 'search-test-%'");
		await pool.query("DELETE FROM password_history WHERE user_id LIKE 'search-test-%'");
		await pool.query("DELETE FROM users WHERE id LIKE 'search-test-%'");
	};

	beforeEach(async (): Promise<void> => {
		await cleanupTestData();

		// Create test users with different roles
		teamLeadUser = await UserModel.create({
			email: "teamlead@searchtest.com",
			password: "SecurePassword123!",
			first_name: "Team",
			last_name: "Lead",
			role: "team_lead"
		});

		basicUser = await UserModel.create({
			email: "basicuser@searchtest.com",
			password: "SecurePassword123!",
			first_name: "Basic",
			last_name: "User",
			role: "basic_user"
		});

		teamMemberUser = await UserModel.create({
			email: "member@searchtest.com",
			password: "SecurePassword123!",
			first_name: "Team",
			last_name: "Member",
			role: "team_member"
		});

		// Create additional test users for search functionality
		await UserModel.create({
			email: "john.doe@searchtest.com",
			password: "SecurePassword123!",
			first_name: "John",
			last_name: "Doe",
			role: "basic_user"
		});

		await UserModel.create({
			email: "jane.smith@searchtest.com",
			password: "SecurePassword123!",
			first_name: "Jane",
			last_name: "Smith",
			role: "team_member"
		});

		// Create sessions for authentication
		teamLeadSession = await SessionModel.create({
			user_id: teamLeadUser.id,
			ip_address: "127.0.0.1",
			user_agent: "test-agent"
		});

		basicUserSession = await SessionModel.create({
			user_id: basicUser.id,
			ip_address: "127.0.0.1",
			user_agent: "test-agent"
		});

		teamMemberSession = await SessionModel.create({
			user_id: teamMemberUser.id,
			ip_address: "127.0.0.1",
			user_agent: "test-agent"
		});
	});

	afterEach(async (): Promise<void> => {
		await cleanupTestData();
	});

	describe("Authentication and Authorization", () => {
		it("should require authentication for user search", async (): Promise<void> => {
			// ACT & ASSERT - No session cookie provided
			await request(app as Application)
				.get("/api/users/search")
				.query({ q: "john" })
				.expect(401);
		});

		it("should reject invalid session tokens", async (): Promise<void> => {
			// ACT & ASSERT - Invalid session token
			await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", "sessionToken=invalid-token-123")
				.query({ q: "john" })
				.expect(401);
		});

		it("should allow team_lead users to search", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "john" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody).toHaveProperty("users");
			expect(responseBody).toHaveProperty("query", "john");
		});

		it("should deny basic_user access to search", async (): Promise<void> => {
			// ACT & ASSERT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${basicUserSession.session_token}`)
				.query({ q: "john" })
				.expect(403);

			expect((response.body as { message: string }).message).toContain("Insufficient permissions");
		});

		it("should deny team_member access to search", async (): Promise<void> => {
			// ACT & ASSERT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamMemberSession.session_token}`)
				.query({ q: "john" })
				.expect(403);

			expect((response.body as { message: string }).message).toContain("Insufficient permissions");
		});
	});

	describe("Search Functionality", () => {
		it("should search users by first name", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "john" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users).toHaveLength(1);
			expect(responseBody.users[0]?.first_name).toBe("John");
			expect(responseBody.users[0]?.last_name).toBe("Doe");
			expect(responseBody.query).toBe("john");
			expect(responseBody.count).toBe(1);
		});

		it("should search users by last name", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "smith" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users).toHaveLength(1);
			expect(responseBody.users[0]?.last_name).toBe("Smith");
		});

		it("should search users by email", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "jane.smith" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users).toHaveLength(1);
			expect(responseBody.users[0]?.email).toBe("jane.smith@searchtest.com");
		});

		it("should perform case-insensitive search", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "JOHN" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users).toHaveLength(1);
			expect(responseBody.users[0]?.first_name).toBe("John");
		});

		it("should exclude current user from search results", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "team" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			const currentUserInResults = responseBody.users.find(u => u.id === teamLeadUser.id);
			expect(currentUserInResults).toBeUndefined();
			
			// Should find Team Member but not Team Lead (current user)
			expect(responseBody.users.some(u => u.first_name === "Team" && u.last_name === "Member")).toBe(true);
		});

		it("should not include password hash in search results", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "john" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users[0]).not.toHaveProperty("password_hash");
		});
	});

	describe("Role Filtering", () => {
		it("should filter users by role when specified", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "", role: "basic_user" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users.every(u => u.role === "basic_user")).toBe(true);
			expect(responseBody.roleFilter).toBe("basic_user");
		});

		it("should return users of all roles when no role filter specified", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			const roles = new Set(responseBody.users.map(u => u.role));
			expect(roles.size).toBeGreaterThan(1); // Multiple roles present
			expect(responseBody.roleFilter).toBeNull();
		});
	});

	describe("Query Parameters and Validation", () => {
		it("should respect limit parameter", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "", limit: 2 })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users.length).toBeLessThanOrEqual(2);
			expect(responseBody.limit).toBe(2);
		});

		it("should use default limit when not specified", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.limit).toBe(20); // Default limit
		});

		it("should handle empty search query by returning all active users", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "" })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			expect(responseBody.users.length).toBeGreaterThan(0);
			expect(responseBody.users.every(u => u.is_active)).toBe(true);
			expect(responseBody.query).toBe("");
		});

		it("should reject queries with HTML tags (XSS prevention)", async (): Promise<void> => {
			// ACT & ASSERT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "<script>alert('xss')</script>" })
				.expect(400);

			expect((response.body as { message: string }).message).toContain("Invalid search query");
		});

		it("should reject overly long queries", async (): Promise<void> => {
			// ARRANGE
			const longQuery = "a".repeat(101);

			// ACT & ASSERT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: longQuery })
				.expect(400);

			expect((response.body as { message: string }).message).toContain("Invalid search query");
		});
	});

	describe("Response Format", () => {
		it("should return properly formatted search response", async (): Promise<void> => {
			// ACT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "john", limit: 10 })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			
			// Check response structure
			expect(responseBody).toHaveProperty("users");
			expect(responseBody).toHaveProperty("query", "john");
			expect(responseBody).toHaveProperty("roleFilter", null);
			expect(responseBody).toHaveProperty("limit", 10);
			expect(responseBody).toHaveProperty("count", responseBody.users.length);
			expect(responseBody).toHaveProperty("hasMore");

			// Check user object structure
			if (responseBody.users.length > 0) {
				const user = responseBody.users[0];
				expect(user).toHaveProperty("id");
				expect(user).toHaveProperty("email");
				expect(user).toHaveProperty("first_name");
				expect(user).toHaveProperty("last_name");
				expect(user).toHaveProperty("role");
				expect(user).toHaveProperty("is_active");
				expect(user).toHaveProperty("created_at");
				expect(user).toHaveProperty("updated_at");
				expect(user).not.toHaveProperty("password_hash");
			}
		});

		it("should indicate hasMore when results are limited", async (): Promise<void> => {
			// ACT - Request with limit smaller than total results
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "", limit: 1 })
				.expect(200);

			// ASSERT
			const responseBody = response.body as UserSearchResponse;
			if (responseBody.count === responseBody.limit) {
				expect(responseBody.hasMore).toBe(true);
			}
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully", async (): Promise<void> => {
			// ARRANGE - Close database connection to simulate error
			await pool.end();

			// ACT & ASSERT
			const response = await request(app as Application)
				.get("/api/users/search")
				.set("Cookie", `sessionToken=${teamLeadSession.session_token}`)
				.query({ q: "john" })
				.expect(500);

			expect((response.body as { message: string }).message).toContain("Failed to search users");

			// Restore database connection for cleanup
			// Note: This will be handled by the test cleanup process
		});
	});
});