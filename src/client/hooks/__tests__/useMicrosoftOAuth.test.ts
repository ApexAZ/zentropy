import { renderHook, waitFor, act } from "@testing-library/react";
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

describe("useMicrosoftOAuth", () => {
	const mockOnSuccess = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset environment variables for each test
		vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "mock-microsoft-client-id");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	describe("User Workflow: Successful OAuth Flow", () => {
		it("should provide ready state when client ID is configured", async () => {
			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Should eventually become ready
			await waitFor(() => {
				expect(result.current.isReady || result.current.error !== null).toBe(true);
			});

			// Since we have a mock client ID, should be ready
			expect(result.current.isReady).toBe(true);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(typeof result.current.triggerOAuth).toBe("function");
			expect(typeof result.current.clearError).toBe("function");
		});

		it("should handle mock OAuth flow and call onSuccess", async () => {
			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Wait for hook to be ready
			await waitFor(() => {
				expect(result.current.isReady).toBe(true);
			});

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

		it("should clear errors when clearError is called", async () => {
			// Test with missing client ID to generate an error
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Should have error due to missing client ID
			await waitFor(() => {
				expect(result.current.error).not.toBeNull();
			});

			// Clear error
			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should show error when VITE_MICROSOFT_CLIENT_ID is not configured", async () => {
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			await waitFor(() => {
				expect(result.current.error).toBe(
					"VITE_MICROSOFT_CLIENT_ID is not configured in environment variables"
				);
			});

			expect(result.current.isReady).toBe(false);
			expect(mockOnError).toHaveBeenCalledWith(
				"VITE_MICROSOFT_CLIENT_ID is not configured in environment variables"
			);
		});

		it("should handle OAuth trigger when not ready", async () => {
			vi.stubEnv("VITE_MICROSOFT_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Wait for error state
			await waitFor(() => {
				expect(result.current.isReady).toBe(false);
			});

			// Try to trigger OAuth when not ready
			act(() => {
				result.current.triggerOAuth();
			});

			expect(mockOnError).toHaveBeenCalledWith("Microsoft Sign-In not available");
			expect(result.current.error).toBe("Microsoft Sign-In not available");
		});
	});

	describe("Hook Interface", () => {
		it("should provide the expected interface", async () => {
			const { result } = renderHook(() =>
				useMicrosoftOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			// Check interface structure
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
});
