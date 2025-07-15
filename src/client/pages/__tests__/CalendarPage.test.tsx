import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import CalendarPage from "../CalendarPage";
import { ToastProvider } from "../../contexts/ToastContext";

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
	// Helper function to render CalendarPage with required providers
	const renderCalendarPage = () => {
		return render(
			<ToastProvider>
				<CalendarPage />
			</ToastProvider>
		);
	};

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
			renderCalendarPage();
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

		renderCalendarPage();

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
			renderCalendarPage();
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
			renderCalendarPage();
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

		await act(async () => {
			renderCalendarPage();
		});

		await waitFor(() => {
			expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Wait for modal form to be ready
		await waitFor(() => {
			expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		});

		// Verify that form is empty initially
		const teamSelect = screen.getByLabelText("Team *") as HTMLSelectElement;
		const titleInput = screen.getByLabelText("Title *") as HTMLInputElement;
		expect(teamSelect.value).toBe("");
		expect(titleInput.value).toBe("");

		// Try to submit empty form - this should trigger validation
		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		// Check immediately after form submission for validation errors
		// The validation should happen synchronously when form is submitted
		expect(screen.getByText("Please select a team")).toBeInTheDocument();
		expect(screen.getByText("Title is required")).toBeInTheDocument();
		expect(screen.getByText("Start date is required")).toBeInTheDocument();
		expect(screen.getByText("End date is required")).toBeInTheDocument();
	});

	it("validates date range when creating entry", async () => {
		const user = userEvent.setup();

		await act(async () => {
			renderCalendarPage();
		});

		await waitFor(() => {
			expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Wait for modal form to be ready
		await waitFor(() => {
			expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		});

		// Fill form with invalid date range (end before start)
		await user.type(screen.getByLabelText("Title *"), "Test Entry");
		await user.type(screen.getByLabelText("Start Date *"), "2025-07-20");
		await user.type(screen.getByLabelText("End Date *"), "2025-07-15");

		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		expect(screen.getByText("End date must be after start date")).toBeInTheDocument();
	});

	it("successfully creates new calendar entry", async () => {
		const user = userEvent.setup();

		// Mock successful creation with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams") && url.includes("/users")) {
				// Handle team users endpoint: /api/v1/teams/{teamId}/users
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
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
			renderCalendarPage();
		});

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Fill form with valid data including team and user selection
		await user.selectOptions(screen.getByLabelText("Team *"), "team1");

		// Wait for team users to load
		await waitFor(() => {
			expect(screen.getByText("John Doe")).toBeInTheDocument();
		});

		await user.selectOptions(screen.getByLabelText("Team Member *"), "user1");
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

		// Modal should close after successful submission
		await waitFor(() => {
			expect(screen.queryByLabelText("Title *")).not.toBeInTheDocument();
		});
	});

	it("handles API errors when creating entry", async () => {
		const user = userEvent.setup();

		// Mock API error with robust implementation
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams") && url.includes("/users")) {
				// Handle team users endpoint: /api/v1/teams/{teamId}/users
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
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
			renderCalendarPage();
		});

		// Open create modal and fill form with valid data
		await user.click(screen.getByText("Add Calendar Entry"));

		// Fill form with valid team and user selection
		await user.selectOptions(screen.getByLabelText("Team *"), "team1");

		// Wait for team users to load
		await waitFor(() => {
			expect(screen.getByText("John Doe")).toBeInTheDocument();
		});

		await user.selectOptions(screen.getByLabelText("Team Member *"), "user1");
		await user.type(screen.getByLabelText("Title *"), "Test Entry");
		await user.type(screen.getByLabelText("Start Date *"), "2025-07-15");
		await user.type(screen.getByLabelText("End Date *"), "2025-07-15");

		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		// API errors are shown in toast notifications, not inline text
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
			renderCalendarPage();
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
			renderCalendarPage();
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
			renderCalendarPage();
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
			renderCalendarPage();
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
			renderCalendarPage();
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
			renderCalendarPage();
		});

		// Open create modal using the specific button (not the modal header)
		await user.click(screen.getByRole("button", { name: "Add Calendar Entry" }));

		// Wait for modal to be open
		await waitFor(() => {
			expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		});

		// Click cancel
		await user.click(screen.getByText("Cancel"));

		// Modal should close - check that form fields are no longer visible
		await waitFor(() => {
			expect(screen.queryByLabelText("Title *")).not.toBeInTheDocument();
		});
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
			renderCalendarPage();
		});

		await waitFor(() => {
			expect(screen.getByText("No calendar entries for the selected period.")).toBeInTheDocument();
		});
	});

	it("handles network errors gracefully", async () => {
		// Mock network error for all initialization calls
		mockFetch.mockRejectedValue(new Error("Network error"));

		await act(async () => {
			renderCalendarPage();
		});

		// Network errors during initialization show error state with "Unable to Load Calendar" and the specific error message
		await waitFor(() => {
			expect(screen.getByText("Unable to Load Calendar")).toBeInTheDocument();
		});

		expect(screen.getByText("Network error")).toBeInTheDocument();
	});
});
