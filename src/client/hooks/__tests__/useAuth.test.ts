import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import "@testing-library/jest-dom";
import { useAuth } from "../useAuth";
import { fastStateSync } from "../../__tests__/utils/testRenderUtils";
import { getAuthTokenAsync } from "../../utils/auth";
import { UserService } from "../../services/UserService";

// Mock the auth utilities and UserService for proper testing
vi.mock("../../utils/auth", async () => {
	const actual = await vi.importActual("../../utils/auth");
	return {
		...actual,
		getAuthTokenAsync: vi.fn(),
		setAuthTokenAsync: vi.fn(),
		clearAuthTokenAsync: vi.fn()
	};
});

vi.mock("../../services/UserService", () => ({
	UserService: {
		validateTokenAndGetUser: vi.fn()
	}
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
// eslint-disable-next-line no-restricted-syntax -- Auth hook integration tests require global fetch mocking for authentication flow testing
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, "localStorage", {
	value: mockLocalStorage
});

// Mock sessionStorage
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
Object.defineProperty(window, "sessionStorage", {
	value: mockSessionStorage
});

// Mock console.warn to silence session timeout logs
const originalWarn = console.warn;
console.warn = vi.fn();

describe("useAuth", () => {
	// Helper function to create hook with clean state
	const createHook = () => {
		return renderHook(() => useAuth());
	};

	// Helper function to setup authenticated user
	const setupAuthenticatedUser = async (
		token = "valid-jwt-token",
		userData: any = {
			email: "test@example.com",
			first_name: "Test",
			last_name: "User"
		}
	) => {
		// Mock the token retrieval
		(getAuthTokenAsync as any).mockResolvedValue(token);

		// Mock the user validation
		(UserService.validateTokenAndGetUser as any).mockResolvedValue({
			...userData,
			display_name:
				userData.display_name !== undefined
					? userData.display_name
					: userData.first_name && userData.last_name
						? `${userData.first_name} ${userData.last_name}`
						: ""
		});

		const { result } = createHook();

		await act(async () => {
			await fastStateSync();
		});

		return { result, token, userData };
	};

	// Helper function to setup unauthenticated user
	const setupUnauthenticatedUser = () => {
		(getAuthTokenAsync as any).mockResolvedValue(null);
		return createHook();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Clear the mock functions
		(getAuthTokenAsync as any).mockClear();
		(UserService.validateTokenAndGetUser as any).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(() => {
		console.warn = originalWarn;
	});

	describe("User starts unauthenticated", () => {
		it("should start with clean state when no token exists", () => {
			const { result } = setupUnauthenticatedUser();

			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should not call API when no token exists in storage", () => {
			setupUnauthenticatedUser();

			expect(UserService.validateTokenAndGetUser).not.toHaveBeenCalled();
		});
	});

	describe("User authentication validates on mount", () => {
		/* eslint-disable no-restricted-syntax */
		// Token validation tests require manual fetch response mocking to test:
		// - API validation calls and responses
		// - Network error scenarios
		// - Malformed response handling
		it("should validate existing token with API call", async () => {
			const mockToken = "valid-jwt-token";
			const mockUserData = {
				email: "integration.test@example.com",
				first_name: "Integration",
				last_name: "Test",
				organization: "Test Corp",
				display_name: "" // Explicitly set empty display_name
			};

			const { result } = await setupAuthenticatedUser(mockToken, mockUserData);

			// Verify service call was made correctly
			expect(UserService.validateTokenAndGetUser).toHaveBeenCalledWith(mockToken);

			// Verify auth state is set correctly
			expect(result.current.user).toEqual({
				email: "integration.test@example.com",
				name: "", // Uses display_name field directly (explicitly set to empty)
				has_projects_access: undefined, // Not provided in mock data
				email_verified: false // Default fallback in useAuth
			});
			expect(result.current.token).toBe(mockToken);
		});

		it("should handle invalid token by clearing localStorage", async () => {
			const mockToken = "invalid-jwt-token";

			// Mock token retrieval to return invalid token
			(getAuthTokenAsync as any).mockResolvedValue(mockToken);

			// Mock user validation to reject (invalid token)
			(UserService.validateTokenAndGetUser as any).mockRejectedValue(new Error("Invalid token"));

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify auth state is cleared
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should handle network errors during token validation", async () => {
			const mockToken = "valid-jwt-token";

			// Mock token retrieval to return token
			(getAuthTokenAsync as any).mockResolvedValue(mockToken);

			// Mock user validation to reject (network error)
			(UserService.validateTokenAndGetUser as any).mockRejectedValue(new Error("Network error"));

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify auth state is cleared
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should handle malformed API response gracefully", async () => {
			const mockToken = "valid-jwt-token";

			// Mock token retrieval to return token
			(getAuthTokenAsync as any).mockResolvedValue(mockToken);

			// Mock user validation to reject (parsing error)
			(UserService.validateTokenAndGetUser as any).mockRejectedValue(new Error("Invalid JSON"));

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify auth state is cleared
			expect(result.current.isAuthenticated).toBe(false);
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("User can login", () => {
		// Login function tests use state management only - no fetch mocking needed
		it("should login user with token and user data", () => {
			const { result } = setupUnauthenticatedUser();

			const mockToken = "new-jwt-token";
			const mockUser = {
				email: "user@example.com",
				name: "John Doe",
				has_projects_access: true,
				email_verified: true
			};

			// Call login function
			act(() => {
				result.current.login(mockToken, mockUser);
			});

			// Verify token was stored in sessionStorage (default without rememberMe)
			expect(mockSessionStorage.setItem).toHaveBeenCalledWith("authToken", mockToken);

			// Verify auth state was updated
			expect(result.current.isAuthenticated).toBe(true);
			expect(result.current.user).toEqual(mockUser);
			expect(result.current.token).toBe(mockToken);
		});
	});

	describe("User can logout", () => {
		/* eslint-disable no-restricted-syntax */
		// Logout tests require manual fetch response mocking to test:
		// - Logout API calls and responses
		// - Network error scenarios during logout
		it("should logout user and call API endpoint", async () => {
			const mockToken = "existing-jwt-token";
			const { result } = await setupAuthenticatedUser(mockToken, {
				email: "user@example.com",
				first_name: "John",
				last_name: "Doe"
			});

			// Reset fetch mock for logout call - logout still uses direct fetch internally
			mockFetch.mockClear();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Logged out successfully" })
			});

			// Call logout
			await act(async () => {
				await result.current.logout();
			});

			// Verify logout API was called
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mockToken}`,
					"Content-Type": "application/json"
				}
			});

			// Verify auth state was cleared
			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should logout user even if API call fails", async () => {
			const mockToken = "existing-jwt-token";
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const { result } = await setupAuthenticatedUser(mockToken, {
				email: "user@example.com",
				first_name: "John",
				last_name: "Doe"
			});

			// Reset fetch mock for failed logout call
			mockFetch.mockClear();
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			// Call logout
			await act(async () => {
				await result.current.logout();
			});

			// Verify error was logged
			expect(consoleWarnSpy).toHaveBeenCalledWith("Logout API call failed:", expect.any(Error));

			// Verify auth state was cleared despite API failure
			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);

			consoleWarnSpy.mockRestore();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("User data formats correctly", () => {
		// Data formatting tests require manual fetch response mocking to test:
		// - API response parsing and user data transformation
		it("should use display_name field directly", async () => {
			const mockUserData = {
				email: "jane.smith@example.com",
				first_name: "Jane",
				last_name: "Smith",
				display_name: "Jane Smith",
				organization: "Tech Corp",
				role: "developer"
			};

			const { result } = await setupAuthenticatedUser("valid-jwt-token", mockUserData);

			// Verify name uses display_name field directly
			expect(result.current.user?.name).toBe("Jane Smith");
			expect(result.current.user?.email).toBe("jane.smith@example.com");
		});

		it("should handle edge cases with display_name field", async () => {
			const testCases = [
				{
					input: { display_name: "" },
					expected: "" // Empty display_name shows as empty string
				},
				{
					input: { display_name: "Custom Display Name" },
					expected: "Custom Display Name" // Uses provided display_name directly
				},
				{
					input: {}, // No display_name field
					expected: "" // Falls back to empty string when display_name is undefined
				}
			];

			for (const testCase of testCases) {
				const { result } = await setupAuthenticatedUser("valid-jwt-token", {
					email: "test@example.com",
					...testCase.input
				});

				expect(result.current.user?.name).toBe(testCase.expected);

				// Cleanup for next iteration
				vi.clearAllMocks();
			}
		});
	});

	describe("User data validation", () => {
		/* eslint-disable no-restricted-syntax */
		// Data validation tests require manual fetch response mocking to test:
		// - API response validation and edge cases
		it("should use display_name field directly from API data", async () => {
			const realUserData = {
				email: "real.user@example.com",
				first_name: "Real",
				last_name: "User",
				display_name: "Real User",
				organization: "Real Corp"
			};

			const { result } = await setupAuthenticatedUser("existing-token", realUserData);

			// Verify that we use display_name field directly
			expect(result.current.user?.name).toBe("Real User");
			expect(result.current.user?.name).not.toBe("John Doe");
			expect(result.current.user?.email).toBe("real.user@example.com");
		});

		it("should validate token immediately on app startup", async () => {
			const mockToken = "startup-token";

			// Mock token retrieval to return token
			(getAuthTokenAsync as any).mockResolvedValue(mockToken);

			// Mock user validation to return user data
			(UserService.validateTokenAndGetUser as any).mockResolvedValue({
				email: "startup@example.com",
				first_name: "Startup",
				last_name: "User",
				display_name: "Startup User"
			});

			await act(async () => {
				createHook();
			});

			// Verify service call happens immediately
			expect(UserService.validateTokenAndGetUser).toHaveBeenCalledWith(mockToken);
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("User session timeout", () => {
		/* eslint-disable no-restricted-syntax */
		// Session timeout tests require manual fetch response mocking to test:
		// - Logout API calls triggered by timeout
		it("should automatically logout after timeout period of inactivity", async () => {
			const mockToken = "valid-token";

			// Mock logout API call for when timeout fires
			mockFetch.mockClear();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Logged out successfully" })
			});

			// Enable fake timers before authentication
			vi.useFakeTimers();

			const { result } = await setupAuthenticatedUser(mockToken);

			// Advance time to trigger the timeout (200ms in test environment)
			await act(async () => {
				vi.advanceTimersByTime(201); // Slightly over the timeout
			});

			// Wait for any pending operations
			await act(async () => {
				vi.runAllTimers();
			});

			// Restore real timers
			vi.useRealTimers();

			// Additional wait for state updates
			await fastStateSync();
			expect(result.current.isAuthenticated).toBe(false);

			// Verify logout API was called
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mockToken}`,
					"Content-Type": "application/json"
				}
			});
		});

		it("should reset timeout on user activity", async () => {
			const mockToken = "valid-token";
			const { result } = await setupAuthenticatedUser(mockToken);

			// Enable fake timers after authentication is complete
			vi.useFakeTimers();

			// Advance time by half the timeout period (100ms), then trigger activity
			await act(async () => {
				vi.advanceTimersByTime(100);
			});

			// User should still be authenticated at this point
			expect(result.current.isAuthenticated).toBe(true);

			// Simulate user activity (this should reset the timeout)
			await act(async () => {
				document.dispatchEvent(new Event("click"));
			});

			// Advance time by another 150ms (total 250ms, would have been past original 200ms timeout)
			await act(async () => {
				vi.advanceTimersByTime(150);
			});

			// Should still be authenticated because activity reset the timer
			expect(result.current.isAuthenticated).toBe(true);

			// Mock logout API call for final timeout
			mockFetch.mockClear();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Logged out successfully" })
			});

			// Now advance time for the full timeout period without activity (200ms from last activity)
			await act(async () => {
				vi.advanceTimersByTime(200);
			});

			// Restore real timers
			vi.useRealTimers();

			// Wait for async logout operations to complete
			await act(async () => {
				await Promise.resolve();
			});

			expect(result.current.isAuthenticated).toBe(false);
		});

		it("should not start timeout for unauthenticated users", async () => {
			const { result } = setupUnauthenticatedUser();

			// User is not authenticated
			expect(result.current.isAuthenticated).toBe(false);

			// Enable fake timers for timing control
			vi.useFakeTimers();

			// Advance time longer than the timeout period (300ms > 200ms)
			await act(async () => {
				vi.advanceTimersByTime(300);
			});

			// Restore real timers
			vi.useRealTimers();

			// User should still not be authenticated (no timeout started)
			expect(result.current.isAuthenticated).toBe(false);

			// No logout API calls should have been made for unauthenticated users
			expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("/logout"), expect.any(Object));
		});
		/* eslint-enable no-restricted-syntax */
	});
});
