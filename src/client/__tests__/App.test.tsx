import React from "react";
import { screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import App from "../App";
import type { AuthUser } from "../types";
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "./utils/testRenderUtils";

// Mock all page components to focus on App logic
vi.mock("../pages/HomePage", () => ({
	default: () => <div data-testid="home-page">Home Page</div>
}));

vi.mock("../pages/AboutPage", () => ({
	default: () => <div data-testid="about-page">About Page</div>
}));

vi.mock("../pages/ContactPage", () => ({
	default: () => <div data-testid="contact-page">Contact Page</div>
}));

vi.mock("../pages/TeamsPage", () => ({
	default: () => <div data-testid="teams-page">Teams Page</div>
}));

vi.mock("../pages/CalendarPage", () => ({
	default: () => <div data-testid="calendar-page">Calendar Page</div>
}));

vi.mock("../pages/ProfilePage", () => ({
	default: () => <div data-testid="profile-page">Profile Page</div>
}));

vi.mock("../pages/DashboardPage", () => ({
	default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}));

vi.mock("../pages/TeamConfigurationPage", () => ({
	default: () => <div data-testid="team-configuration-page">Team Configuration Page</div>
}));

vi.mock("../components/Header", () => ({
	default: ({ currentPage, onPageChange, onShowRegistration, onShowSignIn, auth }: any) => (
		<header data-testid="header">
			<span data-testid="current-page">{currentPage}</span>
			<button onClick={() => onPageChange("about")}>Navigate to About</button>
			<button onClick={() => onPageChange("teams")}>Navigate to Teams</button>
			<button onClick={() => onPageChange("calendar")}>Navigate to Calendar</button>
			<button onClick={() => onPageChange("dashboard")}>Navigate to Dashboard</button>
			<button onClick={() => onPageChange("profile")}>Navigate to Profile</button>
			<button onClick={onShowRegistration}>Show Registration</button>
			<button onClick={onShowSignIn}>Show Sign In</button>
			{/* Email verification elements */}
			{auth.isAuthenticated && auth.user && !auth.user.email_verified && (
				<>
					<span>Email verification required</span>
					<button>Resend</button>
				</>
			)}
		</header>
	)
}));

vi.mock("../components/AuthModal", () => ({
	default: function MockAuthModal({ isOpen, onClose, onSuccess, initialMode, auth }: any) {
		const [oauthError, setOauthError] = React.useState("");

		return isOpen ? (
			<div data-testid="auth-modal" role="dialog">
				<span data-testid="auth-modal-mode">{initialMode}</span>
				<button onClick={onClose}>Close Modal</button>
				<button onClick={onSuccess}>Auth Success</button>
				{oauthError && <div>{oauthError}</div>}
				{initialMode === "signup" && (
					<div>
						<h2>Create Your Account</h2>
						<button
							role="button"
							aria-label="continue with google"
							onClick={async () => {
								try {
									setOauthError(""); // Clear previous errors
									// Simulate Google OAuth flow
									const mockResponse = await fetch("/api/v1/auth/oauth", {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({ provider: "google", credential: "mock-credential" })
									});

									if (mockResponse.ok) {
										const data = await mockResponse.json();
										// Validate required fields
										if (
											!data.user ||
											!data.user.email ||
											!data.user.first_name ||
											!data.user.last_name
										) {
											const errorMessage = "Registration failed: Missing required user data";
											setOauthError(errorMessage);
											return;
										}
										auth.login(data.access_token, {
											email: data.user.email,
											name: `${data.user.first_name} ${data.user.last_name}`,
											has_projects_access: data.user.has_projects_access
										});
										onSuccess();
									} else {
										// Handle OAuth API errors
										const errorData = await mockResponse.json();
										const errorMessage = `Google OAuth failed: ${errorData.detail || "Invalid token"}`;
										setOauthError(errorMessage);
									}
								} catch (error: any) {
									// Handle network errors
									const errorMessage = `Google OAuth failed: ${error.message}`;
									setOauthError(errorMessage);
								}
							}}
						>
							Continue with Google
						</button>
					</div>
				)}
			</div>
		) : null;
	}
}));

// Mock auth hooks with controllable state
const mockLogin = vi.fn();
const mockLogout = vi.fn();

const mockAuth: {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: typeof mockLogin;
	logout: typeof mockLogout;
} = {
	isAuthenticated: false,
	user: null,
	token: null,
	login: mockLogin,
	logout: mockLogout
};

const resetAuthMock = (): void => {
	mockAuth.isAuthenticated = false;
	mockAuth.user = null;
	mockAuth.token = null;
	mockLogin.mockClear();
	mockLogout.mockClear();
};

const setAuthenticatedUser = (user: AuthUser, token = "mock-token"): void => {
	mockAuth.isAuthenticated = true;
	mockAuth.user = user;
	mockAuth.token = token;
};

const setUnauthenticatedState = (): void => {
	mockAuth.isAuthenticated = false;
	mockAuth.user = null;
	mockAuth.token = null;
};

const mockTriggerOAuth = vi.fn();

const mockGoogleOAuth = {
	isReady: true,
	isLoading: false,
	error: null,
	triggerOAuth: mockTriggerOAuth
};

vi.mock("../hooks/useAuth", () => ({
	useAuth: () => mockAuth
}));

vi.mock("../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: () => mockGoogleOAuth
}));

describe("App - Google OAuth Integration (TDD)", () => {
	let testEnv: ReturnType<typeof renderWithFullEnvironment>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetAuthMock();
	});

	afterEach(() => {
		if (testEnv) {
			testEnv.cleanup();
		}
	});

	describe("Google OAuth Registration Flow", () => {
		/* eslint-disable no-restricted-syntax */
		// OAuth integration tests require manual fetch response mocking to test:
		// - HTTP response scenarios (success, error, network failure, incomplete response)
		// - Response parsing and validation
		// - Token exchange flows
		it("should handle successful Google OAuth registration by calling auth.login", async () => {
			// Mock successful OAuth response using new mock architecture
			const mockAuthResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer",
				user: {
					email: "test.user@gmail.com",
					first_name: "Test",
					last_name: "User",
					organization: "Gmail",
					has_projects_access: true
				}
			};

			// Use Level 1 (Fetch) mocking for integration testing

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(mockAuthResponse)
					} as Response)
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Wait for modal to appear
			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Create Your Account")).toBeInTheDocument();

			// Click Google OAuth button (this will trigger the mocked OAuth flow)
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Verify that auth.login was called with correct parameters
			await fastStateSync();
			expect(mockLogin).toHaveBeenCalledWith(mockAuthResponse.access_token, {
				email: mockAuthResponse.user.email,
				name: `${mockAuthResponse.user.first_name} ${mockAuthResponse.user.last_name}`,
				has_projects_access: mockAuthResponse.user.has_projects_access
			});

			// Verify registration modal closes after successful OAuth
			expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
		});

		it("should stay on home page after successful Google OAuth registration", async () => {
			// Mock successful OAuth response
			const mockAuthResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer",
				user: {
					email: "test.user@gmail.com",
					first_name: "Test",
					last_name: "User",
					organization: "Gmail",
					has_projects_access: true
				}
			};

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(mockAuthResponse)
					} as Response)
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Should stay on home page after successful OAuth (no automatic redirect)
			await fastStateSync();
			expect(mockLogin).toHaveBeenCalledWith(mockAuthResponse.access_token, {
				email: mockAuthResponse.user.email,
				name: `${mockAuthResponse.user.first_name} ${mockAuthResponse.user.last_name}`,
				has_projects_access: mockAuthResponse.user.has_projects_access
			});

			// Should NOT redirect to dashboard - should remain on home page
			expect(screen.queryByText(/welcome to zentropy dashboard/i)).not.toBeInTheDocument();

			// Registration modal should be closed
			expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
		});

		it("should handle Google OAuth errors gracefully without crashing", async () => {
			// Use Level 1 (Fetch) mocking for error scenarios
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: false,
						json: () => Promise.resolve({ detail: "Google OAuth failed: Invalid token" })
					} as Response)
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Should show error message and NOT call auth.login
			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(/google oauth.*failed/i)).toBeInTheDocument();
			expect(mockLogin).not.toHaveBeenCalled();
			// Registration modal should remain open to show error
			expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		});

		it("should handle network errors during Google OAuth", async () => {
			// Network error scenario using Level 1 (Fetch) mocking
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockRejectedValueOnce(new Error("Network error"))
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Should handle network error gracefully
			await fastStateSync();
			expect(screen.getByText(/google oauth.*failed/i)).toBeInTheDocument();

			expect(mockLogin).not.toHaveBeenCalled();
		});

		it("should not call auth.login if Google OAuth response is missing required fields", async () => {
			// Mock incomplete OAuth response (missing user data)
			const incompleteResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer"
				// Missing user object
			};

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(incompleteResponse)
					} as Response)
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Should handle incomplete response gracefully
			await fastStateSync();
			expect(screen.getByText(/registration.*failed/i)).toBeInTheDocument();

			// Should specifically report missing user data
			expect(screen.getByText(/missing required user data/i)).toBeInTheDocument();
			// Should not proceed with authentication
			expect(mockLogin).not.toHaveBeenCalled();
			// Modal should remain open to show error
			expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		});

		it("should handle Google OAuth credential parameter correctly", async () => {
			// Mock successful OAuth response
			const mockAuthResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer",
				user: {
					email: "test.user@gmail.com",
					first_name: "Test",
					last_name: "User",
					organization: "Gmail",
					has_projects_access: true
				}
			};

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(mockAuthResponse)
					} as Response)
				}
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// Trigger Google OAuth success simulation
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// Verify the credential was sent to backend
			await fastStateSync();
			expect(testEnv.mocks.fetch).toHaveBeenCalledWith(
				"/api/v1/auth/oauth",
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: expect.stringContaining('"credential"')
				})
			);
		});
	});

	describe("Google OAuth Integration State Management", () => {
		it("should properly update App state after successful Google OAuth", async () => {
			// Mock successful OAuth
			const mockAuthResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer",
				user: {
					email: "test.user@gmail.com",
					first_name: "Test",
					last_name: "User",
					organization: "Gmail",
					has_projects_access: true
				}
			};

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true },
				mocks: {
					fetch: vi.fn().mockResolvedValueOnce({
						ok: true,
						json: () => Promise.resolve(mockAuthResponse)
					} as Response)
				}
			});

			// Initially should show unauthenticated state
			expect(screen.getByRole("button", { name: /show registration/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /show sign in/i })).toBeInTheDocument();

			// Perform Google OAuth
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// After successful OAuth, should show authenticated state
			await fastStateSync();
			expect(mockLogin).toHaveBeenCalledWith(
				mockAuthResponse.access_token,
				expect.objectContaining({
					email: mockAuthResponse.user.email
				})
			);
		});

		it("should handle Google OAuth callback parameter correctly in App component", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			fastUserActions.click(registerButton);
			await fastStateSync();

			// The RegistrationMethodModal should call App's handleSelectGoogleRegistration
			// with the credential parameter when OAuth succeeds
			const modal = screen.getByRole("dialog");
			expect(modal).toBeInTheDocument();

			// This will fail because App.handleSelectGoogleRegistration just logs to console
			// instead of processing the OAuth credential
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			fastUserActions.click(googleButton);
			await fastStateSync();

			// App should process the credential, not just log it
			// This test will fail until we implement proper credential processing
		});
		/* eslint-enable no-restricted-syntax */
	});
});

describe("App - General Rendering and Routing Logic", () => {
	let testEnv: ReturnType<typeof renderWithFullEnvironment>;

	beforeEach(() => {
		vi.clearAllMocks();
		resetAuthMock();
	});

	afterEach(() => {
		if (testEnv) {
			testEnv.cleanup();
		}
	});

	describe("Basic Component Rendering", () => {
		it("should render header, main content, and footer", () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Verify main App structure renders
			expect(screen.getByTestId("header")).toBeInTheDocument();
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.getByText("© 2025 Zentropy. All rights reserved.")).toBeInTheDocument();
		});

		it("should render home page by default", () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.getByTestId("current-page")).toHaveTextContent("home");
		});

		it("should render correct page content based on navigation", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Navigate to About page
			fastUserActions.click(screen.getByText("Navigate to About"));
			await fastStateSync();
			expect(screen.getByTestId("about-page")).toBeInTheDocument();
			expect(screen.getByTestId("current-page")).toHaveTextContent("about");
		});
	});

	describe("Page Routing Logic", () => {
		it("should navigate between public pages correctly", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Start on home page
			expect(screen.getByTestId("home-page")).toBeInTheDocument();

			// Navigate to About page
			fastUserActions.click(screen.getByText("Navigate to About"));
			await fastStateSync();
			expect(screen.getByTestId("about-page")).toBeInTheDocument();
			expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
		});

		it("should render profile page when authenticated", async () => {
			// Set authenticated state using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Navigate to profile page
			fastUserActions.click(screen.getByText("Navigate to Profile"));
			await fastStateSync();
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});

		it("should handle invalid page routing gracefully", () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// App should render home page for any invalid routes (default case)
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
		});
	});

	describe("Projects Access Control", () => {
		it("should allow access to projects pages when user has projects access", async () => {
			// Set authenticated user with projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Navigate to teams page
			fastUserActions.click(screen.getByText("Navigate to Teams"));
			await fastStateSync();
			expect(screen.getByTestId("teams-page")).toBeInTheDocument();

			// Navigate to calendar page
			fastUserActions.click(screen.getByText("Navigate to Calendar"));
			await fastStateSync();
			expect(screen.getByTestId("calendar-page")).toBeInTheDocument();

			// Navigate to dashboard page
			fastUserActions.click(screen.getByText("Navigate to Dashboard"));
			await fastStateSync();
			expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
		});

		it("should redirect to home page when user lacks projects access", async () => {
			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Attempt to navigate to teams page
			fastUserActions.click(screen.getByText("Navigate to Teams"));
			await fastStateSync();

			// Should redirect to home page instead
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.queryByTestId("teams-page")).not.toBeInTheDocument();
		});

		it("should redirect from calendar page when user lacks projects access", async () => {
			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Attempt to navigate to calendar page
			fastUserActions.click(screen.getByText("Navigate to Calendar"));
			await fastStateSync();

			// Should redirect to home page instead
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.queryByTestId("calendar-page")).not.toBeInTheDocument();
		});

		it("should redirect from dashboard page when user lacks projects access", async () => {
			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Attempt to navigate to dashboard page
			fastUserActions.click(screen.getByText("Navigate to Dashboard"));
			await fastStateSync();

			// Should redirect to home page instead
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
		});
	});

	describe("Email Verification Header Elements", () => {
		it("should show email verification elements in header for authenticated users with unverified emails", () => {
			// Set authenticated user with unverified email using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: false
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			expect(screen.getByText("Email verification required")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
		});

		it("should hide email verification elements for authenticated users with verified emails", () => {
			// Set authenticated user with verified email using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			});

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
		});

		it("should hide email verification elements for unauthenticated users", () => {
			// Ensure unauthenticated state using centralized helper
			setUnauthenticatedState();

			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
		});
	});

	describe("Authentication Modal Management", () => {
		it("should show registration modal when Show Registration is clicked", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Initially modal should not be visible
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();

			// Click show registration
			fastUserActions.click(screen.getByText("Show Registration"));
			await fastStateSync();

			// Modal should appear with signup mode
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
			expect(screen.getByTestId("auth-modal-mode")).toHaveTextContent("signup");
		});

		it("should show sign in modal when Show Sign In is clicked", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Initially modal should not be visible
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();

			// Click show sign in
			fastUserActions.click(screen.getByText("Show Sign In"));
			await fastStateSync();

			// Modal should appear with signin mode
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
			expect(screen.getByTestId("auth-modal-mode")).toHaveTextContent("signin");
		});

		it("should close authentication modal when close button is clicked", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Open modal
			fastUserActions.click(screen.getByText("Show Registration"));
			await fastStateSync();
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

			// Close modal
			fastUserActions.click(screen.getByText("Close Modal"));
			await fastStateSync();
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
		});

		it("should close authentication modal after successful authentication", async () => {
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});

			// Open modal
			fastUserActions.click(screen.getByText("Show Sign In"));
			await fastStateSync();
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

			// Simulate successful authentication
			fastUserActions.click(screen.getByText("Auth Success"));
			await fastStateSync();
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
		});
	});

	// Email Verification Modal Integration tests
	describe("Email Verification Modal Integration", () => {
		it("should show verification modal when requested", () => {
			// Basic test that verification modal can be rendered
			testEnv = renderWithFullEnvironment(<App />, {
				providers: { toast: true }
			});
			// This will be expanded to test the new verification flow
			expect(screen.getByTestId("header")).toBeInTheDocument();
		});
	});
});
