/**
 * Profile UI Utilities Tests
 * Following hybrid testing approach - testing pure functions extracted from profile.ts
 * TDD implementation with comprehensive edge case coverage for UI logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	formatProfileDates,
	getRoleBadgeClass,
	validateProfileFormData,
	createProfileDisplayData,
	formatUserName,
	type ProfileFormData
} from "../../utils/profile-ui-utils.js";

describe("Profile UI Utilities", () => {
	describe("formatProfileDates", () => {
		it("should return 'Never' for null input", () => {
			const result = formatProfileDates(null);
			expect(result).toBe("Never");
		});

		it("should return 'Never' for empty string", () => {
			const result = formatProfileDates("");
			expect(result).toBe("Never");
		});

		it("should return 'Invalid date' for invalid date string", () => {
			const result = formatProfileDates("invalid-date");
			expect(result).toBe("Invalid date");
		});

		it("should format valid ISO date string correctly", () => {
			const result = formatProfileDates("2024-01-15T10:30:00.000Z");
			expect(result).toContain("January 15, 2024");
		});

		it("should include relative time for recent dates", () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const result = formatProfileDates(yesterday.toISOString());

			expect(result).toContain("1 day ago");
		});

		it("should handle timezone differences correctly", () => {
			const utcDate = "2024-06-15T14:30:00.000Z";
			const result = formatProfileDates(utcDate);

			expect(result).toContain("June 15, 2024");
		});
	});

	describe("getRoleBadgeClass", () => {
		it("should return 'team-lead' class for team_lead role", () => {
			const result = getRoleBadgeClass("team_lead");
			expect(result).toBe("team-lead");
		});

		it("should return 'team-member' class for team_member role", () => {
			const result = getRoleBadgeClass("team_member");
			expect(result).toBe("team-member");
		});

		it("should handle undefined role gracefully", () => {
			const result = getRoleBadgeClass(undefined);
			expect(result).toBe("team-member"); // Default fallback
		});
	});

	describe("formatUserName", () => {
		it("should combine first and last name correctly", () => {
			const result = formatUserName("John", "Doe");
			expect(result).toBe("John Doe");
		});

		it("should handle missing last name", () => {
			const result = formatUserName("John", "");
			expect(result).toBe("John");
		});

		it("should handle missing first name", () => {
			const result = formatUserName("", "Doe");
			expect(result).toBe("Doe");
		});

		it("should handle both names missing", () => {
			const result = formatUserName("", "");
			expect(result).toBe("Unknown User");
		});

		it("should trim whitespace from names", () => {
			const result = formatUserName("  John  ", "  Doe  ");
			expect(result).toBe("John Doe");
		});
	});

	describe("validateProfileFormData", () => {
		let validFormData: ProfileFormData;

		beforeEach(() => {
			validFormData = {
				first_name: "John",
				last_name: "Doe",
				email: "john.doe@example.com"
			};
		});

		it("should validate correct form data", () => {
			const result = validateProfileFormData(validFormData);

			expect(result.isValid).toBe(true);
			expect(Object.keys(result.errors)).toHaveLength(0);
		});

		it("should reject missing first name", () => {
			const formData = { ...validFormData, first_name: "" };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toContain("required");
		});

		it("should reject missing last name", () => {
			const formData = { ...validFormData, last_name: "" };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.last_name).toContain("required");
		});

		it("should reject invalid email format", () => {
			const formData = { ...validFormData, email: "invalid-email" };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("valid email");
		});

		it("should reject first name too long", () => {
			const formData = { ...validFormData, first_name: "a".repeat(51) };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.first_name).toContain("50 characters");
		});

		it("should reject last name too long", () => {
			const formData = { ...validFormData, last_name: "a".repeat(51) };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.last_name).toContain("50 characters");
		});

		it("should validate email length limits", () => {
			const formData = { ...validFormData, email: "a".repeat(250) + "@example.com" };
			const result = validateProfileFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.email).toContain("255 characters");
		});

		it("should sanitize input fields", () => {
			const formData = {
				first_name: "<script>alert('xss')</script>John",
				last_name: "<img src=x onerror=alert(1)>Doe",
				email: "john.doe@example.com"
			};
			const result = validateProfileFormData(formData);

			// Should remove script tags but keep the name
			expect(result.sanitizedData?.first_name).toBe("John");
			expect(result.sanitizedData?.last_name).toBe("Doe");
		});
	});

	describe("createProfileDisplayData", () => {
		it("should create display data from user profile", () => {
			const userProfile = {
				id: "user-123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead" as const,
				is_active: true,
				last_login_at: "2024-01-15T10:30:00.000Z",
				created_at: "2024-01-01T12:00:00.000Z",
				updated_at: "2024-01-15T10:30:00.000Z"
			};

			const result = createProfileDisplayData(userProfile);

			expect(result.fullName).toBe("John Doe");
			expect(result.roleText).toBe("Team Lead");
			expect(result.roleBadgeClass).toBe("team-lead");
			expect(result.lastLoginFormatted).toContain("January 15, 2024");
			expect(result.createdDateFormatted).toContain("January 1, 2024");
			expect(result.updatedDateFormatted).toContain("January 15, 2024");
		});

		it("should handle missing optional fields", () => {
			const userProfile = {
				id: "user-123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe"
			};

			const result = createProfileDisplayData(userProfile);

			expect(result.fullName).toBe("John Doe");
			expect(result.roleText).toBe("Team Member");
			expect(result.roleBadgeClass).toBe("team-member");
			expect(result.lastLoginFormatted).toBe("Never");
		});

		it("should handle team_member role correctly", () => {
			const userProfile = {
				id: "user-123",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as const
			};

			const result = createProfileDisplayData(userProfile);

			expect(result.roleText).toBe("Team Member");
			expect(result.roleBadgeClass).toBe("team-member");
		});
	});
});
