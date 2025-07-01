import { describe, it, expect } from "vitest";
import {
	validateInvitationData,
	sanitizeInvitationData,
	createInvitationToken,
	isInvitationExpired,
	canUserInviteToTeam,
	validateInvitationResponse,
	formatInvitationForResponse,
	getInvitationExpiryDate,
	type InvitationData,
	type InvitationResponse,
	type InvitationRecord
} from "../../server/utils/team-invitation-utils";
import type { UserRole } from "../../server/models/User";

describe("Team Invitation Utilities", () => {
	describe("validateInvitationData", () => {
		it("should validate correct invitation data", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject invitation with missing team ID", () => {
			const invitationData: InvitationData = {
				teamId: "",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Team ID is required");
		});

		it("should reject invitation with invalid email format", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "invalid-email",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid email format");
		});

		it("should reject invitation with XSS in email", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "<script>alert('xss')</script>@example.com",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid email format");
		});

		it("should reject invitation with missing inviter ID", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "user@example.com",
				invitedBy: "",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Inviter ID is required");
		});

		it("should reject invitation with invalid role", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-456",
				role: "invalid_role" as UserRole
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid role specified");
		});

		it("should reject invitation with HTML injection in team ID", () => {
			const invitationData: InvitationData = {
				teamId: "<img src=x onerror=alert(1)>",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid characters in team ID");
		});
	});

	describe("sanitizeInvitationData", () => {
		it("should remove HTML tags from all string fields", () => {
			const invitationData: InvitationData = {
				teamId: "team-<script>alert('xss')</script>123",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-<b>bold</b>456",
				role: "team_member"
			};

			const sanitized = sanitizeInvitationData(invitationData);

			expect(sanitized.teamId).toBe("team-alert'xss'123"); // Tags removed but content remains
			expect(sanitized.invitedEmail).toBe("user@example.com"); // Email should remain unchanged if valid
			expect(sanitized.invitedBy).toBe("inviter-bold456"); // Tags removed but content remains
			expect(sanitized.role).toBe("team_member");
		});

		it("should trim whitespace from fields", () => {
			const invitationData: InvitationData = {
				teamId: "  team-123  ",
				invitedEmail: "  user@example.com  ",
				invitedBy: "  inviter-456  ",
				role: "team_member"
			};

			const sanitized = sanitizeInvitationData(invitationData);

			expect(sanitized.teamId).toBe("team-123");
			expect(sanitized.invitedEmail).toBe("user@example.com");
			expect(sanitized.invitedBy).toBe("inviter-456");
		});

		it("should remove dangerous characters", () => {
			const invitationData: InvitationData = {
				teamId: "team-123()",
				invitedEmail: "user@example.com",
				invitedBy: "inviter-456[]",
				role: "team_member"
			};

			const sanitized = sanitizeInvitationData(invitationData);

			expect(sanitized.teamId).toBe("team-123");
			expect(sanitized.invitedBy).toBe("inviter-456");
		});
	});

	describe("createInvitationToken", () => {
		it("should generate a unique token", () => {
			const token1 = createInvitationToken();
			const token2 = createInvitationToken();

			expect(token1).not.toBe(token2);
			expect(token1).toHaveLength(64); // 32 bytes = 64 hex characters
			expect(token2).toHaveLength(64);
		});

		it("should generate cryptographically secure tokens", () => {
			const tokens = new Set();
			for (let i = 0; i < 100; i++) {
				tokens.add(createInvitationToken());
			}

			// All tokens should be unique
			expect(tokens.size).toBe(100);
		});

		it("should generate tokens with only valid hex characters", () => {
			const token = createInvitationToken();
			const hexPattern = /^[a-f0-9]+$/;

			expect(hexPattern.test(token)).toBe(true);
		});
	});

	describe("isInvitationExpired", () => {
		it("should return false for non-expired invitation", () => {
			const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
			const result = isInvitationExpired(futureDate);

			expect(result).toBe(false);
		});

		it("should return true for expired invitation", () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
			const result = isInvitationExpired(pastDate);

			expect(result).toBe(true);
		});

		it("should return true for invitation expiring right now", () => {
			const nowDate = new Date(Date.now() - 1000); // 1 second ago
			const result = isInvitationExpired(nowDate);

			expect(result).toBe(true);
		});

		it("should handle edge case of exact current time", () => {
			const nowDate = new Date();
			const result = isInvitationExpired(nowDate);

			// Should be true since it's not strictly in the future
			expect(result).toBe(true);
		});
	});

	describe("canUserInviteToTeam", () => {
		it("should allow team lead to invite", () => {
			const result = canUserInviteToTeam("team_lead");

			expect(result).toBe(true);
		});

		it("should not allow team member to invite", () => {
			const result = canUserInviteToTeam("team_member");

			expect(result).toBe(false);
		});

		it("should not allow basic user to invite", () => {
			const result = canUserInviteToTeam("basic_user");

			expect(result).toBe(false);
		});
	});

	describe("validateInvitationResponse", () => {
		it("should validate accept response", () => {
			const response: InvitationResponse = {
				token: "valid-token-123",
				action: "accept"
			};

			const result = validateInvitationResponse(response);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate decline response", () => {
			const response: InvitationResponse = {
				token: "valid-token-123",
				action: "decline"
			};

			const result = validateInvitationResponse(response);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject response with missing token", () => {
			const response: InvitationResponse = {
				token: "",
				action: "accept"
			};

			const result = validateInvitationResponse(response);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invitation token is required");
		});

		it("should reject response with invalid action", () => {
			const response: InvitationResponse = {
				token: "valid-token-123",
				action: "invalid" as "accept" | "decline"
			};

			const result = validateInvitationResponse(response);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid action. Must be 'accept' or 'decline'");
		});

		it("should reject response with XSS in token", () => {
			const response: InvitationResponse = {
				token: "<script>alert('xss')</script>",
				action: "accept"
			};

			const result = validateInvitationResponse(response);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid characters in invitation token");
		});
	});

	describe("formatInvitationForResponse", () => {
		it("should format invitation record for API response", () => {
			const invitationRecord: InvitationRecord = {
				id: "inv-123",
				team_id: "team-456",
				invited_email: "user@example.com",
				invited_by: "inviter-789",
				role: "team_member",
				status: "pending",
				token: "secret-token-abc",
				expires_at: new Date("2024-12-31T23:59:59.000Z"),
				created_at: new Date("2024-01-01T00:00:00.000Z"),
				updated_at: new Date("2024-01-01T00:00:00.000Z")
			};

			const teamName = "Development Team";
			const inviterName = "John Doe";

			const formatted = formatInvitationForResponse(invitationRecord, teamName, inviterName);

			expect(formatted).toEqual({
				id: "inv-123",
				teamId: "team-456",
				teamName: "Development Team",
				invitedEmail: "user@example.com",
				inviterName: "John Doe",
				role: "team_member",
				status: "pending",
				expiresAt: "2024-12-31T23:59:59.000Z",
				createdAt: "2024-01-01T00:00:00.000Z",
				message: "You have been invited to join Development Team as a team_member by John Doe"
			});
		});

		it("should handle missing team and inviter names gracefully", () => {
			const invitationRecord: InvitationRecord = {
				id: "inv-123",
				team_id: "team-456",
				invited_email: "user@example.com",
				invited_by: "inviter-789",
				role: "team_lead",
				status: "accepted",
				token: "secret-token-abc",
				expires_at: new Date("2024-12-31T23:59:59.000Z"),
				created_at: new Date("2024-01-01T00:00:00.000Z"),
				updated_at: new Date("2024-01-01T00:00:00.000Z")
			};

			const formatted = formatInvitationForResponse(invitationRecord);

			expect(formatted.teamName).toBe("Unknown Team");
			expect(formatted.inviterName).toBe("Unknown User");
			expect(formatted.message).toBe("You have been invited to join Unknown Team as a team_lead by Unknown User");
		});

		it("should format different invitation statuses correctly", () => {
			const baseRecord: InvitationRecord = {
				id: "inv-123",
				team_id: "team-456",
				invited_email: "user@example.com",
				invited_by: "inviter-789",
				role: "team_member",
				status: "declined",
				token: "secret-token-abc",
				expires_at: new Date("2024-12-31T23:59:59.000Z"),
				created_at: new Date("2024-01-01T00:00:00.000Z"),
				updated_at: new Date("2024-01-01T00:00:00.000Z")
			};

			const formatted = formatInvitationForResponse(baseRecord, "Test Team", "Jane Smith");

			expect(formatted.status).toBe("declined");
		});
	});

	describe("getInvitationExpiryDate", () => {
		it("should return date 7 days from now by default", () => {
			const expiryDate = getInvitationExpiryDate();
			const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			// Allow 1 second tolerance for test execution time
			const timeDiff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
			expect(timeDiff).toBeLessThan(1000);
		});

		it("should return custom expiry days when specified", () => {
			const customDays = 3;
			const expiryDate = getInvitationExpiryDate(customDays);
			const expectedDate = new Date(Date.now() + customDays * 24 * 60 * 60 * 1000);

			// Allow 1 second tolerance for test execution time
			const timeDiff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
			expect(timeDiff).toBeLessThan(1000);
		});

		it("should handle edge case of 0 days", () => {
			const expiryDate = getInvitationExpiryDate(0);
			const now = new Date();

			// Should be very close to current time
			const timeDiff = Math.abs(expiryDate.getTime() - now.getTime());
			expect(timeDiff).toBeLessThan(1000);
		});

		it("should handle large expiry periods", () => {
			const largeDays = 365; // 1 year
			const expiryDate = getInvitationExpiryDate(largeDays);
			const expectedDate = new Date(Date.now() + largeDays * 24 * 60 * 60 * 1000);

			// Allow 1 second tolerance for test execution time
			const timeDiff = Math.abs(expiryDate.getTime() - expectedDate.getTime());
			expect(timeDiff).toBeLessThan(1000);
		});
	});

	describe("Edge Cases and Security", () => {
		it("should handle extremely long email addresses", () => {
			const longEmail = "a".repeat(320) + "@example.com"; // 320 + 12 = 332 characters, exceeds 320 limit
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: longEmail,
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const result = validateInvitationData(invitationData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Email is too long");
		});

		it("should handle null and undefined values gracefully", () => {
			const invalidData = {
				teamId: null as unknown as string,
				invitedEmail: undefined as unknown as string,
				invitedBy: "inviter-456",
				role: "team_member" as UserRole
			};

			const result = validateInvitationData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should sanitize invitation data without breaking valid emails", () => {
			const invitationData: InvitationData = {
				teamId: "team-123",
				invitedEmail: "user+test@example-domain.com",
				invitedBy: "inviter-456",
				role: "team_member"
			};

			const sanitized = sanitizeInvitationData(invitationData);

			expect(sanitized.invitedEmail).toBe("user+test@example-domain.com");
		});
	});
});
