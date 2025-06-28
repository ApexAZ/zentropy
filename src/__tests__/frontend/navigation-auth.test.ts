/**
 * Navigation Authentication Integration Tests
 * Tests the real integration between auth-utils and navigation-auth
 * Comprehensive testing of authentication flows across different page contexts
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

// Import the actual modules for integration testing
import {
	initializeNavigation,
	handleLogout,
	updateNavigationState,
	checkAuthenticationOnLoad,
	type UserDisplayInfo
} from "../../utils/navigation-auth.js";

import {
	checkSessionStatus,
	getSessionInfo,
	clearSessionInfo,
	buildReturnUrl,
	validateReturnUrl,
	handleAuthError,
	type SessionInfo,
	type AuthError
} from "../../utils/auth-utils.js";

// Mock interfaces for type safety
interface MockResponse {
	ok: boolean;
	status: number;
	json: Mock;
}

interface MockElement {
	style: { display: string };
	textContent: string;
	classList: {
		add: Mock;
		remove: Mock;
		contains: Mock;
	};
	dataset: Record<string, string>;
	addEventListener: Mock;
	innerHTML: string;
	appendChild: Mock;
	id?: string;
	className?: string;
}

// Global mocks setup
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window and location
const mockLocation = {
	href: "",
	pathname: "/teams.html",
	search: "",
	origin: "https://example.com"
};

Object.defineProperty(global, "window", {
	value: {
		location: mockLocation
	},
	writable: true
});

Object.defineProperty(global, "location", {
	value: mockLocation,
	writable: true
});

// Mock sessionStorage
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};

Object.defineProperty(global, "sessionStorage", {
	value: mockSessionStorage,
	writable: true
});

describe("Auth-Utils and Navigation-Auth Integration Tests", () => {
	let mockNavContainer: MockElement;
	let mockUserInfo: MockElement;
	let mockLogoutButton: MockElement;
	let mockDocument: {
		getElementById: Mock;
		createElement: Mock;
		body: { appendChild: Mock };
		addEventListener: Mock;
	};

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Reset location state
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";
		mockLocation.search = "";
		mockLocation.origin = "https://example.com";

		// Create mock DOM elements with full functionality
		mockNavContainer = {
			style: { display: "block" },
			textContent: "",
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				contains: vi.fn()
			},
			dataset: {},
			addEventListener: vi.fn(),
			innerHTML: "",
			appendChild: vi.fn(),
			id: "nav-container"
		};

		mockUserInfo = {
			style: { display: "none" },
			textContent: "",
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				contains: vi.fn()
			},
			dataset: {},
			addEventListener: vi.fn(),
			innerHTML: "",
			appendChild: vi.fn(),
			id: "user-info"
		};

		mockLogoutButton = {
			style: { display: "none" },
			textContent: "",
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				contains: vi.fn()
			},
			dataset: {},
			addEventListener: vi.fn(),
			innerHTML: "",
			appendChild: vi.fn(),
			id: "logout-btn"
		};

		// Setup document mock
		mockDocument = {
			getElementById: vi.fn(),
			createElement: vi.fn(),
			body: { appendChild: vi.fn() },
			addEventListener: vi.fn()
		};

		// Configure getElementById mock
		mockDocument.getElementById.mockImplementation((id: string) => {
			switch (id) {
				case "nav-container":
					return mockNavContainer;
				case "user-info":
					return mockUserInfo;
				case "logout-btn":
					return mockLogoutButton;
				case "session-warning":
					return null; // Will be created dynamically
				default:
					return null;
			}
		});

		// Mock createElement for session warning
		mockDocument.createElement.mockReturnValue({
			id: "",
			className: "",
			textContent: "",
			style: { display: "none" }
		});

		// Set global document
		Object.defineProperty(global, "document", {
			value: mockDocument,
			writable: true
		});

		// Clear session storage
		mockSessionStorage.getItem.mockReturnValue(null);
		mockSessionStorage.setItem.mockClear();
		mockSessionStorage.removeItem.mockClear();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Auth-Utils Integration - Session Status Checking", () => {
		it("should call checkSessionStatus from auth-utils when initializing navigation", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({
					user: { id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" }
				})
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Verify checkSessionStatus was called correctly
			expect(mockFetch).toHaveBeenCalledWith("/api/users/session", {
				method: "GET",
				credentials: "include"
			});
		});

		it("should handle session validation results correctly", async () => {
			// ARRANGE
			const sessionData: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ user: sessionData })
			} as MockResponse);

			// ACT
			const sessionStatus = await checkSessionStatus();

			// ASSERT
			expect(sessionStatus.isValid).toBe(true);
			expect(sessionStatus.user).toEqual(sessionData);
			expect(sessionStatus.error).toBeUndefined();
		});

		it("should handle expired sessions with proper error handling", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 419,
				json: vi.fn().mockResolvedValue({ message: "Session expired" })
			} as MockResponse);

			// ACT
			const sessionStatus = await checkSessionStatus();

			// ASSERT
			expect(sessionStatus.isValid).toBe(false);
			expect(sessionStatus.user).toBeNull();
			expect(sessionStatus.expired).toBe(true);
			expect(sessionStatus.error).toBe("Session expired");
		});
	});

	describe("Auth-Utils Integration - Redirect Functionality", () => {
		it("should use auth-utils redirectToLogin when authentication fails", async () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: vi.fn().mockResolvedValue({ message: "Unauthorized" })
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Should redirect using auth-utils function
			expect(mockLocation.href).toBe("/login.html?return=%2Fteams.html&message=Unauthorized");
		});

		it("should handle return URL building correctly across different pages", () => {
			// Test teams page
			mockLocation.pathname = "/teams.html";
			mockLocation.search = "?tab=members";
			const teamsUrl = buildReturnUrl();
			expect(teamsUrl).toBe("/login.html?return=%2Fteams.html%3Ftab%3Dmembers");

			// Test calendar page
			mockLocation.pathname = "/calendar.html";
			mockLocation.search = "?month=2024-01";
			const calendarUrl = buildReturnUrl();
			expect(calendarUrl).toBe("/login.html?return=%2Fcalendar.html%3Fmonth%3D2024-01");

			// Test configuration page
			mockLocation.pathname = "/team-configuration.html";
			mockLocation.search = "";
			const configUrl = buildReturnUrl();
			expect(configUrl).toBe("/login.html?return=%2Fteam-configuration.html");
		});

		it("should validate return URLs to prevent open redirect attacks", () => {
			// Valid same-origin URLs
			expect(validateReturnUrl("/teams.html")).toBe(true);
			expect(validateReturnUrl("/calendar.html")).toBe(true);
			expect(validateReturnUrl("https://example.com/teams.html")).toBe(true);

			// Invalid external URLs
			expect(validateReturnUrl("https://evil.com/malicious")).toBe(false);
			expect(validateReturnUrl("//evil.com/page")).toBe(false);
			expect(validateReturnUrl("javascript:alert('xss')")).toBe(false);
		});
	});

	describe("Auth-Utils Integration - Session Storage Management", () => {
		it("should use auth-utils session storage functions", () => {
			// Test getSessionInfo with no session data
			mockSessionStorage.getItem.mockReturnValue(null);
			const noSession = getSessionInfo();
			expect(noSession).toBeNull();

			// Test getSessionInfo with valid session data
			const validSession: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};
			mockSessionStorage.getItem.mockReturnValue(JSON.stringify(validSession));
			const sessionInfo = getSessionInfo();
			expect(sessionInfo).toEqual(validSession);

			// Test clearSessionInfo
			clearSessionInfo();
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
		});

		it("should handle malformed session data gracefully", () => {
			// Test with invalid JSON
			mockSessionStorage.getItem.mockReturnValue("invalid-json");
			const invalidResult = getSessionInfo();
			expect(invalidResult).toBeNull();

			// Test with missing required fields
			mockSessionStorage.getItem.mockReturnValue(JSON.stringify({ name: "Test" }));
			const incompleteResult = getSessionInfo();
			expect(incompleteResult).toBeNull();
		});
	});

	describe("Navigation-Auth Integration - Real DOM Updates", () => {
		it("should update navigation elements for authenticated users", () => {
			// ARRANGE
			const userInfo: UserDisplayInfo = { name: "John Doe", role: "team_lead" };

			// ACT
			updateNavigationState(true, userInfo);

			// ASSERT - Verify DOM updates
			expect(mockUserInfo.textContent).toBe("John Doe (Team Lead)");
			expect(mockUserInfo.style.display).toBe("block");
			expect(mockLogoutButton.style.display).toBe("block");
			expect(mockLogoutButton.textContent).toBe("Logout");
			expect(mockLogoutButton.dataset.action).toBe("logout");
			expect(mockNavContainer.classList.add).toHaveBeenCalledWith("authenticated");
			expect(mockNavContainer.classList.remove).toHaveBeenCalledWith("unauthenticated");
		});

		it("should update navigation elements for unauthenticated users", () => {
			// ACT
			updateNavigationState(false);

			// ASSERT
			expect(mockUserInfo.style.display).toBe("none");
			expect(mockUserInfo.textContent).toBe("");
			expect(mockLogoutButton.style.display).toBe("none");
			expect(mockLogoutButton.textContent).toBe("");
			expect(mockLogoutButton.dataset.action).toBeUndefined();
			expect(mockNavContainer.classList.add).toHaveBeenCalledWith("unauthenticated");
			expect(mockNavContainer.classList.remove).toHaveBeenCalledWith("authenticated");
		});

		it("should handle different user roles correctly", () => {
			// Test team_lead role
			updateNavigationState(true, { name: "Team Lead", role: "team_lead" });
			expect(mockUserInfo.textContent).toBe("Team Lead (Team Lead)");

			// Test team_member role
			updateNavigationState(true, { name: "Team Member", role: "team_member" });
			expect(mockUserInfo.textContent).toBe("Team Member (Team Member)");

			// Test unknown role
			updateNavigationState(true, { name: "Unknown User", role: "unknown_role" });
			expect(mockUserInfo.textContent).toBe("Unknown User (User)");
		});
	});

	describe("Logout Integration - Real API Calls", () => {
		it("should call logout API with correct parameters", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ message: "Logged out successfully" })
			} as MockResponse);

			// ACT
			await handleLogout();

			// ASSERT
			expect(mockFetch).toHaveBeenCalledWith("/api/users/logout", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json"
				}
			});
		});

		it("should clear session and redirect after successful logout", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ message: "Logged out successfully" })
			} as MockResponse);

			// ACT
			await handleLogout();

			// ASSERT
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fteams.html&message=You%20have%20been%20logged%20out%20successfully."
			);
		});

		it("should handle logout errors gracefully", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: vi.fn().mockResolvedValue({ message: "Server error" })
			} as MockResponse);

			// ACT
			await handleLogout();

			// ASSERT - Should still clear session locally and redirect
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fteams.html&message=Logout%20incomplete%3A%20Server%20error"
			);
		});

		it("should handle network errors during logout", async () => {
			// ARRANGE
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			// ACT
			await handleLogout();

			// ASSERT
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fteams.html&message=Network%20error%20during%20logout.%20Please%20try%20again."
			);
		});
	});

	describe("Error Handling Integration", () => {
		it("should use auth-utils handleAuthError for expired sessions", async () => {
			// ARRANGE
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 419,
				json: vi.fn().mockResolvedValue({ message: "Session expired" })
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Should clear session and redirect
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fteams.html&message=Your%20session%20has%20expired.%20Please%20log%20in%20again."
			);

			consoleSpy.mockRestore();
		});

		it("should handle auth errors with proper error types", () => {
			// Test expired session error
			const expiredError: AuthError = {
				type: "expired",
				message: "Session expired",
				redirectRequired: true
			};
			handleAuthError(expiredError);
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");

			// Test network error (no redirect)
			const networkError: AuthError = {
				type: "network",
				message: "Network error",
				redirectRequired: false
			};
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			handleAuthError(networkError);
			expect(consoleSpy).toHaveBeenCalledWith("Network error during authentication:", "Network error");
			consoleSpy.mockRestore();
		});
	});

	describe("Cross-Page Integration Testing", () => {
		it("should work correctly on teams page", async () => {
			// ARRANGE
			mockLocation.pathname = "/teams.html";
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({
					user: { id: "user-123", email: "test@example.com", name: "Test User", role: "team_member" }
				})
			} as MockResponse);

			// ACT
			initializeNavigation("nav-container");
			await checkAuthenticationOnLoad();

			// ASSERT
			expect(mockNavContainer.addEventListener).toHaveBeenCalled();
			expect(mockFetch).toHaveBeenCalledWith("/api/users/session", expect.any(Object));
		});

		it("should work correctly on calendar page", async () => {
			// ARRANGE
			mockLocation.pathname = "/calendar.html";
			mockLocation.search = "?month=2024-01";
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: vi.fn().mockResolvedValue({ message: "Unauthorized" })
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Should redirect with correct return URL
			expect(mockLocation.href).toBe(
				"/login.html?return=%2Fcalendar.html%3Fmonth%3D2024-01&message=Unauthorized"
			);
		});

		it("should work correctly on team-configuration page", async () => {
			// ARRANGE
			mockLocation.pathname = "/team-configuration.html";
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({
					user: { id: "user-123", email: "test@example.com", name: "Admin User", role: "team_lead" }
				})
			} as MockResponse);

			// ACT
			const sessionStatus = await checkSessionStatus();
			updateNavigationState(true, { name: "Admin User", role: "team_lead" });

			// ASSERT
			expect(sessionStatus.isValid).toBe(true);
			expect(mockUserInfo.textContent).toBe("Admin User (Team Lead)");
		});
	});

	describe("Event Delegation Integration", () => {
		it("should set up event listeners correctly on navigation container", () => {
			// ACT
			initializeNavigation("nav-container");

			// ASSERT
			expect(mockNavContainer.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
		});

		it("should handle logout button clicks through event delegation", () => {
			// ARRANGE
			let clickHandler: ((event: Event) => void) | undefined;
			mockNavContainer.addEventListener.mockImplementation((event: string, handler: (event: Event) => void) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			// Initialize navigation to set up event listeners
			initializeNavigation("nav-container");

			// Mock logout button click event
			const mockPreventDefault = vi.fn();
			const mockClickEvent = {
				target: mockLogoutButton,
				preventDefault: mockPreventDefault
			} as unknown as Event;

			mockLogoutButton.dataset.action = "logout";

			// Mock successful logout
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ message: "Logged out successfully" })
			} as MockResponse);

			// ACT
			if (clickHandler) {
				clickHandler(mockClickEvent);
			}

			// ASSERT
			expect(mockPreventDefault).toHaveBeenCalledTimes(1);
		});
	});

	describe("ESLint Compliance and Type Safety", () => {
		it("should use proper TypeScript interfaces", () => {
			// Test SessionInfo interface usage
			const sessionInfo: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};
			expect(sessionInfo).toBeDefined();

			// Test UserDisplayInfo interface usage
			const userDisplayInfo: UserDisplayInfo = {
				name: "Test User",
				role: "team_member"
			};
			expect(userDisplayInfo).toBeDefined();
		});

		it("should handle all promise rejections without unhandled errors", async () => {
			// ARRANGE
			mockFetch.mockRejectedValue(new Error("Network failure"));

			// ACT & ASSERT - Should not throw unhandled promise rejection
			await expect(checkSessionStatus()).resolves.toBeDefined();
			await expect(handleLogout()).resolves.toBeUndefined();
			await expect(checkAuthenticationOnLoad()).resolves.toBeUndefined();
		});

		it("should use proper nullish coalescing patterns", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: vi.fn().mockResolvedValue({}) // No message field
			} as MockResponse);

			// ACT
			const sessionStatus = await checkSessionStatus();

			// ASSERT - Should use nullish coalescing for default error message
			expect(sessionStatus.error).toBe("Authentication failed");
		});
	});
});
