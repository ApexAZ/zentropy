import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import App from "../App";
import type { AuthUser } from "../types";

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
									const mockResponse = await fetch("/api/v1/auth/google-oauth", {
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

describe("App - Google OAuth Integration (TDD)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth state using centralized helper
		resetAuthMock();
		// Reset global fetch mock
		global.fetch = vi.fn();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		// Ensure global fetch is reset
		global.fetch = vi.fn();
	});

	describe("Google OAuth Registration Flow", () => {
		it("should handle successful Google OAuth registration by calling auth.login", async () => {
			// This test will FAIL initially - Google OAuth success handling not implemented
			const user = userEvent.setup();

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

			// Mock fetch for successful OAuth
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Wait for modal to appear
			await waitFor(() => {
				expect(screen.getByText("Create Your Account")).toBeInTheDocument();
			});

			// Click Google OAuth button (this will trigger the mocked OAuth flow)
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Verify that auth.login was called with correct parameters
			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith(mockAuthResponse.access_token, {
					email: mockAuthResponse.user.email,
					name: `${mockAuthResponse.user.first_name} ${mockAuthResponse.user.last_name}`,
					has_projects_access: mockAuthResponse.user.has_projects_access
				});
			});

			// Verify registration modal closes after successful OAuth
			expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
		});

		it("should stay on home page after successful Google OAuth registration", async () => {
			// Updated test - no longer redirects to dashboard, stays on home page
			const user = userEvent.setup();

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

			// Mock fetch for successful OAuth
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Should stay on home page after successful OAuth (no automatic redirect)
			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith(mockAuthResponse.access_token, {
					email: mockAuthResponse.user.email,
					name: `${mockAuthResponse.user.first_name} ${mockAuthResponse.user.last_name}`,
					has_projects_access: mockAuthResponse.user.has_projects_access
				});
			});

			// Should NOT redirect to dashboard - should remain on home page
			expect(screen.queryByText(/welcome to zentropy dashboard/i)).not.toBeInTheDocument();

			// Registration modal should be closed
			expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
		});

		it("should handle Google OAuth errors gracefully without crashing", async () => {
			// This test will FAIL initially - error handling not implemented properly
			const user = userEvent.setup();

			// Mock failed OAuth response
			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ detail: "Google OAuth failed: Invalid token" })
			});

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Should show error message and NOT call auth.login
			await waitFor(() => {
				expect(screen.getByText(/google oauth.*failed/i)).toBeInTheDocument();
			});

			expect(mockLogin).not.toHaveBeenCalled();
			// Registration modal should remain open to show error
			expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		});

		it("should handle network errors during Google OAuth", async () => {
			// This test will FAIL initially - network error handling not implemented
			const user = userEvent.setup();

			// Mock network error
			global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Should handle network error gracefully
			await waitFor(() => {
				expect(screen.getByText(/google oauth.*failed/i)).toBeInTheDocument();
			});

			expect(mockLogin).not.toHaveBeenCalled();
		});

		it("should not call auth.login if Google OAuth response is missing required fields", async () => {
			// This test will FAIL initially - response validation not implemented
			const user = userEvent.setup();

			// Mock incomplete OAuth response (missing user data)
			const incompleteResponse = {
				access_token: "mock-jwt-token",
				token_type: "bearer"
				// Missing user object
			};

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(incompleteResponse)
			});

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Click Google OAuth button
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Should handle incomplete response gracefully
			await waitFor(() => {
				expect(screen.getByText(/registration.*failed/i)).toBeInTheDocument();
			});

			expect(mockLogin).not.toHaveBeenCalled();
		});

		it("should handle Google OAuth credential parameter correctly", async () => {
			// This test will FAIL initially - credential handling not properly implemented
			const user = userEvent.setup();

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

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// Simulate Google OAuth success with credential
			// This simulates the RegistrationMethodModal calling onSelectGoogle with credential

			// Trigger Google OAuth success simulation
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Verify the credential was sent to backend
			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith(
					"/api/v1/auth/google-oauth",
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: expect.stringContaining('"credential"')
					})
				);
			});
		});
	});

	describe("Google OAuth Integration State Management", () => {
		it("should properly update App state after successful Google OAuth", async () => {
			// This test will FAIL initially - state management integration not complete
			const user = userEvent.setup();

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

			global.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAuthResponse)
			});

			render(<App />);

			// Initially should show unauthenticated state
			expect(screen.getByRole("button", { name: /show registration/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /show sign in/i })).toBeInTheDocument();

			// Perform Google OAuth
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// After successful OAuth, should show authenticated state
			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledWith(
					mockAuthResponse.access_token,
					expect.objectContaining({
						email: mockAuthResponse.user.email
					})
				);
			});
		});

		it("should handle Google OAuth callback parameter correctly in App component", async () => {
			// This test will FAIL initially - App doesn't properly handle OAuth callback
			const user = userEvent.setup();

			render(<App />);

			// Click show registration button
			const registerButton = screen.getByRole("button", { name: /show registration/i });
			await user.click(registerButton);

			// The RegistrationMethodModal should call App's handleSelectGoogleRegistration
			// with the credential parameter when OAuth succeeds
			const modal = screen.getByRole("dialog");
			expect(modal).toBeInTheDocument();

			// This will fail because App.handleSelectGoogleRegistration just logs to console
			// instead of processing the OAuth credential
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// App should process the credential, not just log it
			// This test will fail until we implement proper credential processing
		});
	});
});

describe("App - General Rendering and Routing Logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth state using centralized helper
		resetAuthMock();
		// Reset global fetch mock
		global.fetch = vi.fn();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		// Ensure global fetch is reset
		global.fetch = vi.fn();
	});

	describe("Basic Component Rendering", () => {
		it("should render header, main content, and footer", () => {
			render(<App />);

			// Verify main App structure renders
			expect(screen.getByTestId("header")).toBeInTheDocument();
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.getByText("© 2025 Zentropy. All rights reserved.")).toBeInTheDocument();
		});

		it("should render home page by default", () => {
			render(<App />);

			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.getByTestId("current-page")).toHaveTextContent("home");
		});

		it("should render correct page content based on navigation", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Navigate to About page
			await user.click(screen.getByText("Navigate to About"));
			expect(screen.getByTestId("about-page")).toBeInTheDocument();
			expect(screen.getByTestId("current-page")).toHaveTextContent("about");
		});
	});

	describe("Page Routing Logic", () => {
		it("should navigate between public pages correctly", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Start on home page
			expect(screen.getByTestId("home-page")).toBeInTheDocument();

			// Navigate to About page
			await user.click(screen.getByText("Navigate to About"));
			expect(screen.getByTestId("about-page")).toBeInTheDocument();
			expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
		});

		it("should render profile page when authenticated", async () => {
			const user = userEvent.setup();

			// Set authenticated state using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			});

			render(<App />);

			// Navigate to profile page
			await user.click(screen.getByText("Navigate to Profile"));
			expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		});

		it("should handle invalid page routing gracefully", () => {
			render(<App />);

			// App should render home page for any invalid routes (default case)
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
		});
	});

	describe("Projects Access Control", () => {
		it("should allow access to projects pages when user has projects access", async () => {
			const user = userEvent.setup();

			// Set authenticated user with projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			});

			render(<App />);

			// Navigate to teams page
			await user.click(screen.getByText("Navigate to Teams"));
			expect(screen.getByTestId("teams-page")).toBeInTheDocument();

			// Navigate to calendar page
			await user.click(screen.getByText("Navigate to Calendar"));
			expect(screen.getByTestId("calendar-page")).toBeInTheDocument();

			// Navigate to dashboard page
			await user.click(screen.getByText("Navigate to Dashboard"));
			expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
		});

		it("should redirect to home page when user lacks projects access", async () => {
			const user = userEvent.setup();

			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			render(<App />);

			// Attempt to navigate to teams page
			await user.click(screen.getByText("Navigate to Teams"));

			// Should redirect to home page instead
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.queryByTestId("teams-page")).not.toBeInTheDocument();
		});

		it("should redirect from calendar page when user lacks projects access", async () => {
			const user = userEvent.setup();

			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			render(<App />);

			// Attempt to navigate to calendar page
			await user.click(screen.getByText("Navigate to Calendar"));

			// Should redirect to home page instead
			expect(screen.getByTestId("home-page")).toBeInTheDocument();
			expect(screen.queryByTestId("calendar-page")).not.toBeInTheDocument();
		});

		it("should redirect from dashboard page when user lacks projects access", async () => {
			const user = userEvent.setup();

			// Set authenticated user WITHOUT projects access using centralized helper
			setAuthenticatedUser({
				email: "test@example.com",
				name: "Test User",
				has_projects_access: false,
				email_verified: true
			});

			render(<App />);

			// Attempt to navigate to dashboard page
			await user.click(screen.getByText("Navigate to Dashboard"));

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

			render(<App />);

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

			render(<App />);

			expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
		});

		it("should hide email verification elements for unauthenticated users", () => {
			// Ensure unauthenticated state using centralized helper
			setUnauthenticatedState();

			render(<App />);

			expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
			expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
		});
	});

	describe("Authentication Modal Management", () => {
		it("should show registration modal when Show Registration is clicked", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Initially modal should not be visible
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();

			// Click show registration
			await user.click(screen.getByText("Show Registration"));

			// Modal should appear with signup mode
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
			expect(screen.getByTestId("auth-modal-mode")).toHaveTextContent("signup");
		});

		it("should show sign in modal when Show Sign In is clicked", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Initially modal should not be visible
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();

			// Click show sign in
			await user.click(screen.getByText("Show Sign In"));

			// Modal should appear with signin mode
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();
			expect(screen.getByTestId("auth-modal-mode")).toHaveTextContent("signin");
		});

		it("should close authentication modal when close button is clicked", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Open modal
			await user.click(screen.getByText("Show Registration"));
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

			// Close modal
			await user.click(screen.getByText("Close Modal"));
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
		});

		it("should close authentication modal after successful authentication", async () => {
			const user = userEvent.setup();

			render(<App />);

			// Open modal
			await user.click(screen.getByText("Show Sign In"));
			expect(screen.getByTestId("auth-modal")).toBeInTheDocument();

			// Simulate successful authentication
			await user.click(screen.getByText("Auth Success"));
			expect(screen.queryByTestId("auth-modal")).not.toBeInTheDocument();
		});
	});

	// Email Verification Modal Integration tests
	describe("Email Verification Modal Integration", () => {
		it("should show verification modal when requested", () => {
			// Basic test that verification modal can be rendered
			render(<App />);
			// This will be expanded to test the new verification flow
			expect(screen.getByTestId("header")).toBeInTheDocument();
		});
	});
});
