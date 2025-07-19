import { render, screen, act, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
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
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		mockFetch.mockClear();
		// 🚀 PERFORMANCE PATTERN: Robust URL-based Mocking
		// ✅ Use mockImplementation for complex/unpredictable API patterns
		// ✅ Handles dynamic URLs and different HTTP methods
		// ✅ More resilient than simple mockResolvedValueOnce chains
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/v1/teams") && url.includes("/users")) {
				return Promise.resolve({ ok: true, json: async () => mockUsers });
			}
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

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// 🚀 PERFORMANCE PATTERN: Optimized Render Helper
	// ✅ Encapsulates component + provider setup
	// ✅ Handles async initialization with act()
	// ✅ Reusable across all tests in the file
	const renderCalendarPage = async () => {
		const result = render(
			<ToastProvider>
				<CalendarPage />
			</ToastProvider>
		);

		// Wait for async initialization like EmailVerificationModal pattern
		await act(async () => {
			await Promise.resolve();
		});

		return result;
	};

	const openCreateModal = () => {
		const createButton = screen.getByRole("button", { name: "Add Calendar Entry" });
		fireEvent.click(createButton);

		expect(screen.getByLabelText("Title *")).toBeInTheDocument();

		return createButton;
	};

	// 🚀 PERFORMANCE PATTERN: Hybrid Helper Function
	// ✅ Uses fireEvent for immediate DOM events
	// ✅ Uses act() only when React updates are needed
	// ✅ Combines speed with proper async handling
	const fillEntryForm = async (entryData: {
		team?: string;
		user?: string;
		title?: string;
		description?: string;
		startDate?: string;
		endDate?: string;
		entryType?: string;
	}) => {
		if (entryData.team) {
			fireEvent.change(screen.getByLabelText("Team *"), { target: { value: entryData.team } });
			// Wait for team users to load after team selection
			await act(async () => {
				await Promise.resolve();
			});
		}
		if (entryData.user) {
			fireEvent.change(screen.getByLabelText("Team Member *"), { target: { value: entryData.user } });
		}
		if (entryData.title) {
			fireEvent.change(screen.getByLabelText("Title *"), { target: { value: entryData.title } });
		}
		if (entryData.description) {
			fireEvent.change(screen.getByLabelText("Description"), { target: { value: entryData.description } });
		}
		if (entryData.startDate) {
			fireEvent.change(screen.getByLabelText("Start Date *"), { target: { value: entryData.startDate } });
		}
		if (entryData.endDate) {
			fireEvent.change(screen.getByLabelText("End Date *"), { target: { value: entryData.endDate } });
		}
		if (entryData.entryType) {
			fireEvent.change(screen.getByLabelText("Entry Type *"), { target: { value: entryData.entryType } });
		}
	};

	const submitForm = async (buttonName: string = "Add Entry") => {
		const submitButton = screen.getByText(buttonName);
		fireEvent.click(submitButton);

		// Wait for async form submission like EmailVerificationModal pattern
		await act(async () => {
			await Promise.resolve();
		});

		return submitButton;
	};

	// Simple mock setup like EmailVerificationModal
	const setupMockResponse = (entries: any[] = [], teams: any[] = mockTeams, users: any[] = mockUsers) => {
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams") && url.includes("/users")) {
				return Promise.resolve({ ok: true, json: async () => users });
			}
			if (url.includes("/api/v1/teams")) {
				return Promise.resolve({ ok: true, json: async () => teams });
			}
			if (url.includes("/api/v1/users")) {
				return Promise.resolve({ ok: true, json: async () => users });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "POST") {
				return Promise.resolve({ ok: true, json: async () => ({ id: "new-entry", ...entries[0] }) });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "PUT") {
				return Promise.resolve({ ok: true, json: async () => ({ id: "updated-entry", ...entries[0] }) });
			}
			if (url.includes("/api/v1/calendar_entries") && options?.method === "DELETE") {
				return Promise.resolve({
					ok: true,
					json: async () => ({ message: "Calendar entry deleted successfully" })
				});
			}
			if (url.includes("/api/v1/calendar_entries")) {
				return Promise.resolve({ ok: true, json: async () => entries });
			}
			return Promise.reject(new Error(`Unhandled API call in mock: ${url}`));
		});
	};

	it("renders calendar page with main elements", async () => {
		await renderCalendarPage();

		expect(screen.getByText("Team Calendar")).toBeInTheDocument();
		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();
		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument(); // Month selector with year
	});

	it("shows teams and users after data loads", async () => {
		// Mock successful API responses
		setupMockResponse([], mockTeams, mockUsers);

		await renderCalendarPage();

		// Teams should be visible immediately after rendering
		expect(screen.getByText("Engineering Team")).toBeInTheDocument();
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

		// Set up mock with entry data
		setupMockResponse(mockEntries);

		await renderCalendarPage();

		expect(screen.getByText("Summer Vacation")).toBeInTheDocument();
		expect(screen.getByText("Annual summer vacation")).toBeInTheDocument();
		expect(screen.getByText("PTO / Vacation")).toBeInTheDocument();
	});

	it("opens create modal when Create Entry button is clicked", async () => {
		await renderCalendarPage();

		openCreateModal();

		expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		expect(screen.getByLabelText("Start Date *")).toBeInTheDocument();
		expect(screen.getByLabelText("End Date *")).toBeInTheDocument();
	});

	it("validates form fields when creating entry", async () => {
		await renderCalendarPage();

		// Open create modal
		openCreateModal();

		// Verify that form is empty initially
		const teamSelect = screen.getByLabelText("Team *") as HTMLSelectElement;
		const titleInput = screen.getByLabelText("Title *") as HTMLInputElement;
		expect(teamSelect.value).toBe("");
		expect(titleInput.value).toBe("");

		// Try to submit empty form - this should trigger validation
		await submitForm();

		// Check immediately after form submission for validation errors
		// The validation should happen synchronously when form is submitted
		expect(screen.getByText("Please select a team")).toBeInTheDocument();
		expect(screen.getByText("Title is required")).toBeInTheDocument();
		expect(screen.getByText("Start date is required")).toBeInTheDocument();
		expect(screen.getByText("End date is required")).toBeInTheDocument();
	});

	it("validates date range when creating entry", async () => {
		await renderCalendarPage();

		// Open create modal
		openCreateModal();

		// Fill form with invalid date range (end before start)
		await fillEntryForm({
			title: "Test Entry",
			startDate: "2025-07-20",
			endDate: "2025-07-15"
		});

		await submitForm();

		expect(screen.getByText("End date must be after start date")).toBeInTheDocument();
	});

	it("successfully creates new calendar entry", async () => {
		// Mock successful creation
		setupMockResponse([]);

		await renderCalendarPage();

		// Open create modal
		openCreateModal();

		// Fill form with valid data including team and user selection
		await fillEntryForm({
			team: "team1",
			user: "user1",
			title: "New Entry",
			description: "Test description",
			startDate: "2025-07-15",
			endDate: "2025-07-15",
			entryType: "pto"
		});

		// Team users should be loaded immediately
		expect(screen.getByText("John Doe")).toBeInTheDocument();

		await submitForm();

		expect(screen.getByText("Calendar entry created successfully!")).toBeInTheDocument();

		// Modal should close after successful submission
		expect(screen.queryByLabelText("Title *")).not.toBeInTheDocument();
	});

	it("handles API errors when creating entry", async () => {
		// Mock API error only for POST request, not initial load
		setupMockResponse([]);

		// Override fetch to fail only on POST
		mockFetch.mockImplementation((url: string, options?: any) => {
			if (url.includes("/api/v1/teams") && url.includes("/users")) {
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

		await renderCalendarPage();

		// Open create modal and fill form with valid data
		openCreateModal();

		// Fill form with valid team and user selection
		await fillEntryForm({
			team: "team1",
			user: "user1",
			title: "Test Entry",
			startDate: "2025-07-15",
			endDate: "2025-07-15"
		});

		// Team users should be loaded immediately
		expect(screen.getByText("John Doe")).toBeInTheDocument();

		await submitForm();

		// API errors are shown in toast notifications, not inline text
		expect(screen.getByText("Invalid data provided")).toBeInTheDocument();
	});

	it("filters entries by team selection", async () => {
		// Clear and set up robust mocking for this test
		setupMockResponse([]);

		await renderCalendarPage();

		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();

		const teamFilter = screen.getByDisplayValue("All Teams");
		fireEvent.change(teamFilter, { target: { value: "team1" } });

		// Should trigger API call with team filter
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/v1/calendar_entries?team_id=team1&month=07&year=2025");
	});

	it("filters entries by month selection", async () => {
		// Clear and set up robust mocking for this test
		setupMockResponse([]);

		await renderCalendarPage();

		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument();

		const monthFilter = screen.getByDisplayValue(/\d{4}/); // Current year
		fireEvent.change(monthFilter, { target: { value: "2025-08" } });

		// Should trigger API call with month filter
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/v1/calendar_entries?month=08&year=2025");
	});

	it("opens edit modal when entry is clicked", async () => {
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
		setupMockResponse(mockEntries);

		await renderCalendarPage();

		expect(screen.getByText("Existing Entry")).toBeInTheDocument();

		// Click on the edit button for the entry
		const editButton = screen.getByTitle("Edit entry");
		await act(async () => {
			fireEvent.click(editButton);
		});

		expect(screen.getByText("Edit Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Existing Entry")).toBeInTheDocument();
	});

	it("successfully updates existing entry", async () => {
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

		// Mock initial load and update
		setupMockResponse(mockEntries);

		await renderCalendarPage();

		expect(screen.getByText("Original Entry")).toBeInTheDocument();

		// Click to edit
		const editButton = screen.getByTitle("Edit entry");
		fireEvent.click(editButton);

		// Update title
		const titleInput = screen.getByDisplayValue("Original Entry");
		fireEvent.change(titleInput, { target: { value: "Updated Entry" } });

		await submitForm("Update Entry");

		expect(screen.getByText("Calendar entry updated successfully!")).toBeInTheDocument();
	});

	it("successfully deletes entry", async () => {
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

		// Mock initial load and deletion
		setupMockResponse(mockEntries);

		await renderCalendarPage();

		expect(screen.getByText("Entry to Delete")).toBeInTheDocument();

		// Click delete button
		const deleteButton = screen.getByTitle("Delete entry");
		fireEvent.click(deleteButton);

		// Confirm deletion
		const confirmButton = screen.getByText("Delete Entry");
		fireEvent.click(confirmButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText("Calendar entry deleted successfully!")).toBeInTheDocument();
	});

	it("closes modal when cancel button is clicked", async () => {
		await renderCalendarPage();

		// Open create modal using the specific button (not the modal header)
		openCreateModal();

		// Click cancel
		fireEvent.click(screen.getByText("Cancel"));

		// Modal should close - check that form fields are no longer visible
		expect(screen.queryByLabelText("Title *")).not.toBeInTheDocument();
	});

	it("displays empty state when no entries", async () => {
		// Mock empty entries response
		setupMockResponse([]);

		await renderCalendarPage();

		expect(screen.getByText("No calendar entries for the selected period.")).toBeInTheDocument();
	});

	it("handles network errors gracefully", async () => {
		// Mock network error for all initialization calls
		mockFetch.mockRejectedValue(new Error("Network error"));

		await renderCalendarPage();

		// Network errors during initialization show error state with "Unable to Load Calendar" and the specific error message
		expect(screen.getByText("Unable to Load Calendar")).toBeInTheDocument();
		expect(screen.getByText("Network error")).toBeInTheDocument();
	});
});
