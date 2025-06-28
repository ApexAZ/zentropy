import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import sessionAuthMiddleware from "../../middleware/session-auth";

// Integration test for session validation middleware
describe("Session Authentication Middleware", () => {
	let app: express.Application;
	let testUser: any;
	let testSession: any;

	beforeEach(async () => {
		app = express();
		app.use(express.json());

		// Create test user and session for middleware testing
		const strongPassword = "ComplexP@ssw0rd2024!ZqX9";
		testUser = await UserModel.create({
			email: "session-middleware-test@example.com",
			password: strongPassword,
			first_name: "John",
			last_name: "Smith",
			role: "team_member"
		});

		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "192.168.1.100",
			user_agent: "Test Browser v1.0"
		});

		// Test route that requires authentication
		app.get("/protected", sessionAuthMiddleware, (_req: Request, res: Response) => {
			res.json({
				message: "Access granted",
				user: res.locals.user
			});
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

	describe("Valid Session Authentication", () => {
		it("should allow access with valid session cookie", async () => {
			const response = await request(app)
				.get("/protected")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			// Assert: Should get successful response with user data
			expect(response.body).toHaveProperty("message", "Access granted");
			expect(response.body).toHaveProperty("user");
			expect(response.body.user).toHaveProperty("id", testUser.id);
			expect(response.body.user).toHaveProperty("email", testUser.email);
			expect(response.body.user).not.toHaveProperty("password_hash");
		});

		it("should update session activity on valid access", async () => {
			const originalSession = await SessionModel.findByToken(testSession.session_token);
			const originalUpdatedAt = originalSession?.updated_at;

			// Wait a small amount to ensure timestamp difference
			await new Promise(resolve => setTimeout(resolve, 10));

			await request(app).get("/protected").set("Cookie", `sessionToken=${testSession.session_token}`).expect(200);

			// Check that session activity was updated
			const updatedSession = await SessionModel.findByToken(testSession.session_token);
			expect(updatedSession?.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
		});

		it("should work with session that has user data", async () => {
			const response = await request(app)
				.get("/protected")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			// Verify user data is complete
			expect(response.body.user.first_name).toBe("John");
			expect(response.body.user.last_name).toBe("Smith");
			expect(response.body.user.role).toBe("team_member");
			expect(response.body.user.is_active).toBe(true);
		});
	});

	describe("Invalid Session Handling", () => {
		it("should reject request with no session cookie", async () => {
			const response = await request(app).get("/protected").expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should reject request with invalid session token", async () => {
			const response = await request(app)
				.get("/protected")
				.set("Cookie", "sessionToken=invalid-token-12345")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should reject request with expired session", async () => {
			// Create a session that will expire soon, then manually expire it
			const expiredSession = await SessionModel.create({
				user_id: testUser.id,
				ip_address: "192.168.1.100",
				user_agent: "Test Browser v1.0"
			});

			// Manually update the session to be expired in the database
			await SessionModel.invalidate(expiredSession.session_token);

			const response = await request(app)
				.get("/protected")
				.set("Cookie", `sessionToken=${expiredSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should reject request with inactive session", async () => {
			// Invalidate the test session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request(app)
				.get("/protected")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should reject request with malformed session cookie", async () => {
			const response = await request(app)
				.get("/protected")
				.set("Cookie", "sessionToken=malformed-cookie")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});
	});

	describe("User Account Status Validation", () => {
		it("should reject session for inactive user account", async () => {
			// Deactivate the user account
			await UserModel.update(testUser.id, {
				is_active: false
			});

			const response = await request(app)
				.get("/protected")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "User account is not active");
		});
	});

	describe("Cookie Parsing", () => {
		it("should handle multiple cookies correctly", async () => {
			const response = await request(app)
				.get("/protected")
				.set(
					"Cookie",
					[`sessionToken=${testSession.session_token}`, "other-cookie=some-value", "tracking-id=xyz123"].join(
						"; "
					)
				)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Access granted");
		});

		it("should handle cookie with extra whitespace", async () => {
			const response = await request(app)
				.get("/protected")
				.set("Cookie", ` sessionToken=${testSession.session_token} ; other=value `)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Access granted");
		});
	});
});
