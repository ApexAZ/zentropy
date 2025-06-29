/**
 * Auth Core Tests - TDD Implementation
 * Consolidates comprehensive test coverage from auth-utils, login-validation,
 * password-change-utils, and login-api tests into unified auth-core module
 *
 * Following hybrid testing approach with comprehensive edge case coverage
 * Security-critical functions with XSS prevention and input sanitization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock fetch globally for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window and location objects
const mockLocation = {
	href: "",
	origin: "https://example.com",
	pathname: "/teams.html",
	search: ""
};

const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

// Mock global window object for Node.js environment
Object.defineProperty(global, "window", {
	value: {
		location: mockLocation,
		sessionStorage: mockSessionStorage
	},
	writable: true
});

// Mock sessionStorage specifically
Object.defineProperty(global, "sessionStorage", {
	value: mockSessionStorage,
	writable: true
});

// Mock document for DOM operations
Object.defineProperty(global, "document", {
	value: {
		getElementById: vi.fn(),
		createElement: vi.fn(),
		body: {
			appendChild: vi.fn(),
			querySelector: vi.fn()
		}
	},
	writable: true
});

// Import the actual AuthCore implementation
import { AuthCore } from "../../utils/auth-core.js";

// Type definitions consolidated from all auth utilities
export interface SessionStatus {
	isValid: boolean;
	user: SessionInfo | null;
	error?: string;
	expired?: boolean;
}

export interface SessionInfo {
	id: string;
	email: string;
	name: string;
	role: string;
	lastCheck?: number;
}

export interface AuthError {
	type: "expired" | "unauthorized" | "network" | "server";
	message: string;
	redirectRequired: boolean;
}

export interface LoginFormData {
	email: string;
	password: string;
}

export interface LoginValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: LoginFormData;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

export interface LoginApiResponse {
	success: true;
	message: string;
	user?: LoginUser;
}

export interface LoginApiError {
	success: false;
	message: string;
	error?: string;
}

export interface LoginRequest {
	url: string;
	options: RequestInit;
}

export interface PasswordChangeFormData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface PasswordChangeValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: PasswordChangeFormData;
}

export interface PasswordChangeRequest {
	url: string;
	options: RequestInit;
}

export interface PasswordChangeApiResponse {
	success: true;
	message: string;
}

export interface PasswordChangeApiError {
	success: false;
	message: string;
	error?: string;
}

export interface UserDisplayInfo {
	name: string;
	role: string;
}

// TDD: These tests now use the implemented AuthCore module
describe("AuthCore - Consolidated Authentication Module", () => {
	let authCore: AuthCore;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mocks
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";
		mockSessionStorage.getItem.mockReturnValue(null);
		mockFetch.mockClear();

		// Create fresh AuthCore instance for each test
		authCore = new AuthCore();
	});

	describe("Session Management (from auth-utils)", () => {
		describe("checkSessionStatus", () => {
			it("should return valid session with user info when authenticated", async () => {
				// Mock successful session check
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							user: {
								id: "user-123",
								email: "test@example.com",
								name: "Test User",
								role: "team_member"
							}
						})
				});

				const result = await authCore.checkSessionStatus();

				expect(result.isValid).toBe(true);
				expect(result.user).toEqual({
					id: "user-123",
					email: "test@example.com",
					name: "Test User",
					role: "team_member",
					lastCheck: expect.any(Number)
				});
				expect(result.error).toBeUndefined();
			});

			it("should return invalid session when unauthorized", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401,
					json: () => Promise.resolve({ message: "Unauthorized" })
				});

				const result = await authCore.checkSessionStatus();

				expect(result.isValid).toBe(false);
				expect(result.user).toBeNull();
				expect(result.error).toContain("unauthorized");
			});

			it("should handle network errors gracefully", async () => {
				mockFetch.mockRejectedValueOnce(new Error("Network error"));

				const result = await authCore.checkSessionStatus();

				expect(result.isValid).toBe(false);
				expect(result.user).toBeNull();
				expect(result.error).toContain("network");
			});
		});

		describe("clearSessionInfo", () => {
			it("should clear session storage", () => {
				authCore.clearSessionInfo();

				expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
				expect(mockSessionStorage.clear).toHaveBeenCalled();
			});
		});

		describe("redirectToLogin", () => {
			it("should redirect to login page with current location", () => {
				mockLocation.pathname = "/teams.html";

				authCore.redirectToLogin();

				expect(mockLocation.href).toContain("/login.html");
				expect(mockLocation.href).toContain("redirect=%2Fteams.html");
			});
		});
	});

	describe("Login Validation (from login-validation)", () => {
		describe("isValidEmail", () => {
			it("should return true for valid email addresses", () => {
				const validEmails = [
					"test@example.com",
					"user.name@domain.co.uk",
					"firstname+lastname@example.org",
					"email@subdomain.example.com"
				];

				validEmails.forEach(email => {
					expect(authCore.isValidEmail(email)).toBe(true);
				});
			});

			it("should return false for invalid email addresses", () => {
				const invalidEmails = [
					"invalid-email",
					"@example.com",
					"test@",
					"test..test@example.com",
					"test@@example.com",
					""
				];

				invalidEmails.forEach(email => {
					expect(authCore.isValidEmail(email)).toBe(false);
				});
			});
		});

		describe("validateLoginForm", () => {
			it("should validate correct login form data", () => {
				const validData = {
					email: "test@example.com",
					password: "ValidPassword123!"
				};

				const result = authCore.validateLoginForm(validData);

				expect(result.isValid).toBe(true);
				expect(Object.keys(result.errors)).toHaveLength(0);
				expect(result.sanitizedData).toEqual(validData);
			});

			it("should reject invalid email format", () => {
				const invalidData = {
					email: "invalid-email",
					password: "ValidPassword123!"
				};

				const result = authCore.validateLoginForm(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toContain("Invalid email format");
			});

			it("should reject empty password", () => {
				const invalidData = {
					email: "test@example.com",
					password: ""
				};

				const result = authCore.validateLoginForm(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.password).toContain("Password is required");
			});
		});

		describe("sanitizeLoginInput", () => {
			it("should sanitize XSS attempts in email and password", () => {
				const maliciousInput = {
					email: '<script>alert("xss")</script>test@example.com',
					password: '<script>alert("xss")</script>password123'
				};

				const sanitized = authCore.sanitizeLoginInput(maliciousInput);

				expect(sanitized.email).not.toContain("<script>");
				expect(sanitized.password).not.toContain("<script>");
				expect(sanitized.email).toContain("test@example.com");
				expect(sanitized.password).toContain("password123");
			});
		});
	});

	describe("Login API (from login-api)", () => {
		describe("createLoginRequest", () => {
			it("should create proper login request configuration", () => {
				const credentials = {
					email: "test@example.com",
					password: "password123"
				};

				const request = authCore.createLoginRequest(credentials);

				expect(request.url).toBe("/api/users/login");
				expect(request.options.method).toBe("POST");
				expect(request.options.headers).toEqual({
					"Content-Type": "application/json"
				});

				const body = JSON.parse(request.options.body as string);
				expect(body).toEqual(credentials);
			});
		});

		describe("makeLoginRequest", () => {
			it("should handle successful login", async () => {
				const credentials = { email: "test@example.com", password: "password123" };
				const mockUser = {
					id: "user-123",
					email: "test@example.com",
					first_name: "Test",
					last_name: "User",
					role: "team_member"
				};

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ message: "Login successful", user: mockUser })
				});

				const result = await authCore.makeLoginRequest(credentials);

				expect(result.success).toBe(true);
				expect((result as LoginApiResponse).user).toEqual(mockUser);
			});

			it("should handle login failure", async () => {
				const credentials = { email: "test@example.com", password: "wrongpassword" };

				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401,
					json: () => Promise.resolve({ message: "Invalid credentials" })
				});

				const result = await authCore.makeLoginRequest(credentials);

				expect(result.success).toBe(false);
				expect((result as LoginApiError).message).toContain("Invalid credentials");
			});
		});
	});

	describe("Password Change (from password-change-utils)", () => {
		describe("validatePasswordChangeForm", () => {
			it("should validate correct password change form", () => {
				const validData = {
					currentPassword: "CurrentPass123!",
					newPassword: "NewPassword123!",
					confirmPassword: "NewPassword123!"
				};

				const result = authCore.validatePasswordChangeForm(validData);

				expect(result.isValid).toBe(true);
				expect(Object.keys(result.errors)).toHaveLength(0);
			});

			it("should reject when new passwords don't match", () => {
				const invalidData = {
					currentPassword: "CurrentPass123!",
					newPassword: "NewPassword123!",
					confirmPassword: "DifferentPassword123!"
				};

				const result = authCore.validatePasswordChangeForm(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.confirmPassword).toContain("Passwords do not match");
			});

			it("should reject weak new passwords", () => {
				const invalidData = {
					currentPassword: "CurrentPass123!",
					newPassword: "weak",
					confirmPassword: "weak"
				};

				const result = authCore.validatePasswordChangeForm(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.newPassword).toContain("Password must be at least");
			});
		});

		describe("sanitizePasswordChangeInput", () => {
			it("should sanitize XSS attempts in password fields", () => {
				const maliciousInput = {
					currentPassword: '<script>alert("xss")</script>MyPassword123!',
					newPassword: '<script>alert("xss")</script>NewPassword123!',
					confirmPassword: '<script>alert("xss")</script>NewPassword123!'
				};

				const sanitized = authCore.sanitizePasswordChangeInput(maliciousInput);

				expect(sanitized.currentPassword).not.toContain("<script>");
				expect(sanitized.newPassword).not.toContain("<script>");
				expect(sanitized.confirmPassword).not.toContain("<script>");
			});
		});
	});

	describe("Navigation Auth (from navigation-auth)", () => {
		describe("initializeNavigation", () => {
			it("should initialize navigation with user info when authenticated", async () => {
				// Mock successful session check
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () =>
						Promise.resolve({
							user: {
								id: "user-123",
								email: "test@example.com",
								name: "Test User",
								role: "team_member"
							}
						})
				});

				// Mock DOM elements
				const mockUserInfo = { textContent: "" };
				const mockLogoutButton = { addEventListener: vi.fn() };
				(document.getElementById as Mock).mockReturnValueOnce(mockUserInfo);
				(document.getElementById as Mock).mockReturnValueOnce(mockLogoutButton);

				await authCore.initializeNavigation();

				expect(mockUserInfo.textContent).toContain("Test User");
				expect(mockLogoutButton.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
			});

			it("should redirect to login when not authenticated", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 401
				});

				await authCore.initializeNavigation();

				expect(mockLocation.href).toContain("/login.html");
			});
		});

		describe("handleLogout", () => {
			it("should perform logout and clear session", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ message: "Logged out successfully" })
				});

				await authCore.handleLogout();

				expect(mockFetch).toHaveBeenCalledWith("/api/users/logout", {
					method: "POST",
					credentials: "include"
				});
				expect(mockSessionStorage.clear).toHaveBeenCalled();
				expect(mockLocation.href).toContain("/login.html");
			});
		});
	});
});
