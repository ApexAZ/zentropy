import { describe, it, expect } from "vitest";
import {
	getRoleDisplayName,
	formatUserDisplayText,
	calculateNavigationState,
	createLogoutRequest,
	buildLogoutApiUrl,
	createLogoutWorkflow,
	getLogoutRedirectMessage,
	isValidUserRole,
	sanitizeUserDisplayName,
	createSafeUserDisplayInfo,
	createNavigationHTML,
	getNavigationContainerClasses,
	calculateElementVisibility,
	createLogoutErrorConfig,
	type UserDisplayInfo
} from "../../utils/navigation-display-utils";

describe("Navigation Display Utilities", () => {
	describe("getRoleDisplayName", () => {
		it("should return correct display names for known roles", () => {
			expect(getRoleDisplayName("team_lead")).toBe("Team Lead");
			expect(getRoleDisplayName("team_member")).toBe("Team Member");
			expect(getRoleDisplayName("basic_user")).toBe("User");
		});

		it("should return 'User' for unknown roles", () => {
			expect(getRoleDisplayName("unknown_role")).toBe("User");
			expect(getRoleDisplayName("")).toBe("User");
			expect(getRoleDisplayName("admin")).toBe("User");
		});

		it("should handle null and undefined gracefully", () => {
			expect(getRoleDisplayName(null as unknown as string)).toBe("User");
			expect(getRoleDisplayName(undefined as unknown as string)).toBe("User");
		});
	});

	describe("formatUserDisplayText", () => {
		it("should format user display text correctly", () => {
			const userInfo: UserDisplayInfo = {
				name: "John Doe",
				role: "team_lead"
			};

			const result = formatUserDisplayText(userInfo);

			expect(result).toBe("John Doe (Team Lead)");
		});

		it("should handle different roles correctly", () => {
			expect(formatUserDisplayText({ name: "Jane Smith", role: "team_member" })).toBe("Jane Smith (Team Member)");

			expect(formatUserDisplayText({ name: "Bob Johnson", role: "basic_user" })).toBe("Bob Johnson (User)");

			expect(formatUserDisplayText({ name: "Alice Brown", role: "unknown_role" })).toBe("Alice Brown (User)");
		});

		it("should handle empty names gracefully", () => {
			const result = formatUserDisplayText({ name: "", role: "team_lead" });
			expect(result).toBe(" (Team Lead)");
		});
	});

	describe("calculateNavigationState", () => {
		it("should return authenticated state when user is authenticated", () => {
			const userInfo: UserDisplayInfo = {
				name: "John Doe",
				role: "team_lead"
			};

			const result = calculateNavigationState(true, userInfo);

			expect(result.isAuthenticated).toBe(true);
			expect(result.userInfo).toEqual(userInfo);
			expect(result.containerClasses).toEqual(["authenticated"]);
			expect(result.userInfoDisplay.visible).toBe(true);
			expect(result.userInfoDisplay.text).toBe("John Doe (Team Lead)");
			expect(result.logoutButtonDisplay.visible).toBe(true);
			expect(result.logoutButtonDisplay.text).toBe("Logout");
			expect(result.logoutButtonDisplay.action).toBe("logout");
		});

		it("should return unauthenticated state when user is not authenticated", () => {
			const result = calculateNavigationState(false);

			expect(result.isAuthenticated).toBe(false);
			expect(result.userInfo).toBeUndefined();
			expect(result.containerClasses).toEqual(["unauthenticated"]);
			expect(result.userInfoDisplay.visible).toBe(false);
			expect(result.userInfoDisplay.text).toBe("");
			expect(result.logoutButtonDisplay.visible).toBe(false);
			expect(result.logoutButtonDisplay.text).toBe("");
			expect(result.logoutButtonDisplay.action).toBeUndefined();
		});

		it("should return unauthenticated state when authenticated but no userInfo provided", () => {
			const result = calculateNavigationState(true);

			expect(result.isAuthenticated).toBe(false);
			expect(result.containerClasses).toEqual(["unauthenticated"]);
		});

		it("should handle different user roles in authenticated state", () => {
			const memberResult = calculateNavigationState(true, { name: "Team Member", role: "team_member" });
			expect(memberResult.userInfoDisplay.text).toBe("Team Member (Team Member)");

			const basicResult = calculateNavigationState(true, { name: "Basic User", role: "basic_user" });
			expect(basicResult.userInfoDisplay.text).toBe("Basic User (User)");
		});
	});

	describe("createLogoutRequest", () => {
		it("should create correct logout request configuration", () => {
			const request = createLogoutRequest();

			expect(request.method).toBe("POST");
			expect(request.credentials).toBe("include");
			expect(request.headers).toEqual({
				"Content-Type": "application/json"
			});
		});

		it("should create consistent request objects", () => {
			const request1 = createLogoutRequest();
			const request2 = createLogoutRequest();

			expect(request1).toEqual(request2);
		});
	});

	describe("buildLogoutApiUrl", () => {
		it("should return correct logout API URL", () => {
			const url = buildLogoutApiUrl();
			expect(url).toBe("/api/users/logout");
		});
	});

	describe("createLogoutWorkflow", () => {
		it("should create complete logout workflow configuration", () => {
			const workflow = createLogoutWorkflow();

			expect(workflow.apiUrl).toBe("/api/users/logout");
			expect(workflow.requestConfig.method).toBe("POST");
			expect(workflow.requestConfig.credentials).toBe("include");
			expect(workflow.successMessage).toBe("You have been logged out successfully.");
			expect(workflow.errorHandling.clearSession).toBe(true);
			expect(workflow.errorHandling.redirectToLogin).toBe(true);
		});
	});

	describe("getLogoutRedirectMessage", () => {
		it("should return success message for successful logout", () => {
			const message = getLogoutRedirectMessage(true);
			expect(message).toBe("You have been logged out successfully.");
		});

		it("should return error message with details for failed logout", () => {
			const message = getLogoutRedirectMessage(false, "Server error");
			expect(message).toBe("Logout incomplete: Server error");
		});

		it("should return generic network error message when no specific error", () => {
			const message = getLogoutRedirectMessage(false);
			expect(message).toBe("Network error during logout. Please try again.");
		});

		it("should handle empty error messages", () => {
			const message = getLogoutRedirectMessage(false, "");
			expect(message).toBe("Network error during logout. Please try again.");
		});
	});

	describe("isValidUserRole", () => {
		it("should return true for valid user roles", () => {
			expect(isValidUserRole("basic_user")).toBe(true);
			expect(isValidUserRole("team_member")).toBe(true);
			expect(isValidUserRole("team_lead")).toBe(true);
		});

		it("should return false for invalid roles", () => {
			expect(isValidUserRole("admin")).toBe(false);
			expect(isValidUserRole("unknown_role")).toBe(false);
			expect(isValidUserRole("")).toBe(false);
			expect(isValidUserRole("super_user")).toBe(false);
		});

		it("should handle null and undefined", () => {
			expect(isValidUserRole(null as unknown as string)).toBe(false);
			expect(isValidUserRole(undefined as unknown as string)).toBe(false);
		});
	});

	describe("sanitizeUserDisplayName", () => {
		it("should remove HTML tags from user names", () => {
			const maliciousName = "John<script>alert('xss')</script>Doe";
			const result = sanitizeUserDisplayName(maliciousName);
			expect(result).toBe("JohnalertxssDoe");
			expect(result).not.toContain("<script>");
		});

		it("should remove dangerous characters", () => {
			const dangerousName = "John<>&'\"Doe";
			const result = sanitizeUserDisplayName(dangerousName);
			expect(result).toBe("JohnDoe");
		});

		it("should trim whitespace", () => {
			const result = sanitizeUserDisplayName("  John Doe  ");
			expect(result).toBe("John Doe");
		});

		it("should limit name length", () => {
			const longName = "A".repeat(150);
			const result = sanitizeUserDisplayName(longName);
			expect(result).toHaveLength(100);
		});

		it("should preserve normal names", () => {
			const result = sanitizeUserDisplayName("John Doe");
			expect(result).toBe("John Doe");
		});

		it("should handle empty strings", () => {
			const result = sanitizeUserDisplayName("");
			expect(result).toBe("");
		});
	});

	describe("createSafeUserDisplayInfo", () => {
		it("should create safe user display info with valid data", () => {
			const result = createSafeUserDisplayInfo("John Doe", "team_lead");

			expect(result.name).toBe("John Doe");
			expect(result.role).toBe("team_lead");
		});

		it("should sanitize malicious names", () => {
			const result = createSafeUserDisplayInfo("John<script>alert()</script>", "team_member");

			expect(result.name).toBe("Johnalert");
			expect(result.role).toBe("team_member");
		});

		it("should default invalid roles to basic_user", () => {
			const result = createSafeUserDisplayInfo("John Doe", "invalid_role");

			expect(result.name).toBe("John Doe");
			expect(result.role).toBe("basic_user");
		});

		it("should handle empty and malicious inputs", () => {
			const result = createSafeUserDisplayInfo("<script>alert('xss')</script>", "");

			expect(result.name).toBe("alertxss");
			expect(result.role).toBe("basic_user");
		});
	});

	describe("createNavigationHTML", () => {
		it("should generate complete navigation HTML structure", () => {
			const html = createNavigationHTML();

			expect(html).toContain("Capacity Planner");
			expect(html).toContain("Dashboard");
			expect(html).toContain("Teams");
			expect(html).toContain("Calendar");
			expect(html).toContain('id="user-info"');
			expect(html).toContain('id="logout-btn"');
			expect(html).toContain('data-action="logout"');
		});

		it("should include proper styling classes", () => {
			const html = createNavigationHTML();

			expect(html).toContain('class="logo"');
			expect(html).toContain('class="nav-menu"');
			expect(html).toContain('class="nav-auth"');
			expect(html).toContain('class="user-info"');
			expect(html).toContain('class="btn btn-secondary logout-btn"');
		});

		it("should set initial element visibility", () => {
			const html = createNavigationHTML();

			expect(html).toContain('style="display: none;"');
		});
	});

	describe("getNavigationContainerClasses", () => {
		it("should return authenticated class for authenticated users", () => {
			const classes = getNavigationContainerClasses(true);
			expect(classes).toEqual(["authenticated"]);
		});

		it("should return unauthenticated class for unauthenticated users", () => {
			const classes = getNavigationContainerClasses(false);
			expect(classes).toEqual(["unauthenticated"]);
		});
	});

	describe("calculateElementVisibility", () => {
		it("should show elements for authenticated users", () => {
			const visibility = calculateElementVisibility(true);

			expect(visibility.userInfo).toBe(true);
			expect(visibility.logoutButton).toBe(true);
		});

		it("should hide elements for unauthenticated users", () => {
			const visibility = calculateElementVisibility(false);

			expect(visibility.userInfo).toBe(false);
			expect(visibility.logoutButton).toBe(false);
		});
	});

	describe("createLogoutErrorConfig", () => {
		it("should create API error configuration", () => {
			const config = createLogoutErrorConfig("api");

			expect(config.clearSession).toBe(true);
			expect(config.redirectToLogin).toBe(true);
			expect(config.defaultMessage).toBe("Logout incomplete due to server error");
		});

		it("should create network error configuration", () => {
			const config = createLogoutErrorConfig("network");

			expect(config.clearSession).toBe(true);
			expect(config.redirectToLogin).toBe(true);
			expect(config.defaultMessage).toBe("Network error during logout. Please try again.");
		});

		it("should create timeout error configuration", () => {
			const config = createLogoutErrorConfig("timeout");

			expect(config.clearSession).toBe(true);
			expect(config.redirectToLogin).toBe(true);
			expect(config.defaultMessage).toBe("Logout timed out. Please try again.");
		});

		it("should handle unknown error types", () => {
			const config = createLogoutErrorConfig("unknown" as "api");

			expect(config.clearSession).toBe(true);
			expect(config.redirectToLogin).toBe(true);
			expect(config.defaultMessage).toBe("Logout failed. Please try again.");
		});
	});

	describe("Edge Cases and Security", () => {
		it("should handle extremely long usernames", () => {
			const longName = "A".repeat(200);
			const userInfo = createSafeUserDisplayInfo(longName, "team_lead");

			expect(userInfo.name).toHaveLength(100);
		});

		it("should handle special characters in names", () => {
			const specialName = "José María O'Connor-Smith";
			const result = sanitizeUserDisplayName(specialName);

			expect(result).toBe("José María OConnor-Smith");
		});

		it("should handle null and undefined values gracefully", () => {
			const userInfo = createSafeUserDisplayInfo(null as unknown as string, undefined as unknown as string);

			expect(userInfo.name).toBe("");
			expect(userInfo.role).toBe("basic_user");
		});

		it("should maintain type safety in navigation state", () => {
			const state = calculateNavigationState(true, { name: "Test", role: "team_lead" });

			expect(typeof state.isAuthenticated).toBe("boolean");
			expect(Array.isArray(state.containerClasses)).toBe(true);
			expect(typeof state.userInfoDisplay.visible).toBe("boolean");
			expect(typeof state.userInfoDisplay.text).toBe("string");
		});
	});
});
