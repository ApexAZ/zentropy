import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import ProjectCreationModal from "../ProjectCreationModal";
import { useProject } from "../../hooks/useProject";
import { useOrganization } from "../../hooks/useOrganization";
import { ToastProvider } from "../../contexts/ToastContext";
import type { Organization } from "../../types";

// Mock hooks
vi.mock("../../hooks/useProject", () => ({
	useProject: vi.fn()
}));

vi.mock("../../hooks/useOrganization", () => ({
	useOrganization: vi.fn()
}));

describe("ProjectCreationModal", () => {
	// Test wrapper to provide ToastProvider context
	const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
		React.createElement(ToastProvider, null, children);

	// Mock data
	const mockOrganizations: Organization[] = [
		{
			id: "org-1",
			name: "Test Organization",
			short_name: "test",
			domain: "test.com",
			description: "A test organization",
			scope: "shared",
			max_users: 50,
			created_by: "user-1",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		},
		{
			id: "org-2",
			name: "Another Org",
			scope: "personal",
			created_at: "2024-01-02T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		}
	];

	// const mockProject: Project = {
	// 	id: "proj-1",
	// 	name: "Test Project",
	// 	description: "A test project",
	// 	visibility: "team",
	// 	status: "active",
	// 	organization_id: "org-1",
	// 	created_by: "user-1",
	// 	created_at: "2024-01-01T00:00:00Z",
	// 	updated_at: "2024-01-01T00:00:00Z"
	// };

	const mockUseProject = {
		projects: [],
		currentProject: null,
		isLoading: false,
		error: "",
		toast: null,
		setToast: vi.fn(),
		loadProjects: vi.fn(),
		loadProjectsByOrganization: vi.fn(),
		getProjectById: vi.fn(),
		createProject: vi.fn(),
		updateProject: vi.fn(),
		deleteProject: vi.fn(),
		archiveProject: vi.fn(),
		restoreProject: vi.fn(),
		validateProject: vi.fn()
	};

	const mockUseOrganization = {
		organizations: mockOrganizations,
		currentOrganization: null,
		isLoading: false,
		error: "",
		toast: null,
		setToast: vi.fn(),
		checkDomain: vi.fn(),
		loadOrganizations: vi.fn(),
		getOrganizationById: vi.fn(),
		createOrganization: vi.fn(),
		updateOrganization: vi.fn(),
		deleteOrganization: vi.fn(),
		joinOrganization: vi.fn(),
		leaveOrganization: vi.fn()
	};

	const mockProps = {
		isOpen: true,
		onClose: vi.fn(),
		onSuccess: vi.fn(),
		userEmail: "test@test.com",
		preselectedOrganization: null as Organization | null,
		defaultVisibility: "team" as const
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useProject as any).mockReturnValue(mockUseProject);
		(useOrganization as any).mockReturnValue(mockUseOrganization);
		mockUseProject.validateProject.mockReturnValue({ isValid: true, errors: {} });
	});

	afterEach(() => {
		cleanup();
	});

	describe("Modal State Management", () => {
		it("should render modal when isOpen is true", () => {
			render(<ProjectCreationModal {...mockProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Create New Project")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			render(<ProjectCreationModal {...mockProps} isOpen={false} />);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should call onClose when cancel button is clicked", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /cancel/i }));

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should handle escape key press", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.keyboard("{Escape}");

			expect(mockProps.onClose).toHaveBeenCalled();
		});
	});

	describe("Project Form Validation", () => {
		it("should validate required fields", async () => {
			const user = userEvent.setup();
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name is required" }
			});

			render(<ProjectCreationModal {...mockProps} />);

			// Try to submit without filling required fields
			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(screen.getByText("Project name is required")).toBeInTheDocument();
		});

		it("should validate project name length", async () => {
			const user = userEvent.setup();
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name must be less than 255 characters" }
			});

			render(<ProjectCreationModal {...mockProps} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "a".repeat(256));
			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(screen.getByText("Project name must be less than 255 characters")).toBeInTheDocument();
		});

		it("should validate organization requirement for team projects", async () => {
			const user = userEvent.setup();
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { organization_id: "Team and organization projects require an organization" }
			});

			render(<ProjectCreationModal {...mockProps} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "team");
			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(screen.getByText("Team and organization projects require an organization")).toBeInTheDocument();
		});

		it("should validate personal projects cannot have organization", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "personal");

			// When personal is selected, organization section should be hidden
			expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
		});
	});

	describe("Project Creation", () => {
		it("should create project with valid data", async () => {
			const user = userEvent.setup();
			mockUseProject.createProject.mockResolvedValue(undefined);

			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.type(screen.getByRole("textbox", { name: /description/i }), "Test description");
			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "team");

			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(mockUseProject.createProject).toHaveBeenCalledWith({
				name: "Test Project",
				description: "Test description",
				visibility: "team",
				organization_id: "org-1"
			});
		});

		it("should create personal project without organization", async () => {
			const user = userEvent.setup();
			mockUseProject.createProject.mockResolvedValue(undefined);

			render(<ProjectCreationModal {...mockProps} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Personal Project");
			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "personal");

			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(mockUseProject.createProject).toHaveBeenCalledWith({
				name: "Personal Project",
				description: "",
				visibility: "personal"
			});
		});

		it("should call onSuccess after successful creation", async () => {
			const user = userEvent.setup();
			mockUseProject.createProject.mockResolvedValue(undefined);

			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.click(screen.getByRole("button", { name: /create project/i }));

			await waitFor(() => {
				expect(mockProps.onSuccess).toHaveBeenCalledWith(undefined);
			});
		});

		it("should handle creation errors gracefully", async () => {
			const user = userEvent.setup();

			// Mock the createProject to fail
			mockUseProject.createProject.mockRejectedValue(new Error("Project name already exists"));

			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.click(screen.getByRole("button", { name: /create project/i }));

			// Should call createProject but not close modal due to error
			await waitFor(() => {
				expect(mockUseProject.createProject).toHaveBeenCalledWith(
					expect.objectContaining({
						name: "Test Project"
					})
				);
			});

			// Should NOT close modal when creation fails
			expect(mockProps.onClose).not.toHaveBeenCalled();
		});
	});

	describe("Organization Selection", () => {
		it("should show organization selector when no preselected organization", () => {
			render(<ProjectCreationModal {...mockProps} />);

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /choose organization/i })).toBeInTheDocument();
		});

		it("should display preselected organization", () => {
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			expect(screen.getByText("Organization: Test Organization")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /change organization/i })).toBeInTheDocument();
		});

		it("should allow changing organization", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.click(screen.getByRole("button", { name: /change organization/i }));

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should handle organization selection", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /choose organization/i }));

			// This would open the OrganizationSelector component
			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});
	});

	describe("Visibility Options", () => {
		it("should show all visibility options", () => {
			render(<ProjectCreationModal {...mockProps} />);

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			expect(visibilitySelect).toBeInTheDocument();

			const options = screen.getAllByRole("option");
			expect(options).toHaveLength(3);
			expect(options[0]).toHaveTextContent("Personal");
			expect(options[1]).toHaveTextContent("Team");
			expect(options[2]).toHaveTextContent("Organization");
		});

		it("should set default visibility", () => {
			render(<ProjectCreationModal {...mockProps} defaultVisibility="organization" />);

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			expect(visibilitySelect).toHaveValue("organization");
		});

		it("should update visibility when selection changes", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			await user.selectOptions(visibilitySelect, "personal");

			expect(visibilitySelect).toHaveValue("personal");
		});

		it("should show visibility descriptions", () => {
			render(<ProjectCreationModal {...mockProps} />);

			expect(screen.getByText("Selected team members can see this project")).toBeInTheDocument();
		});

		it("should update visibility description when selection changes", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			await user.selectOptions(visibilitySelect, "organization");

			expect(screen.getByText("All organization members can see this project")).toBeInTheDocument();
		});
	});

	describe("Just-in-Time Organization Flow", () => {
		it("should trigger organization selection for team projects", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "team");

			expect(screen.getByText("An organization is required for team projects")).toBeInTheDocument();
		});

		it("should show organization selection button for team projects", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "team");

			expect(screen.getByRole("button", { name: /choose organization/i })).toBeInTheDocument();
		});

		it("should hide organization selection for personal projects", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			await user.selectOptions(screen.getByRole("combobox", { name: /visibility/i }), "personal");

			expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
		});
	});

	describe("Loading States", () => {
		it("should show loading state during project creation", async () => {
			// First render with normal state
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			// Verify initial state shows "Create Project"
			expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();

			// Now simulate loading state
			const mockUseProjectLoading = {
				...mockUseProject,
				isLoading: true,
				createProject: vi.fn().mockResolvedValue(undefined)
			};
			(useProject as any).mockReturnValue(mockUseProjectLoading);

			// Re-render with loading state
			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />);

			// Now it should show loading state
			expect(screen.getByText("Creating...")).toBeInTheDocument();
		});

		it("should disable form during loading", async () => {
			// const user = userEvent.setup();
			(useProject as any).mockReturnValue({
				...mockUseProject,
				isLoading: true
			});

			render(<ProjectCreationModal {...mockProps} />);

			expect(screen.getByRole("textbox", { name: /project name/i })).toBeDisabled();
			expect(screen.getByRole("textbox", { name: /description/i })).toBeDisabled();
			expect(screen.getByRole("combobox", { name: /visibility/i })).toBeDisabled();
			// When loading, button text is "Creating..."
			expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
		});
	});

	describe("Project Creation Workflow", () => {
		it("should successfully create project with valid data", async () => {
			const user = userEvent.setup();
			mockUseProject.createProject.mockResolvedValue(undefined);

			render(<ProjectCreationModal {...mockProps} />, { wrapper: TestWrapper });

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.type(screen.getByRole("textbox", { name: /description/i }), "Test description");
			await user.click(screen.getByRole("button", { name: /create project/i }));

			// Should call createProject with the provided data
			await waitFor(() => {
				expect(mockUseProject.createProject).toHaveBeenCalledWith(
					expect.objectContaining({
						name: "Test Project",
						description: "Test description"
					})
				);
			});

			// Should close modal on successful creation
			await waitFor(() => {
				expect(mockProps.onClose).toHaveBeenCalled();
			});
		});

		it("should allow switching organizations during creation", async () => {
			render(<ProjectCreationModal {...mockProps} />);

			// Should show organization selection section
			expect(screen.getByText("Select Organization")).toBeInTheDocument();

			// Should be able to interact with organization selector
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
	});

	describe("Form Reset", () => {
		it("should reset form when modal is closed", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<ProjectCreationModal {...mockProps} />);

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.type(screen.getByRole("textbox", { name: /description/i }), "Test description");

			// Close modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={false} />);

			// Reopen modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={true} />);

			expect(screen.getByRole("textbox", { name: /project name/i })).toHaveValue("");
			expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("");
		});

		it("should reset form when modal is reopened", () => {
			const { rerender } = render(<ProjectCreationModal {...mockProps} />);

			// Close modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={false} />);

			// Reopen modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={true} />);

			expect(screen.getByRole("textbox", { name: /project name/i })).toHaveValue("");
			expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("");
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<ProjectCreationModal {...mockProps} />);

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");
		});

		it("should have proper form labels", () => {
			render(<ProjectCreationModal {...mockProps} />);

			expect(screen.getByLabelText("Project Name")).toBeInTheDocument();
			expect(screen.getByLabelText("Description")).toBeInTheDocument();
			expect(screen.getByLabelText("Visibility")).toBeInTheDocument();
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<ProjectCreationModal {...mockProps} />);

			const nameInput = screen.getByRole("textbox", { name: /project name/i });
			const descInput = screen.getByRole("textbox", { name: /description/i });
			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });

			nameInput.focus();
			await user.tab();
			expect(document.activeElement).toBe(descInput);

			await user.tab();
			expect(document.activeElement).toBe(visibilitySelect);
		});

		it("should announce validation errors to screen readers", async () => {
			const user = userEvent.setup();
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name is required" }
			});

			render(<ProjectCreationModal {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /create project/i }));

			const errorMessage = screen.getByText("Project name is required");
			expect(errorMessage).toHaveAttribute("role", "alert");
		});
	});

	describe("Error Handling", () => {
		it("should display validation errors", async () => {
			const user = userEvent.setup();
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: {
					name: "Project name is required",
					description: "Description is too long"
				}
			});

			render(<ProjectCreationModal {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(screen.getByText("Project name is required")).toBeInTheDocument();
			expect(screen.getByText("Description is too long")).toBeInTheDocument();
		});

		it("should handle network errors gracefully", async () => {
			const user = userEvent.setup();

			// Mock the createProject to fail with network error
			mockUseProject.createProject.mockRejectedValue(new Error("Network error"));

			render(<ProjectCreationModal {...mockProps} preselectedOrganization={mockOrganizations[0]} />, {
				wrapper: TestWrapper
			});

			await user.type(screen.getByRole("textbox", { name: /project name/i }), "Test Project");
			await user.click(screen.getByRole("button", { name: /create project/i }));

			// Should call createProject and handle error gracefully
			await waitFor(() => {
				expect(mockUseProject.createProject).toHaveBeenCalledWith(
					expect.objectContaining({
						name: "Test Project"
					})
				);
			});

			// Should NOT close modal when network error occurs
			expect(mockProps.onClose).not.toHaveBeenCalled();
		});
	});
});
