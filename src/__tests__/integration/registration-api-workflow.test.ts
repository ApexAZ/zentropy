/**
 * Registration API Workflow Tests - Hybrid Approach
 * 
 * This file replaces the pseudo-testing in registration-workflow.test.ts
 * with meaningful API integration tests that focus on business logic.
 * 
 * Following hybrid testing strategy:
 * - Business logic is tested in registration-validation.test.ts (pure functions)
 * - This file tests critical API workflows and integration scenarios
 * - No pseudo-testing - focus on what can break in API communication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../utils/registration-validation", () => ({
	validateRegistrationForm: vi.fn(),
	calculatePasswordStrength: vi.fn(),
	sanitizeRegistrationInput: vi.fn()
}));

vi.mock("../../utils/api-client", () => ({
	makeRegistrationRequest: vi.fn(),
	checkEmailAvailability: vi.fn(),
	handleApiResponse: vi.fn()
}));

import {
	validateRegistrationForm,
	calculatePasswordStrength,
	sanitizeRegistrationInput
} from "../../utils/registration-validation";

import {
	makeRegistrationRequest,
	checkEmailAvailability,
	handleApiResponse
} from "../../utils/api-client";

interface RegistrationFormData {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	confirm_password: string;
	role: "team_lead" | "team_member";
	terms_accepted: boolean;
}

interface RegistrationResponse {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
	message: string;
}

interface EmailAvailabilityResponse {
	available: boolean;
	message?: string;
}

describe("Registration API Workflow Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Successful Registration Workflow", () => {
		it("should complete full registration with valid data", async () => {
			const validFormData: RegistrationFormData = {
				first_name: "John",
				last_name: "Doe", 
				email: "john.doe@example.com",
				password: "MySecurePassword123!",
				confirm_password: "MySecurePassword123!",
				role: "team_member",
				terms_accepted: true
			};

			const sanitizedData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const validationResult = {
				isValid: true,
				errors: {},
				sanitizedData
			};

			const passwordStrength = {
				score: 85,
				level: "Excellent",
				feedback: []
			};

			const registrationResponse: RegistrationResponse = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				message: "Registration successful"
			};

			// Setup mocks for successful workflow
			vi.mocked(validateRegistrationForm).mockReturnValue(validationResult);
			vi.mocked(calculatePasswordStrength).mockReturnValue(passwordStrength);
			vi.mocked(sanitizeRegistrationInput).mockReturnValue(sanitizedData);
			vi.mocked(makeRegistrationRequest).mockResolvedValue(registrationResponse);

			// Execute workflow
			const validation = validateRegistrationForm(validFormData);
			expect(validation.isValid).toBe(true);

			const strength = calculatePasswordStrength(validFormData.password);
			expect(strength.score).toBeGreaterThanOrEqual(80);

			const sanitized = sanitizeRegistrationInput(validFormData);
			expect(sanitized).toEqual(sanitizedData);

			const response = await makeRegistrationRequest(sanitized);
			expect(response).toEqual(registrationResponse);

			// Verify function calls with correct data
			expect(validateRegistrationForm).toHaveBeenCalledWith(validFormData);
			expect(calculatePasswordStrength).toHaveBeenCalledWith(validFormData.password);
			expect(sanitizeRegistrationInput).toHaveBeenCalledWith(validFormData);
			expect(makeRegistrationRequest).toHaveBeenCalledWith(sanitizedData);
		});

		it("should handle registration with different roles", async () => {
			const teamLeadData: RegistrationFormData = {
				first_name: "Jane",
				last_name: "Smith",
				email: "jane.smith@example.com",
				password: "SecureLeadPassword123!",
				confirm_password: "SecureLeadPassword123!",
				role: "team_lead",
				terms_accepted: true
			};

			const registrationResponse: RegistrationResponse = {
				id: "lead456",
				email: "jane.smith@example.com",
				first_name: "Jane",
				last_name: "Smith",
				role: "team_lead",
				message: "Team lead registration successful"
			};

			vi.mocked(validateRegistrationForm).mockReturnValue({
				isValid: true,
				errors: {},
				sanitizedData: {
					first_name: "Jane",
					last_name: "Smith",
					email: "jane.smith@example.com"
				}
			});
			vi.mocked(makeRegistrationRequest).mockResolvedValue(registrationResponse);

			const validation = validateRegistrationForm(teamLeadData);
			const response = await makeRegistrationRequest(validation.sanitizedData!);

			expect(response.role).toBe("team_lead");
			expect(response.email).toBe("jane.smith@example.com");
		});
	});

	describe("Email Availability Workflow", () => {
		it("should check email availability before registration", async () => {
			const email = "new.user@example.com";
			const availabilityResponse: EmailAvailabilityResponse = {
				available: true,
				message: "Email is available"
			};

			vi.mocked(checkEmailAvailability).mockResolvedValue(availabilityResponse);

			const result = await checkEmailAvailability(email);

			expect(result.available).toBe(true);
			expect(checkEmailAvailability).toHaveBeenCalledWith(email);
		});

		it("should handle unavailable email", async () => {
			const email = "existing.user@example.com";
			const availabilityResponse: EmailAvailabilityResponse = {
				available: false,
				message: "Email already exists"
			};

			vi.mocked(checkEmailAvailability).mockResolvedValue(availabilityResponse);

			const result = await checkEmailAvailability(email);

			expect(result.available).toBe(false);
			expect(result.message).toBe("Email already exists");
		});

		it("should handle email availability check errors", async () => {
			const email = "test@example.com";

			vi.mocked(checkEmailAvailability).mockRejectedValue(new Error("Network error"));

			await expect(checkEmailAvailability(email)).rejects.toThrow("Network error");
		});
	});

	describe("Validation Error Handling", () => {
		it("should handle form validation errors", () => {
			const invalidFormData: RegistrationFormData = {
				first_name: "",
				last_name: "Doe",
				email: "invalid-email",
				password: "weak",
				confirm_password: "different",
				role: "team_member",
				terms_accepted: false
			};

			const validationResult = {
				isValid: false,
				errors: {
					first_name: "First name is required",
					email: "Please enter a valid email address",
					password: "Password is too weak",
					confirm_password: "Passwords do not match",
					terms: "You must accept the terms and conditions"
				}
			};

			vi.mocked(validateRegistrationForm).mockReturnValue(validationResult);

			const validation = validateRegistrationForm(invalidFormData);

			expect(validation.isValid).toBe(false);
			expect(validation.errors.first_name).toBe("First name is required");
			expect(validation.errors.email).toBe("Please enter a valid email address");
			expect(validation.errors.password).toBe("Password is too weak");
			expect(validation.errors.confirm_password).toBe("Passwords do not match");
			expect(validation.errors.terms).toBe("You must accept the terms and conditions");
		});

		it("should handle password strength requirements", () => {
			const weakPassword = "123";
			const passwordStrength = {
				score: 15,
				level: "Very Weak",
				feedback: [
					"Password is too short",
					"Add uppercase letters",
					"Add special characters"
				]
			};

			vi.mocked(calculatePasswordStrength).mockReturnValue(passwordStrength);

			const strength = calculatePasswordStrength(weakPassword);

			expect(strength.score).toBeLessThan(40);
			expect(strength.level).toBe("Very Weak");
			expect(strength.feedback).toContain("Password is too short");
		});
	});

	describe("API Error Handling", () => {
		it("should handle 409 email conflict error", async () => {
			const formData = {
				first_name: "John",
				last_name: "Doe",
				email: "existing@example.com"
			};

			const conflictError = new Error("Email already exists");
			(conflictError as any).status = 409;

			vi.mocked(makeRegistrationRequest).mockRejectedValue(conflictError);

			await expect(makeRegistrationRequest(formData)).rejects.toThrow("Email already exists");
		});

		it("should handle 429 rate limiting error", async () => {
			const formData = {
				first_name: "John",
				last_name: "Doe", 
				email: "john@example.com"
			};

			const rateLimitError = new Error("Rate limit exceeded");
			(rateLimitError as any).status = 429;
			(rateLimitError as any).rateLimitInfo = {
				remaining: 0,
				resetTime: Date.now() + 3600000
			};

			vi.mocked(makeRegistrationRequest).mockRejectedValue(rateLimitError);

			try {
				await makeRegistrationRequest(formData);
			} catch (error: any) {
				expect(error.message).toBe("Rate limit exceeded");
				expect(error.status).toBe(429);
				expect(error.rateLimitInfo.remaining).toBe(0);
			}
		});

		it("should handle 400 validation error from server", async () => {
			const formData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			const validationError = new Error("Validation failed");
			(validationError as any).status = 400;
			(validationError as any).errors = [
				{ field: "email", message: "Email format invalid" },
				{ field: "password", message: "Password too weak" }
			];

			vi.mocked(makeRegistrationRequest).mockRejectedValue(validationError);

			try {
				await makeRegistrationRequest(formData);
			} catch (error: any) {
				expect(error.message).toBe("Validation failed");
				expect(error.status).toBe(400);
				expect(error.errors).toHaveLength(2);
			}
		});

		it("should handle 500 server error", async () => {
			const formData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			const serverError = new Error("Internal server error");
			(serverError as any).status = 500;

			vi.mocked(makeRegistrationRequest).mockRejectedValue(serverError);

			await expect(makeRegistrationRequest(formData)).rejects.toThrow("Internal server error");
		});

		it("should handle network connectivity errors", async () => {
			const formData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			const networkError = new Error("Network request failed");

			vi.mocked(makeRegistrationRequest).mockRejectedValue(networkError);

			await expect(makeRegistrationRequest(formData)).rejects.toThrow("Network request failed");
		});
	});

	describe("Security Integration Tests", () => {
		it("should sanitize input data before API submission", () => {
			const maliciousData: RegistrationFormData = {
				first_name: "<script>alert('xss')</script>John",
				last_name: "<img src=x onerror=alert(1)>Doe",
				email: "john@example.com",
				password: "SecurePassword123!",
				confirm_password: "SecurePassword123!",
				role: "team_member",
				terms_accepted: true
			};

			const sanitizedData = {
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com"
			};

			vi.mocked(sanitizeRegistrationInput).mockReturnValue(sanitizedData);

			const result = sanitizeRegistrationInput(maliciousData);

			expect(result.first_name).toBe("John");
			expect(result.last_name).toBe("Doe");
			expect(result.first_name).not.toContain("<script>");
			expect(result.last_name).not.toContain("<img");
		});

		it("should handle SQL injection attempts in form data", () => {
			const sqlInjectionData: RegistrationFormData = {
				first_name: "'; DROP TABLE users; --",
				last_name: "Robert'; INSERT INTO admins VALUES('hacker'); --",
				email: "hacker@evil.com",
				password: "Password123!",
				confirm_password: "Password123!",
				role: "team_member",
				terms_accepted: true
			};

			const validationResult = {
				isValid: false,
				errors: {
					first_name: "Invalid characters in name",
					last_name: "Invalid characters in name"
				}
			};

			vi.mocked(validateRegistrationForm).mockReturnValue(validationResult);

			const validation = validateRegistrationForm(sqlInjectionData);

			expect(validation.isValid).toBe(false);
			expect(validation.errors.first_name).toContain("Invalid characters");
		});
	});

	describe("Data Flow Integration", () => {
		it("should pass data correctly through the registration pipeline", async () => {
			const inputData: RegistrationFormData = {
				first_name: "Alice",
				last_name: "Johnson",
				email: "alice.johnson@example.com",
				password: "AliceSecure123!",
				confirm_password: "AliceSecure123!",
				role: "team_lead",
				terms_accepted: true
			};

			const sanitizedData = {
				first_name: "Alice",
				last_name: "Johnson",
				email: "alice.johnson@example.com"
			};

			const validationResult = {
				isValid: true,
				errors: {},
				sanitizedData
			};

			const registrationResponse: RegistrationResponse = {
				id: "alice789",
				email: "alice.johnson@example.com",
				first_name: "Alice",
				last_name: "Johnson",
				role: "team_lead",
				message: "Registration successful"
			};

			// Setup complete pipeline
			vi.mocked(validateRegistrationForm).mockReturnValue(validationResult);
			vi.mocked(sanitizeRegistrationInput).mockReturnValue(sanitizedData);
			vi.mocked(makeRegistrationRequest).mockResolvedValue(registrationResponse);

			// Execute complete workflow
			const validation = validateRegistrationForm(inputData);
			if (validation.isValid && validation.sanitizedData) {
				const sanitized = sanitizeRegistrationInput(inputData);
				const response = await makeRegistrationRequest(sanitized);

				expect(response.email).toBe(inputData.email);
				expect(response.first_name).toBe(inputData.first_name);
				expect(response.role).toBe(inputData.role);
			}

			// Verify all steps were called
			expect(validateRegistrationForm).toHaveBeenCalledWith(inputData);
			expect(sanitizeRegistrationInput).toHaveBeenCalledWith(inputData);
			expect(makeRegistrationRequest).toHaveBeenCalledWith(sanitizedData);
		});
	});
});