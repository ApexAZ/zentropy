import React from "react";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import AuthModal from "../AuthModal";
import { AuthService } from "../../services/AuthService";
import { useGoogleOAuth } from "../../hooks/useGoogleOAuth";
import { ToastProvider } from "../../contexts/ToastContext";

// Mock AuthService following Service Pattern from architecture README
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		signIn: vi.fn(),
		signUp: vi.fn(),
		oauthSignIn: vi.fn(),
		validateEmail: vi.fn(),
		validatePassword: vi.fn()
	}
}));

// Mock useGoogleOAuth hook following Component-Service integration pattern
vi.mock("../../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn()
}));

describe("AuthModal", () => {
	// Following User-Focused Testing pattern from tests/README.md
	const mockAuth = {
		isAuthenticated: false,
		user: null,
		token: null,
		login: vi.fn(),
		logout: vi.fn()
	};

	const mockProps = {
		isOpen: true,
		onClose: vi.fn(),
		onSuccess: vi.fn(),
		auth: mockAuth
	};

	const mockGoogleOAuth = {
		isReady: true,
		triggerOAuth: vi.fn(),
		isLoading: false,
		error: null,
		clearError: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up robust mocks that respond consistently regardless of call count
		(useGoogleOAuth as any).mockReturnValue(mockGoogleOAuth);
		(AuthService.validateEmail as any).mockImplementation(() => true);
		(AuthService.validatePassword as any).mockImplementation(() => ({
			isValid: true,
			requirements: {
				length: true,
				uppercase: true,
				lowercase: true,
				number: true,
				symbol: true,
				match: true
			}
		}));
	});

	afterEach(() => {
		cleanup();
	});

	// Helper function to render AuthModal with ToastProvider
	const renderWithToast = (ui: React.ReactElement) => {
		return render(<ToastProvider>{ui}</ToastProvider>);
	};

	// Test user behavior, not implementation - following tests/README.md philosophy
	it("should show sign in form by default when modal opens", async () => {
		renderWithToast(<AuthModal {...mockProps} />);

		// User sees sign in form directly
		await waitFor(() => {
			expect(screen.getByText("Welcome back to Zentropy")).toBeInTheDocument();
		});

		// Should not see method selection screen since it's removed
		expect(screen.queryByText("Welcome to Zentropy")).not.toBeInTheDocument();
		expect(screen.queryByText("Choose how you'd like to continue")).not.toBeInTheDocument();
	});

	it("should go directly to signup form when initialMode is signup", async () => {
		renderWithToast(<AuthModal {...mockProps} initialMode="signup" />);

		// User should see signup form directly, not method selection
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Create Your Account" })).toBeInTheDocument();
		});

		// Should not see method selection screen
		expect(screen.queryByText("Welcome to Zentropy")).not.toBeInTheDocument();
		expect(screen.queryByText("Choose how you'd like to continue")).not.toBeInTheDocument();
	});

	it("should allow user to sign in with valid credentials", async () => {
		const user = userEvent.setup();
		const mockToken = "mock-token";
		const mockUser = { id: "1", name: "Test User", email: "test@example.com" };

		(AuthService.signIn as any).mockResolvedValue({ token: mockToken, user: mockUser });

		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

		// User fills out sign in form
		// Note: Using direct DOM queries temporarily due to missing htmlFor attributes in AuthModal
		fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: "test@example.com" } });
		fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: "password123" } });

		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// Verify user outcome: successful authentication
		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalled();
		});

		// Verify success callback is triggered (user would be redirected/modal closed)
		// Note: AuthModal calls onSuccess immediately, only onClose is delayed
		await waitFor(() => {
			expect(mockProps.onSuccess).toHaveBeenCalled();
		});
	});

	it("should allow user to register with valid information", async () => {
		const user = userEvent.setup();
		const mockMessage =
			"Registration successful! Please check your email at john@example.com to verify your account before logging in.";

		(AuthService.signUp as any).mockResolvedValue({ message: mockMessage });
		// Ensure onShowVerification callback is available
		const propsWithVerification = { ...mockProps, onShowVerification: vi.fn() };

		renderWithToast(<AuthModal {...propsWithVerification} initialMode="signup" />);

		// User fills out registration form
		// Note: Using direct DOM queries temporarily due to missing htmlFor attributes in AuthModal
		// TODO: Replace with getByLabelText queries when accessibility is improved
		fireEvent.change(document.querySelector('input[name="first_name"]')!, { target: { value: "John" } });
		fireEvent.change(document.querySelector('input[name="last_name"]')!, { target: { value: "Doe" } });
		fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: "john@example.com" } });
		fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: "Password123!" } });
		fireEvent.change(document.querySelector('input[name="confirm_password"]')!, {
			target: { value: "Password123!" }
		});
		await user.click(screen.getByRole("checkbox", { name: /terms of service/i }));

		await user.click(screen.getByRole("button", { name: /create account/i }));

		// Verify user outcome: directed to email verification
		// Note: AuthModal has 0ms delay in test environment
		await waitFor(() => {
			expect(propsWithVerification.onShowVerification).toHaveBeenCalledWith("john@example.com");
		});

		// Verify user is not automatically logged in (security best practice)
		expect(mockAuth.login).not.toHaveBeenCalled();
	});

	it("should show validation errors for required fields", async () => {
		const user = userEvent.setup();
		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

		// User tries to submit empty form
		const submitButton = screen.getByRole("button", { name: /sign in/i });
		await user.click(submitButton);

		// User sees helpful validation messages for empty required fields
		await waitFor(() => {
			expect(screen.getByText(/email is required/i)).toBeInTheDocument();
			expect(screen.getByText(/password is required/i)).toBeInTheDocument();
		});
	});

	it("should show error messages when authentication fails", async () => {
		const user = userEvent.setup();
		const errorMessage = "Invalid credentials";

		(AuthService.signIn as any).mockRejectedValue(new Error(errorMessage));

		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

		// User fills out form with invalid credentials
		// Note: Using direct DOM queries temporarily due to missing htmlFor attributes in AuthModal
		fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: "test@example.com" } });
		fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: "wrong-password" } });

		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// User stays on the form and sees appropriate error feedback
		// (Error message would be shown via toast, which is tested in ToastContext tests)
		await waitFor(() => {
			// Verify user stays on sign in form (not redirected)
			expect(screen.getByText("Welcome back to Zentropy")).toBeInTheDocument();
		});

		// User is not logged in after failed attempt
		expect(mockAuth.login).not.toHaveBeenCalled();
	});

	it("should allow user to use Google OAuth authentication", async () => {
		const user = userEvent.setup();
		renderWithToast(<AuthModal {...mockProps} />);

		// User clicks Google OAuth button
		await user.click(screen.getByText("Continue with Google"));

		// Verify Google OAuth is triggered
		expect(mockGoogleOAuth.triggerOAuth).toHaveBeenCalled();
	});

	it("should close modal when user clicks close button", async () => {
		const user = userEvent.setup();
		renderWithToast(<AuthModal {...mockProps} />);

		await user.click(screen.getByRole("button", { name: /✕/i }));
		expect(mockProps.onClose).toHaveBeenCalled();
	});

	it("should toggle password visibility when user clicks eye icon", async () => {
		const user = userEvent.setup();
		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

		const passwordInput = document.querySelector('input[name="password"]')!;
		const toggleButton = screen.getByRole("button", { name: /👁️‍🗨️/i });

		// User sees password field starts hidden for security
		expect(passwordInput).toHaveAttribute("type", "password");

		// User can reveal password by clicking toggle
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "text");

		// User can hide password again for security
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "password");
	});

	it("should remember user preference when remember me is checked", async () => {
		const user = userEvent.setup();
		const mockToken = "mock-token";
		const mockUser = { id: "1", name: "Test User", email: "test@example.com" };

		(AuthService.signIn as any).mockResolvedValue({ token: mockToken, user: mockUser });

		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

		// User fills out form and chooses to be remembered
		// Note: Using direct DOM queries temporarily due to missing htmlFor attributes in AuthModal
		fireEvent.change(document.querySelector('input[name="email"]')!, { target: { value: "test@example.com" } });
		fireEvent.change(document.querySelector('input[name="password"]')!, { target: { value: "password123" } });
		await user.click(screen.getByRole("checkbox", { name: /remember me/i }));
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// User successfully logs in with remember me option
		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith(mockToken, mockUser, true);
		});
	});
});
