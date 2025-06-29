import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { UserModel, type User } from "../../models/User";
import { SessionModel, type Session } from "../../models/Session";
import { TeamModel, type Team } from "../../models/Team";
import { type TeamMembershipWithRole } from "../../utils/team-model-extensions";
import { testConnection } from "../../database/connection";
import type { Request, Response, NextFunction } from "express";

// Mock rate limiting middleware to avoid conflicts in tests
vi.mock("../../middleware/rate-limiter", () => ({
	loginRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	passwordUpdateRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	userCreationRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	generalApiRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next())
}));

// Import the entire server app to test team endpoints
import "../../server/index";

// Integration test for protected team routes
describe("Protected Team Routes", () => {
	let testUser: User;
	let testSession: Session;
	let testTeam: Team;

	beforeEach(async () => {
		// Ensure database connection
		await testConnection();

		// Create test user and session for authentication testing with unique email
		const strongPassword = "ComplexSecureP@ssw0rd2024!ZqX9";
		const uniqueEmail = `team-protection-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@example.com`;
		testUser = await UserModel.create({
			email: uniqueEmail,
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
			velocity_baseline: 50,
			sprint_length_days: 14
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

			expect(Array.isArray(response.body as unknown)).toBe(true);
		});

		it("should allow GET /api/teams/:id with valid session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			const responseBody = response.body as Team;
			expect(responseBody).toHaveProperty("id", testTeam.id);
			expect(responseBody).toHaveProperty("name", testTeam.name);
		});

		it("should allow POST /api/teams with valid session", async () => {
			const newTeamData = {
				name: "New Authenticated Team",
				description: "Team created with authentication",
				velocity_baseline: 40,
				sprint_length_days: 21
			};

			const response = await request("http://localhost:3000")
				.post("/api/teams")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(newTeamData)
				.expect(201);

			const responseBody = response.body as {
				team: Team;
				userPromoted: boolean;
				membership: TeamMembershipWithRole;
				message: string;
			};
			expect(responseBody).toHaveProperty("team");
			expect(responseBody.team).toHaveProperty("name", "New Authenticated Team");
			expect(responseBody.team).toHaveProperty("velocity_baseline", 40);
			expect(responseBody).toHaveProperty("userPromoted");
			expect(responseBody).toHaveProperty("message");

			// Clean up the created team
			await TeamModel.delete(responseBody.team.id);
		});

		it("should allow PUT /api/teams/:id with valid session", async () => {
			const updateData = {
				name: "Updated Team Name",
				description: "Updated description",
				velocity_baseline: 60,
				sprint_length_days: 14
			};

			const response = await request("http://localhost:3000")
				.put(`/api/teams/${testTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(updateData)
				.expect(200);

			const responseBody = response.body as Team;
			expect(responseBody).toHaveProperty("name", "Updated Team Name");
			expect(responseBody).toHaveProperty("velocity_baseline", 60);
		});

		it("should allow DELETE /api/teams/:id with valid session", async () => {
			// Create a separate team for deletion test
			const deleteTeam = await TeamModel.create({
				name: "Delete Test Team",
				description: "Team for deletion testing",
				velocity_baseline: 30,
				sprint_length_days: 7
			});

			const response = await request("http://localhost:3000")
				.delete(`/api/teams/${deleteTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Team deleted successfully");

			// Verify team was deleted
			const deletedTeam = await TeamModel.findById(deleteTeam.id);
			expect(deletedTeam).toBeNull();
		});

		it("should allow GET /api/teams/:id/members with valid session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}/members`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body as unknown)).toBe(true);
		});
	});

	describe("Unauthenticated Access Denied", () => {
		it("should deny GET /api/teams without session", async () => {
			const response = await request("http://localhost:3000").get("/api/teams").expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/teams/:id without session", async () => {
			const response = await request("http://localhost:3000").get(`/api/teams/${testTeam.id}`).expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});

		it("should deny POST /api/teams without session", async () => {
			const newTeamData = {
				name: "Unauthorized Team",
				description: "Should not be created",
				velocity_baseline: 40,
				sprint_length_days: 14
			};

			const response = await request("http://localhost:3000").post("/api/teams").send(newTeamData).expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/teams/:id without session", async () => {
			const updateData = {
				name: "Should Not Update"
			};

			const response = await request("http://localhost:3000")
				.put(`/api/teams/${testTeam.id}`)
				.send(updateData)
				.expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});

		it("should deny DELETE /api/teams/:id without session", async () => {
			const response = await request("http://localhost:3000").delete(`/api/teams/${testTeam.id}`).expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/teams/:id/members without session", async () => {
			const response = await request("http://localhost:3000")
				.get(`/api/teams/${testTeam.id}/members`)
				.expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Authentication required");
		});
	});

	describe("Invalid Session Access Denied", () => {
		it("should deny access with invalid session token", async () => {
			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.set("Cookie", "sessionToken=invalid-token-67890")
				.expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Invalid or expired session");
		});

		it("should deny access with expired session", async () => {
			// Invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request("http://localhost:3000")
				.get("/api/teams")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			const responseBody = response.body as { message: string };
			expect(responseBody).toHaveProperty("message", "Invalid or expired session");
		});
	});
});
