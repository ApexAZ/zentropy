import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TeamsPage from "../TeamsPage";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

describe("TeamsPage", () => {
	beforeEach(() => {
		mockFetch.mockClear();
		// Mock successful empty response by default
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});
	});

	it("renders teams page with main elements", () => {
		render(<TeamsPage />);

		expect(screen.getByText("Team Management")).toBeInTheDocument();
		expect(screen.getByText("Create New Team")).toBeInTheDocument();
	});

	it("displays loading state initially", () => {
		render(<TeamsPage />);

		expect(screen.getByText("Loading teams...")).toBeInTheDocument();
	});

	it("loads and displays teams", async () => {
		const mockTeams = [
			{
				id: "1",
				name: "Frontend Team",
				description: "React development team",
				velocity_baseline: 40,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Frontend Team")).toBeInTheDocument();
		});

		expect(screen.getByText("React development team")).toBeInTheDocument();
		expect(screen.getByText("40 points")).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
		expect(screen.getByText("5 days/week")).toBeInTheDocument();
	});

	it("displays empty state when no teams", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("No Teams Yet")).toBeInTheDocument();
		});

		expect(screen.getByText("Create your first team to start planning sprint capacity.")).toBeInTheDocument();
	});

	it("handles API errors gracefully", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Unable to Load Teams")).toBeInTheDocument();
		});

		expect(screen.getByText("Network error")).toBeInTheDocument();
		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("opens create modal when Create New Team button is clicked", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		const createButton = screen.getByText("Create New Team");
		await user.click(createButton);

		expect(screen.getByText("Create New Team")).toBeInTheDocument();
		expect(screen.getByLabelText("Team Name *")).toBeInTheDocument();
		expect(screen.getByLabelText("Description")).toBeInTheDocument();
		expect(screen.getByLabelText("Velocity")).toBeInTheDocument();
		expect(screen.getByLabelText("Sprint Length *")).toBeInTheDocument();
		expect(screen.getByLabelText("Working Days per Week *")).toBeInTheDocument();
	});

	it("validates required fields when creating team", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));

		// Try to submit empty form
		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Team name is required")).toBeInTheDocument();
		});
	});

	it("validates team name length", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));

		// Fill form with too long name
		const nameInput = screen.getByLabelText("Team Name *");
		await user.type(nameInput, "a".repeat(101)); // Too long

		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Team name must be less than 100 characters")).toBeInTheDocument();
		});
	});

	it("validates description length", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));

		// Fill form with valid name but too long description
		await user.type(screen.getByLabelText("Team Name *"), "Valid Team Name");
		await user.type(screen.getByLabelText("Description"), "a".repeat(501)); // Too long

		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Description must be less than 500 characters")).toBeInTheDocument();
		});
	});

	it("validates velocity baseline is not negative", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));

		// Fill form with valid name but negative velocity
		await user.type(screen.getByLabelText("Team Name *"), "Valid Team Name");
		const velocityInput = screen.getByLabelText("Velocity");
		await user.clear(velocityInput);
		await user.type(velocityInput, "-5");

		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Velocity must be 0 or greater")).toBeInTheDocument();
		});
	});

	it("successfully creates new team", async () => {
		const user = userEvent.setup();

		// Mock successful creation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "2",
				name: "New Team",
				description: "Test team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			})
		});

		// Mock reload call
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));

		// Fill form with valid data
		await user.type(screen.getByLabelText("Team Name *"), "New Team");
		await user.type(screen.getByLabelText("Description"), "Test team");
		const velocityInput = screen.getByLabelText("Velocity");
		await user.clear(velocityInput);
		await user.type(velocityInput, "25");
		await user.selectOptions(screen.getByLabelText("Sprint Length *"), "14");
		await user.selectOptions(screen.getByLabelText("Working Days per Week *"), "5");

		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Modal should close
		expect(screen.queryByText("Create New Team")).not.toBeInTheDocument();
	});

	it("opens edit modal when edit button is clicked", async () => {
		const user = userEvent.setup();

		const mockTeams = [
			{
				id: "1",
				name: "Existing Team",
				description: "Existing description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Existing Team")).toBeInTheDocument();
		});

		// Click edit button (first button in team card)
		const editButtons = screen.getAllByTitle("Edit team");
		await user.click(editButtons[0]);

		expect(screen.getByText("Edit Team")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Existing Team")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Existing description")).toBeInTheDocument();
		expect(screen.getByDisplayValue("30")).toBeInTheDocument();
	});

	it("successfully updates existing team", async () => {
		const user = userEvent.setup();

		const mockTeams = [
			{
				id: "1",
				name: "Original Team",
				description: "Original description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		// Mock initial load
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		// Mock successful update
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				...mockTeams[0],
				name: "Updated Team"
			})
		});

		// Mock reload call
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Original Team")).toBeInTheDocument();
		});

		// Click edit button
		const editButtons = screen.getAllByTitle("Edit team");
		await user.click(editButtons[0]);

		// Update name
		const nameInput = screen.getByDisplayValue("Original Team");
		await user.clear(nameInput);
		await user.type(nameInput, "Updated Team");

		const updateButton = screen.getByText("Update Team");
		await user.click(updateButton);

		await waitFor(() => {
			expect(screen.getByText("Team updated successfully!")).toBeInTheDocument();
		});
	});

	it("opens delete modal when delete button is clicked", async () => {
		const user = userEvent.setup();

		const mockTeams = [
			{
				id: "1",
				name: "Team to Delete",
				description: "Will be deleted",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Team to Delete")).toBeInTheDocument();
		});

		// Click delete button (second button in team card)
		const deleteButtons = screen.getAllByTitle("Delete team");
		await user.click(deleteButtons[0]);

		expect(screen.getByText("Delete Team")).toBeInTheDocument();
		expect(screen.getByText("Are you sure you want to delete")).toBeInTheDocument();
		expect(screen.getByText("Team to Delete")).toBeInTheDocument();
		expect(screen.getByText("Delete Team")).toBeInTheDocument();
	});

	it("successfully deletes team", async () => {
		const user = userEvent.setup();

		const mockTeams = [
			{
				id: "1",
				name: "Team to Delete",
				description: "Will be deleted",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		// Mock initial load
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		// Mock successful deletion
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: "Team deleted successfully" })
		});

		// Mock reload call
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Team to Delete")).toBeInTheDocument();
		});

		// Click delete button
		const deleteButtons = screen.getAllByTitle("Delete team");
		await user.click(deleteButtons[0]);

		// Confirm deletion
		const confirmDeleteButton = screen.getByRole("button", { name: "Delete Team" });
		await user.click(confirmDeleteButton);

		await waitFor(() => {
			expect(screen.getByText("Team deleted successfully!")).toBeInTheDocument();
		});
	});

	it("closes modals when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));
		expect(screen.getByText("Create New Team")).toBeInTheDocument();

		// Click cancel
		await user.click(screen.getByText("Cancel"));

		expect(screen.queryByText("Create New Team")).not.toBeInTheDocument();
	});

	it("closes modals when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		await user.click(screen.getByText("Create New Team"));
		expect(screen.getByText("Create New Team")).toBeInTheDocument();

		// Click X button
		const closeButton = screen.getByText("×");
		await user.click(closeButton);

		expect(screen.queryByText("Create New Team")).not.toBeInTheDocument();
	});

	it("handles API errors when creating team", async () => {
		const user = userEvent.setup();

		// Mock API error
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Invalid team data" })
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and fill form
		await user.click(screen.getByText("Create New Team"));
		await user.type(screen.getByLabelText("Team Name *"), "Test Team");

		const submitButton = screen.getByText("Create Team");
		await user.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Invalid team data")).toBeInTheDocument();
		});
	});

	it("handles API errors when deleting team", async () => {
		const user = userEvent.setup();

		const mockTeams = [
			{
				id: "1",
				name: "Team to Delete",
				description: "Will fail to delete",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		// Mock initial load
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		// Mock deletion error
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ message: "Cannot delete team with active members" })
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("Team to Delete")).toBeInTheDocument();
		});

		// Click delete button and confirm
		const deleteButtons = screen.getAllByTitle("Delete team");
		await user.click(deleteButtons[0]);

		const confirmDeleteButton = screen.getByRole("button", { name: "Delete Team" });
		await user.click(confirmDeleteButton);

		await waitFor(() => {
			expect(screen.getByText("Cannot delete team with active members")).toBeInTheDocument();
		});
	});

	it('displays velocity as "Not set" when baseline is 0', async () => {
		const mockTeams = [
			{
				id: "1",
				name: "New Team",
				description: "No velocity set",
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			}
		];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockTeams
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.getByText("New Team")).toBeInTheDocument();
		});

		expect(screen.getByText("Not set")).toBeInTheDocument();
	});

	it("auto-dismisses toast after 5 seconds", async () => {
		vi.useFakeTimers();

		const user = userEvent.setup();

		// Mock successful creation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "2",
				name: "New Team",
				description: "Test team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			})
		});

		// Mock reload call
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and submit valid form
		await user.click(screen.getByText("Create New Team"));
		await user.type(screen.getByLabelText("Team Name *"), "New Team");
		await user.click(screen.getByText("Create Team"));

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Fast-forward 5 seconds
		vi.advanceTimersByTime(5000);

		await waitFor(() => {
			expect(screen.queryByText("Team created successfully!")).not.toBeInTheDocument();
		});

		vi.useRealTimers();
	});

	it("allows manual dismissal of toast", async () => {
		const user = userEvent.setup();

		// Mock successful creation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "2",
				name: "New Team",
				description: "Test team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T00:00:00Z",
				updated_at: "2025-01-01T00:00:00Z"
			})
		});

		// Mock reload call
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		render(<TeamsPage />);

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and submit valid form
		await user.click(screen.getByText("Create New Team"));
		await user.type(screen.getByLabelText("Team Name *"), "New Team");
		await user.click(screen.getByText("Create Team"));

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Click dismiss button
		const dismissButtons = screen.getAllByText("×");
		await user.click(dismissButtons[dismissButtons.length - 1]); // Last × is the toast dismiss

		expect(screen.queryByText("Team created successfully!")).not.toBeInTheDocument();
	});
});
