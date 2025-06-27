import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
	try {
		const users = await UserModel.findAll();
		// Remove password hashes from response
		const sanitizedUsers = users.map(user => {
			const { password_hash, ...userWithoutPassword } = user;
			return userWithoutPassword;
		});
		res.json(sanitizedUsers);
	} catch (error) {
		console.error('Error fetching users:', error);
		res.status(500).json({ message: 'Failed to fetch users' });
	}
});

/**
 * GET /api/users/:id
 * Get a specific user
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'User ID is required' });
			return;
		}
		
		const user = await UserModel.findById(id);
		
		if (!user) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		
		// Remove password hash from response
		const { password_hash, ...userWithoutPassword } = user;
		res.json(userWithoutPassword);
	} catch (error) {
		console.error('Error fetching user:', error);
		res.status(500).json({ message: 'Failed to fetch user' });
	}
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password, first_name, last_name, role } = req.body;
		
		// Basic validation
		if (!email || !password) {
			res.status(400).json({ message: 'Email and password are required' });
			return;
		}
		
		// Check if email already exists
		const existingEmail = await UserModel.findByEmail(email);
		if (existingEmail) {
			res.status(409).json({ message: 'Email already in use' });
			return;
		}
		
		// Hash password
		const saltRounds = 10;
		const password_hash = await bcrypt.hash(password, saltRounds);
		
		const user = await UserModel.create({
			email,
			password_hash,
			first_name: first_name || '',
			last_name: last_name || '',
			role: role || 'team_member'
		});
		
		// Remove password hash from response
		const { password_hash: _, ...userWithoutPassword } = user;
		res.status(201).json(userWithoutPassword);
	} catch (error) {
		console.error('Error creating user:', error);
		res.status(500).json({ message: 'Failed to create user' });
	}
});

/**
 * PUT /api/users/:id
 * Update a user
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'User ID is required' });
			return;
		}
		
		const { email, first_name, last_name, role, password } = req.body;
		
		// Check if user exists
		const existingUser = await UserModel.findById(id);
		if (!existingUser) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		
		// Prepare update data
		const updateData: any = {
			email: email || existingUser.email,
			first_name: first_name !== undefined ? first_name : existingUser.first_name,
			last_name: last_name !== undefined ? last_name : existingUser.last_name,
			role: role || existingUser.role
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
				res.status(409).json({ message: 'Email already in use' });
			return;
			}
		}
		
		const updated = await UserModel.update(id, updateData);
		
		if (!updated) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		
		// Remove password hash from response
		const { password_hash, ...userWithoutPassword } = updated;
		res.json(userWithoutPassword);
	} catch (error) {
		console.error('Error updating user:', error);
		res.status(500).json({ message: 'Failed to update user' });
	}
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: 'User ID is required' });
			return;
		}
		
		const deleted = await UserModel.delete(id);
		
		if (!deleted) {
			res.status(404).json({ message: 'User not found' });
			return;
		}
		
		res.status(204).send();
	} catch (error) {
		console.error('Error deleting user:', error);
		res.status(500).json({ message: 'Failed to delete user' });
	}
});

export default router;