import React from "react";
// eslint-disable-next-line no-restricted-imports -- ProjectCreationModal tests require custom wrapper for ToastProvider integration testing
import { render, screen, fireEvent, act } from "@testing-library/react";
// eslint-disable-next-line no-restricted-imports -- ProjectCreationModal tests require userEvent for keyboard navigation and modal accessibility testing
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import ProjectCreationModal from "../ProjectCreationModal";
import { useProject } from "../../hooks/useProject";
import { useOrganization } from "../../hooks/useOrganization";
import { ToastProvider } from "../../contexts/ToastContext";
import { fastStateSync } from "../../__tests__/utils";
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

	// Helper function to render modal with consistent setup
	const createModal = (overrides = {}) => {
		const props = { ...mockProps, ...overrides };

		return render(<ProjectCreationModal {...props} />, { wrapper: TestWrapper });
	};

	// Helper function to fill project form
	const fillProjectForm = (formData: { name?: string; description?: string; visibility?: string }) => {
		if (formData.name) {
			const nameInput = screen.getByRole("textbox", { name: /project name/i });
			fireEvent.change(nameInput, { target: { value: formData.name } });
		}

		if (formData.description) {
			const descInput = screen.getByRole("textbox", { name: /description/i });
			fireEvent.change(descInput, { target: { value: formData.description } });
		}

		if (formData.visibility) {
			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			fireEvent.change(visibilitySelect, { target: { value: formData.visibility } });
		}
	};

	// Helper function to trigger project creation
	const submitProject = () => {
		const createButton = screen.getByRole("button", { name: /create project/i });
		fireEvent.click(createButton);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useProject as any).mockReturnValue(mockUseProject);
		(useOrganization as any).mockReturnValue(mockUseOrganization);
		mockUseProject.validateProject.mockReturnValue({ isValid: true, errors: {} });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("User can open and close modal", () => {
		it("should render modal when isOpen is true", () => {
			createModal();

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Create New Project")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			createModal({ isOpen: false });

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should call onClose when close button is clicked", () => {
			createModal();

			fireEvent.click(screen.getByRole("button", { name: /close/i }));

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should call onClose when cancel button is clicked", () => {
			createModal();

			fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should handle escape key press", () => {
			createModal();

			// Escape key should close the modal
			const modal = screen.getByRole("dialog");
			fireEvent.keyDown(modal, { key: "Escape" });

			expect(mockProps.onClose).toHaveBeenCalled();
		});
	});

	describe("User encounters validation errors", () => {
		it("should show error when project name is missing", () => {
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name is required" }
			});

			createModal();

			// Try to submit without filling required fields
			submitProject();

			expect(screen.getByText("Project name is required")).toBeInTheDocument();
		});

		it("should show error when project name is too long", () => {
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name must be less than 255 characters" }
			});

			createModal();

			// Fill form with long name
			fillProjectForm({ name: "a".repeat(256) });
			submitProject();

			expect(screen.getByText("Project name must be less than 255 characters")).toBeInTheDocument();
		});

		it("should show error when team project has no organization", () => {
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { organization_id: "Team and organization projects require an organization" }
			});

			createModal();

			fillProjectForm({ name: "Test Project", visibility: "team" });
			submitProject();

			expect(screen.getByText("Team and organization projects require an organization")).toBeInTheDocument();
		});

		it("should handle multiple validation errors", () => {
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: {
					name: "Project name is required",
					description: "Description is too long"
				}
			});

			createModal();

			submitProject();

			expect(screen.getByText("Project name is required")).toBeInTheDocument();
			expect(screen.getByText("Description is too long")).toBeInTheDocument();
		});

		it("should hide organization section for personal projects", () => {
			createModal({ preselectedOrganization: mockOrganizations[0] });

			fillProjectForm({ name: "Test Project", visibility: "personal" });

			// When personal is selected, organization section should be hidden
			expect(screen.queryByText("Organization:")).not.toBeInTheDocument();
		});
	});

	describe("User can create projects", () => {
		it("should successfully create team project with organization", async () => {
			mockUseProject.createProject.mockResolvedValue(undefined);

			createModal({ preselectedOrganization: mockOrganizations[0] });

			act(() => {
				fillProjectForm({
					name: "Test Project",
					description: "Test description",
					visibility: "team"
				});

				submitProject();
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(mockUseProject.createProject).toHaveBeenCalledWith({
				name: "Test Project",
				description: "Test description",
				visibility: "team",
				organization_id: "org-1"
			});
		});

		it("should successfully create personal project without organization", async () => {
			mockUseProject.createProject.mockResolvedValue(undefined);

			createModal();

			act(() => {
				fillProjectForm({
					name: "Personal Project",
					visibility: "personal"
				});

				submitProject();
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(mockUseProject.createProject).toHaveBeenCalledWith({
				name: "Personal Project",
				description: "",
				visibility: "personal"
			});
		});

		it("should call onSuccess after successful creation", async () => {
			mockUseProject.createProject.mockResolvedValue(undefined);

			createModal({ preselectedOrganization: mockOrganizations[0] });

			act(() => {
				fillProjectForm({ name: "Test Project" });
				submitProject();
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(mockProps.onSuccess).toHaveBeenCalledWith(undefined);
		});

		it("should handle creation errors gracefully", async () => {
			mockUseProject.createProject.mockRejectedValue(new Error("Project name already exists"));

			createModal({ preselectedOrganization: mockOrganizations[0] });

			act(() => {
				fillProjectForm({ name: "Test Project" });
				submitProject();
			});

			await fastStateSync();

			// Should NOT close modal when creation fails
			expect(mockProps.onClose).not.toHaveBeenCalled();
		});
	});

	describe("User can manage organizations", () => {
		it("should show organization selector when no preselected organization", () => {
			createModal();

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /choose organization/i })).toBeInTheDocument();
		});

		it("should display preselected organization", () => {
			createModal({ preselectedOrganization: mockOrganizations[0] });

			expect(screen.getByText("Organization: Test Organization")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /change organization/i })).toBeInTheDocument();
		});

		it("should allow changing organization", async () => {
			createModal({ preselectedOrganization: mockOrganizations[0] });

			act(() => {
				fireEvent.click(screen.getByRole("button", { name: /change organization/i }));
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should handle organization selection", async () => {
			createModal();

			act(() => {
				fireEvent.click(screen.getByRole("button", { name: /choose organization/i }));
			});

			await act(async () => {
				await Promise.resolve();
			});

			// This would open the OrganizationSelector component
			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should require organization for team projects", () => {
			createModal();

			fillProjectForm({ name: "Test Project", visibility: "team" });

			expect(screen.getByText("An organization is required for team projects")).toBeInTheDocument();
		});

		it("should show organization selection button for team projects", () => {
			createModal();

			fillProjectForm({ visibility: "team" });

			expect(screen.getByRole("button", { name: /choose organization/i })).toBeInTheDocument();
		});
	});

	describe("User can configure project visibility", () => {
		it("should show all visibility options", () => {
			createModal();

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			expect(visibilitySelect).toBeInTheDocument();

			const options = screen.getAllByRole("option");
			expect(options).toHaveLength(3);
			expect(options[0]).toHaveTextContent("Personal");
			expect(options[1]).toHaveTextContent("Team");
			expect(options[2]).toHaveTextContent("Organization");
		});

		it("should set default visibility", () => {
			createModal({ defaultVisibility: "organization" });

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			expect(visibilitySelect).toHaveValue("organization");
		});

		it("should update visibility when selection changes", () => {
			createModal();

			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			fireEvent.change(visibilitySelect, { target: { value: "personal" } });

			expect(visibilitySelect).toHaveValue("personal");
		});

		it("should show and update visibility descriptions", () => {
			createModal();

			// Should show default description
			expect(screen.getByText("Selected team members can see this project")).toBeInTheDocument();

			// Should update description when selection changes
			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });
			fireEvent.change(visibilitySelect, { target: { value: "organization" } });

			expect(screen.getByText("All organization members can see this project")).toBeInTheDocument();
		});
	});

	describe("User experiences loading states", () => {
		it("should show loading state during project creation", async () => {
			// First render with normal state
			createModal({ preselectedOrganization: mockOrganizations[0] });

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
			createModal({ preselectedOrganization: mockOrganizations[0] });

			// Now it should show loading state in the submit button
			expect(screen.getByRole("button", { name: "Creating..." })).toBeInTheDocument();
		});

		it("should disable form during loading", async () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				isLoading: true
			});

			createModal();

			expect(screen.getByRole("textbox", { name: /project name/i })).toBeDisabled();
			expect(screen.getByRole("textbox", { name: /description/i })).toBeDisabled();
			expect(screen.getByRole("combobox", { name: /visibility/i })).toBeDisabled();
			// When loading, button text is "Creating..."
			expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
		});
	});

	describe("User experiences form reset", () => {
		it("should reset form when modal is closed and reopened", () => {
			const { rerender } = render(<ProjectCreationModal {...mockProps} />, { wrapper: TestWrapper });

			fillProjectForm({
				name: "Test Project",
				description: "Test description"
			});

			// Close modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={false} />);

			// Reopen modal
			rerender(<ProjectCreationModal {...mockProps} isOpen={true} />);

			expect(screen.getByRole("textbox", { name: /project name/i })).toHaveValue("");
			expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue("");
		});
	});

	describe("User experiences accessibility features", () => {
		it("should have proper ARIA attributes", () => {
			createModal();

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");
		});

		it("should have proper form labels", () => {
			createModal();

			expect(screen.getByLabelText("Project Name")).toBeInTheDocument();
			expect(screen.getByLabelText("Description")).toBeInTheDocument();
			expect(screen.getByLabelText("Visibility")).toBeInTheDocument();
		});

		/* eslint-disable no-restricted-syntax */
		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			createModal();

			const nameInput = screen.getByRole("textbox", { name: /project name/i });
			const descInput = screen.getByRole("textbox", { name: /description/i });
			const visibilitySelect = screen.getByRole("combobox", { name: /visibility/i });

			nameInput.focus();
			await user.tab();
			expect(document.activeElement).toBe(descInput);

			await user.tab();
			expect(document.activeElement).toBe(visibilitySelect);
		});
		/* eslint-enable no-restricted-syntax */

		it("should announce validation errors to screen readers", () => {
			mockUseProject.validateProject.mockReturnValue({
				isValid: false,
				errors: { name: "Project name is required" }
			});

			createModal();

			submitProject();

			const errorMessage = screen.getByText("Project name is required");
			expect(errorMessage).toHaveAttribute("role", "alert");
		});
	});
});
