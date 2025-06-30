/**
 * Tests for TypeScript type safety features in teams.ts frontend code
 * These tests ensure type assertions and casting work correctly
 * Following hybrid testing approach - form processing logic tested in utils
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	extractStringFromFormData,
	extractNumberFromFormData,
	validateTeamFormData,
	createMockFormDataGetter,
	type CreateTeamData
} from "../../utils/team-core";

// Type definitions matching teams.ts
interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at: string;
	updated_at: string;
}

interface ValidationError {
	message: string;
	field?: string;
	details?: string;
}

describe("Frontend TypeScript Type Safety", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Team Interface Compliance", () => {
		it("should validate complete team object structure", () => {
			const validTeam: Team = {
				id: "1",
				name: "Frontend Team",
				description: "UI Development",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			};

			// TypeScript compilation validates this
			expect(validTeam.id).toBe("1");
			expect(validTeam.name).toBe("Frontend Team");
			expect(validTeam.description).toBe("UI Development");
			expect(typeof validTeam.velocity_baseline).toBe("number");
			expect(typeof validTeam.sprint_length_days).toBe("number");
			expect(typeof validTeam.working_days_per_week).toBe("number");
		});

		it("should validate team object with optional description undefined", () => {
			const teamWithoutDescription: Team = {
				id: "1",
				name: "Backend Team",
				velocity_baseline: 30,
				sprint_length_days: 21,
				working_days_per_week: 4,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			};

			expect(teamWithoutDescription.description).toBeUndefined();
			expect(teamWithoutDescription.name).toBe("Backend Team");
		});

		it("should validate team object without description property", () => {
			const teamWithDescriptionProperty = {
				id: "1",
				name: "DevOps Team",
				description: "Infrastructure",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			};
			const { description, ...teamWithoutDescriptionProperty } = teamWithDescriptionProperty;

			// This should still be a valid Team due to optional description
			const team = teamWithoutDescriptionProperty as Team;
			// Verify description was removed
			expect(description).toBe("Infrastructure");
			expect(team.name).toBe("DevOps Team");
			expect(team.description).toBeUndefined();
		});
	});

	describe("CreateTeamData Interface Compliance", () => {
		it("should validate complete create team data", () => {
			const createData: CreateTeamData = {
				name: "New Team",
				description: "A new team",
				velocity_baseline: 15,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			expect(createData.name).toBe("New Team");
			expect(createData.description).toBe("A new team");
			expect(typeof createData.velocity_baseline).toBe("number");
		});

		it("should validate create team data with optional description", () => {
			const createDataMinimal: CreateTeamData = {
				name: "Minimal Team",
				velocity_baseline: 0,
				sprint_length_days: 7,
				working_days_per_week: 3
			};

			expect(createDataMinimal.name).toBe("Minimal Team");
			expect(createDataMinimal.description).toBeUndefined();
		});

		it("should validate create team data with undefined description", () => {
			const createDataWithUndefined: CreateTeamData = {
				name: "Team with Undefined",
				velocity_baseline: 25,
				sprint_length_days: 28,
				working_days_per_week: 6
			};

			expect(createDataWithUndefined.description).toBeUndefined();
		});
	});

	describe("ValidationError Interface Compliance", () => {
		it("should validate complete validation error", () => {
			const validationError: ValidationError = {
				message: "Validation failed",
				field: "name",
				details: "Name is required"
			};

			expect(validationError.message).toBe("Validation failed");
			expect(validationError.field).toBe("name");
			expect(validationError.details).toBe("Name is required");
		});

		it("should validate validation error with only message", () => {
			const minimalError: ValidationError = {
				message: "Something went wrong"
			};

			expect(minimalError.message).toBe("Something went wrong");
			expect(minimalError.field).toBeUndefined();
			expect(minimalError.details).toBeUndefined();
		});

		it("should validate validation error with optional fields undefined", () => {
			const errorWithUndefined: ValidationError = {
				message: "Error occurred"
			};

			expect(errorWithUndefined.message).toBe("Error occurred");
			expect(errorWithUndefined.field).toBeUndefined();
			expect(errorWithUndefined.details).toBeUndefined();
		});
	});

	describe("Type Casting Safety", () => {
		it("should handle API response casting for Team array", () => {
			const mockApiResponse = [
				{
					id: "1",
					name: "Team 1",
					velocity_baseline: 20,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z"
				},
				{
					id: "2",
					name: "Team 2",
					description: "Second team",
					velocity_baseline: 25,
					sprint_length_days: 21,
					working_days_per_week: 4,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z"
				}
			];

			// Simulate API response casting
			const teams = mockApiResponse as Team[];

			expect(Array.isArray(teams)).toBe(true);
			expect(teams).toHaveLength(2);
			expect(teams[0]?.name).toBe("Team 1");
			expect(teams[1]?.description).toBe("Second team");
		});

		it("should handle API response casting for single Team", () => {
			const mockApiResponse = {
				id: "1",
				name: "Single Team",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			};

			// Simulate API response casting
			const team = mockApiResponse as Team;

			expect(team.id).toBe("1");
			expect(team.name).toBe("Single Team");
			expect(team.velocity_baseline).toBe(30);
		});

		it("should handle ValidationError response casting", () => {
			const mockErrorResponse = {
				message: "Validation failed",
				field: "name",
				details: "Name is too short"
			};

			// Simulate error response casting
			const error = mockErrorResponse as ValidationError;

			expect(error.message).toBe("Validation failed");
			expect(error.field).toBe("name");
			expect(error.details).toBe("Name is too short");
		});
	});

	describe("Form Data Integration with Utilities", () => {
		it("should integrate with extractStringFromFormData utility", () => {
			// Integration test - business logic tested in team-form-processing-utils.test.ts
			const formData = new FormData();
			formData.set("name", "Test Team");
			formData.set("description", "Test Description");

			const name = extractStringFromFormData(formData, "name");
			const description = extractStringFromFormData(formData, "description");

			expect(name).toBe("Test Team");
			expect(description).toBe("Test Description");
		});

		it("should integrate with extractNumberFromFormData utility", () => {
			// Integration test - business logic tested in team-form-processing-utils.test.ts
			const formData = new FormData();
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const velocityBaseline = extractNumberFromFormData(formData, "velocity_baseline");
			const sprintLength = extractNumberFromFormData(formData, "sprint_length_days");
			const workingDays = extractNumberFromFormData(formData, "working_days_per_week");

			expect(velocityBaseline).toBe(25);
			expect(sprintLength).toBe(14);
			expect(workingDays).toBe(5);
		});

		it("should integrate with validateTeamFormData utility", () => {
			// Integration test - validation logic tested in team-form-processing-utils.test.ts
			const formData = new FormData();
			formData.set("name", "Valid Team");
			formData.set("velocity_baseline", "25");
			formData.set("sprint_length_days", "14");
			formData.set("working_days_per_week", "5");

			const result = validateTeamFormData(formData);

			expect(result.isValid).toBe(true);
			expect(result.sanitizedData?.name).toBe("Valid Team");
		});

		it("should integrate with createMockFormDataGetter for testing", () => {
			// Integration test - testing utility functionality
			const mockGetter = createMockFormDataGetter({
				name: "Test Team",
				velocity_baseline: "25"
			});

			expect(mockGetter("name")).toBe("Test Team");
			expect(mockGetter("velocity_baseline")).toBe("25");
			expect(mockGetter("nonexistent")).toBeNull();
		});
	});

	describe("Error Type Guards", () => {
		it("should properly identify Error instances", () => {
			const jsError = new Error("JavaScript Error");
			const customError = { message: "Custom error object" };
			const stringError = "String error";

			// Test error type guards
			expect(jsError instanceof Error).toBe(true);
			expect((customError as unknown as object) instanceof Error).toBe(false);
			expect((stringError as unknown as object) instanceof Error).toBe(false);

			// Test error message extraction
			const errorMessage1 = jsError instanceof Error ? jsError.message : "Unknown error";
			const errorMessage2 =
				(customError as unknown as object) instanceof Error
					? (customError as unknown as Error).message
					: "Unknown error";
			const errorMessage3 =
				(stringError as unknown as object) instanceof Error
					? (stringError as unknown as Error).message
					: "Unknown error";

			expect(errorMessage1).toBe("JavaScript Error");
			expect(errorMessage2).toBe("Unknown error");
			expect(errorMessage3).toBe("Unknown error");
		});
	});

	describe("Nullish Coalescing vs Logical OR", () => {
		it("should demonstrate nullish coalescing (??) behavior", () => {
			const nullValue = null;
			const undefinedValue = undefined;
			const emptyString = "";
			const zeroValue = 0;
			const falseValue = false;

			// Nullish coalescing (??) - only null and undefined trigger fallback
			expect(nullValue ?? "fallback").toBe("fallback");
			expect(undefinedValue ?? "fallback").toBe("fallback");
			expect(emptyString ?? "fallback").toBe(""); // Empty string is NOT nullish
			expect(zeroValue ?? "fallback").toBe(0); // Zero is NOT nullish
			expect(falseValue ?? "fallback").toBe(false); // False is NOT nullish
		});

		it("should demonstrate logical OR (||) behavior", () => {
			const nullValue = null;
			const undefinedValue = undefined;
			const emptyString = "";
			const zeroValue = 0;
			const falseValue = false;

			// Logical OR (||) - all falsy values trigger fallback
			expect(nullValue ?? "fallback").toBe("fallback");
			expect(undefinedValue ?? "fallback").toBe("fallback");
			expect(emptyString || "fallback").toBe("fallback"); // Empty string IS falsy
			expect(zeroValue || "fallback").toBe("fallback"); // Zero IS falsy
			expect(falseValue || "fallback").toBe("fallback"); // False IS falsy
		});
	});
});
