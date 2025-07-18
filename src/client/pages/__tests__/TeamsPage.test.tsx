import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import TeamsPage from "../TeamsPage";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock fetch globally
global.fetch = vi.fn();

const mockFetch = fetch as any;

// Test wrapper to provide ToastProvider context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
	React.createElement(ToastProvider, null, children);

describe("TeamsPage", () => {
	// Store original globals for cleanup
	let originalFetch: typeof fetch;
	let originalSetTimeout: typeof setTimeout;
	let pendingPromiseResolvers: Array<() => void> = [];

	beforeAll(() => {
		originalFetch = global.fetch;
		originalSetTimeout = global.setTimeout;
	});

	afterAll(() => {
		// Restore original globals
		global.fetch = originalFetch;
		global.setTimeout = originalSetTimeout;
	});

	beforeEach(() => {
		// Clear pending promise resolvers from previous tests
		pendingPromiseResolvers = [];

		// Reset all mocks and timers
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();

		// Setup fresh fetch mock with simple default behavior
		mockFetch.mockClear();
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});
	});

	afterEach(() => {
		// Comprehensive cleanup to prevent memory leaks
		vi.useRealTimers();
		vi.clearAllMocks();
		vi.resetAllMocks();
		vi.clearAllTimers();

		// Resolve any pending promises to prevent memory leaks
		pendingPromiseResolvers.forEach(resolve => {
			try {
				resolve();
			} catch {
				// Ignore errors during cleanup
			}
		});
		pendingPromiseResolvers = [];

		// Clean up DOM
		document.body.innerHTML = "";

		// Force garbage collection hint (not guaranteed but helps in testing)
		if (global.gc) {
			global.gc();
		}
	});

	it("renders teams page with main elements", async () => {
		await act(async () => {
			render(<TeamsPage />, { wrapper: TestWrapper });
		});

		expect(screen.getByText("Team Management")).toBeInTheDocument();
		expect(screen.getByText("Create New Team")).toBeInTheDocument();
	});

	it("displays loading state initially", async () => {
		// Setup controlled promise to capture loading state
		let resolveTeams: (value: any) => void;
		let rejectTeams: (reason?: any) => void;
		const teamsPromise = new Promise((resolve, reject) => {
			resolveTeams = resolve;
			rejectTeams = reject;
		});

		// Add resolvers to cleanup array to prevent memory leaks
		pendingPromiseResolvers.push(() => {
			if (resolveTeams) {
				resolveTeams({
					ok: true,
					json: async () => []
				});
			}
		});

		mockFetch.mockReturnValueOnce(teamsPromise);

		await act(async () => {
			render(<TeamsPage />, { wrapper: TestWrapper });
		});

		// Loading state should be visible immediately
		expect(screen.getByText("Loading teams...")).toBeInTheDocument();

		// Resolve promise to complete loading (cleanup)
		await act(async () => {
			resolveTeams!({
				ok: true,
				json: async () => []
			});
		});
	});

	it("loads and displays teams", async () => {
		// Use simple mock data to reduce memory usage
		const mockTeam = {
			id: "1",
			name: "Frontend Team",
			description: "React development team",
			velocity_baseline: 40,
			sprint_length_days: 14,
			working_days_per_week: 5,
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z"
		};

		// Use simple mockResolvedValueOnce instead of complex implementation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => [mockTeam]
		});

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("Frontend Team")).toBeInTheDocument();
		});

		expect(screen.getByText("React development team")).toBeInTheDocument();
		expect(screen.getByText("40 points")).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
		expect(screen.getByText("5 days/week")).toBeInTheDocument();
	});

	it("displays empty state when no teams", async () => {
		// Default mock already returns empty array, so this should work
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("No Teams Yet")).toBeInTheDocument();
		});

		expect(screen.getByText("Create your first team to start planning sprint capacity.")).toBeInTheDocument();
	});

	it("handles API errors gracefully", async () => {
		mockFetch.mockRejectedValueOnce(new Error("Network error"));

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("Unable to Load Teams")).toBeInTheDocument();
		});

		expect(screen.getByText("Network error")).toBeInTheDocument();
		expect(screen.getByText("Retry")).toBeInTheDocument();
	});

	it("opens create modal when Create New Team button is clicked", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Find all "Create New Team" buttons and click the first one (the header button)
		const createButtons = screen.getAllByText("Create New Team");
		expect(createButtons).toHaveLength(1); // Should only be header button initially
		await user.click(createButtons[0]);

		// Wait for modal form to fully render by checking for form structure
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Verify form elements are present using simpler selectors
		expect(screen.getByPlaceholderText("e.g., Frontend Development Team")).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText("Brief description of the team's focus and responsibilities")
		).toBeInTheDocument();
		expect(screen.getByText("Sprint Configuration")).toBeInTheDocument();
		expect(screen.getByText("Average story points completed per sprint (leave 0 if unknown)")).toBeInTheDocument();

		// Now should have 2 "Create New Team" text elements (button + modal title)
		expect(screen.getAllByText("Create New Team")).toHaveLength(2);
	});

	it("validates required fields when creating team", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Try to submit empty form using submit button (type="submit")
		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Team name is required")).toBeInTheDocument();
		});
	});

	it("validates team name length", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Fill form with too long name - PERFORMANCE FIX: use fireEvent instead of typing 101 chars
		const nameInput = screen.getByPlaceholderText("e.g., Frontend Development Team");
		fireEvent.change(nameInput, { target: { value: "a".repeat(101) } });
		fireEvent.blur(nameInput); // Trigger validation

		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Team name must be less than 100 characters")).toBeInTheDocument();
		});
	});

	it("validates description length", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		// Wait for loading to complete
		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Fill form with valid name but too long description - use fast direct input setting
		const nameInput = screen.getByPlaceholderText("e.g., Frontend Development Team");
		const descInput = screen.getByPlaceholderText("Brief description of the team's focus and responsibilities");

		// Fast typing for name
		fireEvent.change(nameInput, { target: { value: "Valid Team Name" } });

		// PERFORMANCE FIX: Use fireEvent.change instead of typing 501 characters
		fireEvent.change(descInput, { target: { value: "a".repeat(501) } });
		fireEvent.blur(descInput); // Trigger validation

		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Description must be less than 500 characters")).toBeInTheDocument();
		});
	});

	it("validates velocity input accepts numeric values", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Test that velocity input accepts valid numeric values
		const velocityInput = screen.getByPlaceholderText("Story points per sprint");
		fireEvent.change(velocityInput, { target: { value: "25" } });
		expect(velocityInput).toHaveValue(25);

		// Test that input has proper HTML5 validation attributes
		expect(velocityInput).toHaveAttribute("type", "number");
		expect(velocityInput).toHaveAttribute("min", "0");
		expect(velocityInput).toHaveAttribute("step", "1");
	});

	it("successfully creates new team", async () => {
		const user = userEvent.setup();

		// Use simple mock responses to reduce memory usage
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			})
			.mockResolvedValueOnce({
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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Fill form with valid data using placeholder selectors
		fireEvent.change(screen.getByPlaceholderText("e.g., Frontend Development Team"), {
			target: { value: "New Team" }
		});
		fireEvent.change(screen.getByPlaceholderText("Brief description of the team's focus and responsibilities"), {
			target: { value: "Test team" }
		});
		const velocityInput = screen.getByPlaceholderText("Story points per sprint");
		await user.clear(velocityInput);
		fireEvent.change(velocityInput, { target: { value: "25" } });
		// Select options using IDs since they're more reliable for select elements
		await user.selectOptions(screen.getByDisplayValue("2 Weeks"), "14");
		await user.selectOptions(screen.getByDisplayValue("5 Days (Standard)"), "5");

		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Modal should close - check that form elements are gone
		expect(screen.queryByPlaceholderText("e.g., Frontend Development Team")).not.toBeInTheDocument();
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

		render(<TeamsPage />, { wrapper: TestWrapper });

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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("Original Team")).toBeInTheDocument();
		});

		// Click edit button
		const editButtons = screen.getAllByTitle("Edit team");
		await user.click(editButtons[0]);

		// Update name
		const nameInput = screen.getByDisplayValue("Original Team");
		await user.clear(nameInput);
		fireEvent.change(nameInput, { target: { value: "Updated Team" } });

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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("Team to Delete")).toBeInTheDocument();
		});

		// Click delete button (second button in team card)
		const deleteButtons = screen.getAllByTitle("Delete team");
		await user.click(deleteButtons[0]);

		expect(screen.getByRole("heading", { name: "Delete Team" })).toBeInTheDocument();
		expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Delete Team" })).toBeInTheDocument();
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

		render(<TeamsPage />, { wrapper: TestWrapper });

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
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Click cancel
		await user.click(screen.getByText("Cancel"));

		// Modal should close - check that form elements are gone
		expect(screen.queryByPlaceholderText("e.g., Frontend Development Team")).not.toBeInTheDocument();
	});

	it("closes modals when X button is clicked", async () => {
		const user = userEvent.setup();
		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		// Click X button
		const closeButton = screen.getByText("×");
		await user.click(closeButton);

		// Modal should close - check that form elements are gone
		expect(screen.queryByPlaceholderText("e.g., Frontend Development Team")).not.toBeInTheDocument();
	});

	it("handles API errors when creating team", async () => {
		const user = userEvent.setup();

		// Use simple mock responses to reduce memory usage
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ message: "Invalid team data" })
			});

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and fill form using header button
		const headerButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(headerButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText("e.g., Frontend Development Team"), {
			target: { value: "Test Team" }
		});

		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

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

		render(<TeamsPage />, { wrapper: TestWrapper });

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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.getByText("New Team")).toBeInTheDocument();
		});

		expect(screen.getByText("Not set")).toBeInTheDocument();
	});

	it("auto-dismisses toast after 5 seconds", async () => {
		// Use fake timers for better control and cleanup
		vi.useFakeTimers();
		let capturedCallback: (() => void) | null = null;

		// Mock setTimeout to capture the 5000ms timer specifically
		const setTimeoutSpy = vi
			.spyOn(global, "setTimeout")
			.mockImplementation((callback: () => void, delay?: number) => {
				if (delay === 5000) {
					capturedCallback = callback;
					return 123 as any; // Return fake timer ID
				}
				// For other delays, use real implementation
				return originalSetTimeout(callback, delay || 0);
			});

		const user = userEvent.setup();

		// Use simple mock responses to reduce memory usage
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			})
			.mockResolvedValueOnce({
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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and submit valid form
		const createButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(createButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText("e.g., Frontend Development Team"), {
			target: { value: "New Team" }
		});
		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Verify setTimeout was called with correct parameters
		expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
		expect(capturedCallback).toBeTruthy();

		// Execute the captured callback to simulate timer firing
		if (capturedCallback) {
			act(() => {
				capturedCallback!();
			});
		}

		// Wait for toast to disappear
		await waitFor(() => {
			expect(screen.queryByText("Team created successfully!")).not.toBeInTheDocument();
		});

		// Cleanup spies and timers
		setTimeoutSpy.mockRestore();
		vi.useRealTimers();
	});

	it("allows manual dismissal of toast", async () => {
		const user = userEvent.setup();

		// Use simple mock responses to reduce memory usage
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			})
			.mockResolvedValueOnce({
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

		render(<TeamsPage />, { wrapper: TestWrapper });

		await waitFor(() => {
			expect(screen.queryByText("Loading teams...")).not.toBeInTheDocument();
		});

		// Open create modal and submit valid form
		const createButton = screen.getByRole("button", { name: "Create New Team" });
		await user.click(createButton);

		// Wait for modal to open
		await waitFor(() => {
			expect(screen.getByText("Basic Information")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByPlaceholderText("e.g., Frontend Development Team"), {
			target: { value: "New Team" }
		});
		const submitButtons = screen.getAllByRole("button", { name: "Create Team" });
		const modalSubmitButton = submitButtons.find(button => button.getAttribute("type") === "submit")!;
		await user.click(modalSubmitButton);

		await waitFor(() => {
			expect(screen.getByText("Team created successfully!")).toBeInTheDocument();
		});

		// Click dismiss button using aria-label for specificity
		const dismissButton = screen.getByRole("button", { name: /dismiss notification/i });
		await user.click(dismissButton);

		// Toast should be dismissed immediately
		expect(screen.queryByText("Team created successfully!")).not.toBeInTheDocument();
	});
});
