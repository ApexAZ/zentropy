/**
 * Centralized test data factory aligned with actual model interfaces
 */
import type { User, CreateUserData, UserRole } from "../../models/User";
import type { Team, CreateTeamData, TeamMembership } from "../../models/Team";
import type { CalendarEntry, CreateCalendarEntryData } from "../../models/CalendarEntry";
import type { Session, CreateSessionData } from "../../models/Session";

export class TestDataFactory {
	/**
	 * Create test user data matching the User interface
	 */
	static createTestUser(overrides: Partial<User> = {}): User {
		return {
			id: "test-user-" + Math.random().toString(36).substring(2, 11),
			email: "test@example.com",
			password_hash: "hashed_password_123",
			first_name: "Test",
			last_name: "User",
			role: "team_member" as UserRole,
			is_active: true,
			last_login_at: null,
			created_at: new Date("2024-01-01T00:00:00.000Z"),
			updated_at: new Date("2024-01-01T00:00:00.000Z"),
			...overrides
		};
	}

	/**
	 * Create test user creation data matching CreateUserData interface
	 */
	static createUserData(overrides: Partial<CreateUserData> = {}): CreateUserData {
		return {
			email: "test@example.com",
			password: "TestPassword123!",
			first_name: "Test",
			last_name: "User",
			role: "team_member" as UserRole,
			...overrides
		};
	}

	/**
	 * Create test team data matching the Team interface
	 */
	static createTestTeam(overrides: Partial<Team> = {}): Team {
		return {
			id: "test-team-" + Math.random().toString(36).substring(2, 11),
			name: "Test Team",
			description: "A test team for unit testing",
			velocity_baseline: 25,
			sprint_length_days: 14,
			working_days_per_week: 5,
			created_by: "test-user-123",
			created_at: new Date("2024-01-01T00:00:00.000Z"),
			updated_at: new Date("2024-01-01T00:00:00.000Z"),
			...overrides
		};
	}

	/**
	 * Create test team creation data matching CreateTeamData interface
	 */
	static createTeamData(overrides: Partial<CreateTeamData> = {}): CreateTeamData {
		return {
			name: "Test Team",
			description: "A test team for unit testing",
			velocity_baseline: 25,
			sprint_length_days: 14,
			working_days_per_week: 5,
			created_by: "test-user-123",
			...overrides
		};
	}

	/**
	 * Create test calendar entry matching the CalendarEntry interface
	 */
	static createTestCalendarEntry(overrides: Partial<CalendarEntry> = {}): CalendarEntry {
		return {
			id: "test-entry-" + Math.random().toString(36).substring(2, 11),
			user_id: "test-user-123",
			team_id: "test-team-123",
			entry_type: "pto",
			title: "Test PTO",
			description: "Test personal time off",
			start_date: new Date("2024-07-15T00:00:00.000Z"),
			end_date: new Date("2024-07-17T00:00:00.000Z"),
			all_day: true,
			created_at: new Date("2024-01-01T00:00:00.000Z"),
			updated_at: new Date("2024-01-01T00:00:00.000Z"),
			...overrides
		};
	}

	/**
	 * Create test calendar entry creation data matching CreateCalendarEntryData interface
	 */
	static createCalendarEntryData(overrides: Partial<CreateCalendarEntryData> = {}): CreateCalendarEntryData {
		return {
			user_id: "test-user-123",
			team_id: "test-team-123",
			entry_type: "pto",
			title: "Test PTO",
			description: "Test personal time off",
			start_date: new Date("2024-07-15T00:00:00.000Z"),
			end_date: new Date("2024-07-17T00:00:00.000Z"),
			all_day: true,
			...overrides
		};
	}

	/**
	 * Create test team membership data
	 */
	static createTestTeamMembership(overrides: Partial<TeamMembership> = {}): TeamMembership {
		return {
			id: "test-membership-" + Math.random().toString(36).substring(2, 11),
			team_id: "test-team-123",
			user_id: "test-user-123",
			joined_at: new Date("2024-01-01T00:00:00.000Z"),
			...overrides
		};
	}

	/**
	 * Create test session data matching the Session interface
	 */
	static createTestSession(overrides: Partial<Session> = {}): Session {
		const now = new Date("2024-01-01T00:00:00.000Z");
		const expires = new Date("2024-01-02T00:00:00.000Z"); // 24 hours later

		return {
			id: "test-session-" + Math.random().toString(36).substring(2, 11),
			user_id: "test-user-123",
			session_token: "a".repeat(64), // 64 character hex token
			ip_address: "127.0.0.1",
			user_agent: "Mozilla/5.0 Test Browser",
			created_at: now,
			updated_at: now,
			expires_at: expires,
			is_active: true,
			...overrides
		};
	}

	/**
	 * Create test session creation data matching CreateSessionData interface
	 */
	static createSessionData(overrides: Partial<CreateSessionData> = {}): CreateSessionData {
		return {
			user_id: "test-user-123",
			ip_address: "127.0.0.1",
			user_agent: "Mozilla/5.0 Test Browser",
			...overrides
		};
	}

	/**
	 * Create multiple test users with sequential data
	 */
	static createMultipleTestUsers(count: number, baseOverrides: Partial<User> = {}): User[] {
		return Array.from({ length: count }, (_, index) =>
			this.createTestUser({
				email: `test${index + 1}@example.com`,
				first_name: `Test${index + 1}`,
				...baseOverrides
			})
		);
	}

	/**
	 * Create multiple test teams with sequential data
	 */
	static createMultipleTestTeams(count: number, baseOverrides: Partial<Team> = {}): Team[] {
		return Array.from({ length: count }, (_, index) =>
			this.createTestTeam({
				name: `Test Team ${index + 1}`,
				...baseOverrides
			})
		);
	}

	/**
	 * Create multiple test calendar entries with sequential dates
	 */
	static createMultipleTestCalendarEntries(
		count: number,
		userId: string,
		teamId: string,
		baseOverrides: Partial<CalendarEntry> = {}
	): CalendarEntry[] {
		return Array.from({ length: count }, (_, index) => {
			const baseDate = new Date("2024-07-01T00:00:00.000Z");
			baseDate.setDate(baseDate.getDate() + index * 7); // One week apart
			const endDate = new Date(baseDate);
			endDate.setDate(endDate.getDate() + 2); // 3-day entries

			return this.createTestCalendarEntry({
				user_id: userId,
				team_id: teamId,
				title: `Test Entry ${index + 1}`,
				start_date: baseDate,
				end_date: endDate,
				...baseOverrides
			});
		});
	}

	/**
	 * Create consistent date range for testing
	 */
	static createDateRange(startOffset: number = 0, endOffset: number = 5): { startDate: Date; endDate: Date } {
		const baseDate = new Date("2024-07-01T00:00:00.000Z");
		const startDate = new Date(baseDate);
		startDate.setDate(startDate.getDate() + startOffset);
		const endDate = new Date(baseDate);
		endDate.setDate(endDate.getDate() + endOffset);

		return { startDate, endDate };
	}

	/**
	 * Create test data with secure defaults for security testing
	 */
	static createSecureTestData() {
		return {
			user: this.createTestUser({
				email: "secure.test@example.com",
				password_hash: "$2b$10$secure.hash.example.generated",
				is_active: true
			}),
			team: this.createTestTeam({
				name: "Secure Test Team",
				description: "Team for security testing"
			}),
			calendarEntry: this.createTestCalendarEntry({
				title: "Secure Test Entry",
				description: "Calendar entry for security testing"
			})
		};
	}
}

/**
 * Extended test data factory for model-specific tests
 */
export class ModelTestDataFactory extends TestDataFactory {
	/**
	 * Create minimal valid user data for testing required fields
	 */
	static createMinimalUserData(): CreateUserData {
		return {
			email: "minimal@example.com",
			password: "MinimalPassword123!",
			first_name: "Minimal",
			last_name: "User",
			role: "team_member" as UserRole
		};
	}

	/**
	 * Create minimal valid team data for testing required fields
	 */
	static createMinimalTeamData(): CreateTeamData {
		return {
			name: "Minimal Team"
		};
	}

	/**
	 * Create minimal valid calendar entry data for testing required fields
	 */
	static createMinimalCalendarEntryData(): CreateCalendarEntryData {
		return {
			user_id: "minimal-user",
			team_id: "minimal-team",
			entry_type: "pto",
			title: "Minimal Entry",
			start_date: new Date("2024-07-15T00:00:00.000Z"),
			end_date: new Date("2024-07-15T00:00:00.000Z")
		};
	}
}
