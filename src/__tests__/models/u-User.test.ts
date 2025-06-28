import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import type { QueryResult } from "pg";
import { UserModel, type User } from "../../models/User";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers, DomainAssertionHelpers } from "../helpers/assertion-helpers";
import { pool } from "../../database/connection";

// Mock the database connection
vi.mock("../../database/connection", () => ({
	pool: {
		query: vi.fn().mockResolvedValue({ 
			rows: [], 
			rowCount: 0, 
			command: 'SELECT', 
			oid: 0, 
			fields: [] 
		} as QueryResult<User>)
	}
}));

// Get the mocked pool for testing
const mockPool = vi.mocked(pool);

describe("UserModel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	// Helper functions for common mock scenarios
	const mockSuccessfulQuery = (returnValue: unknown): void => {
		const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
		const mockResult: QueryResult = { rows, rowCount: rows.length, command: "SELECT", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	const mockEmptyQuery = (): void => {
		const mockResult: QueryResult = { rows: [], rowCount: 0, command: "SELECT", oid: 0, fields: [] };
		(mockPool.query as Mock).mockResolvedValue(mockResult);
	};

	const mockFailedQuery = (error = new Error("Database connection failed")): void => {
		(mockPool.query as Mock).mockRejectedValue(error);
	};

	describe("emailExists", () => {
		it("should return true when email exists", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery([{ id: mockUser.id }]);

			const result = await UserModel.emailExists(mockUser.email);

			expect(result).toBe(true);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const queryFn = mockPool.query;
			expect(queryFn).toHaveBeenCalledWith(expect.stringContaining("LOWER(email) = LOWER($1)"), [mockUser.email]);
		});

		it("should return false when email does not exist", async () => {
			mockEmptyQuery();

			const result = await UserModel.emailExists("nonexistent@example.com");

			expect(result).toBe(false);
		});

		it("should handle database errors", async () => {
			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(
				UserModel.emailExists("test@example.com"),
				"Database connection failed"
			);
		});
	});

	describe("findByEmail", () => {
		it("should find user by email", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery(mockUser);

			const result = await UserModel.findByEmail(mockUser.email);

			if (!result) {
				throw new Error("Expected user to be found");
			}
			DomainAssertionHelpers.expectValidUser(result);
			expect(result.email).toBe(mockUser.email);
		});

		it("should return null when user not found", async () => {
			mockEmptyQuery();

			const result = await UserModel.findByEmail("notfound@example.com");

			expect(result).toBeNull();
		});
	});

	describe("findById", () => {
		it("should find user by id", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery(mockUser);

			const result = await UserModel.findById(mockUser.id);

			if (!result) {
				throw new Error("Expected user to be found");
			}
			DomainAssertionHelpers.expectValidUser(result);
			expect(result.id).toBe(mockUser.id);
		});

		it("should return null when user not found", async () => {
			mockEmptyQuery();

			const result = await UserModel.findById("nonexistent-id");

			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		it("should update user fields", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const updatedUser = { ...mockUser, first_name: "Updated" };
			mockSuccessfulQuery(updatedUser);

			const result = await UserModel.update(mockUser.id, { first_name: "Updated" });

			if (!result) {
				throw new Error("Expected user to be updated");
			}
			expect(result.first_name).toBe("Updated");
		});

		it("should return null when user not found", async () => {
			mockEmptyQuery();

			const result = await UserModel.update("nonexistent-id", { first_name: "Updated" });

			expect(result).toBeNull();
		});
	});

	describe("delete", () => {
		it("should delete user", async () => {
			const mockResult: QueryResult = { rows: [], rowCount: 1, command: "DELETE", oid: 0, fields: [] };
			(mockPool.query as Mock).mockResolvedValue(mockResult);

			const result = await UserModel.delete("user-id");

			expect(result).toBe(true);
		});

		it("should return false when user not found", async () => {
			const mockResult: QueryResult = { rows: [], rowCount: 0, command: "DELETE", oid: 0, fields: [] };
			(mockPool.query as Mock).mockResolvedValue(mockResult);

			const result = await UserModel.delete("nonexistent-id");

			expect(result).toBe(false);
		});
	});

	describe("data integrity validation", () => {
		it("should properly format user data from database", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery(mockUser);

			const result = await UserModel.findById(mockUser.id);

			if (!result) {
				throw new Error("Expected user to be found");
			}

			// Validate that sensitive data is preserved in model layer
			expect(result).toHaveProperty("password_hash");
			expect(result.password_hash).toBe(mockUser.password_hash);

			// Validate all required fields are present
			DomainAssertionHelpers.expectValidUser(result);
		});

		it("should handle user role validation", async () => {
			const teamLeadUser = TestDataFactory.createTestUser({ role: "team_lead" });
			mockSuccessfulQuery(teamLeadUser);

			const result = await UserModel.findById(teamLeadUser.id);

			if (!result) {
				throw new Error("Expected user to be found");
			}
			expect(result.role).toBe("team_lead");
			expect(["team_lead", "team_member"]).toContain(result.role);
		});
	});
});
