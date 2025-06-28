import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import usersRouter from "../../routes/users";

// Integration test for session-based authentication with HTTP cookies
describe("Session Authentication Integration", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/users", usersRouter);
	});

	afterEach(async () => {
		// Clean up test sessions
		await SessionModel.cleanupExpired();
	});

	describe("Login with Session Creation", () => {
		it("should create session and set HTTP-only cookie on successful login", async () => {
			// Arrange: Create a test user with strong password
			const strongPassword = "SecureTestP@ssw0rd2024!XyZ";
			const testUser = await UserModel.create({
				email: "session-test-unique@example.com",
				password: strongPassword,
				first_name: "SessionTester",
				last_name: "Authentication",
				role: "team_member"
			});

			// Verify user was created properly
			const createdUser = await UserModel.findByEmail("session-test-unique@example.com");
			expect(createdUser).toBeTruthy();
			expect(createdUser?.id).toBe(testUser.id);

			// Act: Login with valid credentials
			const response = await request(app).post("/api/users/login").send({
				email: "session-test-unique@example.com",
				password: strongPassword
			});

			// Debug: Log response if not 200
			if (response.status !== 200) {
				console.log("Login failed with status:", response.status);
				console.log("Response body:", response.body);
				console.log("Response text:", response.text);
				console.log("Test user ID:", testUser.id);
				console.log("Found user:", createdUser);
			}

			expect(response.status).toBe(200);

			// Assert: Response should contain user data without sensitive info
			expect(response.body).toHaveProperty("message", "Login successful");
			expect(response.body).toHaveProperty("user");
			expect(response.body.user).not.toHaveProperty("password_hash");
			expect(response.body.user.email).toBe("session-test-unique@example.com");

			// Assert: Should set HTTP-only session cookie
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();
			const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
			expect(cookieArray).toHaveLength(1);

			const sessionCookie = cookieArray[0];
			expect(sessionCookie).toMatch(/^sessionToken=([a-f0-9]{64});/);
			expect(sessionCookie).toContain("HttpOnly");
			expect(sessionCookie).toContain("Path=/");
			expect(sessionCookie).toContain("Max-Age=");

			// Assert: Session should be created in database
			const sessionTokenMatch = sessionCookie.match(/sessionToken=([a-f0-9]{64})/);
			expect(sessionTokenMatch).toBeTruthy();

			if (sessionTokenMatch) {
				const sessionToken = sessionTokenMatch[1];
				const session = await SessionModel.findByToken(sessionToken);

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

			// Cleanup
			await UserModel.delete(testUser.id);
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
			expect(response.body).toHaveProperty("message", "Invalid email or password");
		});
	});

	describe("Cookie Security", () => {
		it("should set secure cookie properties for production", async () => {
			// Set NODE_ENV to production to test secure cookies
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			try {
				// Create test user
				const securePassword = "ProductionSecureP@ssw0rd2024!ABC";
				const testUser = await UserModel.create({
					email: "secure-test-prod@example.com",
					password: securePassword,
					first_name: "SecureProd",
					last_name: "TestUser",
					role: "team_member"
				});

				// Login
				const response = await request(app)
					.post("/api/users/login")
					.send({
						email: "secure-test-prod@example.com",
						password: securePassword
					})
					.expect(200);

				// Assert: Secure flag should be set in production
				const setCookieHeader = response.headers["set-cookie"];
				expect(setCookieHeader).toBeDefined();
				const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
				const sessionCookie = cookieArray[0];
				expect(sessionCookie).toContain("Secure");
				expect(sessionCookie).toContain("SameSite=Strict");

				// Cleanup
				await UserModel.delete(testUser.id);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("should not set secure flag in development", async () => {
			// Ensure we're in development mode
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";

			try {
				// Create test user
				const devPassword = "DevelopmentSecureP@ssw0rd2024!DEV";
				const testUser = await UserModel.create({
					email: "dev-test-env@example.com",
					password: devPassword,
					first_name: "DevEnvironment",
					last_name: "TestUser",
					role: "team_member"
				});

				// Login
				const response = await request(app)
					.post("/api/users/login")
					.send({
						email: "dev-test-env@example.com",
						password: devPassword
					})
					.expect(200);

				// Assert: Secure flag should NOT be set in development
				const setCookieHeader = response.headers["set-cookie"];
				expect(setCookieHeader).toBeDefined();
				if (!setCookieHeader) return;
				const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
				const sessionCookie = cookieArray[0];
				expect(sessionCookie).not.toContain("Secure");
				expect(sessionCookie).toContain("HttpOnly");

				// Cleanup
				await UserModel.delete(testUser.id);
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});
	});
});
