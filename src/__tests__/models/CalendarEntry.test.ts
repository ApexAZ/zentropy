import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import type { QueryResult } from "pg";
import { CalendarEntryModel, type CalendarEntry } from "../../models/CalendarEntry";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers, DomainAssertionHelpers } from "../helpers/assertion-helpers";
import { pool } from "../../database/connection";

// Mock the database connection
vi.mock("../../database/connection", () => ({
	pool: {
		query: vi.fn().mockResolvedValue({ 
			rows: [], 
			rowCount: 0, 
			command: 'SELECT', 
			oid: 0, 
			fields: [] 
		} as QueryResult<CalendarEntry>)
	}
}));

// Get the mocked pool for testing
const mockPool = vi.mocked(pool);

describe("CalendarEntryModel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	// Helper functions for common mock scenarios
	const mockSuccessfulQuery = (returnValue: unknown): void => {
		const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
		const mockResult: QueryResult = { rows, rowCount: rows.length, command: "SELECT", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	const mockEmptyQuery = (): void => {
		const mockResult: QueryResult = { rows: [], rowCount: 0, command: "SELECT", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	const mockFailedQuery = (error = new Error("Database connection failed")): void => {
		(mockPool.query as Mock).mockRejectedValue(error);
	};

	const mockDeleteSuccess = (rowCount = 1): void => {
		const mockResult: QueryResult = { rows: [], rowCount, command: "DELETE", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	const mockDeleteFailure = (): void => {
		const mockResult: QueryResult = { rows: [], rowCount: 0, command: "DELETE", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	describe("business logic validation", () => {
		it("should create calendar entry with default all_day setting", async () => {
			const entryData = TestDataFactory.createCalendarEntryData();
			const createdEntry = TestDataFactory.createTestCalendarEntry(entryData);
			mockSuccessfulQuery(createdEntry);

			const result = await CalendarEntryModel.create(entryData);

			DomainAssertionHelpers.expectValidCalendarEntry(result);
			expect(result.all_day).toBe(true); // Default behavior
		});

		it("should handle custom all_day setting", async () => {
			const entryData = TestDataFactory.createCalendarEntryData({ all_day: false });
			const createdEntry = TestDataFactory.createTestCalendarEntry({ ...entryData, all_day: false });
			mockSuccessfulQuery(createdEntry);

			const result = await CalendarEntryModel.create(entryData);

			expect(result.all_day).toBe(false);
			DomainAssertionHelpers.expectValidCalendarEntry(result);
		});

		it("should validate date range business rules", async () => {
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 5);
			const entryData = TestDataFactory.createCalendarEntryData({
				start_date: startDate,
				end_date: endDate
			});
			const createdEntry = TestDataFactory.createTestCalendarEntry(entryData);
			mockSuccessfulQuery(createdEntry);

			const result = await CalendarEntryModel.create(entryData);

			// Validate date order business rule
			expect(new Date(result.end_date).getTime()).toBeGreaterThanOrEqual(new Date(result.start_date).getTime());
		});
	});

	describe("conflict detection", () => {
		it("should find conflicting entries for user", async () => {
			const userId = "user123";
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 3);
			const conflictingEntry = TestDataFactory.createTestCalendarEntry({
				user_id: userId,
				start_date: startDate,
				end_date: endDate
			});
			mockSuccessfulQuery([conflictingEntry]);

			const result = await CalendarEntryModel.findConflicts(userId, startDate, endDate);

			expect(result).toHaveLength(1);
			expect(result[0]?.user_id).toBe(userId);
			if (result[0]) {
				DomainAssertionHelpers.expectValidCalendarEntry(result[0]);
			}
		});

		it("should exclude specific entry when checking conflicts", async () => {
			const userId = "user123";
			const excludeId = "entry456";
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 3);
			mockEmptyQuery(); // No conflicts found

			const result = await CalendarEntryModel.findConflicts(userId, startDate, endDate, excludeId);

			expect(result).toHaveLength(0);
			const mockQuery = mockPool["query"] as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "AND id != $4", [userId, startDate, endDate, excludeId]);
		});
	});

	describe("working days impact calculation", () => {
		it("should calculate working days impact for team", async () => {
			const teamId = "team123";
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 10);
			const impactEntries = TestDataFactory.createMultipleTestCalendarEntries(2, "user123", teamId);
			mockSuccessfulQuery(impactEntries);

			const impact = await CalendarEntryModel.calculateWorkingDaysImpact(teamId, startDate, endDate);

			expect(typeof impact).toBe("number");
			expect(impact).toBeGreaterThanOrEqual(0);
		});

		it("should handle team with no calendar entries", async () => {
			const teamId = "empty-team";
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 5);
			mockEmptyQuery();

			const impact = await CalendarEntryModel.calculateWorkingDaysImpact(teamId, startDate, endDate);

			expect(impact).toBe(0);
		});
	});

	describe("filtering and querying", () => {
		it("should find entries by user", async () => {
			const userId = "user123";
			const userEntries = TestDataFactory.createMultipleTestCalendarEntries(3, userId, "team123");
			mockSuccessfulQuery(userEntries);

			const result = await CalendarEntryModel.findByUser(userId);

			expect(result).toHaveLength(3);
			result.forEach(entry => {
				expect(entry.user_id).toBe(userId);
				DomainAssertionHelpers.expectValidCalendarEntry(entry);
			});
		});

		it("should find entries by team", async () => {
			const teamId = "team123";
			const teamEntries = TestDataFactory.createMultipleTestCalendarEntries(2, "user123", teamId);
			mockSuccessfulQuery(teamEntries);

			const result = await CalendarEntryModel.findByTeam(teamId);

			expect(result).toHaveLength(2);
			result.forEach(entry => {
				expect(entry.team_id).toBe(teamId);
				DomainAssertionHelpers.expectValidCalendarEntry(entry);
			});
		});

		it("should find entries by date range", async () => {
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 7);
			const rangeEntries = TestDataFactory.createMultipleTestCalendarEntries(2, "user123", "team123");
			mockSuccessfulQuery(rangeEntries);

			const result = await CalendarEntryModel.findByDateRange(startDate, endDate);

			expect(result).toHaveLength(2);
			result.forEach(entry => {
				DomainAssertionHelpers.expectValidCalendarEntry(entry);
			});
		});

		it("should find entries by date range with team filter", async () => {
			const { startDate, endDate } = TestDataFactory.createDateRange(0, 7);
			const teamId = "team123";
			const filteredEntries = TestDataFactory.createMultipleTestCalendarEntries(1, "user123", teamId);
			mockSuccessfulQuery(filteredEntries);

			const result = await CalendarEntryModel.findByDateRange(startDate, endDate, teamId);

			expect(result).toHaveLength(1);
			expect(result[0]?.team_id).toBe(teamId);
		});
	});

	describe("data integrity and validation", () => {
		it("should handle update operations with partial data", async () => {
			const entryId = "entry123";
			const updateData = {
				title: "Updated Title",
				description: "Updated description",
				entry_type: "sick" as const
			};
			const updatedEntry = TestDataFactory.createTestCalendarEntry({ id: entryId, ...updateData });
			mockSuccessfulQuery(updatedEntry);

			const result = await CalendarEntryModel.update(entryId, updateData);

			if (result === null) {
				throw new Error("Expected result to be defined, but got null");
			}
			expect(result.title).toBe("Updated Title");
			expect(result.entry_type).toBe("sick");
			DomainAssertionHelpers.expectValidCalendarEntry(result);
		});

		it("should validate entry types", async () => {
			const entryTypes = ["pto", "holiday", "sick", "personal"] as const;

			for (const entryType of entryTypes) {
				const entryData = TestDataFactory.createCalendarEntryData({ entry_type: entryType });
				const createdEntry = TestDataFactory.createTestCalendarEntry(entryData);
				mockSuccessfulQuery(createdEntry);

				const result = await CalendarEntryModel.create(entryData);

				expect(result.entry_type).toBe(entryType);
				expect(entryTypes).toContain(result.entry_type);
			}
		});
	});

	describe("error handling", () => {
		it("should handle database errors gracefully", async () => {
			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(
				CalendarEntryModel.findById("nonexistent"),
				"Database connection failed"
			);
		});

		it("should return null when no fields to update", async () => {
			const result = await CalendarEntryModel.update("entry123", {});

			expect(result).toBeNull();
			const mockQuery = mockPool["query"] as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectMockNotCalled(mockQuery);
		});

		it("should handle delete operations correctly", async () => {
			mockDeleteSuccess(1);

			const result = await CalendarEntryModel.delete("entry123");

			expect(result).toBe(true);
			const mockQuery = mockPool["query"] as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "DELETE FROM calendar_entries WHERE id = $1", ["entry123"]);
		});

		it("should handle delete failure when entry not found", async () => {
			mockDeleteFailure();

			const result = await CalendarEntryModel.delete("nonexistent");

			expect(result).toBe(false);
		});
	});
});
