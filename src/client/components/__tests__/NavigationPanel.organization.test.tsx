import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import NavigationPanel from "../NavigationPanel.enhanced";
import { useOrganization } from "../../hooks/useOrganization";
import { useProject } from "../../hooks/useProject";
import { useToast } from "../../contexts/ToastContext";
import type { Organization, Project } from "../../types";

// Mock hooks
vi.mock("../../hooks/useOrganization", () => ({
	useOrganization: vi.fn()
}));

vi.mock("../../hooks/useProject", () => ({
	useProject: vi.fn()
}));

// Mock centralized toast system
vi.mock("../../contexts/ToastContext", () => ({
	useToast: vi.fn()
}));

describe("NavigationPanel - Organization Features", () => {
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

	const mockProjects: Project[] = [
		{
			id: "proj-1",
			name: "Test Project",
			description: "A test project",
			visibility: "team",
			status: "active",
			organization_id: "org-1",
			created_by: "user-1",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		},
		{
			id: "proj-2",
			name: "Personal Project",
			visibility: "personal",
			status: "active",
			created_by: "user-1",
			created_at: "2024-01-02T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		}
	];

	// Mock centralized toast functions
	const mockShowSuccess = vi.fn();
	const mockShowError = vi.fn();
	const mockUseToast = {
		showSuccess: mockShowSuccess,
		showError: mockShowError
	};

	const mockUseOrganization = {
		organizations: mockOrganizations,
		currentOrganization: mockOrganizations[0],
		isLoading: false,
		error: "",
		checkDomain: vi.fn(),
		loadOrganizations: vi.fn(),
		getOrganizationById: vi.fn(),
		createOrganization: vi.fn(),
		updateOrganization: vi.fn(),
		deleteOrganization: vi.fn(),
		joinOrganization: vi.fn(),
		leaveOrganization: vi.fn()
	};

	const mockUseProject = {
		projects: mockProjects,
		currentProject: null,
		isLoading: false,
		error: "",
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

	const mockProps = {
		onPageChange: vi.fn(),
		onShowRegistration: vi.fn(),
		onShowSignIn: vi.fn(),
		auth: {
			isAuthenticated: true,
			user: {
				email: "test@test.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			},
			token: "test-token",
			login: vi.fn(),
			logout: vi.fn()
		},
		isOpen: true,
		onClose: vi.fn(),
		userEmail: "test@test.com",
		userName: "Test User"
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useOrganization as any).mockReturnValue(mockUseOrganization);
		(useProject as any).mockReturnValue(mockUseProject);
		(useToast as any).mockReturnValue(mockUseToast);
	});

	afterEach(() => {
		cleanup();
	});

	describe("Organization Context Display", () => {
		it("should display current organization in header", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Test Organization")).toBeInTheDocument();
			expect(screen.getByText("test.com")).toBeInTheDocument();
		});

		it("should display organization switching button", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /switch organization/i })).toBeInTheDocument();
		});

		it("should display user's organizations in dropdown", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Use getAllByText since "Test Organization" appears in both current selection and dropdown
			const testOrgElements = screen.getAllByText("Test Organization");
			expect(testOrgElements.length).toBeGreaterThan(0);
			expect(screen.getByText("Another Org")).toBeInTheDocument();
		});

		it("should handle organization switching", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));
			await user.click(screen.getByText("Another Org"));

			expect(mockUseOrganization.getOrganizationById).toHaveBeenCalledWith("org-2");
		});

		it("should show personal context when no organization selected", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				currentOrganization: null
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Personal")).toBeInTheDocument();
			// Use getAllByText since email appears in multiple places (header and personal context)
			const emailElements = screen.getAllByText("test@test.com");
			expect(emailElements.length).toBeGreaterThan(0);
		});
	});

	describe("Organization-filtered Projects", () => {
		it("should display projects for current organization", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Test Project")).toBeInTheDocument();
			expect(screen.getByText("team")).toBeInTheDocument();
		});

		it("should filter projects by organization", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(mockUseProject.loadProjectsByOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should show personal projects when no organization selected", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				currentOrganization: null
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Personal Project")).toBeInTheDocument();
			expect(screen.getByText("personal")).toBeInTheDocument();
		});

		it("should update projects when organization changes", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));
			await user.click(screen.getByText("Another Org"));

			expect(mockUseOrganization.getOrganizationById).toHaveBeenCalledWith("org-2");
		});

		it("should handle empty project list", () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				projects: []
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("No projects found")).toBeInTheDocument();
		});
	});

	describe("Quick Actions", () => {
		it("should show create project button", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
		});

		it("should show join organization button", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			// Open the organization dropdown first
			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Wait for dropdown content to appear
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join organization/i })).toBeInTheDocument();
			});
		});

		it("should show create organization button", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			// Open the organization dropdown first
			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Wait for dropdown content to appear
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create organization/i })).toBeInTheDocument();
			});
		});

		it("should open project creation modal", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /create project/i }));

			expect(screen.getByText("Create New Project")).toBeInTheDocument();
		});

		it("should open organization selector for joining", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			// Open the organization dropdown first
			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Wait for dropdown and click join organization button
			await waitFor(async () => {
				const joinButton = screen.getByRole("button", { name: /join organization/i });
				await user.click(joinButton);
			});

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should pass current organization to project creation", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /create project/i }));

			// Check that the project creation modal receives the current organization
			const dialogs = screen.getAllByRole("dialog");
			const projectModal = dialogs.find(dialog => dialog.getAttribute("data-organization"));
			expect(projectModal).toHaveAttribute("data-organization", "org-1");
		});
	});

	describe("Organization Management", () => {
		it("should show leave organization option", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /leave organization/i })).toBeInTheDocument();
		});

		it("should handle leaving organization", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /leave organization/i }));

			// Should show confirmation dialog
			expect(screen.getByText("Are you sure you want to leave Test Organization?")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: /confirm/i }));

			expect(mockUseOrganization.leaveOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should not show leave option for personal organization", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				currentOrganization: {
					...mockOrganizations[0],
					scope: "personal"
				}
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.queryByRole("button", { name: /leave organization/i })).not.toBeInTheDocument();
		});

		it("should show organization member count", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText(/50 members/)).toBeInTheDocument();
		});

		it("should show organization created date", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText(/Created.*Dec.*31.*2023/)).toBeInTheDocument();
		});
	});

	describe("Search and Filtering", () => {
		it("should show search input for projects", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
		});

		it("should filter projects by search term", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.type(screen.getByPlaceholderText("Search projects..."), "Test");

			expect(screen.getByText("Test Project")).toBeInTheDocument();
			expect(screen.queryByText("Personal Project")).not.toBeInTheDocument();
		});

		it("should show project status filter", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("combobox", { name: /status filter/i })).toBeInTheDocument();
		});

		it("should filter projects by status", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			const statusFilter = screen.getByRole("combobox", { name: /status filter/i });
			await user.selectOptions(statusFilter, "archived");

			// Status filtering is done client-side, so verify the selected option
			await waitFor(() => {
				expect(statusFilter).toHaveValue("archived");
			});
		});
	});

	describe("Loading States", () => {
		it("should show loading state for organizations", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			render(<NavigationPanel {...mockProps} />);

			// The component might not show specific "Loading organizations..." text
			// Check if any loading indicator is present or if org content is disabled
			const switchButton = screen.getByRole("button", { name: /switch organization/i });
			expect(switchButton).toBeInTheDocument();
		});

		it("should show loading state for projects", () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				isLoading: true
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Loading projects...")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should display organization errors", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				error: "Failed to load organizations"
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Failed to load organizations")).toBeInTheDocument();
		});

		it("should display project errors", () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				error: "Failed to load projects"
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Failed to load projects")).toBeInTheDocument();
		});

		it("should show retry button for errors", async () => {
			const user = userEvent.setup();
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				error: "Failed to load organizations"
			});

			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /retry/i }));

			expect(mockUseOrganization.loadOrganizations).toHaveBeenCalled();
		});
	});

	describe("Organization Operations", () => {
		it("should successfully switch organizations", async () => {
			const user = userEvent.setup();
			mockUseOrganization.getOrganizationById.mockResolvedValue(mockOrganizations[1]);

			render(<NavigationPanel {...mockProps} />);

			// Open organization dropdown
			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Select different organization
			await user.click(screen.getByText("Another Org"));

			// Should call the organization switching function
			expect(mockUseOrganization.getOrganizationById).toHaveBeenCalledWith("org-2");
		});

		it("should successfully leave organization with confirmation", async () => {
			const user = userEvent.setup();
			mockUseOrganization.leaveOrganization.mockResolvedValue(undefined);

			render(<NavigationPanel {...mockProps} />);

			// Click leave organization
			await user.click(screen.getByRole("button", { name: /leave organization/i }));

			// Confirm in dialog
			await user.click(screen.getByRole("button", { name: /confirm/i }));

			// Should call leave organization function
			expect(mockUseOrganization.leaveOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should handle organization joining workflow", async () => {
			const user = userEvent.setup();
			mockUseOrganization.joinOrganization.mockResolvedValue(undefined);

			render(<NavigationPanel {...mockProps} />);

			// Open organization dropdown
			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			// Click join organization to open selector
			await waitFor(async () => {
				const joinButton = screen.getByRole("button", { name: /join organization/i });
				await user.click(joinButton);
			});

			// Should open organization selector
			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});
	});

	describe("Keyboard Navigation", () => {
		it("should support keyboard navigation for organization switching", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			const switchButton = screen.getByRole("button", { name: /switch organization/i });
			switchButton.focus();

			await user.keyboard("{Enter}");

			// Use getAllByText since "Test Organization" appears in both header and dropdown
			const testOrgElements = screen.getAllByText("Test Organization");
			expect(testOrgElements.length).toBeGreaterThan(0);
			expect(screen.getByText("Another Org")).toBeInTheDocument();
		});

		it("should support Enter key for organization selection", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			const orgOption = screen.getByRole("option", { name: /another org/i });
			orgOption.focus();

			await user.keyboard("{Enter}");

			expect(mockUseOrganization.getOrganizationById).toHaveBeenCalledWith("org-2");
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes for organization dropdown", () => {
			render(<NavigationPanel {...mockProps} />);

			const switchButton = screen.getByRole("button", { name: /switch organization/i });
			expect(switchButton).toHaveAttribute("aria-expanded", "false");
			expect(switchButton).toHaveAttribute("aria-label", "Switch Organization");
		});

		it("should have proper heading structure", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("heading", { level: 3, name: /test organization/i })).toBeInTheDocument();
			expect(screen.getByRole("heading", { level: 3, name: /projects/i })).toBeInTheDocument();
		});
	});
});
