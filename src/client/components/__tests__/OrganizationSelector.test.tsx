import React from "react";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
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

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset all mock functions to ensure clean state
		Object.values(mockUseOrganization).forEach(value => {
			if (typeof value === "function" && "mockClear" in value) {
				(value as any).mockClear();
			}
		});
		(useOrganization as any).mockReturnValue(mockUseOrganization);
	});

	afterEach(() => {
		cleanup();
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

			await waitFor(() => {
				expect(mockUseOrganization.checkDomain).toHaveBeenCalledWith("test@test.com");
			});
		});

		it("should display domain check results", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				// Use getAllByText since "Test Organization" appears in multiple places
				const testOrgElements = screen.getAllByText("Test Organization");
				expect(testOrgElements.length).toBeGreaterThan(0);
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
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});
		});

		it("should hide create organization option when allowCreate is false", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			render(<OrganizationSelector {...mockProps} allowCreate={false} />);

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

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

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

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
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
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
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

		it("should handle organization creation errors gracefully", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			// Mock createOrganization to fail
			mockUseOrganization.createOrganization.mockRejectedValue(new Error("Organization already exists"));

			render(<OrganizationSelector {...mockProps} allowCreate={true} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			// Fill in form
			await user.type(screen.getByRole("textbox", { name: /organization name/i }), "New Org");

			// Submit form
			await user.click(screen.getByRole("button", { name: /create organization/i }));

			// Should call createOrganization but not call onSelect due to error
			await waitFor(() => {
				expect(mockUseOrganization.createOrganization).toHaveBeenCalledWith({
					name: "New Org",
					description: "",
					domain: "test.com",
					scope: "shared",
					max_users: 50
				});
			});

			// Should NOT call onSelect when creation fails
			expect(mockProps.onSelect).not.toHaveBeenCalled();
		});
	});

	describe("Organization Joining", () => {
		it("should show join option for suggested organization", async () => {
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			render(<OrganizationSelector {...mockProps} />);

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

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			expect(mockUseOrganization.joinOrganization).toHaveBeenCalledWith("org-1");
		});

		it("should handle join organization errors gracefully", async () => {
			const user = userEvent.setup();
			mockUseOrganization.checkDomain.mockResolvedValue(mockDomainCheckResult);

			// Mock join error
			mockUseOrganization.joinOrganization.mockRejectedValue(new Error("Organization is at capacity"));

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: /join test organization/i }));

			// Should call joinOrganization but not call onSelect due to error
			await waitFor(() => {
				expect(mockUseOrganization.joinOrganization).toHaveBeenCalledWith("org-1");
			});

			// Should NOT call onSelect when join fails
			expect(mockProps.onSelect).not.toHaveBeenCalled();
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

			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});

		it("should disable buttons during loading", async () => {
			mockUseOrganization.isLoading = true;
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: true
			});

			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

			const buttons = screen.getAllByRole("button");
			buttons.forEach(button => {
				if (button.getAttribute("aria-label") !== "Close") {
					expect(button).toBeDisabled();
				}
			});
		});
	});

	describe("User Experience", () => {
		it("should successfully complete organization joining workflow", async () => {
			const user = userEvent.setup();

			// Clear and setup mocks explicitly for this test
			vi.clearAllMocks();
			const joinOrgMock = vi.fn().mockResolvedValue({
				message: "Successfully joined organization",
				status: "approved",
				organization_id: "org-1"
			});
			const checkDomainMock = vi.fn().mockResolvedValue(mockDomainCheckResult);

			// Override the entire hook return value for this specific test
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: false,
				checkDomain: checkDomainMock,
				joinOrganization: joinOrgMock
			});

			render(<OrganizationSelector {...mockProps} />, { wrapper: TestWrapper });

			// Wait for domain check to complete and join button to appear
			await waitFor(() => {
				expect(checkDomainMock).toHaveBeenCalledWith("test@test.com");
			});

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /join test organization/i })).toBeInTheDocument();
			});

			const joinButton = screen.getByRole("button", { name: /join test organization/i });
			await user.click(joinButton);

			// Verify the join function was called with correct organization ID
			await waitFor(() => {
				expect(joinOrgMock).toHaveBeenCalledWith("org-1");
			});
		});

		it("should successfully complete organization creation workflow", async () => {
			const user = userEvent.setup();

			// Clear and setup mocks explicitly for this test
			vi.clearAllMocks();
			const createOrgMock = vi.fn().mockResolvedValue(undefined);
			const loadOrgMock = vi.fn().mockResolvedValue(undefined);
			const checkDomainMock = vi.fn().mockResolvedValue({
				...mockDomainCheckResult,
				domain_found: false
			});

			// Override the entire hook return value for this specific test
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: false,
				checkDomain: checkDomainMock,
				createOrganization: createOrgMock,
				loadOrganizations: loadOrgMock
			});

			render(<OrganizationSelector {...mockProps} allowCreate={true} />, { wrapper: TestWrapper });

			// Wait for domain check to complete
			await waitFor(() => {
				expect(checkDomainMock).toHaveBeenCalledWith("test@test.com");
			});

			// Wait for the "Create New Organization" button to appear
			await waitFor(() => {
				expect(screen.getByRole("button", { name: /create new organization/i })).toBeInTheDocument();
			});

			// Step 1: Click "Create New Organization" to show the form
			await user.click(screen.getByRole("button", { name: /create new organization/i }));

			// Step 2: Wait for the form to appear and fill it
			await waitFor(() => {
				expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
			});

			await user.type(screen.getByLabelText("Organization Name"), "New Org");
			await user.type(screen.getByLabelText("Description"), "New organization");

			// Step 3: Submit the form
			const submitButton = screen.getByRole("button", { name: /create organization/i });
			await user.click(submitButton);

			// Verify the create function was called with correct data
			await waitFor(() => {
				expect(createOrgMock).toHaveBeenCalledWith({
					name: "New Org",
					description: "New organization",
					domain: "test.com",
					scope: "shared",
					max_users: 50
				});
			});

			// Verify loadOrganizations was called to refresh the list
			await waitFor(() => {
				expect(loadOrgMock).toHaveBeenCalled();
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", async () => {
			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");
		});

		it("should trap focus within modal", async () => {
			const user = userEvent.setup();
			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

			// Wait for the dialog to be focused
			await waitFor(() => {
				const dialog = screen.getByRole("dialog");
				expect(document.activeElement).toBe(dialog);
			});

			// Tab to first button
			await user.tab();
			const firstButton = screen.getAllByRole("button")[0];
			expect(document.activeElement).toBe(firstButton);

			// Tab to next element
			await user.tab();
			// Continue tabbing should wrap back
			await user.tab();

			// Should cycle back to dialog or first button
			expect(document.activeElement).toBeTruthy();
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();

			// Mock to show organizations (not loading) and no domain found
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				isLoading: false,
				checkDomain: vi.fn().mockResolvedValue({
					...mockDomainCheckResult,
					domain_found: false
				})
			});

			render(<OrganizationSelector {...mockProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Organization")).toBeInTheDocument();
			});

			// Test Tab navigation between focusable elements
			const dialog = screen.getByRole("dialog");
			dialog.focus();

			// Tab to first focusable element (Close button)
			await user.tab();
			const closeButton = document.activeElement;
			expect(closeButton).toBeInstanceOf(HTMLButtonElement);
			expect(closeButton).toHaveAttribute("aria-label", "Close");

			// Tab to next focusable element (Search input)
			await user.tab();
			const searchInput = document.activeElement;
			expect(searchInput).toBeInstanceOf(HTMLInputElement);
			expect(searchInput).toHaveAttribute("placeholder", "Search organizations...");

			// Tab to organization button
			await user.tab();
			const orgButton = document.activeElement;
			expect(orgButton).toBeInstanceOf(HTMLButtonElement);
			expect(orgButton?.textContent).toContain("Create Personal Project");
		});
	});

	describe("Error Handling", () => {
		it("should display error messages", async () => {
			(useOrganization as any).mockReturnValue({
				...mockUseOrganization,
				error: "Failed to load organizations"
			});

			await act(async () => {
				render(<OrganizationSelector {...mockProps} />);
			});

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
