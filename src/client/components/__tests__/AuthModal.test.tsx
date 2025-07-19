import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import AuthModal from "../AuthModal";
import { AuthService } from "../../services/AuthService";
import { useGoogleOAuth } from "../../hooks/useGoogleOAuth";
import { ToastProvider } from "../../contexts/ToastContext";

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

// Mock useGoogleOAuth hook
vi.mock("../../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn()
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

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		(useGoogleOAuth as any).mockReturnValue(mockGoogleOAuth);
		(AuthService.validateEmail as any).mockReturnValue(true);
		(AuthService.validatePassword as any).mockReturnValue({ isValid: true, requirements: {} });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const renderWithToast = (ui: React.ReactElement) => {
		return render(<ToastProvider>{ui}</ToastProvider>);
	};

	it("should show sign in form by default", () => {
		renderWithToast(<AuthModal {...mockProps} />);
		expect(screen.getByText("Welcome back to Zentropy")).toBeInTheDocument();
	});

	it("should show signup form when initialMode is signup", () => {
		renderWithToast(<AuthModal {...mockProps} initialMode="signup" />);
		expect(screen.getByRole("heading", { name: "Create Your Account" })).toBeInTheDocument();
	});

	it("should allow user to sign in with valid credentials", async () => {
		(AuthService.signIn as any).mockResolvedValue({ token: "mock-token", user: {} });
		renderWithToast(<AuthModal {...mockProps} initialMode="signin" />);

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
		renderWithToast(<AuthModal {...propsWithVerification} initialMode="signup" />);

		fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: "John" } });
		fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: "Doe" } });
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
});
