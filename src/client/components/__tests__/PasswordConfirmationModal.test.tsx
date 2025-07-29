import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
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
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} isOpen={false} />);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("should render modal when open", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Confirm Password")).toBeInTheDocument();
		expect(screen.getByText("Please enter your password to unlink your Google account.")).toBeInTheDocument();
	});

	it("should handle password input", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("mypassword");

		expect(getPasswordInput()).toHaveValue("mypassword");
	});

	it("should handle form submission with valid password", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("mypassword");
		clickConfirmButton();

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should validate empty password", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		clickConfirmButton();

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should validate whitespace-only password", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		enterPassword("   ");
		clickConfirmButton();

		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("should handle cancel button", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		clickCancelButton();

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("should clear validation error when password is entered", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

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
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} loading={true} />);

		const confirmButton = screen.getByRole("button", { name: "Unlinking..." });
		const cancelButton = screen.getByRole("button", { name: "Cancel" });

		expect(confirmButton).toBeDisabled();
		expect(confirmButton).toHaveTextContent("Unlinking...");
		expect(cancelButton).toBeDisabled();
	});

	it("should display server error", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} error="Incorrect password" />);

		expect(screen.getByText("Incorrect password")).toBeInTheDocument();
	});

	it("should handle keyboard submission", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		const passwordInput = getPasswordInput();
		fireEvent.change(passwordInput, { target: { value: "mypassword" } });

		// Press Enter key to trigger submission
		fireEvent.keyDown(passwordInput, { key: "Enter" });

		expect(mockOnConfirm).toHaveBeenCalledWith("mypassword");
	});

	it("should focus password input when opened", () => {
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		expect(getPasswordInput()).toHaveFocus();
	});

	it("should clear form state on close", () => {
		const { rerender } = renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

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
		renderWithFullEnvironment(<PasswordConfirmationModal {...defaultProps} />);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toHaveAttribute("aria-labelledby", "password-confirmation-title");

		const title = screen.getByText("Confirm Password");
		expect(title).toHaveAttribute("id", "password-confirmation-title");
	});
});
