import React from "react";
import { screen, act } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fastUserActions, fastStateSync } from "../../__tests__/utils";
import "@testing-library/jest-dom";
import EmailVerificationResendButton from "../EmailVerificationResendButton";
import { AuthService } from "../../services/AuthService";

// Mock the AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		sendEmailVerification: vi.fn()
	}
}));

// Mock the logger
vi.mock("../../utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn()
	}
}));

describe("EmailVerificationResendButton", () => {
	const mockEmail = "test@example.com";
	const mockSendEmailVerification = vi.mocked(AuthService.sendEmailVerification);

	beforeEach(() => {
		vi.useFakeTimers(); // Use fake timers for predictable timing
		vi.clearAllMocks();
		// Clear localStorage before each test
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers(); // Cleanup fake timers after each test
		localStorage.clear();
	});

	it("renders the resend button initially", () => {
		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
	});

	it("shows loading state when resending", async () => {
		// Mock sendEmailVerification to never resolve (simulate loading)
		mockSendEmailVerification.mockImplementation(() => new Promise(() => {})); // Never resolves

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		expect(screen.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
	});

	it("calls AuthService.sendEmailVerification with correct email", async () => {
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		expect(mockSendEmailVerification).toHaveBeenCalledWith(mockEmail);
	});

	it("calls onResendSuccess callback and starts countdown after successful email send", async () => {
		const mockOnResendSuccess = vi.fn();
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(
			<EmailVerificationResendButton userEmail={mockEmail} onResendSuccess={mockOnResendSuccess} />
		);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		await act(async () => {
			await Promise.resolve();
		});
		expect(mockOnResendSuccess).toHaveBeenCalled();

		// Should start countdown timer after successful send
		await act(async () => {
			await Promise.resolve();
		});

		expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

		// Button should be disabled during countdown
		expect(screen.getByRole("button", { name: "60s" })).toBeDisabled();
	});

	it("does not manage success state internally (parent handles it)", async () => {
		const mockOnResendSuccess = vi.fn();
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(
			<EmailVerificationResendButton userEmail={mockEmail} onResendSuccess={mockOnResendSuccess} />
		);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		// Should always show the button (no internal success state)
		await fastStateSync();
		expect(mockOnResendSuccess).toHaveBeenCalled();

		// Button should show countdown after successful send (rate limiting starts)
		await fastStateSync();
		expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

		// Should not show internal success message (parent handles it)
		expect(screen.queryByText("Verification email sent to test@example.com!")).not.toBeInTheDocument();
	});

	it("returns to normal state after error", async () => {
		mockSendEmailVerification.mockRejectedValue(new Error("Network error"));

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		await fastStateSync();
		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();

		// Should not show error message in compact UI
		expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
	});

	it("handles rate limiting error with remaining time", async () => {
		const rateLimitError = new Error("Rate limited");
		(rateLimitError as any).response = {
			status: 429,
			data: {
				detail: {
					message: "Rate limited",
					rate_limited: true,
					rate_limit_seconds_remaining: 45
				}
			}
		};

		mockSendEmailVerification.mockRejectedValue(rateLimitError);

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		// Should show countdown with rate limit remaining time
		await fastStateSync();
		expect(screen.getByRole("button", { name: "45s" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "45s" })).toBeDisabled();
	});

	it("manages countdown timer correctly", async () => {
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		// Should start with 60 second countdown
		await fastStateSync();
		expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

		// Advance timer by 1 second
		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(screen.getByRole("button", { name: "59s" })).toBeInTheDocument();

		// Advance timer to end of countdown
		act(() => {
			vi.advanceTimersByTime(59000);
		});

		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();
	});

	it("persists rate limit timer across component remounts", async () => {
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		// First render and trigger rate limit
		const { result } = renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		// Should start countdown
		await fastStateSync();
		expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

		// Advance timer by 10 seconds
		act(() => {
			vi.advanceTimersByTime(10000);
		});

		expect(screen.getByRole("button", { name: "50s" })).toBeInTheDocument();

		// Unmount and remount component
		result.unmount();
		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		// Should restore countdown from localStorage
		expect(screen.getByRole("button", { name: /\d+s/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /\d+s/ })).toBeDisabled();
	});

	it("clears rate limit timer when countdown reaches zero", async () => {
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		// Should start countdown
		await fastStateSync();
		expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

		// Advance timer to completion
		act(() => {
			vi.advanceTimersByTime(60000);
		});

		// Should clear rate limit and allow resending
		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();

		// localStorage should be cleared
		expect(localStorage.getItem("emailResendRateLimit")).toBeNull();
	});
});
