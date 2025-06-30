import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	fetchUserProfile,
	validateProfileData,
	sanitizeProfileInput,
	createProfileUpdateRequest,
	handleProfileApiResponse
} from "../../utils/profile-core";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Response constructor for testing with proper typing
interface MockResponseInit {
	status?: number;
	statusText?: string;
}

interface MockResponse {
	ok: boolean;
	status: number;
	statusText: string;
	json: () => Promise<unknown>;
	text: () => Promise<string>;
}

global.Response = vi.fn().mockImplementation(
	(body: unknown, init?: MockResponseInit): MockResponse => ({
		ok: init?.status ? init.status >= 200 && init.status < 300 : true,
		status: init?.status ?? 200,
		statusText: init?.statusText ?? "OK",
		json: vi.fn().mockImplementation(() => {
			if (typeof body === "string") {
				try {
					return Promise.resolve(JSON.parse(body));
				} catch {
					return Promise.reject(new Error("Invalid JSON"));
				}
			}
			return Promise.resolve(body);
		}),
		text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body))
	})
) as unknown as typeof Response;

describe("Profile Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchUserProfile", () => {
		it("should fetch user profile data successfully", async () => {
			const mockProfileData = {
				id: "user-123",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			mockFetch.mockResolvedValue(
				new Response(JSON.stringify(mockProfileData), {
					status: 200
				})
			);

			const result = await fetchUserProfile("user-123");

			expect(mockFetch).toHaveBeenCalledWith("/api/users/user-123", {
				method: "GET",
				headers: { "Content-Type": "application/json" },
				credentials: "include"
			});
			expect(result).toEqual(mockProfileData);
		});

		it("should throw error for non-200 response", async () => {
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({ message: "User not found" }), {
					status: 404
				})
			);

			await expect(fetchUserProfile("invalid-id")).rejects.toThrow("Failed to fetch profile: User not found");
		});

		it("should throw error for network failures", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			await expect(fetchUserProfile("user-123")).rejects.toThrow("Network error occurred while fetching profile");
		});

		it("should handle missing user ID", async () => {
			await expect(fetchUserProfile("")).rejects.toThrow("User ID is required");
		});
	});

	describe("validateProfileData", () => {
		it("should validate complete profile data", () => {
			const validProfile = {
				id: "user-123",
				email: "test@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const result = validateProfileData(validProfile);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should reject profile with missing required fields", () => {
			const invalidProfile = {
				id: "",
				email: "",
				first_name: "",
				last_name: ""
			};

			const result = validateProfileData(invalidProfile);
			expect(result.isValid).toBe(false);
			expect(result.errors.id).toContain("required");
			expect(result.errors.email).toContain("required");
			expect(result.errors.first_name).toContain("required");
			expect(result.errors.last_name).toContain("required");
		});

		it("should validate email format", () => {
			const invalidProfile = {
				id: "user-123",
				email: "invalid-email",
				first_name: "John",
				last_name: "Doe"
			};

			const result = validateProfileData(invalidProfile);
			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("valid email");
		});

		it("should validate name length limits", () => {
			const invalidProfile = {
				id: "user-123",
				email: "test@example.com",
				first_name: "A".repeat(101), // Too long
				last_name: "B".repeat(101) // Too long
			};

			const result = validateProfileData(invalidProfile);
			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toContain("100 characters");
			expect(result.errors.last_name).toContain("100 characters");
		});
	});

	describe("sanitizeProfileInput", () => {
		it("should sanitize XSS attempts in profile data", () => {
			const maliciousInput = {
				first_name: '<script>alert("xss")</script>John',
				last_name: "<img src=x onerror=alert(1)>Doe",
				email: "test@example.com"
			};

			const result = sanitizeProfileInput(maliciousInput);

			expect(result.first_name).toBe("John");
			expect(result.last_name).toBe("Doe");
			expect(result.email).toBe("test@example.com");
			expect(result.first_name).not.toContain("<script>");
			expect(result.last_name).not.toContain("<img");
		});

		it("should handle dangerous protocols", () => {
			const maliciousInput = {
				first_name: "javascript:alert('xss')",
				last_name: "data:text/html,<script>alert(1)</script>",
				email: "test@example.com"
			};

			const result = sanitizeProfileInput(maliciousInput);

			expect(result.first_name).toBe("alert('xss')");
			expect(result.last_name).toBe("");
			expect(result.email).toBe("test@example.com");
		});

		it("should preserve normal text content", () => {
			const normalInput = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const result = sanitizeProfileInput(normalInput);

			expect(result).toEqual(normalInput);
		});

		it("should handle empty and null values safely", () => {
			const emptyInput = {
				first_name: "",
				last_name: null as unknown as string,
				email: undefined as unknown as string
			};

			const result = sanitizeProfileInput(emptyInput);

			expect(result.first_name).toBe("");
			expect(result.last_name).toBe("");
			expect(result.email).toBe("");
		});
	});

	describe("createProfileUpdateRequest", () => {
		it("should create correct API request configuration", () => {
			const profileData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const request = createProfileUpdateRequest("user-123", profileData);

			expect(request.url).toBe("/api/users/user-123");
			expect(request.options.method).toBe("PUT");
			expect(request.options.headers).toEqual({
				"Content-Type": "application/json"
			});
			expect(request.options.credentials).toBe("include");

			const body = JSON.parse(request.options.body) as Record<string, unknown>;
			expect(body).toEqual(profileData);
		});

		it("should handle empty profile data", () => {
			const request = createProfileUpdateRequest("user-123", {});

			expect(request.url).toBe("/api/users/user-123");
			const body = JSON.parse(request.options.body) as Record<string, unknown>;
			expect(body).toEqual({});
		});

		it("should sanitize profile data in request", () => {
			const maliciousData = {
				first_name: '<script>alert("xss")</script>John',
				last_name: "Doe",
				email: "test@example.com"
			};

			const request = createProfileUpdateRequest("user-123", maliciousData);
			const body = JSON.parse(request.options.body) as Record<string, unknown>;

			expect(body.first_name).toBe("John");
			expect(body.first_name as string).not.toContain("<script>");
		});
	});

	describe("handleProfileApiResponse", () => {
		it("should handle successful API response", async () => {
			const successData = { message: "Profile updated successfully" };
			const mockResponse = new Response(JSON.stringify(successData), {
				status: 200
			});

			const result = await handleProfileApiResponse(mockResponse);
			expect(result).toEqual(successData);
		});

		it("should handle 400 Bad Request with validation errors", async () => {
			const errorData = {
				message: "Validation failed",
				errors: { email: "Email already exists" }
			};
			const mockResponse = new Response(JSON.stringify(errorData), {
				status: 400
			});

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Validation failed");
		});

		it("should handle 401 Unauthorized", async () => {
			const errorData = { message: "Session expired" };
			const mockResponse = new Response(JSON.stringify(errorData), {
				status: 401
			});

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Session expired");
		});

		it("should handle 403 Forbidden", async () => {
			const errorData = { message: "Access denied" };
			const mockResponse = new Response(JSON.stringify(errorData), {
				status: 403
			});

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Access denied");
		});

		it("should handle 429 Rate Limited", async () => {
			const errorData = { message: "Too many requests" };
			const mockResponse = new Response(JSON.stringify(errorData), {
				status: 429
			});

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Too many requests");
		});

		it("should handle 500 Server Error", async () => {
			const errorData = { message: "Internal server error" };
			const mockResponse = new Response(JSON.stringify(errorData), {
				status: 500
			});

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Internal server error");
		});

		it("should handle non-JSON response body", async () => {
			const mockResponse = new Response("Server Error", {
				status: 500
			});
			mockResponse.json = vi.fn().mockRejectedValue(new Error("Invalid JSON"));

			await expect(handleProfileApiResponse(mockResponse)).rejects.toThrow("Server returned invalid response");
		});
	});
});
