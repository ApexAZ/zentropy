import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RegistrationModal from "../RegistrationModal";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RegistrationModal", () => {
	const defaultProps = {
		isOpen: true,
		onClose: vi.fn(),
		onSuccess: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock successful API responses by default
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ message: "Registration successful" })
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Modal Rendering", () => {
		it("should render modal when isOpen is true", () => {
			render(<RegistrationModal {...defaultProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Create Your Account")).toBeInTheDocument();
		});

		it("should not render modal when isOpen is false", () => {
			render(<RegistrationModal {...defaultProps} isOpen={false} />);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should render modal with dimmed backdrop to emphasize form while keeping page content visible", () => {
			render(
				<div>
					<div data-testid="page-content">Page Content Behind Modal</div>
					<RegistrationModal {...defaultProps} />
				</div>
			);

			// Modal should be present with semantic styling
			const modal = screen.getByRole("dialog");
			expect(modal).toBeInTheDocument();
			expect(modal).toHaveClass("bg-content-background");
			expect(modal).toHaveClass("pointer-events-auto");

			// Page content should still be visible behind modal (DOM presence)
			expect(screen.getByTestId("page-content")).toBeInTheDocument();
			expect(screen.getByText("Page Content Behind Modal")).toBeInTheDocument();

			// Backdrop should be dimmed to emphasize modal form
			const backdrop = screen.getByTestId("modal-backdrop");
			expect(backdrop).toHaveClass("bg-black/50");

			// Pointer events should be configured for click-through behavior
			const modalContainer = backdrop.nextElementSibling;
			expect(modalContainer).toHaveClass("pointer-events-none");
		});
	});

	describe("Registration Form", () => {
		it("should display all required form fields", () => {
			render(<RegistrationModal {...defaultProps} />);

			expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/organization/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
		});

		it("should display terms agreement checkbox", () => {
			render(<RegistrationModal {...defaultProps} />);

			expect(screen.getByRole("checkbox")).toBeInTheDocument();
			expect(screen.getByText("Terms of Service")).toBeInTheDocument();
			expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
		});

		it("should show password requirements", () => {
			render(<RegistrationModal {...defaultProps} />);

			expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
			expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
			expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
			expect(screen.getByText(/one number/i)).toBeInTheDocument();
			expect(screen.getByText(/one symbol/i)).toBeInTheDocument();
		});
	});

	describe("Modal Controls", () => {
		it("should call onClose when close button is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationModal {...defaultProps} onClose={onClose} />);

			const closeButton = screen.getByRole("button", { name: /close/i });
			await user.click(closeButton);

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("should call onClose when backdrop is clicked", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationModal {...defaultProps} onClose={onClose} />);

			const backdrop = screen.getByTestId("modal-backdrop");
			await user.click(backdrop);

			expect(onClose).toHaveBeenCalled();
		});

		it("should call onClose when Escape key is pressed", async () => {
			const user = userEvent.setup();
			const onClose = vi.fn();

			render(<RegistrationModal {...defaultProps} onClose={onClose} />);

			await user.keyboard("{Escape}");

			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("Form Validation", () => {
		it("should validate required fields", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			// Try to submit empty form
			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
			expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
		});

		it("should validate email format", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, "invalid-email");

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
		});

		it("should validate password requirements", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const passwordInput = screen.getByLabelText(/^password$/i);
			await user.type(passwordInput, "weak");

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/password does not meet all requirements/i)).toBeInTheDocument();
		});

		it("should validate password confirmation", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const passwordInput = screen.getByLabelText(/^password$/i);
			const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

			await user.type(passwordInput, "StrongPass123!");
			await user.type(confirmPasswordInput, "DifferentPass123!");

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
		});

		it("should validate terms agreement", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			// Fill in valid form data but don't check terms
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/you must agree to the terms/i)).toBeInTheDocument();
		});
	});

	describe("Password Features", () => {
		it("should toggle password visibility", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const passwordInput = screen.getByLabelText(/^password$/i);
			const toggleButton = screen.getAllByText(/show/i)[0];

			// Initially should be password type
			expect(passwordInput).toHaveAttribute("type", "password");

			// Click toggle
			await user.click(toggleButton);

			// Should now be text type
			expect(passwordInput).toHaveAttribute("type", "text");
			expect(screen.getAllByText(/hide/i)[0]).toBeInTheDocument();
		});

		it("should show password strength indicator", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const passwordInput = screen.getByLabelText(/^password$/i);

			// Type weak password
			await user.type(passwordInput, "weak");
			expect(screen.getByText(/very weak/i)).toBeInTheDocument();

			// Type stronger password
			await user.clear(passwordInput);
			await user.type(passwordInput, "StrongPass123!");
			expect(screen.getByText(/excellent/i)).toBeInTheDocument();
		});

		it("should update password requirement checklist dynamically", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			const passwordInput = screen.getByLabelText(/^password$/i);
			await user.type(passwordInput, "StrongPass123!");

			// All requirements should show checkmarks
			const checkmarks = screen.getAllByText("✓");
			expect(checkmarks).toHaveLength(5); // 5 password requirements
		});
	});

	describe("Email Availability", () => {
		it("should check email availability", async () => {
			const user = userEvent.setup();

			// Mock email availability check
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ available: true })
			});

			render(<RegistrationModal {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, "test@example.com");

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith("/api/users/check-email?email=test%40example.com");
			});

			expect(screen.getByText(/email is available/i)).toBeInTheDocument();
		});

		it("should show email unavailable message", async () => {
			const user = userEvent.setup();

			// Mock email unavailable
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ available: false })
			});

			render(<RegistrationModal {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email address/i);
			await user.type(emailInput, "taken@example.com");

			await waitFor(() => {
				expect(screen.getByText(/email is already registered/i)).toBeInTheDocument();
			});
		});
	});

	describe("Form Submission", () => {
		it("should submit valid registration form", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			render(<RegistrationModal {...defaultProps} onSuccess={onSuccess} />);

			// Fill in valid form
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
			await user.click(screen.getByRole("checkbox"));

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						first_name: "John",
						last_name: "Doe",
						email: "john@example.com",
						organization: "Test Org",
						role: "team_member",
						password: "StrongPass123!"
					})
				});
			});

			expect(onSuccess).toHaveBeenCalledTimes(1);
		});

		it("should show loading state during submission", async () => {
			const user = userEvent.setup();

			// Mock delayed response
			mockFetch.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({ message: "Success" })
								}),
							100
						)
					)
			);

			render(<RegistrationModal {...defaultProps} />);

			// Fill form and submit
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
			await user.click(screen.getByRole("checkbox"));

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			expect(screen.getByText(/creating account/i)).toBeInTheDocument();
		});

		it("should handle registration errors", async () => {
			const user = userEvent.setup();

			// Mock failed registration
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ message: "Email already exists" })
			});

			render(<RegistrationModal {...defaultProps} />);

			// Fill form and submit
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
			await user.click(screen.getByRole("checkbox"));

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
			});
		});
	});

	describe("Success Modal", () => {
		it("should show success modal after registration", async () => {
			const user = userEvent.setup();

			render(<RegistrationModal {...defaultProps} />);

			// Fill form and submit
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
			await user.click(screen.getByRole("checkbox"));

			const submitButton = screen.getByRole("button", { name: /create account/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
			});
		});

		it("should redirect to dashboard from success modal", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			render(<RegistrationModal {...defaultProps} onSuccess={onSuccess} />);

			// Complete registration flow
			await user.type(screen.getByLabelText(/first name/i), "John");
			await user.type(screen.getByLabelText(/last name/i), "Doe");
			await user.type(screen.getByLabelText(/email address/i), "john@example.com");
			await user.type(screen.getByLabelText(/organization/i), "Test Org");
			await user.selectOptions(screen.getByLabelText(/role/i), "team_member");
			await user.type(screen.getByLabelText(/^password$/i), "StrongPass123!");
			await user.type(screen.getByLabelText(/confirm password/i), "StrongPass123!");
			await user.click(screen.getByRole("checkbox"));
			await user.click(screen.getByRole("button", { name: /create account/i }));

			// Wait for success modal and click dashboard button
			await waitFor(() => {
				expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
			});

			const dashboardButton = screen.getByRole("button", { name: /go to dashboard/i });
			await user.click(dashboardButton);

			expect(onSuccess).toHaveBeenCalledWith("dashboard");
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<RegistrationModal {...defaultProps} />);

			const modal = screen.getByRole("dialog");
			expect(modal).toHaveAttribute("aria-labelledby");
			expect(modal).toHaveAttribute("aria-modal", "true");
		});

		it("should trap focus within modal", () => {
			render(<RegistrationModal {...defaultProps} />);

			const closeButton = screen.getByRole("button", { name: /close/i });

			// Close button should be focused initially
			expect(closeButton).toHaveFocus();
		});
	});
});
