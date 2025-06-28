/**
 * Calendar Utilities Tests
 * Following hybrid testing approach - testing pure functions extracted from calendar.test.ts
 * TDD implementation with comprehensive edge case coverage for calendar business logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
	getEntriesForDate,
	getEntryTitle,
	getEntryTypeLabel,
	validateEntryData,
	calculateWorkingDays,
	calculateCapacityImpact,
	escapeHtml,
	formatDate,
	formatDateForInput,
	getEntriesForMonth,
	type CalendarEntry,
	type Team,
	type User,
	type CreateCalendarEntryData
} from "../../utils/calendar-utils.js";

describe("Calendar Utilities", () => {
	let mockUsers: User[];
	let mockTeams: Team[];
	let mockCalendarEntries: CalendarEntry[];

	beforeEach(() => {
		mockUsers = [
			{
				id: "user1",
				username: "jdoe",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member"
			},
			{
				id: "user2",
				username: "jsmith",
				email: "jane.smith@example.com",
				first_name: "Jane",
				last_name: "Smith",
				role: "team_lead"
			}
		];

		mockTeams = [
			{
				id: "team1",
				name: "Frontend Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			},
			{
				id: "team2",
				name: "Backend Team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 5
			}
		];

		mockCalendarEntries = [
			{
				id: "entry1",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: "2024-07-15T00:00:00",
				end_date: "2024-07-20T00:00:00",
				description: "Summer vacation",
				all_day: true,
				created_at: "2024-07-01T00:00:00Z",
				updated_at: "2024-07-01T00:00:00Z"
			},
			{
				id: "entry2",
				team_id: "team1",
				user_id: "user2",
				entry_type: "holiday",
				title: "Independence Day",
				start_date: "2024-07-04T00:00:00",
				end_date: "2024-07-04T00:00:00",
				description: "Federal holiday",
				all_day: true,
				created_at: "2024-07-01T00:00:00Z",
				updated_at: "2024-07-01T00:00:00Z"
			},
			{
				id: "entry3",
				team_id: "team1",
				user_id: "user1",
				entry_type: "sick",
				title: "Sick Day",
				start_date: "2024-08-05T00:00:00",
				end_date: "2024-08-05T00:00:00",
				all_day: true,
				created_at: "2024-07-01T00:00:00Z",
				updated_at: "2024-07-01T00:00:00Z"
			}
		];
	});

	describe("getEntriesForDate", () => {
		it("should return entries that overlap with the given date", () => {
			const testDate = new Date("2024-07-16T00:00:00"); // Within the vacation range
			const result = getEntriesForDate(testDate, mockCalendarEntries);

			expect(result).toHaveLength(1);
			const firstEntry = result[0];
			expect(firstEntry).toBeDefined();
			expect(firstEntry?.id).toBe("entry1");
			expect(firstEntry?.title).toBe("Vacation");
		});

		it("should return multiple entries when they overlap with the same date", () => {
			// Add an overlapping entry for testing
			const overlappingEntry: CalendarEntry = {
				id: "entry4",
				team_id: "team1",
				user_id: "user2",
				entry_type: "personal",
				title: "Personal Day",
				start_date: "2024-07-15",
				end_date: "2024-07-17",
				all_day: true,
				created_at: "2024-07-01T00:00:00Z",
				updated_at: "2024-07-01T00:00:00Z"
			};
			const entriesWithOverlap = [...mockCalendarEntries, overlappingEntry];

			const testDate = new Date("2024-07-16T00:00:00");
			const result = getEntriesForDate(testDate, entriesWithOverlap);

			expect(result).toHaveLength(2);
			expect(result.map(e => e.id)).toContain("entry1");
			expect(result.map(e => e.id)).toContain("entry4");
		});

		it("should return empty array when no entries overlap with the given date", () => {
			const testDate = new Date("2024-06-01T00:00:00"); // Date with no entries
			const result = getEntriesForDate(testDate, mockCalendarEntries);

			expect(result).toHaveLength(0);
		});

		it("should include entries on start and end dates", () => {
			const startDate = new Date("2024-07-15T00:00:00"); // Start date of vacation
			const endDate = new Date("2024-07-20T00:00:00"); // End date of vacation

			const startResult = getEntriesForDate(startDate, mockCalendarEntries);
			const endResult = getEntriesForDate(endDate, mockCalendarEntries);

			expect(startResult).toHaveLength(1);
			const firstStartResult = startResult[0];
			expect(firstStartResult).toBeDefined();
			expect(firstStartResult?.id).toBe("entry1");
			expect(endResult).toHaveLength(1);
			const firstEndResult = endResult[0];
			expect(firstEndResult).toBeDefined();
			expect(firstEndResult?.id).toBe("entry1");
		});
	});

	describe("getEntryTitle", () => {
		it("should format entry title with user name and type label", () => {
			const entry = mockCalendarEntries[0]; // John Doe's vacation
			expect(entry).toBeDefined();
			if (!entry) {
				return;
			}
			const result = getEntryTitle(entry, mockUsers);

			expect(result).toBe("John Doe - PTO / Vacation");
		});

		it("should handle unknown user gracefully", () => {
			const baseEntry = mockCalendarEntries[0];
			expect(baseEntry).toBeDefined();
			if (!baseEntry) {
				return;
			}
			const entryWithUnknownUser: CalendarEntry = {
				...baseEntry,
				user_id: "unknown_user"
			};
			const result = getEntryTitle(entryWithUnknownUser, mockUsers);

			expect(result).toBe("Unknown - PTO / Vacation");
		});

		it("should format different entry types correctly", () => {
			const holidayEntry = mockCalendarEntries[1]; // Jane's holiday
			expect(holidayEntry).toBeDefined();
			if (!holidayEntry) {
				return;
			}
			const result = getEntryTitle(holidayEntry, mockUsers);

			expect(result).toBe("Jane Smith - Holiday");
		});
	});

	describe("getEntryTypeLabel", () => {
		it("should return correct labels for known entry types", () => {
			expect(getEntryTypeLabel("pto")).toBe("PTO / Vacation");
			expect(getEntryTypeLabel("holiday")).toBe("Holiday");
			expect(getEntryTypeLabel("sick")).toBe("Sick Leave");
			expect(getEntryTypeLabel("personal")).toBe("Personal Time");
		});

		it("should return the original type for unknown types", () => {
			expect(getEntryTypeLabel("custom_type")).toBe("custom_type");
			expect(getEntryTypeLabel("")).toBe("");
		});
	});

	describe("validateEntryData", () => {
		const validEntryData: CreateCalendarEntryData = {
			team_id: "team1",
			user_id: "user1",
			entry_type: "pto",
			title: "Vacation",
			start_date: "2024-07-15",
			end_date: "2024-07-20",
			description: "Summer vacation"
		};

		it("should validate correct entry data", () => {
			const result = validateEntryData(validEntryData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should require team_id", () => {
			const invalidData = { ...validEntryData, team_id: "" };
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Please select a team");
		});

		it("should require user_id", () => {
			const invalidData = { ...validEntryData, user_id: "" };
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Please select a team member");
		});

		it("should require start_date", () => {
			const invalidData = { ...validEntryData, start_date: "" };
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Start date is required");
		});

		it("should require end_date", () => {
			const invalidData = { ...validEntryData, end_date: "" };
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("End date is required");
		});

		it("should validate that end date is after start date", () => {
			const invalidData = {
				...validEntryData,
				start_date: "2024-07-20",
				end_date: "2024-07-15"
			};
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("End date must be after start date");
		});

		it("should validate description length", () => {
			const longDescription = "x".repeat(501); // 501 characters
			const invalidData = { ...validEntryData, description: longDescription };
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain("Description must be less than 500 characters");
		});

		it("should allow valid description length", () => {
			const validDescription = "x".repeat(500); // Exactly 500 characters
			const validData = { ...validEntryData, description: validDescription };
			const result = validateEntryData(validData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should accumulate multiple validation errors", () => {
			const invalidData: CreateCalendarEntryData = {
				team_id: "",
				user_id: "",
				entry_type: "pto",
				title: "Test",
				start_date: "",
				end_date: "",
				description: "x".repeat(501)
			};
			const result = validateEntryData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveLength(5);
			expect(result.errors).toContain("Please select a team");
			expect(result.errors).toContain("Please select a team member");
			expect(result.errors).toContain("Start date is required");
			expect(result.errors).toContain("End date is required");
			expect(result.errors).toContain("Description must be less than 500 characters");
		});
	});

	describe("calculateWorkingDays", () => {
		it("should calculate working days correctly for a typical week", () => {
			// Monday to Friday (5 working days)
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-19T00:00:00"); // Friday
			const result = calculateWorkingDays(startDate, endDate);

			expect(result).toBe(5);
		});

		it("should exclude weekends from working days calculation", () => {
			// Monday to Sunday (5 working days, excluding weekend)
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-21T00:00:00"); // Sunday
			const result = calculateWorkingDays(startDate, endDate);

			expect(result).toBe(5);
		});

		it("should handle single day periods", () => {
			// Single working day
			const workingDay = new Date("2024-07-16T00:00:00"); // Tuesday
			const weekendDay = new Date("2024-07-14T00:00:00"); // Sunday

			expect(calculateWorkingDays(workingDay, workingDay)).toBe(1);
			expect(calculateWorkingDays(weekendDay, weekendDay)).toBe(0);
		});

		it("should handle multiple weeks correctly", () => {
			// 2 full weeks (10 working days)
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-26T00:00:00"); // Friday (2 weeks later)
			const result = calculateWorkingDays(startDate, endDate);

			expect(result).toBe(10);
		});

		it("should handle same start and end date", () => {
			const date = new Date("2024-07-16T00:00:00"); // Tuesday
			const result = calculateWorkingDays(date, date);

			expect(result).toBe(1);
		});
	});

	describe("calculateCapacityImpact", () => {
		it("should calculate capacity impact correctly", () => {
			const team = mockTeams[0]; // Frontend team: 14 days sprint, 5 working days per week
			expect(team).toBeDefined();
			if (!team) {
				return;
			}
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-19T00:00:00"); // Friday (5 working days)

			const result = calculateCapacityImpact(team, startDate, endDate);

			// Sprint working days: (14/7) * 5 = 10
			// Working days affected: 5
			// Percentage: (5/10) * 100 = 50%
			expect(result.workingDays).toBe(5);
			expect(result.percentage).toBe(50);
		});

		it("should handle different sprint configurations", () => {
			const team = mockTeams[1]; // Backend team: 10 days sprint, 5 working days per week
			expect(team).toBeDefined();
			if (!team) {
				return;
			}
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-17T00:00:00"); // Wednesday (3 working days)

			const result = calculateCapacityImpact(team, startDate, endDate);

			// Sprint working days: (10/7) * 5 = 7.14, but let's calculate: approx 7.14
			// Working days affected: 3
			// Percentage: (3/7.14) * 100 ≈ 42%
			expect(result.workingDays).toBe(3);
			expect(result.percentage).toBeGreaterThan(40);
			expect(result.percentage).toBeLessThan(45);
		});

		it("should round percentage to nearest integer", () => {
			const team: Team = {
				id: "test",
				name: "Test Team",
				velocity_baseline: 20,
				sprint_length_days: 7, // 1 week sprint
				working_days_per_week: 5
			};
			const startDate = new Date("2024-07-15T00:00:00"); // Monday
			const endDate = new Date("2024-07-16T00:00:00"); // Tuesday (2 working days)

			const result = calculateCapacityImpact(team, startDate, endDate);

			// Sprint working days: (7/7) * 5 = 5
			// Working days affected: 2
			// Percentage: (2/5) * 100 = 40%
			expect(result.workingDays).toBe(2);
			expect(result.percentage).toBe(40);
		});
	});

	describe("formatDate", () => {
		it("should format dates in US locale", () => {
			expect(formatDate("2024-07-15T00:00:00")).toBe("Jul 15, 2024");
			expect(formatDate("2024-01-01T00:00:00")).toBe("Jan 1, 2024");
			expect(formatDate("2024-12-31T00:00:00")).toBe("Dec 31, 2024");
		});

		it("should handle ISO date strings", () => {
			expect(formatDate("2024-07-15T10:30:00Z")).toBe("Jul 15, 2024");
		});
	});

	describe("formatDateForInput", () => {
		it("should format dates for HTML input fields", () => {
			const date1 = new Date("2024-07-15T00:00:00");
			const date2 = new Date("2024-01-01T00:00:00");
			const date3 = new Date("2024-12-31T00:00:00");

			expect(formatDateForInput(date1)).toBe("2024-07-15");
			expect(formatDateForInput(date2)).toBe("2024-01-01");
			expect(formatDateForInput(date3)).toBe("2024-12-31");
		});

		it("should pad single digit months and days with zeros", () => {
			const date = new Date("2024-01-05T00:00:00");
			expect(formatDateForInput(date)).toBe("2024-01-05");
		});
	});

	describe("getEntriesForMonth", () => {
		it("should return entries that overlap with the selected month", () => {
			const july2024 = new Date("2024-07-01T00:00:00");
			const result = getEntriesForMonth(mockCalendarEntries, july2024);

			// Should include the vacation (July 15-20) and holiday (July 4)
			expect(result).toHaveLength(2);
			expect(result.map(e => e.id)).toContain("entry1");
			expect(result.map(e => e.id)).toContain("entry2");
		});

		it("should exclude entries from other months", () => {
			const august2024 = new Date("2024-08-01T00:00:00");
			const result = getEntriesForMonth(mockCalendarEntries, august2024);

			// Should only include the sick day (August 5)
			expect(result).toHaveLength(1);
			const firstAugustResult = result[0];
			expect(firstAugustResult).toBeDefined();
			expect(firstAugustResult?.id).toBe("entry3");
		});

		it("should return empty array for months with no entries", () => {
			const june2024 = new Date("2024-06-01T00:00:00");
			const result = getEntriesForMonth(mockCalendarEntries, june2024);

			expect(result).toHaveLength(0);
		});

		it("should sort entries by start date", () => {
			const july2024 = new Date("2024-07-01T00:00:00");
			const result = getEntriesForMonth(mockCalendarEntries, july2024);

			// Holiday (July 4) should come before vacation (July 15)
			const firstJulyResult = result[0];
			const secondJulyResult = result[1];
			expect(firstJulyResult).toBeDefined();
			expect(secondJulyResult).toBeDefined();
			expect(firstJulyResult?.id).toBe("entry2"); // Holiday
			expect(secondJulyResult?.id).toBe("entry1"); // Vacation
		});

		it("should handle entries that span across month boundaries", () => {
			// Add an entry that spans from July to August
			const spanningEntry: CalendarEntry = {
				id: "entry_spanning",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Long Vacation",
				start_date: "2024-07-29",
				end_date: "2024-08-02",
				all_day: true,
				created_at: "2024-07-01T00:00:00Z",
				updated_at: "2024-07-01T00:00:00Z"
			};
			const entriesWithSpanning = [...mockCalendarEntries, spanningEntry];

			const july2024 = new Date("2024-07-01T00:00:00");
			const august2024 = new Date("2024-08-01T00:00:00");

			const julyResult = getEntriesForMonth(entriesWithSpanning, july2024);
			const augustResult = getEntriesForMonth(entriesWithSpanning, august2024);

			// Spanning entry should appear in both months
			expect(julyResult.map(e => e.id)).toContain("entry_spanning");
			expect(augustResult.map(e => e.id)).toContain("entry_spanning");
		});
	});

	describe("escapeHtml", () => {
		it("should escape HTML special characters", () => {
			expect(escapeHtml("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
			expect(escapeHtml("John & Jane")).toBe("John &amp; Jane");
			expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
		});

		it("should handle empty strings", () => {
			expect(escapeHtml("")).toBe("");
		});

		it("should not modify safe text", () => {
			expect(escapeHtml("Safe text 123")).toBe("Safe text 123");
		});

		it("should handle all dangerous HTML characters", () => {
			const dangerous = `<script>alert('xss')</script> & "quotes" 'single'`;
			const result = escapeHtml(dangerous);
			
			expect(result).toContain("&lt;script&gt;");
			expect(result).toContain("&amp;");
			expect(result).toContain("&quot;");
			expect(result).toContain("&#x27;");
		});
	});
});