import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionModel, CreateSessionData } from "../../models/Session";
import { TestDataFactory } from "../helpers/test-data-factory";
import { AssertionHelpers, DomainAssertionHelpers } from "../helpers/assertion-helpers";
import { pool } from "../../database/connection";
import crypto from "crypto";

// Mock the database connection
vi.mock("../../database/connection", () => ({
	pool: {
		query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
	}
}));

// Get the mocked pool for testing
const mockPool = vi.mocked(pool);

describe("SessionModel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock crypto.randomBytes for consistent session tokens in tests
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		(vi.spyOn(crypto, "randomBytes") as any).mockReturnValue(Buffer.from("a".repeat(32)));
	});

	afterEach(() => {
		vi.resetAllMocks();
		vi.restoreAllMocks();
	});

	// Helper functions for common mock scenarios
	const mockSuccessfulQuery = (returnValue: unknown): void => {
		const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
		(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows, rowCount: rows.length });
	};

	const mockEmptyQuery = (): void => {
		(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [], rowCount: 0 });
	};

	const mockFailedQuery = (error = new Error("Database connection failed")): void => {
		mockPool.query.mockRejectedValue(error);
	};

	describe("create", () => {
		it("should create a new session with generated token", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const sessionData: CreateSessionData = {
				user_id: mockUser.id,
				ip_address: "192.168.1.1",
				user_agent: "Mozilla/5.0 Test Browser"
			};

			const mockSession = TestDataFactory.createTestSession({
				user_id: mockUser.id,
				session_token: "a".repeat(64), // Expected token from mocked crypto
				ip_address: sessionData.ip_address ?? "unknown",
				user_agent: sessionData.user_agent ?? "unknown"
			});

			mockSuccessfulQuery(mockSession);

			const result = await SessionModel.create(sessionData);

			expect(result).toBeDefined();
			expect(result.user_id).toBe(mockUser.id);
			expect(result.session_token).toBe("a".repeat(64));
			expect(result.ip_address).toBe("192.168.1.1");

			// Verify SQL query structure
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO sessions"),
				expect.arrayContaining([
					mockUser.id,
					expect.any(String), // Session token (generated)
					"192.168.1.1",
					"Mozilla/5.0 Test Browser",
					expect.any(Date) // Expiration date (generated)
				])
			);
		});

		it("should create session with default expiration when not provided", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const sessionData: CreateSessionData = {
				user_id: mockUser.id
			};

			const mockSession = TestDataFactory.createTestSession({ user_id: mockUser.id });
			mockSuccessfulQuery(mockSession);

			await SessionModel.create(sessionData);

			// Verify that expires_at is passed to the query (5th parameter)
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			const firstCall = mockQuery.mock.calls[0] as [string, unknown[]];
			const queryParams = firstCall[1];
			expect(queryParams[4]).toBeInstanceOf(Date);

			// Verify it's roughly 24 hours from now (within 1 minute tolerance)
			const expirationDate = queryParams[4] as Date;
			const expectedExpiration = new Date();
			expectedExpiration.setHours(expectedExpiration.getHours() + 24);
			const timeDifference = Math.abs(expirationDate.getTime() - expectedExpiration.getTime());
			expect(timeDifference).toBeLessThan(60000); // Less than 1 minute difference
		});

		it("should handle database errors during session creation", async () => {
			const sessionData: CreateSessionData = {
				user_id: "test-user-id"
			};

			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(SessionModel.create(sessionData), "Database connection failed");
		});
	});

	describe("findByToken", () => {
		it("should find active session by token", async () => {
			const mockSession = TestDataFactory.createTestSession();
			mockSuccessfulQuery(mockSession);

			const result = await SessionModel.findByToken(mockSession.session_token);

			expect(result).toBeDefined();
			if (result) {
				expect(result.session_token).toBe(mockSession.session_token);
			}

			// Verify query checks for active and non-expired sessions
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "is_active = true", [mockSession.session_token]);
			AssertionHelpers.expectDatabaseCall(mockQuery, "expires_at > NOW()", [mockSession.session_token]);
		});

		it("should return null when session not found", async () => {
			mockEmptyQuery();

			const result = await SessionModel.findByToken("invalid-token");

			expect(result).toBeNull();
		});

		it("should handle database errors", async () => {
			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(
				SessionModel.findByToken("test-token"),
				"Database connection failed"
			);
		});
	});

	describe("findByTokenWithUser", () => {
		it("should find session with user data", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const mockSession = TestDataFactory.createTestSession({ user_id: mockUser.id });

			// Mock the joined query result
			const mockJoinedRow = {
				...mockSession,
				user_id: mockUser.id,
				email: mockUser.email,
				first_name: mockUser.first_name,
				last_name: mockUser.last_name,
				role: mockUser.role,
				user_is_active: mockUser.is_active
			};

			mockSuccessfulQuery(mockJoinedRow);

			const result = await SessionModel.findByTokenWithUser(mockSession.session_token);

			expect(result).toBeDefined();
			if (result) {
				expect(result.session_token).toBe(mockSession.session_token);
				expect(result.user).toBeDefined();
				expect(result.user.email).toBe(mockUser.email);
				expect(result.user.role).toBe(mockUser.role);
			}

			// Verify JOIN query is used
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "JOIN users u ON s.user_id = u.id", [
				mockSession.session_token
			]);
		});

		it("should return null when session or user not found", async () => {
			mockEmptyQuery();

			const result = await SessionModel.findByTokenWithUser("invalid-token");

			expect(result).toBeNull();
		});
	});

	describe("findByUserId", () => {
		it("should find all active sessions for a user", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const mockSessions = [
				TestDataFactory.createTestSession({ user_id: mockUser.id }),
				TestDataFactory.createTestSession({ user_id: mockUser.id })
			];

			mockSuccessfulQuery(mockSessions);

			const result = await SessionModel.findByUserId(mockUser.id);

			expect(result).toHaveLength(2);
			expect(result[0]?.user_id).toBe(mockUser.id);
			expect(result[1]?.user_id).toBe(mockUser.id);

			// Verify ordering by created_at
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "ORDER BY created_at DESC", [mockUser.id]);
		});

		it("should return empty array when no sessions found", async () => {
			mockEmptyQuery();

			const result = await SessionModel.findByUserId("user-with-no-sessions");

			expect(result).toEqual([]);
		});
	});

	describe("updateActivity", () => {
		it("should update session activity timestamp", async () => {
			const mockSession = TestDataFactory.createTestSession();
			mockSuccessfulQuery({ ...mockSession, updated_at: new Date() });

			const result = await SessionModel.updateActivity(mockSession.session_token);

			expect(result).toBeDefined();
			if (result) {
				expect(result.session_token).toBe(mockSession.session_token);
			}

			// Verify UPDATE query with NOW()
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "SET updated_at = NOW()", [mockSession.session_token]);
		});

		it("should return null when session not found or expired", async () => {
			mockEmptyQuery();

			const result = await SessionModel.updateActivity("invalid-token");

			expect(result).toBeNull();
		});
	});

	describe("invalidate", () => {
		it("should invalidate a session", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 1 });

			const result = await SessionModel.invalidate("test-token");

			expect(result).toBe(true);

			// Verify UPDATE query sets is_active to false
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "SET is_active = false", ["test-token"]);
		});

		it("should return false when session not found", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 0 });

			const result = await SessionModel.invalidate("invalid-token");

			expect(result).toBe(false);
		});
	});

	describe("invalidateAllForUser", () => {
		it("should invalidate all user sessions", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 3 });

			const result = await SessionModel.invalidateAllForUser("test-user-id");

			expect(result).toBe(3);

			// Verify UPDATE affects all user sessions
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "WHERE user_id = $1 AND is_active = true", ["test-user-id"]);
		});

		it("should return 0 when no sessions to invalidate", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 0 });

			const result = await SessionModel.invalidateAllForUser("user-with-no-sessions");

			expect(result).toBe(0);
		});
	});

	describe("cleanupExpired", () => {
		it("should delete expired and inactive sessions", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 5 });

			const result = await SessionModel.cleanupExpired();

			expect(result).toBe(5);

			// Verify DELETE query was called
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.query).toHaveBeenCalledTimes(1);
		});

		it("should handle no expired sessions", async () => {
			(mockPool.query as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 0 });

			const result = await SessionModel.cleanupExpired();

			expect(result).toBe(0);
		});
	});

	describe("extendExpiration", () => {
		it("should extend session expiration by default 24 hours", async () => {
			const mockSession = TestDataFactory.createTestSession();
			mockSuccessfulQuery(mockSession);

			const result = await SessionModel.extendExpiration(mockSession.session_token);

			expect(result).toBeDefined();
			if (result) {
				expect(result.session_token).toBe(mockSession.session_token);
			}

			// Verify INTERVAL extension
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "INTERVAL '24 hours'", [mockSession.session_token]);
		});

		it("should extend session expiration by custom hours", async () => {
			const mockSession = TestDataFactory.createTestSession();
			mockSuccessfulQuery(mockSession);

			await SessionModel.extendExpiration(mockSession.session_token, 48);

			// Verify custom INTERVAL extension
			// eslint-disable-next-line @typescript-eslint/unbound-method
			const mockQuery = mockPool.query as ReturnType<typeof vi.fn>;
			AssertionHelpers.expectDatabaseCall(mockQuery, "INTERVAL '48 hours'", [mockSession.session_token]);
		});

		it("should return null when session not found", async () => {
			mockEmptyQuery();

			const result = await SessionModel.extendExpiration("invalid-token");

			expect(result).toBeNull();
		});
	});

	describe("getStats", () => {
		it("should return session statistics", async () => {
			const mockStats = {
				total_active: 10,
				expired_count: 5,
				users_with_sessions: 8
			};

			mockSuccessfulQuery(mockStats);

			const result = await SessionModel.getStats();

			expect(result.total_active).toBe(10);
			expect(result.expired_count).toBe(5);
			expect(result.users_with_sessions).toBe(8);

			// Verify aggregate query was called
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.query).toHaveBeenCalledTimes(1);
		});

		it("should handle database errors in stats query", async () => {
			mockFailedQuery();

			await AssertionHelpers.expectAsyncError(SessionModel.getStats(), "Database connection failed");
		});
	});

	describe("data integrity validation", () => {
		it("should validate session data structure", async () => {
			const mockSession = TestDataFactory.createTestSession();
			mockSuccessfulQuery(mockSession);

			const result = await SessionModel.findByToken(mockSession.session_token);

			// Validate all required session fields are present
			expect(result).toHaveProperty("id");
			expect(result).toHaveProperty("user_id");
			expect(result).toHaveProperty("session_token");
			expect(result).toHaveProperty("created_at");
			expect(result).toHaveProperty("expires_at");
			expect(result).toHaveProperty("is_active");

			// Validate session token format (64 character hex string)
			if (result) {
				expect(result.session_token).toMatch(/^[a-f0-9]{64}$/);
			}
		});

		it("should validate session with user data structure", async () => {
			const mockUser = TestDataFactory.createTestUser();
			const mockSession = TestDataFactory.createTestSession({ user_id: mockUser.id });

			const mockJoinedRow = {
				...mockSession,
				user_id: mockUser.id,
				email: mockUser.email,
				first_name: mockUser.first_name,
				last_name: mockUser.last_name,
				role: mockUser.role,
				user_is_active: mockUser.is_active
			};

			mockSuccessfulQuery(mockJoinedRow);

			const result = await SessionModel.findByTokenWithUser(mockSession.session_token);

			// Validate session properties
			if (result) {
				DomainAssertionHelpers.expectValidSession(result);

				// Validate nested user properties
				expect(result.user).toHaveProperty("id");
				expect(result.user).toHaveProperty("email");
				expect(result.user).toHaveProperty("role");
				expect(["team_lead", "team_member"]).toContain(result.user.role);
			}
		});
	});
});
