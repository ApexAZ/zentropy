/**
 * Authentication Utilities Tests
 * Following hybrid testing approach - testing pure functions and security-critical logic
 * TDD implementation with comprehensive edge case coverage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// Mock fetch globally for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window and location objects
const mockLocation = {
	href: "",
	origin: "https://example.com",
	pathname: "/teams.html",
	search: ""
};

const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

// Mock global window object for Node.js environment
Object.defineProperty(global, "window", {
	value: {
		location: mockLocation,
		sessionStorage: mockSessionStorage
	},
	writable: true
});

// Mock sessionStorage specifically
Object.defineProperty(global, "sessionStorage", {
	value: mockSessionStorage,
	writable: true
});

// Mock document for DOM operations
Object.defineProperty(global, "document", {
	value: {
		getElementById: vi.fn(),
		createElement: vi.fn(),
		body: {
			appendChild: vi.fn(),
			querySelector: vi.fn()
		}
	},
	writable: true
});

// Import the functions we're testing (will fail initially - TDD Red phase)
import {
	checkSessionStatus,
	redirectToLogin,
	handleAuthError,
	isSessionExpired,
	getSessionInfo,
	clearSessionInfo,
	buildReturnUrl,
	validateReturnUrl,
	showSessionWarning,
	hideSessionWarning,
	type AuthError
} from "../../utils/auth-utils";

describe("Session Status Checking", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";
		mockLocation.search = "";
		mockSessionStorage.clear();
		mockSessionStorage.getItem.mockClear();
		mockSessionStorage.setItem.mockClear();
		mockSessionStorage.removeItem.mockClear();
	});

	describe("checkSessionStatus", () => {
		it("should return valid session when API responds with 200", async () => {
			// ARRANGE
			const mockUserData = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ user: mockUserData })
			});

			// ACT
			const result = await checkSessionStatus();

			// ASSERT
			expect(result.isValid).toBe(true);
			expect(result.user).toEqual(mockUserData);
			expect(mockFetch).toHaveBeenCalledWith("/api/users/session", {
				method: "GET",
				credentials: "include"
			});
		});

		it("should return invalid session when API responds with 401", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ message: "Unauthorized" })
			});

			// ACT
			const result = await checkSessionStatus();

			// ASSERT
			expect(result.isValid).toBe(false);
			expect(result.user).toBeNull();
			expect(result.error).toBe("Unauthorized");
		});

		it("should handle network errors gracefully", async () => {
			// ARRANGE
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			// ACT
			const result = await checkSessionStatus();

			// ASSERT
			expect(result.isValid).toBe(false);
			expect(result.user).toBeNull();
			expect(result.error).toBe("Network error");
		});

		it("should handle session timeout (419 status)", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 419,
				json: () => Promise.resolve({ message: "Session expired" })
			});

			// ACT
			const result = await checkSessionStatus();

			// ASSERT
			expect(result.isValid).toBe(false);
			expect(result.user).toBeNull();
			expect(result.error).toBe("Session expired");
			expect(result.expired).toBe(true);
		});

		it("should handle server errors (500 status)", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({ message: "Internal server error" })
			});

			// ACT
			const result = await checkSessionStatus();

			// ASSERT
			expect(result.isValid).toBe(false);
			expect(result.user).toBeNull();
			expect(result.error).toBe("Internal server error");
		});
	});

	describe("isSessionExpired", () => {
		it("should return true when last check was more than session duration ago", () => {
			// ARRANGE
			const lastCheck = Date.now() - 25 * 60 * 1000; // 25 minutes ago
			const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

			// ACT
			const result = isSessionExpired(lastCheck, sessionDuration);

			// ASSERT
			expect(result).toBe(false); // 25 minutes is still valid for 24 hour session
		});

		it("should return true when session duration has passed", () => {
			// ARRANGE
			const lastCheck = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
			const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

			// ACT
			const result = isSessionExpired(lastCheck, sessionDuration);

			// ASSERT
			expect(result).toBe(true);
		});

		it("should handle edge case of exactly expired session", () => {
			// ARRANGE
			const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
			const lastCheck = Date.now() - sessionDuration; // Exactly 24 hours ago

			// ACT
			const result = isSessionExpired(lastCheck, sessionDuration);

			// ASSERT
			expect(result).toBe(true);
		});
	});
});

describe("Session Data Management", () => {
	beforeEach(() => {
		// Clear session storage mocks
		vi.clearAllMocks();
		mockSessionStorage.clear();
	});

	describe("getSessionInfo", () => {
		it("should return null when no session data exists", () => {
			// ARRANGE
			mockSessionStorage.getItem.mockReturnValue(null);

			// ACT
			const result = getSessionInfo();

			// ASSERT
			expect(result).toBeNull();
		});

		it("should return parsed session data when valid data exists", () => {
			// ARRANGE
			const sessionData = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member",
				lastCheck: Date.now()
			};
			mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

			// ACT
			const result = getSessionInfo();

			// ASSERT
			expect(result).toEqual(sessionData);
		});

		it("should return null when session data is invalid JSON", () => {
			// ARRANGE
			mockSessionStorage.getItem.mockReturnValue("invalid-json");

			// ACT
			const result = getSessionInfo();

			// ASSERT
			expect(result).toBeNull();
		});

		it("should return null when session data is empty string", () => {
			// ARRANGE
			mockSessionStorage.getItem.mockReturnValue("");

			// ACT
			const result = getSessionInfo();

			// ASSERT
			expect(result).toBeNull();
		});
	});

	describe("clearSessionInfo", () => {
		it("should remove session data from sessionStorage", () => {
			// ACT
			clearSessionInfo();

			// ASSERT
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
		});

		it("should handle when no session data exists", () => {
			// ACT & ASSERT - should not throw error
			expect(() => clearSessionInfo()).not.toThrow();
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
		});
	});
});

describe("URL and Redirect Management", () => {
	beforeEach(() => {
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";
		mockLocation.search = "";
		mockLocation.origin = "https://example.com";
	});

	describe("buildReturnUrl", () => {
		it("should build return URL with current page path", () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";

			// ACT
			const result = buildReturnUrl();

			// ASSERT
			expect(result).toBe("/login.html?return=%2Fteams.html");
		});

		it("should include query parameters in return URL", () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";
			mockLocation.search = "?id=123&tab=members";

			// ACT
			const result = buildReturnUrl();

			// ASSERT
			expect(result).toBe("/login.html?return=%2Fteams.html%3Fid%3D123%26tab%3Dmembers");
		});

		it("should handle root path correctly", () => {
			// ARRANGE
			mockLocation.pathname = "/";

			// ACT
			const result = buildReturnUrl();

			// ASSERT
			expect(result).toBe("/login.html?return=%2F");
		});

		it("should not include login.html in return URL to prevent loops", () => {
			// ARRANGE
			mockLocation.pathname = "/login.html";

			// ACT
			const result = buildReturnUrl();

			// ASSERT
			expect(result).toBe("/login.html"); // No return parameter
		});
	});

	describe("validateReturnUrl", () => {
		it("should return true for valid relative URLs", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("/teams.html")).toBe(true);
			expect(validateReturnUrl("/calendar.html")).toBe(true);
			expect(validateReturnUrl("/team-configuration.html")).toBe(true);
		});

		it("should return false for absolute URLs to different origins", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("https://evil.com/page")).toBe(false);
			expect(validateReturnUrl("http://malicious.site/")).toBe(false);
		});

		it("should return false for protocol-relative URLs", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("//evil.com/page")).toBe(false);
			expect(validateReturnUrl("//malicious.site")).toBe(false);
		});

		it("should return false for javascript: protocol", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("javascript:alert('xss')")).toBe(false);
		});

		it("should return false for data: protocol", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("data:text/html,<script>alert('xss')</script>")).toBe(false);
		});

		it("should return true for same-origin absolute URLs", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("https://example.com/teams.html")).toBe(true);
			expect(validateReturnUrl("https://example.com/calendar.html")).toBe(true);
		});

		it("should handle malformed URLs gracefully", () => {
			// ACT & ASSERT
			expect(validateReturnUrl("not-a-valid-url")).toBe(false);
			expect(validateReturnUrl("")).toBe(false);
			expect(validateReturnUrl("   ")).toBe(false);
		});
	});

	describe("redirectToLogin", () => {
		it("should redirect to login page with return URL", () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";

			// ACT
			redirectToLogin();

			// ASSERT
			expect(mockLocation.href).toBe("/login.html?return=%2Fteams.html");
		});

		it("should redirect to login page with custom message", () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";

			// ACT
			redirectToLogin("Session expired. Please log in again.");

			// ASSERT
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fteams.html&message=Session%20expired.%20Please%20log%20in%20again."
			);
		});

		it("should handle when current page is already login", () => {
			// ARRANGE
			mockLocation.pathname = "/login.html";

			// ACT
			redirectToLogin();

			// ASSERT
			expect(mockLocation.href).toBe("/login.html");
		});
	});
});

describe("Error Handling", () => {
	describe("handleAuthError", () => {
		beforeEach(() => {
			// Reset location for each test in this group
			mockLocation.href = "";
			mockLocation.pathname = "/teams.html";
		});

		it("should clear session and redirect for expired session", () => {
			// ARRANGE
			const error: AuthError = {
				type: "expired",
				message: "Session expired",
				redirectRequired: true
			};

			// ACT
			handleAuthError(error);

			// ASSERT
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			expect(mockLocation.href).toBe("/login.html?return=%2Fteams.html&message=Session%20expired");
		});

		it("should handle unauthorized error without redirect", () => {
			// ARRANGE
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const error: AuthError = {
				type: "unauthorized",
				message: "Access denied",
				redirectRequired: false
			};

			// ACT
			handleAuthError(error);

			// ASSERT
			expect(consoleSpy).toHaveBeenCalledWith("Auth error:", error.message);
			expect(mockLocation.href).toBe(""); // No redirect

			// Cleanup
			consoleSpy.mockRestore();
		});

		it("should handle network errors gracefully", () => {
			// ARRANGE
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const error: AuthError = {
				type: "network",
				message: "Network error",
				redirectRequired: false
			};

			// ACT
			handleAuthError(error);

			// ASSERT
			expect(consoleSpy).toHaveBeenCalledWith("Network error during authentication:", error.message);

			// Cleanup
			consoleSpy.mockRestore();
		});
	});
});

describe("Session Warning System", () => {
	// Mock DOM elements
	let mockWarningElement: {
		style: { display: string };
		textContent: string;
		id?: string;
		className?: string;
		remove: Mock;
	};
	let mockDocument: {
		getElementById: Mock;
		createElement: Mock;
		body: {
			appendChild: Mock;
			querySelector: Mock;
		};
	};

	beforeEach(() => {
		// Create mock warning element
		mockWarningElement = {
			style: { display: "none" },
			textContent: "",
			remove: vi.fn()
		};

		// Create mock document
		mockDocument = {
			getElementById: vi.fn().mockReturnValue(mockWarningElement),
			createElement: vi.fn().mockReturnValue(mockWarningElement),
			body: {
				appendChild: vi.fn(),
				querySelector: vi.fn(() => mockWarningElement)
			}
		};

		// Update global document mock
		Object.defineProperty(global, "document", {
			value: mockDocument,
			writable: true
		});
	});

	describe("showSessionWarning", () => {
		it("should create and display session warning with default message", () => {
			// ACT
			showSessionWarning();

			// ASSERT
			expect(mockWarningElement.style.display).toBe("block");
			expect(mockWarningElement.textContent).toContain("Your session will expire in 5 minutes");
		});

		it("should display custom warning message", () => {
			// ACT
			showSessionWarning("Custom warning message", 10);

			// ASSERT
			expect(mockWarningElement.style.display).toBe("block");
			expect(mockWarningElement.textContent).toContain("Custom warning message");
		});

		it("should handle when warning element doesn't exist", () => {
			// ARRANGE
			mockDocument.getElementById.mockReturnValue(null);

			// ACT & ASSERT - should not throw error
			expect(() => showSessionWarning()).not.toThrow();
		});
	});

	describe("hideSessionWarning", () => {
		it("should hide existing session warning", () => {
			// ARRANGE
			mockWarningElement.style.display = "block";

			// ACT
			hideSessionWarning();

			// ASSERT
			expect(mockWarningElement.style.display).toBe("none");
		});

		it("should handle when warning element doesn't exist", () => {
			// ARRANGE
			mockDocument.getElementById.mockReturnValue(null);

			// ACT & ASSERT - should not throw error
			expect(() => hideSessionWarning()).not.toThrow();
		});
	});
});

describe("Security Edge Cases", () => {
	describe("XSS Prevention in URLs", () => {
		it("should reject URLs with javascript protocol", () => {
			expect(validateReturnUrl("javascript:alert('xss')")).toBe(false);
			expect(validateReturnUrl("JAVASCRIPT:alert('xss')")).toBe(false);
			expect(validateReturnUrl("Javascript:alert('xss')")).toBe(false);
		});

		it("should reject URLs with data protocol", () => {
			expect(validateReturnUrl("data:text/html,<script>alert('xss')</script>")).toBe(false);
			expect(validateReturnUrl("DATA:text/html,malicious")).toBe(false);
		});

		it("should reject URLs with vbscript protocol", () => {
			expect(validateReturnUrl("vbscript:msgbox('xss')")).toBe(false);
			expect(validateReturnUrl("VBSCRIPT:msgbox('xss')")).toBe(false);
		});
	});

	describe("Open Redirect Prevention", () => {
		it("should reject external domains", () => {
			expect(validateReturnUrl("https://evil.com/login")).toBe(false);
			expect(validateReturnUrl("http://malicious.site/page")).toBe(false);
		});

		it("should reject protocol-relative URLs", () => {
			expect(validateReturnUrl("//evil.com/page")).toBe(false);
			expect(validateReturnUrl("//www.evil.com/login")).toBe(false);
		});

		it("should accept same-origin URLs only", () => {
			expect(validateReturnUrl("https://example.com/teams.html")).toBe(true);
			expect(validateReturnUrl("/teams.html")).toBe(true);
		});
	});
});
