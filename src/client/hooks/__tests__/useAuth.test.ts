import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import "@testing-library/jest-dom";
import { useAuth } from "../useAuth";

// Mock fetch for API calls
const mockFetch = vi.fn();
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
		userData = {
			email: "test@example.com",
			first_name: "Test",
			last_name: "User"
		}
	) => {
		mockLocalStorage.getItem.mockReturnValue(token);
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => userData
		});

		const { result } = createHook();

		await act(async () => {
			await Promise.resolve();
		});

		return { result, token, userData };
	};

	// Helper function to setup unauthenticated user
	const setupUnauthenticatedUser = () => {
		mockLocalStorage.getItem.mockReturnValue(null);
		mockSessionStorage.getItem.mockReturnValue(null);
		return createHook();
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.getItem.mockClear();
		mockLocalStorage.setItem.mockClear();
		mockLocalStorage.removeItem.mockClear();
		mockSessionStorage.getItem.mockClear();
		mockSessionStorage.setItem.mockClear();
		mockSessionStorage.removeItem.mockClear();
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

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe("User authentication validates on mount", () => {
		it("should validate existing token with API call", async () => {
			const mockToken = "valid-jwt-token";
			const mockUserData = {
				email: "integration.test@example.com",
				first_name: "Integration",
				last_name: "Test",
				organization: "Test Corp"
			};

			const { result } = await setupAuthenticatedUser(mockToken, mockUserData);

			// Verify API call was made correctly
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/me", {
				headers: {
					Authorization: `Bearer ${mockToken}`,
					"Content-Type": "application/json"
				}
			});

			// Verify auth state is set correctly
			expect(result.current.user).toEqual({
				email: "integration.test@example.com",
				name: "Integration Test", // first_name + last_name
				has_projects_access: undefined, // Not provided in mock data
				email_verified: false // Default fallback in useAuth
			});
			expect(result.current.token).toBe(mockToken);
		});

		it("should handle invalid token by clearing localStorage", async () => {
			const mockToken = "invalid-jwt-token";

			mockLocalStorage.getItem.mockReturnValue(mockToken);
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401
			});

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify token was removed from localStorage
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");

			// Verify auth state is cleared
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should handle network errors during token validation", async () => {
			const mockToken = "valid-jwt-token";

			mockLocalStorage.getItem.mockReturnValue(mockToken);
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify token was removed due to validation failure
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");

			// Verify auth state is cleared
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);
		});

		it("should handle malformed API response gracefully", async () => {
			const mockToken = "valid-jwt-token";

			mockLocalStorage.getItem.mockReturnValue(mockToken);
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				}
			});

			const { result } = createHook();

			await act(async () => {
				await Promise.resolve();
			});

			// Verify auth state is cleared
			expect(result.current.isAuthenticated).toBe(false);

			// Verify token was removed due to parsing error
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
		});
	});

	describe("User can login", () => {
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
		it("should logout user and call API endpoint", async () => {
			const mockToken = "existing-jwt-token";
			const { result } = await setupAuthenticatedUser(mockToken, {
				email: "user@example.com",
				first_name: "John",
				last_name: "Doe"
			});

			// Reset fetch mock for logout call
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

			// Verify tokens were removed from both storage locations
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("authToken");

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

			// Verify token was still removed despite API failure
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");

			// Verify auth state was cleared despite API failure
			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.user).toBe(null);
			expect(result.current.token).toBe(null);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("User data formats correctly", () => {
		it("should properly format first_name and last_name as display name", async () => {
			const mockUserData = {
				email: "jane.smith@example.com",
				first_name: "Jane",
				last_name: "Smith",
				organization: "Tech Corp",
				role: "developer"
			};

			const { result } = await setupAuthenticatedUser("valid-jwt-token", mockUserData);

			// Verify name is properly formatted as "First Last"
			expect(result.current.user?.name).toBe("Jane Smith");
			expect(result.current.user?.email).toBe("jane.smith@example.com");
		});

		it("should handle edge cases in name formatting", async () => {
			const testCases = [
				{
					input: { first_name: "", last_name: "Smith" },
					expected: " Smith"
				},
				{
					input: { first_name: "Jane", last_name: "" },
					expected: "Jane "
				},
				{
					input: { first_name: "Jean-Luc", last_name: "Picard" },
					expected: "Jean-Luc Picard"
				}
			];

			for (const testCase of testCases) {
				const { result } = await setupAuthenticatedUser("valid-jwt-token", {
					email: "test@example.com",
					...testCase.input
				});

				expect(result.current.user?.name).toBe(testCase.expected);

				// Cleanup for next iteration
				mockFetch.mockClear();
			}
		});
	});

	describe("User data validation", () => {
		it("should prevent 'John Doe' hardcoded fallback by using real API data", async () => {
			const realUserData = {
				email: "real.user@example.com",
				first_name: "Real",
				last_name: "User",
				organization: "Real Corp"
			};

			const { result } = await setupAuthenticatedUser("existing-token", realUserData);

			// Verify that we get real user data, NOT "John Doe"
			expect(result.current.user?.name).toBe("Real User");
			expect(result.current.user?.name).not.toBe("John Doe");
			expect(result.current.user?.email).toBe("real.user@example.com");
		});

		it("should validate token immediately on app startup", async () => {
			const mockToken = "startup-token";

			mockLocalStorage.getItem.mockReturnValue(mockToken);
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					email: "startup@example.com",
					first_name: "Startup",
					last_name: "User"
				})
			});

			await act(async () => {
				createHook();
			});

			// Verify API call happens immediately
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/me", {
				headers: {
					Authorization: `Bearer ${mockToken}`,
					"Content-Type": "application/json"
				}
			});
		});
	});

	describe("User session timeout", () => {
		it("should automatically logout after timeout period of inactivity", async () => {
			const mockToken = "valid-token";
			const { result } = await setupAuthenticatedUser(mockToken);

			// Mock logout API call for when timeout fires
			mockFetch.mockClear();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message: "Logged out successfully" })
			});

			// Enable fake timers after authentication is complete
			vi.useFakeTimers();

			// Advance time to trigger the timeout (200ms in test environment)
			await act(async () => {
				vi.advanceTimersByTime(200);
			});

			// Restore real timers
			vi.useRealTimers();

			// Wait for async logout operations to complete
			await waitFor(() => {
				expect(result.current.isAuthenticated).toBe(false);
			});

			// Verify logout API was called
			expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${mockToken}`,
					"Content-Type": "application/json"
				}
			});

			// Verify tokens were removed from both storage locations
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("authToken");
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
	});
});
