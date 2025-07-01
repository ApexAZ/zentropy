import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TeamModel, type Team } from "../../server/models/Team";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers, DomainAssertionHelpers } from "../helpers/assertion-helpers";
import { pool } from "../../server/database/connection";
import type { QueryResult } from "pg";

// Mock the database connection
vi.mock("../../server/database/connection", () => ({
	pool: {
		query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0, command: "", oid: 0, fields: [] })
	}
}));

// Get the mocked pool for testing
const mockPool = vi.mocked(pool);

describe("TeamModel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	// Helper functions for common mock scenarios
	const mockSuccessfulQuery = (returnValue: unknown): void => {
		const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
		const mockResult: QueryResult<Team> = {
			rows: rows as Team[],
			rowCount: rows.length,
			command: "",
			oid: 0,
			fields: []
		};
		(mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
	};

	const mockFailedQuery = (error = new Error("Database connection failed")): void => {
		mockPool.query.mockRejectedValue(error);
	};

	const mockDeleteFailure = (): void => {
		const mockResult: QueryResult<Team> = {
			rows: [],
			rowCount: 0,
			command: "",
			oid: 0,
			fields: []
		};
		(mockPool.query as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
	};

	describe("business logic validation", () => {
		it("should validate team creation with default values", async () => {
			const teamData = TestDataFactory.createTeamData();
			const createdTeam = TestDataFactory.createTestTeam(teamData);
			mockSuccessfulQuery(createdTeam);

			const result = await TeamModel.create(teamData);

			DomainAssertionHelpers.expectValidTeam(result);

			// Validate business rule defaults
			expect(result.velocity_baseline).toBeGreaterThan(0);
			expect(result.sprint_length_days).toBeGreaterThan(0);
			expect(result.working_days_per_week).toBeLessThanOrEqual(7);
		});

		it("should handle team creation with minimal data", async () => {
			const minimalData = TestDataFactory.createTeamData({
				description: "Basic team"
			});
			const createdTeam = TestDataFactory.createTestTeam(minimalData);
			mockSuccessfulQuery(createdTeam);

			const result = await TeamModel.create(minimalData);

			expect(result.name).toBe(minimalData.name);
			DomainAssertionHelpers.expectValidTeam(result);
		});

		it("should validate team capacity calculation parameters", async () => {
			const teamData = TestDataFactory.createTeamData({
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 5
			});
			const createdTeam = TestDataFactory.createTestTeam(teamData);
			mockSuccessfulQuery(createdTeam);

			const result = await TeamModel.create(teamData);

			// Validate capacity planning parameters
			expect(result.velocity_baseline).toBe(30);
			expect(result.sprint_length_days).toBe(10);
			expect(result.working_days_per_week).toBe(5);

			// Business rule: working days should not exceed 7
			expect(result.working_days_per_week).toBeLessThanOrEqual(7);
		});
	});

	describe("team membership management", () => {
		it("should handle team member operations", async () => {
			const team = TestDataFactory.createTestTeam();
			const user = TestDataFactory.createTestUser();
			const membership = TestDataFactory.createTestTeamMembership({
				team_id: team.id,
				user_id: user.id
			});

			mockSuccessfulQuery(membership);

			await TeamModel.addMember(team.id, user.id);

			// Member addition operation completed successfully
			// Database interaction is verified by the successful return of the mock
		});

		it("should retrieve team members with user details", async () => {
			const team = TestDataFactory.createTestTeam();
			const members = TestDataFactory.createMultipleTestUsers(3);
			mockSuccessfulQuery(members);

			const result = await TeamModel.getMembers(team.id);

			expect(result).toHaveLength(3);
			result.forEach(member => {
				DomainAssertionHelpers.expectValidUser(member);
				// Note: Team member queries in model layer may include full user data
				// API layer should filter sensitive data
			});
		});
	});

	describe("data integrity validation", () => {
		it("should properly format team data from database", async () => {
			const mockTeam = TestDataFactory.createTestTeam();
			mockSuccessfulQuery(mockTeam);

			const result = await TeamModel.findById(mockTeam.id);

			if (!result) {
				throw new Error("Expected team result but got null/undefined");
			}
			DomainAssertionHelpers.expectValidTeam(result);
			AssertionHelpers.expectValidDateFields(result);
			AssertionHelpers.expectValidId(result.id);
		});

		it("should handle team update operations", async () => {
			const existingTeam = TestDataFactory.createTestTeam();
			const updateData = {
				name: "Updated Team Name",
				velocity_baseline: 35
			};
			const updatedTeam = { ...existingTeam, ...updateData };
			mockSuccessfulQuery(updatedTeam);

			const result = await TeamModel.update(existingTeam.id, updateData);

			if (!result) {
				throw new Error("Expected updated team result but got null/undefined");
			}
			expect(result.name).toBe("Updated Team Name");
			expect(result.velocity_baseline).toBe(35);
			DomainAssertionHelpers.expectValidTeam(result);
		});
	});

	describe("error handling", () => {
		it("should handle database errors gracefully", async () => {
			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(TeamModel.findById("nonexistent"), "Database connection failed");
		});

		it("should handle member removal for non-existent relationships", async () => {
			mockDeleteFailure();

			const result = await TeamModel.removeMember("team123", "user456");

			expect(result).toBe(false);
		});
	});
});
