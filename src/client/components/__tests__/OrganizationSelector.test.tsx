import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import OrganizationSelector from "../OrganizationSelector";
import { useOrganization } from "../../hooks/useOrganization";
import type { Organization, DomainCheckResult } from "../../types";

// Mock useOrganization hook
vi.mock("../../hooks/useOrganization", () => ({
	useOrganization: vi.fn()
}));

describe("OrganizationSelector", () => {
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

	const mockDomainCheckResult: DomainCheckResult = {
		domain_found: true,
		domain: "test.com",
		organization: mockOrganizations[0],
		suggestions: {
			action: "join",
			can_join: true,
			can_create: false,
			message: "Organization 'Test Organization' exists for test.com. You can request to join."
		}
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
		onSelect: vi.fn(),
		userEmail: "test@test.com",
		allowCreate: true,
		allowPersonal: true,
		mode: "select" as const
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useOrganization as any).mockReturnValue(mockUseOrganization);
	});

	afterEach(() => {
		cleanup();
	});

	describe("Modal State Management", () => {
		it("should render modal when isOpen is true", () => {
			render(<OrganizationSelector {...mockProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Select Organization")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			render(<OrganizationSelector {...mockProps} isOpen={false} />);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationSelector {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /close/i }));

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should call onClose when backdrop is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationSelector {...mockProps} />);

			// Click the backdrop (div with backdrop class)
			const backdrop = screen.getByTestId("modal-backdrop");
			await user.click(backdrop);

			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should handle escape key press", async () => {
			const user = userEvent.setup();
			render(<OrganizationSelector {...mockProps} />);

			await user.keyboard("{Escape}");

			expect(mockProps.onClose).toHaveBeenCalled();
		});
	});

	describe("Domain Checking", () => {
		it("should check domain automatically when modal opens", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(mockUseOrganization.checkDomain).toHaveBeenCalledWith("test@test.com");
			});
		});

		it("should display domain check results", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
				expect(
					screen.getByText("Organization 'Test Organization' exists for test.com. You can request to join.")
				).toBeInTheDocument();
			});
		});

		it("should handle domain check errors", async () => {
			mockUseOrganization.checkDomain.mockRejectedValue(new Error("Domain check failed"));

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Domain check failed")).toBeInTheDocument();
			});
		});

		it("should show loading state during domain check", async () => {
			// Mock a delayed resolution
			mockUseOrganization.checkDomain.mockReturnValue(
				new Promise(resolve => setTimeout(() => resolve(mockDomainCheckResult), 100))
			);

			render(<OrganizationSelector {...mockProps} />);

			expect(screen.getByText("Checking domain...")).toBeInTheDocument();
		});
	});

	describe("Organization Selection", () => {
		it("should display available organizations", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
				expect(screen.getByText("Another Org")).toBeInTheDocument();
			});
		});

		it("should call onSelect when organization is selected", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /select test organization/i }));

			expect(mockProps.onSelect).toHaveBeenCalledWith(mockOrganizations[0]);
		});

		it("should show personal option when allowPersonal is true", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowPersonal={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create Personal Project")).toBeInTheDocument();
			});
		});

		it("should hide personal option when allowPersonal is false", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowPersonal={false} />);

			await waitFor(() => {
				expect(screen.queryByText("Create Personal Project")).not.toBeInTheDocument();
			});
		});

		it("should handle personal project selection", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowPersonal={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create Personal Project")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create personal project/i }));

			expect(mockProps.onSelect).toHaveBeenCalledWith(null);
		});
	});

	describe("Organization Creation", () => {
		it("should show create organization option when allowCreate is true", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create New Organization")).toBeInTheDocument();
			});
		});

		it("should hide create organization option when allowCreate is false", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowCreate={false} />);

			await waitFor(() => {
				expect(screen.queryByText("Create New Organization")).not.toBeInTheDocument();
			});
		});

		it("should show organization creation form when create is clicked", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create New Organization")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			expect(screen.getByRole("textbox", { name: /organization name/i })).toBeInTheDocument();
			expect(screen.getByRole("textbox", { name: /description/i })).toBeInTheDocument();
		});

		it("should validate organization creation form", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create New Organization")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			// Try to submit empty form
			await user.click(screen.getByRole("button", { name: /create organization/i }));

			expect(screen.getByText("Organization name is required")).toBeInTheDocument();
		});

		it("should create organization with valid data", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});
			mockUseOrganization.createOrganization.mockResolvedValue(undefined);

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create New Organization")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			// Fill in form
			await user.type(screen.getByRole("textbox", { name: /organization name/i }), "New Org");
			await user.type(screen.getByRole("textbox", { name: /description/i }), "New organization description");

			// Submit form
			await user.click(screen.getByRole("button", { name: /create organization/i }));

			expect(mockUseOrganization.createOrganization).toHaveBeenCalledWith({
				name: "New Org",
				description: "New organization description",
				domain: "test.com",
				scope: "shared",
				max_users: 50
			});
		});

		it("should handle organization creation errors", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});
			mockUseOrganization.createOrganization.mockRejectedValue(new Error("Organization already exists"));

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByText("Create New Organization")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			// Fill in form
			await user.type(screen.getByRole("textbox", { name: /organization name/i }), "New Org");

			// Submit form
			await user.click(screen.getByRole("button", { name: /create organization/i }));

			await waitFor(() => {
				expect(screen.getByText("Organization already exists")).toBeInTheDocument();
			});
		});
	});

	describe("Organization Joining", () => {
		it("should show join option for suggested organization", async () => {
			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});
		});

		it("should handle joining organization", async () => {
			const user = userEvent.setup();
			mockUseOrganization.joinOrganization.mockResolvedValue({
				message: "Successfully joined organization",
				status: "approved",
				organization_id: "org-1"
			});

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			expect(mockUseOrganization.joinOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should handle join organization errors", async () => {
			const user = userEvent.setup();
			mockUseOrganization.joinOrganization.mockRejectedValue(new Error("Organization is at capacity"));

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			await waitFor(() => {
				expect(screen.getByText("Organization is at capacity")).toBeInTheDocument();
			});
		});
	});

	describe("Loading States", () => {
		it("should show loading state during organization operations", async () => {
			// const user = userEvent.setup();
			mockUseOrganization.isLoading = true;
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			render(<OrganizationSelector {...mockProps} />);

			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});

		it("should disable buttons during loading", async () => {
			mockUseOrganization.isLoading = true;
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			render(<OrganizationSelector {...mockProps} />);

			const buttons = screen.getAllByRole("button");
			buttons.forEach(button => {
				if (button.getAttribute("aria-label") !== "Close") {
					expect(button).toBeDisabled();
				}
			});
		});
	});

	describe("Toast Notifications", () => {
		it("should display toast messages", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				toast: { message: "Operation successful", type: "success" }
			});

			render(<OrganizationSelector {...mockProps} />);

			expect(screen.getByText("Operation successful")).toBeInTheDocument();
		});

		it("should allow dismissing toast messages", async () => {
			const user = userEvent.setup();
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				toast: { message: "Operation successful", type: "success" }
			});

			render(<OrganizationSelector {...mockProps} />);

			await user.click(screen.getByRole("button", { name: /dismiss/i }));

			expect(mockUseOrganization.setToast).toHaveBeenCalledWith(null);
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<OrganizationSelector {...mockProps} />);

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");
		});

		it("should trap focus within modal", async () => {
			const user = userEvent.setup();
			render(<OrganizationSelector {...mockProps} />);

			const firstButton = screen.getAllByRole("button")[0];
			// const lastButton = screen.getAllByRole("button").slice(-1)[0];

			// Focus should start on first interactive element
			expect(document.activeElement).toBe(firstButton);

			// Tab to last element
			await user.tab();
			// Continue tabbing should wrap to first element
			await user.tab();

			expect(document.activeElement).toBe(firstButton);
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
			});

			// Use arrow keys to navigate organizations
			const orgButtons = screen.getAllByRole("button").filter(btn => btn.textContent?.includes("Select"));

			orgButtons[0].focus();
			await user.keyboard("{ArrowDown}");
			expect(document.activeElement).toBe(orgButtons[1]);

			await user.keyboard("{ArrowUp}");
			expect(document.activeElement).toBe(orgButtons[0]);
		});
	});

	describe("Error Handling", () => {
		it("should display error messages", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				error: "Failed to load organizations"
			});

			render(<OrganizationSelector {...mockProps} />);

			expect(screen.getByText("Failed to load organizations")).toBeInTheDocument();
		});

		it("should handle network errors gracefully", async () => {
			// const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockRejectedValue(new Error("Network error"));

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Network error")).toBeInTheDocument();
			});

			// Should still allow retrying
			expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
		});
	});
});
