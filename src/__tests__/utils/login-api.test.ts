/**
 * Login API Client Utilities Tests
 * Following hybrid testing approach - testing pure functions for API requests
 * TDD implementation with comprehensive edge case coverage for API interactions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	createLoginRequest,
	handleLoginResponse,
	createSessionCheckRequest,
	parseLoginResponse,
	parseErrorResponse,
	type LoginCredentials,
	type LoginApiResponse,
	type LoginApiError
} from "../../utils/login-api.js";

describe("Login API Client Utilities", () => {
	describe("createLoginRequest", () => {
		it("should create correct login request configuration", () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password123"
			};

			const request = createLoginRequest(credentials);

			expect(request.method).toBe("POST");
			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});
			expect(request.credentials).toBe("include");
			expect(JSON.parse(request.body as string)).toEqual({
				email: "test@example.com",
				password: "password123"
			});
		});

		it("should handle special characters in credentials", () => {
			const credentials: LoginCredentials = {
				email: "user+test@example.com",
				password: "p@ssw0rd!@#$%"
			};

			const request = createLoginRequest(credentials);
			const parsedBody = JSON.parse(request.body as string);

			expect(parsedBody.email).toBe("user+test@example.com");
			expect(parsedBody.password).toBe("p@ssw0rd!@#$%");
		});

		it("should handle empty credentials", () => {
			const credentials: LoginCredentials = {
				email: "",
				password: ""
			};

			const request = createLoginRequest(credentials);
			const parsedBody = JSON.parse(request.body as string);

			expect(parsedBody.email).toBe("");
			expect(parsedBody.password).toBe("");
		});

		it("should include proper headers and credentials", () => {
			const credentials: LoginCredentials = {
				email: "test@example.com",
				password: "password"
			};

			const request = createLoginRequest(credentials);

			expect(request.credentials).toBe("include"); // Important for session cookies
			expect(request.headers).toHaveProperty("Content-Type", "application/json");
		});
	});

	describe("createSessionCheckRequest", () => {
		it("should create correct session check request configuration", () => {
			const request = createSessionCheckRequest();

			expect(request.method).toBe("GET");
			expect(request.credentials).toBe("include");
		});

		it("should not include body for GET request", () => {
			const request = createSessionCheckRequest();

			expect(request.body).toBeUndefined();
		});
	});

	describe("parseLoginResponse", () => {
		it("should parse successful login response", () => {
			const mockResponseData = {
				message: "Login successful",
				user: {
					id: "user-123",
					email: "test@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member"
				}
			};

			const result = parseLoginResponse(mockResponseData);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Login successful");
			expect(result.user).toEqual(mockResponseData.user);
		});

		it("should handle response without user data", () => {
			const mockResponseData = {
				message: "Login successful"
			};

			const result = parseLoginResponse(mockResponseData);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Login successful");
			expect(result.user).toBeUndefined();
		});

		it("should handle empty message", () => {
			const mockResponseData = {
				message: "",
				user: {
					id: "user-123",
					email: "test@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_lead"
				}
			};

			const result = parseLoginResponse(mockResponseData);

			expect(result.success).toBe(true);
			expect(result.message).toBe("");
			expect(result.user).toEqual(mockResponseData.user);
		});

		it("should handle user with different role types", () => {
			const teamLeadData = {
				message: "Login successful",
				user: {
					id: "user-456",
					email: "lead@example.com",
					first_name: "Jane",
					last_name: "Smith",
					role: "team_lead"
				}
			};

			const result = parseLoginResponse(teamLeadData);

			expect(result.user?.role).toBe("team_lead");
		});
	});

	describe("parseErrorResponse", () => {
		it("should parse standard error response", () => {
			const mockErrorData = {
				message: "Invalid credentials",
				error: "Authentication failed"
			};

			const result = parseErrorResponse(mockErrorData);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Invalid credentials");
			expect(result.error).toBe("Authentication failed");
		});

		it("should parse error response without error field", () => {
			const mockErrorData = {
				message: "Account locked"
			};

			const result = parseErrorResponse(mockErrorData);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Account locked");
			expect(result.error).toBeUndefined();
		});

		it("should parse error response with field information", () => {
			const mockErrorData = {
				message: "Invalid email format",
				error: "Validation failed",
				field: "email"
			};

			const result = parseErrorResponse(mockErrorData);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Invalid email format");
			expect(result.error).toBe("Validation failed");
			expect(result.field).toBe("email");
		});

		it("should handle empty error response", () => {
			const mockErrorData = {
				message: ""
			};

			const result = parseErrorResponse(mockErrorData);

			expect(result.success).toBe(false);
			expect(result.message).toBe("");
		});
	});

	describe("handleLoginResponse", () => {
		let mockResponse: Partial<Response>;

		beforeEach(() => {
			mockResponse = {
				ok: true,
				status: 200,
				json: vi.fn()
			};
		});

		it("should handle successful 200 response", async () => {
			const mockData = {
				message: "Login successful",
				user: {
					id: "user-123",
					email: "test@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member"
				}
			};

			(mockResponse.json as any).mockResolvedValue(mockData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Login successful");
			expect(result.user).toEqual(mockData.user);
		});

		it("should handle 400 validation error", async () => {
			mockResponse.ok = false;
			mockResponse.status = 400;
			
			const mockErrorData = {
				message: "Invalid email format",
				field: "email"
			};

			(mockResponse.json as any).mockResolvedValue(mockErrorData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Invalid email format");
			expect(result.field).toBe("email");
		});

		it("should handle 401 authentication error", async () => {
			mockResponse.ok = false;
			mockResponse.status = 401;
			
			const mockErrorData = {
				message: "Invalid credentials"
			};

			(mockResponse.json as any).mockResolvedValue(mockErrorData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Invalid credentials");
		});

		it("should handle 429 rate limiting error", async () => {
			mockResponse.ok = false;
			mockResponse.status = 429;
			
			const mockErrorData = {
				message: "Too many login attempts. Please try again later."
			};

			(mockResponse.json as any).mockResolvedValue(mockErrorData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Too many login attempts. Please try again later.");
		});

		it("should handle 500 server error", async () => {
			mockResponse.ok = false;
			mockResponse.status = 500;
			
			const mockErrorData = {
				message: "Internal server error"
			};

			(mockResponse.json as any).mockResolvedValue(mockErrorData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Internal server error");
		});

		it("should handle network error with invalid JSON", async () => {
			mockResponse.ok = false;
			mockResponse.status = 500;
			
			(mockResponse.json as any).mockRejectedValue(new Error("Invalid JSON"));

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Unable to process");
		});

		it("should handle unexpected response status", async () => {
			mockResponse.ok = false;
			mockResponse.status = 418; // I'm a teapot
			
			const mockErrorData = {
				message: "Unexpected error"
			};

			(mockResponse.json as any).mockResolvedValue(mockErrorData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Unexpected error");
		});

		it("should handle response without JSON body", async () => {
			(mockResponse.json as any).mockRejectedValue(new Error("No JSON body"));

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Unable to process");
		});

		it("should preserve all response data fields", async () => {
			const mockData = {
				message: "Login successful",
				user: {
					id: "user-123",
					email: "test@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_lead"
				},
				additional_field: "extra_data"
			};

			(mockResponse.json as any).mockResolvedValue(mockData);

			const result = await handleLoginResponse(mockResponse as Response);

			expect(result.success).toBe(true);
			expect(result.user).toEqual(mockData.user);
			expect((result as any).additional_field).toBe("extra_data");
		});
	});
});