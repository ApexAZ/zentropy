import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import TeamConfigurationPage from "../TeamConfigurationPage";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock data
const mockTeam = {
	id: "1",
	name: "Test Team",
	description: "Test team description",
	working_days: [1, 2, 3, 4, 5],
	velocity_baseline: 50,
	sprint_length_days: 14,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z"
};

const mockTeamMembers = [
	{
		id: "1",
		first_name: "John",
		last_name: "Doe",
		email: "john.doe@example.com",
		team_role: "lead" as const
	},
	{
		id: "2",
		first_name: "Jane",
		last_name: "Smith",
		email: "jane.smith@example.com",
		team_role: "member" as const
	}
];

const mockSprints = [
	{
		id: "1",
		name: "Sprint 1",
		start_date: "2025-01-01",
		end_date: "2025-01-14",
		status: "active" as const,
		team_id: "1"
	},
	{
		id: "2",
		name: "Sprint 2",
		start_date: "2025-01-15",
		end_date: "2025-01-28",
		status: "planned" as const,
		team_id: "1"
	}
];

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("TeamConfigurationPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	const setupSuccessfulMocks = () => {
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTeam
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTeamMembers
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSprints
			});
	};

	// Helper function to render TeamConfigurationPage with required providers
	const renderTeamConfigurationPage = () => {
		return render(
			<ToastProvider>
				<TeamConfigurationPage />
			</ToastProvider>
		);
	};

	describe("loading state", () => {
		it("should display loading spinner while fetching team configuration", async () => {
			// Setup delayed responses to capture loading state
			mockFetch
				.mockImplementationOnce(
					() =>
						new Promise(resolve =>
							setTimeout(
								() =>
									resolve({
										ok: true,
										json: async () => mockTeam
									}),
								100
							)
						)
				)
				.mockImplementationOnce(
					() =>
						new Promise(resolve =>
							setTimeout(
								() =>
									resolve({
										ok: true,
										json: async () => mockTeamMembers
									}),
								100
							)
						)
				)
				.mockImplementationOnce(
					() =>
						new Promise(resolve =>
							setTimeout(
								() =>
									resolve({
										ok: true,
										json: async () => mockSprints
									}),
								100
							)
						)
				);

			renderTeamConfigurationPage();

			expect(screen.getByText(/loading team configuration/i)).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: /team configuration/i })).toBeInTheDocument();

			// Wait for loading to complete
			await waitFor(() => {
				expect(screen.queryByText(/loading team configuration/i)).not.toBeInTheDocument();
			});
		});
	});

	describe("error state", () => {
		it("should display error message and retry button on fetch failure", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText(/unable to load configuration/i)).toBeInTheDocument();
				expect(screen.getByText(/network error/i)).toBeInTheDocument();
			});

			const retryButton = screen.getByRole("button", { name: /retry/i });
			expect(retryButton).toBeInTheDocument();
		});

		it("should retry loading configuration when retry button is clicked", async () => {
			const user = userEvent.setup();

			// First call fails
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText(/network error/i)).toBeInTheDocument();
			});

			// Setup successful retry
			setupSuccessfulMocks();

			const retryButton = screen.getByRole("button", { name: /retry/i });
			await user.click(retryButton);

			await waitFor(() => {
				expect(screen.getByText(/test team/i)).toBeInTheDocument();
				expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
			});
		});
	});

	describe("team information form", () => {
		beforeEach(() => {
			setupSuccessfulMocks();
		});

		it("should display team information form with current values", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
				expect(screen.getByDisplayValue("Test team description")).toBeInTheDocument();
			});

			// Check working days checkboxes
			expect(screen.getByRole("checkbox", { name: /monday/i })).toBeChecked();
			expect(screen.getByRole("checkbox", { name: /tuesday/i })).toBeChecked();
			expect(screen.getByRole("checkbox", { name: /wednesday/i })).toBeChecked();
			expect(screen.getByRole("checkbox", { name: /thursday/i })).toBeChecked();
			expect(screen.getByRole("checkbox", { name: /friday/i })).toBeChecked();
			expect(screen.getByRole("checkbox", { name: /saturday/i })).not.toBeChecked();
			expect(screen.getByRole("checkbox", { name: /sunday/i })).not.toBeChecked();
		});

		it("should update team information when form is submitted", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			// Mock successful update
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ ...mockTeam, name: "Updated Team" })
			});

			const nameInput = screen.getByLabelText(/team name/i);
			await user.clear(nameInput);
			await user.type(nameInput, "Updated Team");

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/team information updated successfully/i)).toBeInTheDocument();
			});

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/1", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					name: "Updated Team",
					description: "Test team description",
					working_days: [1, 2, 3, 4, 5],
					working_days_per_week: 5
				})
			});
		});

		it("should toggle working days when checkboxes are clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByRole("checkbox", { name: /saturday/i })).not.toBeChecked();
			});

			// Add Saturday
			const saturdayCheckbox = screen.getByRole("checkbox", { name: /saturday/i });
			await user.click(saturdayCheckbox);

			expect(saturdayCheckbox).toBeChecked();

			// Remove Friday
			const fridayCheckbox = screen.getByRole("checkbox", { name: /friday/i });
			await user.click(fridayCheckbox);

			expect(fridayCheckbox).not.toBeChecked();
		});

		it("should display error toast when team update fails", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			// Mock failed update
			mockFetch.mockRejectedValueOnce(new Error("Update failed"));

			const nameInput = screen.getByLabelText(/team name/i);
			await user.clear(nameInput);
			await user.type(nameInput, "Updated Team");

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/update failed/i)).toBeInTheDocument();
			});
		});
	});

	describe("velocity settings form", () => {
		beforeEach(() => {
			setupSuccessfulMocks();
		});

		it("should display velocity settings form with current values", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			// Check velocity form values
			const velocityInput = screen.getByLabelText(/story points per sprint/i);
			expect(velocityInput).toHaveValue(50);

			const sprintLengthSelect = screen.getByLabelText(/sprint length/i);
			expect(sprintLengthSelect).toHaveValue("2");
		});

		it("should update velocity settings when form is submitted", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			// Mock successful update
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ ...mockTeam, velocity_baseline: 60 })
			});

			const velocityInput = screen.getByLabelText(/story points per sprint/i);
			await user.clear(velocityInput);
			await user.type(velocityInput, "60");

			const saveButton = screen.getByRole("button", { name: /save velocity settings/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/velocity settings updated successfully/i)).toBeInTheDocument();
			});

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/1", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					velocity_baseline: 60,
					sprint_length_days: 14
				})
			});
		});

		it("should update sprint length when dropdown is changed", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			const sprintLengthSelect = screen.getByLabelText(/sprint length/i);
			expect(sprintLengthSelect).toHaveValue("2");

			await user.selectOptions(sprintLengthSelect, "3");

			expect(sprintLengthSelect).toHaveValue("3");
		});
	});

	describe("team member management", () => {
		beforeEach(() => {
			setupSuccessfulMocks();
		});

		it("should display team members list", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
				expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
				expect(screen.getByText("Team Lead")).toBeInTheDocument();
				expect(screen.getByText("Team Member")).toBeInTheDocument();
			});
		});

		it("should open add member modal when add button is clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
			});

			const addButton = screen.getByRole("button", { name: /add team member/i });
			await user.click(addButton);

			expect(screen.getByRole("heading", { name: /add team member/i })).toBeInTheDocument();
			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
		});

		it("should add team member when form is submitted with valid data", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
			});

			// Open modal
			const addButton = screen.getByRole("button", { name: /add team member/i });
			await user.click(addButton);

			// Mock successful member addition
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "3",
					first_name: "New",
					last_name: "Member",
					email: "new.member@example.com",
					team_role: "member"
				})
			});

			// Fill form
			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, "new.member@example.com");

			const roleSelect = screen.getByLabelText(/role/i);
			await user.selectOptions(roleSelect, "member");

			const submitButton = screen.getByRole("button", { name: /add member/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/team member added successfully/i)).toBeInTheDocument();
			});

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/1/members", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: "new.member@example.com",
					role: "member"
				})
			});
		});

		it("should remove team member when remove button is clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
			});

			// Mock window.confirm
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

			// Mock successful member removal
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			});

			const removeButtons = screen.getAllByText(/remove/i);
			await user.click(removeButtons[0]);

			await waitFor(() => {
				expect(screen.getByText(/team member removed successfully/i)).toBeInTheDocument();
			});

			expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to remove this team member?");
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/1/members/1", {
				method: "DELETE"
			});

			confirmSpy.mockRestore();
		});

		it("should close add member modal when cancel button is clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
			});

			// Open modal
			const addButton = screen.getByRole("button", { name: /add team member/i });
			await user.click(addButton);

			expect(screen.getByRole("heading", { name: /add team member/i })).toBeInTheDocument();

			// Cancel modal
			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(screen.queryByRole("heading", { name: /add team member/i })).not.toBeInTheDocument();
		});
	});

	describe("sprint management", () => {
		beforeEach(() => {
			setupSuccessfulMocks();
		});

		it("should display sprints list", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("Sprint 1")).toBeInTheDocument();
				expect(screen.getByText("Sprint 2")).toBeInTheDocument();
				expect(screen.getByText("Active")).toBeInTheDocument();
				expect(screen.getByText("Planned")).toBeInTheDocument();
			});
		});

		it("should open create sprint modal when create button is clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("Sprint 1")).toBeInTheDocument();
			});

			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			await user.click(createButton);

			expect(screen.getByRole("heading", { name: /create new sprint/i })).toBeInTheDocument();
			expect(screen.getByLabelText(/sprint name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
		});

		it("should create sprint when form is submitted with valid data", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("Sprint 1")).toBeInTheDocument();
			});

			// Open modal
			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			await user.click(createButton);

			// Mock successful sprint creation
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "3",
					name: "Sprint 3",
					start_date: "2025-02-01",
					end_date: "2025-02-14",
					status: "planned",
					team_id: "1"
				})
			});

			// Fill form
			const nameInput = screen.getByLabelText(/sprint name/i);
			await user.type(nameInput, "Sprint 3");

			const startDateInput = screen.getByLabelText(/start date/i);
			await user.type(startDateInput, "2025-02-01");

			const endDateInput = screen.getByLabelText(/end date/i);
			await user.type(endDateInput, "2025-02-14");

			const submitButton = screen.getByRole("button", { name: /create sprint/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/sprint created successfully/i)).toBeInTheDocument();
			});

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/teams/1/sprints", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					name: "Sprint 3",
					start_date: "2025-02-01",
					end_date: "2025-02-14",
					team_id: "1"
				})
			});
		});

		it("should validate sprint dates", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("Sprint 1")).toBeInTheDocument();
			});

			// Open modal
			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			await user.click(createButton);

			// Fill form with invalid dates (end date before start date)
			const nameInput = screen.getByLabelText(/sprint name/i);
			await user.type(nameInput, "Sprint 3");

			const startDateInput = screen.getByLabelText(/start date/i);
			await user.type(startDateInput, "2025-02-14");

			const endDateInput = screen.getByLabelText(/end date/i);
			await user.type(endDateInput, "2025-02-01");

			const submitButton = screen.getByRole("button", { name: /create sprint/i });
			await user.click(submitButton);

			expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
		});

		it("should show generate multiple sprints alert", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText("Sprint 1")).toBeInTheDocument();
			});

			// Mock window.alert
			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

			const generateButton = screen.getByRole("button", { name: /generate multiple sprints/i });
			await user.click(generateButton);

			expect(alertSpy).toHaveBeenCalledWith("Generate Multiple Sprints feature coming soon!");

			alertSpy.mockRestore();
		});
	});

	describe("toast notifications", () => {
		beforeEach(() => {
			setupSuccessfulMocks();
		});

		it("should dismiss toast when close button is clicked", async () => {
			const user = userEvent.setup();

			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			});

			// Mock successful update to trigger toast
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ ...mockTeam, name: "Updated Team" })
			});

			const nameInput = screen.getByLabelText(/team name/i);
			await user.clear(nameInput);
			await user.type(nameInput, "Updated Team");

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/team information updated successfully/i)).toBeInTheDocument();
			});

			// Close toast
			const closeButton = screen.getByRole("button", { name: /dismiss notification/i });
			await user.click(closeButton);

			expect(screen.queryByText(/team information updated successfully/i)).not.toBeInTheDocument();
		});
	});

	describe("empty states", () => {
		beforeEach(() => {
			// Mock empty data
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => mockTeam
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => []
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => []
				});
		});

		it("should display empty state for team members", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
				expect(screen.getByText(/add your first team member to get started/i)).toBeInTheDocument();
			});
		});

		it("should display empty state for sprints", async () => {
			renderTeamConfigurationPage();

			await waitFor(() => {
				expect(screen.getByText(/no sprints found/i)).toBeInTheDocument();
				expect(screen.getByText(/create your first sprint to get started/i)).toBeInTheDocument();
			});
		});
	});
});
