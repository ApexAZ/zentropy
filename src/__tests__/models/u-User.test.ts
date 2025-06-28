import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UserModel } from "../../models/User";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers, DomainAssertionHelpers } from "../helpers/assertion-helpers";
import { pool } from "../../database/connection";

// Mock the database connection
vi.mock("../../database/connection", () => ({
	pool: {
		query: vi.fn()
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
	const mockSuccessfulQuery = (returnValue: any) => {
		const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
		mockPool.query.mockResolvedValue({ rows, rowCount: rows.length });
	};

	const mockEmptyQuery = () => {
		mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
	};

	const mockFailedQuery = (error = new Error("Database connection failed")) => {
		mockPool.query.mockRejectedValue(error);
	};

	describe("emailExists", () => {
		it("should return true when email exists", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery([{ id: mockUser.id }]);

			const result = await UserModel.emailExists(mockUser.email);

			expect(result).toBe(true);
			AssertionHelpers.expectDatabaseCall(mockPool.query, "LOWER(email) = LOWER($1)", [mockUser.email]);
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

			DomainAssertionHelpers.expectValidUser(result!);
			expect(result!.email).toBe(mockUser.email);
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

			DomainAssertionHelpers.expectValidUser(result!);
			expect(result!.id).toBe(mockUser.id);
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

			expect(result).toBeDefined();
			expect(result!.first_name).toBe("Updated");
		});

		it("should return null when user not found", async () => {
			mockEmptyQuery();

			const result = await UserModel.update("nonexistent-id", { first_name: "Updated" });

			expect(result).toBeNull();
		});
	});

	describe("delete", () => {
		it("should delete user", async () => {
			mockPool.query.mockResolvedValue({ rows: [], rowCount: 1 });

			const result = await UserModel.delete("user-id");

			expect(result).toBe(true);
		});

		it("should return false when user not found", async () => {
			mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

			const result = await UserModel.delete("nonexistent-id");

			expect(result).toBe(false);
		});
	});

	describe("data integrity validation", () => {
		it("should properly format user data from database", async () => {
			const mockUser = TestDataFactory.createTestUser();
			mockSuccessfulQuery(mockUser);

			const result = await UserModel.findById(mockUser.id);

			// Validate that sensitive data is preserved in model layer
			expect(result).toHaveProperty("password_hash");
			expect(result!.password_hash).toBe(mockUser.password_hash);

			// Validate all required fields are present
			DomainAssertionHelpers.expectValidUser(result!);
		});

		it("should handle user role validation", async () => {
			const teamLeadUser = TestDataFactory.createTestUser({ role: "team_lead" });
			mockSuccessfulQuery(teamLeadUser);

			const result = await UserModel.findById(teamLeadUser.id);

			expect(result!.role).toBe("team_lead");
			expect(["team_lead", "team_member"]).toContain(result!.role);
		});
	});
});
