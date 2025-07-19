import React from "react";
/* eslint-disable-next-line no-restricted-imports -- One test requires render with rerender for modal state testing */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import EmailVerificationModal from "../EmailVerificationModal";
import { clearPendingVerification } from "../../utils/pendingVerification";
import { AuthService } from "../../services/AuthService";

// 🚀 PERFORMANCE PATTERN: Module Mocking
// ✅ Use vi.mock() to mock utility modules
// ✅ Prevents actual utility functions from running during tests
vi.mock("../../utils/pendingVerification", () => ({
	clearPendingVerification: vi.fn()
}));

// 🚀 PERFORMANCE PATTERN: Service Mocking
// ✅ Use service mocking instead of global.fetch for better test isolation and 99%+ speed improvement
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		verifyCode: vi.fn(),
		sendEmailVerification: vi.fn()
	}
}));

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
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(clearPendingVerification).mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// 🚀 PERFORMANCE PATTERN: Synchronous Helper Function
	// ✅ No async/await - immediate DOM manipulation
	// ✅ Uses fireEvent.change for fast input simulation
	const fillCode = (code: string) => {
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		code.split("").forEach((char, index) => {
			fireEvent.change(codeInputs[index], { target: { value: char } });
		});
	};

	it("should not render when isOpen is false", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} isOpen={false} />);
		expect(screen.queryByText("Verify Your Email")).not.toBeInTheDocument();
	});

	it("should render verification form when open", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByText("Verification Code")).toBeInTheDocument();
	});

	it("should pre-populate email field with initialEmail", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		expect(emailInput.value).toBe("test@example.com");
	});

	it("should handle code input", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		fillCode("1");
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("1");
	});

	it("should handle backspace navigation between code inputs", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		codeInputs[1].focus();
		fireEvent.keyDown(codeInputs[1], { key: "Backspace" });
		expect(codeInputs[0]).toHaveFocus();
	});

	it("should handle paste of 6-digit code", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];
		fireEvent.paste(firstCodeInput, { clipboardData: { getData: () => "123456" } });
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[5]).toHaveValue("6");
	});

	it("should disable verify button when email is empty", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const emailInput = screen.getByLabelText("Email Address");
		fireEvent.change(emailInput, { target: { value: "" } });
		fillCode("123456");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).toBeDisabled();
	});

	it("should successfully verify code", async () => {
		// 🚀 PERFORMANCE PATTERN: Service Mock Response
		// ✅ Mock service method directly for faster, more reliable tests
		vi.mocked(AuthService.verifyCode).mockResolvedValueOnce({
			message: "Email verified successfully",
			success: true,
			user_id: "123"
		});

		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		fillCode("123456");

		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).not.toBeDisabled();
		fireEvent.click(verifyButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(AuthService.verifyCode).toHaveBeenCalledWith("test@example.com", "123456", "email_verification");
		expect(screen.getByText("Email Verified!")).toBeInTheDocument();
		expect(vi.mocked(clearPendingVerification)).toHaveBeenCalled();

		// 🚀 PERFORMANCE PATTERN: Fake Timer Advancement
		// ✅ Manually advance fake timers for auto-close behaviors
		// ✅ Avoids waiting for real time delays in tests
		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(mockOnSuccess).toHaveBeenCalled();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it("should handle verification failure gracefully", async () => {
		// 🚀 PERFORMANCE PATTERN: Service Mock Error Response
		// ✅ Mock service method to throw error for faster error testing
		vi.mocked(AuthService.verifyCode).mockRejectedValueOnce(new Error("Invalid verification code"));

		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		fillCode("123456");

		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		fireEvent.click(verifyButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText("Invalid verification code")).toBeInTheDocument();
		expect(mockOnSuccess).not.toHaveBeenCalled();
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("should resend verification code", async () => {
		// 🚀 PERFORMANCE PATTERN: Service Mock for Resend
		// ✅ Mock sendEmailVerification method for faster testing
		vi.mocked(AuthService.sendEmailVerification).mockResolvedValueOnce({
			message: "Verification email sent! Please check your inbox."
		});

		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const resendButton = screen.getByRole("button", { name: /resend/i });
		fireEvent.click(resendButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(AuthService.sendEmailVerification).toHaveBeenCalledWith("test@example.com");
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("");
	});

	it("should allow user to request another code if resend fails", async () => {
		// 🚀 PERFORMANCE PATTERN: Service Mock Error for Resend
		// ✅ Mock sendEmailVerification to throw error for faster error testing
		vi.mocked(AuthService.sendEmailVerification).mockRejectedValueOnce(
			new Error("Failed to resend code. Please try again.")
		);

		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const resendButton = screen.getByRole("button", { name: /resend/i });
		fireEvent.click(resendButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText("Failed to resend code. Please try again.")).toBeInTheDocument();
		expect(resendButton).not.toBeDisabled();
	});

	it("should close modal when close button is clicked", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const closeButton = screen.getByRole("button", { name: "✕" });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});

	it("should reset state when modal opens", () => {
		// 🚀 PERFORMANCE PATTERN: Component Re-rendering
		// ✅ Test component behavior across re-renders
		// ✅ Useful for modal open/close state changes
		const { rerender } = render(<EmailVerificationModal {...defaultProps} isOpen={false} />);
		rerender(<EmailVerificationModal {...defaultProps} isOpen={true} />);
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("");
		expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
	});

	it("should only allow numeric input in code fields", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];
		fireEvent.change(firstCodeInput, { target: { value: "a1b" } });
		expect(firstCodeInput).toHaveValue("");
	});

	it("should disable verify button when code is incomplete", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		fillCode("123");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).toBeDisabled();
	});

	it("should enable verify button when code is complete and email is provided", () => {
		renderWithFullEnvironment(<EmailVerificationModal {...defaultProps} />);
		fillCode("123456");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).not.toBeDisabled();
	});
});
