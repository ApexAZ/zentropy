import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserModel, CreateUserData, User } from '../../models/User';
import { pool } from '../../database/connection';

// Mock the database pool
vi.mock('../../database/connection', () => ({
	pool: {
		query: vi.fn()
	}
}));

const mockPool = pool as any;

describe('UserModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('create', () => {
		it('should create a new user successfully', async () => {
			const userData: CreateUserData = {
				email: 'test@example.com',
				password_hash: 'hashedpassword',
				first_name: 'John',
				last_name: 'Doe',
				role: 'team_member'
			};

			const mockUser: User = {
				id: '123',
				...userData,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockUser] });

			const result = await UserModel.create(userData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO users'),
				[userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role]
			);
			expect(result).toEqual(mockUser);
		});

		it('should handle database errors', async () => {
			const userData: CreateUserData = {
				email: 'test@example.com',
				password_hash: 'hashedpassword',
				first_name: 'John',
				last_name: 'Doe',
				role: 'team_member'
			};

			const dbError = new Error('Database connection failed');
			mockPool.query.mockRejectedValue(dbError);

			await expect(UserModel.create(userData)).rejects.toThrow('Database connection failed');
		});
	});

	describe('findByEmail', () => {
		it('should find user by email', async () => {
			const mockUser: User = {
				id: '123',
				email: 'test@example.com',
				password_hash: 'hashedpassword',
				first_name: 'John',
				last_name: 'Doe',
				role: 'team_member',
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockUser] });

			const result = await UserModel.findByEmail('test@example.com');

			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT * FROM users WHERE email = $1',
				['test@example.com']
			);
			expect(result).toEqual(mockUser);
		});

		it('should return null when user not found', async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await UserModel.findByEmail('notfound@example.com');

			expect(result).toBeNull();
		});
	});

	describe('findById', () => {
		it('should find user by id', async () => {
			const mockUser: User = {
				id: '123',
				email: 'test@example.com',
				password_hash: 'hashedpassword',
				first_name: 'John',
				last_name: 'Doe',
				role: 'team_member',
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockUser] });

			const result = await UserModel.findById('123');

			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT * FROM users WHERE id = $1',
				['123']
			);
			expect(result).toEqual(mockUser);
		});

		it('should return null when user not found', async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await UserModel.findById('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('delete', () => {
		it('should delete user successfully', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 1 });

			const result = await UserModel.delete('123');

			expect(mockPool.query).toHaveBeenCalledWith(
				'DELETE FROM users WHERE id = $1',
				['123']
			);
			expect(result).toBe(true);
		});

		it('should return false when user not found', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 0 });

			const result = await UserModel.delete('nonexistent');

			expect(result).toBe(false);
		});

		it('should handle null rowCount', async () => {
			mockPool.query.mockResolvedValue({ rowCount: null });

			const result = await UserModel.delete('123');

			expect(result).toBe(false);
		});
	});

	describe('emailExists', () => {
		it('should return true when email exists', async () => {
			mockPool.query.mockResolvedValue({ rows: [{ id: '123' }] });

			const result = await UserModel.emailExists('test@example.com');

			expect(result).toBe(true);
		});

		it('should return false when email does not exist', async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await UserModel.emailExists('notfound@example.com');

			expect(result).toBe(false);
		});
	});
});