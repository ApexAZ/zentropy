import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import NavigationPanel from "../NavigationPanel";
import { useOrganization } from "../../hooks/useOrganization";
import { useProject } from "../../hooks/useProject";
import type { Organization, Project } from "../../types";

// Mock hooks
vi.mock("../../hooks/useOrganization", () => ({
	useOrganization: vi.fn()
}));

vi.mock("../../hooks/useProject", () => ({
	useProject: vi.fn()
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

	const mockUseOrganization = {
		organizations: mockOrganizations,
		currentOrganization: mockOrganizations[0],
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

	const mockUseProject = {
		projects: mockProjects,
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

	const mockProps = {
		isOpen: true,
		onClose: vi.fn(),
		userEmail: "test@test.com",
		userName: "Test User"
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useOrganization as any).mockReturnValue(mockUseOrganization);
		(useProject as any).mockReturnValue(mockUseProject);
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

			expect(screen.getByText("Test Organization")).toBeInTheDocument();
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
			expect(screen.getByText("test@test.com")).toBeInTheDocument();
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

			expect(mockUseProject.loadProjectsByOrganization).toHaveBeenCalledWith("org-2");
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

		it("should show join organization button", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /join organization/i })).toBeInTheDocument();
		});

		it("should show create organization button", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /create organization/i })).toBeInTheDocument();
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

			await user.click(screen.getByRole("button", { name: /join organization/i }));

			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should pass current organization to project creation", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /create project/i }));

			// Check that the project creation modal receives the current organization
			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("data-organization", "org-1");
		});
	});

	describe("Organization Management", () => {
		it("should show organization settings for current organization", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /organization settings/i })).toBeInTheDocument();
		});

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

			expect(screen.getByText("50 members")).toBeInTheDocument();
		});

		it("should show organization created date", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Created Jan 1, 2024")).toBeInTheDocument();
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

			await user.selectOptions(screen.getByRole("combobox", { name: /status filter/i }), "archived");

			expect(mockUseProject.loadProjectsByOrganization).toHaveBeenCalledWith("org-1", 1, 50, "archived");
		});
	});

	describe("Loading States", () => {
		it("should show loading state for organizations", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Loading organizations...")).toBeInTheDocument();
		});

		it("should show loading state for projects", () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				isLoading: true
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Loading projects...")).toBeInTheDocument();
		});

		it("should disable actions during loading", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("button", { name: /create project/i })).toBeDisabled();
			expect(screen.getByRole("button", { name: /join organization/i })).toBeDisabled();
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

	describe("Toast Notifications", () => {
		it("should display organization toast messages", () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				toast: { message: "Organization joined successfully", type: "success" }
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Organization joined successfully")).toBeInTheDocument();
		});

		it("should display project toast messages", () => {
			(useProject as any).mockReturnValue({
				...mockUseProject,
				toast: { message: "Project created successfully", type: "success" }
			});

			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByText("Project created successfully")).toBeInTheDocument();
		});

		it("should allow dismissing toast messages", async () => {
			const user = userEvent.setup();
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				toast: { message: "Organization joined successfully", type: "success" }
			});

			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /dismiss/i }));

			expect(mockUseOrganization.setToast).toHaveBeenCalledWith(null);
		});
	});

	describe("Keyboard Navigation", () => {
		it("should support keyboard navigation for organization switching", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			const switchButton = screen.getByRole("button", { name: /switch organization/i });
			switchButton.focus();

			await user.keyboard("{Enter}");

			expect(screen.getByText("Test Organization")).toBeInTheDocument();
			expect(screen.getByText("Another Org")).toBeInTheDocument();
		});

		it("should support arrow key navigation in organization list", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));

			const orgOptions = screen.getAllByRole("option");
			orgOptions[0].focus();

			await user.keyboard("{ArrowDown}");
			expect(document.activeElement).toBe(orgOptions[1]);

			await user.keyboard("{ArrowUp}");
			expect(document.activeElement).toBe(orgOptions[0]);
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
			expect(switchButton).toHaveAttribute("aria-haspopup", "true");
			expect(switchButton).toHaveAttribute("aria-expanded", "false");
		});

		it("should announce organization changes to screen readers", async () => {
			const user = userEvent.setup();
			render(<NavigationPanel {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /switch organization/i }));
			await user.click(screen.getByText("Another Org"));

			expect(screen.getByText("Switched to Another Org")).toHaveAttribute("aria-live", "polite");
		});

		it("should have proper heading structure", () => {
			render(<NavigationPanel {...mockProps} />);

			expect(screen.getByRole("heading", { level: 2, name: /test organization/i })).toBeInTheDocument();
			expect(screen.getByRole("heading", { level: 3, name: /projects/i })).toBeInTheDocument();
		});
	});
});
