import { describe, it, expect } from "vitest";
import {
	formatUserForDisplay,
	formatRoleForDisplay,
	sanitizeSearchInput,
	validateTeamManagementPermissions,
	validateSearchQuery,
	shouldPerformSearch,
	createErrorMessage,
	isRetryableError
} from "../../utils/user-display-utils";
import type { User } from "../../models/User";

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

		it("should handle empty names", () => {
			const user: User = {
				id: "user-1",
				email: "test@example.com",
				first_name: "",
				last_name: "",
				role: "basic_user",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			const result = formatUserForDisplay(user);

			expect(result.displayName).toBe(" ");
			expect(result.roleDisplayName).toBe("Basic User");
		});
	});

	describe("formatRoleForDisplay", () => {
		it("should format basic_user role", () => {
			expect(formatRoleForDisplay("basic_user")).toBe("Basic User");
		});

		it("should format team_member role", () => {
			expect(formatRoleForDisplay("team_member")).toBe("Team Member");
		});

		it("should format team_lead role", () => {
			expect(formatRoleForDisplay("team_lead")).toBe("Team Lead");
		});
	});

	describe("sanitizeSearchInput", () => {
		it("should remove HTML tags from search input", () => {
			expect(sanitizeSearchInput("<script>alert('xss')</script>john")).toBe("john");
			expect(sanitizeSearchInput("<div>john</div>")).toBe("john");
			expect(sanitizeSearchInput("john<br>doe")).toBe("johndoe");
		});

		it("should preserve normal text", () => {
			expect(sanitizeSearchInput("john doe")).toBe("john doe");
			expect(sanitizeSearchInput("john.doe@example.com")).toBe("john.doe@example.com");
			expect(sanitizeSearchInput("123")).toBe("123");
		});

		it("should handle empty and whitespace input", () => {
			expect(sanitizeSearchInput("")).toBe("");
			expect(sanitizeSearchInput("   ")).toBe("   ");
			expect(sanitizeSearchInput("\t\n")).toBe("\t\n");
		});

		it("should handle complex HTML with attributes", () => {
			expect(sanitizeSearchInput('<img src="x" onerror="alert(1)">john')).toBe("john");
			expect(sanitizeSearchInput('<a href="javascript:alert()">link</a>')).toBe("link");
		});
	});

	describe("validateTeamManagementPermissions", () => {
		it("should validate team lead permissions", () => {
			const user: User = {
				id: "user-1",
				email: "lead@example.com",
				first_name: "Team",
				last_name: "Lead",
				role: "team_lead",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			expect(validateTeamManagementPermissions(user)).toBe(true);
		});

		it("should deny basic user permissions", () => {
			const user: User = {
				id: "user-1",
				email: "basic@example.com",
				first_name: "Basic",
				last_name: "User",
				role: "basic_user",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			expect(validateTeamManagementPermissions(user)).toBe(false);
		});

		it("should deny team member permissions", () => {
			const user: User = {
				id: "user-1",
				email: "member@example.com",
				first_name: "Team",
				last_name: "Member",
				role: "team_member",
				is_active: true,
				password_hash: "hashed",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			expect(validateTeamManagementPermissions(user)).toBe(false);
		});
	});

	describe("validateSearchQuery", () => {
		it("should validate normal search queries", () => {
			expect(validateSearchQuery("john")).toBe(true);
			expect(validateSearchQuery("john doe")).toBe(true);
			expect(validateSearchQuery("test@example.com")).toBe(true);
		});

		it("should allow empty queries", () => {
			expect(validateSearchQuery("")).toBe(true);
			expect(validateSearchQuery("   ")).toBe(true);
		});

		it("should reject non-string inputs", () => {
			expect(validateSearchQuery(123 as unknown as string)).toBe(false);
			expect(validateSearchQuery(null as unknown as string)).toBe(false);
			expect(validateSearchQuery(undefined as unknown as string)).toBe(false);
		});

		it("should reject queries with HTML tags", () => {
			expect(validateSearchQuery("<script>alert('xss')</script>")).toBe(false);
			expect(validateSearchQuery("<div>john</div>")).toBe(false);
			expect(validateSearchQuery("john<br>")).toBe(false);
		});

		it("should reject overly long queries", () => {
			const longQuery = "a".repeat(101);
			expect(validateSearchQuery(longQuery)).toBe(false);
		});

		it("should accept queries at the length limit", () => {
			const maxQuery = "a".repeat(100);
			expect(validateSearchQuery(maxQuery)).toBe(true);
		});
	});

	describe("shouldPerformSearch", () => {
		it("should allow searches for queries 2+ characters", () => {
			expect(shouldPerformSearch("jo")).toBe(true);
			expect(shouldPerformSearch("john")).toBe(true);
			expect(shouldPerformSearch("test query")).toBe(true);
		});

		it("should allow empty queries", () => {
			expect(shouldPerformSearch("")).toBe(true);
			expect(shouldPerformSearch("   ")).toBe(true);
		});

		it("should reject single character queries", () => {
			expect(shouldPerformSearch("j")).toBe(false);
			expect(shouldPerformSearch(" j ")).toBe(false);
		});

		it("should sanitize input before checking", () => {
			expect(shouldPerformSearch("<div>jo</div>")).toBe(true); // Becomes "jo"
			expect(shouldPerformSearch("<script>j</script>")).toBe(true); // Becomes "" (empty, which is allowed)
		});
	});

	describe("createErrorMessage", () => {
		it("should extract message from Error objects", () => {
			const error = new Error("Something went wrong");
			expect(createErrorMessage(error)).toBe("Something went wrong");
		});

		it("should handle non-Error objects with default context", () => {
			expect(createErrorMessage("string error")).toBe("Failed to operation");
			expect(createErrorMessage(null)).toBe("Failed to operation");
			expect(createErrorMessage(undefined)).toBe("Failed to operation");
		});

		it("should use custom context", () => {
			expect(createErrorMessage("unknown", "search users")).toBe("Failed to search users");
			expect(createErrorMessage(123, "load data")).toBe("Failed to load data");
		});
	});

	describe("isRetryableError", () => {
		it("should identify network errors as retryable", () => {
			expect(isRetryableError(new Error("Network error"))).toBe(true);
			expect(isRetryableError(new Error("Fetch failed"))).toBe(true);
			expect(isRetryableError(new Error("Connection timeout"))).toBe(true);
		});

		it("should identify case-insensitive network errors", () => {
			expect(isRetryableError(new Error("NETWORK ERROR"))).toBe(true);
			expect(isRetryableError(new Error("Fetch Failed"))).toBe(true);
		});

		it("should not identify non-network errors as retryable", () => {
			expect(isRetryableError(new Error("Invalid credentials"))).toBe(false);
			expect(isRetryableError(new Error("Unauthorized"))).toBe(false);
			expect(isRetryableError(new Error("Bad request"))).toBe(false);
		});

		it("should handle non-Error objects", () => {
			expect(isRetryableError("network error")).toBe(false);
			expect(isRetryableError(null)).toBe(false);
			expect(isRetryableError(undefined)).toBe(false);
		});
	});
});
