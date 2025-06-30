/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	processProfileForDisplay,
	validateProfileUpdate,
	calculateProfileCompleteness,
	generateSecurityRecommendations,
	formatProfileForSubmission,
	hasProfileChanged,
	validateProfileAccess,
	type UserProfile,
	type ProfileFormData
} from "../../utils/profile-core";

// Mock the dependencies
vi.mock("../../utils/validation-core", () => ({
	sanitizeInput: vi.fn((input: string) => {
		if (!input || typeof input !== "string") {
			return "";
		}
		return input
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
			.replace(/<[^>]*>/g, "") // Remove all HTML tags
			.replace(/javascript:/gi, "") // Remove javascript: protocol
			.replace(/vbscript:/gi, "") // Remove vbscript: protocol
			.replace(/data:/gi, "") // Remove data: protocol
			.trim();
	})
}));

vi.mock("../../utils/ui-core", () => ({
	validateProfileFormData: vi.fn(),
	createProfileDisplayData: vi.fn()
}));

import { validateProfileFormData, createProfileDisplayData } from "../../utils/ui-core";

describe("Profile Business Logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("processProfileForDisplay", () => {
		it("should successfully process valid profile data", () => {
			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const mockDisplayData = {
				fullName: "John Doe",
				roleText: "Team Member",
				roleBadgeClass: "team-member",
				lastLoginFormatted: "Never"
			};

			vi.mocked(createProfileDisplayData).mockReturnValue(mockDisplayData);

			const result = processProfileForDisplay(userProfile);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(mockDisplayData);
			expect(result.error).toBeUndefined();
			expect(createProfileDisplayData).toHaveBeenCalledWith(userProfile);
		});

		it("should handle missing required fields", () => {
			const invalidProfile = {
				id: "",
				email: "",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const,
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const result = processProfileForDisplay(invalidProfile);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Invalid profile data: missing required fields");
			expect(result.data).toBeUndefined();
		});

		it("should handle processing errors gracefully", () => {
			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			vi.mocked(createProfileDisplayData).mockImplementation(() => {
				throw new Error("Processing failed");
			});

			const result = processProfileForDisplay(userProfile);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Processing failed");
		});
	});

	describe("validateProfileUpdate", () => {
		it("should validate correct profile update data", () => {
			const formData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: true,
				errors: {},
				sanitizedData: formData
			});

			const result = validateProfileUpdate(formData);

			expect(result.success).toBe(true);
			expect(result.validationErrors).toBeUndefined();
			expect(validateProfileFormData).toHaveBeenCalledWith(formData);
		});

		it("should reject same first and last names", () => {
			const formData: ProfileFormData = {
				first_name: "John",
				last_name: "John",
				email: "john.john@example.com"
			};

			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: true,
				errors: {},
				sanitizedData: formData
			});

			const result = validateProfileUpdate(formData);

			expect(result.success).toBe(false);
			expect(result.validationErrors).toEqual({
				last_name: "Last name should be different from first name"
			});
		});

		it("should reject invalid email domains", () => {
			const formData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "invalid-email"
			};

			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: true,
				errors: {},
				sanitizedData: formData
			});

			const result = validateProfileUpdate(formData);

			expect(result.success).toBe(false);
			expect(result.validationErrors).toEqual({
				email: "Please enter a valid email address"
			});
		});

		it("should return validation errors from utility function", () => {
			const formData: ProfileFormData = {
				first_name: "",
				last_name: "Doe",
				email: "invalid"
			};

			vi.mocked(validateProfileFormData).mockReturnValue({
				isValid: false,
				errors: {
					first_name: "First name is required",
					email: "Please enter a valid email address"
				}
			});

			const result = validateProfileUpdate(formData);

			expect(result.success).toBe(false);
			expect(result.validationErrors).toEqual({
				first_name: "First name is required",
				email: "Please enter a valid email address"
			});
		});

		it("should handle validation errors gracefully", () => {
			const formData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			vi.mocked(validateProfileFormData).mockImplementation(() => {
				throw new Error("Validation service error");
			});

			const result = validateProfileUpdate(formData);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Validation service error");
		});
	});

	describe("calculateProfileCompleteness", () => {
		it("should calculate 100% for complete profile", () => {
			const completeProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const completeness = calculateProfileCompleteness(completeProfile);

			expect(completeness).toBe(100);
		});

		it("should calculate 75% for profile missing one field", () => {
			const partialProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "", // Missing last name
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const completeness = calculateProfileCompleteness(partialProfile);

			expect(completeness).toBe(75);
		});

		it("should calculate 0% for empty profile", () => {
			const emptyProfile: UserProfile = {
				id: "user123",
				email: "",
				first_name: "",
				last_name: "",
				role: "team_member", // This counts as filled
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const completeness = calculateProfileCompleteness(emptyProfile);

			expect(completeness).toBe(25); // Only role is filled
		});

		it("should handle whitespace-only fields as empty", () => {
			const whitespaceProfile: UserProfile = {
				id: "user123",
				email: "   ", // Whitespace only
				first_name: "  ", // Whitespace only
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const completeness = calculateProfileCompleteness(whitespaceProfile);

			expect(completeness).toBe(50); // Only last_name and role are filled
		});
	});

	describe("generateSecurityRecommendations", () => {
		it("should recommend login for users who never logged in", () => {
			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				last_login_at: null,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const recommendations = generateSecurityRecommendations(userProfile);

			expect(recommendations).toContain("Consider logging in regularly to keep your account secure");
		});

		it("should recommend password update for old logins", () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				last_login_at: oldDate.toISOString(),
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const recommendations = generateSecurityRecommendations(userProfile);

			expect(recommendations).toContain(
				"It's been a while since your last login. Consider updating your password"
			);
		});

		it("should recommend better names for matching first/last names", () => {
			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "John", // Same as first name
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const recommendations = generateSecurityRecommendations(userProfile);

			expect(recommendations).toContain("Consider using your full legal name for better account verification");
		});

		it("should recommend work email for personal email domains", () => {
			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@gmail.com", // Personal email
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				is_active: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const recommendations = generateSecurityRecommendations(userProfile);

			expect(recommendations).toContain("Consider using your work email for better team integration");
		});

		it("should return empty array for optimal profile", () => {
			const recentDate = new Date();
			recentDate.setDate(recentDate.getDate() - 1); // Yesterday

			const userProfile: UserProfile = {
				id: "user123",
				email: "john.doe@company.com", // Work email
				first_name: "John",
				last_name: "Doe", // Different from first name
				role: "team_member",
				is_active: true,
				last_login_at: recentDate.toISOString(), // Recent login
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			const recommendations = generateSecurityRecommendations(userProfile);

			expect(recommendations).toHaveLength(0);
		});
	});

	describe("formatProfileForSubmission", () => {
		it("should format profile data correctly", () => {
			const formData: ProfileFormData = {
				first_name: "  John  ",
				last_name: "  Doe  ",
				email: "  John.Doe@EXAMPLE.COM  "
			};

			const result = formatProfileForSubmission(formData);

			expect(result).toEqual({
				first_name: "John", // Sanitized and trimmed
				last_name: "Doe", // Sanitized and trimmed
				email: "john.doe@example.com" // Trimmed and lowercased
			});
		});

		it("should sanitize XSS attempts", () => {
			const formData: ProfileFormData = {
				first_name: "<script>alert('xss')</script>John",
				last_name: "<img src=x onerror=alert(1)>Doe",
				email: "john.doe@example.com"
			};

			const result = formatProfileForSubmission(formData);

			expect(result.first_name).toBe("John"); // Script tags and HTML removed, trimmed
			expect(result.last_name).toBe("Doe"); // HTML tags removed, trimmed
			expect(result.email).toBe("john.doe@example.com");
		});
	});

	describe("hasProfileChanged", () => {
		const originalProfile: UserProfile = {
			id: "user123",
			email: "john.doe@example.com",
			first_name: "John",
			last_name: "Doe",
			role: "team_member",
			is_active: true,
			created_at: "2024-01-01T00:00:00.000Z",
			updated_at: "2024-01-01T00:00:00.000Z"
		};

		it("should return false when no changes made", () => {
			const updatedData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const result = hasProfileChanged(originalProfile, updatedData);

			expect(result).toBe(false);
		});

		it("should return true when first name changed", () => {
			const updatedData: ProfileFormData = {
				first_name: "Johnny",
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const result = hasProfileChanged(originalProfile, updatedData);

			expect(result).toBe(true);
		});

		it("should return true when email changed", () => {
			const updatedData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "johnny.doe@example.com"
			};

			const result = hasProfileChanged(originalProfile, updatedData);

			expect(result).toBe(true);
		});

		it("should handle whitespace differences correctly", () => {
			const updatedData: ProfileFormData = {
				first_name: "  John  ", // Extra whitespace
				last_name: "Doe",
				email: "john.doe@example.com"
			};

			const result = hasProfileChanged(originalProfile, updatedData);

			expect(result).toBe(false); // Whitespace is trimmed in comparison
		});

		it("should handle email case differences", () => {
			const updatedData: ProfileFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "John.Doe@EXAMPLE.COM" // Different case
			};

			const result = hasProfileChanged(originalProfile, updatedData);

			expect(result).toBe(false); // Email is lowercased in comparison
		});
	});

	describe("validateProfileAccess", () => {
		it("should allow users to edit their own profile", () => {
			const result = validateProfileAccess("user123", "user123", "team_member");

			expect(result).toBe(true);
		});

		it("should allow team leads to edit any profile", () => {
			const result = validateProfileAccess("lead123", "user456", "team_lead");

			expect(result).toBe(true);
		});

		it("should deny team members from editing other profiles", () => {
			const result = validateProfileAccess("user123", "user456", "team_member");

			expect(result).toBe(false);
		});

		it("should handle edge case of same user ID for team lead", () => {
			const result = validateProfileAccess("user123", "user123", "team_lead");

			expect(result).toBe(true);
		});
	});
});
