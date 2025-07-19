import { render, screen, act, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import CalendarPage from "../CalendarPage";
import { ToastProvider } from "../../contexts/ToastContext";
import { CalendarService } from "../../services/CalendarService";
import { TeamService } from "../../services/TeamService";

// Clean module-level mock with sensible defaults
vi.mock("../../services/CalendarService", () => ({
	CalendarService: {
		getInitializationData: vi.fn(),
		getCalendarEntries: vi.fn(),
		createCalendarEntry: vi.fn(),
		updateCalendarEntry: vi.fn(),
		deleteCalendarEntry: vi.fn()
	}
}));

vi.mock("../../services/TeamService", () => ({
	TeamService: {
		getTeamUsers: vi.fn()
	}
}));

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

		// Set up default mocks for all tests using the standard approach
		(CalendarService.getInitializationData as any).mockResolvedValue({
			teams: mockTeams,
			users: mockUsers
		});
		(CalendarService.getCalendarEntries as any).mockResolvedValue([]);
		(CalendarService.createCalendarEntry as any).mockResolvedValue({ id: "new-entry" });
		(CalendarService.updateCalendarEntry as any).mockResolvedValue({ id: "updated-entry" });
		(CalendarService.deleteCalendarEntry as any).mockResolvedValue(undefined);
		(TeamService.getTeamUsers as any).mockResolvedValue(mockUsers);
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

	// Helper function to setup service mocks with specific data
	const setupServiceMocks = (entries: any[] = [], teams: any[] = mockTeams, users: any[] = mockUsers) => {
		(CalendarService.getInitializationData as any).mockResolvedValue({
			teams,
			users
		});
		(CalendarService.getCalendarEntries as any).mockResolvedValue(entries);
		(TeamService.getTeamUsers as any).mockResolvedValue(users);
	};

	it("renders calendar page with main elements", async () => {
		await renderCalendarPage();

		expect(screen.getByText("Team Calendar")).toBeInTheDocument();
		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();
		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument(); // Month selector with year
	});

	it("shows teams and users after data loads", async () => {
		// Configure the service mocks directly
		setupServiceMocks([], mockTeams, mockUsers);

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

		// Configure the service mocks with entry data
		setupServiceMocks(mockEntries);

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
		// Configure service mocks for successful creation
		setupServiceMocks([]);

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
		// Configure service mocks for successful initialization but failed creation
		setupServiceMocks([]);

		// Override createCalendarEntry to return an error
		(CalendarService.createCalendarEntry as any).mockRejectedValue(new Error("Invalid data provided"));

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
		// Configure service mocks
		setupServiceMocks([]);

		await renderCalendarPage();

		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();

		const teamFilter = screen.getByDisplayValue("All Teams");
		fireEvent.change(teamFilter, { target: { value: "team1" } });

		// Should trigger service call with team filter
		await act(async () => {
			await Promise.resolve();
		});

		// Verify the service was called with team filter
		expect(CalendarService.getCalendarEntries).toHaveBeenCalledWith({
			team_id: "team1",
			month: "07",
			year: "2025"
		});
	});

	it("filters entries by month selection", async () => {
		// Configure service mocks
		setupServiceMocks([]);

		await renderCalendarPage();

		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument();

		const monthFilter = screen.getByDisplayValue(/\d{4}/); // Current year
		fireEvent.change(monthFilter, { target: { value: "2025-08" } });

		// Should trigger service call with month filter
		await act(async () => {
			await Promise.resolve();
		});

		// Verify the service was called with month filter
		expect(CalendarService.getCalendarEntries).toHaveBeenCalledWith({ month: "08", year: "2025" });
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

		// Configure service mocks with entry data
		setupServiceMocks(mockEntries);

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

		// Configure service mocks for initial load and update
		setupServiceMocks(mockEntries);

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

		// Configure service mocks for initial load and deletion
		setupServiceMocks(mockEntries);

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
		// Configure service mocks with empty entries
		setupServiceMocks([]);

		await renderCalendarPage();

		expect(screen.getByText("No calendar entries for the selected period.")).toBeInTheDocument();
	});

	it("handles network errors gracefully", async () => {
		// Configure service mock to return network error for initialization
		(CalendarService.getInitializationData as any).mockRejectedValue(new Error("Network error"));

		await renderCalendarPage();

		// Network errors during initialization show error state with "Unable to Load Calendar" and the specific error message
		expect(screen.getByText("Unable to Load Calendar")).toBeInTheDocument();
		expect(screen.getByText("Network error")).toBeInTheDocument();
	});
});
