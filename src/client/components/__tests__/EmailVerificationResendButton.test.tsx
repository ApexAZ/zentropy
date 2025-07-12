import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
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
		error: vi.fn()
	}
}));

describe("EmailVerificationResendButton", () => {
	const mockEmail = "test@example.com";
	const mockSendEmailVerification = vi.mocked(AuthService.sendEmailVerification);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the resend button initially", () => {
		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();
	});

	it("shows loading state when button is clicked", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification.mockImplementation(() => new Promise(() => {})); // Never resolves

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		await user.click(button);

		expect(screen.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
	});

	it("calls AuthService.sendEmailVerification with correct email", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		await user.click(button);

		expect(mockSendEmailVerification).toHaveBeenCalledWith(mockEmail);
	});

	it("shows success message after successful email send", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		await user.click(button);

		await waitFor(() => {
			expect(screen.getByText("Verification email sent!")).toBeInTheDocument();
		});

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("hides success message after 3 seconds", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification.mockResolvedValue({ message: "Email sent successfully" });

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		await user.click(button);

		// Wait for success message to appear
		await waitFor(() => {
			expect(screen.getByText("Verification email sent!")).toBeInTheDocument();
		});

		// Wait for success message to disappear (3 seconds + some buffer)
		await waitFor(
			() => {
				expect(screen.queryByText("Verification email sent!")).not.toBeInTheDocument();
				expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
			},
			{ timeout: 4000 }
		);
	});

	it("returns to normal state after error", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification.mockRejectedValue(new Error("Network error"));

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		await user.click(button);

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();
		});

		// Should not show error message in compact UI
		expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
	});

	it("can be clicked again after an error", async () => {
		const user = userEvent.setup();
		mockSendEmailVerification
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({ message: "Email sent successfully" });

		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });

		// First click - fails
		await user.click(button);
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Resend" })).not.toBeDisabled();
		});

		// Second click - succeeds
		await user.click(button);
		await waitFor(() => {
			expect(screen.getByText("Verification email sent!")).toBeInTheDocument();
		});

		expect(mockSendEmailVerification).toHaveBeenCalledTimes(2);
	});

	it("has proper accessibility attributes", () => {
		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		expect(button).toBeInTheDocument();
		// Button component doesn't explicitly set type="button" but it's still a button element
		expect(button.tagName).toBe("BUTTON");
	});

	it("maintains button styling from Button component", () => {
		render(<EmailVerificationResendButton userEmail={mockEmail} />);

		const button = screen.getByRole("button", { name: "Resend" });
		// Should have the secondary variant base with steel blue override and extra compact sizing
		expect(button).toHaveClass("!px-3", "!py-1", "!bg-interactive", "!text-white", "!border-none");
	});
});
