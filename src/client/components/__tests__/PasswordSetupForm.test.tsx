import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "../../__tests__/utils/testRenderUtils";
import PasswordSetupForm from "../PasswordSetupForm";
import { UserService } from "../../services/UserService";

// Mock UserService
vi.mock("../../services/UserService", () => ({
	UserService: {
		setupPassword: vi.fn()
	}
}));

// Mock useAuth hook
vi.mock("../../hooks/useAuth", () => ({
	useAuth: () => ({
		user: {
			email: "test@example.com",
			name: "Test User",
			has_projects_access: true,
			email_verified: true
		}
	})
}));

describe("PasswordSetupForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render password setup form", async () => {
		renderWithFullEnvironment(<PasswordSetupForm />, {
			providers: { toast: true }
		});

		await fastStateSync();

		expect(screen.getByRole("heading", { name: "Set Up Password" })).toBeInTheDocument();
		expect(
			screen.getByText(/Create a secure password to enable email\/password authentication/)
		).toBeInTheDocument();
		expect(screen.getByLabelText("New Password")).toBeInTheDocument();
		expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Set Up Password" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
	});

	it("should call onSuccess when password setup is successful", async () => {
		const mockOnSuccess = vi.fn();
		(UserService.setupPassword as any).mockResolvedValue({ message: "Success" });

		renderWithFullEnvironment(<PasswordSetupForm onSuccess={mockOnSuccess} />, {
			providers: { toast: true }
		});

		await fastStateSync();

		// Fill in password fields
		const newPasswordInput = screen.getByLabelText("New Password");
		const confirmPasswordInput = screen.getByLabelText("Confirm Password");

		fastUserActions.replaceText(newPasswordInput, "SecurePassword123!");
		fastUserActions.replaceText(confirmPasswordInput, "SecurePassword123!");

		// Submit form
		fastUserActions.click(screen.getByRole("button", { name: "Set Up Password" }));

		await fastStateSync();

		expect(UserService.setupPassword).toHaveBeenCalledWith("SecurePassword123!");
		expect(mockOnSuccess).toHaveBeenCalled();
	});

	it("should call onCancel when cancel button is clicked", async () => {
		const mockOnCancel = vi.fn();

		renderWithFullEnvironment(<PasswordSetupForm onCancel={mockOnCancel} />, {
			providers: { toast: true }
		});

		await fastStateSync();

		fastUserActions.click(screen.getByRole("button", { name: "Cancel" }));

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("should show error when passwords don't match", async () => {
		renderWithFullEnvironment(<PasswordSetupForm />, {
			providers: { toast: true }
		});

		await fastStateSync();

		// Fill in different passwords
		const newPasswordInput = screen.getByLabelText("New Password");
		const confirmPasswordInput = screen.getByLabelText("Confirm Password");

		fastUserActions.replaceText(newPasswordInput, "SecurePassword123!");
		fastUserActions.replaceText(confirmPasswordInput, "DifferentPassword123!");

		// Submit form
		fastUserActions.click(screen.getByRole("button", { name: "Set Up Password" }));

		await fastStateSync();

		expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
		expect(UserService.setupPassword).not.toHaveBeenCalled();
	});

	it("should show error when service call fails", async () => {
		(UserService.setupPassword as any).mockRejectedValue(new Error("Setup failed"));

		renderWithFullEnvironment(<PasswordSetupForm />, {
			providers: { toast: true }
		});

		await fastStateSync();

		// Fill in matching passwords
		const newPasswordInput = screen.getByLabelText("New Password");
		const confirmPasswordInput = screen.getByLabelText("Confirm Password");

		fastUserActions.replaceText(newPasswordInput, "SecurePassword123!");
		fastUserActions.replaceText(confirmPasswordInput, "SecurePassword123!");

		// Submit form
		fastUserActions.click(screen.getByRole("button", { name: "Set Up Password" }));

		await fastStateSync();

		expect(screen.getByText("Unable to load account security information.")).toBeInTheDocument();
	});
});
