import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcrypt";
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
		delete: vi.fn()
	}
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
	default: {
		hash: vi.fn(),
		compare: vi.fn()
	}
}));

const mockUserModel = UserModel as {
	findAll: Mock;
	findById: Mock;
	findByEmail: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
};

const mockBcrypt = bcrypt as {
	hash: Mock;
	compare: Mock;
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

			const response = await request(app)
				.get("/api/users/1")
				.expect(200);

			// Critical security requirement: password_hash must never be exposed
			expect(response.body).not.toHaveProperty("password_hash");
			expect(response.body.id).toBe("1");
			expect(response.body.email).toBe("john@example.com");
		});

		it("should hash password on user creation", async () => {
			const hashedPassword = "hashed_password_123";
			mockBcrypt.hash.mockResolvedValue(hashedPassword);
			mockUserModel.findByEmail.mockResolvedValue(null); // Email doesn't exist
			
			const createdUser = {
				id: "new-user-123",
				email: "new@example.com",
				password_hash: hashedPassword,
				first_name: "New",
				last_name: "User",
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};
			
			mockUserModel.create.mockResolvedValue(createdUser);

			const response = await request(app)
				.post("/api/users")
				.send({
					email: "new@example.com",
					password: "plaintext_password",
					first_name: "New",
					last_name: "User",
					role: "team_member"
				})
				.expect(201);

			// Verify password was hashed before model call
			expect(mockBcrypt.hash).toHaveBeenCalledWith("plaintext_password", 10);
			expect(mockUserModel.create).toHaveBeenCalledWith({
				email: "new@example.com",
				password_hash: hashedPassword,
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
					last_name: "User"
					// Missing email
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

			await request(app)
				.delete("/api/users/user-123")
				.expect(204);

			expect(mockUserModel.delete).toHaveBeenCalledWith("user-123");
		});

		it("should handle model deletion failure", async () => {
			mockUserModel.delete.mockResolvedValue(false);

			const response = await request(app)
				.delete("/api/users/nonexistent-123")
				.expect(404);

			expect(response.body).toEqual({ message: "User not found" });
		});
	});
});