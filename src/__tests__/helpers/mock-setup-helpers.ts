/**
 * Shared mock setup helpers for consistent testing patterns
 */
import { vi, expect, type Mock } from "vitest";
import type { User } from "../../models/User";
import type { Team } from "../../models/Team";
import type { CalendarEntry } from "../../models/CalendarEntry";

/**
 * Type-safe mock definitions for better testing
 */
export type MockedDatabasePool = {
	query: Mock;
};

export type MockedUserModel = {
	findAll: Mock;
	findById: Mock;
	findByEmail: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
};

export type MockedTeamModel = {
	findAll: Mock;
	findById: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	getMembers: Mock;
	addMember: Mock;
	removeMember: Mock;
};

export type MockedCalendarEntryModel = {
	findAll: Mock;
	findById: Mock;
	findByUser: Mock;
	findByTeam: Mock;
	findByDateRange: Mock;
	create: Mock;
	update: Mock;
	delete: Mock;
	findConflicts: Mock;
	calculateWorkingDaysImpact: Mock;
};

export class MockSetupHelpers {
	/**
	 * Setup database connection pool mocks
	 */
	static setupDatabaseMocks(): MockedDatabasePool {
		const mockPool = {
			query: vi.fn()
		} as MockedDatabasePool;

		return mockPool;
	}

	/**
	 * Database mock helpers for common scenarios
	 */
	static createDatabaseHelpers(mockPool: MockedDatabasePool): {
		mockSuccessfulQuery: (returnValue: unknown) => void;
		mockFailedQuery: (error?: Error) => void;
		mockEmptyQuery: () => void;
		mockDeleteSuccess: (rowCount?: number) => void;
		mockDeleteFailure: () => void;
		resetDatabaseMocks: () => void;
	} {
		return {
			/**
			 * Mock successful database query with return data
			 */
			mockSuccessfulQuery: (returnValue: unknown): void => {
				const rows = Array.isArray(returnValue) ? returnValue : [returnValue];
				mockPool.query.mockResolvedValue({
					rows,
					rowCount: rows.length
				});
			},

			/**
			 * Mock failed database query with error
			 */
			mockFailedQuery: (error: Error = new Error("Database connection failed")): void => {
				mockPool.query.mockRejectedValue(error);
			},

			/**
			 * Mock empty database query result
			 */
			mockEmptyQuery: (): void => {
				mockPool.query.mockResolvedValue({
					rows: [],
					rowCount: 0
				});
			},

			/**
			 * Mock successful delete operation
			 */
			mockDeleteSuccess: (rowCount: number = 1): void => {
				mockPool.query.mockResolvedValue({
					rows: [],
					rowCount
				});
			},

			/**
			 * Mock failed delete operation (no rows affected)
			 */
			mockDeleteFailure: (): void => {
				mockPool.query.mockResolvedValue({
					rows: [],
					rowCount: 0
				});
			},

			/**
			 * Reset all database mocks
			 */
			resetDatabaseMocks: (): void => {
				mockPool.query.mockReset();
			}
		};
	}

	/**
	 * Setup User model mocks with type safety
	 */
	static setupUserModelMocks(): MockedUserModel {
		return {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByEmail: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn()
		};
	}

	/**
	 * Setup Team model mocks with type safety
	 */
	static setupTeamModelMocks(): MockedTeamModel {
		return {
			findAll: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getMembers: vi.fn(),
			addMember: vi.fn(),
			removeMember: vi.fn()
		};
	}

	/**
	 * Setup CalendarEntry model mocks with type safety
	 */
	static setupCalendarEntryModelMocks(): MockedCalendarEntryModel {
		return {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByUser: vi.fn(),
			findByTeam: vi.fn(),
			findByDateRange: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			findConflicts: vi.fn(),
			calculateWorkingDaysImpact: vi.fn()
		};
	}

	/**
	 * Setup Express app mocks for API testing
	 */
	static setupExpressMocks(): Record<string, unknown> {
		const mockRequest = {
			body: {},
			params: {},
			query: {},
			headers: {}
		};

		const mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			setHeader: vi.fn().mockReturnThis()
		};

		const mockNext = vi.fn();

		return { mockRequest, mockResponse, mockNext };
	}

	/**
	 * Standard mock configurations for different test scenarios
	 */
	static getStandardMockConfigs(): Record<string, unknown> {
		return {
			/**
			 * Configuration for successful operations
			 */
			success: {
				user: {
					findAll: [] as User[],
					findById: null as User | null,
					create: null as User | null,
					update: null as User | null,
					delete: true
				},
				team: {
					findAll: [] as Team[],
					findById: null as Team | null,
					create: null as Team | null,
					update: null as Team | null,
					delete: true
				},
				calendarEntry: {
					findAll: [] as CalendarEntry[],
					findById: null as CalendarEntry | null,
					create: null as CalendarEntry | null,
					update: null as CalendarEntry | null,
					delete: true
				}
			},

			/**
			 * Configuration for error scenarios
			 */
			error: {
				database: new Error("Database connection failed"),
				validation: new Error("Validation failed"),
				notFound: new Error("Resource not found"),
				unauthorized: new Error("Unauthorized access"),
				conflict: new Error("Resource conflict"),
				network: new Error("Network connection failed"),
				timeout: new Error("Operation timed out"),
				businessRule: new Error("Business rule violation"),
				security: new Error("Security violation"),
				malformedData: new Error("Malformed data"),
				duplicateKey: new Error("Duplicate key violation"),
				foreignKey: new Error("Foreign key constraint failed"),
				outOfRange: new Error("Value out of acceptable range"),
				invalidState: new Error("Invalid operation state"),
				rateLimited: new Error("Rate limit exceeded")
			}
		};
	}

	/**
	 * Apply standard mock configurations
	 */
	/* eslint-disable @typescript-eslint/no-explicit-any */
	static applyMockConfiguration<T extends Record<string, Mock>>(mocks: T, config: Record<keyof T, any>): void {
		Object.keys(config).forEach(key => {
			const mockKey = key as keyof T;
			if (mocks[mockKey] && typeof mocks[mockKey].mockResolvedValue === "function") {
				mocks[mockKey].mockResolvedValue(config[mockKey]);
			}
		});
	}

	/**
	 * Setup complete test environment with all mocks
	 */
	static setupCompleteTestEnvironment(): {
		database: {
			mocks: MockedDatabasePool;
			helpers: {
				mockSuccessfulQuery: (returnValue: unknown) => void;
				mockFailedQuery: (error?: Error) => void;
				mockEmptyQuery: () => void;
				mockDeleteSuccess: (rowCount?: number) => void;
				mockDeleteFailure: () => void;
				resetDatabaseMocks: () => void;
			};
		};
		models: {
			user: MockedUserModel;
			team: MockedTeamModel;
			calendar: MockedCalendarEntryModel;
		};
		express: Record<string, unknown>;
		configs: Record<string, unknown>;
		applyConfig: typeof MockSetupHelpers.applyMockConfiguration;
		resetAll: () => void;
	} {
		const databaseMocks = this.setupDatabaseMocks();
		const databaseHelpers = this.createDatabaseHelpers(databaseMocks);
		const userMocks = this.setupUserModelMocks();
		const teamMocks = this.setupTeamModelMocks();
		const calendarMocks = this.setupCalendarEntryModelMocks();
		const expressMocks = this.setupExpressMocks();
		const configs = this.getStandardMockConfigs();

		return {
			database: {
				mocks: databaseMocks,
				helpers: databaseHelpers
			},
			models: {
				user: userMocks,
				team: teamMocks,
				calendar: calendarMocks
			},
			express: expressMocks,
			configs,
			applyConfig: this.applyMockConfiguration.bind(this),

			/**
			 * Reset all mocks in the environment
			 */
			resetAll: (): void => {
				vi.clearAllMocks();
				databaseHelpers.resetDatabaseMocks();
			}
		};
	}

	/**
	 * Get common error scenarios for consistent error testing
	 */
	static getCommonErrors(): Record<string, unknown> {
		const configs = this.getStandardMockConfigs();
		return {
			...(configs.error as Record<string, unknown>),

			/**
			 * Create contextual database errors
			 */
			createDatabaseError: (operation: string): Error =>
				new Error(`Database connection failed during ${operation}`),

			/**
			 * Create validation errors with field context
			 */
			createValidationError: (field: string, reason: string): Error & { field: string } => {
				const error = new Error(`Validation failed: ${reason}`) as Error & { field: string };
				error.field = field;
				return error;
			},

			/**
			 * Create business rule errors
			 */
			createBusinessRuleError: (rule: string): Error => new Error(`Business rule violation: ${rule}`),

			/**
			 * Create security errors with context
			 */
			createSecurityError: (context: string) => new Error(`Security violation: ${context}`),

			/**
			 * Create not found errors for specific resources
			 */
			createNotFoundError: (resource: string, id: string) => new Error(`${resource} with id ${id} not found`),

			/**
			 * Create conflict errors for specific resources
			 */
			createConflictError: (resource: string, reason: string) => new Error(`${resource} conflict: ${reason}`)
		};
	}

	/**
	 * Common mock scenarios for quick setup
	 */
	static createCommonScenarios(): {
		userCreationSuccess: (mockUser: MockedUserModel, userData: unknown, createdUser: User) => void;
		userCreationEmailConflict: (mockUser: MockedUserModel, existingUser: User) => void;
		teamCreationSuccess: (mockTeam: MockedTeamModel, teamData: unknown, createdTeam: Team) => void;
		calendarEntryCreationSuccess: (
			mockCalendar: MockedCalendarEntryModel,
			entryData: unknown,
			createdEntry: CalendarEntry
		) => void;
		calendarEntryConflict: (mockCalendar: MockedCalendarEntryModel, conflictingEntries: CalendarEntry[]) => void;
	} {
		return {
			/**
			 * Setup mocks for successful user creation flow
			 */
			userCreationSuccess: (mockUser: MockedUserModel, _userData: unknown, createdUser: User): void => {
				mockUser.findByEmail.mockResolvedValue(null); // Email doesn't exist
				mockUser.create.mockResolvedValue(createdUser);
			},

			/**
			 * Setup mocks for user creation with email conflict
			 */
			userCreationEmailConflict: (mockUser: MockedUserModel, existingUser: User): void => {
				mockUser.findByEmail.mockResolvedValue(existingUser);
			},

			/**
			 * Setup mocks for successful team creation flow
			 */
			teamCreationSuccess: (mockTeam: MockedTeamModel, _teamData: unknown, createdTeam: Team): void => {
				mockTeam.create.mockResolvedValue(createdTeam);
			},

			/**
			 * Setup mocks for calendar entry creation with conflict checking
			 */
			calendarEntryCreationSuccess: (
				mockCalendar: MockedCalendarEntryModel,
				_entryData: unknown,
				createdEntry: CalendarEntry
			): void => {
				mockCalendar.findConflicts.mockResolvedValue([]);
				mockCalendar.create.mockResolvedValue(createdEntry);
			},

			/**
			 * Setup mocks for calendar entry with conflicts
			 */
			calendarEntryConflict: (
				mockCalendar: MockedCalendarEntryModel,
				conflictingEntries: CalendarEntry[]
			): void => {
				mockCalendar.findConflicts.mockResolvedValue(conflictingEntries);
			}
		};
	}
}

/**
 * Utility functions for mock verification
 */
export class MockVerificationHelpers {
	/**
	 * Verify that a mock was called with specific SQL pattern
	 */
	/* eslint-disable @typescript-eslint/no-explicit-any */
	static verifyDatabaseCall(mockQuery: Mock, expectedSqlPattern: string | RegExp, expectedParams?: any[]): void {
		const calls = mockQuery.mock.calls;
		const matchingCall = calls.find(call => {
			const sql = call[0] as string;
			if (typeof expectedSqlPattern === "string") {
				return sql.includes(expectedSqlPattern);
			} else {
				return expectedSqlPattern.test(sql);
			}
		});

		expect(matchingCall).toBeDefined();

		if (expectedParams && matchingCall) {
			expect(matchingCall[1]).toEqual(expectedParams);
		}
	}

	/**
	 * Verify mock call sequence for complex operations
	 */
	static verifyCallSequence(mocks: Mock[], expectedCallCounts: number[]): void {
		expect(mocks.length).toBe(expectedCallCounts.length);

		mocks.forEach((mock, index) => {
			const expectedCount = expectedCallCounts[index];
			if (expectedCount !== undefined) {
				expect(mock).toHaveBeenCalledTimes(expectedCount);
			}
		});
	}

	/**
	 * Verify no unauthorized calls were made
	 */
	static verifyNoUnauthorizedCalls(mocks: Mock[]): void {
		mocks.forEach(mock => {
			expect(mock).not.toHaveBeenCalled();
		});
	}
}
