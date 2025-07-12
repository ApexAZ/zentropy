/**
 * Tests for useEmailVerification hook
 *
 * Comprehensive testing of email verification functionality including:
 * - URL token detection and auto-verification
 * - API request handling with success and error scenarios
 * - State management and callback execution
 * - URL history management and cleanup
 * - Duplicate verification prevention
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useEmailVerification } from "../useEmailVerification";
import { clearPendingVerification, requestAppTabClosure } from "../../utils/pendingVerification";

// Mock the logger
vi.mock("../../utils/logger", () => ({
	logger: {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// Mock pendingVerification utils
vi.mock("../../utils/pendingVerification", () => ({
	clearPendingVerification: vi.fn(),
	requestAppTabClosure: vi.fn()
}));

describe("useEmailVerification", () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let originalLocation: Location;
	let originalHistory: History;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Mock fetch
		mockFetch = vi.fn();
		global.fetch = mockFetch;

		// Store original window properties
		originalLocation = window.location;
		originalHistory = window.history;

		// Mock window.location
		delete (window as any).location;
		(window as any).location = {
			...originalLocation,
			pathname: "/"
		};

		// Mock window.history
		window.history = {
			...originalHistory,
			pushState: vi.fn()
		} as any;
	});

	afterEach(() => {
		// Restore original window properties
		(window as any).location = originalLocation;
		(window as any).history = originalHistory;
	});

	describe("Initial State", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() => useEmailVerification());

			expect(result.current.state).toEqual({
				isVerifying: false,
				error: null,
				success: false,
				token: null
			});
			expect(typeof result.current.clearState).toBe("function");
		});

		it("should not trigger verification for non-verification URLs", () => {
			window.location.pathname = "/dashboard";

			renderHook(() => useEmailVerification());

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should not trigger verification for verify-email path without token", () => {
			window.location.pathname = "/verify-email";

			renderHook(() => useEmailVerification());

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("Token Detection and Verification", () => {
		it("should detect and verify email token from URL", async () => {
			window.location.pathname = "/verify-email/test-token-123";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Email verified successfully" })
			});

			const onSuccess = vi.fn();
			const onRedirectHome = vi.fn();
			const onShowSignIn = vi.fn();

			const { result } = renderHook(() =>
				useEmailVerification({
					onSuccess,
					onRedirectHome,
					onShowSignIn
				})
			);

			// Should start verification
			await waitFor(() => {
				expect(result.current.state.isVerifying).toBe(true);
			});

			expect(result.current.state.token).toBe("test-token-123");

			// Wait for verification to complete
			await waitFor(() => {
				expect(result.current.state.isVerifying).toBe(false);
			});

			// Verify API call
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/verify-email/test-token-123", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				}
			});

			// Verify final state
			expect(result.current.state.success).toBe(true);
			expect(result.current.state.error).toBeNull();

			// Verify callbacks
			expect(onSuccess).toHaveBeenCalledWith("Email verified successfully! Please sign in.");
			expect(onRedirectHome).toHaveBeenCalled();
			expect(onShowSignIn).toHaveBeenCalled();

			// Verify URL cleanup
			expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/");
		});

		it.skip("should prevent duplicate verification attempts for same token", async () => {
			window.location.pathname = "/verify-email/duplicate-token";

			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ message: "Success" })
			});

			// First render
			const { unmount } = renderHook(() => useEmailVerification());

			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalled();
			});

			const firstCallCount = mockFetch.mock.calls.length;
			unmount();

			// Second render with same token
			renderHook(() => useEmailVerification());

			// Wait a bit to ensure no additional calls
			await new Promise(resolve => setTimeout(resolve, 50));

			// Should not make additional API calls beyond the first
			expect(mockFetch).toHaveBeenCalledTimes(firstCallCount);
		});
	});

	describe("Success Scenarios", () => {
		it("should handle successful verification with all callbacks", async () => {
			window.location.pathname = "/verify-email/success-token";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Verified!" })
			});

			const callbacks = {
				onSuccess: vi.fn(),
				onError: vi.fn(),
				onRedirectHome: vi.fn(),
				onShowSignIn: vi.fn()
			};

			const { result } = renderHook(() => useEmailVerification(callbacks));

			await waitFor(() => {
				expect(result.current.state.success).toBe(true);
			});

			expect(result.current.state.isVerifying).toBe(false);
			expect(result.current.state.error).toBeNull();
			expect(callbacks.onSuccess).toHaveBeenCalledWith("Email verified successfully! Please sign in.");
			expect(callbacks.onError).not.toHaveBeenCalled();
			expect(callbacks.onRedirectHome).toHaveBeenCalled();
			expect(callbacks.onShowSignIn).toHaveBeenCalled();
			// Verify existing tabs are closed for clean single-tab experience
			expect(requestAppTabClosure).toHaveBeenCalled();
			expect(clearPendingVerification).toHaveBeenCalled();
		});

		it("should handle successful verification without callbacks", async () => {
			window.location.pathname = "/verify-email/success-no-callbacks";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Success" })
			});

			const { result } = renderHook(() => useEmailVerification());

			await waitFor(() => {
				expect(result.current.state.success).toBe(true);
			});

			expect(result.current.state.isVerifying).toBe(false);
			expect(result.current.state.error).toBeNull();
			// Should not throw errors when callbacks are undefined
			// But should still call utility functions
			expect(requestAppTabClosure).toHaveBeenCalled();
			expect(clearPendingVerification).toHaveBeenCalled();
		});
	});

	describe("Error Scenarios", () => {
		it("should handle API error responses", async () => {
			window.location.pathname = "/verify-email/invalid-token";

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({ detail: "Invalid verification token" })
			});

			const callbacks = {
				onSuccess: vi.fn(),
				onError: vi.fn(),
				onRedirectHome: vi.fn(),
				onShowSignIn: vi.fn()
			};

			const { result } = renderHook(() => useEmailVerification(callbacks));

			await waitFor(() => {
				expect(result.current.state.error).toBe("Invalid verification token");
			});

			expect(result.current.state.isVerifying).toBe(false);
			expect(result.current.state.success).toBe(false);
			expect(callbacks.onError).toHaveBeenCalledWith("Invalid verification token");
			expect(callbacks.onSuccess).not.toHaveBeenCalled();
			expect(callbacks.onRedirectHome).toHaveBeenCalled();
			expect(callbacks.onShowSignIn).not.toHaveBeenCalled(); // Should not open login modal on error
		});

		it("should handle API error without detail message", async () => {
			window.location.pathname = "/verify-email/error-no-detail";

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ message: "Server error" })
			});

			const onError = vi.fn();
			const { result } = renderHook(() => useEmailVerification({ onError }));

			await waitFor(() => {
				expect(result.current.state.error).toBe("Email verification failed. Please try again.");
			});

			expect(onError).toHaveBeenCalledWith("Email verification failed. Please try again.");
		});

		it("should handle network errors", async () => {
			window.location.pathname = "/verify-email/network-error";

			mockFetch.mockRejectedValueOnce(new Error("Network failure"));

			const callbacks = {
				onError: vi.fn(),
				onRedirectHome: vi.fn(),
				onShowSignIn: vi.fn()
			};

			const { result } = renderHook(() => useEmailVerification(callbacks));

			await waitFor(() => {
				expect(result.current.state.error).toBe("Network error during email verification. Please try again.");
			});

			expect(result.current.state.isVerifying).toBe(false);
			expect(result.current.state.success).toBe(false);
			expect(callbacks.onError).toHaveBeenCalledWith(
				"Network error during email verification. Please try again."
			);
			expect(callbacks.onRedirectHome).toHaveBeenCalled();
			expect(callbacks.onShowSignIn).not.toHaveBeenCalled(); // Should not open login modal on network error

			// Verify URL cleanup even on network error
			expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/");
		});

		it("should handle JSON parsing errors", async () => {
			window.location.pathname = "/verify-email/json-error";

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => {
					throw new Error("Invalid JSON");
				}
			});

			const onError = vi.fn();
			const { result } = renderHook(() => useEmailVerification({ onError }));

			await waitFor(() => {
				expect(result.current.state.error).toBe("Network error during email verification. Please try again.");
			});

			expect(onError).toHaveBeenCalledWith("Network error during email verification. Please try again.");
		});
	});

	describe("State Management", () => {
		it("should clear state when clearState is called", async () => {
			window.location.pathname = "/verify-email/clear-test";

			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => ({ detail: "Test error" })
			});

			const { result } = renderHook(() => useEmailVerification());

			// Wait for error state
			await waitFor(() => {
				expect(result.current.state.error).toBe("Test error");
			});

			// Clear state
			act(() => {
				result.current.clearState();
			});

			expect(result.current.state).toEqual({
				isVerifying: false,
				error: null,
				success: false,
				token: null
			});
		});

		it("should update isVerifying state during verification", async () => {
			window.location.pathname = "/verify-email/verifying-test";

			// Create a promise that resolves after a delay
			let resolvePromise: (value: any) => void;
			const delayedPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});

			mockFetch.mockReturnValueOnce(delayedPromise);

			const { result } = renderHook(() => useEmailVerification());

			// Should start as verifying
			await waitFor(() => {
				expect(result.current.state.isVerifying).toBe(true);
			});

			expect(result.current.state.token).toBe("verifying-test");

			// Complete the verification
			act(() => {
				resolvePromise!({
					ok: true,
					json: async () => ({ message: "Success" })
				});
			});

			// Should finish verifying
			await waitFor(() => {
				expect(result.current.state.isVerifying).toBe(false);
			});

			expect(result.current.state.success).toBe(true);
		});
	});

	describe("Callback Handling", () => {
		it("should work with dynamically changing callbacks", async () => {
			window.location.pathname = "/verify-email/dynamic-callbacks";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Success" })
			});

			const firstCallback = vi.fn();
			const secondCallback = vi.fn();

			const { result, rerender } = renderHook(({ onSuccess }) => useEmailVerification({ onSuccess }), {
				initialProps: { onSuccess: firstCallback }
			});

			// Change callback before verification completes
			rerender({ onSuccess: secondCallback });

			await waitFor(() => {
				expect(result.current.state.success).toBe(true);
			});

			// Should use the latest callback
			expect(firstCallback).not.toHaveBeenCalled();
			expect(secondCallback).toHaveBeenCalledWith("Email verified successfully! Please sign in.");
		});

		it("should handle undefined callbacks gracefully", async () => {
			window.location.pathname = "/verify-email/undefined-callbacks";

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Success" })
			});

			// Start with no callbacks
			const { result, rerender } = renderHook(callbacks => useEmailVerification(callbacks), {
				initialProps: undefined as any
			});

			await waitFor(() => {
				expect(result.current.state.success).toBe(true);
			});

			// Should not throw errors
			expect(result.current.state.success).toBe(true);

			// Change to have callbacks
			const onSuccess = vi.fn();
			rerender({ onSuccess });

			// Clear and test with new callbacks
			act(() => {
				result.current.clearState();
			});

			expect(result.current.state.success).toBe(false);
		});
	});

	describe("URL and History Management", () => {
		it("should clean URL immediately on verification start", async () => {
			window.location.pathname = "/verify-email/url-cleanup";

			// Mock a slow response
			mockFetch.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({ message: "Success" })
								}),
							100
						)
					)
			);

			const onRedirectHome = vi.fn();
			renderHook(() => useEmailVerification({ onRedirectHome }));

			// URL should be cleaned immediately when verification starts
			await waitFor(() => {
				expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/");
			});

			expect(onRedirectHome).toHaveBeenCalled();
		});

		it("should handle complex URL paths correctly", () => {
			const testCases = [
				{ path: "/verify-email/abc123def456", expectedToken: "abc123def456" },
				{ path: "/verify-email/token-with-dashes", expectedToken: "token-with-dashes" },
				{ path: "/verify-email/123", expectedToken: "123" },
				{
					path: "/verify-email/very-long-token-with-multiple-segments",
					expectedToken: "very-long-token-with-multiple-segments"
				}
			];

			testCases.forEach(({ path, expectedToken }) => {
				window.location.pathname = path;

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ message: "Success" })
				});

				const { unmount } = renderHook(() => useEmailVerification());

				expect(mockFetch).toHaveBeenCalledWith(
					`/api/v1/auth/verify-email/${expectedToken}`,
					expect.any(Object)
				);

				unmount();
				vi.clearAllMocks();
			});
		});
	});
});
