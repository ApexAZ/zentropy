import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import {
	buildAddMemberUrl,
	createAddMemberRequest,
	handleAddMemberResponse,
	makeAddMemberRequest,
	validateAddMemberParams
} from "../../utils/team-membership-api-client";
import type { UserRole } from "../../models/User";

// Mock fetch for API calls
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

describe("Team Membership API Client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("buildAddMemberUrl", () => {
		it("should build correct URL for adding team member", () => {
			const url = buildAddMemberUrl("team-123");
			expect(url).toBe("/api/teams/team-123/members");
		});

		it("should handle team IDs with special characters", () => {
			const url = buildAddMemberUrl("team-abc-123");
			expect(url).toBe("/api/teams/team-abc-123/members");
		});

		it("should handle empty team ID", () => {
			const url = buildAddMemberUrl("");
			expect(url).toBe("/api/teams//members");
		});
	});

	describe("createAddMemberRequest", () => {
		it("should create correct request configuration", () => {
			const request = createAddMemberRequest("user-123", "team_member");

			expect(request.method).toBe("POST");
			expect(request.credentials).toBe("include");
			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});

			const body = JSON.parse(request.body as string) as { userId: string; role: string };
			expect(body).toEqual({
				userId: "user-123",
				role: "team_member"
			});
		});

		it("should handle different roles correctly", () => {
			const request = createAddMemberRequest("user-456", "team_lead");

			const body = JSON.parse(request.body as string) as { userId: string; role: string };
			expect(body.role).toBe("team_lead");
		});

		it("should include proper headers", () => {
			const request = createAddMemberRequest("user-123", "team_member");

			expect(request.headers).toHaveProperty("Content-Type", "application/json");
			expect(request.credentials).toBe("include");
		});
	});

	describe("handleAddMemberResponse", () => {
		it("should parse successful response", async () => {
			const mockResponseData = {
				membership: {
					id: "membership-1",
					userId: "user-123",
					teamId: "team-123",
					role: "team_member",
					joinedAt: "2024-01-01T10:00:00Z"
				},
				user: {
					id: "user-123",
					email: "test@example.com",
					displayName: "Test User"
				},
				success: true,
				message: "User successfully added to team"
			};

			const mockResponse = {
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			} as Response;

			const result = await handleAddMemberResponse(mockResponse);
			expect(result).toEqual(mockResponseData);
		});

		it("should handle error responses", async () => {
			const errorData = { message: "User already exists in team" };
			const mockResponse = {
				ok: false,
				status: 409,
				json: () => Promise.resolve(errorData)
			} as Response;

			await expect(handleAddMemberResponse(mockResponse)).rejects.toThrow("User already exists in team");
		});

		it("should handle JSON parsing errors", async () => {
			const mockResponse = {
				ok: true,
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response;

			await expect(handleAddMemberResponse(mockResponse)).rejects.toThrow("Invalid JSON");
		});

		it("should handle responses without error message", async () => {
			const mockResponse = {
				ok: false,
				status: 500,
				json: () => Promise.resolve({})
			} as Response;

			await expect(handleAddMemberResponse(mockResponse)).rejects.toThrow("Failed to add user to team");
		});
	});

	describe("validateAddMemberParams", () => {
		it("should validate correct parameters", () => {
			const result = validateAddMemberParams("team-123", "user-456", "team_member");

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject empty team ID", () => {
			const result = validateAddMemberParams("", "user-456", "team_member");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Team ID is required");
		});

		it("should reject empty user ID", () => {
			const result = validateAddMemberParams("team-123", "", "team_member");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("User ID is required");
		});

		it("should reject invalid role", () => {
			const result = validateAddMemberParams("team-123", "user-456", "invalid_role" as UserRole);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid role specified");
		});

		it("should accumulate multiple validation errors", () => {
			const result = validateAddMemberParams("", "", "invalid_role" as UserRole);

			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveLength(3);
		});

		it("should reject parameters with HTML tags", () => {
			const result = validateAddMemberParams("<script>team</script>", "<img>user</img>", "team_member");

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Invalid characters in team ID");
			expect(result.errors).toContain("Invalid characters in user ID");
		});
	});

	describe("makeAddMemberRequest", () => {
		it("should make successful API request", async () => {
			const mockResponseData = {
				membership: {
					id: "membership-1",
					userId: "user-123",
					teamId: "team-123",
					role: "team_member",
					joinedAt: "2024-01-01T10:00:00Z"
				},
				user: {
					id: "user-123",
					email: "test@example.com",
					displayName: "Test User"
				},
				success: true,
				message: "User successfully added to team"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			});

			const result = await makeAddMemberRequest("team-123", "user-456", "team_member");

			expect(mockFetch).toHaveBeenCalledWith("/api/teams/team-123/members", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					userId: "user-456",
					role: "team_member"
				})
			});
			expect(result).toEqual(mockResponseData);
		});

		it("should handle API errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 409,
				json: () => Promise.resolve({ message: "Conflict error" })
			});

			await expect(makeAddMemberRequest("team-123", "user-456", "team_member")).rejects.toThrow("Conflict error");
		});

		it("should handle network errors", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(makeAddMemberRequest("team-123", "user-456", "team_member")).rejects.toThrow("Network error");
		});

		it("should handle unknown errors as network errors", async () => {
			mockFetch.mockRejectedValue("Unknown error");

			await expect(makeAddMemberRequest("team-123", "user-456", "team_member")).rejects.toThrow("Network error");
		});

		it("should validate parameters before making request", async () => {
			await expect(makeAddMemberRequest("", "user-456", "team_member")).rejects.toThrow("Team ID is required");

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle different team lead role", async () => {
			const mockResponseData = {
				membership: {
					id: "membership-2",
					userId: "user-789",
					teamId: "team-456",
					role: "team_lead",
					joinedAt: "2024-01-01T11:00:00Z"
				},
				user: {
					id: "user-789",
					email: "lead@example.com",
					displayName: "Team Lead"
				},
				success: true,
				message: "User successfully added to team as team lead"
			};

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponseData)
			});

			const result = await makeAddMemberRequest("team-456", "user-789", "team_lead");

			const requestBody = JSON.parse(
				((mockFetch.mock.calls[0] as unknown[])[1] as RequestInit).body as string
			) as { userId: string; role: string };
			expect(requestBody.role).toBe("team_lead");
			expect(result.membership.role).toBe("team_lead");
		});
	});
});
