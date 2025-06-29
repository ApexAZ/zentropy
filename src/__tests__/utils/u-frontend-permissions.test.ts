import { describe, it, expect } from "vitest";
import {
	checkUserPermissions,
	checkUIPermission,
	formatRoleForDisplay,
	shouldShowTeamFeatures,
	shouldShowManagementFeatures,
	getUpgradeMessage,
	requiresTeamLead,
	getRoleStyleClass,
	canPerformBulkOperations,
	getPermissionStatus
} from "../../utils/frontend-permissions";
import type { UserRole } from "../../models/User";
import type { PermissionAction } from "../../utils/permission-controls";

describe("Frontend Permissions", () => {
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

	describe("Integration Scenarios", () => {
		it("should provide consistent results across related functions", () => {
			const role: UserRole = "team_member";
			
			// Team features should be shown if user can access teams
			const showTeamFeatures = shouldShowTeamFeatures(role);
			const permissions = checkUserPermissions(role);
			
			expect(showTeamFeatures).toBe(permissions.canAccessTeams);
		});

		it("should provide helpful messaging for each role type", () => {
			const roles: UserRole[] = ["basic_user", "team_member", "team_lead"];
			
			roles.forEach(role => {
				const displayName = formatRoleForDisplay(role);
				const cssClass = getRoleStyleClass(role);
				
				expect(displayName).toBeTruthy();
				expect(cssClass).toBeTruthy();
				expect(displayName).not.toBe(cssClass);
			});
		});

		it("should handle role progression logic correctly", () => {
			// Basic users should be able to create teams to become team leads
			expect(checkUserPermissions("basic_user").canCreateTeam).toBe(true);
			
			// Team members should be able to create teams to become team leads
			expect(checkUserPermissions("team_member").canCreateTeam).toBe(true);
			
			// Team leads should retain all permissions
			expect(checkUserPermissions("team_lead").canCreateTeam).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("should handle null/undefined roles gracefully", () => {
			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				formatRoleForDisplay(null as any);
			}).not.toThrow();

			expect(() => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				getRoleStyleClass(undefined as any);
			}).not.toThrow();
		});

		it("should provide safe defaults for invalid inputs", () => {
			const invalidRole = "totally_invalid" as UserRole;
			
			expect(formatRoleForDisplay(invalidRole)).toBe("Unknown Role");
			expect(getRoleStyleClass(invalidRole)).toBe("user-role-unknown");
			expect(shouldShowTeamFeatures(invalidRole)).toBe(false);
			expect(shouldShowManagementFeatures(invalidRole)).toBe(false);
			expect(canPerformBulkOperations(invalidRole)).toBe(false);
		});
	});
});