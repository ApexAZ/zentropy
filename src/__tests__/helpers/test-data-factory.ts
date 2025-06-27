/**
 * Simple test data factory for generating test objects
 */

export interface TestUser {
	id?: string;
	email: string;
	password_hash: string;
	role: 'team_lead' | 'team_member';
	created_at?: string;
	updated_at?: string;
}

export interface TestTeam {
	id?: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at?: string;
	updated_at?: string;
}

export interface TestCalendarEntry {
	id?: string;
	user_id: string;
	title: string;
	start_date: string;
	end_date: string;
	entry_type: 'pto' | 'holiday' | 'sick_leave' | 'other';
	status: 'pending' | 'approved' | 'rejected';
	created_at?: string;
	updated_at?: string;
}

export class TestDataFactory {
	static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
		return {
			email: 'test@example.com',
			password_hash: 'hashed_password_123',
			role: 'team_member',
			...overrides
		};
	}

	static createTestTeam(overrides: Partial<TestTeam> = {}): TestTeam {
		return {
			name: 'Test Team',
			description: 'A test team for unit testing',
			velocity_baseline: 25,
			sprint_length_days: 14,
			working_days_per_week: 5,
			...overrides
		};
	}

	static createTestCalendarEntry(overrides: Partial<TestCalendarEntry> = {}): TestCalendarEntry {
		const startDate = new Date('2024-03-15');
		const endDate = new Date('2024-03-17');
		
		return {
			user_id: 'test-user-id',
			title: 'Test PTO',
			start_date: startDate.toISOString().split('T')[0] as string,
			end_date: endDate.toISOString().split('T')[0] as string,
			entry_type: 'pto',
			status: 'approved',
			...overrides
		};
	}

	static createMultipleTestUsers(count: number): TestUser[] {
		return Array.from({ length: count }, (_, index) => 
			this.createTestUser({
				email: `test${index + 1}@example.com`
			})
		);
	}

	static createMultipleTestTeams(count: number): TestTeam[] {
		return Array.from({ length: count }, (_, index) => 
			this.createTestTeam({
				name: `Test Team ${index + 1}`
			})
		);
	}

	static createMultipleTestCalendarEntries(count: number, userId: string): TestCalendarEntry[] {
		return Array.from({ length: count }, (_, index) => {
			const baseDate = new Date('2024-03-01');
			baseDate.setDate(baseDate.getDate() + (index * 7)); // One week apart
			const endDate = new Date(baseDate);
			endDate.setDate(endDate.getDate() + 2); // 3-day entries
			
			return this.createTestCalendarEntry({
				user_id: userId,
				title: `Test Entry ${index + 1}`,
				start_date: baseDate.toISOString().split('T')[0] as string,
				end_date: endDate.toISOString().split('T')[0] as string
			});
		});
	}
}