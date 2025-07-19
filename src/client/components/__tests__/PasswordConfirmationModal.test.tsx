import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
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

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const getPasswordInput = () => screen.getByRole("dialog").querySelector("#password") as HTMLInputElement;

	const enterPassword = (password: string) => {
		const passwordInput = getPasswordInput();
		fireEvent.change(passwordInput, { target: { value: password } });
	};

	const clickConfirmButton = () => {
		const confirmButton = screen.getByRole("button", { name: "Unlink Account" });
		fireEvent.click(confirmButton);
		return confirmButton;
	};

	const clickCancelButton = () => {
		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		fireEvent.click(cancelButton);
		return cancelButton;
	};

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

	it("should handle password input", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("mypassword");

		expect(getPasswordInput()).toHaveValue("mypassword");
	});

	it("should handle form submission with valid password", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("mypassword");
		clickConfirmButton();

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should validate empty password", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		clickConfirmButton();

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should validate whitespace-only password", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("   ");
		clickConfirmButton();

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should handle cancel button", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		clickCancelButton();

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("should clear validation error when password is entered", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		// Trigger validation error first
		clickConfirmButton();
		expect(screen.getByText("Password is required")).toBeInTheDocument();

		// Enter password and submit again
		enterPassword("mypassword");
		clickConfirmButton();

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

	it("should handle keyboard submission", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = getPasswordInput();
		fireEvent.change(passwordInput, { target: { value: "mypassword" } });

		// Find the form and submit it (Enter key triggers form submission)
		const form = passwordInput.closest("form") as HTMLFormElement;
		fireEvent.submit(form);

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should focus password input when opened", () => {
		render(<PasswordConfirmationModal {...defaultProps} />);

		expect(getPasswordInput()).toHaveFocus();
	});

	it("should clear form state on close", () => {
		const { rerender } = render(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("mypassword");

		// Trigger validation error
		clickConfirmButton();

		// Close modal
		clickCancelButton();

		// Reopen modal
		rerender(<PasswordConfirmationModal {...defaultProps} />);

		// Form should be cleared
		expect(getPasswordInput()).toHaveValue("");
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
