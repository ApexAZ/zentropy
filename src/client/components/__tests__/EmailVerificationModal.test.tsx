import React from "react";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import EmailVerificationModal from "../EmailVerificationModal";
import { clearPendingVerification } from "../../utils/pendingVerification";

// Mock the pendingVerification utilities
vi.mock("../../utils/pendingVerification", () => ({
	clearPendingVerification: vi.fn()
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("EmailVerificationModal", () => {
	const mockOnClose = vi.fn();
	const mockOnSuccess = vi.fn();

	const defaultProps = {
		isOpen: true,
		onClose: mockOnClose,
		onSuccess: mockOnSuccess,
		initialEmail: "test@example.com"
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
		vi.mocked(clearPendingVerification).mockClear();
		// Reset DOM state
		cleanup();
	});

	afterEach(() => {
		// Ensure clean state between tests
		cleanup();
		vi.clearAllMocks();
		// Clear any pending timers that might affect subsequent tests
		vi.clearAllTimers();
	});

	it("should not render when isOpen is false", () => {
		render(<EmailVerificationModal {...defaultProps} isOpen={false} />);
		expect(screen.queryByText("Verify Your Email")).not.toBeInTheDocument();
	});

	it("should render verification form when open", () => {
		render(<EmailVerificationModal {...defaultProps} />);

		expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
		expect(screen.getByText("We've sent a 6-digit verification code to your email address.")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByText("Verification Code")).toBeInTheDocument();
	});

	it("should pre-populate email field with initialEmail", () => {
		render(<EmailVerificationModal {...defaultProps} />);

		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		expect(emailInput.value).toBe("test@example.com");
	});

	it("should handle code input", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		// Get all code input fields
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");

		expect(codeInputs).toHaveLength(6);

		// Test that individual inputs accept numeric values
		await user.type(codeInputs[0], "1");
		expect(codeInputs[0]).toHaveValue("1");
	});

	it("should handle backspace navigation between code inputs", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");

		// Focus second input and press backspace
		codeInputs[1].focus();
		await user.keyboard("{Backspace}");
		expect(codeInputs[0]).toHaveFocus();
	});

	it("should handle paste of 6-digit code", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		// Paste 6-digit code
		await user.click(firstCodeInput);
		await user.paste("123456");

		// All inputs should be filled
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");

		expect((codeInputs[0] as HTMLInputElement).value).toBe("1");
		expect((codeInputs[1] as HTMLInputElement).value).toBe("2");
		expect((codeInputs[2] as HTMLInputElement).value).toBe("3");
		expect((codeInputs[3] as HTMLInputElement).value).toBe("4");
		expect((codeInputs[4] as HTMLInputElement).value).toBe("5");
		expect((codeInputs[5] as HTMLInputElement).value).toBe("6");
	});

	it("should disable verify button when email is empty", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		// Clear the email
		const emailInput = screen.getByLabelText("Email Address");
		await user.clear(emailInput);

		// Use paste to fill complete code (avoids race condition with sequential typing)
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		await user.click(firstCodeInput);
		await user.paste("123456");

		// Button should be disabled when email is empty even with complete code
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		await waitFor(
			() => {
				expect(verifyButton).toBeDisabled();
			},
			{ timeout: 1000 }
		);
	});

	it("should successfully verify code", async () => {
		const user = userEvent.setup();

		// Mock successful verification response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () =>
				Promise.resolve({
					message: "Email verified successfully",
					success: true,
					user_id: "123"
				})
		});

		render(<EmailVerificationModal {...defaultProps} />);

		// Use paste to fill complete code (avoids race condition with sequential typing)
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		await user.click(firstCodeInput);
		await user.paste("123456");

		const verifyButton = screen.getByRole("button", { name: /verify email/i });

		// Wait for button to be enabled by checking the actual state condition
		await waitFor(
			() => {
				expect(verifyButton).not.toBeDisabled();
			},
			{ timeout: 1000 }
		);

		await user.click(verifyButton);

		// Should call verification endpoint
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/verify-code", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: "test@example.com",
					code: "123456",
					verification_type: "email_verification"
				})
			});
		});

		// Should show success state
		await waitFor(() => {
			expect(screen.getByText("Email Verified!")).toBeInTheDocument();
		});

		// Should clear pending verification state
		await waitFor(() => {
			expect(vi.mocked(clearPendingVerification)).toHaveBeenCalled();
		});

		// Should call onSuccess and onClose after delay
		await waitFor(
			() => {
				expect(mockOnSuccess).toHaveBeenCalled();
				expect(mockOnClose).toHaveBeenCalled();
			},
			{ timeout: 3000 }
		);
	});

	it("should handle verification failure gracefully", async () => {
		const user = userEvent.setup();

		// Mock failed verification response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: () =>
				Promise.resolve({
					message: "Invalid verification code",
					success: false
				})
		});

		render(<EmailVerificationModal {...defaultProps} />);

		// Use paste to fill complete code (avoids race condition with sequential typing)
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		await user.click(firstCodeInput);
		await user.paste("123456");

		const verifyButton = screen.getByRole("button", { name: /verify email/i });

		// Ensure button is enabled before clicking
		await waitFor(
			() => {
				expect(verifyButton).not.toBeDisabled();
			},
			{ timeout: 1000 }
		);

		await user.click(verifyButton);

		// Should make the API call but not call success callbacks due to failure
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/verify-code"),
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json"
					}),
					body: expect.stringContaining("123456")
				})
			);
		});

		// Should not call success callbacks when verification fails
		expect(mockOnSuccess).not.toHaveBeenCalled();
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("should resend verification code", async () => {
		const user = userEvent.setup();

		// Mock successful resend response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({})
		});

		render(<EmailVerificationModal {...defaultProps} />);

		const resendButton = screen.getByRole("button", { name: /didn't receive a code\? resend/i });
		await user.click(resendButton);

		// Should call resend endpoint
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/send-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email: "test@example.com" })
			});
		});

		// Code inputs should be cleared
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");

		codeInputs.forEach(input => {
			expect((input as HTMLInputElement).value).toBe("");
		});
	});

	it("should allow user to request another code if resend fails", async () => {
		const user = userEvent.setup();

		// Mock failed resend response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({})
		});

		render(<EmailVerificationModal {...defaultProps} />);

		const resendButton = screen.getByRole("button", { name: /didn't receive a code\? resend/i });

		// User clicks resend button
		await user.click(resendButton);

		// Wait for resend operation to complete
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalled();
		});

		// User should be able to try resending again (button not permanently disabled)
		expect(resendButton).not.toBeDisabled();
		expect(resendButton).toBeInTheDocument();
	});

	it("should close modal when close button is clicked", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		const closeButton = screen.getByRole("button", { name: /✕/i });
		await user.click(closeButton);

		expect(mockOnClose).toHaveBeenCalled();
	});

	it("should reset state when modal opens", () => {
		const { rerender } = render(<EmailVerificationModal {...defaultProps} isOpen={false} />);

		// Reopen modal
		rerender(<EmailVerificationModal {...defaultProps} isOpen={true} />);

		// Code inputs should be empty
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");

		codeInputs.forEach(input => {
			expect((input as HTMLInputElement).value).toBe("");
		});

		// No error should be shown
		expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
	});

	it("should only allow numeric input in code fields", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		// Try to type non-numeric characters
		await user.type(firstCodeInput, "abc123def");

		// Should only contain numeric characters
		expect((firstCodeInput as HTMLInputElement).value).toBe("1");
	});

	it("should disable verify button when code is incomplete", () => {
		render(<EmailVerificationModal {...defaultProps} />);

		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).toBeDisabled();
	});

	it("should enable verify button when code is complete and email is provided", async () => {
		const user = userEvent.setup();
		render(<EmailVerificationModal {...defaultProps} />);

		// Verify initial email is present (from defaultProps.initialEmail)
		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		expect(emailInput.value).toBe("test@example.com");

		// Instead of typing into individual inputs, use paste to fill the complete code
		// This avoids race conditions with the auto-focus logic
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];

		// Use paste to fill all 6 digits at once, which the component handles properly
		await user.click(firstCodeInput);
		await user.paste("123456");

		// Wait for React state to stabilize and button to be enabled
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		await waitFor(
			() => {
				expect(verifyButton).not.toBeDisabled();
			},
			{ timeout: 1000 }
		);
	});
});
