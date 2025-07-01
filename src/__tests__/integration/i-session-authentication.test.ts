import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel, type User } from "../../server/models/User";
import { SessionModel, type Session } from "../../server/models/Session";
import usersRouter from "../../server/routes/users";

interface LoginResponseBody {
	message: string;
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
		is_active: boolean;
	};
}

interface ErrorResponseBody {
	message: string;
}

// Integration test for session-based authentication with HTTP cookies
describe("Session Authentication Integration", () => {
	let app: express.Application;
	let testUsers: string[] = []; // Track created users for cleanup
	let testSessions: string[] = []; // Track created sessions for cleanup

	// Use a unique test prefix to avoid conflicts with other parallel tests
	// Use a special domain that no other tests will use to ensure complete isolation
	const TEST_PREFIX = `session-auth-${Date.now()}-${process.pid}`;
	const TEST_DOMAIN = "session-auth-test.local";

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/users", usersRouter);
		testUsers = []; // Reset user tracking
		testSessions = []; // Reset session tracking
	});

	afterEach(async () => {
		// Wait a small delay to ensure no operations are still in progress
		await new Promise(resolve => setTimeout(resolve, 100));

		// Clean up test sessions FIRST (before users due to foreign key constraints)
		for (const sessionToken of testSessions) {
			try {
				await SessionModel.invalidate(sessionToken);
			} catch (error) {
				// Session might already be invalidated, continue cleanup
			}
		}

		// Also clean up any expired sessions
		try {
			await SessionModel.cleanupExpired();
		} catch (error) {
			// Continue cleanup even if this fails
		}

		// Then clean up test users
		for (const userId of testUsers) {
			try {
				await UserModel.delete(userId);
			} catch (error) {
				// User might already be deleted, continue cleanup
			}
		}
	});

	describe("Login with Session Creation", () => {
		it("should create session and set HTTP-only cookie on successful login", async () => {
			// Arrange: Create a test user with strong password and highly unique email
			const strongPassword = "SuperStr0ng!P@ssw0rd#2024";
			const uniqueEmail = `${TEST_PREFIX}-login-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;
			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "John",
				last_name: "Doe",
				role: "team_member"
			});
			testUsers.push(testUser.id); // Track for cleanup

			// Verify user was created properly
			const createdUser = await UserModel.findByEmail(uniqueEmail);
			expect(createdUser).toBeTruthy();
			expect(createdUser?.id).toBe(testUser.id);

			// Act: Login with valid credentials
			const response = await request(app).post("/api/users/login").send({
				email: uniqueEmail,
				password: strongPassword
			});

			// Debug: Log response if not 200
			if (response.status !== 200) {
				// Console statements removed for ESLint compliance
				// In a real scenario, these would be proper test failure messages
			}

			expect(response.status).toBe(200);

			// Assert: Response should contain user data without sensitive info
			const responseBody = response.body as LoginResponseBody;
			expect(responseBody).toHaveProperty("message", "Login successful");
			expect(responseBody).toHaveProperty("user");
			expect(responseBody.user).not.toHaveProperty("password_hash");
			expect(responseBody.user.email).toBe(uniqueEmail);

			// Assert: Should set HTTP-only session cookie
			const setCookieHeader = response.headers["set-cookie"] as string[] | string | undefined;
			expect(setCookieHeader).toBeDefined();
			const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader as string];
			expect(cookieArray).toHaveLength(1);

			const sessionCookie = cookieArray[0];
			expect(sessionCookie).toBeDefined();
			expect(sessionCookie).toMatch(/^sessionToken=([a-f0-9]{64});/);
			expect(sessionCookie).toContain("HttpOnly");
			expect(sessionCookie).toContain("Path=/");
			expect(sessionCookie).toContain("Max-Age=");

			// Assert: Session should be created in database
			const sessionTokenMatch = sessionCookie?.match(/sessionToken=([a-f0-9]{64})/);
			expect(sessionTokenMatch).toBeTruthy();

			if (sessionTokenMatch) {
				const sessionToken = sessionTokenMatch[1] as string;
				testSessions.push(sessionToken); // Track session for cleanup
				const session: Session | null = await SessionModel.findByToken(sessionToken);

				expect(session).toBeTruthy();
				expect(session?.user_id).toBe(testUser.id);
				expect(session?.is_active).toBe(true);
				expect(session?.expires_at).toBeInstanceOf(Date);

				// Session should expire in ~24 hours
				const expiresAt = session?.expires_at;
				const now = new Date();
				const hoursUntilExpiry = expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;
				expect(hoursUntilExpiry).toBeGreaterThan(23);
				expect(hoursUntilExpiry).toBeLessThan(25);
			}

			// Cleanup handled in afterEach
		});

		it("should not create session on failed login", async () => {
			// Act: Login with invalid credentials
			const response = await request(app)
				.post("/api/users/login")
				.send({
					email: "nonexistent@example.com",
					password: "wrongpassword"
				})
				.expect(401);

			// Assert: Should not set any cookies
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeUndefined();

			// Assert: Error response
			const errorBody = response.body as ErrorResponseBody;
			expect(errorBody).toHaveProperty("message", "Invalid email or password");
		});
	});

	describe("Cookie Security", () => {
		it("should set secure cookie properties for production", async () => {
			// Set NODE_ENV to production to test secure cookies
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			try {
				// Create test user with unique email
				const securePassword = "Pr0duction!Str0ng#P@ss2024";
				const uniqueEmail = `${TEST_PREFIX}-prod-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;
				const testUser: User = await UserModel.create({
					email: uniqueEmail,
					password: securePassword,
					first_name: "Jane",
					last_name: "Smith",
					role: "team_member"
				});
				testUsers.push(testUser.id); // Track for cleanup

				// Login
				const response = await request(app)
					.post("/api/users/login")
					.send({
						email: uniqueEmail,
						password: securePassword
					})
					.expect(200);

				// Assert: Secure flag should be set in production
				const setCookieHeader = response.headers["set-cookie"] as string[] | string | undefined;
				expect(setCookieHeader).toBeDefined();
				const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
				const sessionCookie = cookieArray[0];
				expect(sessionCookie).toContain("Secure");
				expect(sessionCookie).toContain("SameSite=Strict");

				// Track session for cleanup
				const sessionTokenMatch = sessionCookie?.match(/sessionToken=([a-f0-9]{64})/);
				if (sessionTokenMatch) {
					testSessions.push(sessionTokenMatch[1] as string);
				}
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("should not set secure flag in development", async () => {
			// Ensure we're in development mode
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";

			try {
				// Create test user with unique email
				const devPassword = "D3v3l0pment!Str0ng#P@ss2024";
				const uniqueEmail = `${TEST_PREFIX}-dev-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;
				const testUser: User = await UserModel.create({
					email: uniqueEmail,
					password: devPassword,
					first_name: "Bob",
					last_name: "Johnson",
					role: "team_member"
				});
				testUsers.push(testUser.id); // Track for cleanup

				// Login
				const response = await request(app)
					.post("/api/users/login")
					.send({
						email: uniqueEmail,
						password: devPassword
					})
					.expect(200);

				// Assert: Secure flag should NOT be set in development
				const setCookieHeader = response.headers["set-cookie"] as string[] | string | undefined;
				expect(setCookieHeader).toBeDefined();
				if (!setCookieHeader) {
					return;
				}
				const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
				const sessionCookie = cookieArray[0];
				expect(sessionCookie).not.toContain("Secure");
				expect(sessionCookie).toContain("HttpOnly");

				// Track session for cleanup
				const sessionTokenMatch = sessionCookie?.match(/sessionToken=([a-f0-9]{64})/);
				if (sessionTokenMatch) {
					testSessions.push(sessionTokenMatch[1] as string);
				}
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});
	});
});
