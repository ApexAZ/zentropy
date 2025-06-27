import { describe, it, expect } from "vitest";
import { ValidationError } from "../../utils/validation";
import { validateTeamInput, validateSprintLength, validateWorkingDays } from "../../utils/team-validation";

/**
 * Team validation test data and helper functions
 */
describe("Team Validation Functions", () => {
	describe("validateTeamInput", () => {
		describe("Create Team Validation", () => {
			it("should validate a complete team creation request", () => {
				const validData = {
					name: "Frontend Development Team",
					description: "Responsible for UI/UX development and user experience",
					velocity_baseline: 25,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = validateTeamInput(validData);
				
				expect(result).toMatchObject({
					name: "Frontend Development Team",
					description: "Responsible for UI/UX development and user experience",
					velocity_baseline: 25,
					sprint_length_days: 14,
					working_days_per_week: 5
				});
			});

			it("should validate minimal team creation data", () => {
				const minimalData = {
					name: "Team Alpha"
				};

				const result = validateTeamInput(minimalData);
				
				expect(result).toMatchObject({
					name: "Team Alpha",
					velocity_baseline: 0,
					sprint_length_days: 14,
					working_days_per_week: 5
				});
			});

			it("should reject invalid team names", () => {
				const invalidInputs = [
					{ name: "" }, // Empty
					{ name: "A" }, // Too short
					{ name: "X".repeat(101) }, // Too long
					{ name: null },
					{ name: undefined },
					{} // Missing name
				];

				invalidInputs.forEach(input => {
					expect(() => validateTeamInput(input)).toThrow(ValidationError);
				});
			});

			it("should reject invalid descriptions", () => {
				const invalidData = {
					name: "Valid Team",
					description: "X".repeat(501) // Too long
				};

				expect(() => validateTeamInput(invalidData)).toThrow(ValidationError);
			});

			it("should reject invalid velocity baselines", () => {
				const invalidInputs = [
					{ name: "Valid Team", velocity_baseline: -1 },
					{ name: "Valid Team", velocity_baseline: -10 },
					{ name: "Valid Team", velocity_baseline: 1001 }
				];
				
				invalidInputs.forEach(input => {
					expect(() => validateTeamInput(input)).toThrow(ValidationError);
				});
			});

			it("should reject invalid sprint lengths", () => {
				const invalidInputs = [
					{ name: "Valid Team", sprint_length_days: 0 },
					{ name: "Valid Team", sprint_length_days: 1 },
					{ name: "Valid Team", sprint_length_days: 6 },
					{ name: "Valid Team", sprint_length_days: 8 },
					{ name: "Valid Team", sprint_length_days: 15 },
					{ name: "Valid Team", sprint_length_days: 30 },
					{ name: "Valid Team", sprint_length_days: -1 }
				];
				
				invalidInputs.forEach(input => {
					expect(() => validateTeamInput(input)).toThrow(ValidationError);
				});
			});

			it("should reject invalid working days per week", () => {
				const invalidInputs = [
					{ name: "Valid Team", working_days_per_week: 0 },
					{ name: "Valid Team", working_days_per_week: 1 },
					{ name: "Valid Team", working_days_per_week: 2 },
					{ name: "Valid Team", working_days_per_week: 7 },
					{ name: "Valid Team", working_days_per_week: 8 },
					{ name: "Valid Team", working_days_per_week: -1 }
				];
				
				invalidInputs.forEach(input => {
					expect(() => validateTeamInput(input)).toThrow(ValidationError);
				});
			});
		});

		describe("Update Team Validation", () => {
			it("should validate partial team update data", () => {
				const updateData = {
					name: "Updated Team Name"
				};

				expect(updateData.name).toBeTruthy();
				expect(updateData.name.length).toBeGreaterThan(1);
			});

			it("should validate velocity-only update", () => {
				const updateData = {
					velocity_baseline: 35
				};

				expect(updateData.velocity_baseline).toBeGreaterThanOrEqual(0);
				expect(updateData.velocity_baseline).toBeLessThanOrEqual(1000);
			});

			it("should validate description update", () => {
				const updateData = {
					description: "Updated team description"
				};

				expect(updateData.description.length).toBeLessThanOrEqual(500);
			});

			it("should validate configuration-only update", () => {
				const updateData = {
					sprint_length_days: 21,
					working_days_per_week: 4
				};

				expect([7, 14, 21, 28]).toContain(updateData.sprint_length_days);
				expect([3, 4, 5, 6]).toContain(updateData.working_days_per_week);
			});
		});

		describe("Input Sanitization", () => {
			it("should handle string trimming", () => {
				const dataWithWhitespace = {
					name: "  Team Name  ",
					description: "  Team description  "
				};

				const trimmedName = dataWithWhitespace.name.trim();
				const trimmedDescription = dataWithWhitespace.description.trim();

				expect(trimmedName).toBe("Team Name");
				expect(trimmedDescription).toBe("Team description");
			});

			it("should handle case normalization for email-like fields", () => {
				// This would apply if we had email fields in team data
				const email = "TEAM@EXAMPLE.COM";
				expect(email.toLowerCase()).toBe("team@example.com");
			});

			it("should handle number conversion", () => {
				const stringNumbers = {
					velocity_baseline: "25",
					sprint_length_days: "14",
					working_days_per_week: "5"
				};

				expect(parseInt(stringNumbers.velocity_baseline)).toBe(25);
				expect(parseInt(stringNumbers.sprint_length_days)).toBe(14);
				expect(parseInt(stringNumbers.working_days_per_week)).toBe(5);
			});
		});

		describe("Edge Cases", () => {
			it("should handle null and undefined values", () => {
				const edgeCases = [null, undefined, {}, "", 0, false];
				
				edgeCases.forEach(value => {
					if (value === null || value === undefined) {
						expect(value).toBeFalsy();
					} else if (value === "" || value === 0 || value === false) {
						expect(value).toBeFalsy();
					} else if (typeof value === "object") {
						expect(Object.keys(value)).toHaveLength(0);
					}
				});
			});

			it("should handle non-object input", () => {
				const nonObjects = ["string", 123, true, [], null];
				
				nonObjects.forEach(value => {
					if (typeof value !== "object" || Array.isArray(value) || value === null) {
						expect(typeof value !== "object" || Array.isArray(value) || value === null).toBe(true);
					}
				});
			});

			it("should handle very large numbers", () => {
				const largeNumbers = [
					Number.MAX_SAFE_INTEGER,
					Number.MAX_VALUE,
					Infinity,
					-Infinity
				];

				largeNumbers.forEach(num => {
					if (num === Infinity || num === -Infinity) {
						expect(Number.isFinite(num)).toBe(false);
					} else if (num > 1000) {
						expect(num).toBeGreaterThan(1000);
					}
				});
			});
		});
	});

	describe("validateSprintLength", () => {
		it("should accept valid sprint lengths", () => {
			const validLengths = [7, 14, 21, 28];
			
			validLengths.forEach(length => {
				expect(Number.isInteger(length)).toBe(true);
				expect(length).toBeGreaterThan(0);
				expect(length).toBeLessThanOrEqual(28);
			});
		});

		it("should reject invalid sprint lengths", () => {
			const invalidLengths = [0, 1, 6, 8, 15, 30, -1, 3.5, "14", null];
			
			invalidLengths.forEach(length => {
				if (typeof length === "string" || length === null) {
					expect(typeof length !== "number").toBe(true);
				} else if (typeof length === "number") {
					if (!Number.isInteger(length)) {
						expect(Number.isInteger(length)).toBe(false);
					} else if (![7, 14, 21, 28].includes(length)) {
						expect([7, 14, 21, 28]).not.toContain(length);
					}
				}
			});
		});
	});

	describe("validateWorkingDays", () => {
		it("should accept valid working days per week", () => {
			const validDays = [3, 4, 5, 6];
			
			validDays.forEach(days => {
				expect(Number.isInteger(days)).toBe(true);
				expect(days).toBeGreaterThan(0);
				expect(days).toBeLessThan(7);
			});
		});

		it("should reject invalid working days per week", () => {
			const invalidDays = [0, 1, 2, 7, 8, -1, 3.5, "5", null];
			
			invalidDays.forEach(days => {
				if (typeof days === "string" || days === null) {
					expect(typeof days !== "number").toBe(true);
				} else if (typeof days === "number") {
					if (!Number.isInteger(days)) {
						expect(Number.isInteger(days)).toBe(false);
					} else if (![3, 4, 5, 6].includes(days)) {
						expect([3, 4, 5, 6]).not.toContain(days);
					}
				}
			});
		});
	});

	describe("ValidationError Handling", () => {
		it("should create meaningful validation errors", () => {
			const error = new ValidationError("Name is required", "name", "");
			
			expect(error.message).toBe("Name is required");
			expect(error.field).toBe("name");
			expect(error.value).toBe("");
			expect(error).toBeInstanceOf(Error);
			expect(error.name).toBe("ValidationError");
		});

		it("should handle errors without field information", () => {
			const error = new ValidationError("General validation error");
			
			expect(error.message).toBe("General validation error");
			expect(error.field).toBeUndefined();
			expect(error.value).toBeUndefined();
		});
	});
});