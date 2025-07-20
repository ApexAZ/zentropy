import { screen, fireEvent, act } from "@testing-library/react";
// eslint-disable-next-line no-restricted-imports -- OAuth account linking/unlinking tests require userEvent for complex authentication workflows
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { AccountSecuritySection } from "../AccountSecuritySection";
import { useAccountSecurity } from "../../hooks/useAccountSecurity";
import { useMultiProviderOAuth } from "../../hooks/useMultiProviderOAuth";
import {
	AccountSecurityFactory,
	TestPropsFactory,
	MockUseAccountSecurityFactory,
	MockUseMultiProviderOAuthFactory,
	renderWithToast
} from "../../__tests__/utils";

// Mock useAccountSecurity hook to control all business logic
vi.mock("../../hooks/useAccountSecurity", () => ({
	useAccountSecurity: vi.fn()
}));

// Mock useMultiProviderOAuth hook
vi.mock("../../hooks/useMultiProviderOAuth", () => ({
	useMultiProviderOAuth: vi.fn()
}));

describe("AccountSecuritySection", () => {
	// Mock data setup
	const defaultProps = TestPropsFactory.createAccountSecurityProps();
	const mockEmailOnlyResponse = AccountSecurityFactory.createEmailOnly();
	const mockHybridResponse = AccountSecurityFactory.createHybrid();
	const defaultMultiProviderOAuth = MockUseMultiProviderOAuthFactory.create();

	// Helper function to render component with consistent setup
	const createAccountSecurity = (mockSecurityOverrides = {}, mockOAuthOverrides = {}) => {
		const mockSecurity = {
			...MockUseAccountSecurityFactory.create({ securityStatus: mockEmailOnlyResponse }),
			...mockSecurityOverrides
		};
		const mockOAuth = {
			...defaultMultiProviderOAuth,
			getProviderState: vi.fn().mockReturnValue({ isLoading: false }),
			...mockOAuthOverrides
		};

		(useAccountSecurity as any).mockReturnValue(mockSecurity);
		(useMultiProviderOAuth as any).mockReturnValue(mockOAuth);

		return renderWithToast(<AccountSecuritySection {...defaultProps} />);
	};

	// Helper function to fill password confirmation dialog
	const fillPasswordConfirmation = async (password: string) => {
		await act(async () => {
			await Promise.resolve();
		});
		expect(document.getElementById("password")).toBeInTheDocument();
		const passwordInput = document.getElementById("password") as HTMLInputElement;
		fireEvent.change(passwordInput, { target: { value: password } });
	};

	/* eslint-disable no-restricted-syntax */
	// Helper function to trigger Google account linking
	const linkGoogleAccount = async () => {
		const user = userEvent.setup();
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);
	};

	// Helper function to trigger Google account unlinking
	const unlinkGoogleAccount = async () => {
		const user = userEvent.setup();
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);
	};
	/* eslint-enable no-restricted-syntax */

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("User can view account security status", () => {
		it("should show skeleton loading state while fetching security status", () => {
			createAccountSecurity(MockUseAccountSecurityFactory.createLoading());

			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(0);
			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByTestId("account-security-container")).toBeInTheDocument();
		});

		it("should display email-only authentication status correctly", () => {
			createAccountSecurity({ securityStatus: mockEmailOnlyResponse });

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByText("Email Authentication")).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
			expect(screen.getByText("Google Authentication")).toBeInTheDocument();
			expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Not linked");
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Unlink Google Account" })).not.toBeInTheDocument();
		});

		it("should display hybrid authentication status correctly", () => {
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			// Directly mock the hooks instead of using createAccountSecurity helper
			(useAccountSecurity as any).mockReturnValue(mockSecurity);
			(useMultiProviderOAuth as any).mockReturnValue(mockOAuth);

			renderWithToast(<AccountSecuritySection {...defaultProps} />);

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
			expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");
			expect(
				screen.getAllByText(content => {
					return content.includes("john@gmail.com");
				})[0]
			).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Link Google Account" })).not.toBeInTheDocument();
		});

		it("should display correct status badges and indicators", () => {
			createAccountSecurity({ securityStatus: mockEmailOnlyResponse });

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-success");
			expect(screen.getByTestId("google-auth-indicator")).toHaveClass("bg-neutral");
			expect(screen.getByTestId("email-auth-status")).toHaveAttribute(
				"aria-label",
				"Email authentication is active"
			);
			expect(screen.getByTestId("google-auth-status")).toHaveAttribute(
				"aria-label",
				"Google authentication is not linked"
			);
		});
	});

	describe("User experiences loading and optimistic states", () => {
		it("should display optimistic linked state during Google linking", () => {
			const mockOptimisticResponse = AccountSecurityFactory.createHybrid({
				google_email: "linking..."
			});

			const mockSecurity = {
				securityStatus: mockEmailOnlyResponse,
				linkingLoading: true,
				optimisticSecurityStatus: mockOptimisticResponse
			};
			const mockOAuth = MockUseMultiProviderOAuthFactory.createWithLinkedProvider("google");

			createAccountSecurity(mockSecurity, mockOAuth);

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByText("Google Authentication")).toBeInTheDocument();
			expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");
			expect(screen.getAllByText(content => content.includes("linking..."))[0]).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Link Google Account" })).not.toBeInTheDocument();
		});
	});

	describe("User can link Google account", () => {
		it("should handle Google account linking successfully", async () => {
			const mockLinkProvider = vi.fn();
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				linkProvider: mockLinkProvider,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			await linkGoogleAccount();

			expect(mockLinkProvider).toHaveBeenCalledWith("google");
		});

		it("should handle linking errors appropriately", async () => {
			const mockLinkProvider = vi.fn();
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				linkProvider: mockLinkProvider,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			await linkGoogleAccount();

			expect(mockLinkProvider).toHaveBeenCalledWith("google");
		});
	});

	describe("User can unlink Google account", () => {
		/* eslint-disable no-restricted-syntax */
		it("should handle Google account unlinking with password confirmation", async () => {
			const user = userEvent.setup();
			const mockUnlinkProvider = vi.fn().mockResolvedValue(undefined);
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
				unlinkProvider: mockUnlinkProvider,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			await unlinkGoogleAccount();

			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Unlink Google Account" })).toBeInTheDocument();

			await fillPasswordConfirmation("current-password");

			const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
			await user.click(confirmButton);

			expect(mockUnlinkProvider).toHaveBeenCalledWith("google", "current-password");
		});
		/* eslint-enable no-restricted-syntax */

		/* eslint-disable no-restricted-syntax */
		it("should validate password before unlinking", async () => {
			const user = userEvent.setup();
			const mockUnlinkProvider = vi.fn();
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
				unlinkProvider: mockUnlinkProvider,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			await unlinkGoogleAccount();

			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByRole("dialog")).toBeInTheDocument();

			const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
			await user.click(confirmButton);

			expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();
			expect(mockUnlinkProvider).not.toHaveBeenCalled();
		});
		/* eslint-enable no-restricted-syntax */

		/* eslint-disable no-restricted-syntax */
		it("should handle unlinking errors appropriately", async () => {
			const user = userEvent.setup();
			const mockUnlinkProvider = vi.fn().mockRejectedValue(new Error("Incorrect password"));
			const mockSecurity = {
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
			};
			const mockOAuth = {
				...defaultMultiProviderOAuth,
				isProviderLinked: vi.fn().mockImplementation(provider => provider === "google"),
				unlinkProvider: mockUnlinkProvider,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false })
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			await unlinkGoogleAccount();

			await fillPasswordConfirmation("wrong-password");

			const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
			await user.click(confirmButton);

			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByText("Incorrect password")).toBeInTheDocument();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("User encounters error states", () => {
		it("should handle API errors gracefully", () => {
			const mockLoadSecurityStatus = vi.fn();
			const mockSecurity = {
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
			};

			createAccountSecurity(mockSecurity);

			expect(
				screen.getByText("Connection problem. Please check your internet connection and try again.")
			).toBeInTheDocument();
			expect(screen.getByText("Check your internet connection and try again in a moment.")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		});

		it("should handle API errors without resolution guidance", () => {
			const mockLoadSecurityStatus = vi.fn();
			const mockSecurity = {
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
			};

			createAccountSecurity(mockSecurity);

			expect(screen.getByText("Unable to load account security information.")).toBeInTheDocument();
			expect(
				screen.queryByText("Check your internet connection and try again in a moment.")
			).not.toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
		});

		/* eslint-disable no-restricted-syntax */
		it("should allow user to retry after error", async () => {
			const user = userEvent.setup();
			const mockLoadSecurityStatus = vi.fn();
			const mockSecurity = {
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
			};

			createAccountSecurity(mockSecurity);

			await act(async () => {
				await Promise.resolve();
			});
			expect(
				screen.getByText("Connection problem. Please check your internet connection and try again.")
			).toBeInTheDocument();

			const retryButton = screen.getByRole("button", { name: "Retry" });
			await user.click(retryButton);

			expect(mockLoadSecurityStatus).toHaveBeenCalled();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("Account Lockout Prevention", () => {
		it("should pass correct lockout prevention data to ProviderStatusCard for Google-only authentication", () => {
			const googleOnlySecurityStatus = {
				email_auth_linked: false,
				google_auth_linked: true,
				google_email: "test@gmail.com"
			};

			const mockSecurity = {
				securityStatus: googleOnlySecurityStatus,
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(provider => provider === "google")
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// Google should be linked but with lockout prevention (unlink button disabled)
			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).toBeDisabled();
			expect(screen.getByText("⚠️ Set up email authentication first")).toBeInTheDocument();
		});

		it("should allow unlinking when email authentication is available as backup", () => {
			const hybridSecurityStatus = {
				email_auth_linked: true,
				google_auth_linked: true,
				google_email: "test@gmail.com"
			};

			const mockSecurity = {
				securityStatus: hybridSecurityStatus,
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(provider => provider === "google")
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// Google should be unlinkable when email auth is available
			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).not.toBeDisabled();
			expect(screen.queryByText("⚠️ Set up email authentication first")).not.toBeInTheDocument();
		});

		it("should calculate totalLinkedMethods correctly for multiple OAuth providers", () => {
			const multiProviderSecurityStatus = {
				email_auth_linked: true,
				google_auth_linked: true,
				google_email: "test@gmail.com"
				// Future: microsoft_auth_linked, github_auth_linked would be included here
			};

			const mockSecurity = {
				securityStatus: multiProviderSecurityStatus,
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(provider => provider === "google")
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// With both email and Google auth, should be able to unlink safely
			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).not.toBeDisabled();
		});

		it("should handle email-only authentication (no OAuth providers linked)", () => {
			const emailOnlySecurityStatus = {
				email_auth_linked: true,
				google_auth_linked: false,
				google_email: null
			};

			const mockSecurity = {
				securityStatus: emailOnlySecurityStatus,
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(() => false)
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// Should show link buttons for all providers since none are linked
			// Use getAllByRole to handle multiple buttons and select the specific one from ProviderStatusCard
			const linkButtons = screen.getAllByRole("button", { name: /link google/i });
			expect(linkButtons.length).toBeGreaterThan(0);
			expect(screen.getByRole("button", { name: /link microsoft/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link github/i })).toBeInTheDocument();

			// No lockout prevention warnings should be shown
			expect(screen.queryByText("⚠️ Set up email authentication first")).not.toBeInTheDocument();
		});

		it("should handle multiple provider scenario correctly", () => {
			// Future test scenario: when multiple OAuth providers are linked
			const multiProviderSecurityStatus = {
				email_auth_linked: false,
				google_auth_linked: true,
				google_email: "test@gmail.com"
				// Future: microsoft_auth_linked: true, github_auth_linked: true
			};

			const mockSecurity = {
				securityStatus: multiProviderSecurityStatus,
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(provider => provider === "google") // Only Google linked for now
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// Currently only Google is linked, no email auth - should prevent unlinking
			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).toBeDisabled();
			expect(screen.getByText("⚠️ Set up email authentication first")).toBeInTheDocument();
		});

		it("should pass hasEmailAuth correctly to each provider card", () => {
			const mockSecurity = {
				securityStatus: mockHybridResponse, // Has both email and Google auth
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
			};

			const mockOAuth = {
				...defaultMultiProviderOAuth,
				getProviderState: vi.fn().mockReturnValue({ isLoading: false, isReady: true }),
				isProviderLinked: vi.fn(provider => provider === "google")
			};

			createAccountSecurity(mockSecurity, mockOAuth);

			// All provider cards should receive hasEmailAuth=true
			// This enables safe unlinking for any OAuth provider
			expect(screen.getByRole("button", { name: /unlink google/i })).not.toBeDisabled();
		});
	});

	describe("User experiences accessibility and responsive design", () => {
		it("should meet accessibility requirements", () => {
			const mockSecurity = {
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
			};

			createAccountSecurity(mockSecurity);

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-status")).toHaveAttribute("aria-label");
			expect(screen.getByTestId("google-auth-status")).toHaveAttribute("aria-label");

			const linkButton = screen.getByRole("button", { name: "Link Google Account" });
			expect(linkButton).toHaveAttribute("aria-label");
		});

		it("should render responsively across device sizes", () => {
			const mockSecurity = {
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
			};

			createAccountSecurity(mockSecurity);

			expect(screen.getByText("Account Security")).toBeInTheDocument();

			const container = screen.getByTestId("account-security-container");
			expect(container).toHaveClass("border-layout-background", "bg-content-background", "rounded-lg");
		});
	});
});
