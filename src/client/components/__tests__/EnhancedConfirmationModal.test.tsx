import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { EnhancedConfirmationModal } from "../EnhancedConfirmationModal";

describe("EnhancedConfirmationModal", () => {
	const mockOnClose = vi.fn();
	const mockOnConfirm = vi.fn();

	const defaultProps = {
		isOpen: true,
		onClose: mockOnClose,
		onConfirm: mockOnConfirm,
		loading: false,
		title: "Confirm Action",
		message: "Are you sure you want to perform this action?",
		confirmText: "Confirm",
		cancelText: "Cancel"
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("User understands the impact of security changes", () => {
		it("should show detailed confirmation for Google account unlinking", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Unlink Google Account"
					message="Are you sure you want to unlink your Google account?"
					actionType="destructive"
					impactDescription="After unlinking, you will:"
					consequences={[
						"Only be able to sign in with email and password",
						"Lose the convenience of one-click Google sign-in",
						"Need to remember your password for account access"
					]}
					confirmText="Yes, Unlink Account"
					requiresPasswordConfirmation={true}
				/>
			);

			expect(screen.getByText("Unlink Google Account")).toBeInTheDocument();
			expect(screen.getByText("Are you sure you want to unlink your Google account?")).toBeInTheDocument();
			expect(screen.getByText("After unlinking, you will:")).toBeInTheDocument();
			expect(screen.getByText("Only be able to sign in with email and password")).toBeInTheDocument();
			expect(screen.getByText("Lose the convenience of one-click Google sign-in")).toBeInTheDocument();
			expect(screen.getByText("Need to remember your password for account access")).toBeInTheDocument();
		});

		it("should show consequences for critical security actions", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Delete Account"
					message="This action cannot be undone."
					actionType="critical"
					impactDescription="This will permanently:"
					consequences={[
						"Delete all your projects and data",
						"Remove you from all teams",
						"Cancel any active subscriptions"
					]}
					confirmText="Yes, Delete Account"
					requiresPasswordConfirmation={true}
				/>
			);

			expect(screen.getByText("This will permanently:")).toBeInTheDocument();
			expect(screen.getByText("Delete all your projects and data")).toBeInTheDocument();
			expect(screen.getByText("Remove you from all teams")).toBeInTheDocument();
			expect(screen.getByText("Cancel any active subscriptions")).toBeInTheDocument();
		});

		it("should show recovery guidance when provided", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Remove Team Member"
					message="Are you sure you want to remove this team member?"
					actionType="destructive"
					recoveryGuidance="If you remove them by mistake, you can re-invite them using their email address."
					confirmText="Remove Member"
				/>
			);

			expect(screen.getByText("Recovery Information")).toBeInTheDocument();
			expect(
				screen.getByText("If you remove them by mistake, you can re-invite them using their email address.")
			).toBeInTheDocument();
		});
	});

	describe("User experiences secure password verification", () => {
		it("should require password verification for destructive actions", async () => {
			const user = userEvent.setup();
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Unlink Google Account"
					message="Are you sure you want to unlink your Google account?"
					actionType="destructive"
					requiresPasswordConfirmation={true}
					confirmText="Unlink Account"
				/>
			);

			expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
			expect(screen.getByText("Enter your password to confirm this action")).toBeInTheDocument();

			const passwordInput = screen.getByLabelText(/password/i);
			const confirmButton = screen.getByRole("button", { name: "Unlink Account" });

			// Should not be able to confirm without password
			await user.click(confirmButton);
			expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();
			expect(mockOnConfirm).not.toHaveBeenCalled();

			// Should confirm with valid password
			fireEvent.change(passwordInput, { target: { value: "validpassword" } });
			await user.click(confirmButton);
			expect(mockOnConfirm).toHaveBeenCalledWith("validpassword");
		});

		it("should validate password input properly", async () => {
			const user = userEvent.setup();
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					requiresPasswordConfirmation={true}
					confirmText="Confirm Action"
				/>
			);

			const passwordInput = screen.getByLabelText(/password/i);
			const confirmButton = screen.getByRole("button", { name: "Confirm Action" });

			// Test whitespace-only password
			fireEvent.change(passwordInput, { target: { value: "   " } });
			await user.click(confirmButton);
			expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();

			// Clear and test valid password
			await user.clear(passwordInput);
			fireEvent.change(passwordInput, { target: { value: "validpassword" } });
			await user.click(confirmButton);
			expect(mockOnConfirm).toHaveBeenCalledWith("validpassword");
		});

		it("should not require password for non-destructive actions", async () => {
			const user = userEvent.setup();
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Save Changes"
					message="Save your changes?"
					actionType="normal"
					confirmText="Save"
				/>
			);

			expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();

			const confirmButton = screen.getByRole("button", { name: "Save" });
			await user.click(confirmButton);
			expect(mockOnConfirm).toHaveBeenCalledWith();
		});
	});

	describe("User sees clear recovery paths", () => {
		it("should show account lockout recovery guidance", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Disable Two-Factor Authentication"
					message="Are you sure you want to disable two-factor authentication?"
					actionType="destructive"
					recoveryGuidance="If you lose access to your account, contact support at support@zentropy.com with your email address and we'll help you regain access."
					confirmText="Disable 2FA"
				/>
			);

			expect(screen.getByText("Recovery Information")).toBeInTheDocument();
			expect(screen.getByText(/contact support at support@zentropy.com/)).toBeInTheDocument();
		});

		it("should provide specific recovery steps", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Remove OAuth Provider"
					message="Remove this authentication method?"
					actionType="destructive"
					recoveryGuidance="You can re-add this authentication method anytime by going to Security Settings > Link Accounts."
					confirmText="Remove Provider"
				/>
			);

			expect(screen.getByText(/You can re-add this authentication method anytime/)).toBeInTheDocument();
		});

		it("should show emergency contact information when appropriate", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					title="Lock Account"
					message="Temporarily lock your account for security?"
					actionType="critical"
					emergencyContact={{
						email: "security@zentropy.com",
						description: "For immediate security concerns"
					}}
					confirmText="Lock Account"
				/>
			);

			expect(screen.getByText("Emergency Contact")).toBeInTheDocument();
			expect(screen.getByText("security@zentropy.com")).toBeInTheDocument();
			expect(screen.getByText("For immediate security concerns")).toBeInTheDocument();
		});
	});

	describe("User experiences accessible design", () => {
		it("should provide proper ARIA attributes", () => {
			render(<EnhancedConfirmationModal {...defaultProps} title="Confirm Action" message="Are you sure?" />);

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby");
			expect(dialog).toHaveAttribute("aria-describedby");

			const title = screen.getByText("Confirm Action");
			expect(title).toHaveAttribute("id");
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={true} />);

			// Password input should be focused initially
			expect(screen.getByLabelText(/password/i)).toHaveFocus();

			// Tab through interactive elements
			await user.tab();
			expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

			await user.tab();
			expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
		});

		it("should handle escape key to close", async () => {
			const user = userEvent.setup();
			render(<EnhancedConfirmationModal {...defaultProps} />);

			await user.keyboard("{Escape}");
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});

		it("should focus appropriate element when opened", () => {
			render(<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={true} />);

			expect(screen.getByLabelText(/password/i)).toHaveFocus();
		});

		it("should focus confirm button when no password required", () => {
			render(<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={false} />);

			expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
		});
	});

	describe("User sees appropriate visual styling", () => {
		it("should use destructive styling for destructive actions", () => {
			render(<EnhancedConfirmationModal {...defaultProps} actionType="destructive" />);

			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			expect(confirmButton).toHaveClass("bg-red-600", "hover:bg-red-700");
		});

		it("should use critical styling for critical actions", () => {
			render(<EnhancedConfirmationModal {...defaultProps} actionType="critical" />);

			const modal = screen.getByRole("dialog");
			expect(modal).toHaveClass("border-error");
		});

		it("should use normal styling for normal actions", () => {
			render(<EnhancedConfirmationModal {...defaultProps} actionType="normal" />);

			const confirmButton = screen.getByRole("button", { name: "Confirm" });
			expect(confirmButton).toHaveClass("bg-interactive", "hover:bg-interactive-hover");
		});
	});

	describe("User can cancel actions safely", () => {
		it("should close modal when cancel button is clicked", async () => {
			const user = userEvent.setup();
			render(<EnhancedConfirmationModal {...defaultProps} />);

			const cancelButton = screen.getByRole("button", { name: "Cancel" });
			await user.click(cancelButton);

			expect(mockOnClose).toHaveBeenCalledTimes(1);
		});

		it("should clear form state when closed", async () => {
			const user = userEvent.setup();
			const { rerender } = render(
				<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={true} />
			);

			const passwordInput = screen.getByLabelText(/password/i);
			fireEvent.change(passwordInput, { target: { value: "somepassword" } });

			const cancelButton = screen.getByRole("button", { name: "Cancel" });
			await user.click(cancelButton);

			// Reopen modal
			rerender(<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={true} />);

			const newPasswordInput = screen.getByLabelText(/password/i);
			expect(newPasswordInput).toHaveValue("");
		});

		it("should handle loading state properly", () => {
			render(<EnhancedConfirmationModal {...defaultProps} loading={true} loadingText="Processing..." />);

			const confirmButton = screen.getByRole("button", { name: "Processing..." });
			const cancelButton = screen.getByRole("button", { name: "Cancel" });

			expect(confirmButton).toBeDisabled();
			expect(cancelButton).toBeDisabled();
		});
	});

	describe("User receives helpful feedback", () => {
		it("should show password error when provided", () => {
			render(
				<EnhancedConfirmationModal
					{...defaultProps}
					requiresPasswordConfirmation={true}
					passwordError="Incorrect password"
				/>
			);

			expect(screen.getByText("Incorrect password")).toBeInTheDocument();
		});

		it("should clear validation errors when password is corrected", async () => {
			const user = userEvent.setup();
			render(<EnhancedConfirmationModal {...defaultProps} requiresPasswordConfirmation={true} />);

			const passwordInput = screen.getByLabelText(/password/i);
			const confirmButton = screen.getByRole("button", { name: "Confirm" });

			// Trigger validation error
			await user.click(confirmButton);
			expect(screen.getByText("Password is required to confirm this action")).toBeInTheDocument();

			// Clear error by typing password
			fireEvent.change(passwordInput, { target: { value: "password" } });
			expect(screen.queryByText("Password is required to confirm this action")).not.toBeInTheDocument();
		});

		it("should show loading text during confirmation", () => {
			render(<EnhancedConfirmationModal {...defaultProps} loading={true} loadingText="Unlinking account..." />);

			expect(screen.getAllByText("Unlinking account...")[0]).toBeInTheDocument();
		});
	});
});
