import { describe, it, expect } from "vitest";
import {
	validateTeamMembership,
	canAddUserToTeam,
	determineUserRoleForTeam,
	createMembershipConflictMessage,
	validateMembershipRequest,
	sanitizeMembershipData,
	formatMembershipResponse
} from "../../utils/team-membership-utils";
import type { User, UserRole } from "../../models/User";

describe("Team Membership Utilities", () => {
	const mockUser: User = {
		id: "user-1",
		email: "test@example.com",
		first_name: "Test",
		last_name: "User",
		role: "basic_user",
		is_active: true,
		password_hash: "hash",
		last_login_at: null,
		created_at: new Date("2024-01-01"),
		updated_at: new Date("2024-01-01")
	};

	const mockTeam = {
		id: "team-1",
		name: "Test Team",
		description: "Test Description",
		created_by: "creator-1",
		default_velocity: 10,
		sprint_length: 14,
		created_at: new Date("2024-01-01"),
		updated_at: new Date("2024-01-01")
	};

	describe("validateTeamMembership", () => {
		it("should validate active user for team membership", () => {
			const result = validateTeamMembership(mockUser, mockTeam.id);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject inactive users", () => {
			const inactiveUser = { ...mockUser, is_active: false };
			const result = validateTeamMembership(inactiveUser, mockTeam.id);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("User account is not active");
		});

		it("should reject users without valid ID", () => {
			const invalidUser = { ...mockUser, id: "" };
			const result = validateTeamMembership(invalidUser, mockTeam.id);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid user ID");
		});

		it("should reject invalid team ID", () => {
			const result = validateTeamMembership(mockUser, "");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid team ID");
		});

		it("should accumulate multiple validation errors", () => {
			const invalidUser = { ...mockUser, id: "", is_active: false };
			const result = validateTeamMembership(invalidUser, "");

			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveLength(3);
			expect(result.errors).toContain("Invalid user ID");
			expect(result.errors).toContain("Invalid team ID");
			expect(result.errors).toContain("User account is not active");
		});
	});

	describe("canAddUserToTeam", () => {
		const existingMembers = [
			{ user_id: "existing-1", team_id: "team-1", role: "team_member" as UserRole },
			{ user_id: "existing-2", team_id: "team-1", role: "team_lead" as UserRole }
		];

		it("should allow adding new user to team", () => {
			const result = canAddUserToTeam("new-user", "team-1", existingMembers);

			expect(result.canAdd).toBe(true);
			expect(result.conflict).toBeNull();
		});

		it("should prevent adding existing member", () => {
			const result = canAddUserToTeam("existing-1", "team-1", existingMembers);

			expect(result.canAdd).toBe(false);
			expect(result.conflict).toBe("User is already a member of this team");
		});

		it("should handle empty member list", () => {
			const result = canAddUserToTeam("new-user", "team-1", []);

			expect(result.canAdd).toBe(true);
			expect(result.conflict).toBeNull();
		});

		it("should be case-sensitive for user IDs", () => {
			const result = canAddUserToTeam("EXISTING-1", "team-1", existingMembers);

			expect(result.canAdd).toBe(true);
			expect(result.conflict).toBeNull();
		});
	});

	describe("determineUserRoleForTeam", () => {
		it("should assign team_member role to basic_user", () => {
			const role = determineUserRoleForTeam("basic_user");
			expect(role).toBe("team_member");
		});

		it("should maintain team_member role", () => {
			const role = determineUserRoleForTeam("team_member");
			expect(role).toBe("team_member");
		});

		it("should maintain team_lead role", () => {
			const role = determineUserRoleForTeam("team_lead");
			expect(role).toBe("team_lead");
		});

		it("should handle edge case roles gracefully", () => {
			// This test ensures the function handles unexpected role values
			const role = determineUserRoleForTeam("unknown_role" as UserRole);
			expect(role).toBe("team_member"); // Should default to team_member
		});
	});

	describe("createMembershipConflictMessage", () => {
		it("should create appropriate message for existing membership", () => {
			const message = createMembershipConflictMessage("duplicate_membership", "John Doe", "Engineering Team");
			expect(message).toBe("John Doe is already a member of Engineering Team");
		});

		it("should create appropriate message for role conflicts", () => {
			const message = createMembershipConflictMessage("role_conflict", "Jane Smith", "Marketing Team");
			expect(message).toBe("Jane Smith cannot be added to Marketing Team due to role restrictions");
		});

		it("should create generic message for unknown conflicts", () => {
			const message = createMembershipConflictMessage("unknown_conflict", "Bob Johnson", "Sales Team");
			expect(message).toBe("Cannot add Bob Johnson to Sales Team");
		});

		it("should handle missing user or team names", () => {
			const message1 = createMembershipConflictMessage("duplicate_membership", "", "Team");
			expect(message1).toBe("User is already a member of Team");

			const message2 = createMembershipConflictMessage("duplicate_membership", "User", "");
			expect(message2).toBe("User is already a member of this team");
		});
	});

	describe("validateMembershipRequest", () => {
		const validRequest = {
			userId: "user-1",
			teamId: "team-1",
			role: "team_member" as UserRole
		};

		it("should validate correct membership request", () => {
			const result = validateMembershipRequest(validRequest);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject missing userId", () => {
			const request = { ...validRequest, userId: "" };
			const result = validateMembershipRequest(request);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("User ID is required");
		});

		it("should reject missing teamId", () => {
			const request = { ...validRequest, teamId: "" };
			const result = validateMembershipRequest(request);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Team ID is required");
		});

		it("should reject invalid role", () => {
			const request = { ...validRequest, role: "invalid_role" as UserRole };
			const result = validateMembershipRequest(request);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid role specified");
		});

		it("should handle XSS in request data", () => {
			const maliciousRequest = {
				userId: "<script>alert('xss')</script>user-1",
				teamId: "<img src=x onerror=alert(1)>team-1",
				role: "team_member" as UserRole
			};
			const result = validateMembershipRequest(maliciousRequest);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid characters in user ID");
			expect(result.errors).toContain("Invalid characters in team ID");
		});
	});

	describe("sanitizeMembershipData", () => {
		it("should sanitize membership request data", () => {
			const dirtyData = {
				userId: "  user-1  ",
				teamId: "  team-1  ",
				role: "team_member" as UserRole
			};

			const result = sanitizeMembershipData(dirtyData);

			expect(result.userId).toBe("user-1");
			expect(result.teamId).toBe("team-1");
			expect(result.role).toBe("team_member");
		});

		it("should remove dangerous characters", () => {
			const maliciousData = {
				userId: "user<script>alert()</script>-1",
				teamId: "team<img src=x>-1",
				role: "team_member" as UserRole
			};

			const result = sanitizeMembershipData(maliciousData);

			expect(result.userId).toBe("useralert-1"); // Tags removed but content remains
			expect(result.teamId).toBe("team-1"); // Tags removed
			expect(result.role).toBe("team_member");
		});

		it("should preserve valid special characters", () => {
			const validData = {
				userId: "user-1_test",
				teamId: "team-1_dev",
				role: "team_lead" as UserRole
			};

			const result = sanitizeMembershipData(validData);

			expect(result.userId).toBe("user-1_test");
			expect(result.teamId).toBe("team-1_dev");
			expect(result.role).toBe("team_lead");
		});
	});

	describe("formatMembershipResponse", () => {
		const membershipData = {
			id: "membership-1",
			user_id: "user-1",
			team_id: "team-1",
			role: "team_member" as UserRole,
			joined_at: new Date("2024-01-01T10:00:00Z"),
			created_at: new Date("2024-01-01T10:00:00Z"),
			updated_at: new Date("2024-01-01T10:00:00Z")
		};

		const userData = {
			id: "user-1",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User"
		};

		it("should format successful membership response", () => {
			const result = formatMembershipResponse(membershipData, userData);

			expect(result.membership.id).toBe("membership-1");
			expect(result.membership.role).toBe("team_member");
			expect(result.user.displayName).toBe("Test User");
			expect(result.user.email).toBe("test@example.com");
			expect(result.success).toBe(true);
			expect(result.message).toContain("successfully added");
		});

		it("should format response with role change notification", () => {
			const basicUserData = { ...userData };
			const membershipWithUpgrade = { ...membershipData, role: "team_member" as UserRole };

			const result = formatMembershipResponse(membershipWithUpgrade, basicUserData, true);

			expect(result.roleChanged).toBe(true);
			expect(result.message).toContain("promoted to team member");
		});

		it("should handle missing user data gracefully", () => {
			const incompleteUserData = {
				id: "user-1",
				email: "test@example.com",
				first_name: "",
				last_name: ""
			};

			const result = formatMembershipResponse(membershipData, incompleteUserData);

			expect(result.user.displayName).toBe("User"); // Fallback
			expect(result.success).toBe(true);
		});
	});
});
