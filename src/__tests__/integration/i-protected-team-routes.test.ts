import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import { TeamModel } from "../../models/Team";
import { testConnection } from "../../database/connection";

// Import the entire server app to test team endpoints
import "../../server/index";

// Integration test for protected team routes
describe("Protected Team Routes", () => {
	let testUser: any;
	let testSession: any;
	let testTeam: any;

	beforeEach(async () => {
		// Ensure database connection
		await testConnection();

		// Create test user and session for authentication testing
		const strongPassword = "ComplexSecureP@ssw0rd2024!ZqX9";
		testUser = await UserModel.create({
			email: "team-protection-test@example.com",
			password: strongPassword,
			first_name: "Alex",
			last_name: "Rodriguez",
			role: "team_member"
		});

		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "192.168.1.160",
			user_agent: "Test Browser Team Protection v1.0"
		});

		// Create a test team for testing operations
		testTeam = await TeamModel.create({
			name: "Test Team for Protection",
			description: "A team created for testing authentication",
			velocity_points_per_sprint: 50,
			sprint_length_weeks: 2,
			is_active: true
		});
	});

	afterEach(async () => {
		// Clean up test data
		if (testTeam) {
			await TeamModel.delete(testTeam.id);
		}
		if (testSession) {
			await SessionModel.invalidate(testSession.session_token);
		}
		if (testUser) {
			await UserModel.delete(testUser.id);
		}
		await SessionModel.cleanupExpired();
	});

	describe("Authenticated Access", () => {
		it("should allow GET /api/teams with valid session", async () => {
			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it("should allow GET /api/teams/:id with valid session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("id", testTeam.id);
			expect(response.body).toHaveProperty("name", testTeam.name);
		});

		it("should allow POST /api/teams with valid session", async () => {
			const newTeamData = {
				name: "New Authenticated Team",
				description: "Team created with authentication",
				velocity_points_per_sprint: 40,
				sprint_length_weeks: 3,
				is_active: true
			};

			const response = await request("http://localhost:3000")
				.post("/api/teams")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(newTeamData)
				.expect(201);

			expect(response.body).toHaveProperty("name", "New Authenticated Team");
			expect(response.body).toHaveProperty("velocity_points_per_sprint", 40);

			// Clean up the created team
			await TeamModel.delete(response.body.id);
		});

		it("should allow PUT /api/teams/:id with valid session", async () => {
			const updateData = {
				name: "Updated Team Name",
				description: "Updated description",
				velocity_points_per_sprint: 60,
				sprint_length_weeks: 2,
				is_active: true
			};

			const response = await request("http://localhost:3000")
				.put(`/api/teams/${testTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(updateData)
				.expect(200);

			expect(response.body).toHaveProperty("name", "Updated Team Name");
			expect(response.body).toHaveProperty("velocity_points_per_sprint", 60);
		});

		it("should allow DELETE /api/teams/:id with valid session", async () => {
			// Create a separate team for deletion test
			const deleteTeam = await TeamModel.create({
				name: "Delete Test Team",
				description: "Team for deletion testing",
				velocity_points_per_sprint: 30,
				sprint_length_weeks: 1,
				is_active: true
			});

			const response = await request("http://localhost:3000")
				.delete(`/api/teams/${deleteTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Team deleted successfully");

			// Verify team was deleted
			const deletedTeam = await TeamModel.findById(deleteTeam.id);
			expect(deletedTeam).toBeNull();
		});

		it("should allow GET /api/teams/:id/members with valid session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}/members`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});
	});

	describe("Unauthenticated Access Denied", () => {
		it("should deny GET /api/teams without session", async () => {
			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/teams/:id without session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny POST /api/teams without session", async () => {
			const newTeamData = {
				name: "Unauthorized Team",
				description: "Should not be created",
				velocity_points_per_sprint: 40,
				sprint_length_weeks: 2,
				is_active: true
			};

			const response = await request("http://localhost:3000")
				.post("/api/teams")
				.send(newTeamData)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/teams/:id without session", async () => {
			const updateData = {
				name: "Should Not Update"
			};

			const response = await request("http://localhost:3000")
				.put(`/api/teams/${testTeam.id}`)
				.send(updateData)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny DELETE /api/teams/:id without session", async () => {
			const response = await request("http://localhost:3000")
				.delete(`/api/teams/${testTeam.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/teams/:id/members without session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}/members`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});
	});

	describe("Invalid Session Access Denied", () => {
		it("should deny access with invalid session token", async () => {
			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.set("Cookie", "sessionToken=invalid-token-67890")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should deny access with expired session", async () => {
			// Invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});
	});
});