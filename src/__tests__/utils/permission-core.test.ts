import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	// Core Permission Functions
	canUserAccessTeams,
	canUserCreateTeam,
	canUserManageTeam,
	canUserViewTeamDetails,
	canUserAddMembers,
	canUserRemoveMembers,
	canUserSendInvitations,
	canUserModifyTeamSettings,
	validateUserPermissions,
	getRestrictedActionMessage,
	shouldRedirectToUpgrade,
	getUserPermissions,
	hasAnyTeamPermissions,
	isEffectiveTeamLead,
	isAtLeastTeamMember,
	getRoleDisplayName,
	getRoleDescription,
	// UI Permission Functions
	checkUserPermissions,
	checkUIPermission,
	formatRoleForDisplay,
	shouldShowTeamFeatures,
	shouldShowManagementFeatures,
	getUpgradeMessage,
	requiresTeamLead,
	getRoleStyleClass,
	canPerformBulkOperations,
	getPermissionStatus,
	// Role Promotion Functions
	shouldPromoteUserToTeamLead,
	checkIfFirstTeamForUser,
	promoteUserToTeamLead,
	addUserAsTeamMember,
	handleTeamCreationWithRolePromotion,
	// Types
	type PermissionAction
} from "../../utils/permission-core";
import type { UserRole } from "../../models/User";

// Mock the dependencies for role-promotion-utils tests
vi.mock("../../models/Team", () => ({
	TeamModel: {
		findAll: vi.fn(),
		create: vi.fn(),
		addMember: vi.fn()
	}
}));

vi.mock("../../models/User", () => ({
	UserModel: {
		findById: vi.fn(),
		update: vi.fn()
	}
}));

import { TeamModel } from "../../models/Team";
import { UserModel } from "../../models/User";

describe("Permission Core", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============= CORE PERMISSION FUNCTIONS (from permission-controls) =============
	describe("Core Permission Functions", () => {
		describe("canUserAccessTeams", () => {
			it("should allow team lead to access teams", () => {
				expect(canUserAccessTeams("team_lead")).toBe(true);
			});

			it("should allow team member to access teams", () => {
				expect(canUserAccessTeams("team_member")).toBe(true);
			});

			it("should not allow basic user to access teams", () => {
				expect(canUserAccessTeams("basic_user")).toBe(false);
			});
		});

		describe("canUserCreateTeam", () => {
			it("should allow all roles to create teams", () => {
				expect(canUserCreateTeam("team_lead")).toBe(true);
				expect(canUserCreateTeam("team_member")).toBe(true);
				expect(canUserCreateTeam("basic_user")).toBe(true);
			});
		});

		describe("canUserManageTeam", () => {
			it("should allow team lead to manage teams", () => {
				expect(canUserManageTeam("team_lead")).toBe(true);
			});

			it("should not allow team member to manage teams", () => {
				expect(canUserManageTeam("team_member")).toBe(false);
			});

			it("should not allow basic user to manage teams", () => {
				expect(canUserManageTeam("basic_user")).toBe(false);
			});
		});

		describe("canUserViewTeamDetails", () => {
			it("should allow team lead to view team details", () => {
				expect(canUserViewTeamDetails("team_lead")).toBe(true);
			});

			it("should allow team member to view team details", () => {
				expect(canUserViewTeamDetails("team_member")).toBe(true);
			});

			it("should not allow basic user to view team details", () => {
				expect(canUserViewTeamDetails("basic_user")).toBe(false);
			});
		});

		describe("canUserAddMembers", () => {
			it("should allow team lead to add members", () => {
				expect(canUserAddMembers("team_lead")).toBe(true);
			});

			it("should not allow team member to add members", () => {
				expect(canUserAddMembers("team_member")).toBe(false);
			});

			it("should not allow basic user to add members", () => {
				expect(canUserAddMembers("basic_user")).toBe(false);
			});
		});

		describe("canUserRemoveMembers", () => {
			it("should allow team lead to remove members", () => {
				expect(canUserRemoveMembers("team_lead")).toBe(true);
			});

			it("should not allow team member to remove members", () => {
				expect(canUserRemoveMembers("team_member")).toBe(false);
			});

			it("should not allow basic user to remove members", () => {
				expect(canUserRemoveMembers("basic_user")).toBe(false);
			});
		});

		describe("canUserSendInvitations", () => {
			it("should allow team lead to send invitations", () => {
				expect(canUserSendInvitations("team_lead")).toBe(true);
			});

			it("should not allow team member to send invitations", () => {
				expect(canUserSendInvitations("team_member")).toBe(false);
			});

			it("should not allow basic user to send invitations", () => {
				expect(canUserSendInvitations("basic_user")).toBe(false);
			});
		});

		describe("canUserModifyTeamSettings", () => {
			it("should allow team lead to modify team settings", () => {
				expect(canUserModifyTeamSettings("team_lead")).toBe(true);
			});

			it("should not allow team member to modify team settings", () => {
				expect(canUserModifyTeamSettings("team_member")).toBe(false);
			});

			it("should not allow basic user to modify team settings", () => {
				expect(canUserModifyTeamSettings("basic_user")).toBe(false);
			});
		});

		describe("validateUserPermissions", () => {
			it("should return valid permissions for team lead", () => {
				const result = validateUserPermissions("team_lead", "manage_team");

				expect(result.hasPermission).toBe(true);
				expect(result.message).toBe("");
				expect(result.redirectToUpgrade).toBe(false);
			});

			it("should return invalid permissions for basic user accessing teams", () => {
				const result = validateUserPermissions("basic_user", "access_teams");

				expect(result.hasPermission).toBe(false);
				expect(result.message).toContain("join a team");
				expect(result.redirectToUpgrade).toBe(true);
			});

			it("should return invalid permissions for team member managing teams", () => {
				const result = validateUserPermissions("team_member", "manage_team");

				expect(result.hasPermission).toBe(false);
				expect(result.message).toContain("team lead");
				expect(result.redirectToUpgrade).toBe(false);
			});

			it("should handle invalid permission actions gracefully", () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				const result = validateUserPermissions("team_lead", "invalid_action" as any);

				expect(result.hasPermission).toBe(false);
				expect(result.message).toContain("Unknown permission");
			});

			it("should handle null/undefined role gracefully", () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				const result = validateUserPermissions(null as any, "access_teams");

				expect(result.hasPermission).toBe(false);
				expect(result.message).toContain("sufficient permissions");
				expect(result.redirectToUpgrade).toBe(false);
			});
		});

		describe("getRestrictedActionMessage", () => {
			it("should return appropriate message for basic user restrictions", () => {
				const message = getRestrictedActionMessage("basic_user", "access_teams");

				expect(message).toContain("join a team");
				expect(message).toContain("Create a new team");
			});

			it("should return appropriate message for team member restrictions", () => {
				const message = getRestrictedActionMessage("team_member", "manage_team");

				expect(message).toContain("team lead");
				expect(message).toContain("Contact your team lead");
			});

			it("should return generic message for unknown restrictions", () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				const message = getRestrictedActionMessage("team_lead", "unknown_action" as any);

				expect(message).toContain("sufficient permissions");
			});
		});

		describe("shouldRedirectToUpgrade", () => {
			it("should recommend redirect for basic user accessing teams", () => {
				expect(shouldRedirectToUpgrade("basic_user", "access_teams")).toBe(true);
			});

			it("should recommend redirect for basic user viewing team details", () => {
				expect(shouldRedirectToUpgrade("basic_user", "view_team_details")).toBe(true);
			});

			it("should not recommend redirect for team member restrictions", () => {
				expect(shouldRedirectToUpgrade("team_member", "manage_team")).toBe(false);
			});

			it("should not recommend redirect for valid permissions", () => {
				expect(shouldRedirectToUpgrade("team_lead", "manage_team")).toBe(false);
			});
		});

		describe("getUserPermissions", () => {
			it("should return comprehensive permissions for team lead", () => {
				const permissions = getUserPermissions("team_lead");

				expect(permissions.canAccessTeams).toBe(true);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(true);
				expect(permissions.canViewTeamDetails).toBe(true);
				expect(permissions.canAddMembers).toBe(true);
				expect(permissions.canRemoveMembers).toBe(true);
				expect(permissions.canSendInvitations).toBe(true);
				expect(permissions.canModifyTeamSettings).toBe(true);
			});

			it("should return limited permissions for team member", () => {
				const permissions = getUserPermissions("team_member");

				expect(permissions.canAccessTeams).toBe(true);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(false);
				expect(permissions.canViewTeamDetails).toBe(true);
				expect(permissions.canAddMembers).toBe(false);
				expect(permissions.canRemoveMembers).toBe(false);
				expect(permissions.canSendInvitations).toBe(false);
				expect(permissions.canModifyTeamSettings).toBe(false);
			});

			it("should return minimal permissions for basic user", () => {
				const permissions = getUserPermissions("basic_user");

				expect(permissions.canAccessTeams).toBe(false);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(false);
				expect(permissions.canViewTeamDetails).toBe(false);
				expect(permissions.canAddMembers).toBe(false);
				expect(permissions.canRemoveMembers).toBe(false);
				expect(permissions.canSendInvitations).toBe(false);
				expect(permissions.canModifyTeamSettings).toBe(false);
			});
		});

		describe("hasAnyTeamPermissions", () => {
			it("should return true for team lead", () => {
				expect(hasAnyTeamPermissions("team_lead")).toBe(true);
			});

			it("should return true for team member", () => {
				expect(hasAnyTeamPermissions("team_member")).toBe(true);
			});

			it("should return true for basic user (can create teams)", () => {
				expect(hasAnyTeamPermissions("basic_user")).toBe(true);
			});
		});

		describe("isEffectiveTeamLead", () => {
			it("should return true for team lead", () => {
				expect(isEffectiveTeamLead("team_lead")).toBe(true);
			});

			it("should return false for team member", () => {
				expect(isEffectiveTeamLead("team_member")).toBe(false);
			});

			it("should return false for basic user", () => {
				expect(isEffectiveTeamLead("basic_user")).toBe(false);
			});
		});

		describe("isAtLeastTeamMember", () => {
			it("should return true for team lead", () => {
				expect(isAtLeastTeamMember("team_lead")).toBe(true);
			});

			it("should return true for team member", () => {
				expect(isAtLeastTeamMember("team_member")).toBe(true);
			});

			it("should return false for basic user", () => {
				expect(isAtLeastTeamMember("basic_user")).toBe(false);
			});
		});

		describe("getRoleDisplayName", () => {
			it("should return display names for all roles", () => {
				expect(getRoleDisplayName("basic_user")).toBe("Basic User");
				expect(getRoleDisplayName("team_member")).toBe("Team Member");
				expect(getRoleDisplayName("team_lead")).toBe("Team Lead");
			});

			it("should handle invalid role gracefully", () => {
				expect(getRoleDisplayName("invalid" as UserRole)).toBe("Unknown Role");
			});
		});

		describe("getRoleDescription", () => {
			it("should return descriptions for all roles", () => {
				const basicDesc = getRoleDescription("basic_user");
				const memberDesc = getRoleDescription("team_member");
				const leadDesc = getRoleDescription("team_lead");

				expect(basicDesc).toContain("profile");
				expect(basicDesc).toContain("create teams");
				expect(memberDesc).toContain("view team");
				expect(memberDesc).toContain("calendar");
				expect(leadDesc).toContain("manage teams");
				expect(leadDesc).toContain("add/remove members");
			});

			it("should handle invalid role gracefully", () => {
				const desc = getRoleDescription("invalid" as UserRole);
				expect(desc).toContain("Unknown role");
			});
		});
	});

	// ============= UI PERMISSION FUNCTIONS (from frontend-permissions) =============
	describe("UI Permission Functions", () => {
		describe("checkUserPermissions", () => {
			it("should return comprehensive permissions for team lead", () => {
				const permissions = checkUserPermissions("team_lead");

				expect(permissions.canAccessTeams).toBe(true);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(true);
				expect(permissions.canViewTeamDetails).toBe(true);
				expect(permissions.canAddMembers).toBe(true);
				expect(permissions.canRemoveMembers).toBe(true);
				expect(permissions.canSendInvitations).toBe(true);
				expect(permissions.canModifyTeamSettings).toBe(true);
			});

			it("should return limited permissions for team member", () => {
				const permissions = checkUserPermissions("team_member");

				expect(permissions.canAccessTeams).toBe(true);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(false);
				expect(permissions.canViewTeamDetails).toBe(true);
				expect(permissions.canAddMembers).toBe(false);
				expect(permissions.canRemoveMembers).toBe(false);
				expect(permissions.canSendInvitations).toBe(false);
				expect(permissions.canModifyTeamSettings).toBe(false);
			});

			it("should return minimal permissions for basic user", () => {
				const permissions = checkUserPermissions("basic_user");

				expect(permissions.canAccessTeams).toBe(false);
				expect(permissions.canCreateTeam).toBe(true);
				expect(permissions.canManageTeam).toBe(false);
				expect(permissions.canViewTeamDetails).toBe(false);
				expect(permissions.canAddMembers).toBe(false);
				expect(permissions.canRemoveMembers).toBe(false);
				expect(permissions.canSendInvitations).toBe(false);
				expect(permissions.canModifyTeamSettings).toBe(false);
			});
		});

		describe("checkUIPermission", () => {
			it("should return allowed result for valid permissions", () => {
				const result = checkUIPermission("team_lead", "manage_team");

				expect(result.allowed).toBe(true);
				expect(result.message).toBe("");
				expect(result.shouldRedirect).toBe(false);
			});

			it("should return denied result with message for invalid permissions", () => {
				const result = checkUIPermission("basic_user", "access_teams");

				expect(result.allowed).toBe(false);
				expect(result.message).toContain("join a team");
				expect(result.shouldRedirect).toBe(true);
			});

			it("should return appropriate result for team member restrictions", () => {
				const result = checkUIPermission("team_member", "manage_team");

				expect(result.allowed).toBe(false);
				expect(result.message).toContain("team lead");
				expect(result.shouldRedirect).toBe(false);
			});
		});

		describe("formatRoleForDisplay", () => {
			it("should return user-friendly role names", () => {
				expect(formatRoleForDisplay("basic_user")).toBe("Basic User");
				expect(formatRoleForDisplay("team_member")).toBe("Team Member");
				expect(formatRoleForDisplay("team_lead")).toBe("Team Lead");
			});

			it("should handle invalid roles gracefully", () => {
				expect(formatRoleForDisplay("invalid" as UserRole)).toBe("Unknown Role");
			});
		});

		describe("shouldShowTeamFeatures", () => {
			it("should return true for team lead", () => {
				expect(shouldShowTeamFeatures("team_lead")).toBe(true);
			});

			it("should return true for team member", () => {
				expect(shouldShowTeamFeatures("team_member")).toBe(true);
			});

			it("should return false for basic user", () => {
				expect(shouldShowTeamFeatures("basic_user")).toBe(false);
			});
		});

		describe("shouldShowManagementFeatures", () => {
			it("should return true for team lead", () => {
				expect(shouldShowManagementFeatures("team_lead")).toBe(true);
			});

			it("should return false for team member", () => {
				expect(shouldShowManagementFeatures("team_member")).toBe(false);
			});

			it("should return false for basic user", () => {
				expect(shouldShowManagementFeatures("basic_user")).toBe(false);
			});
		});

		describe("getUpgradeMessage", () => {
			it("should return upgrade message for basic users needing team access", () => {
				const message = getUpgradeMessage("basic_user", "access_teams");

				expect(message).toContain("Create a team");
				expect(message).toContain("ask to be invited");
			});

			it("should return restriction message for team members", () => {
				const message = getUpgradeMessage("team_member", "manage_team");

				expect(message).toContain("team lead");
				expect(message).toContain("Contact your team lead");
			});

			it("should handle team lead restrictions appropriately", () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				const message = getUpgradeMessage("team_lead", "invalid_action" as any);

				expect(message).toContain("sufficient permissions");
			});
		});

		describe("requiresTeamLead", () => {
			it("should return true for team lead only actions", () => {
				expect(requiresTeamLead("manage_team")).toBe(true);
				expect(requiresTeamLead("add_members")).toBe(true);
				expect(requiresTeamLead("remove_members")).toBe(true);
				expect(requiresTeamLead("send_invitations")).toBe(true);
				expect(requiresTeamLead("modify_team_settings")).toBe(true);
			});

			it("should return false for actions available to other roles", () => {
				expect(requiresTeamLead("access_teams")).toBe(false);
				expect(requiresTeamLead("create_team")).toBe(false);
				expect(requiresTeamLead("view_team_details")).toBe(false);
			});
		});

		describe("getRoleStyleClass", () => {
			it("should return appropriate CSS classes for each role", () => {
				expect(getRoleStyleClass("basic_user")).toBe("user-role-basic");
				expect(getRoleStyleClass("team_member")).toBe("user-role-member");
				expect(getRoleStyleClass("team_lead")).toBe("user-role-lead");
			});

			it("should return unknown class for invalid roles", () => {
				expect(getRoleStyleClass("invalid" as UserRole)).toBe("user-role-unknown");
			});

			it("should return safe CSS class names", () => {
				const roles: UserRole[] = ["basic_user", "team_member", "team_lead"];

				roles.forEach(role => {
					const cssClass = getRoleStyleClass(role);
					expect(cssClass).toMatch(/^[a-z-]+$/);
					expect(cssClass).not.toContain(" ");
					expect(cssClass).not.toContain("<");
					expect(cssClass).not.toContain(">");
				});
			});
		});

		describe("canPerformBulkOperations", () => {
			it("should allow bulk operations for team lead only", () => {
				expect(canPerformBulkOperations("team_lead")).toBe(true);
				expect(canPerformBulkOperations("team_member")).toBe(false);
				expect(canPerformBulkOperations("basic_user")).toBe(false);
			});
		});

		describe("getPermissionStatus", () => {
			it("should return status for multiple actions for team lead", () => {
				const actions: PermissionAction[] = ["access_teams", "manage_team", "add_members"];
				const status = getPermissionStatus("team_lead", actions);

				expect(status.access_teams).toBe(true);
				expect(status.manage_team).toBe(true);
				expect(status.add_members).toBe(true);
			});

			it("should return mixed status for team member", () => {
				const actions: PermissionAction[] = ["access_teams", "manage_team", "view_team_details"];
				const status = getPermissionStatus("team_member", actions);

				expect(status.access_teams).toBe(true);
				expect(status.manage_team).toBe(false);
				expect(status.view_team_details).toBe(true);
			});

			it("should return mostly false status for basic user", () => {
				const actions: PermissionAction[] = ["access_teams", "create_team", "manage_team"];
				const status = getPermissionStatus("basic_user", actions);

				expect(status.access_teams).toBe(false);
				expect(status.create_team).toBe(true);
				expect(status.manage_team).toBe(false);
			});

			it("should handle unknown actions gracefully", () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
				const actions = ["unknown_action"] as any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
				const status = getPermissionStatus("team_lead", actions) as any;

				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				expect(status.unknown_action).toBe(false);
			});

			it("should handle empty action list", () => {
				const status = getPermissionStatus("team_lead", []);

				expect(Object.keys(status)).toHaveLength(0);
			});
		});
	});

	// ============= ROLE PROMOTION FUNCTIONS (from role-promotion-utils) =============
	describe("Role Promotion Functions", () => {
		describe("shouldPromoteUserToTeamLead", () => {
			it("should promote basic_user when creating first team", () => {
				expect(shouldPromoteUserToTeamLead("basic_user", true)).toBe(true);
			});

			it("should not promote basic_user when not creating first team", () => {
				expect(shouldPromoteUserToTeamLead("basic_user", false)).toBe(false);
			});

			it("should not promote team_member regardless of first team status", () => {
				expect(shouldPromoteUserToTeamLead("team_member", true)).toBe(false);
				expect(shouldPromoteUserToTeamLead("team_member", false)).toBe(false);
			});

			it("should not promote team_lead regardless of first team status", () => {
				expect(shouldPromoteUserToTeamLead("team_lead", true)).toBe(false);
				expect(shouldPromoteUserToTeamLead("team_lead", false)).toBe(false);
			});
		});

		describe("checkIfFirstTeamForUser", () => {
			it("should return true when user has no existing teams", async () => {
				vi.mocked(TeamModel.findAll).mockResolvedValue([]);

				const result = await checkIfFirstTeamForUser("user-123");

				expect(result).toBe(true);
				expect(TeamModel.findAll).toHaveBeenCalledOnce();
			});

			it("should return false when user has existing teams", async () => {
				vi.mocked(TeamModel.findAll).mockResolvedValue([
					{ id: "team-1", created_by: "user-123", name: "Existing Team" } as any
				]);

				const result = await checkIfFirstTeamForUser("user-123");

				expect(result).toBe(false);
				expect(TeamModel.findAll).toHaveBeenCalledOnce();
			});

			it("should return true when other users have teams but not this user", async () => {
				vi.mocked(TeamModel.findAll).mockResolvedValue([
					{ id: "team-1", created_by: "other-user", name: "Other Team" } as any
				]);

				const result = await checkIfFirstTeamForUser("user-123");

				expect(result).toBe(true);
			});

			it("should handle database errors", async () => {
				const error = new Error("Database connection failed");
				vi.mocked(TeamModel.findAll).mockRejectedValue(error);

				await expect(checkIfFirstTeamForUser("user-123")).rejects.toThrow("Database connection failed");
			});
		});

		describe("promoteUserToTeamLead", () => {
			it("should successfully promote user to team lead", async () => {
				const updatedUser = { id: "user-123", role: "team_lead" } as any;
				vi.mocked(UserModel.update).mockResolvedValue(updatedUser);

				const result = await promoteUserToTeamLead("user-123");

				expect(result).toEqual(updatedUser);
				expect(UserModel.update).toHaveBeenCalledWith("user-123", { role: "team_lead" });
			});

			it("should handle update failure", async () => {
				vi.mocked(UserModel.update).mockResolvedValue(null);

				await expect(promoteUserToTeamLead("user-123")).rejects.toThrow("Failed to promote user to team lead");
			});

			it("should handle database errors", async () => {
				const error = new Error("Database update failed");
				vi.mocked(UserModel.update).mockRejectedValue(error);

				await expect(promoteUserToTeamLead("user-123")).rejects.toThrow("Database update failed");
			});
		});

		describe("addUserAsTeamMember", () => {
			it("should successfully add user as team member", async () => {
				const membership = { team_id: "team-123", user_id: "user-123" } as any;
				vi.mocked(TeamModel.addMember).mockResolvedValue(membership);

				const result = await addUserAsTeamMember("team-123", "user-123");

				expect(result).toEqual(membership);
				expect(TeamModel.addMember).toHaveBeenCalledWith("team-123", "user-123");
			});

			it("should handle membership creation errors", async () => {
				const error = new Error("Failed to add team member");
				vi.mocked(TeamModel.addMember).mockRejectedValue(error);

				await expect(addUserAsTeamMember("team-123", "user-123")).rejects.toThrow("Failed to add team member");
			});
		});

		describe("handleTeamCreationWithRolePromotion", () => {
			const mockTeam = { id: "team-123", name: "Test Team" } as any;
			const mockUser = { id: "user-123", role: "basic_user" } as any;
			const mockMembership = { team_id: "team-123", user_id: "user-123" } as any;

			beforeEach(() => {
				vi.mocked(UserModel.findById).mockResolvedValue(mockUser);
				vi.mocked(TeamModel.findAll).mockResolvedValue([]);
				vi.mocked(TeamModel.create).mockResolvedValue(mockTeam);
				vi.mocked(UserModel.update).mockResolvedValue({ ...mockUser, role: "team_lead" });
				vi.mocked(TeamModel.addMember).mockResolvedValue(mockMembership);
			});

			it("should handle complete workflow with promotion for basic user's first team", async () => {
				const teamData = { name: "New Team", created_by: "user-123" } as any;

				const result = await handleTeamCreationWithRolePromotion(teamData);

				expect(result).toEqual({
					team: mockTeam,
					userPromoted: true,
					membership: mockMembership
				});

				expect(UserModel.findById).toHaveBeenCalledWith("user-123");
				expect(TeamModel.findAll).toHaveBeenCalledOnce();
				expect(TeamModel.create).toHaveBeenCalledWith(teamData);
				expect(UserModel.update).toHaveBeenCalledWith("user-123", { role: "team_lead" });
				expect(TeamModel.addMember).toHaveBeenCalledWith("team-123", "user-123");
			});

			it("should handle workflow without promotion for team member", async () => {
				vi.mocked(UserModel.findById).mockResolvedValue({ ...mockUser, role: "team_member" });
				const teamData = { name: "New Team", created_by: "user-123" } as any;

				const result = await handleTeamCreationWithRolePromotion(teamData);

				expect(result).toEqual({
					team: mockTeam,
					userPromoted: false,
					membership: mockMembership
				});

				expect(UserModel.update).not.toHaveBeenCalled();
			});

			it("should handle workflow without promotion for basic user's non-first team", async () => {
				vi.mocked(TeamModel.findAll).mockResolvedValue([
					{ id: "existing-team", created_by: "user-123" } as any
				]);
				const teamData = { name: "Second Team", created_by: "user-123" } as any;

				const result = await handleTeamCreationWithRolePromotion(teamData);

				expect(result.userPromoted).toBe(false);
				expect(UserModel.update).not.toHaveBeenCalled();
			});

			it("should throw error when created_by is missing", async () => {
				const teamData = { name: "New Team" } as any;

				await expect(handleTeamCreationWithRolePromotion(teamData)).rejects.toThrow(
					"Team creator user ID is required"
				);
			});

			it("should throw error when user not found", async () => {
				vi.mocked(UserModel.findById).mockResolvedValue(null);
				const teamData = { name: "New Team", created_by: "user-123" } as any;

				await expect(handleTeamCreationWithRolePromotion(teamData)).rejects.toThrow("User not found");
			});

			it("should handle errors in workflow steps", async () => {
				const error = new Error("Team creation failed");
				vi.mocked(TeamModel.create).mockRejectedValue(error);
				const teamData = { name: "New Team", created_by: "user-123" } as any;

				await expect(handleTeamCreationWithRolePromotion(teamData)).rejects.toThrow("Team creation failed");
			});
		});
	});

	// ============= INTEGRATION AND COMPLEX SCENARIOS =============
	describe("Integration Scenarios", () => {
		it("should provide consistent results across core and UI functions", () => {
			const role: UserRole = "team_member";

			const corePermissions = getUserPermissions(role);
			const uiPermissions = checkUserPermissions(role);

			expect(corePermissions).toEqual(uiPermissions);
		});

		it("should handle role progression logic correctly", () => {
			expect(checkUserPermissions("basic_user").canCreateTeam).toBe(true);
			expect(checkUserPermissions("team_member").canCreateTeam).toBe(true);
			expect(checkUserPermissions("team_lead").canCreateTeam).toBe(true);
		});

		it("should provide consistent UI display functions", () => {
			const roles: UserRole[] = ["basic_user", "team_member", "team_lead"];

			roles.forEach(role => {
				const displayName = getRoleDisplayName(role);
				const formatName = formatRoleForDisplay(role);
				expect(displayName).toBe(formatName);
			});
		});

		it("should maintain permission consistency across all functions", () => {
			const roles: UserRole[] = ["basic_user", "team_member", "team_lead"];

			roles.forEach(role => {
				const accessTeams = canUserAccessTeams(role);
				const viewDetails = canUserViewTeamDetails(role);
				const showFeatures = shouldShowTeamFeatures(role);

				expect(accessTeams).toBe(viewDetails);
				expect(accessTeams).toBe(showFeatures);
			});
		});
	});

	// ============= ERROR HANDLING AND EDGE CASES =============
	describe("Error Handling", () => {
		it("should handle null/undefined roles gracefully across all functions", () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				formatRoleForDisplay(null as any);
			}).not.toThrow();

			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				getRoleStyleClass(undefined as any);
			}).not.toThrow();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const result = validateUserPermissions(null as any, "access_teams");
			expect(result.hasPermission).toBe(false);
		});

		it("should provide safe defaults for invalid inputs", () => {
			const invalidRole = "totally_invalid" as UserRole;

			expect(formatRoleForDisplay(invalidRole)).toBe("Unknown Role");
			expect(getRoleStyleClass(invalidRole)).toBe("user-role-unknown");
			expect(shouldShowTeamFeatures(invalidRole)).toBe(false);
			expect(shouldShowManagementFeatures(invalidRole)).toBe(false);
			expect(canPerformBulkOperations(invalidRole)).toBe(false);
		});

		it("should handle invalid permission actions consistently", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const coreResult = validateUserPermissions("team_lead", "invalid_action" as any);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const uiResult = checkUIPermission("team_lead", "invalid_action" as any);

			expect(coreResult.hasPermission).toBe(false);
			expect(uiResult.allowed).toBe(false);
			expect(coreResult.message).toContain("Unknown permission");
		});
	});
});
