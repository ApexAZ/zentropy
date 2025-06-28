import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel } from "../../models/User";
import usersRouter from "../../routes/users";

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

const mockUserModel = UserModel as {
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
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(mockUserWithPassword);

			const response = await request(app).get("/api/users/1").expect(200);

			// Critical security requirement: password_hash must never be exposed
			expect(response.body).not.toHaveProperty("password_hash");
			expect(response.body.id).toBe("1");
			expect(response.body.email).toBe("john@example.com");
		});

		it("should use secure password handling on user creation", async () => {
			mockUserModel.findByEmail.mockResolvedValue(null); // Email doesn't exist

			const createdUser = {
				id: "new-user-123",
				email: "new@example.com",
				password_hash: "$2b$12$secureHashedPassword",
				first_name: "New",
				last_name: "User",
				role: "team_member" as const,
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

		it("should handle missing email field", async () => {
			const response = await request(app)
				.post("/api/users")
				.send({
					password: "password123",
					first_name: "Test",
					last_name: "User",
					email: "" // Empty email to test validation
				})
				.set("X-Forwarded-For", "192.168.10.1") // Unique IP to avoid rate limit conflicts
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
				role: "team_member" as const
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
				.set("X-Forwarded-For", "192.168.10.2") // Unique IP to avoid rate limit conflicts
				.expect(409);

			expect(response.body).toEqual({ message: "Email already in use" });
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});
	});

	describe("Model Interaction Specifics", () => {
		it("should properly transform update data for model", async () => {
			const existingUser = {
				id: "user-123",
				email: "old@example.com",
				first_name: "Old",
				last_name: "Name",
				role: "team_member" as const
			};

			const updatedUser = {
				...existingUser,
				first_name: "Updated",
				last_name: "Name"
			};

			mockUserModel.findById.mockResolvedValue(existingUser);
			mockUserModel.update.mockResolvedValue(updatedUser);

			await request(app)
				.put("/api/users/user-123")
				.send({
					first_name: "Updated"
					// Partial update - should only update provided fields
				})
				.expect(200);

			expect(mockUserModel.update).toHaveBeenCalledWith("user-123", {
				email: "old@example.com",
				first_name: "Updated",
				last_name: "Name",
				role: "team_member"
			});
		});

		it("should handle model-level deletion properly", async () => {
			mockUserModel.delete.mockResolvedValue(true);

			await request(app).delete("/api/users/user-123").expect(204);

			expect(mockUserModel.delete).toHaveBeenCalledWith("user-123");
		});

		it("should handle model deletion failure", async () => {
			mockUserModel.delete.mockResolvedValue(false);

			const response = await request(app).delete("/api/users/nonexistent-123").expect(404);

			expect(response.body).toEqual({ message: "User not found" });
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
				role: "team_member" as const,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.verifyCredentials.mockResolvedValue(mockUser);
			mockUserModel.updateLastLogin.mockResolvedValue(undefined);

			const response = await request(app)
				.post("/api/users/login")
				.send({
					email: "test@example.com",
					password: "SecureP@ssw0rd123!"
				})
				.expect(200);

			expect(mockUserModel.verifyCredentials).toHaveBeenCalledWith("test@example.com", "SecureP@ssw0rd123!");
			expect(mockUserModel.updateLastLogin).toHaveBeenCalledWith("user-123");
			expect(response.body.message).toBe("Login successful");
			expect(response.body.user).not.toHaveProperty("password_hash");
			expect(response.body.user.id).toBe("user-123");
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

		it("should handle password update", async () => {
			const mockUser = {
				id: "user-123",
				email: "test@example.com",
				first_name: "Test",
				last_name: "User",
				role: "team_member" as const
			};

			mockUserModel.findById.mockResolvedValue(mockUser);
			mockUserModel.updatePassword.mockResolvedValue(true);
			mockUserModel.updateLastLogin.mockResolvedValue(undefined);

			const response = await request(app)
				.put("/api/users/user-123/password")
				.send({
					currentPassword: "OldP@ssw0rd123!",
					newPassword: "NewP@ssw0rd456!"
				})
				.expect(200);

			expect(mockUserModel.updatePassword).toHaveBeenCalledWith("user-123", {
				currentPassword: "OldP@ssw0rd123!",
				newPassword: "NewP@ssw0rd456!"
			});
			expect(response.body).toEqual({ message: "Password updated successfully" });
		});

		it("should handle password validation errors", async () => {
			const mockUser = { id: "user-123" };
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
