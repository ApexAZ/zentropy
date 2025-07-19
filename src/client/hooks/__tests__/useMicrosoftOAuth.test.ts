import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useMicrosoftOAuth } from "../useMicrosoftOAuth";

// Mock logger for cleaner test output
vi.mock("../../utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

// Module-level environment setup for default test configuration
vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "mock-microsoft-client-id");

describe("useMicrosoftOAuth", () => {
	const mockOnSuccess = vi.fn();
	const mockOnError = vi.fn();

	// Helper function to create hook with default props
	const createHook = (overrides = {}) => {
		return renderHook(() =>
			useMicrosoftOAuth({
				onSuccess: mockOnSuccess,
				onError: mockOnError,
				...overrides
			})
		);
	};

	// Helper function to wait for hook to be ready
	const waitForReady = async (result: any) => {
		await act(async () => {
			await Promise.resolve();
		});
		expect(result.current.isReady || result.current.error !== null).toBe(true);
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up Microsoft MSAL SDK mock that mimics real behavior
		const mockMSALSDK = {
			PublicClientApplication: vi.fn(() => ({
				initialize: vi.fn().mockResolvedValue(undefined),
				loginPopup: vi.fn().mockResolvedValue({
					account: { username: "test@example.com" },
					accessToken: "mock-access-token",
					idToken: "mock-id-token"
				}),
				getActiveAccount: vi.fn().mockReturnValue(null),
				getAllAccounts: vi.fn().mockReturnValue([])
			})),
			EventType: {
				LOGIN_SUCCESS: "msal:loginSuccess",
				LOGIN_FAILURE: "msal:loginFailure"
			},
			InteractionRequiredAuthError: class MockInteractionRequiredAuthError extends Error {
				constructor(message: string) {
					super(message);
					this.name = "InteractionRequiredAuthError";
				}
			}
		};

		// Mock window.msal (future-proofing for when real MSAL SDK is integrated)
		Object.defineProperty(window, "msal", {
			value: mockMSALSDK,
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// Clean up window.msal
		delete (window as any).msal;
		// Restore default environment variable
		vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "mock-microsoft-client-id");
	});

	describe("User can initialize OAuth", () => {
		it("should be ready when client ID is configured", async () => {
			const { result } = createHook();

			await waitForReady(result);

			expect(result.current.isReady).toBe(true);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(typeof result.current.triggerOAuth).toBe("function");
			expect(typeof result.current.clearError).toBe("function");
		});

		it("should successfully complete OAuth flow", async () => {
			const { result } = createHook();

			await waitForReady(result);

			// Trigger OAuth flow
			act(() => {
				result.current.triggerOAuth();
			});

			// Should complete immediately (no loading state for mock)
			expect(result.current.isLoading).toBe(false);

			// Should call onSuccess with mock credential
			expect(mockOnSuccess).toHaveBeenCalledTimes(1);
			expect(mockOnSuccess).toHaveBeenCalledWith(expect.stringMatching(/^mock-microsoft-credential-\d+$/));
			expect(result.current.error).toBeNull();
		});

		it("should provide expected interface structure", async () => {
			const { result } = createHook();

			// Check interface structure before ready
			expect(result.current).toHaveProperty("isReady");
			expect(result.current).toHaveProperty("isLoading");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("triggerOAuth");
			expect(result.current).toHaveProperty("clearError");

			expect(typeof result.current.isReady).toBe("boolean");
			expect(typeof result.current.isLoading).toBe("boolean");
			expect(typeof result.current.triggerOAuth).toBe("function");
			expect(typeof result.current.clearError).toBe("function");
		});
	});

	describe("User encounters configuration errors", () => {
		it("should show error when client ID is not configured", async () => {
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).toBe("VITE_MICROSOFT_CLIENT_ID is not configured in environment variables");

			expect(result.current.isReady).toBe(false);
			expect(mockOnError).toHaveBeenCalledWith(
				"VITE_MICROSOFT_CLIENT_ID is not configured in environment variables"
			);
		});

		it("should handle OAuth trigger when not ready", async () => {
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = createHook();

			// Wait for error state
			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.isReady).toBe(false);

			// Try to trigger OAuth when not ready
			act(() => {
				result.current.triggerOAuth();
			});

			expect(mockOnError).toHaveBeenCalledWith("Microsoft Sign-In not available");
			expect(result.current.error).toBe("Microsoft Sign-In not available");
		});

		it("should clear errors when clearError is called", async () => {
			// Test with missing client ID to generate an error
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = createHook();

			// Should have error due to missing client ID
			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).not.toBeNull();

			// Clear error
			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBeNull();
		});
	});

	describe("Microsoft SDK compatibility", () => {
		it("should handle MSAL SDK initialization when real SDK is integrated", async () => {
			// This test ensures the mocks are structured correctly for future MSAL integration
			const mockMSAL = (window as any).msal;

			expect(mockMSAL).toBeDefined();
			expect(mockMSAL.PublicClientApplication).toBeDefined();
			expect(typeof mockMSAL.PublicClientApplication).toBe("function");

			// Test that MSAL client can be instantiated
			const client = new mockMSAL.PublicClientApplication({
				auth: {
					clientId: "test-client-id"
				}
			});

			expect(client.initialize).toBeDefined();
			expect(client.loginPopup).toBeDefined();
			expect(typeof client.initialize).toBe("function");
			expect(typeof client.loginPopup).toBe("function");
		});

		it("should handle MSAL error types correctly", () => {
			const mockMSAL = (window as any).msal;

			expect(mockMSAL.InteractionRequiredAuthError).toBeDefined();

			const error = new mockMSAL.InteractionRequiredAuthError("Test error");
			expect(error.name).toBe("InteractionRequiredAuthError");
			expect(error.message).toBe("Test error");
		});
	});

	describe("User experiences edge cases", () => {
		it("should handle multiple OAuth triggers", async () => {
			const { result } = createHook();

			await waitForReady(result);

			// Trigger OAuth multiple times
			act(() => {
				result.current.triggerOAuth();
				result.current.triggerOAuth();
				result.current.triggerOAuth();
			});

			// Should only call onSuccess once per trigger
			expect(mockOnSuccess).toHaveBeenCalledTimes(3);
			expect(result.current.error).toBeNull();
		});

		it("should handle rapid error clearing", async () => {
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).not.toBeNull();

			// Clear error multiple times rapidly
			act(() => {
				result.current.clearError();
				result.current.clearError();
				result.current.clearError();
			});

			expect(result.current.error).toBeNull();
		});

		it("should maintain consistent state during initialization", async () => {
			// Ensure we have a clean environment for this test
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "mock-microsoft-client-id");

			const { result } = createHook();

			// Hook initializes immediately when client ID is present
			expect(result.current.isReady).toBe(true);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();

			// State should remain stable
			expect(result.current.isReady).toBe(true);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});
	});
});
