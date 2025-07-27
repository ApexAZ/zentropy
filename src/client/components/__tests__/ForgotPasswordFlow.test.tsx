import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment, fastStateSync, fastUserActions } from "../../__tests__/utils/testRenderUtils";
import { ForgotPasswordFlow } from "../ForgotPasswordFlow";

// Mock AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		validateEmail: vi.fn(),
		sendEmailVerification: vi.fn(),
		verifyCode: vi.fn(),
		resetPasswordWithUserId: vi.fn()
	}
}));

// Mock EmailVerificationModal
vi.mock("../EmailVerificationModal", () => ({
	default: ({ onSuccess, onClose, title, description, operationType }: any) => (
		<div data-testid="email-verification-modal">
			<h3>{title}</h3>
			<p>{description}</p>
			<p data-testid="operation-type">Operation: {operationType}</p>
			<button onClick={() => onSuccess("mock-user-id-123")}>Verify Mock Code</button>
			<button onClick={onClose}>Cancel</button>
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
		it("renders email input form initially", () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
			expect(screen.getByText(/Enter your email address and we'll send you a code/)).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
			expect(screen.getByText("Send Reset Code")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("validates email format before submission", async () => {
			(AuthService.validateEmail as any).mockReturnValue(false);

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			// Enter invalid email
			fastUserActions.type(emailInput, "invalid-email");
			fastUserActions.click(submitButton);
			await fastStateSync();

			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
			expect(AuthService.sendEmailVerification).not.toHaveBeenCalled();
		});

		it("calls AuthService.sendEmailVerification with email", async () => {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			// Enter valid email
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			expect(AuthService.sendEmailVerification).toHaveBeenCalledWith("test@example.com");
		});

		it("proceeds to verification step after successful email send", async () => {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			// Enter valid email and submit
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			// Should show EmailVerificationModal
			expect(screen.getByTestId("email-verification-modal")).toBeInTheDocument();
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();
			expect(screen.getByText("Enter the reset code sent to your email address")).toBeInTheDocument();
			expect(screen.getByTestId("operation-type")).toHaveTextContent("Operation: password_reset");
		});

		it("proceeds to verification even on email send error (security)", async () => {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockRejectedValue(new Error("Email not found"));

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");

			// Enter valid email and submit
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			// Should still proceed to verification step to prevent email enumeration
			expect(screen.getByTestId("email-verification-modal")).toBeInTheDocument();
		});

		it("calls onCancel when cancel button is clicked", async () => {
			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const cancelButton = screen.getByText("Cancel");
			fastUserActions.click(cancelButton);
			await fastStateSync();

			expect(mockOnCancel).toHaveBeenCalled();
		});
	});

	describe("Step 2: Code Verification", () => {
		it("closes verification modal and calls onCancel to close entire modal stack (prevents dimmed overlay issue)", async () => {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Go to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			// Verify verification modal is shown
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();

			// Close verification modal
			const cancelButton = screen.getByText("Cancel");
			fastUserActions.click(cancelButton);
			await fastStateSync();

			// Should call onCancel to close entire modal stack and prevent dimmed overlay issues
			expect(mockOnCancel).toHaveBeenCalled();
			// Modal should close (no more modal content visible)
			expect(screen.queryByText("Check Your Email")).not.toBeInTheDocument();
		});

		it("proceeds to password step when verification succeeds", async () => {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Go to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			// Verify code
			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);
			await fastStateSync();

			// Should show password input step
			expect(screen.getByText("Set New Password")).toBeInTheDocument();
			expect(screen.getByText("Enter your new password for test@example.com")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Confirm New Password")).toBeInTheDocument();
		});
	});

	describe("Step 3: Password Input", () => {
		async function goToPasswordStep() {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Go through email and verification steps
			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);
			await fastStateSync();
		}

		it("validates password confirmation", async () => {
			await goToPasswordStep();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const resetButton = screen.getByText("Reset Password");

			// Enter mismatched passwords
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "DifferentPassword123!");
			fastUserActions.click(resetButton);
			await fastStateSync();

			expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
			expect(AuthService.resetPasswordWithUserId).not.toHaveBeenCalled();
		});

		it("calls AuthService.resetPasswordWithUserId with correct parameters", async () => {
			(AuthService.resetPasswordWithUserId as any).mockResolvedValue({ message: "Password reset successfully" });

			await goToPasswordStep();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const resetButton = screen.getByText("Reset Password");

			// Enter matching passwords
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(resetButton);
			await fastStateSync();

			expect(AuthService.resetPasswordWithUserId).toHaveBeenCalledWith("NewPassword123!", "mock-user-id-123");
		});

		it("shows error message on password reset failure", async () => {
			(AuthService.resetPasswordWithUserId as any).mockRejectedValue(new Error("Reset failed"));

			await goToPasswordStep();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const resetButton = screen.getByText("Reset Password");

			// Enter matching passwords
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(resetButton);
			await fastStateSync();

			expect(screen.getByText("Reset failed")).toBeInTheDocument();
		});

		it("proceeds to completion step on successful password reset", async () => {
			(AuthService.resetPasswordWithUserId as any).mockResolvedValue({ message: "Password reset successfully" });

			await goToPasswordStep();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const resetButton = screen.getByText("Reset Password");

			// Enter matching passwords and submit
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(resetButton);
			await fastStateSync();

			// Should show completion step with auto-redirect message
			expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
			expect(screen.getByText(/Redirecting to sign in/)).toBeInTheDocument();
		});

		it("returns to verification step when back button is clicked", async () => {
			await goToPasswordStep();

			const backButton = screen.getByText("Back");
			fastUserActions.click(backButton);
			await fastStateSync();

			// Should return to verification step
			expect(screen.getByTestId("email-verification-modal")).toBeInTheDocument();
		});

		it("shows password requirements component", async () => {
			await goToPasswordStep();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			fastUserActions.type(newPasswordInput, "TestPassword");

			expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
			expect(screen.getByText("Requirements for: TestPassword")).toBeInTheDocument();
		});
	});

	describe("Step 4: Completion", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		async function goToCompletionStep() {
			(AuthService.validateEmail as any).mockReturnValue(true);
			(AuthService.sendEmailVerification as any).mockResolvedValue({ message: "Email sent" });
			(AuthService.resetPasswordWithUserId as any).mockResolvedValue({ message: "Password reset successfully" });

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Go through all steps
			const emailInput = screen.getByPlaceholderText("Email Address");
			const submitButton = screen.getByText("Send Reset Code");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(submitButton);
			await fastStateSync();

			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);
			await fastStateSync();

			const newPasswordInput = screen.getByPlaceholderText("New Password");
			const confirmPasswordInput = screen.getByPlaceholderText("Confirm New Password");
			const resetButton = screen.getByText("Reset Password");
			fastUserActions.type(newPasswordInput, "NewPassword123!");
			fastUserActions.type(confirmPasswordInput, "NewPassword123!");
			fastUserActions.click(resetButton);
			await fastStateSync();
		}

		it("calls onComplete automatically after password reset", async () => {
			vi.useFakeTimers();

			await goToCompletionStep();

			// Fast-forward through the 2-second timeout
			vi.advanceTimersByTime(2000);
			await fastStateSync();

			expect(mockOnComplete).toHaveBeenCalled();
		});

		it("shows success message and checkmark", async () => {
			await goToCompletionStep();

			expect(screen.getByText("✓")).toBeInTheDocument();
			expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
			expect(screen.getByText(/Your password has been reset successfully/)).toBeInTheDocument();
		});
	});
});
