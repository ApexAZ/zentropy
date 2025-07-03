import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import LoginModal from "../LoginModal";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LoginModal", () => {
	const mockAuth = {
		isAuthenticated: false,
		user: null,
		token: null,
		login: vi.fn(),
		logout: vi.fn()
	};

	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		onSuccess: vi.fn(),
		auth: mockAuth
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAuth.login.mockClear();
		mockAuth.logout.mockClear();
		// Mock successful API responses by default
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				access_token: "mock-token",
				token_type: "bearer",
				user: {
					email: "user@example.com",
					first_name: "John",
					last_name: "Doe",
					organization: "Test Corp"
				}
			})
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Modal Rendering", () => {
		it("should render modal when isOpen is true", () => {
			render(<LoginModal {...defaultProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Welcome Back")).toBeInTheDocument();
			expect(screen.getByText("Sign in to your Zentropy account")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			render(<LoginModal {...defaultProps} isOpen={false} />);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should render modal with dimmed backdrop", () => {
			render(
				<div>
					<div data-testid="page-content">Page Content Behind Modal</div>
					<LoginModal {...defaultProps} />
				</div>
			);

			// Modal should be present
			const modal = screen.getByRole("dialog");
			expect(modal).toBeInTheDocument();

			// Page content should still be visible behind modal
			expect(screen.getByTestId("page-content")).toBeInTheDocument();

			// Backdrop should be dimmed
			const backdrop = screen.getByTestId("modal-backdrop");
			expect(backdrop).toHaveClass("bg-black/50");
		});
	});

	describe("Login Form", () => {
		it("should display all required form fields", () => {
			render(<LoginModal {...defaultProps} />);

			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
			expect(screen.getByRole("checkbox", { name: /remember me/i })).toBeInTheDocument();
		});

		it("should use reusable form validation for required fields", () => {
			render(<LoginModal {...defaultProps} />);

			// Required fields should have red borders when empty
			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByPlaceholderText(/enter your password/i);

			expect(emailInput).toHaveClass("border-red-300");
			expect(passwordInput).toHaveClass("border-red-300");

			// Required field labels should have red asterisks
			const asterisks = screen.getAllByText("*");
			expect(asterisks.length).toBe(2); // email and password
			expect(asterisks[0]).toHaveClass("text-red-500");
		});

		it("should remove red styling when fields are populated", async () => {
			const user = userEvent.setup();
			render(<LoginModal {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email address/i);
			const passwordInput = screen.getByPlaceholderText(/enter your password/i);

			// Initially should have red borders
			expect(emailInput).toHaveClass("border-red-300");
			expect(passwordInput).toHaveClass("border-red-300");

			// Type in the fields
			await user.type(emailInput, "user@example.com");
			await user.type(passwordInput, "password123");

			// Should remove red borders
			expect(emailInput).not.toHaveClass("border-red-300");
			expect(passwordInput).not.toHaveClass("border-red-300");
			expect(emailInput).toHaveClass("border-layout-background");
			expect(passwordInput).toHaveClass("border-layout-background");
		});

		it("should show password visibility toggle with eye icons", () => {
			render(<LoginModal {...defaultProps} />);

			const toggleButton = screen.getByLabelText(/toggle password visibility/i);
			expect(toggleButton).toBeInTheDocument();

			// Should have SVG icon
			const icon = toggleButton.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});
	});

	describe("Modal Controls", () => {
		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<LoginModal {...defaultProps} onClose={onClose} />);

			const closeButton = screen.getByRole("button", { name: /close/i });
			await user.click(closeButton);

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should call onClose when backdrop is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<LoginModal {...defaultProps} onClose={onClose} />);

			const backdrop = screen.getByTestId("modal-backdrop");
			await user.click(backdrop);

			expect(onClose).toHaveBeenCalled();
		});

		it("should call onClose when Escape key is pressed", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<LoginModal {...defaultProps} onClose={onClose} />);

			await user.keyboard("{Escape}");

			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("Form Validation", () => {
		it("should validate required fields on submit", async () => {
			const user = userEvent.setup();

			render(<LoginModal {...defaultProps} />);

			// Try to submit empty form
			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
			expect(screen.getByText(/password is required/i)).toBeInTheDocument();
		});

		it("should validate email format", async () => {
			const user = userEvent.setup();

			render(<LoginModal {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, "invalid-email");

			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
		});
	});

	describe("Login Functionality", () => {
		it("should submit login form with valid credentials", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			render(<LoginModal {...defaultProps} onSuccess={onSuccess} />);

			// Fill in valid form
			await user.type(screen.getByLabelText(/email address/i), "user@example.com");
			await user.type(screen.getByPlaceholderText(/enter your password/i), "password123");

			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith("/api/auth/login-json", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: "user@example.com",
						password: "password123",
						remember_me: false
					})
				});
			});

			expect(onSuccess).toHaveBeenCalledTimes(1);

			// Verify auth.login was called with correct user data
			expect(mockAuth.login).toHaveBeenCalledWith("mock-token", {
				email: "user@example.com",
				name: "John Doe" // First Last name from backend
			});
		});

		it("should include remember me option in login request", async () => {
			const user = userEvent.setup();

			render(<LoginModal {...defaultProps} />);

			// Fill form and check remember me
			await user.type(screen.getByLabelText(/email address/i), "user@example.com");
			await user.type(screen.getByPlaceholderText(/enter your password/i), "password123");
			await user.click(screen.getByRole("checkbox", { name: /remember me/i }));

			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith("/api/auth/login-json", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: "user@example.com",
						password: "password123",
						remember_me: true
					})
				});
			});
		});

		it("should show loading state during login", async () => {
			const user = userEvent.setup();

			// Mock delayed response
			mockFetch.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({
										access_token: "mock-token",
										token_type: "bearer"
									})
								}),
							100
						)
					)
			);

			render(<LoginModal {...defaultProps} />);

			// Fill form and submit
			await user.type(screen.getByLabelText(/email address/i), "user@example.com");
			await user.type(screen.getByPlaceholderText(/enter your password/i), "password123");

			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			expect(screen.getByText(/signing in/i)).toBeInTheDocument();
		});

		it("should handle login errors", async () => {
			const user = userEvent.setup();

			// Mock failed login
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ detail: "Incorrect email or password" })
			});

			render(<LoginModal {...defaultProps} />);

			// Fill form and submit
			await user.type(screen.getByLabelText(/email address/i), "user@example.com");
			await user.type(screen.getByPlaceholderText(/enter your password/i), "wrongpassword");

			const submitButton = screen.getByRole("button", { name: /sign in/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
			});
		});
	});

	describe("Google OAuth Integration", () => {
		it("should display Google OAuth button", () => {
			render(<LoginModal {...defaultProps} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toBeInTheDocument();
		});

		it("should show Google icon in OAuth button", () => {
			render(<LoginModal {...defaultProps} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			const googleIcon = googleButton.querySelector("svg");
			expect(googleIcon).toBeInTheDocument();
		});

		it("should have proper styling for Google OAuth button", () => {
			render(<LoginModal {...defaultProps} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toHaveClass("border-layout-background", "bg-content-background");
		});

		it("should trigger Google OAuth flow when clicked", async () => {
			const user = userEvent.setup();
			// Mock Google OAuth API
			const mockGoogleAuth = vi.fn();
			global.google = {
				accounts: {
					id: {
						initialize: vi.fn(),
						prompt: mockGoogleAuth
					}
				}
			};

			render(<LoginModal {...defaultProps} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			// Should initiate Google OAuth flow
			expect(mockGoogleAuth).toHaveBeenCalled();
		});

		it("should show divider between regular login and Google OAuth", () => {
			render(<LoginModal {...defaultProps} />);

			expect(screen.getByText("or continue with email")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<LoginModal {...defaultProps} />);

			const modal = screen.getByRole("dialog");
			expect(modal).toHaveAttribute("aria-labelledby");
			expect(modal).toHaveAttribute("aria-modal", "true");
		});

		it("should trap focus within modal", () => {
			render(<LoginModal {...defaultProps} />);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Close button should be focused initially
			expect(closeButton).toHaveFocus();
		});
	});
});
