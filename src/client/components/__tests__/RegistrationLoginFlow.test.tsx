import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import App from "../../App";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Registration to Login Flow Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear localStorage before each test
		localStorage.clear();

		// Mock successful registration API response
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/auth/register")) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						organization: "Test Corp",
						role: "basic_user",
						id: "test-user-id",
						is_active: true,
						created_at: "2025-07-03T02:00:00Z"
					})
				});
			}

			if (url.includes("/api/auth/login-json")) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						access_token: "mock-jwt-token",
						token_type: "bearer",
						user: {
							email: "integration.test@example.com",
							first_name: "Integration",
							last_name: "Test",
							organization: "Test Corp"
						}
					})
				});
			}

			return Promise.reject(new Error("Unmocked fetch call"));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it("should complete full registration to login flow", async () => {
		const user = userEvent.setup();

		// Render the App component
		render(<App />);

		// Step 1: Open registration modal via navigation panel
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		const registerButton = screen.getByText("Register");
		await user.click(registerButton);

		// Verify registration modal is open
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Create Your Account")).toBeInTheDocument();

		// Step 2: Fill out registration form
		const firstNameInput = screen.getByLabelText(/first name/i);
		const lastNameInput = screen.getByLabelText(/last name/i);
		const emailInput = screen.getByLabelText(/email address/i);
		const organizationInput = screen.getByLabelText(/organization/i);
		const passwordInput = screen.getByPlaceholderText(/create a secure password/i);
		const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);
		const termsCheckbox = screen.getByRole("checkbox");

		// Fill in all required fields
		await user.type(firstNameInput, "Integration");
		await user.type(lastNameInput, "Test");
		await user.type(emailInput, "integration.test@example.com");
		await user.type(organizationInput, "Test Corp");
		await user.type(passwordInput, "SecurePass123!");
		await user.type(confirmPasswordInput, "SecurePass123!");
		await user.click(termsCheckbox);

		// Step 3: Submit registration form
		const submitButton = screen.getByRole("button", { name: /create account/i });
		await user.click(submitButton);

		// Wait for registration to complete and login modal to appear
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/auth/register",
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: expect.stringContaining("integration.test@example.com")
				})
			);
		});

		// Step 4: Verify registration modal closes and login modal opens
		await waitFor(() => {
			expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText("Welcome Back")).toBeInTheDocument();
			expect(screen.getByText("Sign in to your Zentropy account")).toBeInTheDocument();
		});

		// Step 5: Fill out login form
		const loginEmailInput = screen.getByLabelText(/email address/i);
		const loginPasswordInput = screen.getByPlaceholderText(/enter your password/i);

		await user.clear(loginEmailInput);
		await user.type(loginEmailInput, "integration.test@example.com");
		await user.type(loginPasswordInput, "SecurePass123!");

		// Step 6: Submit login form
		const signInButton = screen.getByRole("button", { name: /sign in/i });
		await user.click(signInButton);

		// Wait for login to complete
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/auth/login-json",
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: expect.stringContaining("integration.test@example.com")
				})
			);
		});

		// Step 7: Verify login modal closes and user stays on current page
		await waitFor(() => {
			expect(screen.queryByText("Welcome Back")).not.toBeInTheDocument();
		});

		// Verify we're still on the home page (not redirected)
		await waitFor(() => {
			expect(screen.getByText("Welcome to Zentropy")).toBeInTheDocument();
		});

		// Verify token was stored in localStorage
		expect(localStorage.getItem("access_token")).toBe("mock-jwt-token");
	});

	it("should handle registration errors gracefully", async () => {
		const user = userEvent.setup();

		// Mock registration failure
		mockFetch.mockImplementationOnce(() =>
			Promise.resolve({
				ok: false,
				json: async () => ({ message: "Email already exists" })
			})
		);

		render(<App />);

		// Open registration modal
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		const registerButton = screen.getByText("Register");
		await user.click(registerButton);

		// Fill out form with existing email
		await user.type(screen.getByLabelText(/first name/i), "Test");
		await user.type(screen.getByLabelText(/last name/i), "User");
		await user.type(screen.getByLabelText(/email address/i), "existing@example.com");
		await user.type(screen.getByLabelText(/organization/i), "Test Corp");
		await user.type(screen.getByPlaceholderText(/create a secure password/i), "SecurePass123!");
		await user.type(screen.getByPlaceholderText(/confirm your password/i), "SecurePass123!");
		await user.click(screen.getByRole("checkbox"));

		// Submit form
		const submitButton = screen.getByRole("button", { name: /create account/i });
		await user.click(submitButton);

		// Verify error message appears and registration modal stays open
		await waitFor(() => {
			expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
		});

		// Verify registration modal is still open (login modal should NOT appear)
		expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		expect(screen.queryByText("Welcome Back")).not.toBeInTheDocument();
	});

	it("should handle login errors gracefully after successful registration", async () => {
		const user = userEvent.setup();

		// Mock successful registration but failed login
		mockFetch.mockImplementation((url: string) => {
			if (url.includes("/api/auth/register")) {
				return Promise.resolve({
					ok: true,
					json: async () => ({
						email: "test@example.com",
						first_name: "Test",
						last_name: "User",
						organization: "Test Corp",
						role: "basic_user",
						id: "test-user-id"
					})
				});
			}

			if (url.includes("/api/auth/login-json")) {
				return Promise.resolve({
					ok: false,
					json: async () => ({ detail: "Invalid credentials" })
				});
			}

			return Promise.reject(new Error("Unmocked fetch call"));
		});

		render(<App />);

		// Complete registration process
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		const registerButton = screen.getByText("Register");
		await user.click(registerButton);

		// Quick registration form fill
		await user.type(screen.getByLabelText(/first name/i), "Test");
		await user.type(screen.getByLabelText(/last name/i), "User");
		await user.type(screen.getByLabelText(/email address/i), "test@example.com");
		await user.type(screen.getByLabelText(/organization/i), "Test Corp");
		await user.type(screen.getByPlaceholderText(/create a secure password/i), "SecurePass123!");
		await user.type(screen.getByPlaceholderText(/confirm your password/i), "SecurePass123!");
		await user.click(screen.getByRole("checkbox"));

		const submitButton = screen.getByRole("button", { name: /create account/i });
		await user.click(submitButton);

		// Wait for login modal to appear
		await waitFor(() => {
			expect(screen.getByText("Welcome Back")).toBeInTheDocument();
		});

		// Attempt login with wrong password
		const loginEmailInput = screen.getByLabelText(/email address/i);
		const loginPasswordInput = screen.getByPlaceholderText(/enter your password/i);

		await user.clear(loginEmailInput);
		await user.type(loginEmailInput, "test@example.com");
		await user.type(loginPasswordInput, "WrongPassword123!");

		const signInButton = screen.getByRole("button", { name: /sign in/i });
		await user.click(signInButton);

		// Verify login error appears and login modal stays open
		await waitFor(() => {
			expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
		});

		// Login modal should still be open
		expect(screen.getByText("Welcome Back")).toBeInTheDocument();

		// Should NOT be on dashboard
		expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
	});

	it("should allow user to access login modal directly from navigation panel", async () => {
		const user = userEvent.setup();

		render(<App />);

		// Open navigation panel
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		// Click login directly (not register)
		const loginButton = screen.getByText("Login");
		await user.click(loginButton);

		// Verify login modal opens directly
		expect(screen.getByText("Welcome Back")).toBeInTheDocument();
		expect(screen.getByText("Sign in to your Zentropy account")).toBeInTheDocument();

		// Verify registration modal is NOT open
		expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
	});

	it("should close modals when clicking backdrop", async () => {
		const user = userEvent.setup();

		render(<App />);

		// Open registration modal
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		const registerButton = screen.getByText("Register");
		await user.click(registerButton);

		// Verify modal is open
		expect(screen.getByText("Create Your Account")).toBeInTheDocument();

		// Click backdrop to close
		const backdrop = screen.getByTestId("modal-backdrop");
		await user.click(backdrop);

		// Verify modal closes
		expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
	});

	it("should close modals when pressing Escape key", async () => {
		const user = userEvent.setup();

		render(<App />);

		// Open registration modal
		const profileButton = screen.getByLabelText(/profile menu/i);
		await user.click(profileButton);

		const registerButton = screen.getByText("Register");
		await user.click(registerButton);

		// Verify modal is open
		expect(screen.getByText("Create Your Account")).toBeInTheDocument();

		// Press Escape to close
		await user.keyboard("{Escape}");

		// Verify modal closes
		expect(screen.queryByText("Create Your Account")).not.toBeInTheDocument();
	});
});
