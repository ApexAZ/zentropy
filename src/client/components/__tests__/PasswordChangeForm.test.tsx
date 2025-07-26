import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import PasswordChangeForm from "../PasswordChangeForm";

// Mock UserService for password change operations
vi.mock("../../services/UserService", () => ({
	UserService: {
		changePassword: vi.fn()
	}
}));

// Mock PasswordRequirements component
vi.mock("../PasswordRequirements", () => ({
	default: ({ password }: { password: string }) => (
		<div data-testid="password-requirements">Password requirements for: {password}</div>
	)
}));

// Mock useAuth hook to provide user
vi.mock("../../hooks/useAuth", () => ({
	useAuth: vi.fn(() => ({
		user: { id: "1", email: "test@example.com", first_name: "Test", last_name: "User" }
	}))
}));

// Import mocked modules for type checking
import { UserService } from "../../services/UserService";

describe("PasswordChangeForm", () => {
	const mockOnSuccess = vi.fn();
	const mockOnCancel = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		(UserService.changePassword as any).mockResolvedValue({ message: "Password changed successfully!" });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Form Rendering", () => {
		it("should render the password change form", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			expect(screen.getByRole("heading", { name: "Change Password" })).toBeInTheDocument();
			expect(
				screen.getByText(/Enter your current password and choose a new secure password/i)
			).toBeInTheDocument();
			expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Change Password" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
		});

		it("should show password requirements component", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
		});

		it("should have proper form structure", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const form = screen.getByRole("heading", { name: "Change Password" }).closest("form");
			expect(form).toBeInTheDocument();
			expect(form).toHaveClass("space-y-4");
		});
	});

	describe("Form Validation", () => {
		it("should validate password confirmation match", async () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByRole("button", { name: "Change Password" });

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPassword123!" } });

			await act(async () => {
				fireEvent.click(submitButton);
			});

			expect(screen.getByText("New passwords don't match")).toBeInTheDocument();
			expect(UserService.changePassword).not.toHaveBeenCalled();
		});

		it("should disable submit button when fields are empty", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const submitButton = screen.getByRole("button", { name: "Change Password" });
			expect(submitButton).toBeDisabled();
		});

		it("should enable submit button when all fields are filled", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByRole("button", { name: "Change Password" });

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("Form Submission", () => {
		it("should successfully change password with valid inputs", async () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByRole("button", { name: "Change Password" });

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			await act(async () => {
				fireEvent.click(submitButton);
			});

			expect(UserService.changePassword).toHaveBeenCalledWith("CurrentPassword123!", "NewPassword123!");
			expect(mockOnSuccess).toHaveBeenCalled();
		});

		it("should handle password change error", async () => {
			const errorMessage = "Current password is incorrect";
			(UserService.changePassword as any).mockRejectedValue(new Error(errorMessage));

			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByRole("button", { name: "Change Password" });

			fireEvent.change(currentPasswordInput, { target: { value: "WrongPassword!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			await act(async () => {
				fireEvent.click(submitButton);
			});

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
			expect(mockOnSuccess).not.toHaveBeenCalled();
		});

		it("should show loading state during password change", async () => {
			// Mock a delayed promise to test loading state
			let resolvePromise: (value: any) => void;
			const delayedPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			(UserService.changePassword as any).mockReturnValue(delayedPromise);

			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");
			const submitButton = screen.getByRole("button", { name: "Change Password" });

			fireEvent.change(currentPasswordInput, { target: { value: "CurrentPassword123!" } });
			fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
			fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

			await act(async () => {
				fireEvent.click(submitButton);
			});

			expect(screen.getByText("Changing Password...")).toBeInTheDocument();
			expect(submitButton).toBeDisabled();

			// Resolve the promise to clean up
			await act(async () => {
				resolvePromise({ message: "Success" });
				await delayedPromise; // Wait for the promise to resolve
			});
		});
	});

	describe("Cancel Functionality", () => {
		it("should call onCancel when cancel button is clicked", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const cancelButton = screen.getByRole("button", { name: "Cancel" });
			fireEvent.click(cancelButton);

			expect(mockOnCancel).toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("should have proper form labels and structure", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			expect(screen.getByLabelText("Current Password")).toBeInTheDocument();
			expect(screen.getByLabelText("New Password")).toBeInTheDocument();
			expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
		});

		it("should have proper autocomplete attributes", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			const currentPasswordInput = screen.getByLabelText("Current Password");
			const newPasswordInput = screen.getByLabelText("New Password");
			const confirmPasswordInput = screen.getByLabelText("Confirm New Password");

			expect(currentPasswordInput).toHaveAttribute("autocomplete", "current-password");
			expect(newPasswordInput).toHaveAttribute("autocomplete", "new-password");
			expect(confirmPasswordInput).toHaveAttribute("autocomplete", "new-password");
		});

		it("should have required attributes on inputs", () => {
			renderWithFullEnvironment(<PasswordChangeForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />, {
				providers: { toast: true }
			});

			expect(screen.getByLabelText("Current Password")).toHaveAttribute("required");
			expect(screen.getByLabelText("New Password")).toHaveAttribute("required");
			expect(screen.getByLabelText("Confirm New Password")).toHaveAttribute("required");
		});
	});

	describe("Component Props", () => {
		it("should work without optional props", () => {
			renderWithFullEnvironment(<PasswordChangeForm />, {
				providers: { toast: true }
			});

			expect(screen.getByRole("heading", { name: "Change Password" })).toBeInTheDocument();
		});
	});
});
