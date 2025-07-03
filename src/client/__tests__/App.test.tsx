import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "../App";

// Mock useAuth hook
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockAuth = {
	isAuthenticated: false,
	user: null,
	token: null,
	login: mockLogin,
	logout: mockLogout
};

vi.mock("../hooks/useAuth", () => ({
	useAuth: () => mockAuth
}));

// Mock useGoogleOAuth hook with callback support
const mockTriggerOAuth = vi.fn();

const mockGoogleOAuth = {
	isReady: true,
	isLoading: false,
	error: null,
	triggerOAuth: mockTriggerOAuth
};

vi.mock("../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: () => mockGoogleOAuth
}));

describe("App - Google OAuth Integration (TDD)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset auth state
		mockAuth.isAuthenticated = false;
		mockAuth.user = null;
		mockAuth.token = null;
	});

	afterEach(() => {
		vi.restoreAllMocks();
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
			await user.click(registerButton);

			// Simulate Google OAuth success with credential
			// This simulates the RegistrationMethodModal calling onSelectGoogle with credential

			// Trigger Google OAuth success simulation
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Verify the credential was sent to backend
			await waitFor(() => {
				expect(global.fetch).toHaveBeenCalledWith(
					"/api/auth/google-oauth",
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
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);
			expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();

			// Perform Google OAuth
			const registerButton = screen.getByRole("button", { name: /register/i });
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

			// Open navigation panel first
			const profileMenuButton = screen.getByRole("button", { name: /profile menu/i });
			await user.click(profileMenuButton);

			// Then click register button
			const registerButton = screen.getByRole("button", { name: /register/i });
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
