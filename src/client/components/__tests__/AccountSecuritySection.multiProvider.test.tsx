import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { AccountSecuritySection } from "../AccountSecuritySection";
import { useMultiProviderOAuth } from "../../hooks/useMultiProviderOAuth";
import { useAccountSecurity } from "../../hooks/useAccountSecurity";
import type { AccountSecurityResponse, OAuthProvider } from "../../types";

// Mock useMultiProviderOAuth hook
vi.mock("../../hooks/useMultiProviderOAuth", () => ({
	useMultiProviderOAuth: vi.fn()
}));

// Mock useAccountSecurity hook (for the existing functionality)
vi.mock("../../hooks/useAccountSecurity", () => ({
	useAccountSecurity: vi.fn()
}));

// Mock ProviderStatusCard component
vi.mock("../ProviderStatusCard", () => ({
	default: ({ provider, isLinked, onLink, onUnlink, linkingLoading, unlinkingLoading }: any) => (
		<div data-testid={`provider-card-${provider.name}`}>
			<span data-testid={`provider-name-${provider.name}`}>{provider.displayName}</span>
			<span data-testid={`provider-status-${provider.name}`}>{isLinked ? "Linked" : "Not linked"}</span>
			<button
				data-testid={`link-button-${provider.name}`}
				onClick={onLink}
				disabled={linkingLoading || unlinkingLoading}
			>
				{linkingLoading ? "Linking..." : `Link ${provider.displayName}`}
			</button>
			<button
				data-testid={`unlink-button-${provider.name}`}
				onClick={onUnlink}
				disabled={linkingLoading || unlinkingLoading}
			>
				{unlinkingLoading ? "Unlinking..." : `Unlink ${provider.displayName}`}
			</button>
		</div>
	)
}));

describe("AccountSecuritySection - Multi-Provider", () => {
	const mockOnSecurityUpdate = vi.fn();
	const mockOnError = vi.fn();

	const mockProviders: OAuthProvider[] = [
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
	];

	const mockSecurityStatus: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: true,
		google_email: "user@gmail.com"
	};

	const defaultProps = {
		onSecurityUpdate: mockOnSecurityUpdate,
		onError: mockOnError
	};

	const defaultMultiProviderOAuth = {
		providers: mockProviders,
		linkProvider: vi.fn(),
		unlinkProvider: vi.fn(),
		getProviderState: vi.fn().mockReturnValue({
			isReady: true,
			isLoading: false,
			error: null
		}),
		isProviderLinked: vi.fn()
	};

	const defaultAccountSecurity = {
		securityStatus: mockSecurityStatus,
		loading: false,
		error: null,
		errorResolution: null,
		linkingLoading: false,
		unlinkingLoading: false,
		googleOAuthReady: true,
		oauthLoading: false,
		optimisticSecurityStatus: null,
		loadSecurityStatus: vi.fn(),
		handleLinkGoogle: vi.fn(),
		handleUnlinkGoogle: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mocks for useAccountSecurity
		(useAccountSecurity as any).mockReturnValue(defaultAccountSecurity);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const clickProviderButton = async (
		user: ReturnType<typeof userEvent.setup>,
		provider: string,
		action: "link" | "unlink"
	) => {
		const button = screen.getByTestId(`${action}-button-${provider}`);
		await user.click(button);
		return button;
	};

	const setupProviderMocks = (
		linkedProviders: string[],
		loadingProviders: string[] = [],
		errorProviders: Record<string, string> = {}
	) => {
		const mockIsProviderLinked = vi.fn().mockImplementation((provider: string) => {
			return linkedProviders.includes(provider);
		});

		const mockGetProviderState = vi.fn().mockImplementation((provider: string) => {
			if (errorProviders[provider]) {
				return { isReady: false, isLoading: false, error: errorProviders[provider] };
			}
			return {
				isReady: true,
				isLoading: loadingProviders.includes(provider),
				error: null
			};
		});

		return { mockIsProviderLinked, mockGetProviderState };
	};

	const enterPasswordInModal = async (user: ReturnType<typeof userEvent.setup>, password: string) => {
		const passwordInput = screen.getByLabelText(/password/i);
		await user.type(passwordInput, password);
	};

	it("should display all available OAuth providers", async () => {
		const { mockIsProviderLinked } = setupProviderMocks(["google"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Should display all three providers
		expect(screen.getByTestId("provider-card-google")).toBeInTheDocument();
		expect(screen.getByTestId("provider-card-microsoft")).toBeInTheDocument();
		expect(screen.getByTestId("provider-card-github")).toBeInTheDocument();

		// Should show correct display names
		expect(screen.getByTestId("provider-name-google")).toHaveTextContent("Google");
		expect(screen.getByTestId("provider-name-microsoft")).toHaveTextContent("Microsoft");
		expect(screen.getByTestId("provider-name-github")).toHaveTextContent("GitHub");
	});

	it("should show correct linking status for each provider", async () => {
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks(["google"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("provider-status-google")).toHaveTextContent("Linked");
			expect(screen.getByTestId("provider-status-microsoft")).toHaveTextContent("Not linked");
			expect(screen.getByTestId("provider-status-github")).toHaveTextContent("Not linked");
		});
	});

	it("should handle provider linking successfully", async () => {
		const user = userEvent.setup();
		const mockLinkProvider = vi.fn();
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks([]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			linkProvider: mockLinkProvider,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("link-button-microsoft")).toBeInTheDocument();
		});

		await clickProviderButton(user, "microsoft", "link");

		expect(mockLinkProvider).toHaveBeenCalledWith("microsoft");
	});

	it("should handle provider unlinking with password confirmation", async () => {
		const user = userEvent.setup();
		const mockUnlinkProvider = vi.fn().mockResolvedValue(undefined);
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks(["google"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			unlinkProvider: mockUnlinkProvider,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("unlink-button-google")).toBeInTheDocument();
		});

		await clickProviderButton(user, "google", "unlink");

		// Should show password confirmation modal
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Unlink Google Account" })).toBeInTheDocument();
		});

		// Enter password and confirm
		await enterPasswordInModal(user, "user-password");

		const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
		await user.click(confirmButton);

		// Should call unlinkProvider with password
		await waitFor(() => {
			expect(mockUnlinkProvider).toHaveBeenCalledWith("google", "user-password");
		});
	});

	it("should show loading states for individual providers", async () => {
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks([], ["microsoft"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("link-button-microsoft")).toHaveTextContent("Linking...");
			expect(screen.getByTestId("link-button-google")).toHaveTextContent("Link Google");
			expect(screen.getByTestId("link-button-github")).toHaveTextContent("Link GitHub");
		});

		// Loading provider should have disabled buttons
		expect(screen.getByTestId("link-button-microsoft")).toBeDisabled();
		expect(screen.getByTestId("unlink-button-microsoft")).toBeDisabled();
	});

	it("should handle errors for individual providers", async () => {
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks([], [], {
			github: "GitHub OAuth not configured"
		});

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByTestId("provider-card-github")).toBeInTheDocument();
		});

		// Error should be handled gracefully - provider should still be displayed
		// but functionality may be limited
		expect(screen.getByTestId("provider-name-github")).toHaveTextContent("GitHub");
	});

	it("should handle mixed provider states correctly", async () => {
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks(["google", "github"], ["microsoft"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			// Google is linked
			expect(screen.getByTestId("provider-status-google")).toHaveTextContent("Linked");

			// Microsoft is loading
			expect(screen.getByTestId("link-button-microsoft")).toHaveTextContent("Linking...");

			// GitHub is linked
			expect(screen.getByTestId("provider-status-github")).toHaveTextContent("Linked");
		});
	});

	it("should handle OAuth success callbacks correctly", async () => {
		const mockOnSuccess = vi.fn();
		const mockOnError = vi.fn();
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks([]);

		(useMultiProviderOAuth as any).mockImplementation(() => ({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState,
			// Store callbacks for testing
			onSuccess: mockOnSuccess,
			onError: mockOnError
		}));

		render(<AccountSecuritySection {...defaultProps} />);

		// Verify hook was called with correct callbacks
		expect(useMultiProviderOAuth).toHaveBeenCalledWith({
			onSuccess: expect.any(Function),
			onError: expect.any(Function)
		});
	});

	it("should maintain accessibility for multi-provider UI", async () => {
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks([]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Check that all provider cards are accessible
		expect(screen.getByTestId("provider-card-google")).toBeInTheDocument();
		expect(screen.getByTestId("provider-card-microsoft")).toBeInTheDocument();
		expect(screen.getByTestId("provider-card-github")).toBeInTheDocument();

		// Check that buttons are accessible
		expect(screen.getByTestId("link-button-google")).toBeInTheDocument();
		expect(screen.getByTestId("link-button-microsoft")).toBeInTheDocument();
		expect(screen.getByTestId("link-button-github")).toBeInTheDocument();
	});

	it("should handle empty providers list gracefully", async () => {
		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			providers: [] // Empty providers list
		});

		render(<AccountSecuritySection {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText("Account Security")).toBeInTheDocument();
		});

		// Should not crash and should show the main container
		expect(screen.getByTestId("account-security-container")).toBeInTheDocument();
	});

	it("should preserve existing password confirmation flow", async () => {
		const user = userEvent.setup();
		const mockUnlinkProvider = vi.fn().mockRejectedValue(new Error("Incorrect password"));
		const { mockIsProviderLinked, mockGetProviderState } = setupProviderMocks(["google"]);

		(useMultiProviderOAuth as any).mockReturnValue({
			...defaultMultiProviderOAuth,
			unlinkProvider: mockUnlinkProvider,
			isProviderLinked: mockIsProviderLinked,
			getProviderState: mockGetProviderState
		});

		render(<AccountSecuritySection {...defaultProps} />);

		// Click unlink button
		await clickProviderButton(user, "google", "unlink");

		// Should show password confirmation modal
		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		// Try with wrong password
		await enterPasswordInModal(user, "wrong-password");

		const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
		await user.click(confirmButton);

		// Should show error in modal
		await waitFor(() => {
			expect(screen.getByText("Incorrect password")).toBeInTheDocument();
		});
	});
});
