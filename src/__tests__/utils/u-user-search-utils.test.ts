import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import { UserModel } from "../../models/User";
import type { User, UserRole } from "../../models/User";
import {
	searchUsers,
	filterUsersByRole,
	excludeCurrentUser,
	sanitizeUserForSearch,
	performUserSearch,
	validateSearchQuery,
	validateSearchLimit,
	hasUserSearchPermission
} from "../../utils/user-search-utils";
import type { UserSearchParams } from "../../utils/user-search-utils";

// Mock the UserModel
vi.mock("../../models/User");

// Type the mocked UserModel
const mockUserModel = UserModel as {
	findAll: Mock;
	findById: Mock;
};

describe("User Search Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("searchUsers", () => {
		it("should search users by email with case insensitive matching", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "john.doe@example.com",
					password_hash: "hash1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "jane.smith@example.com",
					password_hash: "hash2",
					first_name: "Jane",
					last_name: "Smith",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "JOHN");

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.email).toBe("john.doe@example.com");
		});

		it("should search users by first name with partial matching", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "john.doe@example.com",
					password_hash: "hash1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "johnny.appleseed@example.com",
					password_hash: "hash2",
					first_name: "Johnny",
					last_name: "Appleseed",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "john");

			// ASSERT
			expect(result).toHaveLength(2);
			expect(result.map(u => u.first_name)).toEqual(expect.arrayContaining(["John", "Johnny"]));
		});

		it("should search users by last name", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "john.doe@example.com",
					password_hash: "hash1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "jane.doe@example.com",
					password_hash: "hash2",
					first_name: "Jane",
					last_name: "Doe",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "doe");

			// ASSERT
			expect(result).toHaveLength(2);
			expect(result.every(u => u.last_name === "Doe")).toBe(true);
		});

		it("should exclude inactive users from search results", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "active@example.com",
					password_hash: "hash1",
					first_name: "Active",
					last_name: "User",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "inactive@example.com",
					password_hash: "hash2",
					first_name: "Inactive",
					last_name: "User",
					role: "basic_user",
					is_active: false,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "user");

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.email).toBe("active@example.com");
		});

		it("should return empty array when no matches found", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "john.doe@example.com",
					password_hash: "hash1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "nonexistent");

			// ASSERT
			expect(result).toHaveLength(0);
		});

		it("should handle empty search query by returning all active users", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "user1@example.com",
					password_hash: "hash1",
					first_name: "User",
					last_name: "One",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "user2@example.com",
					password_hash: "hash2",
					first_name: "User",
					last_name: "Two",
					role: "basic_user",
					is_active: false,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = searchUsers(users, "");

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.is_active).toBe(true);
		});
	});

	describe("filterUsersByRole", () => {
		it("should filter users by specific role", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "basic@example.com",
					password_hash: "hash1",
					first_name: "Basic",
					last_name: "User",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "member@example.com",
					password_hash: "hash2",
					first_name: "Team",
					last_name: "Member",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-3",
					email: "lead@example.com",
					password_hash: "hash3",
					first_name: "Team",
					last_name: "Lead",
					role: "team_lead",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const basicUsers = filterUsersByRole(users, "basic_user");
			const teamMembers = filterUsersByRole(users, "team_member");
			const teamLeads = filterUsersByRole(users, "team_lead");

			// ASSERT
			expect(basicUsers).toHaveLength(1);
			expect(basicUsers[0]?.role).toBe("basic_user");
			expect(teamMembers).toHaveLength(1);
			expect(teamMembers[0]?.role).toBe("team_member");
			expect(teamLeads).toHaveLength(1);
			expect(teamLeads[0]?.role).toBe("team_lead");
		});

		it("should return empty array when no users match role", () => {
			// ARRANGE
			const users: User[] = [
				{
					id: "user-1",
					email: "member@example.com",
					password_hash: "hash1",
					first_name: "Team",
					last_name: "Member",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = filterUsersByRole(users, "team_lead");

			// ASSERT
			expect(result).toHaveLength(0);
		});
	});

	describe("excludeCurrentUser", () => {
		it("should exclude current user from search results", () => {
			// ARRANGE
			const currentUserId = "current-user";
			const users: User[] = [
				{
					id: "current-user",
					email: "current@example.com",
					password_hash: "hash1",
					first_name: "Current",
					last_name: "User",
					role: "team_lead",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "other-user",
					email: "other@example.com",
					password_hash: "hash2",
					first_name: "Other",
					last_name: "User",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = excludeCurrentUser(users, currentUserId);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe("other-user");
		});

		it("should return all users when current user not in list", () => {
			// ARRANGE
			const currentUserId = "nonexistent-user";
			const users: User[] = [
				{
					id: "user-1",
					email: "user1@example.com",
					password_hash: "hash1",
					first_name: "User",
					last_name: "One",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "user2@example.com",
					password_hash: "hash2",
					first_name: "User",
					last_name: "Two",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			// ACT
			const result = excludeCurrentUser(users, currentUserId);

			// ASSERT
			expect(result).toHaveLength(2);
		});
	});

	describe("sanitizeUserForSearch", () => {
		it("should remove password hash from user data", () => {
			// ARRANGE
			const user: User = {
				id: "user-1",
				email: "user@example.com",
				password_hash: "sensitive_hash_data",
				first_name: "Test",
				last_name: "User",
				role: "team_member",
				is_active: true,
				last_login_at: new Date(),
				created_at: new Date(),
				updated_at: new Date()
			};

			// ACT
			const result = sanitizeUserForSearch(user);

			// ASSERT
			expect(result).not.toHaveProperty("password_hash");
			expect(result).toHaveProperty("id", "user-1");
			expect(result).toHaveProperty("email", "user@example.com");
			expect(result).toHaveProperty("first_name", "Test");
			expect(result).toHaveProperty("last_name", "User");
			expect(result).toHaveProperty("role", "team_member");
		});

		it("should preserve all other user properties", () => {
			// ARRANGE
			const user: User = {
				id: "user-1",
				email: "user@example.com",
				password_hash: "hash",
				first_name: "Test",
				last_name: "User",
				role: "team_lead",
				is_active: true,
				last_login_at: new Date("2024-01-01"),
				created_at: new Date("2023-01-01"),
				updated_at: new Date("2024-01-02")
			};

			// ACT
			const result = sanitizeUserForSearch(user);

			// ASSERT
			expect(result.id).toBe("user-1");
			expect(result.email).toBe("user@example.com");
			expect(result.first_name).toBe("Test");
			expect(result.last_name).toBe("User");
			expect(result.role).toBe("team_lead");
			expect(result.is_active).toBe(true);
			expect(result.last_login_at).toEqual(new Date("2024-01-01"));
			expect(result.created_at).toEqual(new Date("2023-01-01"));
			expect(result.updated_at).toEqual(new Date("2024-01-02"));
		});
	});

	describe("performUserSearch", () => {
		it("should combine search, filtering, and sanitization", async () => {
			// ARRANGE
			const mockUsers: User[] = [
				{
					id: "user-1",
					email: "john.doe@example.com",
					password_hash: "hash1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "jane.smith@example.com",
					password_hash: "hash2",
					first_name: "Jane",
					last_name: "Smith",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "current-user",
					email: "current@example.com",
					password_hash: "hash3",
					first_name: "Current",
					last_name: "User",
					role: "team_lead",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockUserModel.findAll.mockResolvedValue(mockUsers);

			const searchParams: UserSearchParams = {
				query: "john",
				currentUserId: "current-user",
				limit: 10
			};

			// ACT
			const result = await performUserSearch(searchParams);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.first_name).toBe("John");
			expect(result[0]).not.toHaveProperty("password_hash");
			expect(result.find(u => u.id === "current-user")).toBeUndefined();
		});

		it("should respect role filtering", async () => {
			// ARRANGE
			const mockUsers: User[] = [
				{
					id: "user-1",
					email: "member@example.com",
					password_hash: "hash1",
					first_name: "Team",
					last_name: "Member",
					role: "team_member",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: "user-2",
					email: "basic@example.com",
					password_hash: "hash2",
					first_name: "Basic",
					last_name: "User",
					role: "basic_user",
					is_active: true,
					last_login_at: null,
					created_at: new Date(),
					updated_at: new Date()
				}
			];

			mockUserModel.findAll.mockResolvedValue(mockUsers);

			const searchParams: UserSearchParams = {
				query: "",
				role: "basic_user" as UserRole,
				currentUserId: "other-user",
				limit: 10
			};

			// ACT
			const result = await performUserSearch(searchParams);

			// ASSERT
			expect(result).toHaveLength(1);
			expect(result[0]?.role).toBe("basic_user");
		});

		it("should respect limit parameter", async () => {
			// ARRANGE
			const mockUsers: User[] = Array.from({ length: 10 }, (_, i) => ({
				id: `user-${i}`,
				email: `user${i}@example.com`,
				password_hash: `hash${i}`,
				first_name: `User`,
				last_name: `${i}`,
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			}));

			mockUserModel.findAll.mockResolvedValue(mockUsers);

			const searchParams: UserSearchParams = {
				query: "user",
				currentUserId: "other-user",
				limit: 3
			};

			// ACT
			const result = await performUserSearch(searchParams);

			// ASSERT
			expect(result).toHaveLength(3);
		});

		it("should handle database errors", async () => {
			// ARRANGE
			const databaseError = new Error("Database connection failed");
			mockUserModel.findAll.mockRejectedValue(databaseError);

			const searchParams: UserSearchParams = {
				query: "john",
				currentUserId: "current-user",
				limit: 10
			};

			// ACT & ASSERT
			await expect(performUserSearch(searchParams)).rejects.toThrow("Database connection failed");
		});
	});

	describe("validateSearchQuery", () => {
		it("should validate normal search queries", () => {
			expect(validateSearchQuery("john")).toBe(true);
			expect(validateSearchQuery("John Doe")).toBe(true);
			expect(validateSearchQuery("j")).toBe(true);
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

		it("should reject queries that are too long", () => {
			const longQuery = "a".repeat(101);
			expect(validateSearchQuery(longQuery)).toBe(false);
		});

		it("should reject queries with HTML tags (XSS prevention)", () => {
			expect(validateSearchQuery("<script>alert('xss')</script>")).toBe(false);
			expect(validateSearchQuery("<div>content</div>")).toBe(false);
			expect(validateSearchQuery("user<br>name")).toBe(false);
		});
	});

	describe("validateSearchLimit", () => {
		it("should return valid limits unchanged", () => {
			expect(validateSearchLimit(10)).toBe(10);
			expect(validateSearchLimit(50)).toBe(50);
			expect(validateSearchLimit(1)).toBe(1);
		});

		it("should return default limit for invalid inputs", () => {
			expect(validateSearchLimit(0)).toBe(1);
			expect(validateSearchLimit(-5)).toBe(1);
			expect(validateSearchLimit(NaN)).toBe(20);
			expect(validateSearchLimit(null as unknown as number)).toBe(20);
			expect(validateSearchLimit(undefined as unknown as number)).toBe(20);
		});

		it("should cap limits at maximum value", () => {
			expect(validateSearchLimit(150)).toBe(100);
			expect(validateSearchLimit(1000)).toBe(100);
		});

		it("should round decimal limits down", () => {
			expect(validateSearchLimit(10.7)).toBe(10);
			expect(validateSearchLimit(5.2)).toBe(5);
		});
	});

	describe("hasUserSearchPermission", () => {
		it("should allow team_lead users to search", () => {
			expect(hasUserSearchPermission("team_lead")).toBe(true);
		});

		it("should deny basic_user and team_member users", () => {
			expect(hasUserSearchPermission("basic_user")).toBe(false);
			expect(hasUserSearchPermission("team_member")).toBe(false);
		});
	});
});