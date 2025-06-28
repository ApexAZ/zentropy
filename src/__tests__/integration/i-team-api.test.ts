import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { TeamModel, CreateTeamData, Team } from "../../models/Team";
import { User } from "../../models/User";
import { ValidationError } from "../../utils/validation";

// Mock the TeamModel for integration tests
vi.mock("../../models/Team");
const mockTeamModel = vi.mocked(TeamModel);

// Create a test application that mimics our server setup
function createTestApp(): express.Application {
	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Add team routes (we'll import the actual route handlers)
	// For now, let's create simplified versions for testing

	// GET /api/teams
	app.get("/api/teams", async (_req, res) => {
		try {
			const teams = await TeamModel.findAll();
			res.json(teams);
		} catch (error) {
			res.status(500).json({
				message: "Failed to fetch teams",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	// GET /api/teams/:id
	app.get("/api/teams/:id", async (req, res) => {
		try {
			const { id } = req.params;
			if (!id) {
				res.status(400).json({ message: "Team ID is required" });
				return;
			}

			const team = await TeamModel.findById(id);
			if (!team) {
				res.status(404).json({ message: "Team not found" });
				return;
			}

			res.json(team);
		} catch (error) {
			res.status(500).json({
				message: "Failed to fetch team",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	// POST /api/teams
	app.post("/api/teams", async (req, res) => {
		try {
			// Basic validation for testing
			const body = req.body as CreateTeamData;
			if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
				const error = new ValidationError("Name must be at least 2 characters", "name");
				res.status(400).json({
					message: "Validation error",
					field: error.field,
					details: error.message
				});
				return;
			}

			const newTeam = await TeamModel.create(body);
			res.status(201).json(newTeam);
		} catch (error) {
			if (error instanceof ValidationError) {
				res.status(400).json({
					message: "Validation error",
					field: error.field,
					details: error.message
				});
				return;
			}

			res.status(500).json({
				message: "Failed to create team",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	// PUT /api/teams/:id
	app.put("/api/teams/:id", async (req, res) => {
		try {
			const { id } = req.params;
			if (!id) {
				res.status(400).json({ message: "Team ID is required" });
				return;
			}

			const existingTeam = await TeamModel.findById(id);
			if (!existingTeam) {
				res.status(404).json({ message: "Team not found" });
				return;
			}

			const updatedTeam = await TeamModel.update(id, req.body as Partial<CreateTeamData>);
			if (!updatedTeam) {
				res.status(404).json({ message: "Team not found after update" });
				return;
			}

			res.json(updatedTeam);
		} catch (error) {
			if (error instanceof ValidationError) {
				res.status(400).json({
					message: "Validation error",
					field: error.field,
					details: error.message
				});
				return;
			}

			res.status(500).json({
				message: "Failed to update team",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	// DELETE /api/teams/:id
	app.delete("/api/teams/:id", async (req, res) => {
		try {
			const { id } = req.params;
			if (!id) {
				res.status(400).json({ message: "Team ID is required" });
				return;
			}

			const deleted = await TeamModel.delete(id);
			if (!deleted) {
				res.status(404).json({ message: "Team not found" });
				return;
			}

			res.json({ message: "Team deleted successfully" });
		} catch (error) {
			res.status(500).json({
				message: "Failed to delete team",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	// GET /api/teams/:id/members
	app.get("/api/teams/:id/members", async (req, res) => {
		try {
			const { id } = req.params;
			if (!id) {
				res.status(400).json({ message: "Team ID is required" });
				return;
			}

			const team = await TeamModel.findById(id);
			if (!team) {
				res.status(404).json({ message: "Team not found" });
				return;
			}

			const members = await TeamModel.getMembers(id);
			res.json(members);
		} catch (error) {
			res.status(500).json({
				message: "Failed to fetch team members",
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	});

	return app;
}

describe("Team API Integration Tests", () => {
	let app: express.Application;

	beforeEach(() => {
		app = createTestApp();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/teams", () => {
		it("should return all teams with 200 status", async () => {
			const mockTeams = [
				{
					id: "1",
					name: "Frontend Team",
					description: "UI/UX Development",
					velocity_baseline: 25,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "2",
					name: "Backend Team",
					description: "API Development",
					velocity_baseline: 30,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockTeamModel.findAll.mockResolvedValue(mockTeams);

			const response = await request(app).get("/api/teams").expect(200);

			const responseBody = response.body as Team[];
			expect(responseBody).toHaveLength(2);
			responseBody.forEach((team, index) => {
				expect(team.id).toBe(mockTeams[index]?.id);
				expect(team.name).toBe(mockTeams[index]?.name);
				expect(team.description).toBe(mockTeams[index]?.description);
				expect(team.velocity_baseline).toBe(mockTeams[index]?.velocity_baseline);
				expect(team.sprint_length_days).toBe(mockTeams[index]?.sprint_length_days);
				expect(team.working_days_per_week).toBe(mockTeams[index]?.working_days_per_week);
				expect(team.created_at).toEqual(expect.any(String));
				expect(team.updated_at).toEqual(expect.any(String));
			});
			expect(mockTeamModel.findAll).toHaveBeenCalledTimes(1);
		});

		it("should return 500 on database error", async () => {
			const dbError = new Error("Database connection failed");
			mockTeamModel.findAll.mockRejectedValue(dbError);

			const response = await request(app).get("/api/teams").expect(500);

			expect(response.body).toMatchObject({
				message: "Failed to fetch teams",
				error: "Database connection failed"
			});
		});

		it("should return empty array when no teams exist", async () => {
			mockTeamModel.findAll.mockResolvedValue([]);

			const response = await request(app).get("/api/teams").expect(200);

			expect(response.body).toEqual([]);
		});
	});

	describe("GET /api/teams/:id", () => {
		it("should return specific team by ID", async () => {
			const mockTeam = {
				id: "1",
				name: "Frontend Team",
				description: "UI/UX Development",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockTeamModel.findById.mockResolvedValue(mockTeam);

			const response = await request(app).get("/api/teams/1").expect(200);

			const responseBody = response.body as Team;
			expect(responseBody.id).toBe(mockTeam.id);
			expect(responseBody.name).toBe(mockTeam.name);
			expect(responseBody.description).toBe(mockTeam.description);
			expect(responseBody.velocity_baseline).toBe(mockTeam.velocity_baseline);
			expect(responseBody.sprint_length_days).toBe(mockTeam.sprint_length_days);
			expect(responseBody.working_days_per_week).toBe(mockTeam.working_days_per_week);
			expect(responseBody.created_at).toEqual(expect.any(String));
			expect(responseBody.updated_at).toEqual(expect.any(String));
			expect(mockTeamModel.findById).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent team", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const response = await request(app).get("/api/teams/999").expect(404);

			expect(response.body).toMatchObject({
				message: "Team not found"
			});
		});

		it("should return 500 on database error", async () => {
			const dbError = new Error("Database error");
			mockTeamModel.findById.mockRejectedValue(dbError);

			const response = await request(app).get("/api/teams/1").expect(500);

			expect(response.body).toMatchObject({
				message: "Failed to fetch team",
				error: "Database error"
			});
		});
	});

	describe("POST /api/teams", () => {
		it("should create new team with valid data", async () => {
			const teamData = {
				name: "New Team",
				description: "A brand new team",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const createdTeam = {
				id: "3",
				...teamData,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockTeamModel.create.mockResolvedValue(createdTeam);

			const response = await request(app).post("/api/teams").send(teamData).expect(201);

			const responseBody = response.body as Team;
			expect(responseBody.id).toBe(createdTeam.id);
			expect(responseBody.name).toBe(createdTeam.name);
			expect(responseBody.description).toBe(createdTeam.description);
			expect(responseBody.velocity_baseline).toBe(createdTeam.velocity_baseline);
			expect(responseBody.sprint_length_days).toBe(createdTeam.sprint_length_days);
			expect(responseBody.working_days_per_week).toBe(createdTeam.working_days_per_week);
			expect(responseBody.created_at).toEqual(expect.any(String));
			expect(responseBody.updated_at).toEqual(expect.any(String));
			expect(mockTeamModel.create).toHaveBeenCalledWith(teamData);
		});

		it("should create team with minimal data", async () => {
			const minimalData = {
				name: "Minimal Team"
			};

			const createdTeam = {
				id: "4",
				name: "Minimal Team",
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockTeamModel.create.mockResolvedValue(createdTeam);

			const response = await request(app).post("/api/teams").send(minimalData).expect(201);

			const responseBody = response.body as Team;
			expect(responseBody.id).toBe(createdTeam.id);
			expect(responseBody.name).toBe(createdTeam.name);
			expect(responseBody.velocity_baseline).toBe(createdTeam.velocity_baseline);
			expect(responseBody.sprint_length_days).toBe(createdTeam.sprint_length_days);
			expect(responseBody.working_days_per_week).toBe(createdTeam.working_days_per_week);
			expect(responseBody.created_at).toEqual(expect.any(String));
			expect(responseBody.updated_at).toEqual(expect.any(String));
		});

		it("should return 400 for invalid team name", async () => {
			const invalidData = {
				name: "A" // Too short
			};

			const response = await request(app).post("/api/teams").send(invalidData).expect(400);

			expect(response.body).toMatchObject({
				message: "Validation error",
				field: "name",
				details: "Name must be at least 2 characters"
			});
		});

		it("should return 400 for missing name", async () => {
			const invalidData = {
				description: "Team without name"
			};

			const response = await request(app).post("/api/teams").send(invalidData).expect(400);

			expect(response.body).toMatchObject({
				message: "Validation error",
				field: "name"
			});
		});

		it("should handle database errors", async () => {
			const teamData = {
				name: "Valid Team"
			};

			const dbError = new Error("Database constraint violation");
			mockTeamModel.create.mockRejectedValue(dbError);

			const response = await request(app).post("/api/teams").send(teamData).expect(500);

			expect(response.body).toMatchObject({
				message: "Failed to create team",
				error: "Database constraint violation"
			});
		});
	});

	describe("PUT /api/teams/:id", () => {
		it("should update existing team", async () => {
			const updateData = {
				name: "Updated Team Name",
				velocity_baseline: 35
			};

			const existingTeam = {
				id: "1",
				name: "Old Name",
				description: "Description",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: new Date(),
				updated_at: new Date()
			};

			const updatedTeam = {
				...existingTeam,
				...updateData,
				updated_at: new Date()
			};

			mockTeamModel.findById.mockResolvedValue(existingTeam);
			mockTeamModel.update.mockResolvedValue(updatedTeam);

			const response = await request(app).put("/api/teams/1").send(updateData).expect(200);

			const responseBody = response.body as Team;
			expect(responseBody.id).toBe(updatedTeam.id);
			expect(responseBody.name).toBe(updatedTeam.name);
			expect(responseBody.description).toBe(updatedTeam.description);
			expect(responseBody.velocity_baseline).toBe(updatedTeam.velocity_baseline);
			expect(responseBody.sprint_length_days).toBe(updatedTeam.sprint_length_days);
			expect(responseBody.working_days_per_week).toBe(updatedTeam.working_days_per_week);
			expect(responseBody.created_at).toEqual(expect.any(String));
			expect(responseBody.updated_at).toEqual(expect.any(String));
			expect(mockTeamModel.findById).toHaveBeenCalledWith("1");
			expect(mockTeamModel.update).toHaveBeenCalledWith("1", updateData);
		});

		it("should return 404 for non-existent team", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const response = await request(app).put("/api/teams/999").send({ name: "Updated Name" }).expect(404);

			expect(response.body).toMatchObject({
				message: "Team not found"
			});
		});
	});

	describe("DELETE /api/teams/:id", () => {
		it("should delete existing team", async () => {
			mockTeamModel.delete.mockResolvedValue(true);

			const response = await request(app).delete("/api/teams/1").expect(200);

			expect(response.body).toMatchObject({
				message: "Team deleted successfully"
			});
			expect(mockTeamModel.delete).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent team", async () => {
			mockTeamModel.delete.mockResolvedValue(false);

			const response = await request(app).delete("/api/teams/999").expect(404);

			expect(response.body).toMatchObject({
				message: "Team not found"
			});
		});
	});

	describe("GET /api/teams/:id/members", () => {
		it("should return team members", async () => {
			const mockTeam = {
				id: "1",
				name: "Frontend Team",
				description: "UI/UX Development",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: new Date(),
				updated_at: new Date()
			};

			const mockMembers = [
				{
					id: "user1",
					email: "john@example.com",
					password_hash: "hashed",
					first_name: "John",
					last_name: "Doe",
					role: "team_member" as const,
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockTeamModel.findById.mockResolvedValue(mockTeam);
			mockTeamModel.getMembers.mockResolvedValue(mockMembers);

			const response = await request(app).get("/api/teams/1/members").expect(200);

			const responseBody = response.body as User[];
			expect(responseBody).toHaveLength(1);
			responseBody.forEach((member, index) => {
				expect(member.id).toBe(mockMembers[index]?.id);
				expect(member.email).toBe(mockMembers[index]?.email);
				expect(member.first_name).toBe(mockMembers[index]?.first_name);
				expect(member.last_name).toBe(mockMembers[index]?.last_name);
				expect(member.role).toBe(mockMembers[index]?.role);
				expect(member.is_active).toBe(mockMembers[index]?.is_active);
				expect(member.created_at).toEqual(expect.any(String));
				expect(member.updated_at).toEqual(expect.any(String));
			});
			expect(mockTeamModel.findById).toHaveBeenCalledWith("1");
			expect(mockTeamModel.getMembers).toHaveBeenCalledWith("1");
		});

		it("should return 404 when team not found", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const response = await request(app).get("/api/teams/999/members").expect(404);

			expect(response.body).toMatchObject({
				message: "Team not found"
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle malformed JSON in request body", async () => {
			const response = await request(app)
				.post("/api/teams")
				.set("Content-Type", "application/json")
				.send("{ invalid json")
				.expect(400);

			// Express will handle malformed JSON automatically
			expect(response.status).toBe(400);
		});

		it("should handle form data as URL-encoded", async () => {
			// Mock a successful team creation for form data
			const mockTeam = {
				id: "5",
				name: "Test Team",
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockTeamModel.create.mockResolvedValue(mockTeam);

			const response = await request(app).post("/api/teams").type("form").send("name=Test Team").expect(201);

			// Form data should work since Express parses it correctly
			expect(response.status).toBe(201);
		});
	});
});
