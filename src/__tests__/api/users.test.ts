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

describe("Users API Endpoints", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("GET /api/users", () => {
		it("should return all users without password hashes", async () => {
			const mockUsersWithPasswords = [
				{
					id: "1",
					email: "john@example.com",
					password_hash: "hashed_password_1",
					first_name: "John",
					last_name: "Doe",
					role: "team_member" as const,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				},
				{
					id: "2",
					email: "jane@example.com",
					password_hash: "hashed_password_2",
					first_name: "Jane",
					last_name: "Smith",
					role: "team_lead" as const,
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				}
			];

			const expectedUsersWithoutPasswords = [
				{
					id: "1",
					email: "john@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				},
				{
					id: "2",
					email: "jane@example.com",
					first_name: "Jane",
					last_name: "Smith",
					role: "team_lead",
					created_at: "2024-01-01T00:00:00.000Z",
					updated_at: "2024-01-01T00:00:00.000Z"
				}
			];

			mockUserModel.findAll.mockResolvedValue(mockUsersWithPasswords);

			const response = await request(app)
				.get("/api/users")
				.expect(200);

			expect(response.body).toEqual(expectedUsersWithoutPasswords);
			expect(mockUserModel.findAll).toHaveBeenCalledTimes(1);
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockUserModel.findAll.mockRejectedValue(dbError);

			const response = await request(app)
				.get("/api/users")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to fetch users" });
		});
	});

	describe("GET /api/users/:id", () => {
		it("should return a specific user without password hash", async () => {
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

			const expectedUserWithoutPassword = {
				id: "1",
				email: "john@example.com",
				first_name: "John",
				last_name: "Doe",
				role: "team_member",
				created_at: mockUserWithPassword.created_at,
				updated_at: mockUserWithPassword.updated_at
			};

			mockUserModel.findById.mockResolvedValue(mockUserWithPassword);

			const response = await request(app)
				.get("/api/users/1")
				.expect(200);

			expect(response.body).toEqual(expectedUserWithoutPassword);
			expect(mockUserModel.findById).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent user", async () => {
			mockUserModel.findById.mockResolvedValue(null);

			const response = await request(app)
				.get("/api/users/999")
				.expect(404);

			expect(response.body).toEqual({ message: "User not found" });
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockUserModel.findById.mockRejectedValue(dbError);

			const response = await request(app)
				.get("/api/users/1")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to fetch user" });
		});
	});

	describe("POST /api/users", () => {
		const validUserData = {
			email: "newuser@example.com",
			password: "password123",
			first_name: "New",
			last_name: "User",
			role: "team_member"
		};

		it("should create a new user with valid data", async () => {
			const hashedPassword = "hashed_password_123";
			const createdUserWithPassword = {
				id: "3",
				email: "newuser@example.com",
				password_hash: hashedPassword,
				first_name: "New",
				last_name: "User",
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};

			const expectedUserResponse = {
				id: "3",
				email: "newuser@example.com",
				first_name: "New",
				last_name: "User",
				role: "team_member",
				created_at: createdUserWithPassword.created_at,
				updated_at: createdUserWithPassword.updated_at
			};

			mockUserModel.findByEmail.mockResolvedValue(null); // Email doesn't exist
			mockBcrypt.hash.mockResolvedValue(hashedPassword);
			mockUserModel.create.mockResolvedValue(createdUserWithPassword);

			const response = await request(app)
				.post("/api/users")
				.send(validUserData)
				.expect(201);

			expect(response.body).toEqual(expectedUserResponse);
			expect(mockUserModel.findByEmail).toHaveBeenCalledWith("newuser@example.com");
			expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
			expect(mockUserModel.create).toHaveBeenCalledWith({
				email: "newuser@example.com",
				password_hash: hashedPassword,
				first_name: "New",
				last_name: "User",
				role: "team_member"
			});
		});

		it("should create user with default values when optional fields missing", async () => {
			const minimalUserData = {
				email: "minimal@example.com",
				password: "password123"
			};

			const hashedPassword = "hashed_password_123";
			const createdUserWithPassword = {
				id: "4",
				email: "minimal@example.com",
				password_hash: hashedPassword,
				first_name: "",
				last_name: "",
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findByEmail.mockResolvedValue(null);
			mockBcrypt.hash.mockResolvedValue(hashedPassword);
			mockUserModel.create.mockResolvedValue(createdUserWithPassword);

			const response = await request(app)
				.post("/api/users")
				.send(minimalUserData)
				.expect(201);

			expect(mockUserModel.create).toHaveBeenCalledWith({
				email: "minimal@example.com",
				password_hash: hashedPassword,
				first_name: "",
				last_name: "",
				role: "team_member"
			});
		});

		it("should return 400 for missing email", async () => {
			const invalidData = {
				password: "password123",
				first_name: "Test"
				// Missing email
			};

			const response = await request(app)
				.post("/api/users")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "Email and password are required" });
			expect(mockUserModel.findByEmail).not.toHaveBeenCalled();
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});

		it("should return 400 for missing password", async () => {
			const invalidData = {
				email: "test@example.com",
				first_name: "Test"
				// Missing password
			};

			const response = await request(app)
				.post("/api/users")
				.send(invalidData)
				.expect(400);

			expect(response.body).toEqual({ message: "Email and password are required" });
			expect(mockUserModel.findByEmail).not.toHaveBeenCalled();
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});

		it("should return 409 for duplicate email", async () => {
			const existingUser = {
				id: "1",
				email: "existing@example.com",
				password_hash: "existing_hash",
				first_name: "Existing",
				last_name: "User",
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findByEmail.mockResolvedValue(existingUser);

			const response = await request(app)
				.post("/api/users")
				.send({
					email: "existing@example.com",
					password: "password123"
				})
				.expect(409);

			expect(response.body).toEqual({ message: "Email already in use" });
			expect(mockUserModel.create).not.toHaveBeenCalled();
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockUserModel.findByEmail.mockRejectedValue(dbError);

			const response = await request(app)
				.post("/api/users")
				.send(validUserData)
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to create user" });
		});
	});

	describe("PUT /api/users/:id", () => {
		const existingUser = {
			id: "1",
			email: "existing@example.com",
			password_hash: "old_hash",
			first_name: "Old",
			last_name: "Name",
			role: "team_member" as const,
			created_at: new Date(),
			updated_at: new Date()
		};

		it("should update user with valid data", async () => {
			const updateData = {
				email: "updated@example.com",
				first_name: "Updated",
				last_name: "User",
				role: "team_lead"
			};

			const updatedUser = {
				...existingUser,
				...updateData,
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(existingUser);
			mockUserModel.findByEmail.mockResolvedValue(null); // New email doesn't exist
			mockUserModel.update.mockResolvedValue(updatedUser);

			const response = await request(app)
				.put("/api/users/1")
				.send(updateData)
				.expect(200);

			expect(mockUserModel.findById).toHaveBeenCalledWith("1");
			expect(mockUserModel.findByEmail).toHaveBeenCalledWith("updated@example.com");
			expect(mockUserModel.update).toHaveBeenCalledWith("1", updateData);
		});

		it("should update user password when provided", async () => {
			const updateData = {
				password: "newpassword123"
			};

			const hashedPassword = "new_hashed_password";
			const updatedUser = {
				...existingUser,
				password_hash: hashedPassword,
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(existingUser);
			mockBcrypt.hash.mockResolvedValue(hashedPassword);
			mockUserModel.update.mockResolvedValue(updatedUser);

			const response = await request(app)
				.put("/api/users/1")
				.send(updateData)
				.expect(200);

			expect(mockBcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
			expect(mockUserModel.update).toHaveBeenCalledWith("1", {
				email: existingUser.email,
				first_name: existingUser.first_name,
				last_name: existingUser.last_name,
				role: existingUser.role,
				password_hash: hashedPassword
			});
		});

		it("should return 404 for non-existent user", async () => {
			mockUserModel.findById.mockResolvedValue(null);

			const response = await request(app)
				.put("/api/users/999")
				.send({ first_name: "Test" })
				.expect(404);

			expect(response.body).toEqual({ message: "User not found" });
			expect(mockUserModel.update).not.toHaveBeenCalled();
		});

		it("should return 409 for email conflicts", async () => {
			const conflictingUser = {
				id: "2",
				email: "conflicting@example.com",
				password_hash: "hash",
				first_name: "Conflict",
				last_name: "User",
				role: "team_member" as const,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockUserModel.findById.mockResolvedValue(existingUser);
			mockUserModel.findByEmail.mockResolvedValue(conflictingUser); // Email already exists

			const response = await request(app)
				.put("/api/users/1")
				.send({ email: "conflicting@example.com" })
				.expect(409);

			expect(response.body).toEqual({ message: "Email already in use" });
			expect(mockUserModel.update).not.toHaveBeenCalled();
		});

		it("should handle update method returning null", async () => {
			mockUserModel.findById.mockResolvedValue(existingUser);
			mockUserModel.findByEmail.mockResolvedValue(null);
			mockUserModel.update.mockResolvedValue(null);

			const response = await request(app)
				.put("/api/users/1")
				.send({ first_name: "Test" })
				.expect(404);

			expect(response.body).toEqual({ message: "User not found" });
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockUserModel.findById.mockRejectedValue(dbError);

			const response = await request(app)
				.put("/api/users/1")
				.send({ first_name: "Test" })
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to update user" });
		});
	});

	describe("DELETE /api/users/:id", () => {
		it("should delete an existing user", async () => {
			mockUserModel.delete.mockResolvedValue(true);

			const response = await request(app)
				.delete("/api/users/1")
				.expect(204);

			expect(response.body).toEqual({});
			expect(mockUserModel.delete).toHaveBeenCalledWith("1");
		});

		it("should return 404 for non-existent user", async () => {
			mockUserModel.delete.mockResolvedValue(false);

			const response = await request(app)
				.delete("/api/users/999")
				.expect(404);

			expect(response.body).toEqual({ message: "User not found" });
		});

		it("should handle database errors gracefully", async () => {
			const dbError = new Error("Database connection failed");
			mockUserModel.delete.mockRejectedValue(dbError);

			const response = await request(app)
				.delete("/api/users/1")
				.expect(500);

			expect(response.body).toEqual({ message: "Failed to delete user" });
		});
	});
});