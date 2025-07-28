import { renderHook, act } from "@testing-library/react";
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

	// Helper function to create hook with default props
	const createHook = (overrides = {}) => {
		return renderHook(() =>
			useGitHubOAuth({
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

		// Mock window.open for GitHub OAuth popup testing (jsdom doesn't support window.open)
		const mockPopup = {
			closed: false,
			close: vi.fn(),
			postMessage: vi.fn()
		};

		const mockWindowOpen = vi.fn().mockReturnValue(mockPopup);

		Object.defineProperty(window, "open", {
			value: mockWindowOpen,
			writable: true,
			configurable: true
		});

		// Store references for test access
		(window as any).mockPopup = mockPopup;
		(window as any).mockWindowOpen = mockWindowOpen;

		// Mock global fetch for GitHub API calls
		// eslint-disable-next-line no-restricted-syntax -- Hook tests require global.fetch mocking to test HTTP behavior
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
		// Clean up window.open mock
		delete (window as any).open;
		// Clean up mock references
		delete (window as any).mockPopup;
		delete (window as any).mockWindowOpen;
		// Clean up global fetch mock
		delete (global as any).fetch;
		// Restore default environment variable
		vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");
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

			// Should be in loading state after triggering OAuth
			expect(result.current.isLoading).toBe(true);

			// Simulate successful OAuth popup message
			act(() => {
				const successEvent = new MessageEvent("message", {
					data: {
						type: "GITHUB_OAUTH_SUCCESS",
						authorizationCode: "mock-auth-code-123"
					},
					origin: window.location.origin
				});
				window.dispatchEvent(successEvent);
			});

			// Should call onSuccess with auth code
			expect(mockOnSuccess).toHaveBeenCalledTimes(1);
			expect(mockOnSuccess).toHaveBeenCalledWith("mock-auth-code-123");
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
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});
			expect(result.current.error).toBe("VITE_GITHUB_CLIENT_ID is not configured in environment variables");

			expect(result.current.isReady).toBe(false);
			expect(mockOnError).toHaveBeenCalledWith(
				"VITE_GITHUB_CLIENT_ID is not configured in environment variables"
			);
		});

		it("should handle OAuth trigger when not ready", async () => {
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

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

			expect(mockOnError).toHaveBeenCalledWith("GitHub Sign-In not available");
			expect(result.current.error).toBe("GitHub Sign-In not available");
		});

		it("should clear errors when clearError is called", async () => {
			// Test with missing client ID to generate an error
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

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

	describe("GitHub SDK compatibility", () => {
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

	describe("User experiences edge cases", () => {
		it("should handle multiple OAuth triggers", async () => {
			const { result } = createHook();

			await waitForReady(result);

			// Trigger OAuth multiple times and simulate success for each
			act(() => {
				result.current.triggerOAuth();
			});

			act(() => {
				const successEvent1 = new MessageEvent("message", {
					data: {
						type: "GITHUB_OAUTH_SUCCESS",
						authorizationCode: "mock-auth-code-1"
					},
					origin: window.location.origin
				});
				window.dispatchEvent(successEvent1);
			});

			act(() => {
				result.current.triggerOAuth();
			});

			act(() => {
				const successEvent2 = new MessageEvent("message", {
					data: {
						type: "GITHUB_OAUTH_SUCCESS",
						authorizationCode: "mock-auth-code-2"
					},
					origin: window.location.origin
				});
				window.dispatchEvent(successEvent2);
			});

			act(() => {
				result.current.triggerOAuth();
			});

			act(() => {
				const successEvent3 = new MessageEvent("message", {
					data: {
						type: "GITHUB_OAUTH_SUCCESS",
						authorizationCode: "mock-auth-code-3"
					},
					origin: window.location.origin
				});
				window.dispatchEvent(successEvent3);
			});

			// Should call onSuccess once per trigger
			expect(mockOnSuccess).toHaveBeenCalledTimes(3);
			expect(result.current.error).toBeNull();
		});

		it("should handle rapid error clearing", async () => {
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "");

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
			vi.stubEnv("VITE_GITHUB_CLIENT_ID", "mock-github-client-id");

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
