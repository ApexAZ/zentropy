import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CalendarEntryModel, CreateCalendarEntryData, CalendarEntry } from "../../models/CalendarEntry";
import { pool } from "../../database/connection";

// Mock the database pool
vi.mock("../../database/connection", () => ({
	pool: {
		query: vi.fn()
	}
}));

const mockPool = pool as any;

describe("CalendarEntryModel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("create", () => {
		it("should create a new calendar entry with default all_day true", async () => {
			const entryData: CreateCalendarEntryData = {
				user_id: "user123",
				team_id: "team123",
				entry_type: "pto",
				title: "Vacation",
				description: "Summer vacation",
				start_date: new Date("2024-07-01"),
				end_date: new Date("2024-07-05")
			};

			const mockEntry: CalendarEntry = {
				id: "123",
				...entryData,
				all_day: true,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockEntry] });

			const result = await CalendarEntryModel.create(entryData);

			expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO calendar_entries"), [
				entryData.user_id,
				entryData.team_id,
				entryData.entry_type,
				entryData.title,
				entryData.description,
				entryData.start_date,
				entryData.end_date,
				true
			]);
			expect(result).toEqual(mockEntry);
		});

		it("should create entry with custom all_day value", async () => {
			const entryData: CreateCalendarEntryData = {
				user_id: "user123",
				team_id: "team123",
				entry_type: "sick",
				title: "Doctor appointment",
				start_date: new Date("2024-07-01"),
				end_date: new Date("2024-07-01"),
				all_day: false
			};

			const mockEntry: CalendarEntry = {
				id: "456",
				...entryData,
				description: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockEntry] });

			const result = await CalendarEntryModel.create(entryData);

			expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO calendar_entries"), [
				entryData.user_id,
				entryData.team_id,
				entryData.entry_type,
				entryData.title,
				null,
				entryData.start_date,
				entryData.end_date,
				false
			]);
			expect(result).toEqual(mockEntry);
		});

		it("should handle database errors", async () => {
			const entryData: CreateCalendarEntryData = {
				user_id: "user123",
				team_id: "team123",
				entry_type: "pto",
				title: "Vacation",
				start_date: new Date("2024-07-01"),
				end_date: new Date("2024-07-05")
			};

			const dbError = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(dbError);

			await expect(CalendarEntryModel.create(entryData)).rejects.toThrow("Database connection failed");
		});
	});

	describe("findById", () => {
		it("should find calendar entry by id", async () => {
			const mockEntry: CalendarEntry = {
				id: "123",
				user_id: "user123",
				team_id: "team123",
				entry_type: "pto",
				title: "Vacation",
				description: "Summer vacation",
				start_date: new Date("2024-07-01"),
				end_date: new Date("2024-07-05"),
				all_day: true,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockEntry] });

			const result = await CalendarEntryModel.findById("123");

			expect(mockPool.query).toHaveBeenCalledWith("SELECT * FROM calendar_entries WHERE id = $1", ["123"]);
			expect(result).toEqual(mockEntry);
		});

		it("should return null when entry not found", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await CalendarEntryModel.findById("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("findByDateRange", () => {
		it("should find entries within date range without team filter", async () => {
			const startDate = new Date("2024-07-01");
			const endDate = new Date("2024-07-31");
			const mockEntries = [
				{
					id: "123",
					user_id: "user123",
					team_id: "team123",
					entry_type: "pto",
					title: "Vacation",
					start_date: new Date("2024-07-10"),
					end_date: new Date("2024-07-15"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockPool.query.mockResolvedValue({ rows: mockEntries });

			const result = await CalendarEntryModel.findByDateRange(startDate, endDate);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE start_date <= $2 AND end_date >= $1"),
				[startDate, endDate]
			);
			expect(result).toEqual(mockEntries);
		});

		it("should find entries within date range with team filter", async () => {
			const startDate = new Date("2024-07-01");
			const endDate = new Date("2024-07-31");
			const teamId = "team123";

			mockPool.query.mockResolvedValue({ rows: [] });

			await CalendarEntryModel.findByDateRange(startDate, endDate, teamId);

			expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("AND team_id = $3"), [
				startDate,
				endDate,
				teamId
			]);
		});
	});

	describe("findConflicts", () => {
		it("should find conflicting entries for user", async () => {
			const userId = "user123";
			const startDate = new Date("2024-07-10");
			const endDate = new Date("2024-07-15");

			const mockConflicts = [
				{
					id: "456",
					user_id: userId,
					team_id: "team123",
					entry_type: "pto",
					title: "Existing vacation",
					start_date: new Date("2024-07-12"),
					end_date: new Date("2024-07-18"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockPool.query.mockResolvedValue({ rows: mockConflicts });

			const result = await CalendarEntryModel.findConflicts(userId, startDate, endDate);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE user_id = $1 AND start_date <= $3 AND end_date >= $2"),
				[userId, startDate, endDate]
			);
			expect(result).toEqual(mockConflicts);
		});

		it("should exclude specific entry when checking conflicts", async () => {
			const userId = "user123";
			const startDate = new Date("2024-07-10");
			const endDate = new Date("2024-07-15");
			const excludeId = "789";

			mockPool.query.mockResolvedValue({ rows: [] });

			await CalendarEntryModel.findConflicts(userId, startDate, endDate, excludeId);

			expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining("AND id != $4"), [
				userId,
				startDate,
				endDate,
				excludeId
			]);
		});
	});

	describe("calculateWorkingDaysImpact", () => {
		it("should calculate working days impact", async () => {
			const teamId = "team123";
			const startDate = new Date("2024-07-01");
			const endDate = new Date("2024-07-31");

			const mockEntries = [
				{
					user_id: "user1",
					start_date: new Date("2024-07-10"),
					end_date: new Date("2024-07-12")
				},
				{
					user_id: "user2",
					start_date: new Date("2024-07-15"),
					end_date: new Date("2024-07-17")
				}
			];

			mockPool.query.mockResolvedValue({ rows: mockEntries });

			const result = await CalendarEntryModel.calculateWorkingDaysImpact(teamId, startDate, endDate);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE team_id = $1 AND start_date <= $3 AND end_date >= $2"),
				[teamId, startDate, endDate]
			);
			expect(typeof result).toBe("number");
			expect(result).toBeGreaterThanOrEqual(0);
		});
	});

	describe("findByUser", () => {
		it("should find calendar entries for specific user", async () => {
			const userId = "user123";
			const mockEntries = [
				{
					id: "1",
					user_id: userId,
					team_id: "team123",
					entry_type: "pto",
					title: "Vacation",
					start_date: new Date("2024-07-15"),
					end_date: new Date("2024-07-20"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "2",
					user_id: userId,
					team_id: "team123",
					entry_type: "sick",
					title: "Sick Day",
					start_date: new Date("2024-07-10"),
					end_date: new Date("2024-07-10"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockPool.query.mockResolvedValue({ rows: mockEntries });

			const result = await CalendarEntryModel.findByUser(userId);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE user_id = $1"),
				[userId]
			);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("ORDER BY start_date DESC"),
				[userId]
			);
			expect(result).toEqual(mockEntries);
		});

		it("should return empty array when user has no entries", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await CalendarEntryModel.findByUser("user_no_entries");

			expect(result).toEqual([]);
		});

		it("should handle database errors", async () => {
			const dbError = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(dbError);

			await expect(CalendarEntryModel.findByUser("user123")).rejects.toThrow("Database connection failed");
		});
	});

	describe("findByTeam", () => {
		it("should find calendar entries for specific team", async () => {
			const teamId = "team123";
			const mockEntries = [
				{
					id: "1",
					user_id: "user1",
					team_id: teamId,
					entry_type: "pto",
					title: "Vacation",
					start_date: new Date("2024-07-15"),
					end_date: new Date("2024-07-20"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "2",
					user_id: "user2",
					team_id: teamId,
					entry_type: "holiday",
					title: "Independence Day",
					start_date: new Date("2024-07-04"),
					end_date: new Date("2024-07-04"),
					all_day: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockPool.query.mockResolvedValue({ rows: mockEntries });

			const result = await CalendarEntryModel.findByTeam(teamId);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("WHERE team_id = $1"),
				[teamId]
			);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("ORDER BY start_date DESC"),
				[teamId]
			);
			expect(result).toEqual(mockEntries);
		});

		it("should return empty array when team has no entries", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await CalendarEntryModel.findByTeam("team_no_entries");

			expect(result).toEqual([]);
		});

		it("should handle database errors", async () => {
			const dbError = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(dbError);

			await expect(CalendarEntryModel.findByTeam("team123")).rejects.toThrow("Database connection failed");
		});
	});

	describe("update", () => {
		const existingEntry: CalendarEntry = {
			id: "123",
			user_id: "user123",
			team_id: "team123",
			entry_type: "pto",
			title: "Original Title",
			description: "Original description",
			start_date: new Date("2024-07-01"),
			end_date: new Date("2024-07-05"),
			all_day: true,
			created_at: new Date(),
			updated_at: new Date()
		};

		it("should update calendar entry with valid data", async () => {
			const updateData = {
				title: "Updated Title",
				description: "Updated description",
				entry_type: "sick" as const
			};

			const updatedEntry = {
				...existingEntry,
				...updateData,
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [updatedEntry] });

			const result = await CalendarEntryModel.update("123", updateData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE calendar_entries SET"),
				["123", ...Object.values(updateData)]
			);
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("updated_at = NOW()"),
				["123", ...Object.values(updateData)]
			);
			expect(result).toEqual(updatedEntry);
		});

		it("should update partial fields", async () => {
			const updateData = {
				title: "New Title Only"
			};

			const updatedEntry = {
				...existingEntry,
				title: "New Title Only",
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [updatedEntry] });

			const result = await CalendarEntryModel.update("123", updateData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("title = $2"),
				["123", "New Title Only"]
			);
			expect(result).toEqual(updatedEntry);
		});

		it("should return null when no fields to update", async () => {
			const result = await CalendarEntryModel.update("123", {});

			expect(result).toBeNull();
			expect(mockPool.query).not.toHaveBeenCalled();
		});

		it("should return null when entry not found", async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await CalendarEntryModel.update("nonexistent", { title: "Test" });

			expect(result).toBeNull();
		});

		it("should handle database errors", async () => {
			const dbError = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(dbError);

			await expect(CalendarEntryModel.update("123", { title: "Test" })).rejects.toThrow("Database connection failed");
		});

		it("should update date fields correctly", async () => {
			const updateData = {
				start_date: new Date("2024-08-01"),
				end_date: new Date("2024-08-05"),
				all_day: false
			};

			const updatedEntry = {
				...existingEntry,
				...updateData,
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [updatedEntry] });

			const result = await CalendarEntryModel.update("123", updateData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("start_date = $2, end_date = $3, all_day = $4"),
				["123", ...Object.values(updateData)]
			);
			expect(result).toEqual(updatedEntry);
		});
	});

	describe("delete", () => {
		it("should delete calendar entry successfully", async () => {
			mockPool.query.mockResolvedValue({ rowCount: 1 });

			const result = await CalendarEntryModel.delete("123");

			expect(mockPool.query).toHaveBeenCalledWith("DELETE FROM calendar_entries WHERE id = $1", ["123"]);
			expect(result).toBe(true);
		});

		it("should return false when entry not found", async () => {
			mockPool.query.mockResolvedValue({ rowCount: 0 });

			const result = await CalendarEntryModel.delete("nonexistent");

			expect(result).toBe(false);
		});

		it("should handle null rowCount", async () => {
			mockPool.query.mockResolvedValue({ rowCount: null });

			const result = await CalendarEntryModel.delete("123");

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			const dbError = new Error("Database connection failed");
			mockPool.query.mockRejectedValue(dbError);

			await expect(CalendarEntryModel.delete("123")).rejects.toThrow("Database connection failed");
		});
	});
});
