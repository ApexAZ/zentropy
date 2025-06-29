/**
 * Unit tests for team form processing utilities
 * Tests the pure functions extracted from teams-type-safety.test.ts
 * Following hybrid testing approach - comprehensive testing of business logic
 */

import { describe, it, expect } from "vitest";
import {
	extractStringFromFormData,
	extractNumberFromFormData,
	validateTeamFormData,
	processTeamFormData,
	createMockFormDataGetter,
	handleFormValueFallback,
	createFormValidator,
	type FormFieldConfig
} from "../../utils/team-form-processing-utils";

describe("Team Form Processing Utilities", () => {
	describe("extractStringFromFormData", () => {
		it("should extract string value from FormData", () => {
			const formData = new FormData();
			formData.set("name", "Test Team");

			const result = extractStringFromFormData(formData, "name");

			expect(result).toBe("Test Team");
		});

		it("should trim whitespace from extracted strings", () => {
			const formData = new FormData();
			formData.set("name", "  Test Team  ");

			const result = extractStringFromFormData(formData, "name");

			expect(result).toBe("Test Team");
		});

		it("should return default value for null FormData values", () => {
			const formData = new FormData();
			// Don't set the key, so it returns null

			const result = extractStringFromFormData(formData, "nonexistent", "default");

			expect(result).toBe("default");
		});

		it("should return default value for empty string after trimming", () => {
			const formData = new FormData();
			formData.set("name", "   ");

			const result = extractStringFromFormData(formData, "name", "fallback");

			expect(result).toBe("fallback");
		});

		it("should handle File objects by returning default", () => {
			const formData = new FormData();
			const file = new File(["content"], "test.txt");
			formData.set("file", file);

			const result = extractStringFromFormData(formData, "file", "default");

			expect(result).toBe("default");
		});
	});

	describe("extractNumberFromFormData", () => {
		it("should extract and parse number value from FormData", () => {
			const formData = new FormData();
			formData.set("velocity", "25");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(25);
		});

		it("should trim whitespace before parsing", () => {
			const formData = new FormData();
			formData.set("velocity", "  42  ");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(42);
		});

		it("should return default value for null FormData values", () => {
			const formData = new FormData();

			const result = extractNumberFromFormData(formData, "nonexistent", 10);

			expect(result).toBe(10);
		});

		it("should return default value for non-numeric strings", () => {
			const formData = new FormData();
			formData.set("velocity", "not a number");

			const result = extractNumberFromFormData(formData, "velocity", 5);

			expect(result).toBe(5);
		});

		it("should handle empty string by returning default", () => {
			const formData = new FormData();
			formData.set("velocity", "");

			const result = extractNumberFromFormData(formData, "velocity", 15);

			expect(result).toBe(15);
		});

		it("should parse integer from decimal string", () => {
			const formData = new FormData();
			formData.set("velocity", "25.7");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(25); // parseInt truncates
		});

		it("should handle negative numbers", () => {
			const formData = new FormData();
			formData.set("velocity", "-10");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(-10);
		});
	});

	describe("createMockFormDataGetter", () => {
		it("should create function that returns values from data object", () => {
			const mockData = {
				name: "Test Team",
				description: "Test Description"
			};

			const getter = createMockFormDataGetter(mockData);

			expect(getter("name")).toBe("Test Team");
			expect(getter("description")).toBe("Test Description");
		});

		it("should return null for non-existent keys", () => {
			const mockData = { name: "Test Team" };

			const getter = createMockFormDataGetter(mockData);

			expect(getter("nonexistent")).toBeNull();
		});

		it("should handle empty data object", () => {
			const getter = createMockFormDataGetter({});

			expect(getter("anykey")).toBeNull();
		});
	});

	describe("validateTeamFormData", () => {
		it("should validate complete valid team form data", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("description", "A valid team description");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
			expect(result.sanitizedData).toEqual({
				name: "Valid Team",
				description: "A valid team description",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});

		it("should validate team data without optional description", () => {
			const formData = new FormData();
			formData.set("name", "Team Without Description");
			formData.set("velocity_baseline", "30");
			formData.set("sprint_length_days", "21");
			formData.set("working_days_per_week", "4");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.description).toBeUndefined();
		});

		it("should reject empty team name", () => {
			const formData = new FormData();
			formData.set("name", "");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
		});

		it("should reject team name that is too short", () => {
			const formData = new FormData();
			formData.set("name", "A");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be at least 2 characters");
		});

		it("should reject team name that is too long", () => {
			const formData = new FormData();
			formData.set("name", "A".repeat(101));
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be less than 100 characters");
		});

		it("should reject description that is too long", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("description", "A".repeat(501));
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Team description must be less than 500 characters");
		});

		it("should reject velocity baseline that is too low", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "0");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
		});

		it("should reject velocity baseline that is too high", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "201");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline cannot exceed 200 points");
		});

		it("should reject sprint length that is too short", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "0");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length must be at least 1 day");
		});

		it("should reject sprint length that is too long", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "31");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length cannot exceed 30 days");
		});

		it("should reject working days that is too low", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "0");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week must be at least 1");
		});

		it("should reject working days that is too high", () => {
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "8");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week cannot exceed 7");
		});

		it("should handle multiple validation errors", () => {
			const formData = new FormData();
			formData.set("name", "");
			formData.set("velocity_baseline", "0");
			formData.set("sprint_length_days", "0");
			formData.set("working_days_per_week", "0");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(Object.keys(result.errors)).toHaveLength(4);
			expect(result.errors.name).toBe("Team name is required");
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
			expect(result.errors.sprint_length_days).toBe("Sprint length must be at least 1 day");
			expect(result.errors.working_days_per_week).toBe("Working days per week must be at least 1");
		});
	});

	describe("processTeamFormData", () => {
		it("should return sanitized data for valid form", () => {
			const formData = new FormData();
			formData.set("name", "Process Team");
			formData.set("velocity_baseline", "20");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = processTeamFormData(formData);

			expect(result).toEqual({
				name: "Process Team",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});

		it("should return errors object for invalid form", () => {
			const formData = new FormData();
			formData.set("name", "");
			formData.set("velocity_baseline", "0");

			const result = processTeamFormData(formData);

			expect(result).toHaveProperty("errors");
			if ("errors" in result) {
				expect(result.errors.name).toBe("Team name is required");
				expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
			}
		});
	});

	describe("handleFormValueFallback", () => {
		it("should return trimmed string for valid string input", () => {
			const result = handleFormValueFallback("  test  ", "string", "default");

			expect(result).toBe("test");
		});

		it("should return default for null string input", () => {
			const result = handleFormValueFallback(null, "string", "default");

			expect(result).toBe("default");
		});

		it("should return default for empty string after trimming", () => {
			const result = handleFormValueFallback("   ", "string", "default");

			expect(result).toBe("default");
		});

		it("should parse valid number input", () => {
			const result = handleFormValueFallback("42", "number", 0);

			expect(result).toBe(42);
		});

		it("should return default for null number input", () => {
			const result = handleFormValueFallback(null, "number", 10);

			expect(result).toBe(10);
		});

		it("should return default for invalid number string", () => {
			const result = handleFormValueFallback("not a number", "number", 5);

			expect(result).toBe(5);
		});
	});

	describe("createFormValidator", () => {
		it("should create validator for string fields", () => {
			const fields: FormFieldConfig[] = [
				{ key: "name", type: "string", required: true },
				{ key: "description", type: "string", required: false }
			];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.set("name", "Test Team");
			formData.set("description", "Test Description");

			const result = validator(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.name).toBe("Test Team");
			expect(result.sanitizedData?.description).toBe("Test Description");
		});

		it("should create validator for number fields with min/max", () => {
			const fields: FormFieldConfig[] = [
				{ key: "velocity_baseline", type: "number", required: true, min: 1, max: 100 }
			];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.set("velocity_baseline", "25");

			const result = validator(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.velocity_baseline).toBe(25);
		});

		it("should validate required string fields", () => {
			const fields: FormFieldConfig[] = [{ key: "name", type: "string", required: true }];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			// Don't set name field

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("name is required");
		});

		it("should validate number field minimums", () => {
			const fields: FormFieldConfig[] = [{ key: "velocity_baseline", type: "number", required: true, min: 10 }];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.set("velocity_baseline", "5");

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("velocity_baseline must be at least 10");
		});

		it("should validate number field maximums", () => {
			const fields: FormFieldConfig[] = [{ key: "velocity_baseline", type: "number", required: true, max: 50 }];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.set("velocity_baseline", "75");

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("velocity_baseline cannot exceed 50");
		});

		it("should use default values for missing fields", () => {
			const fields: FormFieldConfig[] = [
				{ key: "name", type: "string", required: false, defaultValue: "Default Team" },
				{ key: "velocity_baseline", type: "number", required: false, defaultValue: 20 }
			];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			// Don't set any fields

			const result = validator(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.name).toBe("Default Team");
			expect(result.sanitizedData?.velocity_baseline).toBe(20);
		});
	});
});
