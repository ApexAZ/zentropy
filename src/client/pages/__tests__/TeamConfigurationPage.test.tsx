import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import TeamConfigurationPage from "../TeamConfigurationPage";
import { TeamService } from "../../services/TeamService";

// Clean module-level mock with all required methods
vi.mock("../../services/TeamService", () => ({
	TeamService: {
		getTeam: vi.fn(),
		getTeamMembers: vi.fn(),
		getTeamSprints: vi.fn(),
		updateTeamBasicInfo: vi.fn(),
		updateTeamVelocity: vi.fn(),
		addTeamMember: vi.fn(),
		removeTeamMember: vi.fn(),
		createSprint: vi.fn()
	}
}));

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

describe("TeamConfigurationPage", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		// Set up default mocks for all tests using the clean service approach
		(TeamService.getTeam as any).mockResolvedValue(mockTeam);
		(TeamService.getTeamMembers as any).mockResolvedValue(mockTeamMembers);
		(TeamService.getTeamSprints as any).mockResolvedValue(mockSprints);
		(TeamService.updateTeamBasicInfo as any).mockResolvedValue(mockTeam);
		(TeamService.updateTeamVelocity as any).mockResolvedValue(mockTeam);
		(TeamService.addTeamMember as any).mockResolvedValue({ id: "new-member" });
		(TeamService.removeTeamMember as any).mockResolvedValue(undefined);
		(TeamService.createSprint as any).mockResolvedValue({ id: "new-sprint" });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// Helper function to render TeamConfigurationPage with required providers
	const renderTeamConfigurationPage = () => {
		return renderWithFullEnvironment(<TeamConfigurationPage />, {
			providers: { toast: true }
		});
	};

	// Helper function to fill member form
	const fillMemberForm = (data: { email?: string; role?: string }) => {
		if (data.email) {
			const emailInput = screen.getByLabelText(/email address/i);
			fireEvent.change(emailInput, { target: { value: data.email } });
		}
		if (data.role) {
			const roleSelect = screen.getByLabelText(/role/i);
			fireEvent.change(roleSelect, { target: { value: data.role } });
		}
	};

	// Helper function to fill sprint form
	const fillSprintForm = (data: { name?: string; startDate?: string; endDate?: string }) => {
		if (data.name) {
			const nameInput = screen.getByLabelText(/sprint name/i);
			fireEvent.change(nameInput, { target: { value: data.name } });
		}
		if (data.startDate) {
			const startInput = screen.getByLabelText(/start date/i);
			fireEvent.change(startInput, { target: { value: data.startDate } });
		}
		if (data.endDate) {
			const endInput = screen.getByLabelText(/end date/i);
			fireEvent.change(endInput, { target: { value: data.endDate } });
		}
	};

	describe("loading state", () => {
		it("should display loading spinner while fetching team configuration", async () => {
			// Service mocks are already set up in beforeEach for successful loading
			renderTeamConfigurationPage();

			// Loading state should be visible immediately
			expect(screen.getByText(/loading team configuration/i)).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: /team configuration/i })).toBeInTheDocument();

			// Wait for loading to complete
			await act(async () => {
				await Promise.resolve();
			});

			// After loading completes, content should be visible
			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
		});
	});

	describe("error state", () => {
		it("should display error message and retry button on fetch failure", async () => {
			// Override the default successful mock with error
			(TeamService.getTeam as any).mockRejectedValueOnce(new Error("Network error"));

			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/unable to load configuration/i)).toBeInTheDocument();
			expect(screen.getByText(/network error/i)).toBeInTheDocument();

			const retryButton = screen.getByRole("button", { name: /retry/i });
			expect(retryButton).toBeInTheDocument();
		});

		it("should retry loading configuration when retry button is clicked", async () => {
			// Initial load fails
			(TeamService.getTeam as any).mockRejectedValueOnce(new Error("Network error"));

			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/network error/i)).toBeInTheDocument();

			// Setup successful retry - clear the mock and restore default behavior
			(TeamService.getTeam as any).mockClear().mockResolvedValue(mockTeam);
			(TeamService.getTeamMembers as any).mockClear().mockResolvedValue(mockTeamMembers);
			(TeamService.getTeamSprints as any).mockClear().mockResolvedValue(mockSprints);

			const retryButton = screen.getByRole("button", { name: /retry/i });
			fireEvent.click(retryButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/test team/i)).toBeInTheDocument();
			expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
		});
	});

	describe("team information form", () => {
		it("should display team information form with current values", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test team description")).toBeInTheDocument();

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
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			// Mock successful update
			(TeamService.updateTeamBasicInfo as any).mockResolvedValueOnce({ ...mockTeam, name: "Updated Team" });

			const nameInput = screen.getByLabelText(/team name/i);
			fireEvent.change(nameInput, { target: { value: "" } });
			fireEvent.change(nameInput, { target: { value: "Updated Team" } });

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			fireEvent.click(saveButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/team information updated successfully/i)).toBeInTheDocument();

			expect(TeamService.updateTeamBasicInfo).toHaveBeenCalledWith("1", {
				name: "Updated Team",
				description: "Test team description",
				working_days: [1, 2, 3, 4, 5]
			});
		});

		it("should toggle working days when checkboxes are clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByRole("checkbox", { name: /saturday/i })).not.toBeChecked();

			// Add Saturday
			const saturdayCheckbox = screen.getByRole("checkbox", { name: /saturday/i });
			fireEvent.click(saturdayCheckbox);

			expect(saturdayCheckbox).toBeChecked();

			// Remove Friday
			const fridayCheckbox = screen.getByRole("checkbox", { name: /friday/i });
			fireEvent.click(fridayCheckbox);

			expect(fridayCheckbox).not.toBeChecked();
		});

		it("should display error toast when team update fails", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			// Mock failed update
			(TeamService.updateTeamBasicInfo as any).mockRejectedValueOnce(new Error("Update failed"));

			const nameInput = screen.getByLabelText(/team name/i);
			fireEvent.change(nameInput, { target: { value: "" } });
			fireEvent.change(nameInput, { target: { value: "Updated Team" } });

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			fireEvent.click(saveButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/update failed/i)).toBeInTheDocument();
		});
	});

	describe("velocity settings form", () => {
		it("should display velocity settings form with current values", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			// Check velocity form values
			const velocityInput = screen.getByLabelText(/story points per sprint/i);
			expect(velocityInput).toHaveValue(50);

			const sprintLengthSelect = screen.getByLabelText(/sprint length/i);
			expect(sprintLengthSelect).toHaveValue("2");
		});

		it("should update velocity settings when form is submitted", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			// Mock successful update
			(TeamService.updateTeamVelocity as any).mockResolvedValueOnce({ ...mockTeam, velocity_baseline: 60 });

			const velocityInput = screen.getByLabelText(/story points per sprint/i);
			fireEvent.change(velocityInput, { target: { value: "" } });
			fireEvent.change(velocityInput, { target: { value: "60" } });

			const saveButton = screen.getByRole("button", { name: /save velocity settings/i });
			fireEvent.click(saveButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/velocity settings updated successfully/i)).toBeInTheDocument();

			expect(TeamService.updateTeamVelocity).toHaveBeenCalledWith("1", {
				baseline_velocity: 60,
				sprint_length: 2
			});
		});

		it("should update sprint length when dropdown is changed", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			const sprintLengthSelect = screen.getByLabelText(/sprint length/i);
			expect(sprintLengthSelect).toHaveValue("2");

			fireEvent.change(sprintLengthSelect, { target: { value: "3" } });

			expect(sprintLengthSelect).toHaveValue("3");
		});
	});

	describe("team member management", () => {
		it("should display team members list", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
			expect(screen.getByText("Team Lead")).toBeInTheDocument();
			expect(screen.getByText("Team Member")).toBeInTheDocument();
		});

		it("should open add member modal when add button is clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("John Doe")).toBeInTheDocument();

			const addButton = screen.getByRole("button", { name: /add team member/i });
			fireEvent.click(addButton);

			expect(screen.getByRole("heading", { name: /add team member/i })).toBeInTheDocument();
			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
		});

		it("should add team member when form is submitted with valid data", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("John Doe")).toBeInTheDocument();

			// Mock successful member addition
			(TeamService.addTeamMember as any).mockResolvedValueOnce({
				id: "3",
				first_name: "New",
				last_name: "Member",
				email: "new.member@example.com",
				team_role: "member"
			});

			// Open modal
			const addButton = screen.getByRole("button", { name: /add team member/i });
			fireEvent.click(addButton);

			// Fill form and submit
			fillMemberForm({ email: "new.member@example.com", role: "member" });
			const submitButton = screen.getByRole("button", { name: /add member/i });
			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/team member added successfully/i)).toBeInTheDocument();

			expect(TeamService.addTeamMember).toHaveBeenCalledWith("1", {
				email: "new.member@example.com",
				role: "member"
			});
		});

		it("should remove team member when remove button is clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("John Doe")).toBeInTheDocument();

			// Mock window.confirm
			const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

			// Mock successful member removal
			(TeamService.removeTeamMember as any).mockResolvedValueOnce(undefined);

			const removeButtons = screen.getAllByText(/remove/i);
			fireEvent.click(removeButtons[0]);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/team member removed successfully/i)).toBeInTheDocument();

			expect(confirmSpy).toHaveBeenCalledWith("Are you sure you want to remove this team member?");
			expect(TeamService.removeTeamMember).toHaveBeenCalledWith("1", "1");

			confirmSpy.mockRestore();
		});

		it("should close add member modal when cancel button is clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("John Doe")).toBeInTheDocument();

			// Open modal
			const addButton = screen.getByRole("button", { name: /add team member/i });
			fireEvent.click(addButton);

			expect(screen.getByRole("heading", { name: /add team member/i })).toBeInTheDocument();

			// Cancel modal
			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			fireEvent.click(cancelButton);

			expect(screen.queryByRole("heading", { name: /add team member/i })).not.toBeInTheDocument();
		});
	});

	describe("sprint management", () => {
		it("should display sprints list", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Sprint 1")).toBeInTheDocument();
			expect(screen.getByText("Sprint 2")).toBeInTheDocument();
			expect(screen.getByText("Active")).toBeInTheDocument();
			expect(screen.getByText("Planned")).toBeInTheDocument();
		});

		it("should open create sprint modal when create button is clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Sprint 1")).toBeInTheDocument();

			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			fireEvent.click(createButton);

			expect(screen.getByRole("heading", { name: /create new sprint/i })).toBeInTheDocument();
			expect(screen.getByLabelText(/sprint name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
		});

		it("should create sprint when form is submitted with valid data", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Sprint 1")).toBeInTheDocument();

			// Mock successful sprint creation
			(TeamService.createSprint as any).mockResolvedValueOnce({
				id: "3",
				name: "Sprint 3",
				start_date: "2025-02-01",
				end_date: "2025-02-14",
				status: "planned",
				team_id: "1"
			});

			// Open modal
			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			fireEvent.click(createButton);

			// Fill form and submit
			fillSprintForm({ name: "Sprint 3", startDate: "2025-02-01", endDate: "2025-02-14" });
			const submitButton = screen.getByRole("button", { name: /create sprint/i });
			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/sprint created successfully/i)).toBeInTheDocument();

			expect(TeamService.createSprint).toHaveBeenCalledWith("1", {
				name: "Sprint 3",
				start_date: "2025-02-01",
				end_date: "2025-02-14"
			});
		});

		it("should validate sprint dates", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Sprint 1")).toBeInTheDocument();

			// Open modal
			const createButton = screen.getByRole("button", { name: /create new sprint/i });
			fireEvent.click(createButton);

			// Fill form with invalid dates (end date before start date)
			const nameInput = screen.getByLabelText(/sprint name/i);
			fireEvent.change(nameInput, { target: { value: "Sprint 3" } });

			const startDateInput = screen.getByLabelText(/start date/i);
			fireEvent.change(startDateInput, { target: { value: "2025-02-14" } });

			const endDateInput = screen.getByLabelText(/end date/i);
			fireEvent.change(endDateInput, { target: { value: "2025-02-01" } });

			const submitButton = screen.getByRole("button", { name: /create sprint/i });
			fireEvent.click(submitButton);

			expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
		});

		it("should show generate multiple sprints alert", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Sprint 1")).toBeInTheDocument();

			// 🚀 PERFORMANCE PATTERN: Window Object Mocking
			// ✅ Mock browser APIs for predictable, fast tests
			// ✅ Prevents actual alerts/confirms from blocking tests
			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

			const generateButton = screen.getByRole("button", { name: /generate multiple sprints/i });
			fireEvent.click(generateButton);

			expect(alertSpy).toHaveBeenCalledWith("Generate Multiple Sprints feature coming soon!");

			alertSpy.mockRestore();
		});
	});

	describe("toast notifications", () => {
		it("should dismiss toast when close button is clicked", async () => {
			// Service mocks already set up in beforeEach
			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByDisplayValue("Test Team")).toBeInTheDocument();

			// Mock successful update to trigger toast
			(TeamService.updateTeamBasicInfo as any).mockResolvedValueOnce({ ...mockTeam, name: "Updated Team" });

			const nameInput = screen.getByLabelText(/team name/i);
			fireEvent.change(nameInput, { target: { value: "" } });
			fireEvent.change(nameInput, { target: { value: "Updated Team" } });

			const saveButton = screen.getByRole("button", { name: /save team information/i });
			fireEvent.click(saveButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/team information updated successfully/i)).toBeInTheDocument();

			// Close toast
			const closeButton = screen.getByRole("button", { name: /dismiss notification/i });
			fireEvent.click(closeButton);

			expect(screen.queryByText(/team information updated successfully/i)).not.toBeInTheDocument();
		});
	});

	describe("empty states", () => {
		it("should display empty state for team members", async () => {
			// Override default mocks to return empty arrays
			(TeamService.getTeamMembers as any).mockResolvedValueOnce([]);
			(TeamService.getTeamSprints as any).mockResolvedValueOnce([]);

			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/no team members found/i)).toBeInTheDocument();
			expect(screen.getByText(/add your first team member to get started/i)).toBeInTheDocument();
		});

		it("should display empty state for sprints", async () => {
			// Override default mocks to return empty arrays
			(TeamService.getTeamMembers as any).mockResolvedValueOnce([]);
			(TeamService.getTeamSprints as any).mockResolvedValueOnce([]);

			renderTeamConfigurationPage();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/no sprints found/i)).toBeInTheDocument();
			expect(screen.getByText(/create your first sprint to get started/i)).toBeInTheDocument();
		});
	});
});
