import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeamModel, CreateTeamData, Team, TeamMembership } from '../../models/Team';
import { pool } from '../../database/connection';

// Mock the database pool
vi.mock('../../database/connection', () => ({
	pool: {
		query: vi.fn()
	}
}));

const mockPool = pool as any;

describe('TeamModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('create', () => {
		it('should create a new team with default values', async () => {
			const teamData: CreateTeamData = {
				name: 'Test Team',
				description: 'A test team'
			};

			const mockTeam: Team = {
				id: '123',
				name: teamData.name,
				description: teamData.description,
				velocity_baseline: 0,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_by: null,
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockTeam] });

			const result = await TeamModel.create(teamData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO teams'),
				[teamData.name, teamData.description, 0, 14, 5, null]
			);
			expect(result).toEqual(mockTeam);
		});

		it('should handle database errors', async () => {
			const teamData: CreateTeamData = {
				name: 'Test Team',
				description: 'A test team'
			};

			const dbError = new Error('Database connection failed');
			mockPool.query.mockRejectedValue(dbError);

			await expect(TeamModel.create(teamData)).rejects.toThrow('Database connection failed');
		});

		it('should create a team with custom values', async () => {
			const teamData: CreateTeamData = {
				name: 'Custom Team',
				velocity_baseline: 25,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_by: 'user123'
			};

			const mockTeam: Team = {
				id: '456',
				name: teamData.name,
				description: null,
				velocity_baseline: 25,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_by: 'user123',
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockTeam] });

			const result = await TeamModel.create(teamData);

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO teams'),
				[teamData.name, null, 25, 10, 4, 'user123']
			);
			expect(result).toEqual(mockTeam);
		});
	});

	describe('findById', () => {
		it('should find team by id', async () => {
			const mockTeam: Team = {
				id: '123',
				name: 'Test Team',
				description: 'A test team',
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_by: 'user123',
				created_at: new Date(),
				updated_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockTeam] });

			const result = await TeamModel.findById('123');

			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT * FROM teams WHERE id = $1',
				['123']
			);
			expect(result).toEqual(mockTeam);
		});

		it('should return null when team not found', async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await TeamModel.findById('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('addMember', () => {
		it('should add member to team', async () => {
			const mockMembership: TeamMembership = {
				id: '789',
				team_id: '123',
				user_id: '456',
				joined_at: new Date()
			};

			mockPool.query.mockResolvedValue({ rows: [mockMembership] });

			const result = await TeamModel.addMember('123', '456');

			expect(mockPool.query).toHaveBeenCalledWith(
				expect.stringContaining('INSERT INTO team_memberships'),
				['123', '456']
			);
			expect(result).toEqual(mockMembership);
		});
	});

	describe('removeMember', () => {
		it('should remove member from team', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 1 });

			const result = await TeamModel.removeMember('123', '456');

			expect(mockPool.query).toHaveBeenCalledWith(
				'DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2',
				['123', '456']
			);
			expect(result).toBe(true);
		});

		it('should return false when membership not found', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 0 });

			const result = await TeamModel.removeMember('123', '456');

			expect(result).toBe(false);
		});
	});

	describe('isMember', () => {
		it('should return true when user is member', async () => {
			mockPool.query.mockResolvedValue({ rows: [{ team_id: '123' }] });

			const result = await TeamModel.isMember('123', '456');

			expect(mockPool.query).toHaveBeenCalledWith(
				'SELECT 1 FROM team_memberships WHERE team_id = $1 AND user_id = $2',
				['123', '456']
			);
			expect(result).toBe(true);
		});

		it('should return false when user is not member', async () => {
			mockPool.query.mockResolvedValue({ rows: [] });

			const result = await TeamModel.isMember('123', '456');

			expect(result).toBe(false);
		});
	});

	describe('delete', () => {
		it('should delete team successfully', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 1 });

			const result = await TeamModel.delete('123');

			expect(mockPool.query).toHaveBeenCalledWith(
				'DELETE FROM teams WHERE id = $1',
				['123']
			);
			expect(result).toBe(true);
		});

		it('should return false when team not found', async () => {
			mockPool.query.mockResolvedValue({ rowCount: 0 });

			const result = await TeamModel.delete('nonexistent');

			expect(result).toBe(false);
		});

		it('should handle null rowCount', async () => {
			mockPool.query.mockResolvedValue({ rowCount: null });

			const result = await TeamModel.delete('123');

			expect(result).toBe(false);
		});
	});
});