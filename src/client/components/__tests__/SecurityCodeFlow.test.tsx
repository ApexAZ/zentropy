import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import SecurityCodeFlow from "../SecurityCodeFlow";
import { SecurityOperationType } from "../../types";

// Mock AuthService with the expected verifySecurityCode method
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		verifySecurityCode: vi.fn()
	}
}));

// Mock EmailVerificationResendButton since it's already tested
vi.mock("../EmailVerificationResendButton", () => ({
	default: ({ operationType, onResendSuccess }: any) => (
		<button data-testid="resend-button" onClick={() => onResendSuccess?.()}>
			Resend Code for {operationType}
		</button>
	)
}));

// Mock logger to avoid console outputs in tests
vi.mock("../../utils/logger", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn()
	}
}));

import { AuthService } from "../../services/AuthService";

describe("SecurityCodeFlow", () => {
	const mockProps = {
		userEmail: "test@example.com",
		operationType: SecurityOperationType.PASSWORD_CHANGE,
		onCodeVerified: vi.fn(),
		onCancel: vi.fn(),
		title: "Test Verification",
		description: "Enter test code"
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render with default title and description when not provided", () => {
			const minimalProps = {
				userEmail: "test@example.com",
				operationType: SecurityOperationType.EMAIL_VERIFICATION,
				onCodeVerified: vi.fn()
			};

			render(<SecurityCodeFlow {...minimalProps} />);

			expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
			expect(screen.getByText("Enter the verification code sent to your email")).toBeInTheDocument();
		});

		it("should render with custom title and description", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			expect(screen.getByText("Test Verification")).toBeInTheDocument();
			expect(screen.getByText("Enter test code")).toBeInTheDocument();
		});

		it("should display the user email", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			expect(screen.getByText("Code sent to: test@example.com")).toBeInTheDocument();
		});

		it("should render code input field with correct attributes", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			expect(codeInput).toBeInTheDocument();
			expect(codeInput).toHaveAttribute("type", "text");
			expect(codeInput).toHaveAttribute("maxLength", "6");
			expect(codeInput).toHaveAttribute("autoComplete", "one-time-code");
		});

		it("should render verify button initially disabled", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			const verifyButton = screen.getByRole("button", { name: /verify code/i });
			expect(verifyButton).toBeDisabled();
		});

		it("should render cancel button when onCancel is provided", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
		});

		it("should not render cancel button when onCancel is not provided", () => {
			const propsWithoutCancel = { ...mockProps };
			delete propsWithoutCancel.onCancel;

			render(<SecurityCodeFlow {...propsWithoutCancel} />);

			expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
		});

		it("should render EmailVerificationResendButton with correct props", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			const resendButton = screen.getByTestId("resend-button");
			expect(resendButton).toBeInTheDocument();
			expect(resendButton).toHaveTextContent("Resend Code for password_change");
		});
	});

	describe("Code Input Validation", () => {
		it("should only allow numeric input", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");

			// Try to enter letters and symbols
			fireEvent.change(codeInput, { target: { value: "abc123!@#" } });

			// Should only show the numeric characters
			expect(codeInput).toHaveValue("123");
		});

		it("should limit input to 6 digits", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");

			fireEvent.change(codeInput, { target: { value: "1234567890" } });

			expect(codeInput).toHaveValue("123456");
		});

		it("should enable verify button when 6 digits are entered", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "123456" } });

			expect(verifyButton).not.toBeDisabled();
		});

		it("should keep verify button disabled with less than 6 digits", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "12345" } });

			expect(verifyButton).toBeDisabled();
		});
	});

	describe("Code Verification", () => {
		it("should call AuthService.verifySecurityCode with correct parameters", async () => {
			const mockResponse = { operation_token: "test-token", expires_in: 600 };
			(AuthService.verifySecurityCode as any).mockResolvedValue(mockResponse);

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "123456" } });
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(AuthService.verifySecurityCode).toHaveBeenCalledWith(
				"test@example.com",
				"123456",
				SecurityOperationType.PASSWORD_CHANGE
			);
		});

		it("should call onCodeVerified with operation token on successful verification", async () => {
			const mockResponse = { operation_token: "test-token", expires_in: 600 };
			(AuthService.verifySecurityCode as any).mockResolvedValue(mockResponse);

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "123456" } });
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(mockProps.onCodeVerified).toHaveBeenCalledWith("test-token");
		});

		it("should show loading state during verification", async () => {
			// Create a promise we can control to test loading state
			let resolvePromise: (value: any) => void;
			const controllablePromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			(AuthService.verifySecurityCode as any).mockReturnValue(controllablePromise);

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			await act(async () => {
				fireEvent.change(codeInput, { target: { value: "123456" } });
			});

			// Click the button to start verification
			fireEvent.click(verifyButton);

			// Wait for the state to update and check loading state
			await act(async () => {
				await Promise.resolve();
			});

			// Now the button should be disabled due to loading
			expect(verifyButton).toBeDisabled();

			// Resolve the promise to complete the test
			await act(async () => {
				resolvePromise!({ operation_token: "test-token", expires_in: 600 });
			});
		});

		it("should display error message on verification failure", async () => {
			const errorMessage = "Invalid verification code";
			(AuthService.verifySecurityCode as any).mockRejectedValue(new Error(errorMessage));

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "123456" } });
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
		});

		it("should clear error message when starting new verification", async () => {
			const errorMessage = "Invalid verification code";
			(AuthService.verifySecurityCode as any).mockRejectedValue(new Error(errorMessage));

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			// First attempt - should show error
			await act(async () => {
				fireEvent.change(codeInput, { target: { value: "123456" } });
				fireEvent.click(verifyButton);
			});

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();

			// Second attempt - error should be cleared
			(AuthService.verifySecurityCode as any).mockResolvedValue({
				operation_token: "test-token",
				expires_in: 600
			});

			await act(async () => {
				fireEvent.change(codeInput, { target: { value: "654321" } });
				fireEvent.click(verifyButton);
			});

			// Error should be cleared immediately when new verification starts
			expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
		});

		it("should handle verification failure with fallback error message", async () => {
			(AuthService.verifySecurityCode as any).mockRejectedValue(new Error());

			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			const verifyButton = screen.getByRole("button", { name: /verify code/i });

			fireEvent.change(codeInput, { target: { value: "123456" } });
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Invalid verification code")).toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onCancel when cancel button is clicked", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const cancelButton = screen.getByRole("button", { name: /cancel/i });

			fireEvent.click(cancelButton);

			expect(mockProps.onCancel).toHaveBeenCalled();
		});

		it("should format code input to have consistent styling", () => {
			render(<SecurityCodeFlow {...mockProps} />);
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");

			// Input should have specific styling classes for better UX
			expect(codeInput).toHaveClass("text-center");
			expect(codeInput).toHaveClass("text-lg");
			expect(codeInput).toHaveClass("tracking-widest");
		});
	});

	describe("Integration with EmailVerificationResendButton", () => {
		it("should pass correct operationType to EmailVerificationResendButton", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			const resendButton = screen.getByTestId("resend-button");
			expect(resendButton).toHaveTextContent("password_change");
		});

		it("should work with different operation types", () => {
			const propsWithDifferentType = {
				...mockProps,
				operationType: SecurityOperationType.PASSWORD_RESET
			};

			render(<SecurityCodeFlow {...propsWithDifferentType} />);

			const resendButton = screen.getByTestId("resend-button");
			expect(resendButton).toHaveTextContent("password_reset");
		});
	});

	describe("Accessibility", () => {
		it("should have proper label association for code input", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");
			expect(codeInput).toHaveAttribute("id", "verification-code");
		});

		it("should have proper button roles and names", () => {
			render(<SecurityCodeFlow {...mockProps} />);

			expect(screen.getByRole("button", { name: /verify code/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
		});
	});
});
