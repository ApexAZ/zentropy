import { describe, it, expect } from "vitest";
import {
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
	getRoleDescription
} from "../../utils/permission-controls";
import type { UserRole } from "../../models/User";

describe("Permission Controls", () => {
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

	describe("Complex Permission Scenarios", () => {
		it("should handle team creation permissions correctly", () => {
			// All roles can create teams (promotes basic users and team members)
			expect(canUserCreateTeam("basic_user")).toBe(true);
			expect(canUserCreateTeam("team_member")).toBe(true);
			expect(canUserCreateTeam("team_lead")).toBe(true);
		});

		it("should distinguish between viewing and managing teams", () => {
			// Team members can view but not manage
			expect(canUserViewTeamDetails("team_member")).toBe(true);
			expect(canUserManageTeam("team_member")).toBe(false);

			// Basic users can't do either
			expect(canUserViewTeamDetails("basic_user")).toBe(false);
			expect(canUserManageTeam("basic_user")).toBe(false);
		});

		it("should handle member management permissions consistently", () => {
			// Only team leads can add/remove members and send invitations
			expect(canUserAddMembers("team_lead")).toBe(true);
			expect(canUserRemoveMembers("team_lead")).toBe(true);
			expect(canUserSendInvitations("team_lead")).toBe(true);

			// Team members cannot
			expect(canUserAddMembers("team_member")).toBe(false);
			expect(canUserRemoveMembers("team_member")).toBe(false);
			expect(canUserSendInvitations("team_member")).toBe(false);

			// Basic users cannot
			expect(canUserAddMembers("basic_user")).toBe(false);
			expect(canUserRemoveMembers("basic_user")).toBe(false);
			expect(canUserSendInvitations("basic_user")).toBe(false);
		});
	});

	describe("Edge Cases and Security", () => {
		it("should handle undefined role gracefully", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const result = validateUserPermissions(undefined as any, "access_teams");

			expect(result.hasPermission).toBe(false);
			expect(result.message).toContain("sufficient permissions");
		});

		it("should handle null role gracefully", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const result = validateUserPermissions(null as any, "access_teams");

			expect(result.hasPermission).toBe(false);
			expect(result.message).toContain("sufficient permissions");
		});

		it("should handle invalid role gracefully", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const result = validateUserPermissions("invalid_role" as any, "access_teams");

			expect(result.hasPermission).toBe(false);
			expect(result.message).toContain("sufficient permissions");
		});

		it("should be consistent across all permission checks", () => {
			const roles: UserRole[] = ["basic_user", "team_member", "team_lead"];

			roles.forEach(role => {
				// Ensure consistent behavior across all permission functions
				const accessTeams = canUserAccessTeams(role);
				const viewDetails = canUserViewTeamDetails(role);

				// Access and view permissions should be consistent
				expect(accessTeams).toBe(viewDetails);
			});
		});
	});
});
