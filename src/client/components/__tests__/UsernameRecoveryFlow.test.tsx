import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment, fastStateSync, fastUserActions } from "../../__tests__/utils/testRenderUtils";
import { SecurityOperationType } from "../../types";

// Import the component - it now exists!
import { UsernameRecoveryFlow } from "../UsernameRecoveryFlow";

// Mock AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		validateEmail: vi.fn(),
		sendSecurityCode: vi.fn(),
		verifySecurityCode: vi.fn(),
		recoverUsername: vi.fn()
	}
}));

// Mock SecurityCodeFlow
vi.mock("../SecurityCodeFlow", () => ({
	default: ({ userEmail, operationType, onCodeVerified, onCancel, title, description }: any) => (
		<div data-testid="security-code-flow">
			<h3>{title}</h3>
			<p>{description}</p>
			<p>Operation: {operationType}</p>
			<p>Email: {userEmail}</p>
			<button onClick={() => onCodeVerified("mock-operation-token-username-recovery")}>Verify Mock Code</button>
			{onCancel && <button onClick={onCancel}>Cancel</button>}
		</div>
	)
}));

const { AuthService } = await import("../../services/AuthService");

describe("UsernameRecoveryFlow", () => {
	const mockOnComplete = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(AuthService.validateEmail as any).mockImplementation((email: string) =>
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
		);
	});

	describe("Component Existence", () => {
		it("should import UsernameRecoveryFlow component successfully", () => {
			// Component exists - tests can proceed
			expect(UsernameRecoveryFlow).toBeDefined();
		});
	});

	describe("Step 1: Email Input", () => {
		it("should render email input form initially", () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			expect(screen.getByText("Recover Your Username")).toBeInTheDocument();
			expect(
				screen.getByText("Enter your email address and we'll send your username to you.")
			).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
			expect(screen.getByText("Send Username")).toBeInTheDocument();
		});

		it("should validate email format", async () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			// Invalid email should show validation error
			fastUserActions.type(emailInput, "invalid-email");
			fastUserActions.click(sendButton);

			await fastStateSync();

			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).not.toHaveBeenCalled();
		});

		it("should proceed to verification step with valid email", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			// Valid email should proceed
			fastUserActions.type(emailInput, "user@example.com");
			fastUserActions.click(sendButton);

			await fastStateSync();

			// Should show SecurityCodeFlow
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"user@example.com",
				SecurityOperationType.USERNAME_RECOVERY
			);
		});

		it("should handle API errors during email submission", async () => {
			(AuthService.sendSecurityCode as any).mockRejectedValue(new Error("Network error"));

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			fastUserActions.type(emailInput, "user@example.com");
			fastUserActions.click(sendButton);

			await fastStateSync();

			// Should still proceed to verification for security (don't reveal if email exists)
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});

		it("should enable/disable send button based on email input", () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			// Button should be disabled initially
			expect(sendButton).toBeDisabled();

			// Button should be enabled with email input
			fastUserActions.type(emailInput, "user@example.com");
			expect(sendButton).not.toBeDisabled();

			// Button should be disabled when email is cleared
			fastUserActions.replaceText(emailInput, "");
			expect(sendButton).toBeDisabled();
		});

		it("should call onCancel when cancel button is clicked", () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const cancelButton = screen.getByText("Cancel");
			fastUserActions.click(cancelButton);

			expect(mockOnCancel).toHaveBeenCalled();
		});
	});

	describe("Step 2: Code Verification", () => {
		it("should render SecurityCodeFlow component with correct props", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			// Verify SecurityCodeFlow props
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
			expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
			expect(screen.getByText("Enter the code sent to your email to recover your username")).toBeInTheDocument();
			expect(screen.getByText("Operation: username_recovery")).toBeInTheDocument();
			expect(screen.getByText("Email: test@example.com")).toBeInTheDocument();
		});

		it("should handle successful code verification and recovery", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});
			(AuthService.recoverUsername as any).mockResolvedValue({ message: "Username sent" });

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			// Simulate code verification
			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);

			await fastStateSync();

			// Should proceed to completion step
			expect(screen.getByText("Username Sent")).toBeInTheDocument();
			expect(screen.getByText(/Your username has been sent to test@example.com/)).toBeInTheDocument();
			expect(AuthService.recoverUsername).toHaveBeenCalledWith("mock-operation-token-username-recovery");
		});

		it("should handle code verification errors", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});
			(AuthService.recoverUsername as any).mockRejectedValue(new Error("Recovery failed"));

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			// Simulate code verification failure
			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);

			await fastStateSync();

			// Should go back to email step and show error message
			expect(screen.getByText("Recover Your Username")).toBeInTheDocument();
			expect(screen.getByText("Recovery failed")).toBeInTheDocument();
		});

		it("should allow returning to email step from verification", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate to verification step
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "test@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			// Go back to email step
			const cancelButton = screen.getByText("Cancel");
			fastUserActions.click(cancelButton);

			await fastStateSync();

			// Should be back at email input step
			expect(screen.getByText("Recover Your Username")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
		});
	});

	describe("Step 3: Completion", () => {
		it("should render completion step after successful recovery", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});
			(AuthService.recoverUsername as any).mockResolvedValue({ message: "Username sent" });

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate through flow
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "success@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);

			await fastStateSync();

			// Verify completion UI
			expect(screen.getByText("✓")).toBeInTheDocument();
			expect(screen.getByText("Username Sent")).toBeInTheDocument();
			expect(screen.getByText(/Your username has been sent to success@example.com/)).toBeInTheDocument();
			expect(screen.getByText("Continue to Sign In")).toBeInTheDocument();
		});

		it("should call onComplete when continue button is clicked", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});
			(AuthService.recoverUsername as any).mockResolvedValue({ message: "Username sent" });

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			// Navigate through flow
			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "complete@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			const verifyButton = screen.getByText("Verify Mock Code");
			fastUserActions.click(verifyButton);

			await fastStateSync();

			// Click continue
			const continueButton = screen.getByText("Continue to Sign In");
			fastUserActions.click(continueButton);

			expect(mockOnComplete).toHaveBeenCalled();
		});
	});

	describe("Loading States", () => {
		it("should show loading state during email submission", async () => {
			let resolvePromise: () => void;
			const loadingPromise = new Promise<void>(resolve => {
				resolvePromise = resolve;
			});
			(AuthService.sendSecurityCode as any).mockReturnValue(loadingPromise);

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			fastUserActions.type(emailInput, "loading@example.com");
			fastUserActions.click(sendButton);

			await fastStateSync();

			// Should show loading state
			expect(sendButton).toBeDisabled();

			// Resolve loading
			resolvePromise!();
			await fastStateSync();

			// Should proceed to verification
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should clear errors when user retries", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			// Trigger validation error
			fastUserActions.type(emailInput, "invalid-email");
			fastUserActions.click(sendButton);

			await fastStateSync();

			expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();

			// Fix email should clear error
			fastUserActions.replaceText(emailInput, "valid@example.com");
			fastUserActions.click(sendButton);

			await fastStateSync();

			// Error should be cleared
			expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper form labels and autocomplete", () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			expect(emailInput).toHaveAttribute("type", "email");
			expect(emailInput).toHaveAttribute("autoComplete", "email");
		});

		it("should have proper heading hierarchy", () => {
			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const heading = screen.getByText("Recover Your Username");
			expect(heading.tagName).toBe("H3");
		});
	});

	describe("Security Requirements", () => {
		it("should not reveal whether email exists in error messages", async () => {
			(AuthService.sendSecurityCode as any).mockRejectedValue(new Error("User not found"));

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			const sendButton = screen.getByText("Send Username");

			fastUserActions.type(emailInput, "nonexistent@example.com");
			fastUserActions.click(sendButton);

			await fastStateSync();

			// Should proceed to verification regardless of error (don't reveal email existence)
			expect(screen.getByTestId("security-code-flow")).toBeInTheDocument();
		});

		it("should use USERNAME_RECOVERY operation type", async () => {
			(AuthService.sendSecurityCode as any).mockResolvedValue({});

			renderWithFullEnvironment(<UsernameRecoveryFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

			const emailInput = screen.getByPlaceholderText("Email Address");
			fastUserActions.type(emailInput, "security@example.com");
			fastUserActions.click(screen.getByText("Send Username"));

			await fastStateSync();

			expect(AuthService.sendSecurityCode).toHaveBeenCalledWith(
				"security@example.com",
				SecurityOperationType.USERNAME_RECOVERY
			);
		});
	});
});
