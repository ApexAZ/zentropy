/**
 * Integration tests for navigation authentication with auth-utils
 * Tests the integration between navigation-auth.ts and auth-utils.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock auth-utils module but allow real navigation-auth to be tested
const mockCheckSessionStatus = vi.fn();
const mockRedirectToLogin = vi.fn();
const mockGetSessionInfo = vi.fn();
const mockClearSessionInfo = vi.fn();
const mockHandleAuthError = vi.fn();
const mockIsSessionExpired = vi.fn();
const mockValidateReturnUrl = vi.fn();
const mockShowSessionWarning = vi.fn();
const mockHideSessionWarning = vi.fn();

vi.mock("../../utils/auth-utils", () => ({
	checkSessionStatus: mockCheckSessionStatus,
	redirectToLogin: mockRedirectToLogin,
	getSessionInfo: mockGetSessionInfo,
	clearSessionInfo: mockClearSessionInfo,
	handleAuthError: mockHandleAuthError,
	isSessionExpired: mockIsSessionExpired,
	validateReturnUrl: mockValidateReturnUrl,
	showSessionWarning: mockShowSessionWarning,
	hideSessionWarning: mockHideSessionWarning
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock DOM elements
const mockUserInfo = {
	style: { display: "none" },
	textContent: ""
};

const mockLogoutBtn = {
	style: { display: "none" },
	addEventListener: vi.fn(),
	click: vi.fn(),
	textContent: "",
	dataset: {}
};

const mockNavContainer = {
	querySelector: vi.fn((selector: string) => {
		if (selector === "#user-info") {return mockUserInfo;}
		if (selector === "#logout-btn") {return mockLogoutBtn;}
		return null;
	}),
	addEventListener: vi.fn(),
	classList: {
		add: vi.fn(),
		remove: vi.fn()
	}
};

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

// Mock window.location
const mockLocation = {
	href: "http://localhost:3000/teams.html",
	pathname: "/teams.html",
	search: "",
	assign: vi.fn(),
	replace: vi.fn()
};

Object.defineProperty(global, "window", {
	value: {
		location: mockLocation
	},
	writable: true
});

describe("Navigation Authentication Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		
		// Setup default DOM mock
		global.document = {
			getElementById: vi.fn((id: string) => {
				if (id === "nav-container") {return mockNavContainer;}
				if (id === "user-info") {return mockUserInfo;}
				if (id === "logout-btn") {return mockLogoutBtn;}
				return null;
			}),
			querySelector: vi.fn(),
			addEventListener: vi.fn()
		} as unknown as Document;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Session Validation Integration", () => {
		it("should check session status when navigation is initialized", async () => {
			// Arrange
			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: { id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User" }
			});

			// Import and test the real navigation-auth module
			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalled();
		});

		it("should redirect to login when session is invalid", async () => {
			// Arrange
			mockCheckSessionStatus.mockResolvedValue({
				isValid: false,
				error: "Session expired"
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockRedirectToLogin).toHaveBeenCalledWith(window.location.pathname);
		});

		it("should handle session check errors gracefully", async () => {
			// Arrange
			const sessionError = new Error("Network error");
			mockCheckSessionStatus.mockRejectedValue(sessionError);

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockHandleAuthError).toHaveBeenCalledWith(sessionError);
		});
	});

	describe("User Info Display Integration", () => {
		it("should display user info when session is valid", async () => {
			// Arrange
			const mockUser = {
				id: "user-1",
				email: "test@example.com",
				firstName: "Test",
				lastName: "User",
				role: "team_member"
			};

			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: mockUser
			});

			mockGetSessionInfo.mockReturnValue(mockUser);

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockGetSessionInfo).toHaveBeenCalled();
			expect(mockUserInfo.style.display).toBe("block");
			expect(mockUserInfo.textContent).toContain("Test User");
		});

		it("should hide user info when session is invalid", async () => {
			// Arrange
			mockCheckSessionStatus.mockResolvedValue({
				isValid: false,
				error: "No session found"
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockUserInfo.style.display).toBe("none");
			expect(mockLogoutBtn.style.display).toBe("none");
		});
	});

	describe("Logout Integration", () => {
		it("should call logout API and clear session info on logout", async () => {
			// Arrange
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ message: "Logged out successfully" })
			});

			const { handleLogout } = await import("../../utils/navigation-auth.js");
			
			// Act
			await handleLogout();

			// Assert
			expect(mockFetch).toHaveBeenCalledWith("/api/users/logout", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" }
			});
			expect(mockClearSessionInfo).toHaveBeenCalled();
		});

		it("should handle logout API errors and clear session", async () => {
			// Arrange
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: vi.fn().mockResolvedValue({ message: "Server error" })
			});

			const { handleLogout } = await import("../../utils/navigation-auth.js");
			
			// Act
			await handleLogout();

			// Assert
			expect(mockClearSessionInfo).toHaveBeenCalled();
			expect(mockLocation.href).toBe("/login.html");
		});

		it("should handle network errors during logout", async () => {
			// Arrange
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			const { handleLogout } = await import("../../utils/navigation-auth.js");
			
			// Act
			await handleLogout();

			// Assert
			expect(mockClearSessionInfo).toHaveBeenCalled();
			expect(mockLocation.href).toBe("/login.html");
		});
	});

	describe("Page-Specific Authentication", () => {
		it("should work correctly on teams page", async () => {
			// Arrange
			mockLocation.pathname = "/teams.html";
			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: { id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User" }
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalled();
			expect(mockRedirectToLogin).not.toHaveBeenCalled();
		});

		it("should work correctly on calendar page", async () => {
			// Arrange
			mockLocation.pathname = "/calendar.html";
			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: { id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User" }
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalled();
			expect(mockRedirectToLogin).not.toHaveBeenCalled();
		});

		it("should work correctly on team-configuration page", async () => {
			// Arrange
			mockLocation.pathname = "/team-configuration.html";
			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: { id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User" }
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalled();
			expect(mockRedirectToLogin).not.toHaveBeenCalled();
		});
	});

	describe("Session Expiration Handling", () => {
		it("should detect expired sessions and redirect to login", async () => {
			// Arrange
			mockIsSessionExpired.mockReturnValue(true);
			mockCheckSessionStatus.mockResolvedValue({
				isValid: false,
				error: "Session expired"
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockClearSessionInfo).toHaveBeenCalled();
			expect(mockRedirectToLogin).toHaveBeenCalledWith(window.location.pathname);
		});

		it("should handle session info retrieval errors", async () => {
			// Arrange
			mockGetSessionInfo.mockImplementation(() => {
				throw new Error("Invalid session data");
			});
			
			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: { id: "user-1", email: "test@example.com", firstName: "Test", lastName: "User" }
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act
			initializeNavigation("nav-container");

			// Assert
			expect(mockHandleAuthError).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("Authentication State Management", () => {
		it("should properly update navigation state for authenticated users", async () => {
			// Arrange
			const mockUser = {
				id: "user-1",
				email: "test@example.com", 
				firstName: "Test",
				lastName: "User",
				role: "team_lead"
			};

			mockCheckSessionStatus.mockResolvedValue({
				isValid: true,
				user: mockUser
			});

			mockGetSessionInfo.mockReturnValue(mockUser);

			const { updateNavigationState } = await import("../../utils/navigation-auth.js");
			
			// Act
			updateNavigationState(true, { name: `${mockUser.firstName} ${mockUser.lastName}`, role: mockUser.role });

			// Assert
			expect(mockUserInfo.style.display).toBe("block");
			expect(mockLogoutBtn.style.display).toBe("block");
			expect(mockUserInfo.textContent).toContain("Test User");
		});

		it("should properly clear navigation state for unauthenticated users", async () => {
			// Arrange
			const { updateNavigationState } = await import("../../utils/navigation-auth.js");
			
			// Act
			updateNavigationState(false);

			// Assert
			expect(mockUserInfo.style.display).toBe("none");
			expect(mockLogoutBtn.style.display).toBe("none");
			expect(mockUserInfo.textContent).toBe("");
		});
	});

	describe("Cross-Page Authentication Flow", () => {
		it("should maintain authentication state across page navigation", async () => {
			// Arrange
			const mockUser = {
				id: "user-1",
				email: "test@example.com",
				firstName: "Test", 
				lastName: "User"
			};

			// Simulate navigation from teams to calendar
			mockLocation.pathname = "/teams.html";
			mockCheckSessionStatus.mockResolvedValue({ isValid: true, user: mockUser });
			mockGetSessionInfo.mockReturnValue(mockUser);

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act - Initialize on teams page
			initializeNavigation("nav-container");

			// Change to calendar page
			mockLocation.pathname = "/calendar.html";
			
			// Act - Initialize on calendar page
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalledTimes(2);
			expect(mockGetSessionInfo).toHaveBeenCalledTimes(2);
			expect(mockRedirectToLogin).not.toHaveBeenCalled();
		});

		it("should handle session invalidation during page navigation", async () => {
			// Arrange
			const mockUser = {
				id: "user-1",
				email: "test@example.com",
				firstName: "Test",
				lastName: "User"
			};

			// First page load - valid session
			mockCheckSessionStatus.mockResolvedValueOnce({ isValid: true, user: mockUser });
			
			// Second page load - invalid session
			mockCheckSessionStatus.mockResolvedValueOnce({ 
				isValid: false, 
				error: "Session expired" 
			});

			const { initializeNavigation } = await import("../../utils/navigation-auth.js");
			
			// Act - First page load
			initializeNavigation("nav-container");
			
			// Act - Second page load with expired session
			initializeNavigation("nav-container");

			// Assert
			expect(mockCheckSessionStatus).toHaveBeenCalledTimes(2);
			expect(mockRedirectToLogin).toHaveBeenCalledWith(window.location.pathname);
		});
	});
});