import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import usersRouter from "../../routes/users";

// Mock rate limiting middleware to avoid conflicts in tests
vi.mock("../../middleware/rate-limiter", () => ({
	loginRateLimit: vi.fn((req: any, _res: any, next: any) => next()),
	passwordUpdateRateLimit: vi.fn((req: any, _res: any, next: any) => next()),
	userCreationRateLimit: vi.fn((req: any, _res: any, next: any) => next()),
	generalApiRateLimit: vi.fn((req: any, _res: any, next: any) => next())
}));

// Integration test for protected user routes
describe("Protected User Routes", () => {
	let app: express.Application;
	let testUser: any;
	let testSession: any;

	beforeEach(async () => {
		app = express();
		app.set('trust proxy', true); // Trust proxy headers for rate limiting
		app.use(express.json());
		app.use("/api/users", usersRouter);

		// Create test user and session for authentication testing
		const strongPassword = "ComplexSecureP@ssw0rd2024!ZqX7";
		testUser = await UserModel.create({
			email: "protected-routes-test@example.com",
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
		// Clean up test data
		if (testSession) {
			await SessionModel.invalidate(testSession.session_token);
		}
		if (testUser) {
			await UserModel.delete(testUser.id);
		}
		await SessionModel.cleanupExpired();
	});

	describe("Authenticated Access", () => {
		it("should allow GET /api/users with valid session", async () => {
			const response = await request(app)
				.get("/api/users")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			// Should not include password hashes
			if (response.body.length > 0) {
				expect(response.body[0]).not.toHaveProperty("password_hash");
			}
		});

		it("should allow GET /api/users/:id with valid session", async () => {
			const response = await request(app)
				.get(`/api/users/${testUser.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("id", testUser.id);
			expect(response.body).toHaveProperty("email", testUser.email);
			expect(response.body).not.toHaveProperty("password_hash");
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

			expect(response.body).toHaveProperty("first_name", "UpdatedProtected");
			expect(response.body).toHaveProperty("last_name", "UpdatedRouteUser");
			expect(response.body).not.toHaveProperty("password_hash");
		});

		it("should allow PUT /api/users/:id/password with valid session", async () => {
			const passwordData = {
				currentPassword: "ComplexSecureP@ssw0rd2024!ZqX7",
				newPassword: "NewComplexP@ssw0rd2024!ABC"
			};

			const response = await request(app)
				.put(`/api/users/${testUser.id}/password`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(passwordData)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Password updated successfully");
		});

		it("should allow DELETE /api/users/:id with valid session", async () => {
			// Create a separate user for deletion test
			const deleteUser = await UserModel.create({
				email: "delete-test@example.com",
				password: "ComplexDeleteP@ssw0rd2024!XYZ",
				first_name: "Bob",
				last_name: "RemoveUser",
				role: "team_member"
			});

			const response = await request(app)
				.delete(`/api/users/${deleteUser.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(204);

			expect(response.body).toEqual({});

			// Verify user was deleted
			const deletedUser = await UserModel.findById(deleteUser.id);
			expect(deletedUser).toBeNull();
		});
	});

	describe("Unauthenticated Access Denied", () => {
		it("should deny GET /api/users without session", async () => {
			const response = await request(app)
				.get("/api/users")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/users/:id without session", async () => {
			const response = await request(app)
				.get(`/api/users/${testUser.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/users/:id without session", async () => {
			const updateData = {
				first_name: "ShouldNotUpdate"
			};

			const response = await request(app)
				.put(`/api/users/${testUser.id}`)
				.send(updateData)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
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

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny DELETE /api/users/:id without session", async () => {
			const response = await request(app)
				.delete(`/api/users/${testUser.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});
	});

	describe("Invalid Session Access Denied", () => {
		it("should deny access with invalid session token", async () => {
			const response = await request(app)
				.get("/api/users")
				.set("Cookie", "sessionToken=invalid-token-12345")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should deny access with expired session", async () => {
			// Invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request(app)
				.get("/api/users")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});
	});

	describe("Unprotected Routes Still Work", () => {
		it("should allow POST /api/users/login without session", async () => {
			const loginData = {
				email: testUser.email,
				password: "ComplexSecureP@ssw0rd2024!ZqX7"
			};

			const response = await request(app)
				.post("/api/users/login")
				.send(loginData)
				.expect(200);

			expect(response.body).toHaveProperty("message", "Login successful");
			expect(response.body).toHaveProperty("user");
		});

		it("should allow POST /api/users/logout without session", async () => {
			const response = await request(app)
				.post("/api/users/logout")
				.expect(200);

			expect(response.body).toHaveProperty("message", "Logged out successfully");
		});

		it("should allow POST /api/users (registration) without session", async () => {
			const newUserData = {
				email: "new-registration@example.com",
				password: "ComplexRegistrationP@ssw0rd2024!XYZ",
				first_name: "Sarah",
				last_name: "NewUser",
				role: "team_member"
			};

			const response = await request(app)
				.post("/api/users")
				.send(newUserData)
				.expect(201);

			expect(response.body).toHaveProperty("email", "new-registration@example.com");
			expect(response.body).not.toHaveProperty("password_hash");

			// Clean up the created user
			await UserModel.delete(response.body.id);
		});
	});
});