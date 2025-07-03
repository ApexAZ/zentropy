import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarPage from "../CalendarPage";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe("CalendarPage", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		// Mock successful responses by default
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});
	});

	it("renders calendar page with main elements", () => {
		render(<CalendarPage />);

		expect(screen.getByText("Team Calendar")).toBeInTheDocument();
		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByDisplayValue("All Teams")).toBeInTheDocument();
		expect(screen.getByDisplayValue(/\d{4}/)).toBeInTheDocument(); // Month selector with year
	});

	it("displays loading state initially", () => {
		render(<CalendarPage />);

		expect(screen.getByText("Loading calendar entries...")).toBeInTheDocument();
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

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockEntries
		});

		render(<CalendarPage />);

		await waitFor(() => {
			expect(screen.getByText("Summer Vacation")).toBeInTheDocument();
		});

		expect(screen.getByText("Annual summer vacation")).toBeInTheDocument();
		expect(screen.getByText("PTO / Vacation")).toBeInTheDocument();
	});

	it("opens create modal when Create Entry button is clicked", async () => {
		const user = userEvent.setup();
		render(<CalendarPage />);

		const createButton = screen.getByText("Add Calendar Entry");
		await user.click(createButton);

		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByLabelText("Title *")).toBeInTheDocument();
		expect(screen.getByLabelText("Start Date *")).toBeInTheDocument();
		expect(screen.getByLabelText("End Date *")).toBeInTheDocument();
	});

	it("validates form fields when creating entry", async () => {
		const user = userEvent.setup();
		render(<CalendarPage />);

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));

		// Try to submit empty form
		const submitButton = screen.getByText("Add Entry");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Title is required")).toBeInTheDocument();
		});
	});

	it("validates date range when creating entry", async () => {
		const user = userEvent.setup();
		render(<CalendarPage />);

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

		// Mock successful creation
		mockFetch.mockResolvedValueOnce({
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

		render(<CalendarPage />);

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

		// Mock API error
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Invalid data provided" })
		});

		render(<CalendarPage />);

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
		const user = userEvent.setup();
		render(<CalendarPage />);

		const teamFilter = screen.getByDisplayValue("All Teams");
		await user.selectOptions(teamFilter, "team1");

		// Should trigger API call with team filter
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("team_id=team1"), expect.any(Object));
		});
	});

	it("filters entries by month selection", async () => {
		const user = userEvent.setup();
		render(<CalendarPage />);

		const monthFilter = screen.getByDisplayValue(/\d{4}/); // Current year
		await user.selectOptions(monthFilter, "2025-08");

		// Should trigger API call with month filter
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("month=08"), expect.any(Object));
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

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockEntries
		});

		render(<CalendarPage />);

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

		// Mock initial load
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockEntries
		});

		// Mock successful update
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				...mockEntries[0],
				title: "Updated Entry"
			})
		});

		render(<CalendarPage />);

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

		// Mock initial load
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockEntries
		});

		// Mock successful deletion
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: "Calendar entry deleted successfully" })
		});

		render(<CalendarPage />);

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
		render(<CalendarPage />);

		// Open create modal
		await user.click(screen.getByText("Add Calendar Entry"));
		expect(screen.getByText("Add Calendar Entry")).toBeInTheDocument();

		// Click cancel
		await user.click(screen.getByText("Cancel"));

		expect(screen.queryByText("Add Calendar Entry")).not.toBeInTheDocument();
	});

	it("displays empty state when no entries", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<CalendarPage />);

		await waitFor(() => {
			expect(screen.getByText("No calendar entries for the selected period.")).toBeInTheDocument();
		});
	});

	it("handles network errors gracefully", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		render(<CalendarPage />);

		await waitFor(() => {
			expect(screen.getByText("Error loading calendar entries. Please try again.")).toBeInTheDocument();
		});
	});
});
