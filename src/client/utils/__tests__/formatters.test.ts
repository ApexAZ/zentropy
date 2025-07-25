/**
 * Tests for formatters utility functions
 *
 * These tests ensure all formatting utilities work correctly with various inputs,
 * including edge cases and boundary conditions. All tests follow the "Test What Can Break"
 * philosophy focusing on user-facing functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	formatDate,
	getEntryTypeLabel,
	getRoleLabel,
	getRoleBadgeColor,
	getEntryTypeColor,
	getDayName,
	getVelocityStatus,
	generateMonthOptions,
	formatVelocity,
	formatSprintLength,
	formatWorkingDays
} from "../formatters";

describe("formatters", () => {
	// Mock Date for consistent testing
	const MOCK_DATE = new Date("2024-01-15T10:00:00Z");

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(MOCK_DATE);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("formatDate", () => {
		it("should format date with short month format by default", () => {
			const result = formatDate("2024-01-15T10:00:00Z");
			expect(result).toBe("Jan 15, 2024");
		});

		it("should format date with long month format when specified", () => {
			const result = formatDate("2024-01-15T10:00:00Z", "long");
			expect(result).toBe("January 15, 2024");
		});

		it("should handle different date formats correctly", () => {
			const result = formatDate("2024-12-25T12:00:00Z");
			expect(result).toBe("Dec 25, 2024");
		});

		it("should handle leap year dates correctly", () => {
			const result = formatDate("2024-02-29T10:00:00Z");
			expect(result).toBe("Feb 29, 2024");
		});

		it("should handle year boundaries correctly", () => {
			const result = formatDate("2023-12-31T23:59:59Z");
			expect(result).toBe("Dec 31, 2023");
		});

		it("should handle single digit days and months", () => {
			const result = formatDate("2024-01-01T10:00:00Z");
			expect(result).toBe("Jan 1, 2024");
		});

		it("should handle invalid date strings gracefully", () => {
			const result = formatDate("invalid-date");
			expect(result).toBe("Invalid Date");
		});
	});

	describe("getEntryTypeLabel", () => {
		it("should return correct label for PTO", () => {
			expect(getEntryTypeLabel("pto")).toBe("PTO / Vacation");
		});

		it("should return correct label for holiday", () => {
			expect(getEntryTypeLabel("holiday")).toBe("Holiday");
		});

		it("should return correct label for sick leave", () => {
			expect(getEntryTypeLabel("sick")).toBe("Sick Leave");
		});

		it("should return correct label for personal time", () => {
			expect(getEntryTypeLabel("personal")).toBe("Personal Time");
		});

		it("should return original string for unknown entry types", () => {
			expect(getEntryTypeLabel("unknown")).toBe("unknown");
			expect(getEntryTypeLabel("custom_type")).toBe("custom_type");
		});

		it("should handle empty string", () => {
			expect(getEntryTypeLabel("")).toBe("");
		});

		it("should handle case sensitivity", () => {
			expect(getEntryTypeLabel("PTO")).toBe("PTO");
			expect(getEntryTypeLabel("HOLIDAY")).toBe("HOLIDAY");
		});
	});

	describe("getRoleLabel", () => {
		it("should return correct label for team member", () => {
			expect(getRoleLabel("team_member")).toBe("Team Member");
		});

		it("should return correct label for team lead", () => {
			expect(getRoleLabel("team_lead")).toBe("Team Lead");
		});

		it("should return correct label for admin", () => {
			expect(getRoleLabel("admin")).toBe("Administrator");
		});

		it("should return original string for unknown roles", () => {
			expect(getRoleLabel("unknown")).toBe("unknown");
			expect(getRoleLabel("custom_role")).toBe("custom_role");
		});

		it("should handle empty string", () => {
			expect(getRoleLabel("")).toBe("");
		});

		it("should handle case sensitivity", () => {
			expect(getRoleLabel("ADMIN")).toBe("ADMIN");
			expect(getRoleLabel("Team_Member")).toBe("Team_Member");
		});
	});

	describe("getRoleBadgeColor", () => {
		it("should return correct color classes for team member", () => {
			expect(getRoleBadgeColor("team_member")).toBe("bg-neutral-background text-interactive");
		});

		it("should return correct color classes for team lead", () => {
			expect(getRoleBadgeColor("team_lead")).toBe("bg-success-background text-success");
		});

		it("should return correct color classes for admin", () => {
			expect(getRoleBadgeColor("admin")).toBe("bg-warning-background text-warning");
		});

		it("should return default color classes for unknown roles", () => {
			expect(getRoleBadgeColor("unknown")).toBe("bg-neutral-background text-text-primary");
			expect(getRoleBadgeColor("custom_role")).toBe("bg-neutral-background text-text-primary");
		});

		it("should handle empty string with default color", () => {
			expect(getRoleBadgeColor("")).toBe("bg-neutral-background text-text-primary");
		});

		it("should handle null and undefined gracefully", () => {
			expect(getRoleBadgeColor(null as any)).toBe("bg-neutral-background text-text-primary");
			expect(getRoleBadgeColor(undefined as any)).toBe("bg-neutral-background text-text-primary");
		});
	});

	describe("getEntryTypeColor", () => {
		it("should return correct color classes for PTO", () => {
			expect(getEntryTypeColor("pto")).toBe("bg-neutral-background text-interactive");
		});

		it("should return correct color classes for holiday", () => {
			expect(getEntryTypeColor("holiday")).toBe("bg-success-background text-success");
		});

		it("should return correct color classes for sick leave", () => {
			expect(getEntryTypeColor("sick")).toBe("bg-error-background text-error");
		});

		it("should return correct color classes for personal time", () => {
			expect(getEntryTypeColor("personal")).toBe("bg-warning-background text-warning");
		});

		it("should return default color classes for unknown entry types", () => {
			expect(getEntryTypeColor("unknown")).toBe("bg-neutral-background text-text-primary");
			expect(getEntryTypeColor("custom_type")).toBe("bg-neutral-background text-text-primary");
		});

		it("should handle empty string with default color", () => {
			expect(getEntryTypeColor("")).toBe("bg-neutral-background text-text-primary");
		});

		it("should handle null and undefined gracefully", () => {
			expect(getEntryTypeColor(null as any)).toBe("bg-neutral-background text-text-primary");
			expect(getEntryTypeColor(undefined as any)).toBe("bg-neutral-background text-text-primary");
		});
	});

	describe("getDayName", () => {
		it("should return correct day name for Sunday (0)", () => {
			expect(getDayName(0)).toBe("Sunday");
		});

		it("should return correct day name for Monday (1)", () => {
			expect(getDayName(1)).toBe("Monday");
		});

		it("should return correct day name for Tuesday (2)", () => {
			expect(getDayName(2)).toBe("Tuesday");
		});

		it("should return correct day name for Wednesday (3)", () => {
			expect(getDayName(3)).toBe("Wednesday");
		});

		it("should return correct day name for Thursday (4)", () => {
			expect(getDayName(4)).toBe("Thursday");
		});

		it("should return correct day name for Friday (5)", () => {
			expect(getDayName(5)).toBe("Friday");
		});

		it("should return correct day name for Saturday (6)", () => {
			expect(getDayName(6)).toBe("Saturday");
		});

		it('should return "Unknown" for invalid day numbers', () => {
			expect(getDayName(7)).toBe("Unknown");
			expect(getDayName(-1)).toBe("Unknown");
			expect(getDayName(10)).toBe("Unknown");
		});

		it("should handle non-integer numbers", () => {
			expect(getDayName(1.5)).toBe("Unknown");
			expect(getDayName(2.9)).toBe("Unknown");
		});

		it("should handle edge cases gracefully", () => {
			expect(getDayName(NaN)).toBe("Unknown");
			expect(getDayName(Infinity)).toBe("Unknown");
			expect(getDayName(-Infinity)).toBe("Unknown");
		});
	});

	describe("getVelocityStatus", () => {
		it('should return "Not Set" for velocity 0', () => {
			const result = getVelocityStatus(0);
			expect(result).toEqual({ label: "Not Set", color: "text-text-primary" });
		});

		it('should return "Low" for velocity less than 20', () => {
			const result = getVelocityStatus(10);
			expect(result).toEqual({ label: "Low", color: "text-warning" });
		});

		it('should return "Low" for velocity exactly 19', () => {
			const result = getVelocityStatus(19);
			expect(result).toEqual({ label: "Low", color: "text-warning" });
		});

		it('should return "Medium" for velocity 20-39', () => {
			const result = getVelocityStatus(25);
			expect(result).toEqual({ label: "Medium", color: "text-interactive" });
		});

		it('should return "Medium" for velocity exactly 39', () => {
			const result = getVelocityStatus(39);
			expect(result).toEqual({ label: "Medium", color: "text-interactive" });
		});

		it('should return "High" for velocity 40 and above', () => {
			const result = getVelocityStatus(40);
			expect(result).toEqual({ label: "High", color: "text-success" });
		});

		it('should return "High" for very high velocities', () => {
			const result = getVelocityStatus(100);
			expect(result).toEqual({ label: "High", color: "text-success" });
		});

		it("should handle negative velocities as Low", () => {
			const result = getVelocityStatus(-5);
			expect(result).toEqual({ label: "Low", color: "text-warning" });
		});

		it("should handle decimal velocities correctly", () => {
			expect(getVelocityStatus(19.9)).toEqual({ label: "Low", color: "text-warning" });
			expect(getVelocityStatus(20.1)).toEqual({ label: "Medium", color: "text-interactive" });
			expect(getVelocityStatus(39.9)).toEqual({ label: "Medium", color: "text-interactive" });
			expect(getVelocityStatus(40.1)).toEqual({ label: "High", color: "text-success" });
		});
	});

	describe("generateMonthOptions", () => {
		it("should generate default 13 month options (6 before, current, 6 after)", () => {
			const result = generateMonthOptions();
			expect(result).toHaveLength(13);
		});

		it("should generate correct month options with default range", () => {
			const result = generateMonthOptions();

			// Check that current month (January 2024) is in the middle
			const currentMonthIndex = result.findIndex(option => option.value === "2024-01");
			expect(currentMonthIndex).toBe(6); // Middle of 13 options (0-12)

			// Check current month label
			expect(result[currentMonthIndex].label).toBe("January 2024");
		});

		it("should generate correct month options with custom range", () => {
			const result = generateMonthOptions(3);
			expect(result).toHaveLength(7); // 3 before, current, 3 after

			// Check that current month is in the middle
			const currentMonthIndex = result.findIndex(option => option.value === "2024-01");
			expect(currentMonthIndex).toBe(3); // Middle of 7 options (0-6)
		});

		it("should handle range of 0 (only current month)", () => {
			const result = generateMonthOptions(0);
			expect(result).toHaveLength(1);
			expect(result[0].value).toBe("2024-01");
			expect(result[0].label).toBe("January 2024");
		});

		it("should handle large ranges correctly", () => {
			const result = generateMonthOptions(12);
			expect(result).toHaveLength(25); // 12 before, current, 12 after
		});

		it("should generate proper ISO format values", () => {
			const result = generateMonthOptions(1);

			// Check that all values are in YYYY-MM format
			result.forEach(option => {
				expect(option.value).toMatch(/^\d{4}-\d{2}$/);
			});
		});

		it("should generate proper month labels", () => {
			const result = generateMonthOptions(1);

			// Check that all labels contain month name and year
			result.forEach(option => {
				expect(option.label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
			});
		});

		it("should handle year boundaries correctly", () => {
			// Set mock date to December to test year boundary
			vi.setSystemTime(new Date("2024-12-15T10:00:00Z"));

			const result = generateMonthOptions(2);

			// Should include months from previous and next year
			const hasDecember2024 = result.some(option => option.value === "2024-12");
			const hasJanuary2025 = result.some(option => option.value === "2025-01");

			expect(hasDecember2024).toBe(true);
			expect(hasJanuary2025).toBe(true);
		});
	});

	describe("formatVelocity", () => {
		it("should format positive velocity with points", () => {
			expect(formatVelocity(25)).toBe("25 points");
		});

		it("should format single point correctly", () => {
			expect(formatVelocity(1)).toBe("1 points");
		});

		it('should format zero velocity as "Not set"', () => {
			expect(formatVelocity(0)).toBe("Not set");
		});

		it('should format negative velocity as "Not set"', () => {
			expect(formatVelocity(-5)).toBe("Not set");
		});

		it("should handle decimal velocities", () => {
			expect(formatVelocity(25.5)).toBe("25.5 points");
		});

		it("should handle very large velocities", () => {
			expect(formatVelocity(999)).toBe("999 points");
		});

		it("should handle edge cases", () => {
			expect(formatVelocity(NaN)).toBe("Not set");
			expect(formatVelocity(Infinity)).toBe("Infinity points");
			expect(formatVelocity(-Infinity)).toBe("Not set");
		});
	});

	describe("formatSprintLength", () => {
		it("should format single day correctly", () => {
			expect(formatSprintLength(1)).toBe("1 day");
		});

		it("should format multiple days correctly", () => {
			expect(formatSprintLength(2)).toBe("2 days");
			expect(formatSprintLength(14)).toBe("14 days");
		});

		it("should format zero days correctly", () => {
			expect(formatSprintLength(0)).toBe("0 days");
		});

		it("should handle negative days", () => {
			expect(formatSprintLength(-1)).toBe("-1 days");
			expect(formatSprintLength(-5)).toBe("-5 days");
		});

		it("should handle decimal days", () => {
			expect(formatSprintLength(1.5)).toBe("1.5 days");
			expect(formatSprintLength(2.7)).toBe("2.7 days");
		});

		it("should handle large numbers", () => {
			expect(formatSprintLength(365)).toBe("365 days");
		});

		it("should handle edge cases", () => {
			expect(formatSprintLength(NaN)).toBe("NaN days");
			expect(formatSprintLength(Infinity)).toBe("Infinity days");
		});
	});

	describe("formatWorkingDays", () => {
		it("should format single day per week correctly", () => {
			expect(formatWorkingDays(1)).toBe("1 day/week");
		});

		it("should format multiple days per week correctly", () => {
			expect(formatWorkingDays(5)).toBe("5 days/week");
			expect(formatWorkingDays(7)).toBe("7 days/week");
		});

		it("should format zero days per week correctly", () => {
			expect(formatWorkingDays(0)).toBe("0 days/week");
		});

		it("should handle negative days", () => {
			expect(formatWorkingDays(-1)).toBe("-1 days/week");
			expect(formatWorkingDays(-3)).toBe("-3 days/week");
		});

		it("should handle decimal days", () => {
			expect(formatWorkingDays(2.5)).toBe("2.5 days/week");
			expect(formatWorkingDays(4.25)).toBe("4.25 days/week");
		});

		it("should handle large numbers", () => {
			expect(formatWorkingDays(365)).toBe("365 days/week");
		});

		it("should handle edge cases", () => {
			expect(formatWorkingDays(NaN)).toBe("NaN days/week");
			expect(formatWorkingDays(Infinity)).toBe("Infinity days/week");
		});
	});

	describe("edge cases and integration", () => {
		it("should handle all formatters with typical application data", () => {
			// Test a realistic scenario with typical application data
			const date = "2024-06-15T14:30:00Z";
			const role = "team_lead";
			const entryType = "pto";
			const velocity = 35;
			const sprintLength = 14;
			const workingDays = 5;

			expect(formatDate(date)).toBe("Jun 15, 2024");
			expect(getRoleLabel(role)).toBe("Team Lead");
			expect(getRoleBadgeColor(role)).toBe("bg-success-background text-success");
			expect(getEntryTypeLabel(entryType)).toBe("PTO / Vacation");
			expect(getEntryTypeColor(entryType)).toBe("bg-neutral-background text-interactive");
			expect(getVelocityStatus(velocity)).toEqual({ label: "Medium", color: "text-interactive" });
			expect(formatVelocity(velocity)).toBe("35 points");
			expect(formatSprintLength(sprintLength)).toBe("14 days");
			expect(formatWorkingDays(workingDays)).toBe("5 days/week");
		});

		it("should handle all formatters with boundary condition data", () => {
			// Test boundary conditions
			const velocity = 20; // Boundary between Low and Medium
			const sprintLength = 1; // Singular form
			const workingDays = 1; // Singular form

			expect(getVelocityStatus(velocity)).toEqual({ label: "Medium", color: "text-interactive" });
			expect(formatVelocity(velocity)).toBe("20 points");
			expect(formatSprintLength(sprintLength)).toBe("1 day");
			expect(formatWorkingDays(workingDays)).toBe("1 day/week");
		});

		it("should handle all formatters with invalid/edge case data", () => {
			// Test with problematic data
			const invalidDate = "invalid-date";
			const unknownRole = "unknown_role";
			const unknownType = "unknown_type";
			const zeroVelocity = 0;
			const invalidDay = 10;

			expect(formatDate(invalidDate)).toBe("Invalid Date");
			expect(getRoleLabel(unknownRole)).toBe("unknown_role");
			expect(getRoleBadgeColor(unknownRole)).toBe("bg-neutral-background text-text-primary");
			expect(getEntryTypeLabel(unknownType)).toBe("unknown_type");
			expect(getEntryTypeColor(unknownType)).toBe("bg-neutral-background text-text-primary");
			expect(getVelocityStatus(zeroVelocity)).toEqual({ label: "Not Set", color: "text-text-primary" });
			expect(formatVelocity(zeroVelocity)).toBe("Not set");
			expect(getDayName(invalidDay)).toBe("Unknown");
		});
	});
});
