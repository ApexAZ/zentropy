import { Router, Request, Response } from "express";
import { UserModel, CreateUserData, UpdateUserData, UserRole } from "../models/User";
import bcrypt from "bcrypt";

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
	password?: string;
	first_name?: string;
	last_name?: string;
	role?: UserRole;
}

const router = Router();

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
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
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

		// Hash password
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(password, saltRounds);

		const userData: CreateUserData = {
			email,
			password_hash,
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
		const { email, first_name, last_name, role, password } = body;

		// Check if user exists
		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// Prepare update data
		const updateData: UpdateUserData & { password_hash?: string } = {
			email: email ?? existingUser.email,
			first_name: first_name ?? existingUser.first_name,
			last_name: last_name ?? existingUser.last_name,
			role: role ?? existingUser.role
		};

		// If password is provided, hash it
		if (password) {
			const saltRounds = 10;
			updateData.password_hash = await bcrypt.hash(password, saltRounds);
		}

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
