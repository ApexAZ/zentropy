import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createLoginRequest,
	createSessionCheckRequest,
	handleApiResponse,
	makeLoginRequest,
	makeSessionCheckRequest,
	type LoginResponse,
	type ApiErrorResponse
} from "../../utils/api-client";

describe("API Client Utilities", () => {
	describe("createLoginRequest", () => {
		it("should create correct login request configuration", () => {
			const email = "test@example.com";
			const password = "SecureP@ssw0rd123!";
			
			const request = createLoginRequest(email, password);
			
			expect(request.method).toBe("POST");
			expect(request.headers).toEqual({ "Content-Type": "application/json" });
			expect(request.credentials).toBe("include");
			expect(request.body).toBe(JSON.stringify({ email, password }));
		});

		it("should handle special characters in email and password", () => {
			const email = "user+tag@example-domain.co.uk";
			const password = "P@ssw0rd!@#$%^&*()";
			
			const request = createLoginRequest(email, password);
			
			expect(JSON.parse(request.body as string)).toEqual({
				email,
				password
			});
		});

		it("should handle empty strings", () => {
			const request = createLoginRequest("", "");
			
			expect(JSON.parse(request.body as string)).toEqual({
				email: "",
				password: ""
			});
		});
	});

	describe("createSessionCheckRequest", () => {
		it("should create correct session check request configuration", () => {
			const request = createSessionCheckRequest();
			
			expect(request.method).toBe("GET");
			expect(request.credentials).toBe("include");
			expect(request.body).toBeUndefined();
			expect(request.headers).toBeUndefined();
		});
	});

	describe("handleApiResponse", () => {
		it("should return parsed JSON for successful responses", async () => {
			const mockData = { message: "Success", user: { id: "123" } };
			const mockJsonFn = vi.fn().mockResolvedValue(mockData);
			const mockResponse = {
				ok: true,
				json: mockJsonFn
			} as unknown as Response;

			const result = await handleApiResponse<LoginResponse>(mockResponse);

			expect(result).toEqual(mockData);
			expect(mockJsonFn).toHaveBeenCalledOnce();
		});

		it("should throw error with message for failed responses", async () => {
			const errorData: ApiErrorResponse = {
				message: "Invalid credentials"
			};
			const mockJsonFn = vi.fn().mockResolvedValue(errorData);
			const mockResponse = {
				ok: false,
				json: mockJsonFn
			} as unknown as Response;

			await expect(handleApiResponse(mockResponse)).rejects.toThrow("Invalid credentials");
			expect(mockJsonFn).toHaveBeenCalledOnce();
		});

		it("should throw default error message when response has no message", async () => {
			const errorData = {};
			const mockResponse = {
				ok: false,
				json: vi.fn().mockResolvedValue(errorData)
			} as unknown as Response;

			await expect(handleApiResponse(mockResponse)).rejects.toThrow("API request failed");
		});

		it("should handle error response with field information", async () => {
			const errorData: ApiErrorResponse = {
				message: "Validation failed",
				field: "email",
				error: "Invalid format"
			};
			const mockResponse = {
				ok: false,
				json: vi.fn().mockResolvedValue(errorData)
			} as unknown as Response;

			await expect(handleApiResponse(mockResponse)).rejects.toThrow("Validation failed");
		});
	});

	describe("makeLoginRequest", () => {
		let originalFetch: typeof global.fetch;

		beforeEach(() => {
			originalFetch = global.fetch;
			global.fetch = vi.fn();
		});

		afterEach(() => {
			global.fetch = originalFetch;
			vi.restoreAllMocks();
		});

		it("should make login request with correct parameters", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					message: "Login successful",
					user: { id: "123", email: "test@example.com" }
				})
			};
			
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

			const email = "test@example.com";
			const password = "SecureP@ssw0rd123!";
			
			const result = await makeLoginRequest(email, password);

			expect(global.fetch).toHaveBeenCalledWith("/api/users/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ email, password })
			});

			expect(result.message).toBe("Login successful");
			expect(result.user?.id).toBe("123");
		});

		it("should handle login request failure", async () => {
			const mockResponse = {
				ok: false,
				json: vi.fn().mockResolvedValue({
					message: "Invalid credentials"
				})
			};
			
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

			await expect(makeLoginRequest("test@example.com", "wrong")).rejects.toThrow("Invalid credentials");
		});

		it("should handle network errors", async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

			await expect(makeLoginRequest("test@example.com", "password")).rejects.toThrow("Network error");
		});
	});

	describe("makeSessionCheckRequest", () => {
		let originalFetch: typeof global.fetch;

		beforeEach(() => {
			originalFetch = global.fetch;
			global.fetch = vi.fn();
		});

		afterEach(() => {
			global.fetch = originalFetch;
			vi.restoreAllMocks();
		});

		it("should make session check request with correct parameters", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					message: "Session valid",
					user: { id: "123", email: "test@example.com" }
				})
			};
			
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
			
			const result = await makeSessionCheckRequest();

			expect(global.fetch).toHaveBeenCalledWith("/api/users/session", {
				method: "GET",
				credentials: "include"
			});

			expect(result.message).toBe("Session valid");
			expect(result.user?.id).toBe("123");
		});

		it("should handle session check failure", async () => {
			const mockResponse = {
				ok: false,
				json: vi.fn().mockResolvedValue({
					message: "Session expired"
				})
			};
			
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

			await expect(makeSessionCheckRequest()).rejects.toThrow("Session expired");
		});

		it("should handle unauthorized session check", async () => {
			const mockResponse = {
				ok: false,
				json: vi.fn().mockResolvedValue({
					message: "Unauthorized"
				})
			};
			
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

			await expect(makeSessionCheckRequest()).rejects.toThrow("Unauthorized");
		});
	});

	describe("Type Safety", () => {
		it("should enforce correct return types", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					message: "Success",
					user: {
						id: "123",
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						role: "team_member"
					}
				})
			} as unknown as Response;

			const result = await handleApiResponse<LoginResponse>(mockResponse);

			// TypeScript should enforce these properties exist
			expect(result.message).toBeDefined();
			expect(result.user?.id).toBeDefined();
			expect(result.user?.email).toBeDefined();
			expect(result.user?.first_name).toBeDefined();
			expect(result.user?.last_name).toBeDefined();
			expect(result.user?.role).toBeDefined();
		});

		it("should handle optional user data", async () => {
			const mockResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					message: "Success"
					// No user data
				})
			} as unknown as Response;

			const result = await handleApiResponse<LoginResponse>(mockResponse);

			expect(result.message).toBe("Success");
			expect(result.user).toBeUndefined();
		});
	});
});