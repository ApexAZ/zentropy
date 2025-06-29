/**
 * Password Change Utilities Tests - TDD Implementation
 *
 * Following hybrid testing approach:
 * - Test pure functions for password change validation and API handling
 * - Security-critical functions with comprehensive edge case coverage
 * - XSS prevention and input sanitization testing
 * - Rate limiting integration and error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the functions we're testing
import {
	validatePasswordChangeForm,
	createPasswordChangeRequest,
	handlePasswordChangeResponse,
	sanitizePasswordChangeInput,
	type PasswordChangeFormData
} from "../../utils/password-change-utils.js";

describe("Password Change Utilities - TDD Implementation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("sanitizePasswordChangeInput", () => {
		it("should sanitize XSS attempts in password fields", () => {
			const maliciousInput = {
				currentPassword: '<script>alert("xss")</script>MyPassword123!',
				newPassword: "<img src=x onerror=alert(1)>NewPassword456!",
				confirmPassword: '<iframe src="javascript:alert(1)">ConfirmPassword456!'
			};

			const result = sanitizePasswordChangeInput(maliciousInput);

			// The sanitizeInput function removes HTML tags and dangerous protocols
			expect(result.currentPassword).toBe("MyPassword123!");
			expect(result.newPassword).toBe("NewPassword456!");
			expect(result.confirmPassword).toBe("ConfirmPassword456!");
		});

		it("should handle empty and whitespace inputs", () => {
			const whitespaceInput = {
				currentPassword: "  ",
				newPassword: "\t\n",
				confirmPassword: ""
			};

			const result = sanitizePasswordChangeInput(whitespaceInput);

			expect(result.currentPassword).toBe("");
			expect(result.newPassword).toBe("");
			expect(result.confirmPassword).toBe("");
		});

		it("should preserve valid password characters", () => {
			const validInput = {
				currentPassword: "ValidPassword123!@#$",
				newPassword: "ValidPassword123!@#$",
				confirmPassword: "ValidPassword123!@#$"
			};

			const result = sanitizePasswordChangeInput(validInput);

			expect(result.currentPassword).toBe("ValidPassword123!@#$");
			expect(result.newPassword).toBe("ValidPassword123!@#$");
			expect(result.confirmPassword).toBe("ValidPassword123!@#$");
		});
	});

	describe("validatePasswordChangeForm", () => {
		it("should validate correct password change form", () => {
			const validForm: PasswordChangeFormData = {
				currentPassword: "CurrentPass123!",
				newPassword: "NewSecurePass456!",
				confirmPassword: "NewSecurePass456!"
			};

			const result = validatePasswordChangeForm(validForm);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
			expect(result.sanitizedData).toEqual(validForm);
		});

		it("should require all password fields", () => {
			const incompleteForm: PasswordChangeFormData = {
				currentPassword: "",
				newPassword: "NewPass123!",
				confirmPassword: "NewPass123!"
			};

			const result = validatePasswordChangeForm(incompleteForm);

			expect(result.isValid).toBe(false);
			expect(result.errors.currentPassword).toBeDefined();
			expect(result.errors.currentPassword).toContain("Current password is required");
		});

		it("should validate new password confirmation match", () => {
			const mismatchForm: PasswordChangeFormData = {
				currentPassword: "CurrentPass123!",
				newPassword: "NewPass123!",
				confirmPassword: "DifferentPass456!"
			};

			const result = validatePasswordChangeForm(mismatchForm);

			expect(result.isValid).toBe(false);
			expect(result.errors.confirmPassword).toBeDefined();
			expect(result.errors.confirmPassword).toContain("Passwords do not match");
		});

		it("should enforce password policy on new password", () => {
			const weakPasswordForm: PasswordChangeFormData = {
				currentPassword: "CurrentPass123!",
				newPassword: "weak",
				confirmPassword: "weak"
			};

			const result = validatePasswordChangeForm(weakPasswordForm);

			expect(result.isValid).toBe(false);
			expect(result.errors.newPassword).toBeDefined();
			expect(result.errors.newPassword).toContain("at least 8 characters");
		});

		it("should prevent current and new password being the same", () => {
			const samePasswordForm: PasswordChangeFormData = {
				currentPassword: "SamePassword123!",
				newPassword: "SamePassword123!",
				confirmPassword: "SamePassword123!"
			};

			const result = validatePasswordChangeForm(samePasswordForm);

			expect(result.isValid).toBe(false);
			expect(result.errors.newPassword).toBeDefined();
			expect(result.errors.newPassword).toContain("must be different from current password");
		});

		it("should handle special characters and unicode in passwords", () => {
			const unicodeForm: PasswordChangeFormData = {
				currentPassword: "CurrentПароль123!",
				newPassword: "NewPassword测试456!",
				confirmPassword: "NewPassword测试456!"
			};

			const result = validatePasswordChangeForm(unicodeForm);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.newPassword).toBe("NewPassword测试456!");
		});

		it("should validate password strength requirements", () => {
			const testCases = [
				{
					password: "Password",
					shouldFail: true,
					reason: "no numbers or symbols"
				},
				{
					password: "password123",
					shouldFail: true,
					reason: "no uppercase or symbols"
				},
				{
					password: "PASSWORD123!",
					shouldFail: true,
					reason: "no lowercase"
				},
				{
					password: "Password123",
					shouldFail: true,
					reason: "no symbols"
				},
				{
					password: "Password123!",
					shouldFail: false,
					reason: "meets all requirements"
				}
			];

			testCases.forEach(({ password, shouldFail }) => {
				const form: PasswordChangeFormData = {
					currentPassword: "CurrentPass123!",
					newPassword: password,
					confirmPassword: password
				};

				const result = validatePasswordChangeForm(form);

				if (shouldFail) {
					expect(result.isValid).toBe(false);
					expect(result.errors.newPassword).toBeDefined();
				} else {
					expect(result.isValid).toBe(true);
				}
			});
		});
	});

	describe("createPasswordChangeRequest", () => {
		it("should create correct API request configuration", () => {
			const userId = "user-123";
			const passwordData = {
				currentPassword: "CurrentPass123!",
				newPassword: "NewSecurePass456!"
			};

			const result = createPasswordChangeRequest(userId, passwordData);

			expect(result.url).toBe(`/api/users/${userId}/password`);
			expect(result.options.method).toBe("PUT");
			expect(result.options.headers["Content-Type"]).toBe("application/json");
			expect(result.options.credentials).toBe("include");

			const body = JSON.parse(result.options.body) as { currentPassword: string; newPassword: string };
			expect(body.currentPassword).toBe("CurrentPass123!");
			expect(body.newPassword).toBe("NewSecurePass456!");
		});

		it("should handle special characters in user ID", () => {
			const userId = "user-with-special-chars_123";
			const passwordData = {
				currentPassword: "Test123!",
				newPassword: "New456!"
			};

			const result = createPasswordChangeRequest(userId, passwordData);

			expect(result.url).toBe("/api/users/user-with-special-chars_123/password");
		});

		it("should create request with proper security headers", () => {
			const userId = "user-123";
			const passwordData = {
				currentPassword: "Current123!",
				newPassword: "New456!"
			};

			const result = createPasswordChangeRequest(userId, passwordData);

			expect(result.options.credentials).toBe("include");
			expect(result.options.headers["Content-Type"]).toBe("application/json");
		});
	});

	describe("handlePasswordChangeResponse", () => {
		it("should handle successful password change response", async () => {
			const mockResponse = new Response(JSON.stringify({ message: "Password updated successfully" }), {
				status: 200,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Password updated successfully");
		});

		it("should handle validation error responses", async () => {
			const mockResponse = new Response(JSON.stringify({ message: "Current password is incorrect" }), {
				status: 400,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Current password is incorrect");
		});

		it("should handle rate limiting responses", async () => {
			const mockResponse = new Response(
				JSON.stringify({ message: "Too many password change attempts. Please try again later." }),
				{
					status: 429,
					headers: { "Content-Type": "application/json" }
				}
			);

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Too many");
			expect(result.rateLimited).toBe(true);
		});

		it("should handle unauthorized responses", async () => {
			const mockResponse = new Response(JSON.stringify({ message: "Session expired. Please log in again." }), {
				status: 401,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Session expired");
			expect(result.requiresReauth).toBe(true);
		});

		it("should handle server error responses", async () => {
			const mockResponse = new Response(JSON.stringify({ message: "Internal server error" }), {
				status: 500,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toContain("server error");
		});

		it("should handle network errors and malformed responses", async () => {
			const mockResponse = new Response("Invalid JSON", {
				status: 200,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Invalid response");
		});

		it("should handle empty response body", async () => {
			const mockResponse = new Response("", {
				status: 200,
				headers: { "Content-Type": "application/json" }
			});

			const result = await handlePasswordChangeResponse(mockResponse);

			expect(result.success).toBe(false);
			expect(result.message).toContain("Invalid response");
		});
	});

	describe("Security and Edge Cases", () => {
		it("should handle extremely long passwords", () => {
			const longPassword = "a".repeat(1000) + "A1!";
			const form: PasswordChangeFormData = {
				currentPassword: "CurrentPass123!",
				newPassword: longPassword,
				confirmPassword: longPassword
			};

			const result = validatePasswordChangeForm(form);

			expect(result.isValid).toBe(false);
			expect(result.errors.newPassword).toContain("too long");
		});

		it("should handle null and undefined inputs gracefully", () => {
			const nullForm: PasswordChangeFormData = {
				currentPassword: "",
				newPassword: "",
				confirmPassword: ""
			};

			const result = validatePasswordChangeForm(nullForm);

			expect(result.isValid).toBe(false);
			expect(result.errors.currentPassword).toBeDefined();
			expect(result.errors.newPassword).toBeDefined();
		});

		it("should sanitize all inputs to prevent XSS", () => {
			const maliciousForm = {
				currentPassword: '<script>alert("current")</script>Pass123!',
				newPassword: '<img onerror="alert(1)">NewPass456!',
				confirmPassword: '<svg onload="alert(1)">NewPass456!'
			};

			const sanitized = sanitizePasswordChangeInput(maliciousForm);

			// The real sanitizeInput function removes HTML tags and dangerous protocols
			expect(sanitized.currentPassword).not.toContain("<script>");
			expect(sanitized.newPassword).not.toContain("<img");
			expect(sanitized.confirmPassword).not.toContain("<svg");
			expect(sanitized.currentPassword).toBe("Pass123!");
			expect(sanitized.newPassword).toBe("NewPass456!");
			expect(sanitized.confirmPassword).toBe("NewPass456!");
		});
	});
});
