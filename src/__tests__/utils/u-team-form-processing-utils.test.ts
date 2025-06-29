import { describe, it, expect } from "vitest";
import {
	extractStringFromFormData,
	extractNumberFromFormData,
	createMockFormDataGetter,
	validateTeamFormData,
	processTeamFormData,
	createFormValidator,
	handleFormValueFallback,
	type FormFieldConfig
} from "../../utils/team-form-processing-utils";

describe("Team Form Processing Utilities", () => {
	describe("extractStringFromFormData", () => {
		it("should extract valid string values", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");

			const result = extractStringFromFormData(formData, "name");

			expect(result).toBe("Test Team");
		});

		it("should trim whitespace from extracted values", () => {
			const formData = new FormData();
			formData.append("name", "  Test Team  ");

			const result = extractStringFromFormData(formData, "name");

			expect(result).toBe("Test Team");
		});

		it("should return default value for missing keys", () => {
			const formData = new FormData();

			const result = extractStringFromFormData(formData, "missing", "default");

			expect(result).toBe("default");
		});

		it("should return default value for empty strings", () => {
			const formData = new FormData();
			formData.append("name", "");

			const result = extractStringFromFormData(formData, "name", "default");

			expect(result).toBe("default");
		});

		it("should return default value for whitespace-only strings", () => {
			const formData = new FormData();
			formData.append("name", "   ");

			const result = extractStringFromFormData(formData, "name", "default");

			expect(result).toBe("default");
		});

		it("should handle non-string form values", () => {
			const formData = new FormData();
			const file = new File(["content"], "test.txt");
			formData.append("file", file);

			const result = extractStringFromFormData(formData, "file", "default");

			expect(result).toBe("default");
		});
	});

	describe("extractNumberFromFormData", () => {
		it("should extract valid number values", () => {
			const formData = new FormData();
			formData.append("velocity", "25");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(25);
		});

		it("should handle negative numbers", () => {
			const formData = new FormData();
			formData.append("value", "-10");

			const result = extractNumberFromFormData(formData, "value");

			expect(result).toBe(-10);
		});

		it("should return default value for missing keys", () => {
			const formData = new FormData();

			const result = extractNumberFromFormData(formData, "missing", 42);

			expect(result).toBe(42);
		});

		it("should return default value for invalid numbers", () => {
			const formData = new FormData();
			formData.append("velocity", "not a number");

			const result = extractNumberFromFormData(formData, "velocity", 10);

			expect(result).toBe(10);
		});

		it("should handle floating point strings by converting to integer", () => {
			const formData = new FormData();
			formData.append("velocity", "25.7");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(25);
		});

		it("should trim whitespace before parsing", () => {
			const formData = new FormData();
			formData.append("velocity", "  25  ");

			const result = extractNumberFromFormData(formData, "velocity");

			expect(result).toBe(25);
		});

		it("should handle empty strings", () => {
			const formData = new FormData();
			formData.append("velocity", "");

			const result = extractNumberFromFormData(formData, "velocity", 15);

			expect(result).toBe(15);
		});
	});

	describe("createMockFormDataGetter", () => {
		it("should return values for existing keys", () => {
			const mockData = { name: "Test Team", velocity: "25" };
			const getter = createMockFormDataGetter(mockData);

			expect(getter("name")).toBe("Test Team");
			expect(getter("velocity")).toBe("25");
		});

		it("should return null for missing keys", () => {
			const mockData = { name: "Test Team" };
			const getter = createMockFormDataGetter(mockData);

			expect(getter("missing")).toBeNull();
		});

		it("should handle empty mock data", () => {
			const getter = createMockFormDataGetter({});

			expect(getter("anything")).toBeNull();
		});
	});

	describe("validateTeamFormData", () => {
		it("should validate correct team form data", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("description", "A test team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
			expect(result.sanitizedData).toEqual({
				name: "Test Team",
				description: "A test team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});

		it("should require team name", () => {
			const formData = new FormData();
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
		});

		it("should enforce minimum team name length", () => {
			const formData = new FormData();
			formData.append("name", "A");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be at least 2 characters");
		});

		it("should enforce maximum team name length", () => {
			const formData = new FormData();
			formData.append("name", "A".repeat(101));
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be less than 100 characters");
		});

		it("should enforce maximum description length", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("description", "A".repeat(501));
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Team description must be less than 500 characters");
		});

		it("should require positive velocity baseline", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "0");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
		});

		it("should enforce maximum velocity baseline", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "201");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline cannot exceed 200 points");
		});

		it("should require minimum sprint length", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "0");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length must be at least 1 day");
		});

		it("should enforce maximum sprint length", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "31");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length cannot exceed 30 days");
		});

		it("should require minimum working days per week", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "0");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week must be at least 1");
		});

		it("should enforce maximum working days per week", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "8");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week cannot exceed 7");
		});

		it("should accumulate multiple validation errors", () => {
			const formData = new FormData();
			formData.append("name", "A");
			formData.append("velocity_baseline", "0");
			formData.append("sprint_length_days", "0");
			formData.append("working_days_per_week", "0");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(Object.keys(result.errors)).toHaveLength(4);
			expect(result.errors.name).toBe("Team name must be at least 2 characters");
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
			expect(result.errors.sprint_length_days).toBe("Sprint length must be at least 1 day");
			expect(result.errors.working_days_per_week).toBe("Working days per week must be at least 1");
		});

		it("should handle optional description field", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData).toEqual({
				name: "Test Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});
	});

	describe("processTeamFormData", () => {
		it("should return sanitized data for valid form", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = processTeamFormData(formData);

			expect(result).toEqual({
				name: "Test Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});

		it("should return errors for invalid form", () => {
			const formData = new FormData();
			formData.append("velocity_baseline", "25");

			const result = processTeamFormData(formData);

			expect(result).toHaveProperty("errors");
			const errorResult = result as { errors: Record<string, string> };
			expect(errorResult.errors.name).toBe("Team name is required");
		});
	});

	describe("createFormValidator", () => {
		it("should create validator from field configuration", () => {
			const fields: FormFieldConfig[] = [
				{ key: "name", type: "string", required: true },
				{ key: "count", type: "number", required: true, min: 1, max: 100 }
			];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.append("name", "Test");
			formData.append("count", "50");

			const result = validator(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData).toEqual({
				name: "Test",
				count: 50
			});
		});

		it("should validate required string fields", () => {
			const fields: FormFieldConfig[] = [{ key: "name", type: "string", required: true }];

			const validator = createFormValidator(fields);
			const formData = new FormData();

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("name is required");
		});

		it("should validate required number fields", () => {
			const fields: FormFieldConfig[] = [{ key: "count", type: "number", required: true }];

			const validator = createFormValidator(fields);
			const formData = new FormData();

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.count).toBe("count is required");
		});

		it("should validate minimum values for number fields", () => {
			const fields: FormFieldConfig[] = [{ key: "count", type: "number", required: true, min: 10 }];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.append("count", "5");

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.count).toBe("count must be at least 10");
		});

		it("should validate maximum values for number fields", () => {
			const fields: FormFieldConfig[] = [{ key: "count", type: "number", required: true, max: 100 }];

			const validator = createFormValidator(fields);
			const formData = new FormData();
			formData.append("count", "150");

			const result = validator(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.count).toBe("count cannot exceed 100");
		});

		it("should use default values for optional fields", () => {
			const fields: FormFieldConfig[] = [
				{ key: "name", type: "string", required: false, defaultValue: "Default Name" },
				{ key: "count", type: "number", required: false, defaultValue: 42 }
			];

			const validator = createFormValidator(fields);
			const formData = new FormData();

			const result = validator(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData).toEqual({
				name: "Default Name",
				count: 42
			});
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

		it("should return default for empty string input", () => {
			const result = handleFormValueFallback("", "string", "default");

			expect(result).toBe("default");
		});

		it("should parse valid number input", () => {
			const result = handleFormValueFallback("25", "number", 0);

			expect(result).toBe(25);
		});

		it("should return default for invalid number input", () => {
			const result = handleFormValueFallback("not a number", "number", 42);

			expect(result).toBe(42);
		});

		it("should return default for null number input", () => {
			const result = handleFormValueFallback(null, "number", 100);

			expect(result).toBe(100);
		});

		it("should handle trimmed numeric strings", () => {
			const result = handleFormValueFallback("  25  ", "number", 0);

			expect(result).toBe(25);
		});
	});

	describe("Edge Cases and Type Safety", () => {
		it("should handle FormData with File objects gracefully", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("file", new File(["content"], "test.txt"));

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
		});

		it("should handle extremely large numbers gracefully", () => {
			const formData = new FormData();
			formData.append("name", "Test Team");
			formData.append("velocity_baseline", "999999999999999999999");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline cannot exceed 200 points");
		});

		it("should handle special characters in form data", () => {
			const formData = new FormData();
			formData.append("name", "Test Team @#$%");
			formData.append("velocity_baseline", "25");
			formData.append("sprint_length_days", "14");
			formData.append("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.name).toBe("Test Team @#$%");
		});
	});
});
