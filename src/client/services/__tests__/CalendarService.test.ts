import { vi, describe, it, expect, beforeEach } from "vitest";
import { CalendarService } from "../CalendarService";
import type { CalendarEntry, CreateCalendarEntryData, Team, User } from "../../types";

// Mock fetch globally
global.fetch = vi.fn();

describe("CalendarService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Test data
	const mockCalendarEntry: CalendarEntry = {
		id: "entry-123",
		team_id: "team-123",
		user_id: "user-123",
		entry_type: "pto",
		title: "Vacation Day",
		start_date: "2025-01-15",
		end_date: "2025-01-15",
		description: "Personal time off",
		all_day: true,
		created_at: "2025-01-10T12:00:00Z",
		updated_at: "2025-01-10T12:00:00Z"
	};

	const mockTeam: Team = {
		id: "team-123",
		name: "Development Team",
		description: "Main development team",
		velocity_baseline: 20,
		sprint_length_days: 14,
		working_days_per_week: 5,
		working_days: [1, 2, 3, 4, 5],
		created_at: "2025-01-08T12:00:00Z",
		updated_at: "2025-01-08T12:00:00Z"
	};

	const mockUser: User = {
		id: "user-123",
		username: "johndoe",
		email: "john@example.com",
		first_name: "John",
		last_name: "Doe",
		role: "developer"
	};

	// Helper function to mock successful fetch response
	const mockSuccessResponse = <T>(data: T) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(data)
		} as Response);
	};

	// Helper function to mock error response
	const mockErrorResponse = (status: number, message: string) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status,
			statusText: status === 400 ? "Bad Request" : "Internal Server Error",
			json: () => Promise.resolve({ message })
		} as Response);
	};

	// Helper function to mock network error
	const mockNetworkError = () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
	};

	describe("getCalendarEntries", () => {
		it("should retrieve all calendar entries without filters", async () => {
			const mockEntries = [mockCalendarEntry, { ...mockCalendarEntry, id: "entry-456", title: "Holiday" }];
			mockSuccessResponse(mockEntries);

			const result = await CalendarService.getCalendarEntries();

			expect(result).toEqual(mockEntries);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries?");
		});

		it("should retrieve calendar entries with team filter", async () => {
			const mockEntries = [mockCalendarEntry];
			mockSuccessResponse(mockEntries);

			const result = await CalendarService.getCalendarEntries({ team_id: "team-123" });

			expect(result).toEqual(mockEntries);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries?team_id=team-123");
		});

		it("should retrieve calendar entries with month and year filters", async () => {
			const mockEntries = [mockCalendarEntry];
			mockSuccessResponse(mockEntries);

			const result = await CalendarService.getCalendarEntries({
				month: "01",
				year: "2025"
			});

			expect(result).toEqual(mockEntries);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries?month=01&year=2025");
		});

		it("should retrieve calendar entries with all filters", async () => {
			const mockEntries = [mockCalendarEntry];
			mockSuccessResponse(mockEntries);

			const result = await CalendarService.getCalendarEntries({
				team_id: "team-123",
				month: "01",
				year: "2025"
			});

			expect(result).toEqual(mockEntries);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries?team_id=team-123&month=01&year=2025");
		});

		it("should handle empty calendar entries list", async () => {
			mockSuccessResponse([]);

			const result = await CalendarService.getCalendarEntries();

			expect(result).toEqual([]);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries?");
		});

		it("should handle API errors when retrieving entries", async () => {
			mockErrorResponse(500, "Server error");

			await expect(CalendarService.getCalendarEntries()).rejects.toThrow("Server error");
		});

		it("should handle network errors when retrieving entries", async () => {
			mockNetworkError();

			await expect(CalendarService.getCalendarEntries()).rejects.toThrow("Network error");
		});
	});

	describe("createCalendarEntry", () => {
		const entryData: CreateCalendarEntryData = {
			team_id: "team-123",
			user_id: "user-123",
			entry_type: "pto",
			title: "New Vacation",
			start_date: "2025-01-20",
			end_date: "2025-01-20",
			description: "Personal time off",
			all_day: true
		};

		it("should create calendar entry successfully", async () => {
			const newEntry = { ...mockCalendarEntry, title: "New Vacation" };
			mockSuccessResponse(newEntry);

			const result = await CalendarService.createCalendarEntry(entryData);

			expect(result).toEqual(newEntry);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(entryData)
			});
		});

		it("should handle validation errors when creating entry", async () => {
			mockErrorResponse(400, "Title is required");

			await expect(CalendarService.createCalendarEntry(entryData)).rejects.toThrow("Title is required");
		});

		it("should handle API errors when creating entry", async () => {
			mockErrorResponse(500, "Server error");

			await expect(CalendarService.createCalendarEntry(entryData)).rejects.toThrow("Server error");
		});

		it("should handle network errors when creating entry", async () => {
			mockNetworkError();

			await expect(CalendarService.createCalendarEntry(entryData)).rejects.toThrow("Network error");
		});
	});

	describe("updateCalendarEntry", () => {
		const entryData: CreateCalendarEntryData = {
			team_id: "team-123",
			user_id: "user-123",
			entry_type: "pto",
			title: "Updated Vacation",
			start_date: "2025-01-21",
			end_date: "2025-01-21",
			description: "Updated personal time off",
			all_day: true
		};

		it("should update calendar entry successfully", async () => {
			const updatedEntry = { ...mockCalendarEntry, title: "Updated Vacation" };
			mockSuccessResponse(updatedEntry);

			const result = await CalendarService.updateCalendarEntry("entry-123", entryData);

			expect(result).toEqual(updatedEntry);
			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries/entry-123", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(entryData)
			});
		});

		it("should handle entry not found error when updating", async () => {
			mockErrorResponse(404, "Calendar entry not found");

			await expect(CalendarService.updateCalendarEntry("nonexistent", entryData)).rejects.toThrow(
				"Calendar entry not found"
			);
		});

		it("should handle validation errors when updating entry", async () => {
			mockErrorResponse(400, "Invalid date range");

			await expect(CalendarService.updateCalendarEntry("entry-123", entryData)).rejects.toThrow(
				"Invalid date range"
			);
		});

		it("should handle API errors when updating entry", async () => {
			mockErrorResponse(500, "Server error");

			await expect(CalendarService.updateCalendarEntry("entry-123", entryData)).rejects.toThrow("Server error");
		});
	});

	describe("deleteCalendarEntry", () => {
		it("should delete calendar entry successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true
			} as Response);

			await CalendarService.deleteCalendarEntry("entry-123");

			expect(fetch).toHaveBeenCalledWith("/api/v1/calendar_entries/entry-123", {
				method: "DELETE"
			});
		});

		it("should handle entry not found error when deleting", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: () => Promise.resolve({ message: "Calendar entry not found" })
			} as Response);

			await expect(CalendarService.deleteCalendarEntry("nonexistent")).rejects.toThrow(
				"Calendar entry not found"
			);
		});

		it("should handle API errors when deleting entry", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({ message: "Server error" })
			} as Response);

			await expect(CalendarService.deleteCalendarEntry("entry-123")).rejects.toThrow("Server error");
		});

		it("should handle malformed JSON error response when deleting", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(CalendarService.deleteCalendarEntry("entry-123")).rejects.toThrow("Unknown error");
		});
	});

	describe("getInitializationData", () => {
		it("should retrieve teams and users successfully", async () => {
			const mockTeams = [mockTeam, { ...mockTeam, id: "team-456", name: "QA Team" }];
			const mockUsers = [mockUser, { ...mockUser, id: "user-456", email: "jane@example.com" }];

			// Mock parallel fetch calls
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockTeams)
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockUsers)
				} as Response);

			const result = await CalendarService.getInitializationData();

			expect(result).toEqual({ teams: mockTeams, users: mockUsers });
			expect(fetch).toHaveBeenCalledTimes(2);
			expect(fetch).toHaveBeenNthCalledWith(1, "/api/v1/teams");
			expect(fetch).toHaveBeenNthCalledWith(2, "/api/v1/users");
		});

		it("should handle teams API error", async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error"
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([])
				} as Response);

			await expect(CalendarService.getInitializationData()).rejects.toThrow("Failed to load initial data");
		});

		it("should handle users API error", async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([])
				} as Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error"
				} as Response);

			await expect(CalendarService.getInitializationData()).rejects.toThrow("Failed to load initial data");
		});

		it("should handle both APIs failing", async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error"
				} as Response)
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					statusText: "Internal Server Error"
				} as Response);

			await expect(CalendarService.getInitializationData()).rejects.toThrow("Failed to load initial data");
		});

		it("should handle network errors for initialization data", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

			await expect(CalendarService.getInitializationData()).rejects.toThrow("Network error");
		});
	});

	describe("validateCalendarEntry", () => {
		it("should validate valid calendar entry data successfully", () => {
			const validEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "Valid Entry",
				start_date: "2025-01-15",
				end_date: "2025-01-16",
				description: "Valid description",
				all_day: false
			};

			const result = CalendarService.validateCalendarEntry(validEntryData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should validate entry data without optional fields", () => {
			const validEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "holiday",
				title: "Holiday",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(validEntryData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should return error for missing team_id", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "",
				user_id: "user-123",
				entry_type: "pto",
				title: "Valid Title",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.team_id).toBe("Please select a team");
		});

		it("should return error for missing user_id", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "",
				entry_type: "pto",
				title: "Valid Title",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.user_id).toBe("Please select a team member");
		});

		it("should return error for empty title", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.title).toBe("Title is required");
		});

		it("should return error for whitespace-only title", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "   ",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.title).toBe("Title is required");
		});

		it("should return error for missing start_date", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "Valid Title",
				start_date: "",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.start_date).toBe("Start date is required");
		});

		it("should return error for missing end_date", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "Valid Title",
				start_date: "2025-01-15",
				end_date: ""
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.end_date).toBe("End date is required");
		});

		it("should return error when end_date is before start_date", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "Valid Title",
				start_date: "2025-01-20",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.end_date).toBe("End date must be after start date");
		});

		it("should allow same start and end dates", () => {
			const validEntryData: CreateCalendarEntryData = {
				team_id: "team-123",
				user_id: "user-123",
				entry_type: "pto",
				title: "Single Day",
				start_date: "2025-01-15",
				end_date: "2025-01-15"
			};

			const result = CalendarService.validateCalendarEntry(validEntryData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should return multiple validation errors", () => {
			const invalidEntryData: CreateCalendarEntryData = {
				team_id: "",
				user_id: "",
				entry_type: "pto",
				title: "",
				start_date: "",
				end_date: ""
			};

			const result = CalendarService.validateCalendarEntry(invalidEntryData);

			expect(result.isValid).toBe(false);
			expect(result.errors.team_id).toBe("Please select a team");
			expect(result.errors.user_id).toBe("Please select a team member");
			expect(result.errors.title).toBe("Title is required");
			expect(result.errors.start_date).toBe("Start date is required");
			expect(result.errors.end_date).toBe("End date is required");
		});
	});

	describe("error handling", () => {
		it("should handle malformed JSON responses", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(CalendarService.getCalendarEntries()).rejects.toThrow("Unknown error");
		});

		it("should handle unknown error format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(CalendarService.getCalendarEntries()).rejects.toThrow("HTTP 500: Internal Server Error");
		});

		it("should handle fetch network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

			await expect(CalendarService.getCalendarEntries()).rejects.toThrow("Failed to fetch");
		});
	});
});
