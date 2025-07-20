import React from "react";
import { screen, act } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fastUserActions, fastStateSync } from "../../__tests__/utils";
import "@testing-library/jest-dom";
import EmailVerificationResendButton from "../EmailVerificationResendButton";
import { AuthService } from "../../services/AuthService";
import { SecurityOperationType } from "../../types";

// Mock the AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		sendEmailVerification: vi.fn(),
		sendSecurityCode: vi.fn()
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
	const mockSendSecurityCode = vi.mocked(AuthService.sendSecurityCode);

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

	it("shows loading state when button is clicked", async () => {
		mockSendSecurityCode.mockImplementation(() => new Promise(() => {})); // Never resolves

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		expect(screen.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
	});

	it("calls AuthService.sendSecurityCode with correct email and default operation type", async () => {
		mockSendSecurityCode.mockResolvedValue({ message: "Email sent successfully" });

		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		fastUserActions.click(button);
		await fastStateSync();

		expect(mockSendSecurityCode).toHaveBeenCalledWith(mockEmail, SecurityOperationType.EMAIL_VERIFICATION);
	});

	it("calls onResendSuccess callback and starts countdown after successful email send", async () => {
		const mockOnResendSuccess = vi.fn();
		mockSendSecurityCode.mockResolvedValue({
			message: "Email sent successfully",
			rate_limit_seconds_remaining: 60
		});

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
		mockSendSecurityCode.mockResolvedValue({
			message: "Email sent successfully",
			rate_limit_seconds_remaining: 60
		});

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
		mockSendSecurityCode.mockRejectedValue(new Error("Network error"));

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

	it("can be clicked again after an error", async () => {
		const mockOnResendSuccess = vi.fn();
		mockSendSecurityCode
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({ message: "Email sent successfully" });

		renderWithFullEnvironment(
			<EmailVerificationResendButton userEmail={mockEmail} onResendSuccess={mockOnResendSuccess} />
		);

		const button = screen.getByRole("button", { name: "Resend" });

		// First click - fails
		fastUserActions.click(button);
		await fastStateSync();
		await fastStateSync();
		expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();

		// Second click - succeeds
		fastUserActions.click(button);
		await fastStateSync();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mockOnResendSuccess).toHaveBeenCalled();

		expect(mockSendSecurityCode).toHaveBeenCalledTimes(2);
	});

	it("has proper accessibility attributes", () => {
		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		expect(button).toBeInTheDocument();
		// Button component doesn't explicitly set type="button" but it's still a button element
		expect(button.tagName).toBe("BUTTON");
	});

	it("maintains button styling from Button component", () => {
		renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		// Should have the secondary variant base with steel blue override and extra compact sizing
		expect(button).toHaveClass("!px-2", "!py-1", "!bg-interactive", "!text-white", "!border-none");
	});

	describe("Operation Type Support", () => {
		it("defaults to EMAIL_VERIFICATION operation type for backward compatibility", async () => {
			mockSendSecurityCode.mockResolvedValue({ message: "Email sent successfully" });

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			expect(mockSendSecurityCode).toHaveBeenCalledWith(mockEmail, SecurityOperationType.EMAIL_VERIFICATION);
		});

		it("uses provided operation type when specified", async () => {
			mockSendSecurityCode.mockResolvedValue({ message: "Email sent successfully" });

			renderWithFullEnvironment(
				<EmailVerificationResendButton
					userEmail={mockEmail}
					operationType={SecurityOperationType.PASSWORD_CHANGE}
				/>
			);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			expect(mockSendSecurityCode).toHaveBeenCalledWith(mockEmail, SecurityOperationType.PASSWORD_CHANGE);
		});

		it("supports all security operation types", async () => {
			const operationTypes = [
				SecurityOperationType.EMAIL_VERIFICATION,
				SecurityOperationType.PASSWORD_RESET,
				SecurityOperationType.PASSWORD_CHANGE,
				SecurityOperationType.USERNAME_RECOVERY,
				SecurityOperationType.EMAIL_CHANGE,
				SecurityOperationType.TWO_FACTOR_SETUP
			];

			for (const operationType of operationTypes) {
				// Clear all state before each iteration
				vi.clearAllMocks();
				localStorage.clear();

				mockSendSecurityCode.mockResolvedValue({ message: "Email sent successfully" });

				const testEnv = renderWithFullEnvironment(
					<EmailVerificationResendButton userEmail={mockEmail} operationType={operationType} />
				);

				const button = screen.getByRole("button", { name: "Resend" });
				fastUserActions.click(button);
				await fastStateSync();

				expect(mockSendSecurityCode).toHaveBeenCalledWith(mockEmail, operationType);

				testEnv.cleanup();
			}
		});

		it("maintains backward compatibility - uses EMAIL_VERIFICATION by default", async () => {
			// When no operationType is provided, should default to EMAIL_VERIFICATION
			mockSendSecurityCode.mockResolvedValue({ message: "Email sent successfully" });

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			// Should use the unified method with default EMAIL_VERIFICATION type
			expect(mockSendSecurityCode).toHaveBeenCalledWith(mockEmail, SecurityOperationType.EMAIL_VERIFICATION);
			expect(mockSendEmailVerification).not.toHaveBeenCalled();
		});

		it("handles errors from sendSecurityCode properly", async () => {
			mockSendSecurityCode.mockRejectedValue(new Error("Network error"));

			renderWithFullEnvironment(
				<EmailVerificationResendButton
					userEmail={mockEmail}
					operationType={SecurityOperationType.PASSWORD_CHANGE}
				/>
			);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			await fastStateSync();
			expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();
		});

		it("calls onResendSuccess callback after successful sendSecurityCode", async () => {
			const mockOnResendSuccess = vi.fn();
			mockSendSecurityCode.mockResolvedValue({
				message: "Email sent successfully",
				rate_limit_seconds_remaining: 60
			});

			renderWithFullEnvironment(
				<EmailVerificationResendButton
					userEmail={mockEmail}
					operationType={SecurityOperationType.PASSWORD_RESET}
					onResendSuccess={mockOnResendSuccess}
				/>
			);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			await act(async () => {
				await Promise.resolve();
			});
			expect(mockOnResendSuccess).toHaveBeenCalled();
		});
	});

	describe("Rate Limiting", () => {
		it("handles rate limit error and shows countdown", async () => {
			// Mock HTTP 429 rate limit error with updated error structure
			const rateError = new Error("Please wait 1 minute(s) before requesting a new code");
			(rateError as any).response = {
				status: 429,
				data: {
					detail: {
						message: "Please wait 1 minute(s) before requesting a new code",
						rate_limited: true,
						rate_limit_seconds_remaining: 60
					}
				}
			};
			mockSendSecurityCode.mockRejectedValue(rateError);

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			const button = screen.getByRole("button", { name: "Resend" });
			fastUserActions.click(button);
			await fastStateSync();

			// Should show countdown after rate limit error
			await fastStateSync();
			expect(screen.getByRole("button", { name: "60s" })).toBeInTheDocument();

			// Button should be disabled during countdown
			expect(screen.getByRole("button", { name: "60s" })).toBeDisabled();
		});

		it("sets up countdown state correctly", async () => {
			const rateError = new Error("Rate limit exceeded");
			(rateError as any).response = {
				status: 429,
				data: {
					detail: {
						rate_limit_seconds_remaining: 5
					}
				}
			};
			mockSendSecurityCode.mockRejectedValue(rateError);

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			fastUserActions.click(screen.getByRole("button", { name: "Resend" }));
			await fastStateSync();

			// Should show countdown after rate limit error
			await fastStateSync();
			expect(screen.getByRole("button", { name: "5s" })).toBeInTheDocument();

			// Button should be disabled during countdown
			expect(screen.getByRole("button", { name: "5s" })).toBeDisabled();
		});

		it("handles different countdown values", async () => {
			const rateError = new Error("Rate limit exceeded");
			(rateError as any).response = {
				status: 429,
				data: {
					detail: {
						rate_limit_seconds_remaining: 45
					}
				}
			};
			mockSendSecurityCode.mockRejectedValue(rateError);

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			fastUserActions.click(screen.getByRole("button", { name: "Resend" }));
			await fastStateSync();

			// Should show countdown with correct value
			await fastStateSync();
			expect(screen.getByRole("button", { name: "45s" })).toBeInTheDocument();

			// Button should be disabled during countdown
			expect(screen.getByRole("button", { name: "45s" })).toBeDisabled();
		});

		it("persists rate limit state in localStorage", async () => {
			const rateError = new Error("Rate limit exceeded");
			(rateError as any).response = {
				status: 429,
				data: {
					detail: {
						rate_limit_seconds_remaining: 30
					}
				}
			};
			mockSendSecurityCode.mockRejectedValue(rateError);

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			fastUserActions.click(screen.getByRole("button", { name: "Resend" }));
			await fastStateSync();

			await fastStateSync();
			expect(screen.getByRole("button", { name: "30s" })).toBeInTheDocument();

			// Check that rate limit data is saved to localStorage
			const storedData = localStorage.getItem("emailResendRateLimit");
			expect(storedData).not.toBe(null);
			expect(storedData).toMatch(/^\{.*\}$/);

			const parsedData = JSON.parse(storedData!);
			expect(parsedData.email).toBe(mockEmail);
			expect(parsedData.expiresAt).toBeGreaterThan(Date.now());
		});

		it("restores rate limit state from localStorage on mount", () => {
			// Pre-populate localStorage with rate limit data
			const expiresAt = Date.now() + 45000; // 45 seconds from now
			const rateLimitData = {
				email: mockEmail,
				expiresAt
			};
			localStorage.setItem("emailResendRateLimit", JSON.stringify(rateLimitData));

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			// Should show countdown from localStorage
			const button = screen.getByRole("button");
			expect(button.textContent).toMatch(/\d+s/);
			expect(button).toBeDisabled();
		});

		it("ignores localStorage data for different email", () => {
			// Pre-populate localStorage with rate limit data for different email
			const expiresAt = Date.now() + 45000;
			const rateLimitData = {
				email: "different@example.com",
				expiresAt
			};
			localStorage.setItem("emailResendRateLimit", JSON.stringify(rateLimitData));

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			// Should not show countdown for different email
			const button = screen.getByRole("button", { name: "Resend" });
			expect(button).not.toBeDisabled();
		});

		it("clears expired localStorage data on mount", () => {
			// Pre-populate localStorage with expired rate limit data
			const expiresAt = Date.now() - 1000; // Expired 1 second ago
			const rateLimitData = {
				email: mockEmail,
				expiresAt
			};
			localStorage.setItem("emailResendRateLimit", JSON.stringify(rateLimitData));

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			// Should not show countdown and should clear localStorage
			const button = screen.getByRole("button", { name: "Resend" });
			expect(button).not.toBeDisabled();
			expect(localStorage.getItem("emailResendRateLimit")).toBeNull();
		});

		it("persists rate limit state after successful sends", async () => {
			mockSendSecurityCode.mockResolvedValue({
				message: "Email sent successfully",
				rate_limit_seconds_remaining: 60
			});

			renderWithFullEnvironment(<EmailVerificationResendButton userEmail={mockEmail} />);

			fastUserActions.click(screen.getByRole("button", { name: "Resend" }));
			await fastStateSync();

			// Should save rate limit data to localStorage after successful send
			await fastStateSync();
			const storedData = localStorage.getItem("emailResendRateLimit");
			expect(storedData).not.toBe(null);
			expect(storedData).toMatch(/^\{.*\}$/);

			const parsedData = JSON.parse(storedData!);
			expect(parsedData.email).toBe(mockEmail);
			expect(parsedData.expiresAt).toBeGreaterThan(Date.now());
		});
	});
});
