import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { TeamModel } from "../../models/Team";
import { UserModel } from "../../models/User";
import type { User } from "../../models/User";
import type { Team } from "../../models/Team";
import {
	shouldPromoteUserToTeamLead,
	checkIfFirstTeamForUser,
	promoteUserToTeamLead,
	addUserAsTeamMember,
	handleTeamCreationWithRolePromotion
} from "../../utils/role-promotion-utils";

// Mock the models
vi.mock("../../models/Team");
vi.mock("../../models/User");

// Type the mocked models
const mockTeamModel = TeamModel as {
	create: Mock;
	findById: Mock;
	addMember: Mock;
};

const mockUserModel = UserModel as {
	findById: Mock;
	update: Mock;
};

describe("Role Promotion Logic Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("shouldPromoteUserToTeamLead", () => {
		it("should return true for basic_user creating their first team", () => {
			// ARRANGE
			const user: User = {
				id: "user-123",
				email: "basicuser@example.com",
				password_hash: "hash",
				first_name: "Basic",
				last_name: "User",
				role: "basic_user",
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			// ACT
			const shouldPromote = shouldPromoteUserToTeamLead(user.role, true);

			// ASSERT
			expect(shouldPromote).toBe(true);
		});

		it("should return false for team_member creating a team", () => {
			// ARRANGE
			const userRole = "team_member";
			const isFirstTeam = true;

			// ACT
			const shouldPromote = shouldPromoteUserToTeamLead(userRole, isFirstTeam);

			// ASSERT
			expect(shouldPromote).toBe(false);
		});

		it("should return false for team_lead creating a team", () => {
			// ARRANGE
			const userRole = "team_lead";
			const isFirstTeam = true;

			// ACT
			const shouldPromote = shouldPromoteUserToTeamLead(userRole, isFirstTeam);

			// ASSERT
			expect(shouldPromote).toBe(false);
		});

		it("should return false for basic_user who already has teams", () => {
			// ARRANGE
			const userRole = "basic_user";
			const isFirstTeam = false;

			// ACT
			const shouldPromote = shouldPromoteUserToTeamLead(userRole, isFirstTeam);

			// ASSERT
			expect(shouldPromote).toBe(false);
		});
	});

	describe("checkIfFirstTeamForUser", () => {
		it("should return true when user has no existing teams", async () => {
			// ARRANGE
			const userId = "user-123";
			mockTeamModel.findAll = vi.fn().mockResolvedValue([]);

			// ACT
			const isFirstTeam = await checkIfFirstTeamForUser(userId);

			// ASSERT
			expect(isFirstTeam).toBe(true);
		});

		it("should return false when user has existing teams", async () => {
			// ARRANGE
			const userId = "user-123";
			const existingTeams: Team[] = [
				{
					id: "team-456",
					name: "Existing Team",
					velocity_baseline: 10,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_by: userId,
					created_at: new Date(),
					updated_at: new Date()
				}
			];
			mockTeamModel.findAll = vi.fn().mockResolvedValue(existingTeams);

			// ACT
			const isFirstTeam = await checkIfFirstTeamForUser(userId);

			// ASSERT
			expect(isFirstTeam).toBe(false);
		});

		it("should handle database errors gracefully", async () => {
			// ARRANGE
			const userId = "user-123";
			const databaseError = new Error("Database connection failed");
			mockTeamModel.findAll = vi.fn().mockRejectedValue(databaseError);

			// ACT & ASSERT
			await expect(checkIfFirstTeamForUser(userId)).rejects.toThrow("Database connection failed");
		});
	});

	describe("promoteUserToTeamLead", () => {
		it("should successfully promote basic_user to team_lead", async () => {
			// ARRANGE
			const userId = "user-123";
			const promotedUser: User = {
				id: userId,
				email: "promoted@example.com",
				password_hash: "hash",
				first_name: "Promoted",
				last_name: "User",
				role: "team_lead",
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.update.mockResolvedValue(promotedUser);

			// ACT
			const result = await promoteUserToTeamLead(userId);

			// ASSERT
			expect(result).toEqual(promotedUser);
			expect(mockUserModel.update).toHaveBeenCalledWith(userId, { role: "team_lead" });
		});

		it("should handle promotion failure when user not found", async () => {
			// ARRANGE
			const userId = "nonexistent-user";
			mockUserModel.update.mockResolvedValue(null);

			// ACT & ASSERT
			await expect(promoteUserToTeamLead(userId)).rejects.toThrow("Failed to promote user to team lead");
		});

		it("should handle database errors during promotion", async () => {
			// ARRANGE
			const userId = "user-123";
			const databaseError = new Error("Update failed");
			mockUserModel.update.mockRejectedValue(databaseError);

			// ACT & ASSERT
			await expect(promoteUserToTeamLead(userId)).rejects.toThrow("Update failed");
		});
	});

	describe("addUserAsTeamMember", () => {
		it("should add user as team member after promotion", async () => {
			// ARRANGE
			const teamId = "team-456";
			const userId = "user-123";
			const membership = {
				id: "membership-789",
				team_id: teamId,
				user_id: userId,
				joined_at: new Date()
			};

			mockTeamModel.addMember.mockResolvedValue(membership);

			// ACT
			const result = await addUserAsTeamMember(teamId, userId);

			// ASSERT
			expect(result).toEqual(membership);
			expect(mockTeamModel.addMember).toHaveBeenCalledWith(teamId, userId);
		});

		it("should handle membership creation failure", async () => {
			// ARRANGE
			const teamId = "team-456";
			const userId = "user-123";
			const membershipError = new Error("Membership creation failed");
			mockTeamModel.addMember.mockRejectedValue(membershipError);

			// ACT & ASSERT
			await expect(addUserAsTeamMember(teamId, userId)).rejects.toThrow("Membership creation failed");
		});
	});

	describe("handleTeamCreationWithRolePromotion", () => {
		it("should handle complete team creation workflow with role promotion", async () => {
			// ARRANGE
			const teamData = {
				name: "New Team",
				description: "Test team",
				created_by: "user-123"
			};

			const user: User = {
				id: "user-123",
				email: "basicuser@example.com",
				password_hash: "hash",
				first_name: "Basic",
				last_name: "User",
				role: "basic_user",
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			const createdTeam: Team = {
				id: "team-456",
				name: "New Team",
				description: "Test team",
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_by: "user-123",
				created_at: new Date(),
				updated_at: new Date()
			};

			const promotedUser: User = { ...user, role: "team_lead" };
			const membership = {
				id: "membership-789",
				team_id: "team-456",
				user_id: "user-123",
				joined_at: new Date()
			};

			// Mock the workflow
			mockUserModel.findById.mockResolvedValue(user);
			mockTeamModel.findAll = vi.fn().mockResolvedValue([]); // First team
			mockTeamModel.create.mockResolvedValue(createdTeam);
			mockUserModel.update.mockResolvedValue(promotedUser);
			mockTeamModel.addMember.mockResolvedValue(membership);

			// ACT
			const result = await handleTeamCreationWithRolePromotion(teamData);

			// ASSERT
			expect(result).toEqual({
				team: createdTeam,
				userPromoted: true,
				membership: membership
			});

			// Verify the workflow execution
			expect(mockUserModel.findById).toHaveBeenCalledWith("user-123");
			expect(mockTeamModel.create).toHaveBeenCalledWith(teamData);
			expect(mockUserModel.update).toHaveBeenCalledWith("user-123", { role: "team_lead" });
			expect(mockTeamModel.addMember).toHaveBeenCalledWith("team-456", "user-123");
		});

		it("should handle team creation without role promotion for existing team_lead", async () => {
			// ARRANGE
			const teamData = {
				name: "Another Team",
				description: "Test team",
				created_by: "user-456"
			};

			const user: User = {
				id: "user-456",
				email: "teamlead@example.com",
				password_hash: "hash",
				first_name: "Team",
				last_name: "Lead",
				role: "team_lead",
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			const createdTeam: Team = {
				id: "team-789",
				name: "Another Team",
				description: "Test team",
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_by: "user-456",
				created_at: new Date(),
				updated_at: new Date()
			};

			const membership = {
				id: "membership-101",
				team_id: "team-789",
				user_id: "user-456",
				joined_at: new Date()
			};

			// Mock the workflow
			mockUserModel.findById.mockResolvedValue(user);
			mockTeamModel.create.mockResolvedValue(createdTeam);
			mockTeamModel.addMember.mockResolvedValue(membership);

			// ACT
			const result = await handleTeamCreationWithRolePromotion(teamData);

			// ASSERT
			expect(result).toEqual({
				team: createdTeam,
				userPromoted: false,
				membership: membership
			});

			// Verify no promotion occurred
			expect(mockUserModel.update).not.toHaveBeenCalled();
		});

		it("should handle missing created_by field", async () => {
			// ARRANGE
			const teamData = {
				name: "Team Without Creator",
				description: "Test team"
				// No created_by field
			};

			// ACT & ASSERT
			await expect(handleTeamCreationWithRolePromotion(teamData)).rejects.toThrow("Team creator user ID is required");
		});
	});
});