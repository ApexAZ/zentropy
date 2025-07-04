/**
 * useAuth Hook Remember Me Integration Tests
 *
 * Tests for the useAuth hook's Remember Me functionality including
 * localStorage vs sessionStorage token storage behavior.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../../hooks/useAuth";

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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useAuth Hook Remember Me Integration", () => {
	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		mockFetch.mockClear();
		mockLocalStorage.getItem.mockReturnValue(null);
		mockLocalStorage.setItem.mockClear();
		mockLocalStorage.removeItem.mockClear();
		mockSessionStorage.getItem.mockReturnValue(null);
		mockSessionStorage.setItem.mockClear();
		mockSessionStorage.removeItem.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("sign in with rememberMe=true stores token in localStorage", () => {
		const { result } = renderHook(() => useAuth());

		const testUser = {
			email: "test@example.com",
			name: "Test User",
			has_projects_access: true,
			email_verified: true
		};

		act(() => {
			result.current.login("test-token-123", testUser, true);
		});

		// Should store in localStorage for persistent sessions
		expect(mockLocalStorage.setItem).toHaveBeenCalledWith("authToken", "test-token-123");
		// Should NOT call access_token anymore (removed in fix)
		expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith("access_token", "test-token-123");

		// Should clear sessionStorage
		expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("authToken");

		// Should update auth state
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toEqual(testUser);
		expect(result.current.token).toBe("test-token-123");
	});

	test("sign in with rememberMe=false stores token in sessionStorage", () => {
		const { result } = renderHook(() => useAuth());

		const testUser = {
			email: "test@example.com",
			name: "Test User",
			has_projects_access: true,
			email_verified: true
		};

		act(() => {
			result.current.login("test-token-456", testUser, false);
		});

		// Should store in sessionStorage for session-only
		expect(mockSessionStorage.setItem).toHaveBeenCalledWith("authToken", "test-token-456");
		// Should NOT call access_token anymore (removed in fix)
		expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith("access_token", "test-token-456");

		// Should clear localStorage authToken
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");

		// Should update auth state
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user).toEqual(testUser);
		expect(result.current.token).toBe("test-token-456");
	});

	test("sign in with default rememberMe (false) stores token in sessionStorage", () => {
		const { result } = renderHook(() => useAuth());

		const testUser = {
			email: "test@example.com",
			name: "Test User",
			has_projects_access: true,
			email_verified: true
		};

		act(() => {
			// Don't pass rememberMe parameter (should default to false)
			result.current.login("test-token-789", testUser);
		});

		// Should store in sessionStorage by default
		expect(mockSessionStorage.setItem).toHaveBeenCalledWith("authToken", "test-token-789");
		// Should NOT call access_token anymore (removed in fix)
		expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith("access_token", "test-token-789");

		// Should clear localStorage authToken
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
	});

	test("logout clears both localStorage and sessionStorage", async () => {
		const { result } = renderHook(() => useAuth());

		// Mock successful sign out response
		mockFetch.mockResolvedValueOnce({
			ok: true
		});

		// Set up authenticated state
		const testUser = {
			email: "test@example.com",
			name: "Test User",
			has_projects_access: true,
			email_verified: true
		};

		act(() => {
			result.current.login("test-token-logout", testUser, true);
		});

		// Clear previous mock calls
		mockLocalStorage.removeItem.mockClear();
		mockSessionStorage.removeItem.mockClear();

		// Sign out
		await act(async () => {
			await result.current.logout();
		});

		// Should clear all token storage locations (access_token removed in fix)
		expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
		expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("authToken");
		// Should NOT call access_token anymore (removed in fix)
		expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith("access_token");

		// Should update auth state
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.user).toBe(null);
		expect(result.current.token).toBe(null);
	});

	test("initialization checks localStorage and sessionStorage for existing tokens", async () => {
		// Mock localStorage having a token
		mockLocalStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "stored-token-123";
			return null;
		});

		// Mock successful token validation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				email: "stored@example.com",
				first_name: "Stored",
				last_name: "User",
				has_projects_access: true,
				email_verified: true
			})
		});

		await act(async () => {
			renderHook(() => useAuth());
			// Wait for the async token validation to complete
			await new Promise(resolve => setTimeout(resolve, 0));
		});

		// Should check new token storage locations (access_token removed in fix)
		expect(mockLocalStorage.getItem).toHaveBeenCalledWith("authToken");
		expect(mockSessionStorage.getItem).toHaveBeenCalledWith("authToken");
		// Should NOT check access_token anymore (removed in fix)
		expect(mockLocalStorage.getItem).not.toHaveBeenCalledWith("access_token");
	});

	test("initialization prioritizes sessionStorage over localStorage for current session", async () => {
		// Mock both storage locations having tokens
		mockSessionStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "session-token-123";
			return null;
		});
		mockLocalStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "local-token-456";
			return null;
		});

		// Mock successful token validation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				email: "stored@example.com",
				first_name: "Stored",
				last_name: "User",
				has_projects_access: true,
				email_verified: true
			})
		});

		await act(async () => {
			renderHook(() => useAuth());
			// Wait for the async token validation to complete
			await new Promise(resolve => setTimeout(resolve, 0));
		});

		// Should prioritize sessionStorage for current session
		expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/me", {
			headers: {
				Authorization: "Bearer session-token-123",
				"Content-Type": "application/json"
			}
		});
	});

	test("initialization falls back to sessionStorage if localStorage is empty", async () => {
		// Mock sessionStorage having a token
		mockSessionStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "session-token-789";
			return null;
		});

		// Mock successful token validation
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				email: "session@example.com",
				first_name: "Session",
				last_name: "User",
				has_projects_access: true,
				email_verified: true
			})
		});

		await act(async () => {
			renderHook(() => useAuth());
			// Wait for the async token validation to complete
			await new Promise(resolve => setTimeout(resolve, 0));
		});

		// Should use sessionStorage token
		expect(mockFetch).toHaveBeenCalledWith("/api/v1/users/me", {
			headers: {
				Authorization: "Bearer session-token-789",
				"Content-Type": "application/json"
			}
		});
	});
});
