import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel, type User } from "../../models/User";
import { SessionModel, type Session } from "../../models/Session";
import usersRouter from "../../routes/users";
import type { Request, Response, NextFunction } from "express";

// Mock rate limiting middleware to avoid conflicts in tests
vi.mock("../../middleware/rate-limiter", () => ({
	loginRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	passwordUpdateRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	userCreationRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	generalApiRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next())
}));

// Integration test for protected user routes
describe("Protected User Routes", () => {
	let app: express.Application;
	let testUser: User;
	let testSession: Session;

	// Use a unique test prefix to avoid conflicts with other parallel tests
	// Use a special domain that no other tests will use to ensure complete isolation
	const TEST_PREFIX = `protected-routes-${Date.now()}-${process.pid}`;
	const TEST_DOMAIN = "protected-routes-test.local";

	beforeEach(async () => {
		app = express();
		app.set("trust proxy", true); // Trust proxy headers for rate limiting
		app.use(express.json());
		app.use("/api/users", usersRouter);

		// Create test user with unique email to avoid conflicts
		const strongPassword = "ComplexSecureP@ssw0rd2024!ZqX7";
		const uniqueEmail = `${TEST_PREFIX}-main-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;
		testUser = await UserModel.create({
			email: uniqueEmail,
			password: strongPassword,
			first_name: "Jane",
			last_name: "Wilson",
			role: "team_member"
		});

		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "192.168.1.150",
			user_agent: "Test Browser Protected Routes v1.0"
		});
	});

	afterEach(async () => {
		// Clean up test data in proper order
		// Wait a small delay to ensure no operations are still in progress
		await new Promise(resolve => setTimeout(resolve, 100));

		try {
			if (testSession) {
				await SessionModel.invalidate(testSession.session_token);
			}
		} catch (error) {
			// Session might already be cleaned up
		}

		try {
			if (testUser) {
				await UserModel.delete(testUser.id);
			}
		} catch (error) {
			// User might already be deleted
		}

		try {
			await SessionModel.cleanupExpired();
		} catch (error) {
			// Continue cleanup even if this fails
		}
	});

	describe("Authenticated Access", () => {
		it("should allow GET /api/users with valid session", async () => {
			const response = await request(app)
				.get("/api/users")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			const users = response.body as User[];
			expect(Array.isArray(users)).toBe(true);
			// Should not include password hashes
			if (users.length > 0) {
				expect(users[0]).not.toHaveProperty("password_hash");
			}
		});

		it("should allow GET /api/users/:id with valid session", async () => {
			const response = await request(app)
				.get(`/api/users/${testUser.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			const user = response.body as User;
			expect(user).toHaveProperty("id", testUser.id);
			expect(user).toHaveProperty("email", testUser.email);
			expect(user).not.toHaveProperty("password_hash");
		});

		it("should allow PUT /api/users/:id with valid session", async () => {
			const updateData = {
				first_name: "UpdatedProtected",
				last_name: "UpdatedRouteUser"
			};

			const response = await request(app)
				.put(`/api/users/${testUser.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(updateData)
				.expect(200);

			const updatedUser = response.body as User;
			expect(updatedUser).toHaveProperty("first_name", "UpdatedProtected");
			expect(updatedUser).toHaveProperty("last_name", "UpdatedRouteUser");
			expect(updatedUser).not.toHaveProperty("password_hash");
		});

		it("should allow PUT /api/users/:id/password with valid session", async () => {
			// Retry logic to handle race conditions in parallel test execution
			let retries = 3;
			let lastError: Error | null = null;
			let passwordUpdateUser: User | null = null;
			let passwordUpdateSession: Session | null = null;
			const DB_OPERATION_TIMEOUT = 5000; // 5 second timeout per operation

			while (retries > 0) {
				try {
					// Create helper function for timeout operations
					const withTimeout = async <T>(operation: Promise<T>, timeoutMs: number): Promise<T> => {
						let timeoutId: NodeJS.Timeout | undefined;
						const timeoutPromise = new Promise<never>((_, reject) => {
							timeoutId = setTimeout(() => reject(new Error("Database operation timeout")), timeoutMs);
						});

						try {
							const result = await Promise.race([operation, timeoutPromise]);
							if (timeoutId) clearTimeout(timeoutId);
							return result;
						} catch (error) {
							if (timeoutId) clearTimeout(timeoutId);
							throw error;
						}
					};

					// Create dedicated user for this test to avoid race conditions
					const passwordUpdatePassword = "SecureIsolatedP@ssw0rd2024!ZqX";
					const passwordUpdateEmail = `${TEST_PREFIX}-password-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

					passwordUpdateUser = await withTimeout(
						UserModel.create({
							email: passwordUpdateEmail,
							password: passwordUpdatePassword,
							first_name: "Alice",
							last_name: "Johnson",
							role: "team_member"
						}),
						DB_OPERATION_TIMEOUT
					);

					passwordUpdateSession = await withTimeout(
						SessionModel.create({
							user_id: passwordUpdateUser.id,
							ip_address: "192.168.1.200",
							user_agent: "Test Browser Password Update v1.0"
						}),
						DB_OPERATION_TIMEOUT
					);

					// Add a small delay to ensure database operations are complete
					await new Promise(resolve => setTimeout(resolve, 100));

					// Verify user still exists before attempting password update
					const userCheck = await UserModel.findById(passwordUpdateUser.id);
					if (!userCheck) {
						throw new Error("User was deleted during test execution");
					}

					const passwordData = {
						currentPassword: passwordUpdatePassword,
						newPassword: "NewComplexP@ssw0rd2024!ABC"
					};

					const response = await request(app)
						.put(`/api/users/${passwordUpdateUser.id}/password`)
						.set("Cookie", `sessionToken=${passwordUpdateSession.session_token}`)
						.send(passwordData)
						.expect(200);

					const result = response.body as { message: string };
					expect(result).toHaveProperty("message", "Password updated successfully");

					// Test passed, break out of retry loop
					return;
				} catch (error) {
					lastError = error as Error;
					retries--;

					// Log the error for debugging
					if (lastError.message?.includes("foreign key constraint")) {
						// Using console in tests is acceptable for debugging
						// eslint-disable-next-line no-console
						console.log(`Retry ${3 - retries}/3: User was deleted by parallel test, retrying...`);
					}

					// Wait before retrying
					if (retries > 0) {
						await new Promise(resolve => setTimeout(resolve, 500));
					}
				} finally {
					// Clean up in proper order to avoid foreign key constraints
					try {
						if (passwordUpdateSession) {
							await SessionModel.invalidate(passwordUpdateSession.session_token);
						}
					} catch (error) {
						// Session might already be cleaned up
					}
					try {
						if (passwordUpdateUser) {
							await UserModel.delete(passwordUpdateUser.id);
						}
					} catch (error) {
						// User might already be deleted
					}
				}
			}

			// All retries failed, throw the last error
			throw lastError ?? new Error("Unknown error occurred during password update test");
		});

		it("should allow DELETE /api/users/:id with valid session", async () => {
			// Create a separate user for deletion test
			const deleteUser = await UserModel.create({
				email: `${TEST_PREFIX}-delete-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`,
				password: "ComplexDeleteP@ssw0rd2024!XYZ",
				first_name: "Bob",
				last_name: "RemoveUser",
				role: "team_member"
			});

			const response = await request(app)
				.delete(`/api/users/${deleteUser.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(204);

			const result = response.body as Record<string, unknown>;
			expect(result).toEqual({});

			// Verify user was deleted
			const deletedUser = await UserModel.findById(deleteUser.id);
			expect(deletedUser).toBeNull();
		});
	});

	describe("Unauthenticated Access Denied", () => {
		it("should deny GET /api/users without session", async () => {
			const response = await request(app).get("/api/users").expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/users/:id without session", async () => {
			const response = await request(app).get(`/api/users/${testUser.id}`).expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/users/:id without session", async () => {
			const updateData = {
				first_name: "ShouldNotUpdate"
			};

			const response = await request(app).put(`/api/users/${testUser.id}`).send(updateData).expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/users/:id/password without session", async () => {
			const passwordData = {
				currentPassword: "ComplexSecureP@ssw0rd2024!ZqX7",
				newPassword: "NewComplexP@ssw0rd2024!ABC"
			};

			const response = await request(app)
				.put(`/api/users/${testUser.id}/password`)
				.send(passwordData)
				.expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Authentication required");
		});

		it("should deny DELETE /api/users/:id without session", async () => {
			const response = await request(app).delete(`/api/users/${testUser.id}`).expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Authentication required");
		});
	});

	describe("Invalid Session Access Denied", () => {
		it("should deny access with invalid session token", async () => {
			const response = await request(app)
				.get("/api/users")
				.set("Cookie", "sessionToken=invalid-token-12345")
				.expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Invalid or expired session");
		});

		it("should deny access with expired session", async () => {
			// Invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request(app)
				.get("/api/users")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			const errorResponse = response.body as { message: string };
			expect(errorResponse).toHaveProperty("message", "Invalid or expired session");
		});
	});

	describe("Unprotected Routes Still Work", () => {
		it("should allow POST /api/users/login without session", async () => {
			const loginData = {
				email: testUser.email,
				password: "ComplexSecureP@ssw0rd2024!ZqX7"
			};

			const response = await request(app).post("/api/users/login").send(loginData).expect(200);

			const loginResponse = response.body as { message: string; user: User };
			expect(loginResponse).toHaveProperty("message", "Login successful");
			expect(loginResponse).toHaveProperty("user");
		});

		it("should allow POST /api/users/logout without session", async () => {
			const response = await request(app).post("/api/users/logout").expect(200);

			const logoutResponse = response.body as { message: string };
			expect(logoutResponse).toHaveProperty("message", "Logged out successfully");
		});

		it("should allow POST /api/users (registration) without session", async () => {
			const newUserData = {
				email: `${TEST_PREFIX}-registration-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`,
				password: "ComplexRegistrationP@ssw0rd2024!XYZ",
				first_name: "Sarah",
				last_name: "NewUser",
				role: "team_member"
			};

			const response = await request(app).post("/api/users").send(newUserData).expect(201);

			const createdUser = response.body as User;
			expect(createdUser).toHaveProperty("email", newUserData.email);
			expect(createdUser).not.toHaveProperty("password_hash");

			// Clean up the created user
			await UserModel.delete(createdUser.id);
		});
	});
});
