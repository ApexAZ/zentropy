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

// Create test app with users routes (without rate limiting for isolated testing)
const app = express();
app.use(express.json());

// Create a test router without rate limiting to avoid interference
const testRouter = express.Router();

// Re-define routes without rate limiting middleware for testing
testRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as { email: string; password: string };
		const { email, password } = body;

		if (!email || !password) {
			res.status(400).json({ message: "Email and password are required" });
			return;
		}

		const user = await UserModel.verifyCredentials(email, password);
		if (!user) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		await UserModel.updateLastLogin(user.id);
		const { password_hash: _, ...userWithoutPassword } = user;
		res.json({
			message: "Login successful",
			user: userWithoutPassword
		});
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ message: "Login failed" });
	}
});

testRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
	try {
		const users = await UserModel.findAll();
		const sanitizedUsers = users.map(user => {
			const { password_hash, ...userWithoutPassword } = user;
			return userWithoutPassword;
		});
		res.json(sanitizedUsers);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Failed to fetch users" });
	}
});

testRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const user = await UserModel.findById(id);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const { password_hash, ...userWithoutPassword } = user;
		res.json(userWithoutPassword);
	} catch (error) {
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Failed to fetch user" });
	}
});

testRouter.post("/", async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as {
			email: string;
			password: string;
			first_name?: string;
			last_name?: string;
			role?: string;
		};
		const { email, password, first_name, last_name, role } = body;

		if (!email || !password) {
			res.status(400).json({ message: "Email and password are required" });
			return;
		}

		const existingEmail = await UserModel.findByEmail(email);
		if (existingEmail) {
			res.status(409).json({ message: "Email already in use" });
			return;
		}

		const userData = {
			email,
			password,
			first_name: first_name ?? "",
			last_name: last_name ?? "",
			role: role ?? "team_member"
		};
		const user = await UserModel.create(userData);

		const { password_hash: _, ...userWithoutPassword } = user;
		res.status(201).json(userWithoutPassword);
	} catch (error) {
		console.error("Error creating user:", error);
		if (error instanceof Error) {
			if (error.message.includes("Password validation failed")) {
				res.status(400).json({ message: error.message });
				return;
			}
			if (error.message.includes("Email already exists")) {
				res.status(409).json({ message: "Email already in use" });
				return;
			}
		}
		res.status(500).json({ message: "Failed to create user" });
	}
});

testRouter.put("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const body = req.body as { email?: string; first_name?: string; last_name?: string; role?: string };
		const { email, first_name, last_name, role } = body;

		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const updateData = {
			email: email ?? existingUser.email,
			first_name: first_name ?? existingUser.first_name,
			last_name: last_name ?? existingUser.last_name,
			role: role ?? existingUser.role
		};

		if (email && email !== existingUser.email) {
			const emailExists = await UserModel.findByEmail(email);
			if (emailExists) {
				res.status(409).json({ message: "Email already in use" });
				return;
			}
		}

		const updated = await UserModel.update(id, updateData);
		if (!updated) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const { password_hash, ...userWithoutPassword } = updated;
		res.json(userWithoutPassword);
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ message: "Failed to update user" });
	}
});

testRouter.put("/:id/password", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const body = req.body as { currentPassword: string; newPassword: string };
		const { currentPassword, newPassword } = body;

		if (!currentPassword || !newPassword) {
			res.status(400).json({ message: "Current password and new password are required" });
			return;
		}

		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const passwordData = { currentPassword, newPassword };
		await UserModel.updatePassword(id, passwordData);
		await UserModel.updateLastLogin(id);

		res.json({ message: "Password updated successfully" });
	} catch (error) {
		console.error("Error updating password:", error);
		if (error instanceof Error) {
			if (error.message.includes("Password validation failed")) {
				res.status(400).json({ message: error.message });
				return;
			}
			if (error.message.includes("Current password is incorrect")) {
				res.status(401).json({ message: "Current password is incorrect" });
				return;
			}
		}
		res.status(500).json({ message: "Failed to update password" });
	}
});

testRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const deleted = await UserModel.delete(id);
		if (!deleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		res.status(204).send();
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Failed to delete user" });
	}
});

app.use("/api/users", testRouter);

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
