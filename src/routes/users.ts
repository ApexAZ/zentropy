import { Router, Request, Response } from "express";
import { UserModel, CreateUserData, UpdateUserData, UserRole, UpdatePasswordData } from "../models/User";
import { SessionModel } from "../models/Session";
import sessionAuthMiddleware from "../middleware/session-auth";
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

interface SessionCookieOptions {
	httpOnly: boolean;
	secure: boolean;
	sameSite: "strict" | "lax" | "none";
	maxAge: number;
	path: string;
}

const router = Router();

// Apply general rate limiting to all routes in this router
router.use(generalApiRateLimit);

/**
 * Generate secure cookie options based on environment
 */
function getSessionCookieOptions(): SessionCookieOptions {
	const isProduction = process.env.NODE_ENV === "production";
	const maxAgeHours = 24;

	return {
		httpOnly: true,
		secure: isProduction, // Only use secure in production (requires HTTPS)
		sameSite: "strict",
		maxAge: maxAgeHours * 60 * 60 * 1000, // 24 hours in milliseconds
		path: "/"
	};
}

/**
 * Extract session token from request cookies
 */
function extractSessionTokenFromRequest(req: Request): string | null {
	const cookies = req.headers.cookie;

	if (!cookies) {
		return null;
	}

	// Parse cookies to find sessionToken
	const cookiePairs = cookies.split(";");

	for (const pair of cookiePairs) {
		const [name, value] = pair.trim().split("=");
		if (name === "sessionToken") {
			return value ?? null;
		}
	}

	return null;
}

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

		// Create session for authenticated user
		const session = await SessionModel.create({
			user_id: user.id,
			ip_address: req.ip ?? "unknown",
			user_agent: req.headers["user-agent"] ?? "unknown"
		});

		// Set HTTP-only session cookie
		const cookieOptions = getSessionCookieOptions();
		res.cookie("sessionToken", session.session_token, cookieOptions);

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
		// eslint-disable-next-line no-console
		if (error instanceof Error) {
			// eslint-disable-next-line no-console
			console.error("Error message:", error.message);
			// eslint-disable-next-line no-console
			console.error("Error stack:", error.stack);
		}
		res.status(500).json({
			message: "Login failed",
			error: error instanceof Error ? error.message : "Unknown error"
		});
	}
});

/**
 * GET /api/users
 * Get all users
 * Requires authentication
 */
router.get("/", sessionAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
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
 * Requires authentication
 */
router.get("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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
 * Requires authentication
 */
router.put("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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
 * Requires authentication
 */
router.put(
	"/:id/password",
	sessionAuthMiddleware,
	passwordUpdateRateLimit,
	async (req: Request, res: Response): Promise<void> => {
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
	}
);

/**
 * POST /api/users/logout
 * Logout user and invalidate session
 */
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
	try {
		// Extract session token from cookies
		const sessionToken = extractSessionTokenFromRequest(req);

		// If session token exists, invalidate it in the database
		if (sessionToken) {
			await SessionModel.invalidate(sessionToken);
		}

		// Clear the session cookie regardless of whether session was found
		const cookieOptions = getSessionCookieOptions();
		// Set Max-Age to 0 to immediately expire the cookie
		const logoutCookieOptions = {
			...cookieOptions,
			maxAge: 0
		};
		res.cookie("sessionToken", "", logoutCookieOptions);

		res.json({ message: "Logged out successfully" });
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error during logout:", error);
		// Even if there's an error, we should still clear the cookie
		const cookieOptions = getSessionCookieOptions();
		const logoutCookieOptions = {
			...cookieOptions,
			maxAge: 0
		};
		res.cookie("sessionToken", "", logoutCookieOptions);
		res.json({ message: "Logged out successfully" });
	}
});

/**
 * DELETE /api/users/:id
 * Delete a user
 * Requires authentication
 */
router.delete("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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
