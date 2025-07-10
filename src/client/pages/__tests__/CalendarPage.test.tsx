import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import CalendarPage from "../CalendarPage";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

const mockTeams = [
	{
		id: "team1",
		name: "Engineering Team",
		description: "Software development team"
	}
];

const mockUsers = [
	{
		id: "user1",
		email: "user1@example.com",
		first_name: "John",
		last_name: "Doe",
		team_id: "team1"
	}
];

describe("CalendarPage", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		// Mock all CalendarPage API calls by default with robust URL-based implementation
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});
	});

	it("renders calendar page with main elements", async () => {
		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Team Calendar")).toBeInTheDocument();
		});

		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();
		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument(); // Month selector with year
	});

	it("displays loading state initially", async () => {
		// Mock delayed responses to capture loading state
		mockFetch.mockClear();
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return new Promise(resolve =>
					setTimeout(() => resolve({ ok: true, json: async () => mockTeams }), 100)
				);
			}
			if (url.includes("/api/v1/users")) {
				return new Promise(resolve =>
					setTimeout(() => resolve({ ok: true, json: async () => mockUsers }), 100)
				);
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		render(<CalendarPage />);

		// Should show loading state initially
		expect(screen.getByText("Loading calendar entries...")).toBeInTheDocument();

		// Wait for loading to complete
		await waitFor(() => {
			expect(screen.queryByText("Loading calendar entries...")).not.toBeInTheDocument();
		});
	});

	it("loads and displays calendar entries", async () => {
		const mockEntries = [
			{
				id: "1",
				title: "Summer Vacation",
				description: "Annual summer vacation",
				start_date: "2025-07-15",
				end_date: "2025-07-25",
				entry_type: "pto",
				user_id: "user1",
				team_id: "team1",
				all_day: true,
				created_at: "2025-07-01T00:00:00Z",
				updated_at: "2025-07-01T00:00:00Z"
			}
		];

		// Clear and set up robust mocking for this test
		mockFetch.mockClear();
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => mockEntries });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Summer Vacation")).toBeInTheDocument();
		});

		expect(screen.getByText("Annual summer vacation")).toBeInTheDocument();
		expect(screen.getByText("PTO / Vacation")).toBeInTheDocument();
	});

	it("opens create modal when Create Entry button is clicked", async () => {
		const user = userEvent.setup();

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		});

		const createButton = screen.getByText("Add Calendar Entry");
		await user.click(createButton);

		expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		expect(screen.getByLabelText("Start Date *")).toBeInTheDocument();
		expect(screen.getByLabelText("End Date *")).toBeInTheDocument();
	});

	it("validates form fields when creating entry", async () => {
		const user = userEvent.setup();

		render(<CalendarPage />);

		await waitFor(() => {
			expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Wait for modal form to be ready
		await waitFor(() => {
			expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		});

		// Try to submit empty form - this should trigger validation
		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		// The CalendarPage component shows validation errors for:
		// team_id, user_id, title, start_date, end_date
		await waitFor(() => {
			expect(screen.getByText("Please select a team")).toBeInTheDocument();
		});

		// Also check for title validation
		await waitFor(() => {
			expect(screen.getByText("Title is required")).toBeInTheDocument();
		});
	});

	it("validates date range when creating entry", async () => {
		const user = userEvent.setup();

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Fill form with invalid date range (end before start)
		await user.type(screen.getByLabelText("Title *"), "Test Entry");
		await user.type(screen.getByLabelText("Start Date *"), "2025-07-20");
		await user.type(screen.getByLabelText("End Date *"), "2025-07-15");

		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("End date must be after start date")).toBeInTheDocument();
		});
	});

	it("successfully creates new calendar entry", async () => {
		const user = userEvent.setup();

		// Mock successful creation with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "POST") {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						id: "2",
						title: "New Entry",
						description: "Test description",
						start_date: "2025-07-15",
						end_date: "2025-07-15",
						entry_type: "pto",
						user_id: "user1",
						team_id: "team1"
					})
				});
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Fill form with valid data
		await user.type(screen.getByLabelText("Title *"), "New Entry");
		await user.type(screen.getByLabelText("Description"), "Test description");
		await user.type(screen.getByLabelText("Start Date *"), "2025-07-15");
		await user.type(screen.getByLabelText("End Date *"), "2025-07-15");
		await user.selectOptions(screen.getByLabelText("Entry Type *"), "pto");

		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Calendar entry created successfully!")).toBeInTheDocument();
		});

		// Modal should close
		expect(screen.queryByText("Add Calendar Entry")).not.toBeInTheDocument();
	});

	it("handles API errors when creating entry", async () => {
		const user = userEvent.setup();

		// Mock API error with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "POST") {
				return Promise.resolve({
					ok: false,
					status: 400,
					json: async () => ({ message: "Invalid data provided" })
				});
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		// Open create modal and fill form
		await user.click(screen.getByText("Add Calendar Entry"));
		await user.type(screen.getByLabelText("Title *"), "Test Entry");
		await user.type(screen.getByLabelText("Start Date *"), "2025-07-15");
		await user.type(screen.getByLabelText("End Date *"), "2025-07-15");

		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Invalid data provided")).toBeInTheDocument();
		});
	});

	it("filters entries by team selection", async () => {
		// Clear and set up robust mocking for this test
		mockFetch.mockClear();
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				// Handle both initial load and filtered load
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		const user = userEvent.setup();
		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();
		});

		const teamFilter = screen.getByDisplayValue("All Teams");
		await user.selectOptions(teamFilter, "team1");

		// Should trigger API call with team filter
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/calendar_entries?team_id=team1&month=07&year=2025");
		});
	});

	it("filters entries by month selection", async () => {
		// Clear and set up robust mocking for this test
		mockFetch.mockClear();
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				// Handle both initial load and filtered load
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		const user = userEvent.setup();
		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument();
		});

		const monthFilter = screen.getByDisplayValue(/\d{4}/); // Current year
		await user.selectOptions(monthFilter, "2025-08");

		// Should trigger API call with month filter
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/calendar_entries?month=08&year=2025");
		});
	});

	it("opens edit modal when entry is clicked", async () => {
		const user = userEvent.setup();

		const mockEntries = [
			{
				id: "1",
				title: "Existing Entry",
				description: "Test description",
				start_date: "2025-07-15",
				end_date: "2025-07-15",
				entry_type: "pto",
				user_id: "user1",
				team_id: "team1",
				all_day: true,
				created_at: "2025-07-01T00:00:00Z",
				updated_at: "2025-07-01T00:00:00Z"
			}
		];

		// Mock initial load with entry data
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => mockEntries });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Existing Entry")).toBeInTheDocument();
		});

		// Click on the edit button for the entry
		const editButton = screen.getByTitle("Edit entry");
		await user.click(editButton);

		expect(screen.getByText("Edit Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Existing Entry")).toBeInTheDocument();
	});

	it("successfully updates existing entry", async () => {
		const user = userEvent.setup();

		const mockEntries = [
			{
				id: "1",
				title: "Original Entry",
				description: "Original description",
				start_date: "2025-07-15",
				end_date: "2025-07-15",
				entry_type: "pto",
				user_id: "user1",
				team_id: "team1",
				all_day: true,
				created_at: "2025-07-01T00:00:00Z",
				updated_at: "2025-07-01T00:00:00Z"
			}
		];

		// Mock initial load and update with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "PUT") {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						...mockEntries[0],
						title: "Updated Entry"
					})
				});
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => mockEntries });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Original Entry")).toBeInTheDocument();
		});

		// Click to edit
		const editButton = screen.getByTitle("Edit entry");
		await user.click(editButton);

		// Update title
		const titleInput = screen.getByDisplayValue("Original Entry");
		await user.clear(titleInput);
		await user.type(titleInput, "Updated Entry");

		const updateButton = screen.getByText("Update Entry");
		await user.click(updateButton);

		await waitFor(() => {
			expect(screen.getByText("Calendar entry updated successfully!")).toBeInTheDocument();
		});
	});

	it("successfully deletes entry", async () => {
		const user = userEvent.setup();

		const mockEntries = [
			{
				id: "1",
				title: "Entry to Delete",
				description: "Will be deleted",
				start_date: "2025-07-15",
				end_date: "2025-07-15",
				entry_type: "pto",
				user_id: "user1",
				team_id: "team1",
				all_day: true,
				created_at: "2025-07-01T00:00:00Z",
				updated_at: "2025-07-01T00:00:00Z"
			}
		];

		// Mock initial load and deletion with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "DELETE") {
				return Promise.resolve({
					ok: true,
					json: async () => ({ message: "Calendar entry deleted successfully" })
				});
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => mockEntries });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Entry to Delete")).toBeInTheDocument();
		});

		// Click delete button
		const deleteButton = screen.getByTitle("Delete entry");
		await user.click(deleteButton);

		// Confirm deletion
		const confirmButton = screen.getByText("Delete Entry");
		await user.click(confirmButton);

		await waitFor(() => {
			expect(screen.getByText("Calendar entry deleted successfully!")).toBeInTheDocument();
		});
	});

	it("closes modal when cancel button is clicked", async () => {
		const user = userEvent.setup();
		await act(async () => {
			render(<CalendarPage />);
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));
		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();

		// Click cancel
		await user.click(screen.getByText("Cancel"));

		expect(screen.queryByText("Add Calendar Entry")).not.toBeInTheDocument();
	});

	it("displays empty state when no entries", async () => {
		// Mock empty entries response
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => mockTeams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => [] });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("No calendar entries for the selected period.")).toBeInTheDocument();
		});
	});

	it("handles network errors gracefully", async () => {
		// Mock network error for initialization data
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		await act(async () => {
			render(<CalendarPage />);
		});

		await waitFor(() => {
			expect(screen.getByText("Error loading calendar entries. Please try again.")).toBeInTheDocument();
		});
	});
});
