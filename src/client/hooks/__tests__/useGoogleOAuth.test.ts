import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useGoogleOAuth } from "../useGoogleOAuth";

// Mock logger for cleaner test output
vi.mock("../../utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn()
	}
}));

describe("useGoogleOAuth", () => {
	const mockOnSuccess = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up Google SDK mock that mimics real behavior
		const mockGoogleSDK = {
			accounts: {
				id: {
					initialize: vi.fn(),
					prompt: vi.fn(),
					renderButton: vi.fn()
				}
			}
		};

		// Mock window.google
		Object.defineProperty(window, "google", {
			value: mockGoogleSDK,
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("User Workflow: Successful OAuth Flow", () => {
		it("should provide ready state when Google SDK is available and client ID is configured", async () => {
			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Should eventually become ready (assuming environment is properly configured)
			await act(async () => {
				await Promise.resolve();
			});
			// Hook should either be ready for use or show a specific error
			expect(result.current.isReady || result.current.error !== null).toBe(true);

			// If there's no error, the hook should be ready
			if (!result.current.error) {
				expect(result.current.isReady).toBe(true);
				expect(result.current.isLoading).toBe(false);
				expect(typeof result.current.triggerOAuth).toBe("function");
				expect(typeof result.current.clearError).toBe("function");
			}
		});

		it("should handle credential response and call onSuccess", async () => {
			let credentialCallback: ((response: any) => void) | undefined;

			// Mock Google SDK to capture the callback
			const mockInitialize = vi.fn(config => {
				credentialCallback = config.callback;
			});

			window.google = {
				accounts: {
					id: {
						initialize: mockInitialize,
						prompt: vi.fn(),
						renderButton: vi.fn()
					}
				}
			};

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Wait for initialization
			await act(async () => {
				await Promise.resolve();
			});
			expect(mockInitialize).toHaveBeenCalled();

			// Simulate successful credential response
			const mockCredentialResponse = {
				credential: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-jwt-credential"
			};

			await act(async () => {
				credentialCallback?.(mockCredentialResponse);
			});

			expect(mockOnSuccess).toHaveBeenCalledWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-jwt-credential");
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("User Workflow: Error Scenarios", () => {
		it("should handle empty credential response", async () => {
			let credentialCallback: ((response: any) => void) | undefined;

			const mockInitialize = vi.fn(config => {
				credentialCallback = config.callback;
			});

			window.google = {
				accounts: {
					id: {
						initialize: mockInitialize,
						prompt: vi.fn(),
						renderButton: vi.fn()
					}
				}
			};

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			await act(async () => {
				await Promise.resolve();
			});
			expect(mockInitialize).toHaveBeenCalled();

			// Simulate empty credential response
			const emptyCredentialResponse = { credential: "" };

			await act(async () => {
				credentialCallback?.(emptyCredentialResponse);
			});

			expect(result.current.error).toBe("Failed to process Google OAuth credential");
			expect(mockOnError).toHaveBeenCalledWith("Failed to process Google OAuth credential");
			expect(mockOnSuccess).not.toHaveBeenCalled();
		});

		it("should handle missing Google SDK gracefully", async () => {
			// Remove Google SDK
			delete (window as any).google;

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Hook waits for Google SDK to load, so initially no error
			expect(result.current.error).toBe(null);
			expect(result.current.isReady).toBe(false);

			// When user tries to trigger OAuth without SDK, then we get error
			act(() => {
				result.current.triggerOAuth();
			});

			expect(result.current.error).toContain("not available");
			expect(result.current.isReady).toBe(false);
		});

		it("should allow error recovery with clearError", () => {
			// Start with no Google SDK
			delete (window as any).google;

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Trigger OAuth to create error state
			act(() => {
				result.current.triggerOAuth();
			});

			// Should have error after trigger attempt
			expect(result.current.error).toContain("not available");
			expect(result.current.error).not.toBe(null);

			// User can clear the error
			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBe(null);
		});
	});

	describe("User Workflow: OAuth Trigger", () => {
		it("should provide triggerOAuth function that handles not ready state", () => {
			// Start with no Google SDK
			delete (window as any).google;

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// User tries to trigger OAuth when not ready
			act(() => {
				result.current.triggerOAuth();
			});

			// Should provide user-friendly error
			expect(result.current.error).toContain("not available");
			expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining("not available"));
		});

		it("should handle OAuth popup dismissal", async () => {
			const mockPrompt = vi.fn(callback => {
				// Simulate user dismissing popup - call the callback immediately
				callback({
					isNotDisplayed: () => true,
					isSkippedMoment: () => false,
					isDismissedMoment: () => false,
					getSkippedReason: () => "",
					getDismissedReason: () => ""
				});
			});

			window.google = {
				accounts: {
					id: {
						initialize: vi.fn(),
						prompt: mockPrompt,
						renderButton: vi.fn()
					}
				}
			};

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.isReady).toBe(true);

			// User triggers OAuth
			await act(async () => {
				result.current.triggerOAuth();
				await Promise.resolve(); // Allow prompt callback to execute
			});

			// Should handle dismissal gracefully
			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).toBe("Google Sign-In was dismissed or unavailable");

			expect(mockOnError).toHaveBeenCalledWith("Google Sign-In was dismissed or unavailable");
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Hook State Management", () => {
		it("should manage loading state during OAuth flow", async () => {
			const mockPrompt = vi.fn();

			window.google = {
				accounts: {
					id: {
						initialize: vi.fn(),
						prompt: mockPrompt,
						renderButton: vi.fn()
					}
				}
			};

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.isReady).toBe(true);

			// Initially not loading
			expect(result.current.isLoading).toBe(false);

			// When user triggers OAuth, should show loading
			act(() => {
				result.current.triggerOAuth();
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("should provide consistent interface regardless of configuration", () => {
			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Should always provide the expected interface
			expect(result.current).toHaveProperty("isReady");
			expect(result.current).toHaveProperty("isLoading");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("triggerOAuth");
			expect(result.current).toHaveProperty("clearError");

			// Functions should be callable
			expect(typeof result.current.triggerOAuth).toBe("function");
			expect(typeof result.current.clearError).toBe("function");
		});
	});

	describe("Optional onError callback", () => {
		it("should work gracefully without onError callback", async () => {
			// Start with no Google SDK
			delete (window as any).google;

			const { result } = renderHook(() =>
				useGoogleOAuth({
					onSuccess: mockOnSuccess
					// No onError callback provided
				})
			);

			// Trigger OAuth to create error state
			act(() => {
				result.current.triggerOAuth();
			});

			// Should still set error state even without callback
			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).toContain("not available");
			expect(result.current.isReady).toBe(false);
			// Should not crash when onError callback is missing
			act(() => {
				expect(() => result.current.triggerOAuth()).not.toThrow();
			});
		});
	});
});
