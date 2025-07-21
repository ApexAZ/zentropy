import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment, fastStateSync, fastUserActions } from "../../__tests__/utils/testRenderUtils";
import { SecurityOperationType } from "../../types";
import { ForgotPasswordFlow } from "../ForgotPasswordFlow";

// Mock AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		validateEmail: vi.fn(),
		sendSecurityCode: vi.fn(),
		verifySecurityCode: vi.fn(),
		resetPassword: vi.fn()
	}
}));

// Mock SecurityCodeFlow
vi.mock("../SecurityCodeFlow", () => ({
	default: ({ onCodeVerified, onCancel, title, description }: any) => (
		<div data-testid="security-code-flow">
			<h3>{title}</h3>
			<p>{description}</p>
			<button onClick={() => onCodeVerified("mock-operation-token-123")}>Verify Mock Code</button>
			<button onClick={onCancel}>Cancel</button>
		</div>
	)
}));

// Mock PasswordRequirements
vi.mock("../PasswordRequirements", () => ({
	default: ({ password }: { password: string }) => (
		<div data-testid="password-requirements">Requirements for: {password}</div>
	)
}));

const { AuthService } = await import("../../services/AuthService");

describe("ForgotPasswordFlow", () => {
	const mockOnComplete = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(AuthService.validateEmail as any).mockImplementation((email: string) =>
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		);
	});

	describe("Step 1: Email Input", () => {
		it("should render email input step initially", () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
			expect(
				screen.getByText("Enter your email address and we'll send you a code to reset your password.")
			).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
			expect(screen.getByText("Send Reset Code")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("should validate email format", async () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			// Test invalid email
			fastUserActions.type(emailInput, "invalid-email");
			fastUserActions.click(submitButton);

			await fastStateSync();

			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).not.toHaveBeenCalled();
		});

		it("should send security code with valid email", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Reset code sent successfully"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			fastUserActions.type(emailInput, "user@example.com");
			fastUserActions.click(submitButton);

			await fastStateSync();

			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"user@example.com",
				SecurityOperationType.PASSWORD_RESET
			);

			// Should move to verification step
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();
		});

		it("should handle security code sending error gracefully", async () => {
			(AuthService.sendSecurityCode as any).mockRejectedValueOnce(new Error("Rate limited"));

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			fastUserActions.type(emailInput, "user@example.com");
			fastUserActions.click(submitButton);

			await fastStateSync();

			// Should still move to verification step for security (don't reveal if email exists)
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});

		it("should handle cancel button", () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			fastUserActions.click(screen.getByText("Cancel"));

			expect(mockOnCancel).toHaveBeenCalled();
		});

		it("should disable submit button when email is empty", () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const submitButton = screen.getByText("Send Reset Code");
			expect(submitButton).toBeDisabled();
		});

		it("should show loading state during submission", async () => {
			(AuthService.sendSecurityCode as any).mockImplementation(() => new Promise(resolve => resolve({})));

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			fastUserActions.type(emailInput, "user@example.com");

			await act(async () => {
				fastUserActions.click(submitButton);
				await fastStateSync();
			});

			expect(submitButton).toBeDisabled();
		});
	});

	describe("Step 2: Code Verification", () => {
		it("should render SecurityCodeFlow with correct props", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();
			expect(screen.getByText("Enter the reset code sent to your email address")).toBeInTheDocument();
		});

		it("should handle going back to email step from verification", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			// Click cancel in verification step
			fastUserActions.click(screen.getByText("Cancel"));

			await fastStateSync();

			// Should be back to email step
			expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
		});

		it("should proceed to password step when code is verified", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			// Simulate code verification
			fastUserActions.click(screen.getByText("Verify Mock Code"));

			await fastStateSync();

			// Should be on password step
			expect(screen.getByText("Set New Password")).toBeInTheDocument();
			expect(screen.getByText("Enter your new password for test@example.com")).toBeInTheDocument();
		});
	});

	describe("Step 3: Password Input", () => {
		beforeEach(async () => {
			vi.clearAllMocks();
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			// Navigate to password step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			fastUserActions.click(screen.getByText("Verify Mock Code"));

			await fastStateSync();
		});

		it("should render password input fields", () => {
			expect(screen.getByText("Set New Password")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
			expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
			expect(screen.getByText("Reset Password")).toBeInTheDocument();
			expect(screen.getByText("Back")).toBeInTheDocument();
		});

		it("should validate password matching", async () => {
			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const submitButton = screen.getByText("Reset Password");

			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "DifferentPassword123!");
			fastUserActions.click(submitButton);

			await fastStateSync();

			expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
			expect(AuthService.resetPassword).not.toHaveBeenCalled();
		});

		it("should reset password with matching passwords", async () => {
			(AuthService.resetPassword as any).mockResolvedValueOnce({
				message: "Password reset successfully"
			});

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const submitButton = screen.getByText("Reset Password");

			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(submitButton);

			await fastStateSync();

			expect(AuthService.resetPassword).toHaveBeenCalledWith("NewPassword123!", "mock-operation-token-123");

			// Should move to completion step
			expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
		});

		it("should handle password reset error", async () => {
			(AuthService.resetPassword as any).mockRejectedValueOnce(new Error("Invalid token"));

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const submitButton = screen.getByText("Reset Password");

			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(submitButton);

			await fastStateSync();

			expect(screen.getByText("Invalid token")).toBeInTheDocument();
		});

		it("should go back to verification step", async () => {
			fastUserActions.click(screen.getByText("Back"));

			await fastStateSync();

			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});

		it("should disable submit button when passwords are empty", () => {
			const submitButton = screen.getByText("Reset Password");
			expect(submitButton).toBeDisabled();
		});
	});

	describe("Step 4: Completion", () => {
		beforeEach(async () => {
			vi.clearAllMocks();
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});
			(AuthService.resetPassword as any).mockResolvedValueOnce({
				message: "Password reset successfully"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			// Navigate to completion step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			fastUserActions.click(screen.getByText("Verify Mock Code"));

			await fastStateSync();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(screen.getByText("Reset Password"));

			await fastStateSync();
		});

		it("should render completion message", () => {
			expect(screen.getByText("✓")).toBeInTheDocument();
			expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Your password has been reset successfully. You can now sign in with your new password."
				)
			).toBeInTheDocument();
			expect(screen.getByText("Continue to Sign In")).toBeInTheDocument();
		});

		it("should call onComplete when continue button is clicked", () => {
			fastUserActions.click(screen.getByText("Continue to Sign In"));

			expect(mockOnComplete).toHaveBeenCalled();
		});
	});

	describe("Component behavior", () => {
		it("should handle missing onComplete prop", () => {
			expect(() => {
				renderWithFullEnvironment(<ForgotPasswordFlow onCancel={mockOnCancel} />, {
					providers: { toast: true }
				});
			}).not.toThrow();
		});

		it("should handle missing onCancel prop", () => {
			expect(() => {
				renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} />, {
					providers: { toast: true }
				});
			}).not.toThrow();
		});

		it("should preserve email address across steps", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValueOnce({
				message: "Code sent"
			});

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "preserve@example.com");
			fastUserActions.click(screen.getByText("Send Reset Code"));

			await fastStateSync();

			fastUserActions.click(screen.getByText("Verify Mock Code"));

			await fastStateSync();

			// Email should be preserved in the password step message
			expect(screen.getByText("Enter your new password for preserve@example.com")).toBeInTheDocument();
		});
	});
});
