import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import EmailVerificationStatusBanner from "../EmailVerificationStatusBanner";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("EmailVerificationStatusBanner", () => {
	const defaultProps = {
		userEmail: "user@example.com",
		isVisible: true
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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

			const dismissButton = screen.getByRole("button", { name: /dismiss/i });
			await user.click(dismissButton);

			expect(screen.queryByText("Email verification required.")).not.toBeInTheDocument();
		});
	});

	describe("Resend Functionality", () => {
		it("should call resend verification API when resend button is clicked", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Verification email sent! Please check your inbox." })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/send-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email: "user@example.com" })
			});
		});

		it("should show success message after successful resend", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Verification email sent! Please check your inbox." })
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
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ detail: "Failed to send verification email" })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Failed to send verification email")).toBeInTheDocument();
			});
		});

		it("should show loading state while resending", async () => {
			mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			expect(screen.getByRole("button", { name: /sending.../i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /sending.../i })).toBeDisabled();
		});

		it("should handle network errors gracefully", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Network error. Please try again.")).toBeInTheDocument();
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
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Verification email sent! Please check your inbox." })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				const successMessage = screen.getByText("Verification email sent! Please check your inbox.");
				expect(successMessage).toHaveClass("text-green-800");
			});
		});

		it("should use error colors for error messages", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ detail: "Failed to send verification email" })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				const errorMessage = screen.getByText("Failed to send verification email");
				expect(errorMessage).toHaveClass("text-red-800");
			});
		});
	});

	describe("User Interaction", () => {
		it("should remain visible after resend operation", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Email sent" })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });
			await user.click(resendButton);

			await waitFor(() => {
				expect(screen.getByText("Verification email sent! Please check your inbox.")).toBeInTheDocument();
			});

			// Banner should still be visible
			expect(screen.getByText("Email verification required.")).toBeInTheDocument();
		});

		it("should allow multiple resend attempts", async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Email sent" })
			});

			const user = userEvent.setup();
			render(<EmailVerificationStatusBanner {...defaultProps} />);

			const resendButton = screen.getByRole("button", { name: /resend verification email/i });

			// First resend
			await user.click(resendButton);
			await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

			// Second resend
			await user.click(resendButton);
			await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
		});
	});
});
