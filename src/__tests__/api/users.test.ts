import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { UserModel, UserRole } from "../../models/User";
import usersRouter from "../../routes/users";

// Mock rate limiting to avoid interference in tests
vi.mock("../../middleware/rate-limiter", () => ({
	loginRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	passwordUpdateRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	userCreationRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	generalApiRateLimit: vi.fn((_req: Request, _res: Response, next: NextFunction) => next())
}));

// Mock session authentication middleware
vi.mock("../../middleware/session-auth", () => ({
	default: vi.fn((_req: Request, _res: Response, next: NextFunction) => next())
}));

// Mock SessionModel for login tests
vi.mock("../../models/Session", () => ({
	SessionModel: {
		create: vi.fn(),
		invalidate: vi.fn(),
		findByToken: vi.fn(),
		cleanupExpired: vi.fn()
	}
}));

import { SessionModel } from "../../models/Session";
const mockSessionModel = SessionModel as unknown as {
	create: Mock;
	invalidate: Mock;
	findByToken: Mock;
	cleanupExpired: Mock;
};

// Mock the UserModel
vi.mock("../../models/User", () => ({
	UserModel: {
		findAll: vi.fn(),
		findById: vi.fn(),
		findByEmail: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		verifyCredentials: vi.fn(),
		updatePassword: vi.fn(),
		updateLastLogin: vi.fn()
	}
}));

const mockUserModel = UserModel as unknown as {
	findAll: Mock;
	findById: Mock;
	findByEmail: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	verifyCredentials: Mock;
	updatePassword: Mock;
	updateLastLogin: Mock;
};

// Create test app with users routes
const app = express();
app.use(express.json());
app.use("/api/users", usersRouter);

describe("Users API - Route Layer Specifics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Security Transformations", () => {
		it("should strip password_hash from all user responses", async () => {
			const mockUserWithPassword = {
				id: "1",
				email: "john@example.com",
				password_hash: "hashed_password",
				first_name: "John",
				last_name: "Doe",
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(mockUserWithPassword);

			const response = await request(app).get("/api/users/1").expect(200);

			// Critical security requirement: password_hash must never be exposed
			expect(response.body).not.toHaveProperty("password_hash");
			const responseBody = response.body as { id: string; email: string };
			expect(responseBody.id).toBe("1");
			expect(responseBody.email).toBe("john@example.com");
		});

		it("should use secure password handling on user creation", async () => {
			mockUserModel.findByEmail.mockResolvedValue(null); // Email doesn't exist

			const createdUser = {
				id: "new-user-123",
				email: "new@example.com",
				password_hash: "$2b$12$secureHashedPassword",
				first_name: "New",
				last_name: "User",
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.create.mockResolvedValue(createdUser);

			const response = await request(app)
				.post("/api/users")
				.send({
					email: "new@example.com",
					password: "SecureP@ssw0rd123!",
					first_name: "New",
					last_name: "User",
					role: "team_member"
				})
				.expect(201);

			// Verify UserModel.create was called with plaintext password (PasswordService handles hashing)
			expect(mockUserModel.create).toHaveBeenCalledWith({
				email: "new@example.com",
				password: "SecureP@ssw0rd123!",
				first_name: "New",
				last_name: "User",
				role: "team_member"
			});

			// Response should not contain password_hash
			expect(response.body).not.toHaveProperty("password_hash");
		});
	});

	describe("Route-specific Edge Cases", () => {
		it("should handle missing password field", async () => {
			const response = await request(app)
				.post("/api/users")
				.send({
					email: "test@example.com",
					first_name: "Test",
					last_name: "User"
					// Missing password
				})
				.expect(400);

			expect(response.body).toEqual({ message: "Email and password are required" });
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});

		it("should handle email conflict detection", async () => {
			const existingUser = {
				id: "existing-123",
				email: "existing@example.com",
				first_name: "Existing",
				last_name: "User",
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findByEmail.mockResolvedValue(existingUser);

			const response = await request(app)
				.post("/api/users")
				.send({
					email: "existing@example.com",
					password: "password123",
					first_name: "New",
					last_name: "User",
					role: "team_member"
				})
				.expect(409);

			expect(response.body).toEqual({ message: "Email already in use" });
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});
	});

	describe("Authentication Endpoints", () => {
		it("should handle successful login", async () => {
			const mockUser = {
				id: "user-123",
				email: "test@example.com",
				password_hash: "$2b$12$hashedPassword",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			const mockSession = {
				session_token: "mock-session-token-123",
				user_id: "user-123",
				ip_address: "192.168.1.1",
				user_agent: "Test Browser",
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
				is_active: true,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.verifyCredentials.mockResolvedValue(mockUser);
			mockUserModel.updateLastLogin.mockResolvedValue(undefined);
			mockSessionModel.create.mockResolvedValue(mockSession);

			const response = await request(app)
				.post("/api/users/login")
				.send({
					email: "test@example.com",
					password: "SecureP@ssw0rd123!"
				})
				.expect(200);

			expect(mockUserModel.verifyCredentials).toHaveBeenCalledWith("test@example.com", "SecureP@ssw0rd123!");
			expect(mockUserModel.updateLastLogin).toHaveBeenCalledWith("user-123");
			const responseBody = response.body as { message: string; user: { id: string } };
			expect(responseBody.message).toBe("Login successful");
			expect(responseBody.user).not.toHaveProperty("password_hash");
			expect(responseBody.user.id).toBe("user-123");
		});

		it("should handle failed login", async () => {
			mockUserModel.verifyCredentials.mockResolvedValue(null);

			const response = await request(app)
				.post("/api/users/login")
				.send({
					email: "test@example.com",
					password: "wrongpassword"
				})
				.expect(401);

			expect(response.body).toEqual({ message: "Invalid email or password" });
			expect(mockUserModel.updateLastLogin).not.toHaveBeenCalled();
		});

		it("should handle password validation errors", async () => {
			const mockUser = {
				id: "user-123",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as UserRole,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(mockUser);
			mockUserModel.updatePassword.mockRejectedValue(
				new Error("Password validation failed: Password is too weak")
			);

			const response = await request(app)
				.put("/api/users/user-123/password")
				.send({
					currentPassword: "OldP@ssw0rd123!",
					newPassword: "weak"
				})
				.expect(400);

			expect(response.body).toEqual({ message: "Password validation failed: Password is too weak" });
		});
	});
});
