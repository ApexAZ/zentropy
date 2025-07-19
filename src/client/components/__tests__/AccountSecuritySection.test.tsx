import { screen, waitFor, fireEvent } from "@testing-library/react";
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
		await waitFor(() => {
			expect(document.getElementById("password")).toBeInTheDocument();
		});
		const passwordInput = document.getElementById("password") as HTMLInputElement;
		fireEvent.change(passwordInput, { target: { value: password } });
	};

	// Helper function to trigger Google account linking
	const linkGoogleAccount = async () => {
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Link Google Account" })).toBeInTheDocument();
		});
		const linkButton = screen.getByRole("button", { name: "Link Google Account" });
		await user.click(linkButton);
	};

	// Helper function to trigger Google account unlinking
	const unlinkGoogleAccount = async () => {
		const user = userEvent.setup();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Unlink Google Account" })).toBeInTheDocument();
		});
		const unlinkButton = screen.getByRole("button", { name: "Unlink Google Account" });
		await user.click(unlinkButton);
	};

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

			createAccountSecurity(mockSecurity, mockOAuth);

			expect(screen.getByText("Account Security")).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
			expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");
			expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
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
			expect(screen.getByText("linking...")).toBeInTheDocument();
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

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
				expect(screen.getByRole("heading", { name: "Unlink Google Account" })).toBeInTheDocument();
			});

			await fillPasswordConfirmation("current-password");

			const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
			await user.click(confirmButton);

			expect(mockUnlinkProvider).toHaveBeenCalledWith("google", "current-password");
		});

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

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});

			const confirmButton = screen.getByRole("button", { name: "Yes, Unlink Account" });
			await user.click(confirmButton);

			expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();
			expect(mockUnlinkProvider).not.toHaveBeenCalled();
		});

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

			await waitFor(() => {
				expect(screen.getByText("Incorrect password")).toBeInTheDocument();
			});
		});
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

			await waitFor(() => {
				expect(
					screen.getByText("Connection problem. Please check your internet connection and try again.")
				).toBeInTheDocument();
			});

			const retryButton = screen.getByRole("button", { name: "Retry" });
			await user.click(retryButton);

			expect(mockLoadSecurityStatus).toHaveBeenCalled();
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
