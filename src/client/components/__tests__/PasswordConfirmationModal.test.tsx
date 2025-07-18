import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import { PasswordConfirmationModal } from "../PasswordConfirmationModal";

describe("PasswordConfirmationModal", () => {
	const mockOnClose = vi.fn();
	const mockOnConfirm = vi.fn();

	const defaultProps = {
		isOpen: true,
		onClose: mockOnClose,
		onConfirm: mockOnConfirm,
		loading: false,
		error: null
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should not render when closed", () => {
		render(<PasswordConfirmationModal {...defaultProps} isOpen={false} />);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("should render modal when open", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Confirm Password")).toBeInTheDocument();
		expect(screen.getByText("Please enter your password to unlink your Google account.")).toBeInTheDocument();
	});

	it("should handle password input", async () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		fireEvent.change(passwordInput, { target: { value: "mypassword" } });

		expect(passwordInput).toHaveValue("mypassword");
	});

	it("should handle form submission with valid password", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });

		fireEvent.change(passwordInput, { target: { value: "mypassword" } });
		await user.click(confirmButton);

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should validate empty password", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		await user.click(confirmButton);

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should validate whitespace-only password", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });

		fireEvent.change(passwordInput, { target: { value: "   " } });
		await user.click(confirmButton);

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should handle cancel button", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("should clear validation error when password is entered", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });

		// Trigger validation error first
		await user.click(confirmButton);
		expect(screen.getByText("Password is required")).toBeInTheDocument();

		// Enter password and submit again
		fireEvent.change(passwordInput, { target: { value: "mypassword" } });
		await user.click(confirmButton);

		expect(screen.queryByText("Password is required")).not.toBeInTheDocument();
		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should show loading state", () => {
		render(<PasswordConfirmationModal {...defaultProps} loading={true} />);

		const confirmButton = screen.getByRole("button", { name: "Unlinking..." });
		const cancelButton = screen.getByRole("button", { name: "Cancel" });

		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent("Unlinking...");
		expect(cancelButton).toBeDisabled();
	});

	it("should display server error", () => {
		render(<PasswordConfirmationModal {...defaultProps} error="Incorrect password" />);

		expect(screen.getByText("Incorrect password")).toBeInTheDocument();
	});

	it("should handle keyboard submission", async () => {
		const user = userEvent.setup();
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		await user.type(passwordInput, "mypassword{enter}");

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should focus password input when opened", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		expect(passwordInput).toHaveFocus();
	});

	it("should clear form state on close", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = document.getElementById("password") as HTMLInputElement;
		fireEvent.change(passwordInput, { target: { value: "mypassword" } });

		// Trigger validation error
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		await user.click(confirmButton);

		// Close modal
		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		await user.click(cancelButton);

		// Reopen modal
		rerender(<PasswordConfirmationModal {...defaultProps} />);

		// Form should be cleared
		const newPasswordInput = document.getElementById("password") as HTMLInputElement;
		expect(newPasswordInput).toHaveValue("");
		expect(screen.queryByText("Password is required")).not.toBeInTheDocument();
	});

	it("should have correct accessibility attributes", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toHaveAttribute("aria-labelledby", "password-confirmation-title");

		const title = screen.getByText("Confirm Password");
		expect(title).toHaveAttribute("id", "password-confirmation-title");
	});
});
