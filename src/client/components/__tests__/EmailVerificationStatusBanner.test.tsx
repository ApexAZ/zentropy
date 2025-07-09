import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import EmailVerificationStatusBanner from "../EmailVerificationStatusBanner";
import { AuthService } from "../../services/AuthService";

// Mock AuthService instead of global fetch
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		sendEmailVerification: vi.fn()
	}
}));

describe("EmailVerificationStatusBanner", () => {
	const defaultProps = {
		userEmail: "user@example.com",
		isVisible: true
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockAuthService = vi.mocked(AuthService);

	afterEach(() => {
		vi.restoreAllMocks();
		cleanup(); // Ensure DOM is cleaned up after each test
	});

	describe("Banner Display", () => {
		it("should render email verification message when visible", () => {
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			expect(screen.getByText("Email verification required.")).toBeInTheDocument();
			expect(screen.getByText(/please check your email and click the verification link/i)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument();
		});

		it("should not render when isVisible is false", () => {
			render(<EmailVerificationStatusBanner {...defaultProps} isVisible={false} />);

			expect(screen.queryByText("Email verification required.")).not.toBeInTheDocument();
		});

		it("should not render when dismissed", async () => {
			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			// First verify the banner is visible
			expect(screen.getByText("Email verification required.")).toBeInTheDocument();

			// Find and click the dismiss button with exact name match
			const dismissButton = screen.getByRole("button", { name: "Dismiss" });
			await user.click(dismissButton);

			// Wait for the component to be removed
			await waitFor(() => {
				expect(screen.queryByText("Email verification required.")).not.toBeInTheDocument();
			});
		});
	});

	describe("Resend Functionality", () => {
		it("should call resend verification API when resend button is clicked", async () => {
			mockAuthService.sendEmailVerification.mockResolvedValue({
				message: "Verification email sent! Please check your inbox."
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			expect(mockAuthService.sendEmailVerification).toHaveBeenCalledWith("user@example.com");
		});

		it("should show success message after successful resend", async () => {
			mockAuthService.sendEmailVerification.mockResolvedValue({
				message: "Verification email sent! Please check your inbox."
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Verification email sent! Please check your inbox.")).toBeInTheDocument();
			});
		});

		it("should show error message when resend fails", async () => {
			mockAuthService.sendEmailVerification.mockRejectedValue(new Error("Failed to send verification email"));

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Failed to send verification email")).toBeInTheDocument();
			});
		});

		it("should show loading state while resending", async () => {
			mockAuthService.sendEmailVerification.mockImplementation(() => new Promise(() => {})); // Never resolves

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			expect(screen.getByRole("button", { name: /sending.../i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /sending.../i })).toBeDisabled();
		});

		it("should handle network errors gracefully", async () => {
			mockAuthService.sendEmailVerification.mockRejectedValue(new Error("Network error"));

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Network error")).toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels and roles", () => {
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const dismissButton = screen.getByRole("button", { name: /dismiss/i });
			expect(dismissButton).toHaveAccessibleName("Dismiss");

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			expect(resendButton).toHaveAccessibleName();
		});

		it("should use appropriate semantic colors for messages", async () => {
			mockAuthService.sendEmailVerification.mockResolvedValue({
				message: "Verification email sent! Please check your inbox."
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				const successMessage = screen.getByText("Verification email sent! Please check your inbox.");
				expect(successMessage).toHaveClass("text-success");
			});
		});

		it("should use error colors for error messages", async () => {
			mockAuthService.sendEmailVerification.mockRejectedValue(new Error("Failed to send verification email"));

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				const errorMessage = screen.getByText("Failed to send verification email");
				expect(errorMessage).toHaveClass("text-error");
			});
		});
	});

	describe("User Interaction", () => {
		it("should remain visible after resend operation", async () => {
			mockAuthService.sendEmailVerification.mockResolvedValue({
				message: "Email sent"
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Email sent")).toBeInTheDocument();
			});

			// Banner should still be visible
			expect(screen.getByText("Email verification required.")).toBeInTheDocument();
		});

		it("should allow multiple resend attempts", async () => {
			mockAuthService.sendEmailVerification.mockResolvedValue({
				message: "Email sent"
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });

			// First resend
			await user.click(resendButton);
			await waitFor(() => expect(mockAuthService.sendEmailVerification).toHaveBeenCalledTimes(1));

			// Second resend
			await user.click(resendButton);
			await waitFor(() => expect(mockAuthService.sendEmailVerification).toHaveBeenCalledTimes(2));
		});
	});
});
