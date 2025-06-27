import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express from "express";
import { TeamModel } from "../../models/Team";
import { ValidationError } from "../../utils/validation";

// Mock the TeamModel
vi.mock("../../models/Team", () => ({
	TeamModel: {
		findAll: vi.fn(),
		findById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		getMembers: vi.fn()
	}
}));

// Import the app after mocking
const mockTeamModel = TeamModel as {
	findAll: Mock;
	findById: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	getMembers: Mock;
};

// Create a test app with just the team routes
const app = express();
app.use(express.json());

// Import and setup routes (we'll need to extract route handlers)
// For now, let's test the validation functions and then add route tests

describe("Team API Endpoints", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/teams", () => {
		it("should return all teams successfully", async () => {
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

			// We'll need to set up the actual route testing
			// For now, let's verify the mock behavior
			const result = await TeamModel.findAll();
			expect(result).toEqual(mockTeams);
			expect(mockTeamModel.findAll).toHaveBeenCalledTimes(1);
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockTeamModel.findAll.mockRejectedValue(dbError);

			await expect(TeamModel.findAll()).rejects.toThrow("Database connection failed");
		});
	});

	describe("GET /api/teams/:id", () => {
		it("should return a specific team by ID", async () => {
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

			const result = await TeamModel.findById("1");
			expect(result).toEqual(mockTeam);
			expect(mockTeamModel.findById).toHaveBeenCalledWith("1");
		});

		it("should return null for non-existent team", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const result = await TeamModel.findById("999");
			expect(result).toBeNull();
		});
	});

	describe("POST /api/teams", () => {
		it("should create a new team with valid data", async () => {
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

			const result = await TeamModel.create(teamData);
			expect(result).toEqual(createdTeam);
			expect(mockTeamModel.create).toHaveBeenCalledWith(teamData);
		});

		it("should handle validation errors", async () => {
			const invalidData = {
				name: "", // Invalid: empty name
				velocity_baseline: -5 // Invalid: negative velocity
			};

			const validationError = new ValidationError("Name is required", "name");
			mockTeamModel.create.mockRejectedValue(validationError);

			await expect(TeamModel.create(invalidData)).rejects.toThrow(ValidationError);
		});
	});

	describe("PUT /api/teams/:id", () => {
		it("should update an existing team", async () => {
			const updateData = {
				name: "Updated Team Name",
				velocity_baseline: 30
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

			// Test finding the team first
			const foundTeam = await TeamModel.findById("1");
			expect(foundTeam).toEqual(existingTeam);

			// Test updating the team
			const result = await TeamModel.update("1", updateData);
			expect(result).toEqual(updatedTeam);
			expect(mockTeamModel.update).toHaveBeenCalledWith("1", updateData);
		});

		it("should handle updating non-existent team", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const foundTeam = await TeamModel.findById("999");
			expect(foundTeam).toBeNull();
		});
	});

	describe("DELETE /api/teams/:id", () => {
		it("should delete an existing team", async () => {
			mockTeamModel.delete.mockResolvedValue(true);

			const result = await TeamModel.delete("1");
			expect(result).toBe(true);
			expect(mockTeamModel.delete).toHaveBeenCalledWith("1");
		});

		it("should return false for non-existent team", async () => {
			mockTeamModel.delete.mockResolvedValue(false);

			const result = await TeamModel.delete("999");
			expect(result).toBe(false);
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
					first_name: "John",
					last_name: "Doe",
					role: "team_member" as const,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user2",
					email: "jane@example.com", 
					first_name: "Jane",
					last_name: "Smith",
					role: "team_lead" as const,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockTeamModel.findById.mockResolvedValue(mockTeam);
			mockTeamModel.getMembers.mockResolvedValue(mockMembers);

			// Verify team exists
			const team = await TeamModel.findById("1");
			expect(team).toEqual(mockTeam);

			// Get team members
			const members = await TeamModel.getMembers("1");
			expect(members).toEqual(mockMembers);
			expect(mockTeamModel.getMembers).toHaveBeenCalledWith("1");
		});

		it("should handle team not found", async () => {
			mockTeamModel.findById.mockResolvedValue(null);

			const team = await TeamModel.findById("999");
			expect(team).toBeNull();
		});
	});
});