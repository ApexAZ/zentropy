import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	buildInvitationUrl,
	buildInvitationResponseUrl,
	createSendInvitationRequest,
	createInvitationResponseRequest,
	handleInvitationApiResponse,
	validateInvitationApiParams,
	makeSendInvitationRequest,
	makeInvitationResponseRequest
} from "../../utils/team-invitation-api-client";
import type { UserRole } from "../../models/User";

// Mock fetch for API client tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Team Invitation API Client", () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	describe("buildInvitationUrl", () => {
		it("should build correct URL for sending invitations", () => {
			const url = buildInvitationUrl("team-123");

			expect(url).toBe("/api/teams/team-123/invitations");
		});

		it("should handle team ID with special characters safely", () => {
			const url = buildInvitationUrl("team-abc-456");

			expect(url).toBe("/api/teams/team-abc-456/invitations");
		});
	});

	describe("buildInvitationResponseUrl", () => {
		it("should build correct URL for invitation responses", () => {
			const url = buildInvitationResponseUrl();

			expect(url).toBe("/api/invitations/respond");
		});
	});

	describe("createSendInvitationRequest", () => {
		it("should create correct request configuration for sending invitation", () => {
			const request = createSendInvitationRequest("user@example.com", "team_member");

			expect(request.method).toBe("POST");
			expect(request.credentials).toBe("include");
			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});

			const body = JSON.parse(request.body as string) as { email: string; role: string };
			expect(body).toEqual({
				email: "user@example.com",
				role: "team_member"
			});
		});

		it("should handle different roles correctly", () => {
			const request = createSendInvitationRequest("lead@example.com", "team_lead");

			const body = JSON.parse(request.body as string) as { email: string; role: string };
			expect(body.role).toBe("team_lead");
		});

		it("should include proper headers", () => {
			const request = createSendInvitationRequest("user@example.com", "team_member");

			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});
			expect(request.credentials).toBe("include");
		});
	});

	describe("createInvitationResponseRequest", () => {
		it("should create correct request configuration for accepting invitation", () => {
			const request = createInvitationResponseRequest("token-123", "accept");

			expect(request.method).toBe("POST");
			expect(request.credentials).toBe("include");
			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});

			const body = JSON.parse(request.body as string) as { token: string; action: string };
			expect(body).toEqual({
				token: "token-123",
				action: "accept"
			});
		});

		it("should create correct request configuration for declining invitation", () => {
			const request = createInvitationResponseRequest("token-456", "decline");

			const body = JSON.parse(request.body as string) as { token: string; action: string };
			expect(body.action).toBe("decline");
			expect(body.token).toBe("token-456");
		});
	});

	describe("handleInvitationApiResponse", () => {
		it("should parse successful invitation response", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					invitation: {
						id: "inv-123",
						teamId: "team-456",
						invitedEmail: "user@example.com",
						role: "team_member",
						status: "pending",
						expiresAt: "2024-12-31T23:59:59.000Z"
					},
					message: "Invitation sent successfully"
				})
			} as unknown as Response;

			const result = await handleInvitationApiResponse(mockResponse);

			const sendResult = result as { invitation: { id: string; role: string } };
			expect(sendResult.invitation.id).toBe("inv-123");
			expect(sendResult.invitation.role).toBe("team_member");
			expect(result.message).toBe("Invitation sent successfully");
		});

		it("should handle error responses correctly", async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				json: vi.fn().mockResolvedValue({
					message: "Invalid email address"
				})
			} as unknown as Response;

			await expect(handleInvitationApiResponse(mockResponse)).rejects.toThrow("Invalid email address");
		});

		it("should handle error responses without JSON body", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				json: vi.fn().mockRejectedValue(new Error("JSON parse error"))
			} as unknown as Response;

			await expect(handleInvitationApiResponse(mockResponse)).rejects.toThrow("Failed to process invitation");
		});

		it("should handle network errors gracefully", async () => {
			const mockResponse = {
				ok: false,
				status: 0,
				json: vi.fn().mockRejectedValue(new Error("Network error"))
			} as unknown as Response;

			await expect(handleInvitationApiResponse(mockResponse)).rejects.toThrow("Failed to process invitation");
		});
	});

	describe("validateInvitationApiParams", () => {
		it("should validate correct invitation parameters", () => {
			const result = validateInvitationApiParams("team-123", "user@example.com", "team_member");

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject empty team ID", () => {
			const result = validateInvitationApiParams("", "user@example.com", "team_member");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Team ID is required");
		});

		it("should reject invalid email format", () => {
			const result = validateInvitationApiParams("team-123", "invalid-email", "team_member");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid email format");
		});

		it("should reject invalid role", () => {
			const result = validateInvitationApiParams("team-123", "user@example.com", "invalid_role" as UserRole);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid role specified");
		});

		it("should reject team ID with XSS attempts", () => {
			const result = validateInvitationApiParams(
				"<script>alert('xss')</script>",
				"user@example.com",
				"team_member"
			);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid characters in team ID");
		});

		it("should reject email with XSS attempts", () => {
			const result = validateInvitationApiParams(
				"team-123",
				"<script>alert('xss')</script>@example.com",
				"team_member"
			);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid email format");
		});
	});

	describe("makeSendInvitationRequest", () => {
		it("should make successful invitation request", async () => {
			const mockApiResponse = {
				invitation: {
					id: "inv-123",
					teamId: "team-456",
					invitedEmail: "user@example.com",
					role: "team_member",
					status: "pending",
					expiresAt: "2024-12-31T23:59:59.000Z"
				},
				message: "Invitation sent successfully"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockApiResponse)
			});

			const result = await makeSendInvitationRequest("team-456", "user@example.com", "team_member");

			expect(mockFetch).toHaveBeenCalledWith("/api/teams/team-456/invitations", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: "user@example.com",
					role: "team_member"
				})
			});

			expect(result.invitation.id).toBe("inv-123");
			expect(result.message).toBe("Invitation sent successfully");
		});

		it("should handle validation errors before API call", async () => {
			await expect(makeSendInvitationRequest("", "user@example.com", "team_member")).rejects.toThrow(
				"Team ID is required"
			);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle API errors correctly", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 409,
				json: vi.fn().mockResolvedValue({
					message: "User is already a member of this team"
				})
			});

			await expect(makeSendInvitationRequest("team-456", "user@example.com", "team_member")).rejects.toThrow(
				"User is already a member of this team"
			);
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValue(new Error("Network failure"));

			await expect(makeSendInvitationRequest("team-456", "user@example.com", "team_member")).rejects.toThrow(
				"Network failure"
			);
		});

		it("should validate and use correct role parameter", async () => {
			const mockApiResponse = {
				invitation: {
					id: "inv-789",
					teamId: "team-456",
					invitedEmail: "lead@example.com",
					role: "team_lead",
					status: "pending",
					expiresAt: "2024-12-31T23:59:59.000Z"
				},
				message: "Invitation sent successfully"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockApiResponse)
			});

			const result = await makeSendInvitationRequest("team-456", "lead@example.com", "team_lead");

			const requestBody = JSON.parse(
				((mockFetch.mock.calls[0] as unknown[])[1] as RequestInit).body as string
			) as { email: string; role: string };
			expect(requestBody.role).toBe("team_lead");
			expect(result.invitation.role).toBe("team_lead");
		});
	});

	describe("makeInvitationResponseRequest", () => {
		it("should make successful invitation acceptance request", async () => {
			const mockApiResponse = {
				membership: {
					id: "mem-123",
					userId: "user-456",
					teamId: "team-789",
					role: "team_member",
					joinedAt: "2024-01-01T00:00:00.000Z"
				},
				user: {
					id: "user-456",
					email: "user@example.com",
					displayName: "John Doe"
				},
				message: "Invitation accepted successfully"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockApiResponse)
			});

			const result = await makeInvitationResponseRequest("token-123", "accept");

			expect(mockFetch).toHaveBeenCalledWith("/api/invitations/respond", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					token: "token-123",
					action: "accept"
				})
			});

			const responseResult = result as { membership: { id: string } };
			expect(responseResult.membership.id).toBe("mem-123");
			expect(result.message).toBe("Invitation accepted successfully");
		});

		it("should make successful invitation decline request", async () => {
			const mockApiResponse = {
				message: "Invitation declined successfully"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue(mockApiResponse)
			});

			const result = await makeInvitationResponseRequest("token-456", "decline");

			const requestBody = JSON.parse(
				((mockFetch.mock.calls[0] as unknown[])[1] as RequestInit).body as string
			) as { token: string; action: string };
			expect(requestBody.action).toBe("decline");
			expect(result.message).toBe("Invitation declined successfully");
		});

		it("should handle expired invitation errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 410,
				json: vi.fn().mockResolvedValue({
					message: "Invitation has expired"
				})
			});

			await expect(makeInvitationResponseRequest("token-123", "accept")).rejects.toThrow(
				"Invitation has expired"
			);
		});

		it("should handle invalid token errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				json: vi.fn().mockResolvedValue({
					message: "Invalid invitation token"
				})
			});

			await expect(makeInvitationResponseRequest("invalid-token", "accept")).rejects.toThrow(
				"Invalid invitation token"
			);
		});
	});
});
