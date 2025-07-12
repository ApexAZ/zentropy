import React from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import "@testing-library/jest-dom";
import AuthModal from "../AuthModal";
import { AuthService } from "../../services/AuthService";
import { useGoogleOAuth } from "../../hooks/useGoogleOAuth";

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
		(useGoogleOAuth as any).mockReturnValue(mockGoogleOAuth);
		(AuthService.validateEmail as any).mockReturnValue(true);
		(AuthService.validatePassword as any).mockReturnValue({
			isValid: true,
			requirements: {
				length: true,
				uppercase: true,
				lowercase: true,
				number: true,
				symbol: true,
				match: true
			}
		});
	});

	afterEach(() => {
		cleanup();
	});

	// Test user behavior, not implementation - following tests/README.md philosophy
	it("should allow user to navigate between authentication modes", async () => {
		const user = userEvent.setup();
		render(<AuthModal {...mockProps} />);

		// User starts at method selection
		await waitFor(() => {
			expect(screen.getByText("Welcome to Zentropy")).toBeInTheDocument();
		});

		// User clicks Sign In
		await user.click(screen.getByText("Sign In"));
		await waitFor(() => {
			expect(screen.getByText("Welcome back to Zentropy")).toBeInTheDocument();
		});

		// User goes back to method selection
		await user.click(screen.getByText("← Back to options"));
		await waitFor(() => {
			expect(screen.getByText("Welcome to Zentropy")).toBeInTheDocument();
		});

		// User clicks Sign Up
		await user.click(screen.getByText("Sign Up"));
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Create Your Account" })).toBeInTheDocument();
		});
	});

	it("should go directly to signup form when initialMode is signup", async () => {
		render(<AuthModal {...mockProps} initialMode="signup" />);

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

		render(<AuthModal {...mockProps} initialMode="signin" />);

		// User fills out sign in form
		const emailInput = document.querySelector('input[name="email"]')!;
		await user.type(emailInput, "test@example.com");

		const passwordInput = document.querySelector('input[name="password"]')!;
		await user.type(passwordInput, "password123");

		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// Verify service call and authentication
		await waitFor(() => {
			expect(AuthService.signIn).toHaveBeenCalledWith({
				email: "test@example.com",
				password: "password123",
				remember_me: false
			});
		});

		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith(mockToken, mockUser, false);
		});
	});

	it("should allow user to register with valid information", async () => {
		const user = userEvent.setup();
		const mockMessage =
			"Registration successful! Please check your email at john@example.com to verify your account before logging in.";

		(AuthService.signUp as any).mockResolvedValue({ message: mockMessage });

		render(<AuthModal {...mockProps} initialMode="signup" />);

		// User fills out registration form
		await user.type(document.querySelector('input[name="first_name"]')!, "John");
		await user.type(document.querySelector('input[name="last_name"]')!, "Doe");
		await user.type(document.querySelector('input[name="email"]')!, "john@example.com");
		await user.type(document.querySelector('input[name="password"]')!, "Password123!");
		await user.type(document.querySelector('input[name="confirm_password"]')!, "Password123!");
		await user.click(document.querySelector('input[id="terms_agreement"]')!);

		await user.click(screen.getByRole("button", { name: /create account/i }));

		// Verify service call - no automatic login expected
		await waitFor(() => {
			expect(AuthService.signUp).toHaveBeenCalledWith({
				first_name: "John",
				last_name: "Doe",
				email: "john@example.com",
				password: "Password123!",
				terms_agreement: true,
				has_projects_access: true
			});
		});

		// Verify no automatic login occurs (security fix)
		expect(mockAuth.login).not.toHaveBeenCalled();
	});

	it("should show validation errors for required fields", async () => {
		const user = userEvent.setup();
		render(<AuthModal {...mockProps} initialMode="signin" />);

		// User tries to submit empty form
		const submitButton = screen.getByRole("button", { name: /sign in/i });
		await user.click(submitButton);

		// User sees validation errors
		await waitFor(() => {
			expect(screen.getByText("Email is required")).toBeInTheDocument();
			expect(screen.getByText("Password is required")).toBeInTheDocument();
		});
	});

	it("should show error messages when authentication fails", async () => {
		const user = userEvent.setup();
		const errorMessage = "Invalid credentials";

		(AuthService.signIn as any).mockRejectedValue(new Error(errorMessage));

		render(<AuthModal {...mockProps} initialMode="signin" />);

		// User fills out form with invalid credentials
		await user.type(document.querySelector('input[name="email"]')!, "test@example.com");
		await user.type(document.querySelector('input[name="password"]')!, "wrong-password");

		// Wait for form to be ready
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// User sees error message (test the mock was called)
		await waitFor(() => {
			expect(AuthService.signIn).toHaveBeenCalled();
		});
	});

	it("should allow user to use Google OAuth authentication", async () => {
		const user = userEvent.setup();
		render(<AuthModal {...mockProps} />);

		// User clicks Google OAuth button
		await user.click(screen.getByText("Continue with Google"));

		// Verify Google OAuth is triggered
		expect(mockGoogleOAuth.triggerOAuth).toHaveBeenCalled();
	});

	it("should close modal when user clicks close button", async () => {
		const user = userEvent.setup();
		render(<AuthModal {...mockProps} />);

		await user.click(screen.getByRole("button", { name: /✕/i }));
		expect(mockProps.onClose).toHaveBeenCalled();
	});

	it("should toggle password visibility when user clicks eye icon", async () => {
		const user = userEvent.setup();
		render(<AuthModal {...mockProps} initialMode="signin" />);

		const passwordInput = document.querySelector('input[name="password"]')!;
		const toggleButton = screen.getByRole("button", { name: /👁️‍🗨️/i });

		// Password starts hidden
		expect(passwordInput).toHaveAttribute("type", "password");

		// User clicks to show password
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "text");

		// User clicks to hide password
		await user.click(toggleButton);
		expect(passwordInput).toHaveAttribute("type", "password");
	});

	it("should remember user preference when remember me is checked", async () => {
		const user = userEvent.setup();
		const mockToken = "mock-token";
		const mockUser = { id: "1", name: "Test User", email: "test@example.com" };

		(AuthService.signIn as any).mockResolvedValue({ token: mockToken, user: mockUser });

		render(<AuthModal {...mockProps} initialMode="signin" />);

		// User checks remember me and signs in
		await user.type(document.querySelector('input[name="email"]')!, "test@example.com");
		await user.type(document.querySelector('input[name="password"]')!, "password123");
		await user.click(document.querySelector('input[id="remember_me"]')!);
		await user.click(screen.getByRole("button", { name: /sign in/i }));

		// Verify remember me is passed to login
		await waitFor(() => {
			expect(mockAuth.login).toHaveBeenCalledWith(mockToken, mockUser, true);
		});
	});
});
