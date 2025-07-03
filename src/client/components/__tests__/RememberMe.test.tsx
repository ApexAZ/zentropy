/**
 * Remember Me Frontend Tests
 *
 * Tests for "Remember Me" checkbox functionality that verifies form submission,
 * token storage behavior, and persistent session handling.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginModal from "../LoginModal";

// Mock fetch globally for all tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock auth object for testing
const mockAuth = {
	isAuthenticated: false,
	user: null,
	token: null,
	login: vi.fn(),
	logout: vi.fn().mockResolvedValue(undefined)
};

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, "localStorage", {
	value: mockLocalStorage
});

// Mock sessionStorage
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, "sessionStorage", {
	value: mockSessionStorage
});

describe("Remember Me Frontend Functionality", () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		mockFetch.mockClear();
		mockAuth.login.mockClear();
		mockAuth.logout.mockClear();
		mockLocalStorage.getItem.mockClear();
		mockLocalStorage.setItem.mockClear();
		mockLocalStorage.removeItem.mockClear();
		mockSessionStorage.getItem.mockClear();
		mockSessionStorage.setItem.mockClear();
		mockSessionStorage.removeItem.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("login form includes remember_me checkbox", () => {
		// This should FAIL initially since remember me checkbox needs proper testing
		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });
		expect(rememberMeCheckbox).toBeInTheDocument();
		expect(rememberMeCheckbox).not.toBeChecked();
	});

	test("remember_me checkbox toggles correctly", async () => {
		const user = userEvent.setup();

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });

		// Initially unchecked
		expect(rememberMeCheckbox).not.toBeChecked();

		// Click to check
		await user.click(rememberMeCheckbox);
		expect(rememberMeCheckbox).toBeChecked();

		// Click to uncheck
		await user.click(rememberMeCheckbox);
		expect(rememberMeCheckbox).not.toBeChecked();
	});

	test("login request includes remember_me=true when checkbox is checked", async () => {
		const user = userEvent.setup();

		// Mock successful login response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				access_token: "test-token-extended",
				token_type: "bearer",
				user: {
					email: "test@example.com",
					first_name: "Test",
					last_name: "User",
					organization: "Test Org",
					has_projects_access: true,
					email_verified: true
				}
			})
		});

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Fill in login form
		const emailInput = screen.getByPlaceholderText(/enter your email/i);
		const passwordInput = screen.getByPlaceholderText(/enter your password/i);
		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(rememberMeCheckbox); // Check remember me

		// Submit form
		await user.click(submitButton);

		// Verify API call was made with remember_me=true
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/auth/login-json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: "test@example.com",
					password: "password123",
					remember_me: true
				})
			});
		});
	});

	test("login request includes remember_me=false when checkbox is unchecked", async () => {
		const user = userEvent.setup();

		// Mock successful login response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				access_token: "test-token-normal",
				token_type: "bearer",
				user: {
					email: "test@example.com",
					first_name: "Test",
					last_name: "User",
					organization: "Test Org",
					has_projects_access: true,
					email_verified: true
				}
			})
		});

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Fill in login form without checking remember me
		const emailInput = screen.getByPlaceholderText(/enter your email/i);
		const passwordInput = screen.getByPlaceholderText(/enter your password/i);
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		// Don't check remember me checkbox

		// Submit form
		await user.click(submitButton);

		// Verify API call was made with remember_me=false
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/auth/login-json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: "test@example.com",
					password: "password123",
					remember_me: false
				})
			});
		});
	});

	test("successful login with remember_me=true passes rememberMe flag to auth.login", async () => {
		const user = userEvent.setup();

		// Mock successful login response with extended token
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				access_token: "extended-token-12345",
				token_type: "bearer",
				user: {
					email: "test@example.com",
					first_name: "Test",
					last_name: "User",
					organization: "Test Org",
					has_projects_access: true,
					email_verified: true
				}
			})
		});

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Fill in login form with remember me checked
		const emailInput = screen.getByPlaceholderText(/enter your email/i);
		const passwordInput = screen.getByPlaceholderText(/enter your password/i);
		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		await user.click(rememberMeCheckbox);
		await user.click(submitButton);

		// Wait for login to complete and verify remember_me=true was passed
		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith(
				"extended-token-12345",
				expect.objectContaining({
					email: "test@example.com",
					name: "Test User"
				}),
				true // remember_me should be true
			);
		});
	});

	test("successful login with remember_me=false passes rememberMe flag to auth.login", async () => {
		const user = userEvent.setup();

		// Mock successful login response with normal token
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				access_token: "normal-token-67890",
				token_type: "bearer",
				user: {
					email: "test@example.com",
					first_name: "Test",
					last_name: "User",
					organization: "Test Org",
					has_projects_access: true,
					email_verified: true
				}
			})
		});

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Fill in login form without remember me
		const emailInput = screen.getByPlaceholderText(/enter your email/i);
		const passwordInput = screen.getByPlaceholderText(/enter your password/i);
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "password123");
		// Don't check remember me
		await user.click(submitButton);

		// Wait for login to complete and verify remember_me=false was passed
		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith(
				"normal-token-67890",
				expect.objectContaining({
					email: "test@example.com",
					name: "Test User"
				}),
				false // remember_me should be false
			);
		});
	});

	test("form resets remember_me state when modal closes", () => {
		const { rerender } = render(
			<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />
		);

		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });

		// Check the checkbox
		fireEvent.click(rememberMeCheckbox);
		expect(rememberMeCheckbox).toBeChecked();

		// Close modal (rerender with isOpen=false)
		rerender(<LoginModal isOpen={false} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Reopen modal
		rerender(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		// Remember me should be reset to unchecked
		const newRememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });
		expect(newRememberMeCheckbox).not.toBeChecked();
	});

	test("remember_me state persists during form validation errors", async () => {
		const user = userEvent.setup();

		// Mock failed login response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				detail: "Incorrect email or password"
			})
		});

		render(<LoginModal isOpen={true} onClose={() => {}} onSuccess={() => {}} auth={mockAuth} />);

		const emailInput = screen.getByPlaceholderText(/enter your email/i);
		const passwordInput = screen.getByPlaceholderText(/enter your password/i);
		const rememberMeCheckbox = screen.getByRole("checkbox", { name: /remember me/i });
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		// Fill form and check remember me
		await user.type(emailInput, "test@example.com");
		await user.type(passwordInput, "wrongpassword");
		await user.click(rememberMeCheckbox);

		// Submit form (will fail)
		await user.click(submitButton);

		// Wait for error to appear
		await waitFor(() => {
			expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
		});

		// Remember me checkbox should still be checked after error
		expect(rememberMeCheckbox).toBeChecked();
	});
});
