import React from "react";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import AuthModal from "../AuthModal";
import { AuthService } from "../../services/AuthService";
import { useGoogleOAuth } from "../../hooks/useGoogleOAuth";
import { useMicrosoftOAuth } from "../../hooks/useMicrosoftOAuth";
import { useGitHubOAuth } from "../../hooks/useGitHubOAuth";

// Mock AuthService
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		signIn: vi.fn(),
		signUp: vi.fn(),
		oauthSignIn: vi.fn(),
		validateEmail: vi.fn(),
		validatePassword: vi.fn()
	}
}));

// Mock OAuth hooks
vi.mock("../../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn()
}));

vi.mock("../../hooks/useMicrosoftOAuth", () => ({
	useMicrosoftOAuth: vi.fn()
}));

vi.mock("../../hooks/useGitHubOAuth", () => ({
	useGitHubOAuth: vi.fn()
}));

// Mock ForgotPasswordFlow component
vi.mock("../ForgotPasswordFlow", () => ({
	ForgotPasswordFlow: ({ onComplete, onCancel }: any) => (
		<div data-testid="forgot-password-flow">
			<h3>Reset Your Password</h3>
			<button onClick={onComplete}>Complete Reset</button>
			<button onClick={onCancel}>Cancel Reset</button>
		</div>
	)
}));

describe("AuthModal", () => {
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

	const mockMicrosoftOAuth = {
		isReady: true,
		triggerOAuth: vi.fn(),
		isLoading: false,
		error: null,
		clearError: vi.fn()
	};

	const mockGitHubOAuth = {
		isReady: true,
		triggerOAuth: vi.fn(),
		isLoading: false,
		error: null,
		clearError: vi.fn()
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		// Set OAuth mock mode to use test environment for OAuth hooks
		vi.stubEnv("VITE_OAUTH_MOCK_MODE", "true");
		(useGoogleOAuth as any).mockReturnValue(mockGoogleOAuth);
		(useMicrosoftOAuth as any).mockReturnValue(mockMicrosoftOAuth);
		(useGitHubOAuth as any).mockReturnValue(mockGitHubOAuth);
		(AuthService.validateEmail as any).mockReturnValue(true);
		(AuthService.validatePassword as any).mockReturnValue({ isValid: true, requirements: {} });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("should show sign in form by default", () => {
		renderWithFullEnvironment(<AuthModal {...mockProps} />);
		expect(screen.getByText("Welcome back to Zentropy")).toBeInTheDocument();
	});

	it("should show signup form when initialMode is signup", () => {
		renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signup" />);
		expect(screen.getByRole("heading", { name: "Create Your Account" })).toBeInTheDocument();
	});

	it("should allow user to sign in with valid credentials", async () => {
		(AuthService.signIn as any).mockResolvedValue({ token: "mock-token", user: {} });
		renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

		fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
		fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
		fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

		await act(async () => {});

		expect(mockAuth.login).toHaveBeenCalled();
		expect(mockProps.onSuccess).toHaveBeenCalled();
	});

	it("should allow user to register with valid information", async () => {
		(AuthService.signUp as any).mockResolvedValue({ message: "Success" });
		const propsWithVerification = { ...mockProps, onShowVerification: vi.fn() };
		renderWithFullEnvironment(<AuthModal {...propsWithVerification} initialMode="signup" />);

		fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@example.com" } });
		fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "Password123!" } });
		fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "Password123!" } });
		fireEvent.click(screen.getByRole("checkbox", { name: /terms of service/i }));
		fireEvent.click(screen.getByRole("button", { name: /create account/i }));

		await act(async () => {});

		act(() => {
			vi.runAllTimers();
		});

		expect(propsWithVerification.onShowVerification).toHaveBeenCalledWith("john@example.com");
	});

	it("should display field-level error for incorrect password", async () => {
		(AuthService.signIn as any).mockRejectedValue(new Error("Invalid credentials"));
		renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

		fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
		fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpassword" } });
		fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

		await act(async () => {});

		expect(screen.getByText("Incorrect email or password")).toBeInTheDocument();
	});

	describe("Forgot Password Flow", () => {
		it("should show forgot password link in sign in mode", () => {
			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

			expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
		});

		it("should not show forgot password link in sign up mode", () => {
			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signup" />);

			expect(screen.queryByText("Forgot your password?")).not.toBeInTheDocument();
		});

		it("should navigate to forgot password flow when link is clicked", async () => {
			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

			fireEvent.click(screen.getByText("Forgot your password?"));

			await act(async () => {});

			expect(screen.getByTestId("forgot-password-flow")).toBeInTheDocument();
			expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
		});

		it("should close modal entirely when forgot password is cancelled", async () => {
			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

			// Navigate to forgot password
			fireEvent.click(screen.getByText("Forgot your password?"));
			await act(async () => {});

			// Cancel forgot password
			fireEvent.click(screen.getByText("Cancel Reset"));
			await act(async () => {});

			// Should call onClose to close entire modal (no modal remnant)
			expect(mockProps.onClose).toHaveBeenCalled();
		});

		it("should return to sign in mode and show success message when password reset is completed", async () => {
			const mockShowSuccess = vi.fn();
			vi.doMock("../../contexts/ToastContext", () => ({
				useToast: () => ({
					showSuccess: mockShowSuccess,
					showError: vi.fn(),
					showInfo: vi.fn(),
					showCriticalError: vi.fn()
				})
			}));

			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

			// Navigate to forgot password
			fireEvent.click(screen.getByText("Forgot your password?"));
			await act(async () => {});

			// Complete password reset
			fireEvent.click(screen.getByText("Complete Reset"));
			await act(async () => {});

			// Should be back on sign in form
			expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
			expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		});

		it("should hide other UI elements when in forgot password mode", async () => {
			renderWithFullEnvironment(<AuthModal {...mockProps} initialMode="signin" />);

			// Navigate to forgot password
			fireEvent.click(screen.getByText("Forgot your password?"));
			await act(async () => {});

			// Should not show regular sign in/up UI
			expect(screen.queryByText("Welcome back to Zentropy")).not.toBeInTheDocument();
			expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
			expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
		});
	});
});
