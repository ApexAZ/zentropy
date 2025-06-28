import { Router, Request, Response } from "express";
import { UserModel, CreateUserData, UpdateUserData, UserRole, UpdatePasswordData } from "../models/User";
import {
	loginRateLimit,
	passwordUpdateRateLimit,
	generalApiRateLimit,
	userCreationRateLimit
} from "../middleware/rate-limiter";

// Request body interfaces
interface CreateUserRequestBody {
	email: string;
	password: string;
	first_name?: string;
	last_name?: string;
	role?: UserRole;
}

interface UpdateUserRequestBody {
	email?: string;
	first_name?: string;
	last_name?: string;
	role?: UserRole;
}

interface UpdatePasswordRequestBody {
	currentPassword: string;
	newPassword: string;
}

interface LoginRequestBody {
	email: string;
	password: string;
}

const router = Router();

// Apply general rate limiting to all routes in this router
router.use(generalApiRateLimit);

/**
 * POST /api/users/login
 * Authenticate user credentials
 * Rate limited: 5 attempts per 15 minutes per IP+email combination
 */
router.post("/login", loginRateLimit, async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as LoginRequestBody;
		const { email, password } = body;

		// Basic validation
		if (!email || !password) {
			res.status(400).json({ message: "Email and password are required" });
			return;
		}

		// Verify credentials
		const user = await UserModel.verifyCredentials(email, password);
		if (!user) {
			res.status(401).json({ message: "Invalid email or password" });
			return;
		}

		// Update last login timestamp
		await UserModel.updateLastLogin(user.id);

		// Remove password hash from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password_hash: _, ...userWithoutPassword } = user;
		res.json({
			message: "Login successful",
			user: userWithoutPassword
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error during login:", error);
		res.status(500).json({ message: "Login failed" });
	}
});

/**
 * GET /api/users
 * Get all users
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
	try {
		const users = await UserModel.findAll();
		// Remove password hashes from response
		const sanitizedUsers = users.map(user => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { password_hash, ...userWithoutPassword } = user;
			return userWithoutPassword;
		});
		res.json(sanitizedUsers);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching users:", error);
		res.status(500).json({ message: "Failed to fetch users" });
	}
});

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
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

		// Remove password hash from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password_hash, ...userWithoutPassword } = user;
		res.json(userWithoutPassword);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching user:", error);
		res.status(500).json({ message: "Failed to fetch user" });
	}
});

/**
 * POST /api/users
 * Create a new user
 * Rate limited: 2 creations per hour per IP
 */
router.post("/", userCreationRateLimit, async (req: Request, res: Response): Promise<void> => {
	try {
		const body = req.body as CreateUserRequestBody;
		const { email, password, first_name, last_name, role } = body;

		// Basic validation
		if (!email || !password) {
			res.status(400).json({ message: "Email and password are required" });
			return;
		}

		// Check if email already exists
		const existingEmail = await UserModel.findByEmail(email);
		if (existingEmail) {
			res.status(409).json({ message: "Email already in use" });
			return;
		}

		const userData: CreateUserData = {
			email,
			password,
			first_name: first_name ?? "",
			last_name: last_name ?? "",
			role: role ?? "team_member"
		};
		const user = await UserModel.create(userData);

		// Remove password hash from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password_hash: _, ...userWithoutPassword } = user;
		res.status(201).json(userWithoutPassword);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error creating user:", error);

		// Check for specific password validation errors
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

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const body = req.body as UpdateUserRequestBody;
		const { email, first_name, last_name, role } = body;

		// Check if user exists
		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// Prepare update data (non-password fields only)
		const updateData: UpdateUserData = {
			email: email ?? existingUser.email,
			first_name: first_name ?? existingUser.first_name,
			last_name: last_name ?? existingUser.last_name,
			role: role ?? existingUser.role
		};

		// Check for email conflicts
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

		// Remove password hash from response
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { password_hash, ...userWithoutPassword } = updated;
		res.json(userWithoutPassword);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error updating user:", error);
		res.status(500).json({ message: "Failed to update user" });
	}
});

/**
 * PUT /api/users/:id/password
 * Update user password with validation
 * Rate limited: 3 attempts per 30 minutes per IP+user combination
 */
router.put("/:id/password", passwordUpdateRateLimit, async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "User ID is required" });
			return;
		}

		const body = req.body as UpdatePasswordRequestBody;
		const { currentPassword, newPassword } = body;

		// Basic validation
		if (!currentPassword || !newPassword) {
			res.status(400).json({ message: "Current password and new password are required" });
			return;
		}

		// Check if user exists
		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const passwordData: UpdatePasswordData = {
			currentPassword,
			newPassword
		};

		await UserModel.updatePassword(id, passwordData);
		await UserModel.updateLastLogin(id);

		res.json({ message: "Password updated successfully" });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error updating password:", error);

		// Check for specific password validation errors
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

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
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
		// eslint-disable-next-line no-console
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Failed to delete user" });
	}
});

export default router;
