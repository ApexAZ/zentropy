import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import PasswordChangeForm from "../PasswordChangeForm";
import { SecurityOperationType } from "../../types";

// Mock AuthService for security code operations
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		sendSecurityCode: vi.fn(),
		verifySecurityCode: vi.fn()
	}
}));

// Mock UserService for password change operations
vi.mock("../../services/UserService", () => ({
	UserService: {
		changePassword: vi.fn()
	}
}));

// Mock SecurityCodeFlow component since it's already tested
vi.mock("../SecurityCodeFlow", () => ({
	default: ({ userEmail, operationType, onCodeVerified, onCancel, title, description }: any) => (
		<div data-testid="security-code-flow">
			<h3>{title}</h3>
			<p>{description}</p>
			<p>Email: {userEmail}</p>
			<p>Operation: {operationType}</p>
			<button data-testid="verify-code-button" onClick={() => onCodeVerified("mock-operation-token")}>
				Verify Code
			</button>
			<button data-testid="cancel-verification-button" onClick={onCancel}>
				Cancel
			</button>
		</div>
	)
}));

// Mock PasswordRequirements component
vi.mock("../PasswordRequirements", () => ({
	default: ({ password }: any) => <div data-testid="password-requirements">Password requirements for: {password}</div>
}));

// Mock useAuth hook
vi.mock("../../hooks/useAuth", () => ({
	useAuth: () => ({
		user: {
			email: "test@example.com",
			id: "user-123",
			first_name: "Test",
			last_name: "User"
		}
	})
}));

// Mock logger to avoid console outputs in tests
vi.mock("../../utils/logger", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn()
	}
}));

import { AuthService } from "../../services/AuthService";
import { UserService } from "../../services/UserService";

describe("PasswordChangeForm", () => {
	const mockProps = {
		onSuccess: vi.fn(),
		onCancel: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Set up default successful mock responses
		(AuthService.sendSecurityCode as any).mockResolvedValue({ message: "Code sent successfully" });
		(AuthService.verifySecurityCode as any).mockResolvedValue({
			operation_token: "mock-operation-token",
			expires_in: 600
		});
		(UserService.changePassword as any).mockResolvedValue({ message: "Password changed successfully" });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Step 1: Password Input Form", () => {
		it("should render initial password input form", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			expect(screen.getByText("Change Password")).toBeInTheDocument();
			expect(
				screen.getByText(
					"Enter your new password. You'll need to verify your email address to complete the change."
				)
			).toBeInTheDocument();
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
			expect(screen.getByText("Send Verification Code")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("should validate password confirmation match", async () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			// Enter mismatched passwords
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("New passwords don't match")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).not.toHaveBeenCalled();
		});

		it("should proceed to verification when passwords match", async () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			// Enter matching passwords
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Should call security code service
			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"test@example.com",
				SecurityOperationType.PASSWORD_CHANGE
			);

			// Should show verification step
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.getByText("Verify Password Change")).toBeInTheDocument();
		});

		it("should handle send code error gracefully", async () => {
			(AuthService.sendSecurityCode as any).mockRejectedValue(new Error("Rate limit exceeded"));

			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
			expect(screen.queryByTestId("security-code-flow")).not.toBeInTheDocument();
		});

		it("should disable submit button when passwords are empty", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const submitButton = screen.getByText("Send Verification Code");
			expect(submitButton).toBeDisabled();
		});

		it("should show loading state during code sending", async () => {
			// Make the promise not resolve immediately
			let resolvePromise: (value: any) => void;
			const pendingPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			(AuthService.sendSecurityCode as any).mockReturnValue(pendingPromise);

			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			await act(async () => {
				fireEvent.click(submitButton);
				await Promise.resolve();
			});

			// Should show loading state
			expect(submitButton).toBeDisabled();

			// Resolve the promise and wait for state updates
			await act(async () => {
				resolvePromise!({ message: "Code sent" });
				await Promise.resolve();
			});
		});
	});

	describe("Step 2: Email Verification", () => {
		const setupVerificationStep = async () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			return screen.getByTestId("security-code-flow");
		};

		it("should render SecurityCodeFlow with correct props", async () => {
			const securityCodeFlow = await setupVerificationStep();

			expect(securityCodeFlow).toBeInTheDocument();
			expect(screen.getByText("Verify Password Change")).toBeInTheDocument();
			expect(screen.getByText("To change your password, please verify your email address")).toBeInTheDocument();
			expect(screen.getByText("Email: test@example.com")).toBeInTheDocument();
			expect(screen.getByText("Operation: password_change")).toBeInTheDocument();
		});

		it("should proceed to final step when code is verified", async () => {
			await setupVerificationStep();

			const verifyButton = screen.getByTestId("verify-code-button");
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Should show final password entry step
			expect(screen.getByText("Complete Password Change")).toBeInTheDocument();
			expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
		});

		it("should return to password step when verification is cancelled", async () => {
			await setupVerificationStep();

			const cancelButton = screen.getByTestId("cancel-verification-button");
			fireEvent.click(cancelButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Should return to initial step
			expect(screen.getByText("Change Password")).toBeInTheDocument();
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.queryByTestId("security-code-flow")).not.toBeInTheDocument();
		});
	});

	describe("Step 3: Final Password Change", () => {
		const setupFinalStep = async () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			// Complete first step
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Complete verification step
			const verifyButton = screen.getByTestId("verify-code-button");
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			return {
				currentPasswordInput: screen.getByLabelText("Current Password"),
				newPasswordInput: screen.getByLabelText("New Password"),
				confirmPasswordInput: screen.getByLabelText("Confirm New Password"),
				changeButton: screen.getByText("Change Password")
			};
		};

		it("should render final password change form", async () => {
			await setupFinalStep();

			expect(screen.getByText("Complete Password Change")).toBeInTheDocument();
			expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
			expect(screen.getByText("Change Password")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
		});

		it("should successfully change password with valid inputs", async () => {
			const { currentPasswordInput, newPasswordInput, confirmPasswordInput, changeButton } =
				await setupFinalStep();

			// Fill in all password fields
			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(changeButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Should call UserService with correct parameters
			expect(UserService.changePassword).toHaveBeenCalledWith(
				"CurrentPassword123!",
				"NewPassword123!",
				"mock-operation-token"
			);

			// Should call success callback
			expect(mockProps.onSuccess).toHaveBeenCalled();
		});

		it("should handle password change error", async () => {
			(UserService.changePassword as any).mockRejectedValue(new Error("Current password is incorrect"));

			const { currentPasswordInput, newPasswordInput, confirmPasswordInput, changeButton } =
				await setupFinalStep();

			fireEvent.change(currentPasswordInput, { target: { value: "WrongPassword!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(changeButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Current password is incorrect")).toBeInTheDocument();
			expect(mockProps.onSuccess).not.toHaveBeenCalled();
		});

		it("should return to verification step if token expired", async () => {
			(UserService.changePassword as any).mockRejectedValue(new Error("Operation token has expired"));

			const { currentPasswordInput, newPasswordInput, confirmPasswordInput, changeButton } =
				await setupFinalStep();

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(changeButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Should return to verification step
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.queryByText("Complete Password Change")).not.toBeInTheDocument();
		});

		it("should disable submit button when fields are incomplete", async () => {
			const { changeButton } = await setupFinalStep();

			// Button should be disabled initially (no values entered)
			expect(changeButton).toBeDisabled();
		});

		it("should show loading state during password change", async () => {
			// Make the promise not resolve immediately
			let resolvePromise: (value: any) => void;
			const pendingPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			(UserService.changePassword as any).mockReturnValue(pendingPromise);

			const { currentPasswordInput, newPasswordInput, confirmPasswordInput, changeButton } =
				await setupFinalStep();

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			await act(async () => {
				fireEvent.click(changeButton);
				await Promise.resolve();
			});

			// Should show loading state
			expect(changeButton).toBeDisabled();

			// Resolve the promise and wait for state updates
			await act(async () => {
				resolvePromise!({ message: "Password changed" });
				await Promise.resolve();
			});
		});
	});

	describe("Cancel Functionality", () => {
		it("should call onCancel when cancel is clicked in initial step", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const cancelButton = screen.getByText("Cancel");
			fireEvent.click(cancelButton);

			expect(mockProps.onCancel).toHaveBeenCalled();
		});

		it("should call onCancel when cancel is clicked in final step", async () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			// Navigate to final step
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			const verifyButton = screen.getByTestId("verify-code-button");
			fireEvent.click(verifyButton);

			await act(async () => {
				await Promise.resolve();
			});

			// Click cancel in final step
			const cancelButton = screen.getByText("Cancel");
			fireEvent.click(cancelButton);

			expect(mockProps.onCancel).toHaveBeenCalled();
		});
	});

	describe("Password Requirements Integration", () => {
		it("should show password requirements component", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			fireEvent.change(newPasswordInput, { target: { value: "TestPassword" } });

			expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
			expect(screen.getByText("Password requirements for: TestPassword")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should clear errors when moving between steps", async () => {
			(AuthService.sendSecurityCode as any).mockRejectedValue(new Error("Network error"));

			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			// Trigger error in first step
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByText("Send Verification Code");

			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.getByText("Network error")).toBeInTheDocument();

			// Reset mock to success
			(AuthService.sendSecurityCode as any).mockResolvedValue({ message: "Code sent successfully" });

			// Try again - error should clear
			fireEvent.click(submitButton);

			await act(async () => {
				await Promise.resolve();
			});

			expect(screen.queryByText("Network error")).not.toBeInTheDocument();
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});
	});

	describe("Component Props", () => {
		it("should work without optional props", () => {
			renderWithFullEnvironment(<PasswordChangeForm />, {
				providers: { toast: true }
			});

			expect(screen.getByText("Change Password")).toBeInTheDocument();

			// Should not crash when callbacks are called
			const cancelButton = screen.getByText("Cancel");
			fireEvent.click(cancelButton);
			// No assertion needed - just ensuring no crash
		});
	});

	describe("Accessibility", () => {
		it("should have proper form labels and structure", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			// Check for proper labels
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();

			// Check for proper heading structure
			expect(screen.getByRole("heading", { name: /change password/i })).toBeInTheDocument();
		});

		it("should have proper autocomplete attributes", () => {
			renderWithFullEnvironment(<PasswordChangeForm {...mockProps} />, {
				providers: { toast: true }
			});

			const newPasswordInput = screen.getByLabelText("New Password");
			expect(newPasswordInput).toHaveAttribute("autoComplete", "new-password");

			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			expect(confirmPasswordInput).toHaveAttribute("autoComplete", "new-password");
		});
	});
});
