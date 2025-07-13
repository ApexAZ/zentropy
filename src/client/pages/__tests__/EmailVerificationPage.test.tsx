/**
 * Tests for EmailVerificationPage component
 *
 * Tests the new code-based email verification system that replaced
 * URL-based verification with secure 6-digit numeric codes.
 */

import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import EmailVerificationPage from "../EmailVerificationPage";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("EmailVerificationPage", () => {
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initial Rendering", () => {
		it("should render the email verification form", () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
			expect(
				screen.getByText("We've sent a 6-digit verification code to your email address.")
			).toBeInTheDocument();
			expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
			expect(screen.getByText("Verification Code")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Verify Email" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /didn't receive.*resend/i })).toBeInTheDocument();
		});

		it("should pre-populate email field when initialEmail is provided", () => {
			const initialEmail = "test@example.com";
			render(<EmailVerificationPage onClose={mockOnClose} initialEmail={initialEmail} />);

			const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
			expect(emailInput.value).toBe(initialEmail);
		});

		it("should render 6 individual code input fields", () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen.getAllByDisplayValue("");
			// Filter to get only the code inputs (exclude email input)
			const numericInputs = codeInputs.filter(input => input.getAttribute("inputMode") === "numeric");
			expect(numericInputs).toHaveLength(6);

			numericInputs.forEach(input => {
				expect(input).toHaveAttribute("maxLength", "1");
				expect(input).toHaveAttribute("type", "text");
				expect(input).toHaveAttribute("inputMode", "numeric");
			});
		});

		it("should focus the first input field on mount", async () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			// Wait for useEffect to run
			await waitFor(() => {
				const numericInputs = screen
					.getAllByDisplayValue("")
					.filter(input => input.getAttribute("inputMode") === "numeric");
				expect(numericInputs[0]).toHaveFocus();
			});
		});
	});

	describe("Code Input Handling", () => {
		it("should only allow numeric input in code fields", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Try typing letters - should be ignored
			await user.type(codeInputs[0], "abc");
			expect(codeInputs[0]).toHaveValue("");

			// Try typing numbers - should work
			await user.type(codeInputs[0], "1");
			expect(codeInputs[0]).toHaveValue("1");
		});

		it("should auto-advance to next field when typing digits", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Type in first field
			await user.type(codeInputs[0], "1");
			expect(codeInputs[0]).toHaveValue("1");
			expect(codeInputs[1]).toHaveFocus();

			// Type in second field
			await user.type(codeInputs[1], "2");
			expect(codeInputs[1]).toHaveValue("2");
			expect(codeInputs[2]).toHaveFocus();
		});

		it("should handle backspace navigation", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Fill first two fields
			await user.type(codeInputs[0], "1");
			await user.type(codeInputs[1], "2");

			// Clear second field and press backspace - should move to first field
			await user.clear(codeInputs[1]);
			await user.keyboard("{Backspace}");
			expect(codeInputs[0]).toHaveFocus();
		});

		it("should handle paste functionality", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Paste a 6-digit code
			await user.click(codeInputs[0]);
			await user.paste("123456");

			// All fields should be filled
			expect(codeInputs[0]).toHaveValue("1");
			expect(codeInputs[1]).toHaveValue("2");
			expect(codeInputs[2]).toHaveValue("3");
			expect(codeInputs[3]).toHaveValue("4");
			expect(codeInputs[4]).toHaveValue("5");
			expect(codeInputs[5]).toHaveValue("6");
		});

		it("should handle paste with non-numeric characters", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Paste code with non-numeric characters
			await user.click(codeInputs[0]);
			await user.paste("1a2b3c");

			// Only numeric characters should be used
			expect(codeInputs[0]).toHaveValue("1");
			expect(codeInputs[1]).toHaveValue("2");
			expect(codeInputs[2]).toHaveValue("3");
			expect(codeInputs[3]).toHaveValue("");
			expect(codeInputs[4]).toHaveValue("");
			expect(codeInputs[5]).toHaveValue("");
		});

		it("should limit paste to 6 digits", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Paste longer code
			await user.click(codeInputs[0]);
			await user.paste("1234567890");

			// Only first 6 digits should be used
			expect(codeInputs[0]).toHaveValue("1");
			expect(codeInputs[1]).toHaveValue("2");
			expect(codeInputs[2]).toHaveValue("3");
			expect(codeInputs[3]).toHaveValue("4");
			expect(codeInputs[4]).toHaveValue("5");
			expect(codeInputs[5]).toHaveValue("6");
		});
	});

	describe("Form Validation", () => {
		it("should disable verify button when code is incomplete", () => {
			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			const verifyButton = screen.getByRole("button", { name: "Verify Email" });
			expect(verifyButton).toBeDisabled();
		});

		it("should enable verify button when code is complete", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Fill all code fields
			for (let i = 0; i < 6; i++) {
				await user.type(codeInputs[i], (i + 1).toString());
			}

			const verifyButton = screen.getByRole("button", { name: "Verify Email" });
			expect(verifyButton).toBeEnabled();
		}, 5000);

		it("should show error when email is missing", async () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Fill code inputs one by one to trigger the component's state management
			codeInputs.forEach((input, index) => {
				fireEvent.focus(input);
				fireEvent.change(input, { target: { value: (index + 1).toString() } });
			});

			// Wait for state updates
			await waitFor(() => {
				expect(codeInputs[0]).toHaveValue("1");
				expect(codeInputs[5]).toHaveValue("6");
			});

			const form = screen.getByRole("form");
			fireEvent.submit(form);

			await waitFor(
				() => {
					expect(screen.getByText("Please enter your email and complete 6-digit code")).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe("API Integration", () => {
		it("should call verify-code API with correct data", async () => {
			const user = userEvent.setup();
			const email = "test@example.com";
			const code = "123456";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					message: "Email verified successfully",
					success: true,
					user_id: "user-123"
				})
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail={email} />);

			// Fill code
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");
			for (let i = 0; i < 6; i++) {
				await user.type(codeInputs[i], code[i]);
			}

			// Submit
			const verifyButton = screen.getByRole("button", { name: "Verify Email" });
			await user.click(verifyButton);

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/verify-code", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email,
					code,
					verification_type: "email_verification"
				})
			});
		});

		it("should show success state and call onClose after successful verification", async () => {
			vi.useFakeTimers();

			try {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						message: "Email verified successfully",
						success: true,
						user_id: "user-123"
					})
				});

				render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

				// Fill code inputs directly
				const codeInputs = screen
					.getAllByDisplayValue("")
					.filter(input => input.getAttribute("inputMode") === "numeric");

				// Simulate filling the code "123456"
				"123456".split("").forEach((digit, index) => {
					fireEvent.change(codeInputs[index], { target: { value: digit } });
				});

				// Submit form
				const form = screen.getByRole("form");
				fireEvent.submit(form);

				// Wait for success state
				await waitFor(
					() => {
						expect(screen.getByText("Email Verified!")).toBeInTheDocument();
					},
					{ timeout: 3000 }
				);

				// Fast-forward timer to trigger onClose
				act(() => {
					vi.advanceTimersByTime(2000);
				});

				expect(mockOnClose).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		}, 10000);

		it("should show error message on verification failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					message: "Invalid verification code",
					success: false
				})
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			// Fill code inputs directly
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			"123456".split("").forEach((digit, index) => {
				fireEvent.change(codeInputs[index], { target: { value: digit } });
			});

			// Submit form
			const form = screen.getByRole("form");
			fireEvent.submit(form);

			await waitFor(
				() => {
					expect(screen.getByText("Invalid verification code")).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		it("should show network error message on fetch failure", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			// Fill code inputs directly
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			"123456".split("").forEach((digit, index) => {
				fireEvent.change(codeInputs[index], { target: { value: digit } });
			});

			// Submit form
			const form = screen.getByRole("form");
			fireEvent.submit(form);

			await waitFor(
				() => {
					expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		it("should show loading state during verification", async () => {
			// Mock a slow response that we can control
			let resolvePromise: any;
			const pendingPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});

			mockFetch.mockImplementationOnce(() => {
				return pendingPromise.then(() => ({
					ok: true,
					json: async () => ({ message: "Success", success: true, user_id: "user-123" })
				}));
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			// Fill code inputs directly
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			"123456".split("").forEach((digit, index) => {
				fireEvent.change(codeInputs[index], { target: { value: digit } });
			});

			// Submit form
			const form = screen.getByRole("form");
			fireEvent.submit(form);

			// Should show loading state
			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Verifying..." })).toBeInTheDocument();
				expect(screen.getByRole("button", { name: "Verifying..." })).toBeDisabled();
			});

			// Resolve the promise to prevent hanging
			resolvePromise();
		});
	});

	describe("Resend Code Functionality", () => {
		it("should call resend API when resend button is clicked", async () => {
			const email = "test@example.com";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Code sent" })
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail={email} />);

			const resendButton = screen.getByRole("button", { name: /didn't receive.*resend/i });
			fireEvent.click(resendButton);

			await waitFor(
				() => {
					expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/send-verification", {
						method: "POST",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({ email })
					});
				},
				{ timeout: 3000 }
			);
		});

		it("should clear code fields and refocus first input after successful resend", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Code sent" })
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			// Fill some code
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			fireEvent.change(codeInputs[0], { target: { value: "1" } });
			fireEvent.change(codeInputs[1], { target: { value: "2" } });

			// Resend code
			const resendButton = screen.getByRole("button", { name: /didn't receive.*resend/i });
			fireEvent.click(resendButton);

			await waitFor(
				() => {
					// Code fields should be cleared
					expect(codeInputs[0]).toHaveValue("");
					expect(codeInputs[1]).toHaveValue("");
					// First field should be focused
					expect(codeInputs[0]).toHaveFocus();
				},
				{ timeout: 3000 }
			);
		});

		it("should show error when resend fails", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ message: "Failed" })
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			const resendButton = screen.getByRole("button", { name: /didn't receive.*resend/i });
			fireEvent.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Failed to resend code. Please try again.")).toBeInTheDocument();
			});
		});

		it("should require email for resend", async () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			const resendButton = screen.getByRole("button", { name: /didn't receive.*resend/i });
			fireEvent.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Please enter your email address")).toBeInTheDocument();
			});
		});

		it("should show loading state during resend", async () => {
			// Mock a slow response that we can control
			let resolvePromise: any;
			const pendingPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});

			mockFetch.mockImplementationOnce(() => {
				return pendingPromise.then(() => ({
					ok: true,
					json: async () => ({ message: "Code sent" })
				}));
			});

			render(<EmailVerificationPage onClose={mockOnClose} initialEmail="test@example.com" />);

			const resendButton = screen.getByRole("button", { name: /didn't receive.*resend/i });
			fireEvent.click(resendButton);

			// Should show loading state
			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
				expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
			});

			// Resolve the promise to prevent hanging
			resolvePromise();
		});
	});

	describe("Error Handling", () => {
		it("should clear errors when user starts typing", async () => {
			// First cause an error
			render(<EmailVerificationPage onClose={mockOnClose} />);
			const form = screen.getByRole("form");
			fireEvent.submit(form);

			await waitFor(() => {
				expect(screen.getByText("Please enter your email and complete 6-digit code")).toBeInTheDocument();
			});

			// Now start typing - error should clear
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");
			fireEvent.change(codeInputs[0], { target: { value: "1" } });

			await waitFor(() => {
				expect(screen.queryByText("Please enter your email and complete 6-digit code")).not.toBeInTheDocument();
			});
		});

		it("should clear errors when pasting code", async () => {
			// First cause an error
			render(<EmailVerificationPage onClose={mockOnClose} />);
			const form = screen.getByRole("form");
			fireEvent.submit(form);

			await waitFor(() => {
				expect(screen.getByText("Please enter your email and complete 6-digit code")).toBeInTheDocument();
			});

			// Now paste code - error should clear
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			// Simulate paste event
			fireEvent.paste(codeInputs[0], {
				clipboardData: {
					getData: () => "123456"
				}
			});

			await waitFor(() => {
				expect(screen.queryByText("Please enter your email and complete 6-digit code")).not.toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper labels and ARIA attributes", () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			// Email input should have proper label
			const emailInput = screen.getByLabelText("Email Address");
			expect(emailInput).toHaveAttribute("type", "email");
			expect(emailInput).toHaveAttribute("required");

			// Code inputs should be properly labeled
			const codeLabel = screen.getByText("Verification Code");
			expect(codeLabel).toBeInTheDocument();

			// Form should be accessible
			const form = screen.getByRole("form");
			expect(form).toBeInTheDocument();
		});

		it("should have proper focus management", async () => {
			render(<EmailVerificationPage onClose={mockOnClose} />);

			// Tab navigation should work properly
			const emailInput = screen.getByLabelText("Email Address");
			const codeInputs = screen
				.getAllByDisplayValue("")
				.filter(input => input.getAttribute("inputMode") === "numeric");

			fireEvent.focus(emailInput);
			expect(emailInput).toHaveFocus();

			// Simulate tab key press
			fireEvent.keyDown(emailInput, { key: "Tab", code: "Tab" });
			fireEvent.focus(codeInputs[0]);
			expect(codeInputs[0]).toHaveFocus();
		});
	});
});
