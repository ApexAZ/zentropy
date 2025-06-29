import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { app } from "../../server/app";
import { pool } from "../../database/connection";
import { UserModel } from "../../models/User";
import { TeamModel } from "../../models/Team";
import { SessionModel } from "../../models/Session";
import type { User } from "../../models/User";
import type { Session } from "../../models/Session";

interface TeamCreationResponse {
	team: {
		id: string;
		name: string;
		description?: string;
		velocity_baseline: number;
		sprint_length_days: number;
		working_days_per_week: number;
		created_by: string;
		created_at: string;
		updated_at: string;
	};
	userPromoted: boolean;
	membership: {
		id: string;
		team_id: string;
		user_id: string;
		joined_at: string;
	};
	message: string;
}

describe("Team Creation with Role Promotion Integration Tests", () => {
	let testUser: User;
	let testSession: Session;
	let sessionCookie: string;

	// Cleanup function to remove test data
	const cleanupTestData = async (): Promise<void> => {
		// Clean up in order to respect foreign key constraints
		await pool.query("DELETE FROM team_memberships WHERE user_id LIKE 'test-user-%'");
		await pool.query("DELETE FROM teams WHERE created_by LIKE 'test-user-%'");
		await pool.query("DELETE FROM sessions WHERE user_id LIKE 'test-user-%'");
		await pool.query("DELETE FROM password_history WHERE user_id LIKE 'test-user-%'");
		await pool.query("DELETE FROM users WHERE id LIKE 'test-user-%'");
	};

	beforeEach(async (): Promise<void> => {
		await cleanupTestData();

		// Create a test user with basic_user role (default for new registrations)
		testUser = await UserModel.create({
			email: "basicuser@roletest.com",
			password: "SecurePassword123!",
			first_name: "Basic",
			last_name: "User",
			role: "basic_user"
		});

		// Create session for authentication
		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "127.0.0.1",
			user_agent: "test-agent"
		});

		sessionCookie = `sessionToken=${testSession.session_token}`;
	});

	afterEach(async (): Promise<void> => {
		await cleanupTestData();
	});

	describe("Role Promotion for Basic Users", () => {
		it("should promote basic_user to team_lead when creating their first team", async (): Promise<void> => {
			// ARRANGE
			const teamData = {
				name: "First Team",
				description: "User's first team for promotion test",
				velocity_baseline: 10,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(teamData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as TeamCreationResponse;
			
			// Verify team creation
			expect(responseBody.team).toBeDefined();
			expect(responseBody.team.name).toBe(teamData.name);
			expect(responseBody.team.created_by).toBe(testUser.id);

			// Verify role promotion occurred
			expect(responseBody.userPromoted).toBe(true);
			expect(responseBody.message).toContain("promoted to team lead");

			// Verify membership creation
			expect(responseBody.membership).toBeDefined();
			expect(responseBody.membership.team_id).toBe(responseBody.team.id);
			expect(responseBody.membership.user_id).toBe(testUser.id);

			// Verify user role was actually updated in database
			const updatedUser = await UserModel.findById(testUser.id);
			expect(updatedUser?.role).toBe("team_lead");
		});

		it("should not promote basic_user when creating a second team", async (): Promise<void> => {
			// ARRANGE - Create first team to establish user as having teams already
			await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send({
					name: "First Team",
					description: "Initial team",
					velocity_baseline: 10
				})
				.expect(201);

			// Verify user was promoted after first team
			const userAfterFirstTeam = await UserModel.findById(testUser.id);
			expect(userAfterFirstTeam?.role).toBe("team_lead");

			const secondTeamData = {
				name: "Second Team",
				description: "User's second team",
				velocity_baseline: 15,
				sprint_length_days: 10
			};

			// ACT - Create second team
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(secondTeamData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as TeamCreationResponse;
			
			// Verify team creation
			expect(responseBody.team.name).toBe(secondTeamData.name);
			
			// Verify no promotion occurred (user is already team_lead)
			expect(responseBody.userPromoted).toBe(false);
			expect(responseBody.message).toBe("Team created successfully.");

			// Verify user role remains team_lead
			const finalUser = await UserModel.findById(testUser.id);
			expect(finalUser?.role).toBe("team_lead");
		});
	});

	describe("No Promotion for Existing Team Members", () => {
		it("should not promote team_member when creating a team", async (): Promise<void> => {
			// ARRANGE - Update user to team_member role first
			await UserModel.update(testUser.id, { role: "team_member" });

			const teamData = {
				name: "Team Member's Team",
				description: "Team created by existing team member",
				velocity_baseline: 12
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(teamData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as TeamCreationResponse;
			
			// Verify team creation
			expect(responseBody.team.name).toBe(teamData.name);
			
			// Verify no promotion occurred
			expect(responseBody.userPromoted).toBe(false);
			expect(responseBody.message).toBe("Team created successfully.");

			// Verify user role remains team_member
			const updatedUser = await UserModel.findById(testUser.id);
			expect(updatedUser?.role).toBe("team_member");
		});

		it("should not promote team_lead when creating additional teams", async (): Promise<void> => {
			// ARRANGE - Update user to team_lead role first
			await UserModel.update(testUser.id, { role: "team_lead" });

			const teamData = {
				name: "Team Lead's New Team",
				description: "Additional team by existing team lead",
				velocity_baseline: 20
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(teamData)
				.expect(201);

			// ASSERT
			const responseBody = response.body as TeamCreationResponse;
			
			// Verify team creation
			expect(responseBody.team.name).toBe(teamData.name);
			
			// Verify no promotion occurred
			expect(responseBody.userPromoted).toBe(false);
			expect(responseBody.message).toBe("Team created successfully.");

			// Verify user role remains team_lead
			const updatedUser = await UserModel.findById(testUser.id);
			expect(updatedUser?.role).toBe("team_lead");
		});
	});

	describe("Authentication and Authorization", () => {
		it("should require authentication for team creation", async (): Promise<void> => {
			// ARRANGE
			const teamData = {
				name: "Unauthorized Team",
				description: "Should not be created"
			};

			// ACT & ASSERT - No session cookie provided
			await request(app as Application)
				.post("/api/teams")
				.send(teamData)
				.expect(401);
		});

		it("should reject invalid session tokens", async (): Promise<void> => {
			// ARRANGE
			const teamData = {
				name: "Invalid Session Team",
				description: "Should not be created"
			};

			// ACT & ASSERT - Invalid session token
			await request(app as Application)
				.post("/api/teams")
				.set("Cookie", "sessionToken=invalid-token-123")
				.send(teamData)
				.expect(401);
		});
	});

	describe("Team Membership Management", () => {
		it("should automatically add team creator as team member", async (): Promise<void> => {
			// ARRANGE
			const teamData = {
				name: "Membership Test Team",
				description: "Testing automatic membership creation",
				velocity_baseline: 8
			};

			// ACT
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(teamData)
				.expect(201);

			const responseBody = response.body as TeamCreationResponse;

			// ASSERT - Verify membership was created
			expect(responseBody.membership).toBeDefined();
			expect(responseBody.membership.team_id).toBe(responseBody.team.id);
			expect(responseBody.membership.user_id).toBe(testUser.id);

			// Verify membership exists in database
			const isMemeber = await TeamModel.isMember(responseBody.team.id, testUser.id);
			expect(isMemeber).toBe(true);

			// Verify user can be retrieved as team member
			const members = await TeamModel.getMembers(responseBody.team.id);
			expect(members).toHaveLength(1);
			expect(members[0]?.id).toBe(testUser.id);
		});
	});

	describe("Error Handling", () => {
		it("should handle validation errors during team creation", async (): Promise<void> => {
			// ARRANGE - Invalid team data (missing required name)
			const invalidTeamData = {
				description: "Team without a name",
				velocity_baseline: "invalid" // Should be number
			};

			// ACT & ASSERT
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(invalidTeamData)
				.expect(400);

			expect((response.body as { message: string }).message).toContain("Validation error");
		});

		it("should handle database errors gracefully", async (): Promise<void> => {
			// ARRANGE - Create team with extremely long name to potentially trigger database error
			const teamData = {
				name: "A".repeat(300), // Assuming there's a length limit
				description: "Testing database constraints"
			};

			// ACT & ASSERT - Expect either 400 (validation) or 500 (database constraint)
			const response = await request(app as Application)
				.post("/api/teams")
				.set("Cookie", sessionCookie)
				.send(teamData);

			expect([400, 500]).toContain(response.status);
		});
	});
});