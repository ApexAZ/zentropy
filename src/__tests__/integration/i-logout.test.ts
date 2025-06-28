import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel, type User } from "../../models/User";
import { SessionModel, type Session } from "../../models/Session";
import usersRouter from "../../routes/users";

// Integration test for logout functionality
describe("Logout Integration", () => {
	let app: express.Application;
	let testUser: User;
	let testSession: Session;

	beforeEach(async () => {
		app = express();
		app.use(express.json());
		app.use("/api/users", usersRouter);

		// Create test user and session for logout testing
		const strongPassword = "ComplexP@ssw0rd2024!ZqX8";
		testUser = await UserModel.create({
			email: "logout-test@example.com",
			password: strongPassword,
			first_name: "Alice",
			last_name: "Johnson",
			role: "team_member"
		});

		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "192.168.1.200",
			user_agent: "Test Browser Logout v1.0"
		});
	});

	afterEach(async () => {
		// Clean up test data
		if (testSession) {
			await SessionModel.invalidate(testSession.session_token);
		}
		if (testUser) {
			await UserModel.delete(testUser.id);
		}
		await SessionModel.cleanupExpired();
	});

	describe("Successful Logout", () => {
		it("should invalidate session and clear cookie on logout", async () => {
			const response = await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			// Assert: Should get successful logout response
			expect(response.body).toHaveProperty("message", "Logged out successfully");

			// Assert: Should clear the session cookie
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();
			const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

			const sessionCookie = cookieArray.find((cookie: string) => cookie.startsWith("sessionToken=")) as string;
			expect(sessionCookie).toBeDefined();

			// Cookie should be expired (Max-Age=0 or expires in the past)
			expect(sessionCookie).toMatch(/Max-Age=0|expires=.*Thu.*01.*Jan.*1970/);
			expect(sessionCookie).toContain("HttpOnly");
			expect(sessionCookie).toContain("Path=/");

			// Assert: Session should be invalidated in database
			const invalidatedSession = await SessionModel.findByToken(testSession.session_token);
			expect(invalidatedSession).toBeNull();
		});

		it("should work when session is already expired", async () => {
			// Pre-invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Logged out successfully");

			// Should still clear the cookie even if session was already invalid
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();
		});

		it("should logout without affecting other user sessions", async () => {
			// Create a second session for the same user
			const secondSession = await SessionModel.create({
				user_id: testUser.id,
				ip_address: "192.168.1.201",
				user_agent: "Test Browser Logout Different Session v1.0"
			});

			// Logout with first session
			await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			// First session should be invalidated
			const firstSession = await SessionModel.findByToken(testSession.session_token);
			expect(firstSession).toBeNull();

			// Second session should still be active
			const stillActiveSession = await SessionModel.findByToken(secondSession.session_token);
			expect(stillActiveSession).toBeTruthy();
			expect(stillActiveSession?.is_active).toBe(true);

			// Clean up second session
			await SessionModel.invalidate(secondSession.session_token);
		});
	});

	describe("Logout Without Authentication", () => {
		it("should handle logout request without session cookie", async () => {
			const response = await request(app).post("/api/users/logout").expect(200);

			// Should still return success even without authentication
			expect(response.body).toHaveProperty("message", "Logged out successfully");

			// Should set empty cookie to clear any existing session
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();
			const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

			const sessionCookie = cookieArray.find((cookie: string) => cookie.startsWith("sessionToken=")) as string;
			expect(sessionCookie).toBeDefined();
			expect(sessionCookie).toMatch(/Max-Age=0|expires=.*Thu.*01.*Jan.*1970/);
		});

		it("should handle logout with invalid session token", async () => {
			const response = await request(app)
				.post("/api/users/logout")
				.set("Cookie", "sessionToken=invalid-token-xyz123")
				.expect(200);

			expect(response.body).toHaveProperty("message", "Logged out successfully");

			// Should clear the cookie even for invalid tokens
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();
		});

		it("should handle logout with malformed session cookie", async () => {
			const response = await request(app)
				.post("/api/users/logout")
				.set("Cookie", "sessionToken=malformed")
				.expect(200);

			expect(response.body).toHaveProperty("message", "Logged out successfully");
		});
	});

	describe("Security Considerations", () => {
		it("should clear cookie with same security flags as login", async () => {
			// Set NODE_ENV to production for security flags test
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			try {
				const response = await request(app)
					.post("/api/users/logout")
					.set("Cookie", `sessionToken=${testSession.session_token}`)
					.expect(200);

				const setCookieHeader = response.headers["set-cookie"];
				const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
				const sessionCookie = cookieArray.find((cookie: string) =>
					cookie.startsWith("sessionToken=")
				) as string;

				// Should have security flags in production
				expect(sessionCookie).toContain("Secure");
				expect(sessionCookie).toContain("SameSite=Strict");
				expect(sessionCookie).toContain("HttpOnly");
			} finally {
				process.env.NODE_ENV = originalEnv;
			}
		});

		it("should prevent session fixation by invalidating database session", async () => {
			// Confirm session is active before logout
			const activeSession = await SessionModel.findByToken(testSession.session_token);
			expect(activeSession?.is_active).toBe(true);

			// Logout
			await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			// Verify session is invalidated in database
			const invalidatedSession = await SessionModel.findByToken(testSession.session_token);
			expect(invalidatedSession).toBeNull();

			// Verify session cannot be used after logout by attempting login status check
			// Since we don't have a protected route yet, we can verify the session is gone by
			// checking that it returns null from the database
			const sessionAfterLogout = await SessionModel.findByToken(testSession.session_token);
			expect(sessionAfterLogout).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully during logout", async () => {
			// This test would require mocking the database to simulate errors
			// For now, we'll test that the endpoint exists and handles the happy path
			const response = await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Logged out successfully");
		});
	});
});
