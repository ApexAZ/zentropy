import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import OrganizationSelector from "../OrganizationSelector";
import { useOrganization } from "../../hooks/useOrganization";
import { ToastProvider } from "../../contexts/ToastContext";
import type { Organization, DomainCheckResult } from "../../types";

// Mock useOrganization hook
vi.mock("../../hooks/useOrganization", () => ({
	useOrganization: vi.fn()
}));

describe("OrganizationSelector", () => {
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

	// Helper function to render selector with consistent setup
	const createSelector = (overrides = {}) => {
		const props = { ...mockProps, ...overrides };
		return render(<OrganizationSelector {...props} />, { wrapper: TestWrapper });
	};

	// Helper function to fill organization creation form
	const fillOrganizationForm = async (data: { name?: string; description?: string }) => {
		if (data.name) {
			const nameInput = screen.getByRole("textbox", { name: /organization name/i });
			fireEvent.change(nameInput, { target: { value: data.name } });
		}
		if (data.description) {
			const descInput = screen.getByRole("textbox", { name: /description/i });
			fireEvent.change(descInput, { target: { value: data.description } });
		}
	};

	// Helper function to select an organization
	const selectOrganization = async (organizationName: string) => {
		const user = userEvent.setup();
		const selectButton = screen.getByRole("button", { name: new RegExp(`select ${organizationName}`, "i") });
		await user.click(selectButton);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useOrganization as any).mockReturnValue(mockUseOrganization);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Modal State Management", () => {
		it("should render modal when isOpen is true", async () => {
			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

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

			// Focus the dialog first
			const dialog = screen.getByRole("dialog");
			dialog.focus();
			await user.keyboard("{Escape}");

			expect(mockProps.onClose).toHaveBeenCalled();
		});
	});

	describe("Domain Checking", () => {
		it("should check domain automatically when modal opens", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

			await act(async () => {
				await Promise.resolve();
			});
			expect(mockUseOrganization.checkDomain).toHaveBeenCalledWith("test@test.com");
		});

		it("should display domain check results", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

			await act(async () => {
				await Promise.resolve();
			});

			// Use getAllByText since "Test Organization" appears in multiple places
			const testOrgElements = screen.getAllByText("Test Organization");
			expect(testOrgElements.length).toBeGreaterThan(0);
			expect(
				screen.getByText("Organization 'Test Organization' exists for test.com. You can request to join.")
			).toBeInTheDocument();
		});

		it("should handle domain check errors", async () => {
			mockUseOrganization.checkDomain.mockRejectedValue(new Error("Domain check failed"));

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Domain check failed")).toBeInTheDocument();
			});
		});

		it("should show loading state while checking user's email domain", async () => {
			// Mock checkDomain to return a promise that we control
			let resolvePromise: (value: any) => void;
			const domainCheckPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			mockUseOrganization.checkDomain.mockReturnValue(domainCheckPromise);

			render(<OrganizationSelector {...mockProps} />);

			// User should see loading message while domain is being checked
			expect(screen.getByText("Checking domain...")).toBeInTheDocument();

			// Resolve the promise to complete the test
			resolvePromise!(mockDomainCheckResult);
			await waitFor(() => {
				expect(screen.queryByText("Checking domain...")).not.toBeInTheDocument();
			});
		});
	});

	describe("User can select existing organizations", () => {
		it("should display available organizations", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector();

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Test Organization")).toBeInTheDocument();
			expect(screen.getByText("Another Org")).toBeInTheDocument();
		});

		it("should call onSelect when organization is selected", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector();

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
			});

			await selectOrganization("Test Organization");

			expect(mockProps.onSelect).toHaveBeenCalledWith(mockOrganizations[0]);
		});

		it("should show personal option when allowPersonal is true", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector({ allowPersonal: true });

			await waitFor(() => {
				expect(screen.getByText("Create Personal Project")).toBeInTheDocument();
			});
		});

		it("should hide personal option when allowPersonal is false", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector({ allowPersonal: false });

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

			createSelector({ allowPersonal: true });

			await waitFor(() => {
				expect(screen.getByText("Create Personal Project")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create personal project/i }));

			expect(mockProps.onSelect).toHaveBeenCalledWith(null);
		});
	});

	describe("User can create new organizations", () => {
		it("should show create organization option when allowCreate is true", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector({ allowCreate: true });

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});
		});

		it("should hide create organization option when allowCreate is false", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector({ allowCreate: false });

			await waitFor(() => {
				expect(screen.queryByRole("button", { name: /create new organization/i })).not.toBeInTheDocument();
			});
		});

		it("should show organization creation form when create is clicked", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			createSelector({ allowCreate: true });

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
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

			createSelector({ allowCreate: true });

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

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

			createSelector({ allowCreate: true });

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			await fillOrganizationForm({
				name: "New Org",
				description: "New organization description"
			});

			await user.click(screen.getByRole("button", { name: /create organization/i }));

			expect(mockUseOrganization.createOrganization).toHaveBeenCalledWith({
				name: "New Org",
				description: "New organization description",
				domain: "test.com",
				scope: "shared",
				max_users: 50
			});
		});

		it("should handle organization creation errors gracefully", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});
			mockUseOrganization.createOrganization.mockRejectedValue(new Error("Organization already exists"));

			createSelector({ allowCreate: true });

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			await fillOrganizationForm({ name: "New Org" });

			await user.click(screen.getByRole("button", { name: /create organization/i }));

			await act(async () => {
				await Promise.resolve();
			});
			expect(mockUseOrganization.createOrganization).toHaveBeenCalledWith({
				name: "New Org",
				description: "",
				domain: "test.com",
				scope: "shared",
				max_users: 50
			});

			expect(mockProps.onSelect).not.toHaveBeenCalled();
		});
	});

	describe("User can join organizations", () => {
		it("should show join option for suggested organization", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			createSelector();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});
		});

		it("should handle joining organization", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);
			mockUseOrganization.joinOrganization.mockResolvedValue({
				message: "Successfully joined organization",
				status: "approved",
				organization_id: "org-1"
			});

			createSelector();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			expect(mockUseOrganization.joinOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should handle join organization errors gracefully", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);
			mockUseOrganization.joinOrganization.mockRejectedValue(new Error("Organization is at capacity"));

			createSelector();

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			await waitFor(() => {
				expect(mockUseOrganization.joinOrganization).toHaveBeenCalledWith("org-1");
			});

			expect(mockProps.onSelect).not.toHaveBeenCalled();
		});
	});

	describe("User experiences loading and error states", () => {
		it("should show loading state during organization operations", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			await act(async () => {
				createSelector();
			});

			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});

		it("should disable buttons during loading", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			await act(async () => {
				createSelector();
			});

			const buttons = screen.getAllByRole("button");
			buttons.forEach(button => {
				if (button.getAttribute("aria-label") !== "Close") {
					expect(button).toBeDisabled();
				}
			});
		});

		it("should display error messages", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				error: "Failed to load organizations"
			});

			await act(async () => {
				createSelector();
			});

			expect(screen.getByText("Failed to load organizations")).toBeInTheDocument();
		});

		it("should handle network errors gracefully", async () => {
			mockUseOrganization.checkDomain.mockRejectedValue(new Error("Network error"));

			createSelector();

			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByText("Network error")).toBeInTheDocument();

			expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
		});
	});

	describe("User experiences accessibility features", () => {
		it("should have proper ARIA attributes", async () => {
			await act(async () => {
				createSelector();
			});

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: false,
				checkDomain: vi.fn().mockResolvedValue({
					...mockDomainCheckResult,
					domain_found: false
				})
			});

			createSelector();

			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByText("Test Organization")).toBeInTheDocument();

			const dialog = screen.getByRole("dialog");
			dialog.focus();

			await user.tab();
			const closeButton = document.activeElement;
			expect(closeButton).toBeInstanceOf(HTMLButtonElement);
			expect(closeButton).toHaveAttribute("aria-label", "Close");

			await user.tab();
			const searchInput = document.activeElement;
			expect(searchInput).toBeInstanceOf(HTMLInputElement);
			expect(searchInput).toHaveAttribute("placeholder", "Search organizations...");

			await user.tab();
			const orgButton = document.activeElement;
			expect(orgButton).toBeInstanceOf(HTMLButtonElement);
			expect(orgButton?.textContent).toContain("Create Personal Project");
		});

		it("should trap focus within modal", async () => {
			const user = userEvent.setup();
			await act(async () => {
				createSelector();
			});

			await act(async () => {
				await Promise.resolve();
			});
			const dialog = screen.getByRole("dialog");
			expect(document.activeElement).toBe(dialog);

			await user.tab();
			const firstButton = screen.getAllByRole("button")[0];
			expect(document.activeElement).toBe(firstButton);

			await user.tab();
			await user.tab();

			const activeElement = document.activeElement;
			expect(activeElement).not.toBe(null);
			expect(activeElement).toBeInstanceOf(HTMLElement);
			expect(document.contains(activeElement)).toBe(true);
		});
	});
});
