import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import { AccountSecuritySection } from "../AccountSecuritySection";
import { useAccountSecurity } from "../../hooks/useAccountSecurity";
import type { AccountSecurityResponse } from "../../types";

// Mock useAccountSecurity hook to control all business logic
vi.mock("../../hooks/useAccountSecurity", () => ({
	useAccountSecurity: vi.fn()
}));

describe("AccountSecuritySection", () => {
	// Following User-Focused Testing pattern from tests/README.md
	const mockOnSecurityUpdate = vi.fn();
	const mockOnError = vi.fn();

	const mockEmailOnlyResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: false,
		google_email: undefined
	};

	const mockHybridResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: true,
		google_email: "john@gmail.com"
	};

	const defaultProps = {
		onSecurityUpdate: mockOnSecurityUpdate,
		onError: mockOnError
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	// Test loading state
	it("should show loading state while fetching security status", () => {
		// Mock hook to return loading state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: true,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		expect(screen.getByText("Loading security status...")).toBeInTheDocument();
		expect(screen.getByText("Loading...")).toBeInTheDocument();
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	// Test email-only authentication display
	it("should display email-only authentication status correctly", async () => {
		// Mock hook to return email-only status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Should show email authentication as linked
		expect(screen.getByText("Email Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");

		// Should show Google authentication as not linked
		expect(screen.getByText("Google Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Not linked");

		// Should show "Link Google Account" button
		expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Unlink Google Account" })).not.toBeInTheDocument();
	});

	// Test hybrid authentication display
	it("should display hybrid authentication status correctly", async () => {
		// Mock hook to return hybrid status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockHybridResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Should show both authentication methods as active
		expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
		expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");

		// Should show linked Google email
		expect(screen.getByText("john@gmail.com")).toBeInTheDocument();

		// Should show "Unlink Google Account" button
		expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Link Google Account" })).not.toBeInTheDocument();
	});

	// Test visual indicators and status badges
	it("should display correct status badges and indicators", async () => {
		// Mock hook to return email-only status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Check for visual status indicators
		expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-success");
		expect(screen.getByTestId("google-auth-indicator")).toHaveClass("bg-neutral");

		// Check accessibility attributes
		expect(screen.getByTestId("email-auth-status")).toHaveAttribute("aria-label", "Email authentication is active");
		expect(screen.getByTestId("google-auth-status")).toHaveAttribute(
			"aria-label",
			"Google authentication is not linked"
		);
	});

	// Test linking Google account
	it("should handle Google account linking successfully", async () => {
		const user = userEvent.setup();
		const mockHandleLinkGoogle = vi.fn();

		// Mock hook to return email-only status with link handler
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: mockHandleLinkGoogle,
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		});

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);

		// Should call the hook's handleLinkGoogle function
		expect(mockHandleLinkGoogle).toHaveBeenCalled();
	});

	// Test unlinking Google account
	it("should handle Google account unlinking with password confirmation", async () => {
		const user = userEvent.setup();
		const mockHandleUnlinkGoogle = vi.fn().mockResolvedValue(undefined);

		// Mock hook to return hybrid status with unlink handler
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockHybridResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: mockHandleUnlinkGoogle
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);

		// Should show password confirmation dialog
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Confirm Password")).toBeInTheDocument();
		});

		// Enter password and confirm
		await waitFor(() => {
			expect(document.getElementById("password")).toBeInTheDocument();
		});
		const passwordInput = document.getElementById("password") as HTMLInputElement;
		await user.type(passwordInput, "current-password");

		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		await user.click(confirmButton);

		// Should call the hook's handleUnlinkGoogle with password
		await waitFor(() => {
			expect(mockHandleUnlinkGoogle).toHaveBeenCalledWith("current-password");
		});
	});

	// Test password confirmation modal
	it("should validate password before unlinking", async () => {
		const user = userEvent.setup();
		const mockHandleUnlinkGoogle = vi.fn();

		// Mock hook to return hybrid status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockHybridResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: mockHandleUnlinkGoogle
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);

		// Should show password dialog
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		// Try to confirm without password
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		await user.click(confirmButton);

		// Should show validation error
		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockHandleUnlinkGoogle).not.toHaveBeenCalled();
	});

	// Test error handling
	it("should handle API errors gracefully", async () => {
		const mockLoadSecurityStatus = vi.fn();

		// Mock hook to return error state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: false,
			error: "Failed to load security status",
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: mockLoadSecurityStatus,
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		expect(screen.getByText("Failed to load security information")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});

	// Test retry functionality
	it("should allow user to retry after error", async () => {
		const user = userEvent.setup();
		const mockLoadSecurityStatus = vi.fn();

		// Mock hook to return error state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: false,
			error: "Network error",
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: mockLoadSecurityStatus,
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		// Wait for error state
		await waitFor(() => {
			expect(screen.getByText("Failed to load security information")).toBeInTheDocument();
		});

		// Click retry button
		const retryButton = screen.getByRole("button", { name: "Retry" });
		await user.click(retryButton);

		// Should call the hook's loadSecurityStatus function
		expect(mockLoadSecurityStatus).toHaveBeenCalled();
	});

	// Test linking errors
	it("should handle linking errors appropriately", async () => {
		const user = userEvent.setup();
		const mockHandleLinkGoogle = vi.fn().mockRejectedValue(new Error("Google email does not match account email"));

		// Mock hook to return email-only status with failing link handler
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: mockHandleLinkGoogle,
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		});

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);

		// Should call the hook's handleLinkGoogle function
		expect(mockHandleLinkGoogle).toHaveBeenCalled();
	});

	// Test unlinking errors
	it("should handle unlinking errors appropriately", async () => {
		const user = userEvent.setup();
		const mockHandleUnlinkGoogle = vi.fn().mockRejectedValue(new Error("Incorrect password"));

		// Mock hook to return hybrid status with failing unlink handler
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockHybridResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: mockHandleUnlinkGoogle
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);

		// Enter password and confirm
		await waitFor(() => {
			expect(document.getElementById("password")).toBeInTheDocument();
		});

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		await user.type(passwordInput, "wrong-password");

		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		await user.click(confirmButton);

		// Should show error in dialog
		await waitFor(() => {
			expect(screen.getByText("Incorrect password")).toBeInTheDocument();
		});
	});

	// Test accessibility
	it("should meet accessibility requirements", async () => {
		// Mock hook to return email-only status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Check heading structure
		expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();

		// Check ARIA labels
		expect(screen.getByTestId("email-auth-status")).toHaveAttribute("aria-label");
		expect(screen.getByTestId("google-auth-status")).toHaveAttribute("aria-label");

		// Check button accessibility
		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		expect(linkButton).toHaveAttribute("aria-describedby");
	});

	// Test responsive design elements
	it("should render responsively across device sizes", async () => {
		// Mock hook to return email-only status
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Check that the container exists and has the Card component styling
		const container = screen.getByTestId("account-security-container");
		expect(container).toHaveClass("border-layout-background", "bg-content-background", "rounded-lg");
	});
});
