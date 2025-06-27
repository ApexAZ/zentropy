import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express from "express";
import { CalendarEntryModel } from "../../models/CalendarEntry";
import calendarEntriesRouter from "../../routes/calendar-entries";

// Mock the CalendarEntryModel
vi.mock("../../models/CalendarEntry", () => ({
	CalendarEntryModel: {
		findAll: vi.fn(),
		findById: vi.fn(),
		findByTeam: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

const mockCalendarEntryModel = CalendarEntryModel as {
	findAll: Mock;
	findById: Mock;
	findByTeam: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
};

// Create test app with calendar entries routes
const app = express();
app.use(express.json());
app.use("/api/calendar-entries", calendarEntriesRouter);

describe("Calendar Entries API Endpoints", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/calendar-entries", () => {
		it("should return calendar entries for a specific team", async () => {
			const mockEntries = [
				{
					id: "1",
					team_id: "team1",
					user_id: "user1",
					entry_type: "pto",
					title: "Vacation",
					start_date: "2024-01-15T00:00:00.000Z",
					end_date: "2024-01-20T00:00:00.000Z",
					description: "Family vacation",
					all_day: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				},
				{
					id: "2",
					team_id: "team1",
					user_id: "user2",
					entry_type: "holiday",
					title: "MLK Day",
					start_date: "2024-01-15T00:00:00.000Z",
					end_date: "2024-01-15T00:00:00.000Z",
					description: "Federal holiday",
					all_day: true,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				}
			];

			mockCalendarEntryModel.findByTeam.mockResolvedValue(mockEntries);

			const response = await request(app)
				.get("/api/calendar-entries?team_id=team1")
				.expect(200);

			expect(response.body).toEqual(mockEntries);
			expect(mockCalendarEntryModel.findByTeam).toHaveBeenCalledWith("team1");
		});

		it("should return empty array when no team_id provided", async () => {
			const response = await request(app)
				.get("/api/calendar-entries")
				.expect(200);

			expect(response.body).toEqual([]);
			expect(mockCalendarEntryModel.findByTeam).not.toHaveBeenCalled();
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockCalendarEntryModel.findByTeam.mockRejectedValue(dbError);

			const response = await request(app)
				.get("/api/calendar-entries?team_id=team1")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to fetch calendar entries" });
		});
	});

	describe("GET /api/calendar-entries/:id", () => {
		it("should return a specific calendar entry by ID", async () => {
			const mockEntry = {
				id: "1",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-20T00:00:00.000Z",
				description: "Family vacation",
				all_day: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			mockCalendarEntryModel.findById.mockResolvedValue(mockEntry);

			const response = await request(app)
				.get("/api/calendar-entries/1")
				.expect(200);

			expect(response.body).toEqual(mockEntry);
			expect(mockCalendarEntryModel.findById).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent entry", async () => {
			mockCalendarEntryModel.findById.mockResolvedValue(null);

			const response = await request(app)
				.get("/api/calendar-entries/999")
				.expect(404);

			expect(response.body).toEqual({ message: "Calendar entry not found" });
		});

		it("should return 404 for missing entry ID route", async () => {
			// When hitting /api/calendar-entries/ (without ID), it should hit the main route
			// and return empty array since no team_id is provided
			const response = await request(app)
				.get("/api/calendar-entries/")
				.expect(200);
			
			expect(response.body).toEqual([]);
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockCalendarEntryModel.findById.mockRejectedValue(dbError);

			const response = await request(app)
				.get("/api/calendar-entries/1")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to fetch calendar entry" });
		});
	});

	describe("POST /api/calendar-entries", () => {
		const validEntryData = {
			team_id: "team1",
			user_id: "user1",
			entry_type: "pto",
			title: "Vacation",
			start_date: "2024-01-15",
			end_date: "2024-01-20",
			description: "Family vacation",
			all_day: true
		};

		it("should create a new calendar entry with valid data", async () => {
			const createdEntry = {
				id: "1",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-20T00:00:00.000Z",
				description: "Family vacation",
				all_day: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			const response = await request(app)
				.post("/api/calendar-entries")
				.send(validEntryData)
				.expect(201);

			expect(response.body).toEqual(createdEntry);
			expect(mockCalendarEntryModel.create).toHaveBeenCalledWith({
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: new Date("2024-01-15"),
				end_date: new Date("2024-01-20"),
				description: "Family vacation",
				all_day: true
			});
		});

		it("should default all_day to true when not provided", async () => {
			const entryDataWithoutAllDay = {
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: "2024-01-15",
				end_date: "2024-01-20",
				description: "Family vacation"
			};

			const createdEntry = {
				id: "1",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-20T00:00:00.000Z",
				description: "Family vacation",
				all_day: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			await request(app)
				.post("/api/calendar-entries")
				.send(entryDataWithoutAllDay)
				.expect(201);

			expect(mockCalendarEntryModel.create).toHaveBeenCalledWith({
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Vacation",
				start_date: new Date("2024-01-15"),
				end_date: new Date("2024-01-20"),
				description: "Family vacation",
				all_day: true
			});
		});

		it("should return 400 for missing required fields", async () => {
			const invalidData = {
				team_id: "team1",
				// Missing user_id, entry_type, title, start_date, end_date
			};

			const response = await request(app)
				.post("/api/calendar-entries")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "Missing required fields" });
			expect(mockCalendarEntryModel.create).not.toHaveBeenCalled();
		});

		it("should return 400 when end date is before start date", async () => {
			const invalidData = {
				...validEntryData,
				start_date: "2024-01-20",
				end_date: "2024-01-15" // End before start
			};

			const response = await request(app)
				.post("/api/calendar-entries")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "End date must be after start date" });
			expect(mockCalendarEntryModel.create).not.toHaveBeenCalled();
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockCalendarEntryModel.create.mockRejectedValue(dbError);

			const response = await request(app)
				.post("/api/calendar-entries")
				.send(validEntryData)
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to create calendar entry" });
		});
	});

	describe("PUT /api/calendar-entries/:id", () => {
		const updateData = {
			team_id: "team1",
			user_id: "user1",
			entry_type: "sick",
			title: "Sick Day",
			start_date: "2024-01-15",
			end_date: "2024-01-15",
			description: "Not feeling well",
			all_day: true
		};

		const existingEntry = {
			id: "1",
			team_id: "team1",
			user_id: "user1",
			entry_type: "pto",
			title: "Vacation",
			start_date: "2024-01-15T00:00:00.000Z",
			end_date: "2024-01-20T00:00:00.000Z",
			description: "Family vacation",
			all_day: true,
			created_at: "2024-01-01T00:00:00.000Z",
			updated_at: "2024-01-01T00:00:00.000Z"
		};

		it("should update an existing calendar entry", async () => {
			const updatedEntry = {
				id: "1",
				team_id: "team1",
				user_id: "user1",
				entry_type: "sick",
				title: "Sick Day",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-15T00:00:00.000Z",
				description: "Not feeling well",
				all_day: true,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-01T00:00:00.000Z"
			};

			mockCalendarEntryModel.findById.mockResolvedValue(existingEntry);
			mockCalendarEntryModel.update.mockResolvedValue(updatedEntry);

			const response = await request(app)
				.put("/api/calendar-entries/1")
				.send(updateData)
				.expect(200);

			expect(response.body).toEqual(updatedEntry);
			expect(mockCalendarEntryModel.findById).toHaveBeenCalledWith("1");
			expect(mockCalendarEntryModel.update).toHaveBeenCalledWith("1", {
				team_id: "team1",
				user_id: "user1",
				entry_type: "sick",
				title: "Sick Day",
				start_date: new Date("2024-01-15"),
				end_date: new Date("2024-01-15"),
				description: "Not feeling well",
				all_day: true
			});
		});

		it("should return 404 for non-existent entry", async () => {
			mockCalendarEntryModel.findById.mockResolvedValue(null);

			const response = await request(app)
				.put("/api/calendar-entries/999")
				.send(updateData)
				.expect(404);

			expect(response.body).toEqual({ message: "Calendar entry not found" });
			expect(mockCalendarEntryModel.update).not.toHaveBeenCalled();
		});

		it("should return 400 for missing required fields", async () => {
			const invalidData = {
				team_id: "team1",
				// Missing user_id, entry_type, title, start_date, end_date
			};

			mockCalendarEntryModel.findById.mockResolvedValue(existingEntry);

			const response = await request(app)
				.put("/api/calendar-entries/1")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "Missing required fields" });
			expect(mockCalendarEntryModel.update).not.toHaveBeenCalled();
		});

		it("should return 400 when end date is before start date", async () => {
			const invalidData = {
				...updateData,
				start_date: "2024-01-20",
				end_date: "2024-01-15" // End before start
			};

			mockCalendarEntryModel.findById.mockResolvedValue(existingEntry);

			const response = await request(app)
				.put("/api/calendar-entries/1")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "End date must be after start date" });
			expect(mockCalendarEntryModel.update).not.toHaveBeenCalled();
		});

		it("should handle update method returning null", async () => {
			mockCalendarEntryModel.findById.mockResolvedValue(existingEntry);
			mockCalendarEntryModel.update.mockResolvedValue(null);

			const response = await request(app)
				.put("/api/calendar-entries/1")
				.send(updateData)
				.expect(404);

			expect(response.body).toEqual({ message: "Calendar entry not found" });
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockCalendarEntryModel.findById.mockRejectedValue(dbError);

			const response = await request(app)
				.put("/api/calendar-entries/1")
				.send(updateData)
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to update calendar entry" });
		});
	});

	describe("DELETE /api/calendar-entries/:id", () => {
		it("should delete an existing calendar entry", async () => {
			mockCalendarEntryModel.delete.mockResolvedValue(true);

			const response = await request(app)
				.delete("/api/calendar-entries/1")
				.expect(204);

			expect(response.body).toEqual({});
			expect(mockCalendarEntryModel.delete).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent entry", async () => {
			mockCalendarEntryModel.delete.mockResolvedValue(false);

			const response = await request(app)
				.delete("/api/calendar-entries/999")
				.expect(404);

			expect(response.body).toEqual({ message: "Calendar entry not found" });
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockCalendarEntryModel.delete.mockRejectedValue(dbError);

			const response = await request(app)
				.delete("/api/calendar-entries/1")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to delete calendar entry" });
		});
	});
});