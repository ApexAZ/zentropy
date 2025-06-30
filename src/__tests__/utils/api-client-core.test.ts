/**
 * API Client Core Tests - TDD Implementation
 * Consolidates comprehensive test coverage from api-client, team-invitation-api-client,
 * team-membership-api-client, and user-search-api-client into unified api-client-core module
 *
 * Following hybrid testing approach with comprehensive edge case coverage
 * Security-critical functions with XSS prevention and input sanitization
 * Total tests consolidated: 83 (16 + 27 + 22 + 18)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "../../models/User.js";

// Mock fetch globally for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the module under test - will fail initially (RED phase)
import {
	apiClientCore,
	type LoginRequestData,
	type LoginResponse,
	type SessionCheckResponse,
	type SendInvitationData,
	type InvitationResponseData,
	type SendInvitationApiResponse,
	type InvitationResponseApiResponse,
	type AddMemberData,
	type AddMemberApiResponse,
	type UserSearchParams,
	type UserSearchResponse,
	// Backward compatibility exports
	createLoginRequest,
	createSessionCheckRequest,
	handleApiResponse,
	makeLoginRequest,
	makeSessionCheckRequest,
	buildInvitationUrl,
	buildInvitationResponseUrl,
	createSendInvitationRequest,
	createInvitationResponseRequest,
	handleInvitationApiResponse,
	validateInvitationApiParams,
	validateInvitationResponseParams,
	makeSendInvitationRequest,
	makeInvitationResponseRequest,
	buildAddMemberUrl,
	createAddMemberRequest,
	handleAddMemberResponse,
	validateAddMemberParams,
	makeAddMemberRequest,
	buildUserSearchUrl,
	createUserSearchRequest,
	handleUserSearchResponse,
	makeUserSearchRequest
} from "../../utils/api-client-core.js";

describe("ApiClientCore - Consolidated API Management Module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================
	// AUTHENTICATION API (from api-client) - 16 tests
	// ========================

	describe("Authentication API (from api-client)", () => {
		describe("createLoginRequest", () => {
			it("should create correct login request configuration", () => {
				const loginData: LoginRequestData = {
					email: "test@example.com",
					password: "password123"
				};

				const result = apiClientCore.createLoginRequest(loginData);

				expect(result.url).toBe("/api/users/login");
				expect(result.method).toBe("POST");
				expect(result.credentials).toBe("include");
				expect(result.headers).toEqual({
					"Content-Type": "application/json"
				});
				expect(result.body).toBe(JSON.stringify(loginData));
			});

			it("should handle special characters in email and password", () => {
				const loginData: LoginRequestData = {
					email: "test+tag@example.com",
					password: "p@ssw0rd!$"
				};

				const result = apiClientCore.createLoginRequest(loginData);

				expect(result.body).toBe(JSON.stringify(loginData));
			});

			it("should handle empty strings", () => {
				const loginData: LoginRequestData = {
					email: "",
					password: ""
				};

				const result = apiClientCore.createLoginRequest(loginData);

				expect(result.body).toBe(JSON.stringify(loginData));
			});
		});

		describe("createSessionCheckRequest", () => {
			it("should create correct session check request configuration", () => {
				const result = apiClientCore.createSessionCheckRequest();

				expect(result.url).toBe("/api/users/session");
				expect(result.method).toBe("GET");
				expect(result.credentials).toBe("include");
				expect(result.headers).toBeUndefined();
				expect(result.body).toBeUndefined();
			});
		});

		describe("handleApiResponse", () => {
			it("should return parsed JSON for successful responses", async () => {
				const mockData = { id: "123", name: "Test" };
				const mockJsonFn = vi.fn().mockResolvedValue(mockData);
				const mockResponse = {
					ok: true,
					json: mockJsonFn
				} as unknown as Response;

				const result = await apiClientCore.handleApiResponse<typeof mockData>(mockResponse);

				expect(result).toEqual(mockData);
				expect(mockJsonFn).toHaveBeenCalledOnce();
			});

			it("should throw error with message for failed responses", async () => {
				const mockResponse = {
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: vi.fn().mockResolvedValue({ message: "Invalid credentials" })
				} as unknown as Response;

				await expect(apiClientCore.handleApiResponse(mockResponse)).rejects.toThrow("Invalid credentials");
			});

			it("should throw default error message when response has no message", async () => {
				const mockResponse = {
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockResolvedValue({})
				} as unknown as Response;

				await expect(apiClientCore.handleApiResponse(mockResponse)).rejects.toThrow(
					"HTTP 500: Internal Server Error"
				);
			});

			it("should handle error response with field information", async () => {
				const mockResponse = {
					ok: false,
					status: 400,
					statusText: "Bad Request",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				} as unknown as Response;

				await expect(apiClientCore.handleApiResponse(mockResponse)).rejects.toThrow("HTTP 400: Bad Request");
			});
		});

		describe("makeLoginRequest", () => {
			it("should make login request with correct parameters", async () => {
				const loginData: LoginRequestData = {
					email: "test@example.com",
					password: "password123"
				};
				const mockResponse: LoginResponse = {
					user: {
						id: "user-123",
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						role: "basic_user"
					},
					sessionId: "session-456"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeLoginRequest(loginData);

				expect(mockFetch).toHaveBeenCalledWith("/api/users/login", {
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(loginData)
				});
				expect(result).toEqual(mockResponse);
			});

			it("should handle login request failure", async () => {
				const loginData: LoginRequestData = {
					email: "test@example.com",
					password: "wrong"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 401,
					json: vi.fn().mockResolvedValue({ message: "Invalid credentials" })
				});

				await expect(apiClientCore.makeLoginRequest(loginData)).rejects.toThrow(
					"Login failed: Invalid credentials"
				);
			});

			it("should handle network errors", async () => {
				const loginData: LoginRequestData = {
					email: "test@example.com",
					password: "password123"
				};

				mockFetch.mockRejectedValue(new Error("Network error"));

				await expect(apiClientCore.makeLoginRequest(loginData)).rejects.toThrow("Login failed: Network error");
			});
		});

		describe("makeSessionCheckRequest", () => {
			it("should make session check request successfully", async () => {
				const mockResponse: SessionCheckResponse = {
					isAuthenticated: true,
					user: {
						id: "user-123",
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						role: "basic_user"
					}
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeSessionCheckRequest();

				expect(mockFetch).toHaveBeenCalledWith("/api/users/session", {
					method: "GET",
					credentials: "include"
				});
				expect(result).toEqual(mockResponse);
			});

			it("should handle unauthenticated session", async () => {
				const mockResponse: SessionCheckResponse = {
					isAuthenticated: false
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeSessionCheckRequest();

				expect(result).toEqual(mockResponse);
			});

			it("should handle session check errors", async () => {
				mockFetch.mockRejectedValue(new Error("Server error"));

				await expect(apiClientCore.makeSessionCheckRequest()).rejects.toThrow(
					"Session check failed: Server error"
				);
			});
		});

		describe("Type Safety", () => {
			it("should enforce LoginRequestData interface", () => {
				const validData: LoginRequestData = {
					email: "test@example.com",
					password: "password"
				};

				// This should compile without errors
				const result = apiClientCore.createLoginRequest(validData);
				expect(result).toBeDefined();
			});

			it("should enforce LoginResponse interface", async () => {
				const mockResponse: LoginResponse = {
					user: {
						id: "123",
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						role: "basic_user"
					},
					sessionId: "session-123"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeLoginRequest({
					email: "test@example.com",
					password: "password"
				});

				expect(result.user.role).toBe("basic_user");
				expect(result.sessionId).toBe("session-123");
			});
		});
	});

	// ========================
	// TEAM INVITATION API (from team-invitation-api-client) - 27 tests
	// ========================

	describe("Team Invitation API (from team-invitation-api-client)", () => {
		describe("buildInvitationUrl", () => {
			it("should build correct invitation URL", () => {
				const result = apiClientCore.buildInvitationUrl("team-123");
				expect(result).toBe("/api/teams/team-123/invitations");
			});

			it("should handle special characters in team ID", () => {
				const result = apiClientCore.buildInvitationUrl("team_456-789");
				expect(result).toBe("/api/teams/team_456-789/invitations");
			});
		});

		describe("buildInvitationResponseUrl", () => {
			it("should build correct invitation response URL", () => {
				const result = apiClientCore.buildInvitationResponseUrl("invitation-123");
				expect(result).toBe("/api/invitations/invitation-123/respond");
			});
		});

		describe("createSendInvitationRequest", () => {
			it("should create correct send invitation request", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};

				const result = apiClientCore.createSendInvitationRequest(data);

				expect(result.url).toBe("/api/teams/team-123/invitations");
				expect(result.method).toBe("POST");
				expect(result.credentials).toBe("include");
				expect(result.headers).toEqual({ "Content-Type": "application/json" });
				expect(result.body).toBe(
					JSON.stringify({
						user_email: "user@example.com",
						role: "team_member"
					})
				);
			});

			it("should handle team lead role", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "lead@example.com",
					role: "team_lead"
				};

				const result = apiClientCore.createSendInvitationRequest(data);
				const body = JSON.parse(result.body as string);
				expect(body.role).toBe("team_lead");
			});

			it("should handle special characters in email", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user+tag@example.co.uk",
					role: "team_member"
				};

				const result = apiClientCore.createSendInvitationRequest(data);
				const body = JSON.parse(result.body as string);
				expect(body.user_email).toBe("user+tag@example.co.uk");
			});
		});

		describe("createInvitationResponseRequest", () => {
			it("should create correct accept invitation request", () => {
				const data: InvitationResponseData = {
					invitationId: "invitation-123",
					action: "accept"
				};

				const result = apiClientCore.createInvitationResponseRequest(data);

				expect(result.url).toBe("/api/invitations/invitation-123/respond");
				expect(result.method).toBe("POST");
				expect(result.body).toBe(JSON.stringify({ action: "accept" }));
			});

			it("should create correct decline invitation request", () => {
				const data: InvitationResponseData = {
					invitationId: "invitation-456",
					action: "decline"
				};

				const result = apiClientCore.createInvitationResponseRequest(data);
				const body = JSON.parse(result.body as string);
				expect(body.action).toBe("decline");
			});
		});

		describe("handleInvitationApiResponse", () => {
			it("should handle successful invitation response", async () => {
				const mockData = { message: "Invitation sent successfully" };
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue(mockData)
				} as unknown as Response;

				const result = await apiClientCore.handleInvitationApiResponse(mockResponse);
				expect(result).toEqual(mockData);
			});

			it("should handle invitation conflict error", async () => {
				const mockResponse = {
					ok: false,
					status: 409,
					json: vi.fn().mockResolvedValue({ message: "User already invited" })
				} as unknown as Response;

				await expect(apiClientCore.handleInvitationApiResponse(mockResponse)).rejects.toThrow(
					"User already invited"
				);
			});

			it("should handle invitation not found error", async () => {
				const mockResponse = {
					ok: false,
					status: 404,
					json: vi.fn().mockResolvedValue({ message: "Team not found" })
				} as unknown as Response;

				await expect(apiClientCore.handleInvitationApiResponse(mockResponse)).rejects.toThrow("Team not found");
			});

			it("should handle server error", async () => {
				const mockResponse = {
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				} as unknown as Response;

				await expect(apiClientCore.handleInvitationApiResponse(mockResponse)).rejects.toThrow(
					"HTTP 500: Internal Server Error"
				);
			});
		});

		describe("validateInvitationApiParams", () => {
			it("should validate correct invitation parameters", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual([]);
			});

			it("should reject missing team ID", () => {
				const data: SendInvitationData = {
					teamId: "",
					userEmail: "user@example.com",
					role: "team_member"
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("teamId is required");
			});

			it("should reject missing email", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "",
					role: "team_member"
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("userEmail is required");
			});

			it("should reject invalid email format", () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "invalid-email",
					role: "team_member"
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Invalid email format");
			});

			it("should reject XSS attempts in team ID", () => {
				const data: SendInvitationData = {
					teamId: "team-<script>alert('xss')</script>",
					userEmail: "user@example.com",
					role: "team_member"
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("teamId contains invalid characters");
			});

			it("should reject invalid role", () => {
				const data = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "invalid_role" as UserRole
				};

				const result = apiClientCore.validateInvitationApiParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Invalid user role");
			});
		});

		describe("makeSendInvitationRequest", () => {
			it("should make successful send invitation request", async () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};
				const mockResponse: SendInvitationApiResponse = {
					invitation: {
						id: "invitation-456",
						team_id: "team-123",
						user_email: "user@example.com",
						role: "team_member",
						status: "pending",
						created_at: "2023-01-01T00:00:00Z"
					},
					message: "Invitation sent successfully"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeSendInvitationRequest(data);

				expect(mockFetch).toHaveBeenCalledWith("/api/teams/team-123/invitations", {
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ user_email: "user@example.com", role: "team_member" })
				});
				expect(result).toEqual(mockResponse);
			});

			it("should handle validation errors", async () => {
				const data: SendInvitationData = {
					teamId: "",
					userEmail: "invalid-email",
					role: "team_member"
				};

				await expect(apiClientCore.makeSendInvitationRequest(data)).rejects.toThrow("Validation failed:");
			});

			it("should handle API errors", async () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 409,
					json: vi.fn().mockResolvedValue({ message: "User already invited" })
				});

				await expect(apiClientCore.makeSendInvitationRequest(data)).rejects.toThrow(
					"Send invitation failed: User already invited"
				);
			});

			it("should handle network errors", async () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};

				mockFetch.mockRejectedValue(new Error("Network error"));

				await expect(apiClientCore.makeSendInvitationRequest(data)).rejects.toThrow(
					"Send invitation failed: Network error"
				);
			});

			it("should handle team not found error", async () => {
				const data: SendInvitationData = {
					teamId: "nonexistent-team",
					userEmail: "user@example.com",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 404,
					json: vi.fn().mockResolvedValue({ message: "Team not found" })
				});

				await expect(apiClientCore.makeSendInvitationRequest(data)).rejects.toThrow(
					"Send invitation failed: Team not found"
				);
			});

			it("should handle server errors", async () => {
				const data: SendInvitationData = {
					teamId: "team-123",
					userEmail: "user@example.com",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				});

				await expect(apiClientCore.makeSendInvitationRequest(data)).rejects.toThrow(
					"Send invitation failed: HTTP 500: Internal Server Error"
				);
			});
		});

		describe("makeInvitationResponseRequest", () => {
			it("should make successful accept invitation request", async () => {
				const data: InvitationResponseData = {
					invitationId: "invitation-123",
					action: "accept"
				};
				const mockResponse: InvitationResponseApiResponse = {
					message: "Invitation accepted successfully",
					status: "accepted"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeInvitationResponseRequest(data);

				expect(result).toEqual(mockResponse);
			});

			it("should make successful decline invitation request", async () => {
				const data: InvitationResponseData = {
					invitationId: "invitation-123",
					action: "decline"
				};
				const mockResponse: InvitationResponseApiResponse = {
					message: "Invitation declined",
					status: "declined"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeInvitationResponseRequest(data);

				expect(result).toEqual(mockResponse);
			});

			it("should handle invitation response errors", async () => {
				const data: InvitationResponseData = {
					invitationId: "invalid-invitation",
					action: "accept"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 404,
					json: vi.fn().mockResolvedValue({ message: "Invitation not found" })
				});

				await expect(apiClientCore.makeInvitationResponseRequest(data)).rejects.toThrow(
					"Invitation response failed: Invitation not found"
				);
			});
		});
	});

	// ========================
	// TEAM MEMBERSHIP API (from team-membership-api-client) - 22 tests
	// ========================

	describe("Team Membership API (from team-membership-api-client)", () => {
		describe("buildAddMemberUrl", () => {
			it("should build correct add member URL", () => {
				const result = apiClientCore.buildAddMemberUrl("team-123");
				expect(result).toBe("/api/teams/team-123/members");
			});

			it("should handle special characters in team ID", () => {
				const result = apiClientCore.buildAddMemberUrl("team_456-789");
				expect(result).toBe("/api/teams/team_456-789/members");
			});

			it("should handle numeric team IDs", () => {
				const result = apiClientCore.buildAddMemberUrl("12345");
				expect(result).toBe("/api/teams/12345/members");
			});
		});

		describe("createAddMemberRequest", () => {
			it("should create correct add member request", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};

				const result = apiClientCore.createAddMemberRequest(data);

				expect(result.url).toBe("/api/teams/team-123/members");
				expect(result.method).toBe("POST");
				expect(result.credentials).toBe("include");
				expect(result.headers).toEqual({ "Content-Type": "application/json" });
				expect(result.body).toBe(
					JSON.stringify({
						user_id: "user-456",
						role: "team_member"
					})
				);
			});

			it("should handle team lead role", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-789",
					role: "team_lead"
				};

				const result = apiClientCore.createAddMemberRequest(data);
				const body = JSON.parse(result.body as string);
				expect(body.role).toBe("team_lead");
			});

			it("should handle numeric user IDs", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "12345",
					role: "team_member"
				};

				const result = apiClientCore.createAddMemberRequest(data);
				const body = JSON.parse(result.body as string);
				expect(body.user_id).toBe("12345");
			});
		});

		describe("handleAddMemberResponse", () => {
			it("should handle successful add member response", async () => {
				const mockData: AddMemberApiResponse = {
					membership: {
						id: "membership-123",
						team_id: "team-456",
						user_id: "user-789",
						role: "team_member",
						created_at: "2023-01-01T00:00:00Z"
					},
					message: "Member added successfully"
				};
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue(mockData)
				} as unknown as Response;

				const result = await apiClientCore.handleAddMemberResponse(mockResponse);
				expect(result).toEqual(mockData);
			});

			it("should handle member already exists error", async () => {
				const mockResponse = {
					ok: false,
					status: 409,
					json: vi.fn().mockResolvedValue({ message: "User is already a member" })
				} as unknown as Response;

				await expect(apiClientCore.handleAddMemberResponse(mockResponse)).rejects.toThrow(
					"User is already a member"
				);
			});

			it("should handle team not found error", async () => {
				const mockResponse = {
					ok: false,
					status: 404,
					json: vi.fn().mockResolvedValue({ message: "Team not found" })
				} as unknown as Response;

				await expect(apiClientCore.handleAddMemberResponse(mockResponse)).rejects.toThrow("Team not found");
			});

			it("should handle server error", async () => {
				const mockResponse = {
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				} as unknown as Response;

				await expect(apiClientCore.handleAddMemberResponse(mockResponse)).rejects.toThrow(
					"HTTP 500: Internal Server Error"
				);
			});
		});

		describe("validateAddMemberParams", () => {
			it("should validate correct add member parameters", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual([]);
			});

			it("should reject missing team ID", () => {
				const data: AddMemberData = {
					teamId: "",
					userId: "user-456",
					role: "team_member"
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("teamId is required");
			});

			it("should reject missing user ID", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "",
					role: "team_member"
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("userId is required");
			});

			it("should reject XSS attempts in team ID", () => {
				const data: AddMemberData = {
					teamId: "team-<script>alert('xss')</script>",
					userId: "user-456",
					role: "team_member"
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("teamId contains invalid characters");
			});

			it("should reject XSS attempts in user ID", () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-<img src=x onerror=alert(1)>",
					role: "team_member"
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("userId contains invalid characters");
			});

			it("should reject invalid role", () => {
				const data = {
					teamId: "team-123",
					userId: "user-456",
					role: "invalid_role" as UserRole
				};

				const result = apiClientCore.validateAddMemberParams(data);

				expect(result.isValid).toBe(false);
				expect(result.errors).toContain("Invalid user role");
			});
		});

		describe("makeAddMemberRequest", () => {
			it("should make successful add member request", async () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};
				const mockResponse: AddMemberApiResponse = {
					membership: {
						id: "membership-789",
						team_id: "team-123",
						user_id: "user-456",
						role: "team_member",
						created_at: "2023-01-01T00:00:00Z"
					},
					message: "Member added successfully"
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeAddMemberRequest(data);

				expect(mockFetch).toHaveBeenCalledWith("/api/teams/team-123/members", {
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ user_id: "user-456", role: "team_member" })
				});
				expect(result).toEqual(mockResponse);
			});

			it("should handle validation errors", async () => {
				const data: AddMemberData = {
					teamId: "",
					userId: "user-456",
					role: "team_member"
				};

				await expect(apiClientCore.makeAddMemberRequest(data)).rejects.toThrow("Validation failed:");
			});

			it("should handle member already exists error", async () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 409,
					json: vi.fn().mockResolvedValue({ message: "User is already a member" })
				});

				await expect(apiClientCore.makeAddMemberRequest(data)).rejects.toThrow(
					"Add member failed: User is already a member"
				);
			});

			it("should handle team not found error", async () => {
				const data: AddMemberData = {
					teamId: "nonexistent-team",
					userId: "user-456",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 404,
					json: vi.fn().mockResolvedValue({ message: "Team not found" })
				});

				await expect(apiClientCore.makeAddMemberRequest(data)).rejects.toThrow(
					"Add member failed: Team not found"
				);
			});

			it("should handle network errors", async () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};

				mockFetch.mockRejectedValue(new Error("Network error"));

				await expect(apiClientCore.makeAddMemberRequest(data)).rejects.toThrow(
					"Add member failed: Network error"
				);
			});

			it("should handle server errors", async () => {
				const data: AddMemberData = {
					teamId: "team-123",
					userId: "user-456",
					role: "team_member"
				};

				mockFetch.mockResolvedValue({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				});

				await expect(apiClientCore.makeAddMemberRequest(data)).rejects.toThrow(
					"Add member failed: HTTP 500: Internal Server Error"
				);
			});
		});
	});

	// ========================
	// USER SEARCH API (from user-search-api-client) - 18 tests
	// ========================

	describe("User Search API (from user-search-api-client)", () => {
		describe("buildUserSearchUrl", () => {
			it("should build URL with query parameter", () => {
				const params: UserSearchParams = { query: "john" };
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=john");
			});

			it("should build URL with query and limit", () => {
				const params: UserSearchParams = { query: "jane", limit: 10 };
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=jane&limit=10");
			});

			it("should build URL with all parameters", () => {
				const params: UserSearchParams = {
					query: "bob",
					limit: 5,
					excludeTeamId: "team-123"
				};
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=bob&limit=5&excludeTeamId=team-123");
			});

			it("should handle special characters in query", () => {
				const params: UserSearchParams = { query: "user@example.com" };
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=user%40example.com");
			});

			it("should handle empty query", () => {
				const params: UserSearchParams = { query: "" };
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=");
			});

			it("should omit undefined parameters", () => {
				const params: UserSearchParams = {
					query: "test"
				};
				const result = apiClientCore.buildUserSearchUrl(params);
				expect(result).toBe("/api/users/search?q=test");
			});
		});

		describe("createUserSearchRequest", () => {
			it("should create correct search request", () => {
				const params: UserSearchParams = { query: "john", limit: 10 };
				const result = apiClientCore.createUserSearchRequest(params);

				expect(result.url).toBe("/api/users/search?q=john&limit=10");
				expect(result.method).toBe("GET");
				expect(result.credentials).toBe("include");
				expect(result.headers).toBeUndefined();
				expect(result.body).toBeUndefined();
			});

			it("should create request with all parameters", () => {
				const params: UserSearchParams = {
					query: "test",
					limit: 5,
					excludeTeamId: "team-456"
				};
				const result = apiClientCore.createUserSearchRequest(params);

				expect(result.url).toBe("/api/users/search?q=test&limit=5&excludeTeamId=team-456");
			});
		});

		describe("handleUserSearchResponse", () => {
			it("should handle successful search response", async () => {
				const mockData: UserSearchResponse = {
					users: [
						{
							id: "user-123",
							email: "john@example.com",
							first_name: "John",
							last_name: "Doe",
							role: "basic_user",
							is_active: true,
							created_at: "2024-01-01T00:00:00Z",
							updated_at: "2024-01-01T00:00:00Z"
						}
					],
					total: 1
				};
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue(mockData)
				} as unknown as Response;

				const result = await apiClientCore.handleUserSearchResponse(mockResponse);
				expect(result).toEqual(mockData);
			});

			it("should handle empty search results", async () => {
				const mockData: UserSearchResponse = {
					users: [],
					total: 0
				};
				const mockResponse = {
					ok: true,
					json: vi.fn().mockResolvedValue(mockData)
				} as unknown as Response;

				const result = await apiClientCore.handleUserSearchResponse(mockResponse);
				expect(result).toEqual(mockData);
			});

			it("should handle search errors", async () => {
				const mockResponse = {
					ok: false,
					status: 400,
					json: vi.fn().mockResolvedValue({ message: "Invalid search query" })
				} as unknown as Response;

				await expect(apiClientCore.handleUserSearchResponse(mockResponse)).rejects.toThrow(
					"Invalid search query"
				);
			});
		});

		describe("makeUserSearchRequest", () => {
			it("should make successful search request", async () => {
				const params: UserSearchParams = { query: "john" };
				const mockResponse: UserSearchResponse = {
					users: [
						{
							id: "user-123",
							email: "john@example.com",
							first_name: "John",
							last_name: "Doe",
							role: "basic_user",
							is_active: true,
							created_at: "2024-01-01T00:00:00Z",
							updated_at: "2024-01-01T00:00:00Z"
						}
					],
					total: 1
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				const result = await apiClientCore.makeUserSearchRequest(params);

				expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john", {
					method: "GET",
					credentials: "include"
				});
				expect(result).toEqual(mockResponse);
			});

			it("should return empty results for short queries", async () => {
				const params: UserSearchParams = { query: "j" };
				const result = await apiClientCore.makeUserSearchRequest(params);

				expect(result).toEqual({ users: [], total: 0 });
				expect(mockFetch).not.toHaveBeenCalled();
			});

			it("should return empty results for empty queries", async () => {
				const params: UserSearchParams = { query: "" };
				const result = await apiClientCore.makeUserSearchRequest(params);

				expect(result).toEqual({ users: [], total: 0 });
				expect(mockFetch).not.toHaveBeenCalled();
			});

			it("should handle search with limit", async () => {
				const params: UserSearchParams = { query: "test", limit: 5 };
				const mockResponse: UserSearchResponse = {
					users: [],
					total: 0
				};

				mockFetch.mockResolvedValue({
					ok: true,
					json: vi.fn().mockResolvedValue(mockResponse)
				});

				await apiClientCore.makeUserSearchRequest(params);

				expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=test&limit=5", {
					method: "GET",
					credentials: "include"
				});
			});

			it("should handle API errors", async () => {
				const params: UserSearchParams = { query: "error" };

				mockFetch.mockResolvedValue({
					ok: false,
					status: 400,
					json: vi.fn().mockResolvedValue({ message: "Invalid search query" })
				});

				await expect(apiClientCore.makeUserSearchRequest(params)).rejects.toThrow(
					"User search failed: Invalid search query"
				);
			});

			it("should handle network errors", async () => {
				const params: UserSearchParams = { query: "network" };

				mockFetch.mockRejectedValue(new Error("Network error"));

				await expect(apiClientCore.makeUserSearchRequest(params)).rejects.toThrow(
					"User search failed: Network error"
				);
			});

			it("should handle server errors", async () => {
				const params: UserSearchParams = { query: "server" };

				mockFetch.mockResolvedValue({
					ok: false,
					status: 500,
					statusText: "Internal Server Error",
					json: vi.fn().mockRejectedValue(new Error("Parse error"))
				});

				await expect(apiClientCore.makeUserSearchRequest(params)).rejects.toThrow(
					"User search failed: HTTP 500: Internal Server Error"
				);
			});
		});
	});

	// ========================
	// BACKWARD COMPATIBILITY EXPORTS
	// ========================

	describe("Backward Compatibility Exports", () => {
		it("should export all authentication functions", () => {
			expect(createLoginRequest).toBeDefined();
			expect(createSessionCheckRequest).toBeDefined();
			expect(handleApiResponse).toBeDefined();
			expect(makeLoginRequest).toBeDefined();
			expect(makeSessionCheckRequest).toBeDefined();
		});

		it("should export all invitation functions", () => {
			expect(buildInvitationUrl).toBeDefined();
			expect(buildInvitationResponseUrl).toBeDefined();
			expect(createSendInvitationRequest).toBeDefined();
			expect(createInvitationResponseRequest).toBeDefined();
			expect(handleInvitationApiResponse).toBeDefined();
			expect(validateInvitationApiParams).toBeDefined();
			expect(validateInvitationResponseParams).toBeDefined();
			expect(makeSendInvitationRequest).toBeDefined();
			expect(makeInvitationResponseRequest).toBeDefined();
		});

		it("should export all membership functions", () => {
			expect(buildAddMemberUrl).toBeDefined();
			expect(createAddMemberRequest).toBeDefined();
			expect(handleAddMemberResponse).toBeDefined();
			expect(validateAddMemberParams).toBeDefined();
			expect(makeAddMemberRequest).toBeDefined();
		});

		it("should export all user search functions", () => {
			expect(buildUserSearchUrl).toBeDefined();
			expect(createUserSearchRequest).toBeDefined();
			expect(handleUserSearchResponse).toBeDefined();
			expect(makeUserSearchRequest).toBeDefined();
		});

		it("should maintain function compatibility", () => {
			const loginData: LoginRequestData = {
				email: "test@example.com",
				password: "password"
			};

			// These should work exactly like the original functions
			const legacyResult = createLoginRequest(loginData);
			const newResult = apiClientCore.createLoginRequest(loginData);

			expect(legacyResult).toEqual(newResult);
		});
	});
});
