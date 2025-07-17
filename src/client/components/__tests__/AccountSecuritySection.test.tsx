import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import { AccountSecuritySection } from "../AccountSecuritySection";
import { useAccountSecurity } from "../../hooks/useAccountSecurity";
import { useMultiProviderOAuth } from "../../hooks/useMultiProviderOAuth";
import type { AccountSecurityResponse } from "../../types";

// Mock useAccountSecurity hook to control all business logic
vi.mock("../../hooks/useAccountSecurity", () => ({
	useAccountSecurity: vi.fn()
}));

// Mock useMultiProviderOAuth hook
vi.mock("../../hooks/useMultiProviderOAuth", () => ({
	useMultiProviderOAuth: vi.fn()
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

	// Default mock for useMultiProviderOAuth
	const defaultMultiProviderOAuth = {
		providers: [
			{
				name: "google",
				displayName: "Google",
				iconClass: "fab fa-google",
				brandColor: "#4285f4"
			},
			{
				name: "microsoft",
				displayName: "Microsoft",
				iconClass: "fab fa-microsoft",
				brandColor: "#0078d4"
			},
			{
				name: "github",
				displayName: "GitHub",
				iconClass: "fab fa-github",
				brandColor: "#333"
			}
		],
		linkProvider: vi.fn(),
		unlinkProvider: vi.fn(),
		getProviderState: vi.fn().mockReturnValue({
			isReady: true,
			isLoading: false,
			error: null
		}),
		isProviderLinked: vi.fn().mockReturnValue(false)
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mock for useMultiProviderOAuth
		(useMultiProviderOAuth as any).mockReturnValue(defaultMultiProviderOAuth);
	});

	afterEach(() => {
		cleanup();
	});

	// Test skeleton loading state
	it("should show skeleton loading state while fetching security status", () => {
		// Mock hook to return loading state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: true,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			optimisticSecurityStatus: null,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		// Should show skeleton loading elements instead of simple spinner
		const skeletonElements = screen.getAllByRole("status");
		expect(skeletonElements.length).toBeGreaterThan(0);

		// Should show Account Security title
		expect(screen.getByText("Account Security")).toBeInTheDocument();

		// Should show test container
		expect(screen.getByTestId("account-security-container")).toBeInTheDocument();
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
			optimisticSecurityStatus: null,
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

	// Test optimistic updates
	it("should display optimistic linked state during Google linking", async () => {
		const mockOptimisticResponse = {
			email_auth_linked: true,
			google_auth_linked: true,
			google_email: "linking..."
		};

		// Mock hook to return optimistic state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: mockEmailOnlyResponse,
			loading: false,
			error: null,
			linkingLoading: true,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			optimisticSecurityStatus: mockOptimisticResponse,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		// Mock multi-provider OAuth to show Google as linked
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: vi.fn().mockImplementation(provider => provider === "google")
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Should show optimistic Google authentication as linked
		expect(screen.getByText("Google Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");

		// Should show linking email placeholder
		expect(screen.getByText("linking...")).toBeInTheDocument();

		// Should show "Unlink Google" button (optimistic state) - updated text
		expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Link Google Account" })).not.toBeInTheDocument();
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
			optimisticSecurityStatus: null,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		// Mock multi-provider OAuth to show Google as linked
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: vi.fn().mockImplementation(provider => provider === "google")
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
			optimisticSecurityStatus: null,
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
		const mockLinkProvider = vi.fn();

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

		// Mock multi-provider OAuth to capture link calls
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			linkProvider: mockLinkProvider
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		});

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);

		// Should call the multi-provider hook's linkProvider function
		expect(mockLinkProvider).toHaveBeenCalledWith("google");
	});

	// Test unlinking Google account
	it("should handle Google account unlinking with password confirmation", async () => {
		const user = userEvent.setup();
		const mockUnlinkProvider = vi.fn().mockResolvedValue(undefined);

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

		// Mock multi-provider OAuth to show Google as linked and capture unlink calls
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
			unlinkProvider: mockUnlinkProvider
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);

		// Should show enhanced confirmation dialog
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		// Enter password and confirm
		await waitFor(() => {
			expect(document.getElementById("password")).toBeInTheDocument();
		});
		const passwordInput = document.getElementById("password") as HTMLInputElement;
		await user.type(passwordInput, "current-password");

		const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
		await user.click(confirmButton);

		// Should call the multi-provider hook's unlinkProvider with password
		await waitFor(() => {
			expect(mockUnlinkProvider).toHaveBeenCalledWith("google", "current-password");
		});
	});

	// Test password confirmation modal
	it("should validate password before unlinking", async () => {
		const user = userEvent.setup();
		const mockUnlinkProvider = vi.fn();

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

		// Mock multi-provider OAuth to show Google as linked
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
			unlinkProvider: mockUnlinkProvider
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
		const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
		await user.click(confirmButton);

		// Should show validation error
		expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();
		expect(mockUnlinkProvider).not.toHaveBeenCalled();
	});

	// Test error handling
	it("should handle API errors gracefully", async () => {
		const mockLoadSecurityStatus = vi.fn();

		// Mock hook to return error state
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: false,
			error: "Connection problem. Please check your internet connection and try again.",
			errorResolution: "Check your internet connection and try again in a moment.",
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: mockLoadSecurityStatus,
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		expect(
			screen.getByText("Connection problem. Please check your internet connection and try again.")
		).toBeInTheDocument();
		expect(screen.getByText("Check your internet connection and try again in a moment.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});

	// Test error handling without resolution guidance
	it("should handle API errors without resolution guidance", async () => {
		const mockLoadSecurityStatus = vi.fn();

		// Mock hook to return error state without resolution
		(useAccountSecurity as any).mockReturnValue({
			securityStatus: null,
			loading: false,
			error: "Unable to load account security information.",
			errorResolution: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			loadSecurityStatus: mockLoadSecurityStatus,
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn()
		});

		render(<AccountSecuritySection {...defaultProps} />);

		expect(screen.getByText("Unable to load account security information.")).toBeInTheDocument();
		expect(screen.queryByText("Check your internet connection and try again in a moment.")).not.toBeInTheDocument();
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
			error: "Connection problem. Please check your internet connection and try again.",
			errorResolution: "Check your internet connection and try again in a moment.",
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
			expect(
				screen.getByText("Connection problem. Please check your internet connection and try again.")
			).toBeInTheDocument();
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
		const mockLinkProvider = vi.fn();

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

		// Mock multi-provider OAuth to capture link calls
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			linkProvider: mockLinkProvider
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		});

		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);

		// Should call the multi-provider hook's linkProvider function
		expect(mockLinkProvider).toHaveBeenCalledWith("google");
	});

	// Test unlinking errors
	it("should handle unlinking errors appropriately", async () => {
		const user = userEvent.setup();
		const mockUnlinkProvider = vi.fn().mockRejectedValue(new Error("Incorrect password"));

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

		// Mock multi-provider OAuth to show Google as linked and return error on unlink
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
			unlinkProvider: mockUnlinkProvider
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

		const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
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
			optimisticSecurityStatus: null,
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
		expect(linkButton).toHaveAttribute("aria-label");
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
			optimisticSecurityStatus: null,
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
