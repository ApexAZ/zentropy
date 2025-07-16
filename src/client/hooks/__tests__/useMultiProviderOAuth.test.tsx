import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useMultiProviderOAuth } from "../useMultiProviderOAuth";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock logger for cleaner test output
vi.mock("../../utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock OAuthProviderService
vi.mock("../../services/OAuthProviderService", () => ({
	OAuthProviderService: {
		getAvailableProviders: vi.fn(() => [
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
		])
	}
}));

// Mock individual OAuth hooks
const mockGoogleTrigger = vi.fn();
const mockMicrosoftTrigger = vi.fn();
const mockGitHubTrigger = vi.fn();

vi.mock("../useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn(() => ({
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: mockGoogleTrigger,
		clearError: vi.fn()
	}))
}));

vi.mock("../useMicrosoftOAuth", () => ({
	useMicrosoftOAuth: vi.fn(() => ({
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: mockMicrosoftTrigger,
		clearError: vi.fn()
	}))
}));

vi.mock("../useGitHubOAuth", () => ({
	useGitHubOAuth: vi.fn(() => ({
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: mockGitHubTrigger,
		clearError: vi.fn()
	}))
}));

// Mock useAccountSecurity hook
const mockHandleUnlinkGoogle = vi.fn();
vi.mock("../useAccountSecurity", () => ({
	useAccountSecurity: vi.fn(() => ({
		securityStatus: {
			email_auth_linked: true,
			google_auth_linked: true,
			google_email: "test@example.com"
		},
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
		handleUnlinkGoogle: mockHandleUnlinkGoogle
	}))
}));

// Test component that uses the hook
function TestMultiProviderOAuthComponent() {
	const { providers, linkProvider, unlinkProvider, getProviderState, isProviderLinked } = useMultiProviderOAuth({
		onSuccess: (credential: string, provider: string) => {
			// This would normally trigger a toast, but we're testing the UI interaction
			console.log(`Success: ${provider} linked with ${credential}`);
		},
		onError: (error: string) => {
			console.log(`Error: ${error}`);
		}
	});

	return (
		<div>
			<h2>OAuth Providers</h2>
			{providers.map(provider => {
				const state = getProviderState(provider.name);
				const isLinked = isProviderLinked(provider.name);

				return (
					<div key={provider.name} data-testid={`provider-${provider.name}`}>
						<h3>{provider.displayName}</h3>
						<p>Status: {isLinked ? "Linked" : "Not linked"}</p>

						{state.isLoading && <p>Loading...</p>}
						{state.error && <p>Error: {state.error}</p>}

						{!isLinked && state.isReady && (
							<button onClick={() => linkProvider(provider.name)} data-testid={`link-${provider.name}`}>
								Link {provider.displayName}
							</button>
						)}

						{isLinked && (
							<button
								onClick={() => unlinkProvider(provider.name, "testpassword")}
								data-testid={`unlink-${provider.name}`}
							>
								Unlink {provider.displayName}
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Helper function to render with toast context
function renderWithToast(ui: React.ReactElement) {
	return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("useMultiProviderOAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("User Experience: OAuth Provider Selection", () => {
		it("should display all available OAuth providers to user", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see all three providers displayed
			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByText("Microsoft")).toBeInTheDocument();
			expect(screen.getByText("GitHub")).toBeInTheDocument();
		});

		it("should show user which providers are already linked", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see that Google is linked
			const googleSection = screen.getByTestId("provider-google");
			expect(googleSection).toHaveTextContent("Status: Linked");

			// User should see that Microsoft and GitHub are not linked
			const microsoftSection = screen.getByTestId("provider-microsoft");
			expect(microsoftSection).toHaveTextContent("Status: Not linked");

			const githubSection = screen.getByTestId("provider-github");
			expect(githubSection).toHaveTextContent("Status: Not linked");
		});
	});

	describe("User Experience: Linking OAuth Providers", () => {
		it("should allow user to link Google account by clicking button", async () => {
			// Mock Google as unlinked so link button appears
			const mockUseAccountSecurity = vi.fn(() => ({
				securityStatus: {
					email_auth_linked: true,
					google_auth_linked: false,
					google_email: undefined
				},
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
				handleUnlinkGoogle: mockHandleUnlinkGoogle
			}));

			const { useAccountSecurity } = await import("../useAccountSecurity");
			vi.mocked(useAccountSecurity).mockImplementation(mockUseAccountSecurity);

			const user = userEvent.setup();
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User clicks the "Link Google" button
			const linkButton = screen.getByTestId("link-google");
			await user.click(linkButton);

			// User's action should trigger Google OAuth flow
			expect(mockGoogleTrigger).toHaveBeenCalledOnce();
		});

		it("should allow user to link Microsoft account by clicking button", async () => {
			const user = userEvent.setup();
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User clicks the "Link Microsoft" button
			const linkButton = screen.getByTestId("link-microsoft");
			await user.click(linkButton);

			// User's action should trigger Microsoft OAuth flow
			expect(mockMicrosoftTrigger).toHaveBeenCalledOnce();
		});

		it("should allow user to link GitHub account by clicking button", async () => {
			const user = userEvent.setup();
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User clicks the "Link GitHub" button
			const linkButton = screen.getByTestId("link-github");
			await user.click(linkButton);

			// User's action should trigger GitHub OAuth flow
			expect(mockGitHubTrigger).toHaveBeenCalledOnce();
		});
	});

	describe("User Experience: Unlinking OAuth Providers", () => {
		it("should allow user to unlink Google account by clicking button", async () => {
			const user = userEvent.setup();
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User clicks the "Unlink Google" button
			const unlinkButton = screen.getByTestId("unlink-google");
			await user.click(unlinkButton);

			// User's action should trigger Google account unlinking
			expect(mockHandleUnlinkGoogle).toHaveBeenCalledWith("testpassword");
		});

		it("should inform user that Microsoft unlinking is not yet supported", async () => {
			const user = userEvent.setup();
			const mockOnError = vi.fn();

			// Create a test component that properly handles the error
			const TestComponentWithErrorHandling = () => {
				const { providers, unlinkProvider } = useMultiProviderOAuth({
					onSuccess: vi.fn(),
					onError: mockOnError
				});

				// Mock Microsoft as linked for this test
				const getMockLinkedStatus = (provider: string) => provider === "microsoft";

				const handleUnlinkWithErrorHandling = async (provider: string, password: string) => {
					try {
						await unlinkProvider(provider, password);
					} catch (error) {
						// This is what a real UI component would do - handle the error gracefully
						const errorMessage = error instanceof Error ? error.message : "Unknown error";
						mockOnError(errorMessage);
					}
				};

				return (
					<div>
						<h2>OAuth Providers</h2>
						{providers.map(provider => {
							const isLinked = getMockLinkedStatus(provider.name);

							return (
								<div key={provider.name} data-testid={`provider-${provider.name}`}>
									<h3>{provider.displayName}</h3>
									<p>Status: {isLinked ? "Linked" : "Not linked"}</p>

									{isLinked && (
										<button
											onClick={() => handleUnlinkWithErrorHandling(provider.name, "testpassword")}
											data-testid={`unlink-${provider.name}`}
										>
											Unlink {provider.displayName}
										</button>
									)}
								</div>
							);
						})}
					</div>
				);
			};

			renderWithToast(<TestComponentWithErrorHandling />);

			// User should see Microsoft as linked and have an unlink button
			expect(screen.getByTestId("provider-microsoft")).toHaveTextContent("Status: Linked");

			// User clicks the "Unlink Microsoft" button
			const unlinkButton = screen.getByTestId("unlink-microsoft");
			await user.click(unlinkButton);

			// User should receive an error message about Microsoft unlinking not being supported
			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith("Unlinking microsoft is not yet supported");
			});
		});
	});

	describe("User Experience: Provider Status Feedback", () => {
		it("should show user loading state when OAuth provider is loading", async () => {
			// Mock Microsoft provider as loading
			const mockUseMicrosoftOAuth = vi.fn(() => ({
				isReady: false,
				isLoading: true,
				error: null,
				triggerOAuth: mockMicrosoftTrigger,
				clearError: vi.fn()
			}));

			const { useMicrosoftOAuth } = await import("../useMicrosoftOAuth");
			vi.mocked(useMicrosoftOAuth).mockImplementation(mockUseMicrosoftOAuth);

			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see loading state for Microsoft
			const microsoftSection = screen.getByTestId("provider-microsoft");
			expect(microsoftSection).toHaveTextContent("Loading...");
		});

		it("should show user error message when OAuth provider fails", async () => {
			// Mock GitHub provider with error
			const mockUseGitHubOAuth = vi.fn(() => ({
				isReady: false,
				isLoading: false,
				error: "GitHub OAuth service is temporarily unavailable",
				triggerOAuth: mockGitHubTrigger,
				clearError: vi.fn()
			}));

			const { useGitHubOAuth } = await import("../useGitHubOAuth");
			vi.mocked(useGitHubOAuth).mockImplementation(mockUseGitHubOAuth);

			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see error message for GitHub
			const githubSection = screen.getByTestId("provider-github");
			expect(githubSection).toHaveTextContent("Error: GitHub OAuth service is temporarily unavailable");
		});

		it("should show user ready state when OAuth provider is available", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see that unlinked providers have link buttons available
			expect(screen.getByTestId("link-microsoft")).toBeInTheDocument();
			expect(screen.getByTestId("link-github")).toBeInTheDocument();
		});
	});

	describe("User Experience: Provider Button Availability", () => {
		it("should show link buttons for unlinked providers", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see link buttons for unlinked providers
			expect(screen.getByTestId("link-microsoft")).toBeInTheDocument();
			expect(screen.getByTestId("link-github")).toBeInTheDocument();
		});

		it("should show unlink button for linked providers", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should see unlink button for linked Google provider
			expect(screen.getByTestId("unlink-google")).toBeInTheDocument();
		});

		it("should not show link button for already linked providers", async () => {
			renderWithToast(<TestMultiProviderOAuthComponent />);

			// User should not see link button for already linked Google provider
			expect(screen.queryByTestId("link-google")).not.toBeInTheDocument();
		});
	});
});
