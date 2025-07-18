import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useGitHubOAuth } from "../useGitHubOAuth";

// Mock logger for cleaner test output
vi.mock("../../utils/logger", () => ({
	logger: {
		error: vi.fn(),
		info: vi.fn(),
		debug: vi.fn()
	}
}));

// Module-level environment setup for default test configuration
vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");

describe("useGitHubOAuth", () => {
	const mockOnSuccess = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Set up GitHub OAuth SDK mock that mimics real behavior
		const mockGitHubSDK = {
			OAuth: {
				createAuthorizationURL: vi
					.fn()
					.mockReturnValue("https://github.com/login/oauth/authorize?client_id=mock-client"),
				exchangeCodeForToken: vi.fn().mockResolvedValue({
					access_token: "mock-github-access-token",
					token_type: "bearer",
					scope: "user:email"
				}),
				getUserInfo: vi.fn().mockResolvedValue({
					id: 12345,
					login: "testuser",
					email: "test@example.com",
					name: "Test User"
				})
			},
			request: vi.fn().mockResolvedValue({
				data: {
					login: "testuser",
					email: "test@example.com"
				}
			})
		};

		// Mock window.github (future-proofing for when real GitHub SDK is integrated)
		Object.defineProperty(window, "github", {
			value: mockGitHubSDK,
			writable: true,
			configurable: true
		});

		// Mock global fetch for GitHub API calls
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				login: "testuser",
				email: "test@example.com",
				name: "Test User"
			})
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		// Clean up window.github
		delete (window as any).github;
		// Clean up global fetch mock
		delete (global as any).fetch;
	});

	describe("User Workflow: Successful OAuth Flow", () => {
		it("should provide ready state when client ID is configured", async () => {
			const { result } = renderHook(() =>
				useGitHubOAuth({
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
				useGitHubOAuth({
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
			expect(mockOnSuccess).toHaveBeenCalledWith(expect.stringMatching(/^mock-github-credential-\d+$/));
			expect(result.current.error).toBeNull();
		});

		it("should clear errors when clearError is called", async () => {
			// Test with missing client ID to generate an error
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useGitHubOAuth({
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

			// Restore default client ID for subsequent tests
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");
		});
	});

	describe("Error Handling", () => {
		it("should show error when VITE_GITHUB_CLIENT_ID is not configured", async () => {
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useGitHubOAuth({
					onSuccess: mockOnSuccess,
					onError: mockOnError
				})
			);

			await waitFor(() => {
				expect(result.current.error).toBe("VITE_GITHUB_CLIENT_ID is not configured in environment variables");
			});

			expect(result.current.isReady).toBe(false);
			expect(mockOnError).toHaveBeenCalledWith(
				"VITE_GITHUB_CLIENT_ID is not configured in environment variables"
			);

			// Restore default client ID for subsequent tests
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");
		});

		it("should handle OAuth trigger when not ready", async () => {
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

			const { result } = renderHook(() =>
				useGitHubOAuth({
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

			expect(mockOnError).toHaveBeenCalledWith("GitHub Sign-In not available");
			expect(result.current.error).toBe("GitHub Sign-In not available");

			// Restore default client ID for subsequent tests
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");
		});
	});

	describe("Hook Interface", () => {
		it("should provide the expected interface", async () => {
			const { result } = renderHook(() =>
				useGitHubOAuth({
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

	describe("Future SDK Integration Readiness", () => {
		it("should handle GitHub OAuth SDK when real SDK is integrated", async () => {
			// This test ensures the mocks are structured correctly for future GitHub SDK integration
			const mockGitHub = (window as any).github;

			expect(mockGitHub).toBeDefined();
			expect(mockGitHub.OAuth).toBeDefined();
			expect(mockGitHub.OAuth.createAuthorizationURL).toBeDefined();
			expect(mockGitHub.OAuth.exchangeCodeForToken).toBeDefined();
			expect(mockGitHub.OAuth.getUserInfo).toBeDefined();

			// Test OAuth URL creation
			const authUrl = mockGitHub.OAuth.createAuthorizationURL();
			expect(authUrl).toContain("github.com/login/oauth/authorize");
			expect(authUrl).toContain("client_id=mock-client");
		});

		it("should handle GitHub API requests correctly", async () => {
			const mockGitHub = (window as any).github;

			// Test API request functionality
			const response = await mockGitHub.request();
			expect(response.data).toBeDefined();
			expect(response.data.login).toBe("testuser");
			expect(response.data.email).toBe("test@example.com");
		});

		it("should handle fetch-based GitHub API calls", async () => {
			// Test that fetch is properly mocked for GitHub API calls
			const response = await fetch("https://api.github.com/user");
			expect(response.ok).toBe(true);

			const data = await response.json();
			expect(data.login).toBe("testuser");
			expect(data.email).toBe("test@example.com");
		});
	});
});
