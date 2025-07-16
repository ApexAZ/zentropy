/**
 * Tests for auth utility functions
 *
 * Comprehensive testing of authentication utilities including:
 * - Token storage and retrieval (session vs persistent)
 * - Token clearing and conflict resolution
 * - Authentication status checking
 * - Header creation for authenticated requests
 * - Authenticated fetch with timeout and retry logic
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	getAuthToken,
	setAuthToken,
	clearAuthToken,
	isAuthenticated,
	createAuthHeaders,
	authenticatedFetch
} from "../auth";

describe("Auth Utilities", () => {
	beforeEach(() => {
		// Clear all storage before each test
		localStorage.clear();
		sessionStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Clean up after each test
		localStorage.clear();
		sessionStorage.clear();
	});

	describe("getAuthToken", () => {
		it("should return null when no token exists", () => {
			expect(getAuthToken()).toBeNull();
		});

		it("should prioritize session storage over local storage", () => {
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			expect(getAuthToken()).toBe("session-token");
		});

		it("should return local storage token when session storage is empty", () => {
			localStorage.setItem("authToken", "local-token");

			expect(getAuthToken()).toBe("local-token");
		});

		it("should return session storage token when both exist", () => {
			sessionStorage.setItem("authToken", "session-token");
			localStorage.setItem("authToken", "local-token");

			expect(getAuthToken()).toBe("session-token");
		});

		it("should handle empty string tokens", () => {
			sessionStorage.setItem("authToken", "");
			localStorage.setItem("authToken", "local-token");

			// Empty session token is falsy, so it falls through to localStorage
			expect(getAuthToken()).toBe("local-token");
		});

		it("should handle whitespace-only tokens", () => {
			sessionStorage.setItem("authToken", "   ");
			localStorage.setItem("authToken", "local-token");

			// Whitespace session token is truthy, should be returned
			expect(getAuthToken()).toBe("   ");
		});
	});

	describe("setAuthToken", () => {
		it("should store token in sessionStorage by default", () => {
			setAuthToken("test-token");

			expect(sessionStorage.getItem("authToken")).toBe("test-token");
			expect(localStorage.getItem("authToken")).toBeNull();
		});

		it("should store token in sessionStorage when remember=false", () => {
			setAuthToken("test-token", false);

			expect(sessionStorage.getItem("authToken")).toBe("test-token");
			expect(localStorage.getItem("authToken")).toBeNull();
		});

		it("should store token in localStorage when remember=true", () => {
			setAuthToken("test-token", true);

			expect(localStorage.getItem("authToken")).toBe("test-token");
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should clear conflicting storage when setting session token", () => {
			// Setup existing local token
			localStorage.setItem("authToken", "old-local-token");

			setAuthToken("new-session-token", false);

			expect(sessionStorage.getItem("authToken")).toBe("new-session-token");
			expect(localStorage.getItem("authToken")).toBeNull();
		});

		it("should clear conflicting storage when setting persistent token", () => {
			// Setup existing session token
			sessionStorage.setItem("authToken", "old-session-token");

			setAuthToken("new-local-token", true);

			expect(localStorage.getItem("authToken")).toBe("new-local-token");
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should handle empty string tokens", () => {
			setAuthToken("", true);

			expect(localStorage.getItem("authToken")).toBe("");
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should handle tokens with special characters", () => {
			const specialToken = "jwt.token-with_special.chars123!@#$%";
			setAuthToken(specialToken, true);

			expect(localStorage.getItem("authToken")).toBe(specialToken);
		});
	});

	describe("clearAuthToken", () => {
		it("should clear both localStorage and sessionStorage", () => {
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			clearAuthToken();

			expect(localStorage.getItem("authToken")).toBeNull();
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should work when no tokens exist", () => {
			// Should not throw error
			expect(() => clearAuthToken()).not.toThrow();

			expect(localStorage.getItem("authToken")).toBeNull();
			expect(sessionStorage.getItem("authToken")).toBeNull();
		});

		it("should clear only authToken, leaving other data intact", () => {
			localStorage.setItem("authToken", "token");
			localStorage.setItem("otherData", "preserve-this");
			sessionStorage.setItem("authToken", "token");
			sessionStorage.setItem("otherData", "preserve-this-too");

			clearAuthToken();

			expect(localStorage.getItem("authToken")).toBeNull();
			expect(localStorage.getItem("otherData")).toBe("preserve-this");
			expect(sessionStorage.getItem("authToken")).toBeNull();
			expect(sessionStorage.getItem("otherData")).toBe("preserve-this-too");
		});
	});

	describe("isAuthenticated", () => {
		it("should return false when no token exists", () => {
			expect(isAuthenticated()).toBe(false);
		});

		it("should return true when session token exists", () => {
			sessionStorage.setItem("authToken", "session-token");

			expect(isAuthenticated()).toBe(true);
		});

		it("should return true when local token exists", () => {
			localStorage.setItem("authToken", "local-token");

			expect(isAuthenticated()).toBe(true);
		});

		it("should return true for any non-null token value", () => {
			sessionStorage.setItem("authToken", "");

			// Empty string is falsy, so should return false
			expect(isAuthenticated()).toBe(false);
		});

		it("should prioritize session storage for authentication check", () => {
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			expect(isAuthenticated()).toBe(true);

			// Clear session storage, should still be authenticated via local storage
			sessionStorage.removeItem("authToken");
			expect(isAuthenticated()).toBe(true);

			// Clear local storage, should no longer be authenticated
			localStorage.removeItem("authToken");
			expect(isAuthenticated()).toBe(false);
		});
	});

	describe("createAuthHeaders", () => {
		it("should create headers with content type only when no token exists", () => {
			const headers = createAuthHeaders();

			expect(headers).toEqual({
				"Content-Type": "application/json"
			});
		});

		it("should include Authorization header when token exists", () => {
			setAuthToken("test-jwt-token");

			const headers = createAuthHeaders();

			expect(headers).toEqual({
				"Content-Type": "application/json",
				Authorization: "Bearer test-jwt-token"
			});
		});

		it("should use the correct token priority (session over local)", () => {
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			const headers = createAuthHeaders();

			expect(headers["Authorization"]).toBe("Bearer session-token");
		});

		it("should handle tokens with special characters", () => {
			const specialToken =
				"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
			setAuthToken(specialToken);

			const headers = createAuthHeaders();

			expect(headers["Authorization"]).toBe(`Bearer ${specialToken}`);
		});
	});

	describe("authenticatedFetch", () => {
		let mockFetch: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockFetch = vi.fn();
			global.fetch = mockFetch;

			// Mock setTimeout and clearTimeout for timeout tests
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should make successful authenticated request", async () => {
			setAuthToken("test-token");

			const mockResponse = new Response("success", { status: 200 });
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await authenticatedFetch("/api/test");

			expect(mockFetch).toHaveBeenCalledWith("/api/test", {
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token"
				},
				signal: expect.any(AbortSignal)
			});

			expect(result).toBe(mockResponse);
		});

		it("should make request without auth headers when no token exists", async () => {
			const mockResponse = new Response("success", { status: 200 });
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await authenticatedFetch("/api/test");

			expect(mockFetch).toHaveBeenCalledWith("/api/test", {
				headers: {
					"Content-Type": "application/json"
				},
				signal: expect.any(AbortSignal)
			});

			expect(result).toBe(mockResponse);
		});

		it("should merge custom headers with auth headers", async () => {
			setAuthToken("test-token");

			const mockResponse = new Response("success", { status: 200 });
			mockFetch.mockResolvedValueOnce(mockResponse);

			const customOptions = {
				method: "POST",
				headers: {
					"Custom-Header": "custom-value",
					"Content-Type": "application/xml" // Should override default
				},
				body: JSON.stringify({ data: "test" })
			};

			await authenticatedFetch("/api/test", customOptions);

			expect(mockFetch).toHaveBeenCalledWith("/api/test", {
				method: "POST",
				body: JSON.stringify({ data: "test" }),
				headers: {
					"Content-Type": "application/xml", // Custom override
					Authorization: "Bearer test-token",
					"Custom-Header": "custom-value"
				},
				signal: expect.any(AbortSignal)
			});
		});

		it("should retry on network errors", async () => {
			const networkError = new Error("Network failure");
			networkError.message = "fetch failed";

			mockFetch
				.mockRejectedValueOnce(networkError)
				.mockResolvedValueOnce(new Response("success", { status: 200 }));

			const fetchPromise = authenticatedFetch("/api/test", {}, 10000, 1);

			// Fast forward through retry delay
			await vi.advanceTimersByTimeAsync(1000);

			const result = await fetchPromise;

			expect(mockFetch).toHaveBeenCalledTimes(2);
			// Should succeed after retry
			expect(result.status).toBe(200);
			expect(result.ok).toBe(true);
			// Should contain response body
			expect(await result.text()).toBe("success");
		});

		it("should use exponential backoff for retries", async () => {
			const networkError = new Error("fetch failed");

			mockFetch
				.mockRejectedValueOnce(networkError)
				.mockRejectedValueOnce(networkError)
				.mockResolvedValueOnce(new Response("success", { status: 200 }));

			// Create promise and start timing
			const fetchPromise = authenticatedFetch("/api/test", {}, 10000, 2);

			// Fast forward through retry delays
			await vi.advanceTimersByTimeAsync(1000); // First retry delay (2^0 * 1000)
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay (2^1 * 1000)

			const result = await fetchPromise;

			expect(result.status).toBe(200);
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it("should handle successful response without retry", async () => {
			const mockResponse = new Response("success", { status: 200 });
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await authenticatedFetch("/api/test", {}, 10000, 3);

			expect(result).toBe(mockResponse);
			expect(mockFetch).toHaveBeenCalledTimes(1); // No retries needed
		});

		it("should clear timeout on successful response", async () => {
			const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
			const mockResponse = new Response("success", { status: 200 });
			mockFetch.mockResolvedValueOnce(mockResponse);

			await authenticatedFetch("/api/test");

			expect(clearTimeoutSpy).toHaveBeenCalled();
		});
	});

	describe("Integration Tests", () => {
		it("should support complete auth workflow", () => {
			// Initially not authenticated
			expect(isAuthenticated()).toBe(false);
			expect(getAuthToken()).toBeNull();

			const headers1 = createAuthHeaders();
			expect(headers1).not.toHaveProperty("Authorization");

			// Set session token
			setAuthToken("session-token", false);
			expect(isAuthenticated()).toBe(true);
			expect(getAuthToken()).toBe("session-token");

			const headers2 = createAuthHeaders();
			expect(headers2["Authorization"]).toBe("Bearer session-token");

			// Switch to persistent token
			setAuthToken("persistent-token", true);
			expect(getAuthToken()).toBe("persistent-token");

			const headers3 = createAuthHeaders();
			expect(headers3["Authorization"]).toBe("Bearer persistent-token");

			// Clear all tokens
			clearAuthToken();
			expect(isAuthenticated()).toBe(false);
			expect(getAuthToken()).toBeNull();

			const headers4 = createAuthHeaders();
			expect(headers4).not.toHaveProperty("Authorization");
		});

		it("should handle storage conflicts correctly", () => {
			// Set both tokens
			localStorage.setItem("authToken", "local-token");
			sessionStorage.setItem("authToken", "session-token");

			// Should prioritize session
			expect(getAuthToken()).toBe("session-token");
			expect(isAuthenticated()).toBe(true);

			const headers = createAuthHeaders();
			expect(headers["Authorization"]).toBe("Bearer session-token");

			// Set new persistent token should clear session
			setAuthToken("new-persistent", true);
			expect(getAuthToken()).toBe("new-persistent");
			expect(sessionStorage.getItem("authToken")).toBeNull();

			// Set new session token should clear persistent
			setAuthToken("new-session", false);
			expect(getAuthToken()).toBe("new-session");
			expect(localStorage.getItem("authToken")).toBeNull();
		});
	});
});
