import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
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
		vi.useFakeTimers();
		vi.clearAllMocks();
		mockFetch.mockClear();
		vi.mocked(clearPendingVerification).mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const fillCode = (code: string) => {
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		code.split("").forEach((char, index) => {
			fireEvent.change(codeInputs[index], { target: { value: char } });
		});
	};

	it("should not render when isOpen is false", () => {
		render(<EmailVerificationModal {...defaultProps} isOpen={false} />);
		expect(screen.queryByText("Verify Your Email")).not.toBeInTheDocument();
	});

	it("should render verification form when open", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
		expect(screen.getByText("Verification Code")).toBeInTheDocument();
	});

	it("should pre-populate email field with initialEmail", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		const emailInput = screen.getByLabelText("Email Address") as HTMLInputElement;
		expect(emailInput.value).toBe("test@example.com");
	});

	it("should handle code input", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		fillCode("1");
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("1");
	});

	it("should handle backspace navigation between code inputs", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		codeInputs[1].focus();
		fireEvent.keyDown(codeInputs[1], { key: "Backspace" });
		expect(codeInputs[0]).toHaveFocus();
	});

	it("should handle paste of 6-digit code", () => {
		render(<EmailVerificationModal {...defaultProps} />);
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
		render(<EmailVerificationModal {...defaultProps} />);
		const emailInput = screen.getByLabelText("Email Address");
		fireEvent.change(emailInput, { target: { value: "" } });
		fillCode("123456");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).toBeDisabled();
	});

	it("should successfully verify code", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ message: "Email verified successfully", success: true, user_id: "123" })
		});

		render(<EmailVerificationModal {...defaultProps} />);
		fillCode("123456");

		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).not.toBeDisabled();
		fireEvent.click(verifyButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/verify-code", expect.any(Object));
		expect(screen.getByText("Email Verified!")).toBeInTheDocument();
		expect(vi.mocked(clearPendingVerification)).toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(mockOnSuccess).toHaveBeenCalled();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it("should handle verification failure gracefully", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ message: "Invalid verification code", success: false })
		});

		render(<EmailVerificationModal {...defaultProps} />);
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
		mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
		render(<EmailVerificationModal {...defaultProps} />);
		const resendButton = screen.getByRole("button", { name: /resend/i });
		fireEvent.click(resendButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/send-verification", expect.any(Object));
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("");
	});

	it("should allow user to request another code if resend fails", async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });
		render(<EmailVerificationModal {...defaultProps} />);
		const resendButton = screen.getByRole("button", { name: /resend/i });
		fireEvent.click(resendButton);

		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByText("Failed to resend code. Please try again.")).toBeInTheDocument();
		expect(resendButton).not.toBeDisabled();
	});

	it("should close modal when close button is clicked", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		const closeButton = screen.getByRole("button", { name: "✕" });
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalled();
	});

	it("should reset state when modal opens", () => {
		const { rerender } = render(<EmailVerificationModal {...defaultProps} isOpen={false} />);
		rerender(<EmailVerificationModal {...defaultProps} isOpen={true} />);
		const codeInputs = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric");
		expect(codeInputs[0]).toHaveValue("");
		expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
	});

	it("should only allow numeric input in code fields", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		const firstCodeInput = screen
			.getAllByRole("textbox")
			.filter(input => input.getAttribute("inputMode") === "numeric")[0];
		fireEvent.change(firstCodeInput, { target: { value: "a1b" } });
		expect(firstCodeInput).toHaveValue("");
	});

	it("should disable verify button when code is incomplete", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		fillCode("123");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).toBeDisabled();
	});

	it("should enable verify button when code is complete and email is provided", () => {
		render(<EmailVerificationModal {...defaultProps} />);
		fillCode("123456");
		const verifyButton = screen.getByRole("button", { name: /verify email/i });
		expect(verifyButton).not.toBeDisabled();
	});
});
