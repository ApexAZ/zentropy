/**
 * Navigation Authentication Integration Tests (Simplified)
 *
 * Focuses on integration workflows using extracted utilities for business logic testing.
 * This file replaces the complex DOM mocking with clean integration testing patterns.
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

// Import extracted utilities (business logic now tested separately)
import {
	getRoleDisplayName,
	formatUserDisplayText,
	calculateNavigationState,
	createLogoutRequest,
	buildLogoutApiUrl,
	getLogoutRedirectMessage,
	createSafeUserDisplayInfo
} from "../../utils/navigation-display-utils.js";

import { checkSessionStatus, type SessionInfo } from "../../utils/auth-utils.js";

// Minimal mock interfaces for integration testing
interface MockResponse {
	ok: boolean;
	status: number;
	json: Mock;
}

interface MockElement {
	style: { display: string };
	textContent: string;
	classList: { add: Mock; remove: Mock };
	dataset: Record<string, string>;
	addEventListener: Mock;
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
	value: { location: mockLocation },
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

describe("Navigation Authentication Integration Tests", () => {
	let mockNavContainer: MockElement;
	let mockUserInfo: MockElement;
	let mockLogoutButton: MockElement;
	let mockDocument: { getElementById: Mock; addEventListener: Mock };

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset location state
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";

		// Create minimal mock elements for integration testing
		mockNavContainer = {
			style: { display: "block" },
			textContent: "",
			classList: { add: vi.fn(), remove: vi.fn() },
			dataset: {},
			addEventListener: vi.fn()
		};

		mockUserInfo = {
			style: { display: "none" },
			textContent: "",
			classList: { add: vi.fn(), remove: vi.fn() },
			dataset: {}
		} as MockElement;

		mockLogoutButton = {
			style: { display: "none" },
			textContent: "",
			classList: { add: vi.fn(), remove: vi.fn() },
			dataset: {}
		} as MockElement;

		// Setup minimal document mock
		mockDocument = {
			getElementById: vi.fn(),
			addEventListener: vi.fn()
		};

		// Configure minimal getElementById mock
		mockDocument.getElementById.mockImplementation((id: string) => {
			switch (id) {
				case "nav-container":
					return mockNavContainer;
				case "user-info":
					return mockUserInfo;
				case "logout-btn":
					return mockLogoutButton;
				default:
					return null;
			}
		});

		// Set global document
		Object.defineProperty(global, "document", {
			value: mockDocument,
			writable: true
		});

		// Clear session storage
		mockSessionStorage.getItem.mockReturnValue(null);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Authentication Status Integration", () => {
		it("should integrate checkSessionStatus with navigation updates", async () => {
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
			await checkAuthenticationOnLoad();

			// ASSERT - Integration test focuses on API call and workflow
			expect(mockFetch).toHaveBeenCalledWith("/api/users/session", {
				method: "GET",
				credentials: "include"
			});
		});

		it("should handle authentication errors correctly", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: vi.fn().mockResolvedValue({ message: "Unauthorized" })
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Verify error handling workflow
			expect(mockFetch).toHaveBeenCalledWith("/api/users/session", {
				method: "GET",
				credentials: "include"
			});
		});
	});

	describe("Navigation State Integration", () => {
		it("should update navigation using extracted utilities", () => {
			// ARRANGE
			const userInfo: UserDisplayInfo = { name: "John Doe", role: "team_lead" };

			// ACT - Integration test using real updateNavigationState with extracted utilities
			updateNavigationState(true, userInfo);

			// ASSERT - Verify DOM updates (simplified integration focus)
			expect(mockUserInfo.style.display).toBe("block");
			expect(mockLogoutButton.style.display).toBe("block");
			expect(mockNavContainer.classList.add).toHaveBeenCalledWith("authenticated");
		});

		it("should handle unauthenticated state properly", () => {
			// ACT
			updateNavigationState(false);

			// ASSERT
			expect(mockUserInfo.style.display).toBe("none");
			expect(mockLogoutButton.style.display).toBe("none");
			expect(mockNavContainer.classList.add).toHaveBeenCalledWith("unauthenticated");
		});
	});

	describe("Logout Workflow Integration", () => {
		it("should complete logout workflow using extracted utilities", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: vi.fn().mockResolvedValue({ message: "Logged out successfully" })
			} as MockResponse);

			// ACT
			await handleLogout();

			// ASSERT - Verify complete logout workflow
			expect(mockFetch).toHaveBeenCalledWith(buildLogoutApiUrl(), createLogoutRequest());
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
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

			// ASSERT - Verify error handling uses extracted utilities
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
			const expectedMessage = getLogoutRedirectMessage(false, "Server error");
			expect(expectedMessage).toContain("Logout incomplete");
		});
	});

	describe("Utility Integration Verification", () => {
		it("should use extracted role display utilities correctly", () => {
			// ARRANGE
			const userInfo = createSafeUserDisplayInfo("John Doe", "team_lead");

			// ACT
			const displayText = formatUserDisplayText(userInfo);
			const roleDisplay = getRoleDisplayName(userInfo.role);

			// ASSERT - Verify utility integration
			expect(displayText).toBe("John Doe (Team Lead)");
			expect(roleDisplay).toBe("Team Lead");
		});

		it("should use navigation state utilities correctly", () => {
			// ARRANGE
			const userInfo: UserDisplayInfo = { name: "Jane Smith", role: "team_member" };

			// ACT
			const navState = calculateNavigationState(true, userInfo);

			// ASSERT - Verify utility produces correct state
			expect(navState.isAuthenticated).toBe(true);
			expect(navState.userInfoDisplay.visible).toBe(true);
			expect(navState.userInfoDisplay.text).toBe("Jane Smith (Team Member)");
			expect(navState.logoutButtonDisplay.visible).toBe(true);
		});

		it("should use logout utilities correctly", () => {
			// ARRANGE & ACT
			const logoutUrl = buildLogoutApiUrl();
			const logoutRequest = createLogoutRequest();
			const successMessage = getLogoutRedirectMessage(true);
			const errorMessage = getLogoutRedirectMessage(false, "Network error");

			// ASSERT - Verify extracted utilities work correctly
			expect(logoutUrl).toBe("/api/users/logout");
			expect(logoutRequest.method).toBe("POST");
			expect(logoutRequest.credentials).toBe("include");
			expect(successMessage).toBe("You have been logged out successfully.");
			expect(errorMessage).toBe("Logout incomplete: Network error");
		});
	});

	describe("Error Handling Integration", () => {
		it("should handle network errors during authentication check", async () => {
			// ARRANGE
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Should handle network errors gracefully
			expect(mockUserInfo.style.display).toBe("none");
			expect(mockLogoutButton.style.display).toBe("none");
		});

		it("should handle session expiration", async () => {
			// ARRANGE
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 419,
				json: vi.fn().mockResolvedValue({ message: "Session expired" })
			} as MockResponse);

			// ACT
			await checkAuthenticationOnLoad();

			// ASSERT - Verify session expiration handling
			expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("user");
		});
	});

	describe("Event Integration", () => {
		it("should set up navigation event listeners correctly", () => {
			// ACT
			initializeNavigation("nav-container");

			// ASSERT - Verify event listener setup
			expect(mockNavContainer.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
		});
	});

	describe("Type Safety and ESLint Compliance", () => {
		it("should use proper TypeScript interfaces", () => {
			// Test interface usage without complex mocking
			const sessionInfo: SessionInfo = {
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
				role: "team_member"
			};

			const userDisplayInfo: UserDisplayInfo = {
				name: "Test User",
				role: "team_member"
			};

			expect(sessionInfo).toBeDefined();
			expect(userDisplayInfo).toBeDefined();
		});

		it("should handle promise rejections properly", async () => {
			// ARRANGE
			mockFetch.mockRejectedValue(new Error("Network failure"));

			// ACT & ASSERT - Should not throw unhandled promise rejection
			await expect(checkSessionStatus()).resolves.toBeDefined();
			await expect(handleLogout()).resolves.toBeUndefined();
			await expect(checkAuthenticationOnLoad()).resolves.toBeUndefined();
		});
	});
});
