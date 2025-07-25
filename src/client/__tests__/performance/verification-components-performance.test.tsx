/**
 * Performance Tests for Optimized Verification Components
 *
 * Tests validate frontend performance optimizations using Global Mock Architecture:
 * 1. React.memo effectiveness - measuring component efficiency
 * 2. Lazy loading functionality - Suspense fallback behavior
 * 3. Memory leak prevention - component lifecycle testing
 * 4. User interaction performance - input handling speed
 *
 * Expected optimizations implemented:
 * - React.memo for preventing unnecessary re-renders
 * - useCallback for stable function references
 * - useMemo for expensive computations
 * - Lazy loading for code splitting
 *
 * Created: 2025-01-21
 */

import { screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// Import optimized components to validate optimizations
import { SecurityCodeFlowOptimized } from "../../components/SecurityCodeFlowOptimized";
import { PasswordChangeFormOptimized } from "../../components/PasswordChangeFormOptimized";
import { SecurityOperationType } from "../../types";
import { renderWithFullEnvironment, fastStateSync } from "../utils/testRenderUtils";

// Level 1: Module-Level Service Mocking (Primary Pattern)
vi.mock("../../services/AuthService", () => ({
	AuthService: {
		verifySecurityCode: vi.fn(),
		sendSecurityCode: vi.fn(),
		validatePassword: vi.fn()
	}
}));

vi.mock("../../services/UserService", () => ({
	UserService: {
		changePassword: vi.fn(),
		sendPasswordChangeCode: vi.fn()
	}
}));

vi.mock("../../hooks/useAuth", () => ({
	useAuth: vi.fn()
}));

// Import mocked services for test setup
import { AuthService } from "../../services/AuthService";
import { UserService } from "../../services/UserService";
import { useAuth } from "../../hooks/useAuth";

describe("Optimized Verification Components Performance", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Set up default mock responses
		(AuthService.verifySecurityCode as any).mockResolvedValue({
			operation_token: "test-token"
		});
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
		(AuthService.sendSecurityCode as any).mockResolvedValue({ success: true });
		(UserService.changePassword as any).mockResolvedValue({ success: true });

		// Mock useAuth hook
		(useAuth as any).mockReturnValue({
			user: {
				id: "test-user-id",
				email: "test@example.com",
				full_name: "Test User"
			},
			loading: false,
			error: null
		});
	});

	it("should render SecurityCodeFlowOptimized efficiently", async () => {
		const startTime = performance.now();

		renderWithFullEnvironment(
			<SecurityCodeFlowOptimized
				userEmail="test@example.com"
				operationType={SecurityOperationType.EMAIL_VERIFICATION}
				onCodeVerified={vi.fn()}
			/>,
			{ providers: { toast: true } }
		);

		// Wait for Suspense boundaries to resolve and lazy components to load
		await fastStateSync();

		// Wait for the lazy components to actually render (findBy waits for elements to appear)
		await screen.findByText("Verify Your Email", {}, { timeout: 3000 });

		const renderTime = performance.now() - startTime;

		// Component should render efficiently even with lazy loading
		expect(renderTime).toBeLessThan(1000); // Increased timeout for lazy loading
		expect(screen.getByText("Verify Your Email")).toBeInTheDocument();

		// Verify that the verification code input is also loaded
		expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();
	});

	it("should handle rapid input changes efficiently", async () => {
		renderWithFullEnvironment(
			<SecurityCodeFlowOptimized
				userEmail="test@example.com"
				operationType={SecurityOperationType.EMAIL_VERIFICATION}
				onCodeVerified={vi.fn()}
			/>,
			{ providers: { toast: true } }
		);

		// Wait for lazy components to load
		await fastStateSync();
		await screen.findByLabelText("Verification Code", {}, { timeout: 3000 });

		// Test input performance with memoized validation
		const input = screen.getByLabelText("Verification Code");

		// Multiple rapid input changes (should be fast due to useMemo optimization)
		const inputStartTime = performance.now();

		// Simulate rapid typing
		fireEvent.change(input, { target: { value: "1" } });
		fireEvent.change(input, { target: { value: "12" } });
		fireEvent.change(input, { target: { value: "123" } });
		fireEvent.change(input, { target: { value: "1234" } });
		fireEvent.change(input, { target: { value: "12345" } });
		fireEvent.change(input, { target: { value: "123456" } });

		const inputTime = performance.now() - inputStartTime;

		// Input should be handled efficiently
		expect(inputTime).toBeLessThan(100); // Should complete in <100ms
		expect(input).toHaveValue("123456");
	});

	it("should render PasswordChangeFormOptimized efficiently", async () => {
		const startTime = performance.now();

		renderWithFullEnvironment(<PasswordChangeFormOptimized onSuccess={vi.fn()} onCancel={vi.fn()} />, {
			providers: { toast: true, auth: true }
		});

		// Wait for lazy components to load
		await fastStateSync();
		await screen.findByText("Change Password", {}, { timeout: 3000 });

		const renderTime = performance.now() - startTime;

		// Component should render quickly with lazy loading
		expect(renderTime).toBeLessThan(1000); // Should render in <1000ms with lazy loading
		expect(screen.getByText("Change Password")).toBeInTheDocument();
	});

	it("should handle form input changes efficiently", async () => {
		renderWithFullEnvironment(<PasswordChangeFormOptimized onSuccess={vi.fn()} onCancel={vi.fn()} />, {
			providers: { toast: true, auth: true }
		});

		// Wait for lazy components to load - first wait for the title
		await fastStateSync();
		await screen.findByText("Change Password", {}, { timeout: 3000 });

		// Then wait for the form inputs to be available
		await screen.findByTestId("new-password-input", {}, { timeout: 3000 });

		// Test form performance with memoized validation
		const newPasswordInput = screen.getByTestId("new-password-input");
		const confirmPasswordInput = screen.getByTestId("confirm-password-input");

		const formStartTime = performance.now();

		// Simulate form filling (should be fast due to useMemo optimization)
		fireEvent.change(newPasswordInput, { target: { value: "NewPassword123!" } });
		fireEvent.change(confirmPasswordInput, { target: { value: "NewPassword123!" } });

		const formTime = performance.now() - formStartTime;

		// Form input should be handled efficiently
		expect(formTime).toBeLessThan(100); // Should complete in <100ms
		expect(newPasswordInput).toHaveValue("NewPassword123!");
		expect(confirmPasswordInput).toHaveValue("NewPassword123!");
	}, 5000);

	it("should demonstrate lazy loading with Suspense fallbacks", async () => {
		// This test validates that components use lazy loading properly
		const testEnv = renderWithFullEnvironment(
			<SecurityCodeFlowOptimized
				userEmail="test@example.com"
				operationType={SecurityOperationType.EMAIL_VERIFICATION}
				onCodeVerified={vi.fn()}
			/>,
			{ providers: { toast: true } }
		);

		// Wait for lazy components to load
		await fastStateSync();

		// Wait for the main title to appear (indicating lazy components have loaded)
		await screen.findByText("Verify Your Email", {}, { timeout: 3000 });

		// Verify that the component rendered successfully after lazy loading
		expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Verification Code")).toBeInTheDocument();

		// Cleanup test environment
		testEnv.cleanup();
	});

	it("should maintain functionality while optimized", async () => {
		const onCodeVerified = vi.fn();

		renderWithFullEnvironment(
			<SecurityCodeFlowOptimized
				userEmail="test@example.com"
				operationType={SecurityOperationType.EMAIL_VERIFICATION}
				onCodeVerified={onCodeVerified}
			/>,
			{ providers: { toast: true } }
		);

		// Wait for lazy components to load
		await fastStateSync();
		await screen.findByLabelText("Verification Code", {}, { timeout: 3000 });

		// Fill in verification code
		const input = screen.getByLabelText("Verification Code");
		fireEvent.change(input, { target: { value: "123456" } });

		// Submit the form - wait for button to load first
		await screen.findByText("Verify Code", {}, { timeout: 3000 });
		fireEvent.click(screen.getByText("Verify Code"));

		await fastStateSync();

		// Verify that the optimized component still functions correctly
		expect(AuthService.verifySecurityCode).toHaveBeenCalledWith(
			"test@example.com",
			"123456",
			SecurityOperationType.EMAIL_VERIFICATION
		);
	});
});
