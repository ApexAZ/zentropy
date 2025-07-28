/**
 * useAuth Hook Remember Me Integration Tests
 *
 * Tests for the useAuth hook's Remember Me functionality including
 * localStorage vs sessionStorage token storage behavior.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../../hooks/useAuth";
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
// eslint-disable-next-line no-restricted-syntax -- Remember me integration tests require global fetch mocking for auth flow testing
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
		// Clear the service mocks
		(getAuthTokenAsync as any).mockClear();
		(UserService.validateTokenAndGetUser as any).mockClear();
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

	test("user remains logged in after browser refresh when 'remember me' was selected", async () => {
		// Simulate user has previously logged in with "remember me" option
		mockLocalStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "stored-token-123";
			return null;
		});

		// Mock token retrieval to return stored token
		(getAuthTokenAsync as any).mockResolvedValue("stored-token-123");

		// Mock successful token validation - user should still be valid
		(UserService.validateTokenAndGetUser as any).mockResolvedValue({
			email: "stored@example.com",
			first_name: "Stored",
			last_name: "User",
			display_name: "Stored User",
			has_projects_access: true,
			email_verified: true
		});

		const { result } = renderHook(() => useAuth());

		// User should be automatically logged in after refresh
		await fastStateSync();
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user?.email).toBe("stored@example.com");
		expect(result.current.user?.name).toBe("Stored User");
	});

	test("user stays logged in during browser session even without 'remember me'", async () => {
		// Simulate user logged in during current session (sessionStorage only)
		mockSessionStorage.getItem.mockImplementation(key => {
			if (key === "authToken") return "session-token-123";
			return null;
		});
		// No localStorage token (user didn't check "remember me")
		mockLocalStorage.getItem.mockReturnValue(null);

		// Mock token retrieval to return session token
		(getAuthTokenAsync as any).mockResolvedValue("session-token-123");

		// Mock successful token validation
		(UserService.validateTokenAndGetUser as any).mockResolvedValue({
			email: "session@example.com",
			first_name: "Session",
			last_name: "User",
			display_name: "Session User",
			has_projects_access: true,
			email_verified: true
		});

		const { result } = renderHook(() => useAuth());

		// User should remain authenticated during session
		await fastStateSync();
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.user?.email).toBe("session@example.com");
		expect(result.current.user?.name).toBe("Session User");
	});

	test("user without saved authentication starts as logged out", async () => {
		// Simulate fresh browser session - no saved tokens anywhere
		mockSessionStorage.getItem.mockReturnValue(null);
		mockLocalStorage.getItem.mockReturnValue(null);
		(getAuthTokenAsync as any).mockResolvedValue(null);

		const { result } = renderHook(() => useAuth());

		// User should start unauthenticated and no API calls should be made
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.user).toBe(null);
		expect(result.current.token).toBe(null);

		// No token validation calls should be made without a token
		expect(UserService.validateTokenAndGetUser).not.toHaveBeenCalled();
	});
});
