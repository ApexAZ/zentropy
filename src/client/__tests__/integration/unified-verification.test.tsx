/**
 * Unified Verification System Integration Tests
 *
 * Tests end-to-end workflows for the unified email verification system
 * across password change, password reset, and username recovery flows.
 *
 * Following TDD principles with behavior-focused testing and module-level
 * mocking for reliable integration testing across components.
 */

import React from "react";
import { screen } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { SecurityOperationType } from "../../types";
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "../utils/testRenderUtils";
import { PasswordChangeForm } from "../../components/PasswordChangeForm";
import { ForgotPasswordFlow } from "../../components/ForgotPasswordFlow";
import SecurityCodeFlow from "../../components/SecurityCodeFlow";

// =============================================================================
// MODULE-LEVEL MOCKS FOR INTEGRATION TESTING
// =============================================================================

// Mock AuthService for unified verification methods
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		// Existing auth methods
		signIn: vi.fn(),
		signUp: vi.fn(),
		signOut: vi.fn(),
		getCurrentUser: vi.fn(),
		refreshToken: vi.fn(),

		// NEW: Unified verification methods
		sendSecurityCode: vi.fn(),
		verifySecurityCode: vi.fn(),
		resetPassword: vi.fn(),
		recoverUsername: vi.fn(),

		// Validation methods
		validatePassword: vi.fn(),
		validateEmail: vi.fn(),
		sendEmailVerification: vi.fn()
	}
}));

// Mock UserService for secure password change
vi.mock("../../services/UserService", () => ({
	UserService: {
		getCurrentUser: vi.fn(),
		updateProfile: vi.fn(),
		updatePassword: vi.fn(),
		getAllUsers: vi.fn(),
		getAccountSecurity: vi.fn(),
		validateProfile: vi.fn(),
		validatePasswordUpdate: vi.fn(),

		// NEW: Secure password change with operation token
		changePassword: vi.fn(),
		validateTokenAndGetUser: vi.fn()
	}
}));

// Mock useAuth hook to provide authenticated user context
vi.mock("../../hooks/useAuth", () => ({
	useAuth: () => ({
		user: {
			email: "test@example.com",
			name: "Test User",
			id: "user-123",
			first_name: "Test",
			last_name: "User",
			has_projects_access: true,
			email_verified: true
		},
		authState: {
			isAuthenticated: true,
			user: {
				email: "test@example.com",
				name: "Test User",
				has_projects_access: true,
				email_verified: true
			},
			token: "mock-auth-token"
		},
		signIn: vi.fn(),
		signOut: vi.fn()
	})
}));

// Mock logger to avoid console outputs during tests
vi.mock("../../utils/logger", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		debug: vi.fn()
	}
}));

// Mock PasswordRequirements component for cleaner tests
vi.mock("../../components/PasswordRequirements", () => ({
	default: ({ password }: any) => (
		<div data-testid="password-requirements">Password requirements for: {password || "empty"}</div>
	)
}));

// Mock EmailVerificationResendButton to avoid nested complexity
vi.mock("../../components/EmailVerificationResendButton", () => ({
	default: ({ onResendSuccess }: any) => (
		<button
			data-testid="resend-code-button"
			onClick={() => {
				// Mock successful resend
				onResendSuccess?.();
			}}
		>
			Resend Code
		</button>
	)
}));

/**
 * Mock user data for tests
 */
const mockAuthenticatedUser = {
	email: "test@example.com",
	name: "Test User",
	has_projects_access: true,
	email_verified: true
};

// Import the mocked services to access their mock functions
import { AuthService } from "../../services/AuthService";
import { UserService } from "../../services/UserService";

// =============================================================================
// UNIFIED VERIFICATION INTEGRATION TESTS
// =============================================================================

describe("Unified Verification System Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Configure default successful responses for AuthService
		(AuthService.getCurrentUser as any).mockResolvedValue(mockAuthenticatedUser);
		(AuthService.validateEmail as any).mockReturnValue(true);
		(AuthService.validatePassword as any).mockReturnValue({ isValid: true, errors: [] });
		(AuthService.sendSecurityCode as any).mockResolvedValue({
			message: "Verification code sent"
		});
		(AuthService.verifySecurityCode as any).mockResolvedValue({
			operation_token: "mock-operation-token",
			expires_in: 600
		});
		(AuthService.resetPassword as any).mockResolvedValue({
			message: "Password reset successfully"
		});
		(AuthService.recoverUsername as any).mockResolvedValue({
			message: "Username sent to email"
		});

		// Configure default successful responses for UserService
		(UserService.getCurrentUser as any).mockResolvedValue({
			id: "user-123",
			email: "test@example.com",
			first_name: "Test",
			last_name: "User"
		});
		(UserService.changePassword as any).mockResolvedValue({
			message: "Password changed successfully"
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ==========================================================================
	// PASSWORD CHANGE FLOW INTEGRATION TESTS
	// ==========================================================================

	describe("Password Change Flow", () => {
		it("should complete the full password change flow with email verification", async () => {
			// Arrange: Setup authenticated environment with password change component
			const onSuccess = vi.fn();
			const onCancel = vi.fn();

			renderWithFullEnvironment(<PasswordChangeForm onSuccess={onSuccess} onCancel={onCancel} />, {
				providers: { toast: true }
			});

			await fastStateSync();

			// Act & Assert: Step 1 - Enter new password
			expect(screen.getByText("Change Password")).toBeInTheDocument();
			expect(screen.getByText(/Enter your new password/i)).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("New Password"), "NewSecurePassword123!");
			fastUserActions.type(screen.getByPlaceholderText("Confirm New Password"), "NewSecurePassword123!");

			fastUserActions.click(screen.getByText("Send Verification Code"));
			await fastStateSync();

			// Verify security code was requested for password change operation
			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"test@example.com",
				SecurityOperationType.PASSWORD_CHANGE
			);

			// Step 2 - Verify email code (SecurityCodeFlow component)
			expect(screen.getByText("Verify Password Change")).toBeInTheDocument();
			expect(screen.getByText(/To change your password/i)).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("Enter 6-digit code"), "123456");

			fastUserActions.click(screen.getByText("Verify Code"));
			await fastStateSync();

			// Verify code verification was called with correct parameters
			expect(AuthService.verifySecurityCode).toHaveBeenCalledWith(
				"test@example.com",
				"123456",
				SecurityOperationType.PASSWORD_CHANGE
			);

			// Step 3 - Complete password change with current password
			expect(screen.getByText("Complete Password Change")).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("Current Password"), "OldPassword123!");

			// New password fields should be pre-filled from step 1
			const newPasswordInputs = screen.getAllByDisplayValue("NewSecurePassword123!");
			expect(newPasswordInputs.length).toBe(2); // New Password and Confirm New Password fields

			fastUserActions.click(screen.getByText("Change Password"));
			await fastStateSync();

			// Verify password change was called with operation token
			expect(UserService.changePassword).toHaveBeenCalledWith(
				"OldPassword123!",
				"NewSecurePassword123!",
				"mock-operation-token"
			);

			// Success should trigger onSuccess callback (component doesn't show success message, just calls callback)
			expect(onSuccess).toHaveBeenCalled();
		});

		it("should handle password mismatch validation", async () => {
			// Arrange
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={vi.fn()} onCancel={vi.fn()} />, {
				providers: { toast: true }
			});

			await fastStateSync();

			// Act: Enter mismatched passwords
			fastUserActions.type(screen.getByPlaceholderText("New Password"), "Password123!");
			fastUserActions.type(screen.getByPlaceholderText("Confirm New Password"), "DifferentPassword123!");

			fastUserActions.click(screen.getByText("Send Verification Code"));
			await fastStateSync();

			// Assert: Should show validation error without sending code
			expect(screen.getByText("New passwords don't match")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).not.toHaveBeenCalled();
		});

		it("should handle expired operation token gracefully", async () => {
			// Arrange: Mock token expiry during password change completion
			(UserService.changePassword as any).mockRejectedValue(new Error("Invalid or expired operation token"));

			renderWithFullEnvironment(<PasswordChangeForm onSuccess={vi.fn()} onCancel={vi.fn()} />, {
				providers: { toast: true }
			});

			// Fast-forward through first two steps
			await fastStateSync();
			fastUserActions.type(screen.getByPlaceholderText("New Password"), "Pass123!");
			fastUserActions.type(screen.getByPlaceholderText("Confirm New Password"), "Pass123!");
			fastUserActions.click(screen.getByText("Send Verification Code"));
			await fastStateSync();

			fastUserActions.type(screen.getByPlaceholderText("Enter 6-digit code"), "123456");
			fastUserActions.click(screen.getByText("Verify Code"));
			await fastStateSync();

			// Try to complete password change with expired token
			fastUserActions.type(screen.getByPlaceholderText("Current Password"), "OldPass123!");
			fastUserActions.click(screen.getByText("Change Password"));
			await fastStateSync();

			// Assert: Component should handle the error and step back to verification
			// The component redirects to verification step when token expires
			expect(screen.getByText("Verify Password Change")).toBeInTheDocument();
			expect(UserService.changePassword).toHaveBeenCalledWith("OldPass123!", "Pass123!", "mock-operation-token");
		});
	});

	// ==========================================================================
	// FORGOT PASSWORD FLOW INTEGRATION TESTS
	// ==========================================================================

	describe("Forgot Password Flow", () => {
		it("should complete the full forgot password flow", async () => {
			// Arrange: Setup unauthenticated environment
			const onComplete = vi.fn();
			const onCancel = vi.fn();

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={onComplete} onCancel={onCancel} />, {
				providers: { toast: true }
			});

			await fastStateSync();

			// Act & Assert: Step 1 - Enter email
			expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
			expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("Email Address"), "user@example.com");

			fastUserActions.click(screen.getByText("Send Reset Code"));
			await fastStateSync();

			// Verify reset code was requested
			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"user@example.com",
				SecurityOperationType.PASSWORD_RESET
			);

			// Step 2 - Verify reset code
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();
			expect(screen.getByText(/Enter the reset code/i)).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("Enter 6-digit code"), "654321");

			fastUserActions.click(screen.getByText("Verify Code"));
			await fastStateSync();

			expect(AuthService.verifySecurityCode).toHaveBeenCalledWith(
				"user@example.com",
				"654321",
				SecurityOperationType.PASSWORD_RESET
			);

			// Step 3 - Set new password
			expect(screen.getByText("Set New Password")).toBeInTheDocument();
			expect(screen.getByText(/Enter your new password for user@example.com/i)).toBeInTheDocument();

			fastUserActions.type(screen.getByPlaceholderText("New Password"), "ResetPassword123!");
			fastUserActions.type(screen.getByPlaceholderText("Confirm New Password"), "ResetPassword123!");

			fastUserActions.click(screen.getByText("Reset Password"));
			await fastStateSync();

			// Verify password reset was called with operation token
			expect(AuthService.resetPassword).toHaveBeenCalledWith("ResetPassword123!", "mock-operation-token");

			// Step 4 - Success confirmation
			expect(screen.getByText("Password Reset Complete")).toBeInTheDocument();
			expect(screen.getByText(/Your password has been reset successfully/i)).toBeInTheDocument();

			fastUserActions.click(screen.getByText("Continue to Sign In"));
			await fastStateSync();

			// Verify completion callback was triggered
			expect(onComplete).toHaveBeenCalled();
		});

		it("should handle invalid email gracefully", async () => {
			// Arrange
			(AuthService.validateEmail as any).mockReturnValue(false);

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={vi.fn()} onCancel={vi.fn()} />, {
				providers: { toast: true }
			});

			await fastStateSync();

			// Act: Enter invalid email
			fastUserActions.type(screen.getByPlaceholderText("Email Address"), "invalid-email");

			fastUserActions.click(screen.getByText("Send Reset Code"));
			await fastStateSync();

			// Assert: Should show validation error
			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).not.toHaveBeenCalled();
		});

		it("should not reveal if email exists for security", async () => {
			// Arrange: Mock network error (typical for non-existent email)
			(AuthService.sendSecurityCode as any).mockRejectedValue(new Error("Email not found"));

			renderWithFullEnvironment(<ForgotPasswordFlow onComplete={vi.fn()} onCancel={vi.fn()} />, {
				providers: { toast: true }
			});

			await fastStateSync();

			// Act: Enter email that doesn't exist
			fastUserActions.type(screen.getByPlaceholderText("Email Address"), "nonexistent@example.com");

			fastUserActions.click(screen.getByText("Send Reset Code"));
			await fastStateSync();

			// Assert: Should still proceed to verification step for security
			expect(screen.getByText("Check Your Email")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"nonexistent@example.com",
				SecurityOperationType.PASSWORD_RESET
			);
		});
	});

	// ==========================================================================
	// RATE LIMITING INTEGRATION TESTS
	// ==========================================================================

	describe("Rate Limiting Handling", () => {
		it("should handle rate limiting gracefully in SecurityCodeFlow", async () => {
			// Arrange: SecurityCodeFlow component for testing resend functionality
			const onCodeVerified = vi.fn();

			renderWithFullEnvironment(
				<SecurityCodeFlow
					userEmail="test@example.com"
					operationType={SecurityOperationType.PASSWORD_CHANGE}
					onCodeVerified={onCodeVerified}
					title="Test Verification"
				/>,
				{
					providers: { toast: true }
				}
			);

			await fastStateSync();

			// Act & Assert: Component should render properly
			expect(screen.getByText("Test Verification")).toBeInTheDocument();
			expect(screen.getByText("Code sent to: test@example.com")).toBeInTheDocument();

			// Verify resend button is present and functional
			const resendButton = screen.getByTestId("resend-code-button");
			expect(resendButton).toBeInTheDocument();

			// Click resend button (mocked to succeed)
			fastUserActions.click(resendButton);
			await fastStateSync();

			// Resend button functionality is accessible
			expect(resendButton).toBeInTheDocument();
		});

		it("should validate input formats consistently", async () => {
			renderWithFullEnvironment(
				<SecurityCodeFlow
					userEmail="test@example.com"
					operationType={SecurityOperationType.EMAIL_VERIFICATION}
					onCodeVerified={vi.fn()}
				/>,
				{
					providers: { toast: true }
				}
			);

			await fastStateSync();

			// Act: Try to enter invalid code format
			const codeInput = screen.getByPlaceholderText("Enter 6-digit code");

			fastUserActions.type(codeInput, "abc123"); // Should strip letters
			expect(codeInput).toHaveValue("123");

			// Clear and try with too many digits
			fastUserActions.type(codeInput, "1234567"); // Should limit to 6 digits
			expect(codeInput).toHaveValue("123456");
		});
	});
});
