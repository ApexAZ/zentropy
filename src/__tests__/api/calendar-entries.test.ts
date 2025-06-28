import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express from "express";
import { CalendarEntryModel } from "../../models/CalendarEntry";
import calendarEntriesRouter from "../../routes/calendar-entries";

// Mock the CalendarEntryModel
vi.mock("../../models/CalendarEntry", () => ({
	CalendarEntryModel: {
		findById: vi.fn(),
		findByTeam: vi.fn(),
		findByUser: vi.fn(),
		findByDateRange: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		findConflicts: vi.fn(),
		calculateWorkingDaysImpact: vi.fn()
	}
}));

// Mock the session authentication middleware
vi.mock("../../middleware/session-auth", () => ({
	default: vi.fn((req: any, _res: any, next: any) => {
		// Mock authenticated user
		req.user = {
			id: "mock-user-id",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User",
			role: "team_member",
			is_active: true
		};
		next();
	})
}));

const mockCalendarEntryModel = CalendarEntryModel as unknown as {
	findById: Mock;
	findByTeam: Mock;
	findByUser: Mock;
	findByDateRange: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	findConflicts: Mock;
	calculateWorkingDaysImpact: Mock;
};

// Create test app with calendar entries routes
const app = express();
app.use(express.json());
app.use("/api/calendar-entries", calendarEntriesRouter);

describe("Calendar Entries API - Route Layer Specifics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Query Parameter Handling", () => {
		it("should route team_id query to findByTeam method", async () => {
			const mockEntries = [
				{
					id: "1",
					team_id: "team1",
					user_id: "user1",
					entry_type: "pto",
					title: "Vacation",
					start_date: "2024-01-15T00:00:00.000Z",
					end_date: "2024-01-20T00:00:00.000Z",
					all_day: true
				}
			];

			mockCalendarEntryModel.findByTeam.mockResolvedValue(mockEntries);

			await request(app).get("/api/calendar-entries?team_id=team1").expect(200);

			expect(mockCalendarEntryModel.findByTeam).toHaveBeenCalledWith("team1");
			expect(mockCalendarEntryModel.findByUser).not.toHaveBeenCalled();
		});

		it("should handle unknown query parameters gracefully", async () => {
			// Route only supports team_id, not user_id
			const response = await request(app).get("/api/calendar-entries?user_id=user1").expect(200);

			// Should return empty array for unknown query params
			expect(response.body).toEqual([]);
			expect(mockCalendarEntryModel.findByUser).not.toHaveBeenCalled();
			expect(mockCalendarEntryModel.findByTeam).not.toHaveBeenCalled();
		});

		it("should return empty array when no team_id provided", async () => {
			const response = await request(app).get("/api/calendar-entries").expect(200);

			// Route returns empty array when no team_id is provided
			expect(response.body).toEqual([]);
			expect(mockCalendarEntryModel.findByTeam).not.toHaveBeenCalled();
			expect(mockCalendarEntryModel.findByUser).not.toHaveBeenCalled();
		});
	});

	describe("Date Format Validation", () => {
		it("should reject end date before start date", async () => {
			const response = await request(app)
				.post("/api/calendar-entries")
				.send({
					team_id: "team1",
					user_id: "user1",
					entry_type: "pto",
					title: "Invalid date order",
					start_date: "2024-01-20T00:00:00.000Z",
					end_date: "2024-01-15T00:00:00.000Z" // Before start date
				})
				.expect(400);

			expect(response.body).toEqual({ message: "End date must be after start date" });
			expect(mockCalendarEntryModel.create).not.toHaveBeenCalled();
		});

		it("should convert date strings to Date objects for model", async () => {
			const createdEntry = {
				id: "new-entry-123",
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Date conversion test",
				start_date: new Date("2024-01-15T08:00:00.000Z"),
				end_date: new Date("2024-01-15T17:00:00.000Z"),
				all_day: false
			};

			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			await request(app)
				.post("/api/calendar-entries")
				.send({
					team_id: "team1",
					user_id: "user1",
					entry_type: "pto",
					title: "Date conversion test",
					start_date: "2024-01-15T08:00:00.000Z",
					end_date: "2024-01-15T17:00:00.000Z",
					all_day: false
				})
				.expect(201);

			// Verify model was called with Date objects, not strings
			const modelCall = mockCalendarEntryModel.create.mock.calls[0][0];
			expect(modelCall.start_date).toBeInstanceOf(Date);
			expect(modelCall.end_date).toBeInstanceOf(Date);
			expect(modelCall.start_date.toISOString()).toBe("2024-01-15T08:00:00.000Z");
			expect(modelCall.end_date.toISOString()).toBe("2024-01-15T17:00:00.000Z");
		});
	});

	describe("Required Field Validation", () => {
		it("should require all mandatory fields", async () => {
			const response = await request(app)
				.post("/api/calendar-entries")
				.send({
					team_id: "team1",
					user_id: "user1"
					// Missing: entry_type, title, start_date, end_date
				})
				.expect(400);

			expect(response.body).toEqual({ message: "Missing required fields" });
			expect(mockCalendarEntryModel.create).not.toHaveBeenCalled();
		});

		it("should pass through entry_type without validation", async () => {
			// Route doesn't validate entry_type - passes through to model
			const createdEntry = {
				id: "new-entry-123",
				team_id: "team1",
				user_id: "user1",
				entry_type: "custom_type", // Non-standard type
				title: "Custom type test",
				start_date: new Date("2024-01-15T00:00:00.000Z"),
				end_date: new Date("2024-01-15T00:00:00.000Z"),
				all_day: true
			};

			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			await request(app)
				.post("/api/calendar-entries")
				.send({
					team_id: "team1",
					user_id: "user1",
					entry_type: "custom_type",
					title: "Custom type test",
					start_date: "2024-01-15T00:00:00.000Z",
					end_date: "2024-01-15T00:00:00.000Z",
					all_day: true
				})
				.expect(201);

			// Verify route accepts any entry_type and passes to model
			const modelCall = mockCalendarEntryModel.create.mock.calls[0][0];
			expect(modelCall.entry_type).toBe("custom_type");
		});
	});

	describe("Request Body Sanitization", () => {
		it("should handle optional description field correctly", async () => {
			const entryWithoutDescription = {
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "No description",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-15T00:00:00.000Z",
				all_day: true
			};

			const createdEntry = { id: "new-123", ...entryWithoutDescription };
			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			await request(app).post("/api/calendar-entries").send(entryWithoutDescription).expect(201);

			// Verify model is called with description: undefined when not provided
			const modelCall = mockCalendarEntryModel.create.mock.calls[0][0];
			expect(modelCall.description).toBeUndefined();
			expect(modelCall.team_id).toBe("team1");
			expect(modelCall.all_day).toBe(true);
		});

		it("should handle all_day default value correctly", async () => {
			const entryWithoutAllDay = {
				team_id: "team1",
				user_id: "user1",
				entry_type: "pto",
				title: "Default all_day",
				start_date: "2024-01-15T00:00:00.000Z",
				end_date: "2024-01-15T00:00:00.000Z"
				// all_day not specified
			};

			const createdEntry = { id: "new-123", ...entryWithoutAllDay, all_day: true };
			mockCalendarEntryModel.create.mockResolvedValue(createdEntry);

			await request(app).post("/api/calendar-entries").send(entryWithoutAllDay).expect(201);

			// Verify model receives default all_day: true when not specified
			const modelCall = mockCalendarEntryModel.create.mock.calls[0][0];
			expect(modelCall.all_day).toBe(true);
		});
	});
});
