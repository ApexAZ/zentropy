import { describe, it, expect, beforeEach } from "vitest";
import {
	// ============= USER DISPLAY UTILITIES =============
	formatUserForDisplay,
	formatRoleForDisplay,
	sanitizeSearchInput,
	validateTeamManagementPermissions,
	validateSearchQuery,
	shouldPerformSearch,
	createErrorMessage,
	isRetryableError,
	// ============= NAVIGATION DISPLAY UTILITIES =============
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
	type UserDisplayInfo,
	// ============= PROFILE UI UTILITIES =============
	formatProfileDates,
	getRoleBadgeClass,
	validateProfileFormData,
	createProfileDisplayData,
	formatUserName,
	type ProfileFormData
} from "../../server/utils/ui-core";
import type { User, UserRole } from "../../server/models/User";

describe("UI Core - Consolidated UI Utilities", () => {
	// ============= USER DISPLAY UTILITIES TESTS (from u-user-display-utils.test.ts) =============
	describe("User Display Utilities", () => {
		describe("formatUserForDisplay", () => {
			it("should format user data correctly", () => {
				const user: User = {
					id: "user-1",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date("2024-01-01"),
					updated_at: new Date("2024-01-01")
				};

				const result = formatUserForDisplay(user);

				expect(result).toEqual({
					id: "user-1",
					displayName: "John Doe",
					email: "john.doe@example.com",
					role: "team_member",
					roleDisplayName: "Team Member"
				});
			});

			it("should handle team lead role", () => {
				const user: User = {
					id: "user-2",
					email: "jane.smith@example.com",
					first_name: "Jane",
					last_name: "Smith",
					role: "team_lead",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date("2024-01-01"),
					updated_at: new Date("2024-01-01")
				};

				const result = formatUserForDisplay(user);

				expect(result.roleDisplayName).toBe("Team Lead");
				expect(result.role).toBe("team_lead");
			});

			it("should handle basic user role", () => {
				const user: User = {
					id: "user-3",
					email: "bob.wilson@example.com",
					first_name: "Bob",
					last_name: "Wilson",
					role: "basic_user",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date("2024-01-01"),
					updated_at: new Date("2024-01-01")
				};

				const result = formatUserForDisplay(user);

				expect(result.roleDisplayName).toBe("Basic User");
				expect(result.role).toBe("basic_user");
			});
		});

		describe("formatRoleForDisplay", () => {
			it("should format known roles correctly", () => {
				expect(formatRoleForDisplay("basic_user")).toBe("Basic User");
				expect(formatRoleForDisplay("team_member")).toBe("Team Member");
				expect(formatRoleForDisplay("team_lead")).toBe("Team Lead");
			});

			it("should return the role as-is for unknown roles", () => {
				const unknownRole = "unknown_role" as UserRole;
				expect(formatRoleForDisplay(unknownRole)).toBe("unknown_role");
			});
		});

		describe("sanitizeSearchInput", () => {
			it("should remove script tags and content", () => {
				const maliciousInput = '<script>alert("xss")</script>Hello World';
				const result = sanitizeSearchInput(maliciousInput);
				expect(result).toBe("Hello World");
				expect(result).not.toContain("<script>");
				expect(result).not.toContain("alert");
			});

			it("should remove HTML tags but keep content", () => {
				const htmlInput = "<div>Hello <span>World</span></div>";
				const result = sanitizeSearchInput(htmlInput);
				expect(result).toBe("Hello World");
				expect(result).not.toContain("<div>");
				expect(result).not.toContain("<span>");
			});

			it("should handle mixed script and HTML tags", () => {
				const mixedInput = "<div>Safe content <script>dangerous()</script> more safe</div>";
				const result = sanitizeSearchInput(mixedInput);
				expect(result).toBe("Safe content  more safe");
			});

			it("should handle empty string", () => {
				expect(sanitizeSearchInput("")).toBe("");
			});

			it("should handle string with no HTML", () => {
				const plainText = "Just plain text";
				expect(sanitizeSearchInput(plainText)).toBe(plainText);
			});

			it("should remove complex nested scripts", () => {
				const nestedScript = '<div><script>alert("nested")</script><p>Content</p></div>';
				const result = sanitizeSearchInput(nestedScript);
				expect(result).toBe("Content");
			});
		});

		describe("validateTeamManagementPermissions", () => {
			it("should return true for team lead", () => {
				const teamLead: User = {
					id: "lead-1",
					email: "lead@example.com",
					first_name: "Team",
					last_name: "Lead",
					role: "team_lead",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				};

				expect(validateTeamManagementPermissions(teamLead)).toBe(true);
			});

			it("should return false for team member", () => {
				const teamMember: User = {
					id: "member-1",
					email: "member@example.com",
					first_name: "Team",
					last_name: "Member",
					role: "team_member",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				};

				expect(validateTeamManagementPermissions(teamMember)).toBe(false);
			});

			it("should return false for basic user", () => {
				const basicUser: User = {
					id: "user-1",
					email: "user@example.com",
					first_name: "Basic",
					last_name: "User",
					role: "basic_user",
					is_active: true,
					password_hash: "hashed",
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				};

				expect(validateTeamManagementPermissions(basicUser)).toBe(false);
			});
		});

		describe("validateSearchQuery", () => {
			it("should return true for valid search queries", () => {
				expect(validateSearchQuery("john")).toBe(true);
				expect(validateSearchQuery("john doe")).toBe(true);
				expect(validateSearchQuery("john.doe@example.com")).toBe(true);
				expect(validateSearchQuery("123")).toBe(true);
			});

			it("should return true for empty query", () => {
				expect(validateSearchQuery("")).toBe(true);
				expect(validateSearchQuery("   ")).toBe(true);
			});

			it("should return false for non-string input", () => {
				expect(validateSearchQuery(null as unknown as string)).toBe(false);
				expect(validateSearchQuery(undefined as unknown as string)).toBe(false);
				expect(validateSearchQuery(123 as unknown as string)).toBe(false);
				expect(validateSearchQuery({} as unknown as string)).toBe(false);
			});

			it("should return false for queries that are too long", () => {
				const longQuery = "a".repeat(101);
				expect(validateSearchQuery(longQuery)).toBe(false);
			});

			it("should return false for queries with HTML tags", () => {
				expect(validateSearchQuery("<script>alert('xss')</script>")).toBe(false);
				expect(validateSearchQuery("<div>content</div>")).toBe(false);
				expect(validateSearchQuery("john<span>doe</span>")).toBe(false);
			});

			it("should handle edge cases", () => {
				expect(validateSearchQuery("a")).toBe(true); // Single character
				expect(validateSearchQuery("a".repeat(100))).toBe(true); // Exactly max length
				expect(validateSearchQuery("user@domain.com")).toBe(true); // Email format
			});
		});

		describe("shouldPerformSearch", () => {
			it("should return true for queries with 2+ characters", () => {
				expect(shouldPerformSearch("ab")).toBe(true);
				expect(shouldPerformSearch("abc")).toBe(true);
				expect(shouldPerformSearch("john doe")).toBe(true);
			});

			it("should return true for empty queries", () => {
				expect(shouldPerformSearch("")).toBe(true);
				expect(shouldPerformSearch("   ")).toBe(true);
			});

			it("should return false for single character queries", () => {
				expect(shouldPerformSearch("a")).toBe(false);
				expect(shouldPerformSearch("1")).toBe(false);
				expect(shouldPerformSearch(" x ")).toBe(false);
			});

			it("should sanitize input before checking", () => {
				expect(shouldPerformSearch("<script>ab</script>")).toBe(true); // "" after sanitization (empty string returns true)
				expect(shouldPerformSearch("<div>a</div>")).toBe(false); // "a" after sanitization
			});
		});

		describe("createErrorMessage", () => {
			it("should extract message from Error objects", () => {
				const error = new Error("Network connection failed");
				expect(createErrorMessage(error)).toBe("Network connection failed");
			});

			it("should use default context for non-Error objects", () => {
				expect(createErrorMessage("some string")).toBe("Failed to operation");
				expect(createErrorMessage(null)).toBe("Failed to operation");
				expect(createErrorMessage(undefined)).toBe("Failed to operation");
			});

			it("should use custom context when provided", () => {
				expect(createErrorMessage("some error", "load data")).toBe("Failed to load data");
				expect(createErrorMessage(null, "save profile")).toBe("Failed to save profile");
			});

			it("should handle Error objects with custom context", () => {
				const error = new Error("Validation failed");
				expect(createErrorMessage(error, "update user")).toBe("Validation failed");
			});
		});

		describe("isRetryableError", () => {
			it("should return true for network-related errors", () => {
				expect(isRetryableError(new Error("Network timeout"))).toBe(true);
				expect(isRetryableError(new Error("Fetch failed"))).toBe(true);
				expect(isRetryableError(new Error("Connection refused"))).toBe(true);
				expect(isRetryableError(new Error("NETWORK ERROR"))).toBe(true); // Case insensitive
			});

			it("should return false for non-network errors", () => {
				expect(isRetryableError(new Error("Validation failed"))).toBe(false);
				expect(isRetryableError(new Error("User not found"))).toBe(false);
				expect(isRetryableError(new Error("Permission denied"))).toBe(false);
			});

			it("should return false for non-Error objects", () => {
				expect(isRetryableError("network error")).toBe(false);
				expect(isRetryableError(null)).toBe(false);
				expect(isRetryableError(undefined)).toBe(false);
			});
		});
	});

	// ============= NAVIGATION DISPLAY UTILITIES TESTS (from u-navigation-display-utils.test.ts) =============
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
				expect(getRoleDisplayName("invalid")).toBe("User");
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

			it("should handle different roles", () => {
				const teamMember: UserDisplayInfo = {
					name: "Jane Smith",
					role: "team_member"
				};

				const basicUser: UserDisplayInfo = {
					name: "Bob Wilson",
					role: "basic_user"
				};

				expect(formatUserDisplayText(teamMember)).toBe("Jane Smith (Team Member)");
				expect(formatUserDisplayText(basicUser)).toBe("Bob Wilson (User)");
			});

			it("should handle unknown roles", () => {
				const unknownUser: UserDisplayInfo = {
					name: "Test User",
					role: "unknown_role"
				};

				expect(formatUserDisplayText(unknownUser)).toBe("Test User (User)");
			});
		});

		describe("calculateNavigationState", () => {
			it("should return authenticated state when user is authenticated", () => {
				const userInfo: UserDisplayInfo = {
					name: "John Doe",
					role: "team_lead"
				};

				const state = calculateNavigationState(true, userInfo);

				expect(state.isAuthenticated).toBe(true);
				expect(state.userInfo).toEqual(userInfo);
				expect(state.containerClasses).toEqual(["authenticated"]);
				expect(state.userInfoDisplay.visible).toBe(true);
				expect(state.userInfoDisplay.text).toBe("John Doe (Team Lead)");
				expect(state.logoutButtonDisplay.visible).toBe(true);
				expect(state.logoutButtonDisplay.text).toBe("Logout");
				expect(state.logoutButtonDisplay.action).toBe("logout");
			});

			it("should return unauthenticated state when user is not authenticated", () => {
				const state = calculateNavigationState(false);

				expect(state.isAuthenticated).toBe(false);
				expect(state.userInfo).toBeUndefined();
				expect(state.containerClasses).toEqual(["unauthenticated"]);
				expect(state.userInfoDisplay.visible).toBe(false);
				expect(state.userInfoDisplay.text).toBe("");
				expect(state.logoutButtonDisplay.visible).toBe(false);
				expect(state.logoutButtonDisplay.text).toBe("");
				expect(state.logoutButtonDisplay.action).toBeUndefined();
			});

			it("should return unauthenticated state when authenticated but no user info", () => {
				const state = calculateNavigationState(true);

				expect(state.isAuthenticated).toBe(false);
				expect(state.containerClasses).toEqual(["unauthenticated"]);
			});
		});

		describe("createLogoutRequest", () => {
			it("should create correct logout request configuration", () => {
				const config = createLogoutRequest();

				expect(config.method).toBe("POST");
				expect(config.credentials).toBe("include");
				expect(config.headers).toEqual({
					"Content-Type": "application/json"
				});
			});
		});

		describe("buildLogoutApiUrl", () => {
			it("should return correct logout API URL", () => {
				expect(buildLogoutApiUrl()).toBe("/api/users/logout");
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
			it("should return success message when logout succeeds", () => {
				const message = getLogoutRedirectMessage(true);
				expect(message).toBe("You have been logged out successfully.");
			});

			it("should return error message when logout fails with specific error", () => {
				const message = getLogoutRedirectMessage(false, "Session expired");
				expect(message).toBe("Logout incomplete: Session expired");
			});

			it("should return generic error message when logout fails without specific error", () => {
				const message = getLogoutRedirectMessage(false);
				expect(message).toBe("Network error during logout. Please try again.");
			});
		});

		describe("isValidUserRole", () => {
			it("should return true for valid roles", () => {
				expect(isValidUserRole("basic_user")).toBe(true);
				expect(isValidUserRole("team_member")).toBe(true);
				expect(isValidUserRole("team_lead")).toBe(true);
			});

			it("should return false for invalid roles", () => {
				expect(isValidUserRole("invalid_role")).toBe(false);
				expect(isValidUserRole("")).toBe(false);
				expect(isValidUserRole("admin")).toBe(false);
				expect(isValidUserRole("user")).toBe(false);
			});
		});

		describe("sanitizeUserDisplayName", () => {
			it("should sanitize HTML tags from user names", () => {
				expect(sanitizeUserDisplayName("<script>alert('xss')</script>John Doe")).toBe("John Doe");
				expect(sanitizeUserDisplayName("<div>Jane <span>Smith</span></div>")).toBe("Jane Smith");
			});

			it("should remove dangerous characters", () => {
				expect(sanitizeUserDisplayName("John<>Doe")).toBe("JohnDoe");
				expect(sanitizeUserDisplayName("Jane'Smith")).toBe("JaneSmith");
				expect(sanitizeUserDisplayName('Bob"Wilson')).toBe("BobWilson");
				expect(sanitizeUserDisplayName("Test&User")).toBe("TestUser");
				expect(sanitizeUserDisplayName("User(Name)")).toBe("UserName");
			});

			it("should trim whitespace", () => {
				expect(sanitizeUserDisplayName("  John Doe  ")).toBe("John Doe");
				expect(sanitizeUserDisplayName("\t\nJane Smith\r\n")).toBe("Jane Smith");
			});

			it("should limit length to 100 characters", () => {
				const longName = "a".repeat(150);
				const result = sanitizeUserDisplayName(longName);
				expect(result.length).toBe(100);
				expect(result).toBe("a".repeat(100));
			});

			it("should handle empty and invalid inputs", () => {
				expect(sanitizeUserDisplayName("")).toBe("");
				expect(sanitizeUserDisplayName(null as unknown as string)).toBe("");
				expect(sanitizeUserDisplayName(undefined as unknown as string)).toBe("");
			});
		});

		describe("createSafeUserDisplayInfo", () => {
			it("should create safe user display info with valid inputs", () => {
				const result = createSafeUserDisplayInfo("John Doe", "team_lead");

				expect(result.name).toBe("John Doe");
				expect(result.role).toBe("team_lead");
			});

			it("should sanitize name and fallback role for invalid inputs", () => {
				const result = createSafeUserDisplayInfo("<script>Evil</script>User", "invalid_role");

				expect(result.name).toBe("User");
				expect(result.role).toBe("basic_user");
			});

			it("should handle empty name", () => {
				const result = createSafeUserDisplayInfo("", "team_member");

				expect(result.name).toBe("");
				expect(result.role).toBe("team_member");
			});
		});

		describe("createNavigationHTML", () => {
			it("should generate standardized navigation HTML", () => {
				const html = createNavigationHTML();

				expect(html).toContain("Capacity Planner");
				expect(html).toContain("team-configuration.html");
				expect(html).toContain("teams.html");
				expect(html).toContain("calendar.html");
				expect(html).toContain("user-info");
				expect(html).toContain("logout-btn");
				expect(html).toContain('data-action="logout"');
			});
		});

		describe("getNavigationContainerClasses", () => {
			it("should return authenticated classes when user is authenticated", () => {
				const classes = getNavigationContainerClasses(true);
				expect(classes).toEqual(["authenticated"]);
			});

			it("should return unauthenticated classes when user is not authenticated", () => {
				const classes = getNavigationContainerClasses(false);
				expect(classes).toEqual(["unauthenticated"]);
			});
		});

		describe("calculateElementVisibility", () => {
			it("should show elements when authenticated", () => {
				const visibility = calculateElementVisibility(true);

				expect(visibility.userInfo).toBe(true);
				expect(visibility.logoutButton).toBe(true);
			});

			it("should hide elements when not authenticated", () => {
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
		});
	});

	// ============= PROFILE UI UTILITIES TESTS (from profile-ui-utils.test.ts) =============
	describe("Profile UI Utilities", () => {
		describe("formatProfileDates", () => {
			it("should return 'Never' for null input", () => {
				const result = formatProfileDates(null);
				expect(result).toBe("Never");
			});

			it("should return 'Never' for empty string", () => {
				const result = formatProfileDates("");
				expect(result).toBe("Never");
			});

			it("should return 'Invalid date' for invalid date string", () => {
				const result = formatProfileDates("invalid-date");
				expect(result).toBe("Invalid date");
			});

			it("should format valid dates with relative time", () => {
				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				const result = formatProfileDates(yesterday.toISOString());

				expect(result).toContain("1 day ago");
				expect(result).toContain("date-formatted");
				expect(result).toContain("date-relative");
			});

			it("should handle today's date", () => {
				const today = new Date().toISOString();
				const result = formatProfileDates(today);

				expect(result).toContain("today");
			});

			it("should handle dates from multiple days ago", () => {
				const fiveDaysAgo = new Date();
				fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
				const result = formatProfileDates(fiveDaysAgo.toISOString());

				expect(result).toContain("5 days ago");
			});

			it("should handle dates from months ago", () => {
				const twoMonthsAgo = new Date();
				twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
				const result = formatProfileDates(twoMonthsAgo.toISOString());

				expect(result).toContain("2 months ago");
			});

			it("should handle dates from years ago", () => {
				const twoYearsAgo = new Date();
				twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
				const result = formatProfileDates(twoYearsAgo.toISOString());

				expect(result).toContain("2 years ago");
			});
		});

		describe("getRoleBadgeClass", () => {
			it("should return 'team-lead' class for team lead role", () => {
				expect(getRoleBadgeClass("team_lead")).toBe("team-lead");
			});

			it("should return 'team-member' class for team member role", () => {
				expect(getRoleBadgeClass("team_member")).toBe("team-member");
			});

			it("should return 'team-member' class for undefined role", () => {
				expect(getRoleBadgeClass(undefined)).toBe("team-member");
			});
		});

		describe("formatUserName", () => {
			it("should format full names correctly", () => {
				expect(formatUserName("John", "Doe")).toBe("John Doe");
				expect(formatUserName("Jane", "Smith")).toBe("Jane Smith");
			});

			it("should handle missing last name", () => {
				expect(formatUserName("John", "")).toBe("John");
				expect(formatUserName("John", "   ")).toBe("John");
			});

			it("should handle missing first name", () => {
				expect(formatUserName("", "Doe")).toBe("Doe");
				expect(formatUserName("   ", "Doe")).toBe("Doe");
			});

			it("should return 'Unknown User' for empty names", () => {
				expect(formatUserName("", "")).toBe("Unknown User");
				expect(formatUserName("   ", "   ")).toBe("Unknown User");
			});

			it("should trim whitespace", () => {
				expect(formatUserName("  John  ", "  Doe  ")).toBe("John Doe");
			});
		});

		describe("validateProfileFormData", () => {
			let validFormData: ProfileFormData;

			beforeEach(() => {
				validFormData = {
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				};
			});

			it("should validate correct form data", () => {
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
				expect(result.sanitizedData).toEqual({
					first_name: "John",
					last_name: "Doe",
					email: "john.doe@example.com"
				});
			});

			it("should require first name", () => {
				validFormData.first_name = "";
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.first_name).toBe("First name is required");
			});

			it("should require last name", () => {
				validFormData.last_name = "";
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.last_name).toBe("Last name is required");
			});

			it("should require email", () => {
				validFormData.email = "";
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toBe("Email is required");
			});

			it("should validate email format", () => {
				validFormData.email = "invalid-email";
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toBe("Please enter a valid email address");
			});

			it("should enforce first name length limit", () => {
				validFormData.first_name = "a".repeat(51);
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.first_name).toBe("First name must be less than 50 characters");
			});

			it("should enforce last name length limit", () => {
				validFormData.last_name = "a".repeat(51);
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.last_name).toBe("Last name must be less than 50 characters");
			});

			it("should enforce email length limit", () => {
				validFormData.email = "a".repeat(250) + "@example.com";
				const result = validateProfileFormData(validFormData);

				expect(result.isValid).toBe(false);
				expect(result.errors.email).toBe("Email must be less than 255 characters");
			});

			it("should sanitize XSS in names", () => {
				validFormData.first_name = "<script>alert('xss')</script>John";
				validFormData.last_name = "<div>Doe</div>";
				const result = validateProfileFormData(validFormData);

				expect(result.sanitizedData?.first_name).toBe("John");
				expect(result.sanitizedData?.last_name).toBe("Doe");
			});

			it("should normalize email", () => {
				validFormData.email = "  John.Doe@EXAMPLE.COM  ";
				const result = validateProfileFormData(validFormData);

				expect(result.sanitizedData?.email).toBe("john.doe@example.com");
			});
		});

		describe("createProfileDisplayData", () => {
			it("should create display data for team lead", () => {
				const userProfile = {
					id: "user-1",
					email: "john.doe@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_lead" as const,
					is_active: true,
					last_login_at: "2024-01-15T10:30:00Z",
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-15T10:30:00Z"
				};

				const result = createProfileDisplayData(userProfile);

				expect(result.fullName).toBe("John Doe");
				expect(result.roleText).toBe("Team Lead");
				expect(result.roleBadgeClass).toBe("team-lead");
				expect(result.lastLoginFormatted).toContain("January 15, 2024");
				expect(result.createdDateFormatted).toContain("January 1, 2024");
				expect(result.updatedDateFormatted).toContain("January 15, 2024");
			});

			it("should create display data for team member", () => {
				const userProfile = {
					id: "user-2",
					email: "jane.smith@example.com",
					first_name: "Jane",
					last_name: "Smith",
					role: "team_member" as const,
					is_active: true,
					last_login_at: null,
					created_at: "2024-01-01T00:00:00Z"
				};

				const result = createProfileDisplayData(userProfile);

				expect(result.fullName).toBe("Jane Smith");
				expect(result.roleText).toBe("Team Member");
				expect(result.roleBadgeClass).toBe("team-member");
				expect(result.lastLoginFormatted).toBe("Never");
				expect(result.createdDateFormatted).toContain("January 1, 2024");
				expect(result.updatedDateFormatted).toBeUndefined();
			});

			it("should handle missing optional fields", () => {
				const userProfile = {
					id: "user-3",
					email: "bob.wilson@example.com",
					first_name: "Bob",
					last_name: "Wilson"
				};

				const result = createProfileDisplayData(userProfile);

				expect(result.fullName).toBe("Bob Wilson");
				expect(result.roleText).toBe("Team Member");
				expect(result.roleBadgeClass).toBe("team-member");
				expect(result.lastLoginFormatted).toBe("Never");
				expect(result.createdDateFormatted).toBeUndefined();
				expect(result.updatedDateFormatted).toBeUndefined();
			});
		});
	});

	// ============= INTEGRATION TESTS =============
	describe("Integration Scenarios", () => {
		it("should provide consistent role formatting across all utilities", () => {
			// Test that role formatting is consistent between user-display and navigation utilities
			expect(formatRoleForDisplay("team_lead")).toBe("Team Lead");
			expect(getRoleDisplayName("team_lead")).toBe("Team Lead");

			expect(formatRoleForDisplay("team_member")).toBe("Team Member");
			expect(getRoleDisplayName("team_member")).toBe("Team Member");

			expect(formatRoleForDisplay("basic_user")).toBe("Basic User");
			expect(getRoleDisplayName("basic_user")).toBe("User"); // Slight difference maintained for backward compatibility
		});

		it("should handle comprehensive user display workflow", () => {
			const user: User = {
				id: "user-1",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			// Format user for search display
			const userDisplay = formatUserForDisplay(user);
			expect(userDisplay.displayName).toBe("John Doe");
			expect(userDisplay.roleDisplayName).toBe("Team Lead");

			// Create navigation info
			const navInfo: UserDisplayInfo = {
				name: userDisplay.displayName,
				role: userDisplay.role
			};

			// Calculate navigation state
			const navState = calculateNavigationState(true, navInfo);
			expect(navState.userInfoDisplay.text).toBe("John Doe (Team Lead)");
			expect(navState.logoutButtonDisplay.visible).toBe(true);

			// Validate permissions
			expect(validateTeamManagementPermissions(user)).toBe(true);
		});

		it("should sanitize input consistently across utilities", () => {
			const maliciousInput = '<script>alert("xss")</script>John Doe';

			// User display sanitization
			const searchSanitized = sanitizeSearchInput(maliciousInput);
			expect(searchSanitized).toBe("John Doe");

			// Navigation sanitization
			const navSanitized = sanitizeUserDisplayName(maliciousInput);
			expect(navSanitized).toBe("John Doe");

			// Both should produce safe output
			expect(searchSanitized).not.toContain("<script>");
			expect(navSanitized).not.toContain("<script>");
		});

		it("should handle user profile to navigation display pipeline", () => {
			const userProfile = {
				id: "user-1",
				email: "jane.smith@example.com",
				first_name: "Jane",
				last_name: "Smith",
				role: "team_member" as const,
				is_active: true,
				last_login_at: "2024-01-15T10:30:00Z"
			};

			// Create profile display data
			const profileDisplay = createProfileDisplayData(userProfile);
			expect(profileDisplay.fullName).toBe("Jane Smith");
			expect(profileDisplay.roleText).toBe("Team Member");

			// Create navigation user info
			const navInfo = createSafeUserDisplayInfo(profileDisplay.fullName, userProfile.role);
			expect(navInfo.name).toBe("Jane Smith");
			expect(navInfo.role).toBe("team_member");

			// Format for navigation display
			const navText = formatUserDisplayText(navInfo);
			expect(navText).toBe("Jane Smith (Team Member)");
		});

		it("should validate and format profile form data correctly", () => {
			const formData: ProfileFormData = {
				first_name: "  <script>alert('xss')</script>John  ",
				last_name: "  <div>Doe</div>  ",
				email: "  JOHN.DOE@EXAMPLE.COM  "
			};

			// Validate and sanitize
			const validationResult = validateProfileFormData(formData);
			expect(validationResult.isValid).toBe(true);
			expect(validationResult.sanitizedData?.first_name).toBe("John");
			expect(validationResult.sanitizedData?.last_name).toBe("Doe");
			expect(validationResult.sanitizedData?.email).toBe("john.doe@example.com");

			// Use sanitized data to create profile display
			if (validationResult.sanitizedData) {
				const userProfile = {
					id: "user-1",
					...validationResult.sanitizedData,
					role: "team_lead" as const
				};

				const displayData = createProfileDisplayData(userProfile);
				expect(displayData.fullName).toBe("John Doe");
				expect(displayData.roleText).toBe("Team Lead");
			}
		});

		it("should handle error scenarios consistently across utilities", () => {
			const networkError = new Error("Network connection failed");
			const validationError = new Error("Validation failed");

			// Check error message creation
			expect(createErrorMessage(networkError)).toBe("Network connection failed");
			expect(createErrorMessage(validationError)).toBe("Validation failed");

			// Check retry logic
			expect(isRetryableError(networkError)).toBe(true);
			expect(isRetryableError(validationError)).toBe(false);

			// Check logout error configuration
			const logoutConfig = createLogoutErrorConfig("network");
			expect(logoutConfig.defaultMessage).toContain("Network error");
			expect(logoutConfig.clearSession).toBe(true);
		});

		it("should maintain role validation consistency", () => {
			const validRoles = ["basic_user", "team_member", "team_lead"];
			const invalidRoles = ["admin", "super_user", "", "invalid"];

			validRoles.forEach(role => {
				expect(isValidUserRole(role)).toBe(true);

				// Should get consistent display names
				const navDisplay = getRoleDisplayName(role);
				const userDisplay = formatRoleForDisplay(role as UserRole);

				expect(navDisplay).toBeTruthy();
				expect(userDisplay).toBeTruthy();
			});

			invalidRoles.forEach(role => {
				expect(isValidUserRole(role)).toBe(false);

				// Should fallback gracefully
				const safeInfo = createSafeUserDisplayInfo("Test User", role);
				expect(safeInfo.role).toBe("basic_user"); // Safe fallback
			});
		});

		it("should handle date formatting across profile utilities", () => {
			const testDate = "2024-01-15T10:30:00Z";

			// Format profile date
			const formattedDate = formatProfileDates(testDate);
			expect(formattedDate).toContain("January 15, 2024");
			expect(formattedDate).toContain("date-formatted");

			// Use in profile display
			const userProfile = {
				id: "user-1",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				last_login_at: testDate,
				created_at: testDate
			};

			const displayData = createProfileDisplayData(userProfile);
			expect(displayData.lastLoginFormatted).toContain("January 15, 2024");
			expect(displayData.createdDateFormatted).toContain("January 15, 2024");
		});

		it("should handle search validation and navigation state together", () => {
			// Test search query validation
			const validQuery = "john doe";
			const invalidQuery = "<script>alert('xss')</script>";

			expect(validateSearchQuery(validQuery)).toBe(true);
			expect(validateSearchQuery(invalidQuery)).toBe(false);
			expect(shouldPerformSearch(validQuery)).toBe(true);

			// Test navigation state with search context
			const userInfo: UserDisplayInfo = {
				name: sanitizeUserDisplayName("John Doe"),
				role: "team_lead"
			};

			const navState = calculateNavigationState(true, userInfo);
			expect(navState.userInfoDisplay.text).toBe("John Doe (Team Lead)");

			// Validate team management permissions for search functionality
			const user: User = {
				id: "user-1",
				email: "john.doe@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			expect(validateTeamManagementPermissions(user)).toBe(true);
		});

		it("should create complete logout workflow with error handling", () => {
			// Create logout workflow
			const workflow = createLogoutWorkflow();
			expect(workflow.apiUrl).toBe("/api/users/logout");
			expect(workflow.requestConfig.method).toBe("POST");

			// Test success scenario
			const successMessage = getLogoutRedirectMessage(true);
			expect(successMessage).toBe("You have been logged out successfully.");

			// Test error scenarios
			const networkErrorMessage = getLogoutRedirectMessage(false, "Network timeout");
			expect(networkErrorMessage).toBe("Logout incomplete: Network timeout");

			const errorConfig = createLogoutErrorConfig("network");
			expect(errorConfig.clearSession).toBe(true);
			expect(errorConfig.redirectToLogin).toBe(true);

			// Should handle error message creation consistently
			const networkError = new Error("Network timeout");
			expect(isRetryableError(networkError)).toBe(true);
			expect(createErrorMessage(networkError, "logout")).toBe("Network timeout");
		});
	});

	// ============= ERROR HANDLING AND EDGE CASES =============
	describe("Error Handling", () => {
		it("should handle null/undefined inputs gracefully across all utilities", () => {
			// User display utilities
			expect(createErrorMessage(null, "test")).toBe("Failed to test");
			expect(isRetryableError(null)).toBe(false);
			expect(validateSearchQuery(null as unknown as string)).toBe(false);

			// Navigation utilities
			expect(sanitizeUserDisplayName(null as unknown as string)).toBe("");
			expect(getRoleDisplayName("")).toBe("User");
			expect(isValidUserRole("")).toBe(false);

			// Profile utilities
			expect(formatProfileDates(null)).toBe("Never");
			expect(formatUserName("", "")).toBe("Unknown User");
			expect(getRoleBadgeClass(undefined)).toBe("team-member");
		});

		it("should provide safe defaults for invalid inputs", () => {
			// Invalid role handling
			const safeUserInfo = createSafeUserDisplayInfo("Test User", "invalid_role");
			expect(safeUserInfo.role).toBe("basic_user");

			// Invalid date handling
			expect(formatProfileDates("invalid-date")).toBe("Invalid date");

			// Invalid search queries
			expect(shouldPerformSearch("<script>a</script>")).toBe(true); // "" after sanitization (empty string returns true)

			// Navigation state without user info
			const navState = calculateNavigationState(true);
			expect(navState.isAuthenticated).toBe(false);
		});

		it("should maintain consistent error message formats", () => {
			const testError = new Error("Test error message");

			// Should extract actual error messages
			expect(createErrorMessage(testError)).toBe("Test error message");
			expect(createErrorMessage(testError, "custom operation")).toBe("Test error message");

			// Should create contextual messages for non-errors
			expect(createErrorMessage("string", "load data")).toBe("Failed to load data");
			expect(createErrorMessage(null, "save profile")).toBe("Failed to save profile");
		});
	});
});
