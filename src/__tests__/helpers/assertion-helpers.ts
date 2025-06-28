/**
 * Shared assertion helpers for consistent testing patterns
 */
import { expect, type Mock } from "vitest";

// Type definitions for test assertions
interface ApiResponse {
	status: number;
	body: Record<string, unknown>;
}

interface EntityWithTimestamps {
	created_at: string | Date;
	updated_at: string | Date;
}

interface UserResponse extends EntityWithTimestamps {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

interface TeamResponse extends EntityWithTimestamps {
	id: string;
	name: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

interface CalendarEntryResponse extends EntityWithTimestamps {
	id: string;
	user_id: string;
	team_id: string;
	entry_type: string;
	title: string;
	start_date: string | Date;
	end_date: string | Date;
	all_day: boolean;
}

interface SessionResponse extends EntityWithTimestamps {
	id: string;
	user_id: string;
	session_token: string;
	expires_at: string | Date;
	is_active: boolean;
	ip_address?: string;
	user_agent?: string;
}

interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		total: number;
		page: number;
		limit: number;
	};
}

interface ValidationError {
	field: string;
	message: string;
}

export class AssertionHelpers {
	/**
	 * Standardized async error testing
	 */
	static async expectAsyncError(promise: Promise<unknown>, expectedMessage: string): Promise<void> {
		await expect(promise).rejects.toThrow(expectedMessage);
	}

	/**
	 * Standardized synchronous error testing
	 */
	static expectSyncError(fn: () => void, expectedError: string | RegExp | Error): void {
		expect(fn).toThrow(expectedError);
	}

	/**
	 * Standardized user response validation (without password hash)
	 */
	static expectUserResponse(actual: UserResponse, expected: Partial<UserResponse>): void {
		expect(actual).not.toHaveProperty("password_hash");
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
	}

	/**
	 * Standardized team response validation
	 */
	static expectTeamResponse(actual: TeamResponse, expected: Partial<TeamResponse>): void {
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
	}

	/**
	 * Standardized calendar entry response validation
	 */
	static expectCalendarEntryResponse(actual: CalendarEntryResponse, expected: Partial<CalendarEntryResponse>): void {
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
		expect(actual.start_date).toEqual(expect.any(String));
		expect(actual.end_date).toEqual(expect.any(String));
	}

	/**
	 * Standardized database query verification
	 */
	static expectDatabaseCall(mockQuery: Mock, expectedSql: string, expectedParams: unknown[]): void {
		expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining(expectedSql), expectedParams);
	}

	/**
	 * Standardized database query verification with regex
	 */
	static expectDatabaseCallWithPattern(mockQuery: Mock, sqlPattern: RegExp, expectedParams: unknown[]): void {
		expect(mockQuery).toHaveBeenCalledWith(expect.stringMatching(sqlPattern), expectedParams);
	}

	/**
	 * Standardized API success response validation
	 */
	static expectApiSuccess(
		response: ApiResponse,
		expectedStatus: number,
		expectedData?: Record<string, unknown>
	): void {
		expect(response.status).toBe(expectedStatus);
		if (expectedData) {
			expect(response.body).toMatchObject(expectedData);
		}
	}

	/**
	 * Standardized API error response validation
	 */
	static expectApiError(response: ApiResponse, expectedStatus: number, expectedMessage: string): void {
		expect(response.status).toBe(expectedStatus);
		expect(response.body).toHaveProperty("message");
		const responseBody = response.body as { message: string };
		expect(responseBody.message).toBe(expectedMessage);
	}

	/**
	 * Standardized array response validation
	 */
	static expectArrayResponse(
		actual: unknown[],
		expectedLength: number,
		elementValidator?: (element: unknown) => void
	): void {
		expect(actual).toHaveLength(expectedLength);
		if (elementValidator) {
			actual.forEach(elementValidator);
		}
	}

	/**
	 * Standardized empty response validation
	 */
	static expectEmptyResponse(actual: unknown[]): void {
		expect(actual).toHaveLength(0);
		expect(Array.isArray(actual)).toBe(true);
	}

	/**
	 * Standardized pagination response validation
	 */
	static expectPaginatedResponse<T>(
		response: PaginatedResponse<T>,
		expectedTotal: number,
		expectedPage: number,
		expectedLimit: number
	): void {
		expect(response).toHaveProperty("data");
		expect(response).toHaveProperty("pagination");
		expect(response.pagination.total).toBe(expectedTotal);
		expect(response.pagination.page).toBe(expectedPage);
		expect(response.pagination.limit).toBe(expectedLimit);
	}

	/**
	 * Standardized mock call verification
	 */
	static expectMockCalled(mock: Mock, expectedTimes: number = 1): void {
		expect(mock).toHaveBeenCalledTimes(expectedTimes);
	}

	/**
	 * Standardized mock call with parameters verification
	 */
	static expectMockCalledWith(mock: Mock, ...expectedArgs: unknown[]): void {
		expect(mock).toHaveBeenCalledWith(...expectedArgs);
	}

	/**
	 * Standardized mock not called verification
	 */
	static expectMockNotCalled(mock: Mock): void {
		expect(mock).not.toHaveBeenCalled();
	}

	/**
	 * Standardized date field validation (handles both Date objects and string dates)
	 */
	static expectValidDateFields(entity: EntityWithTimestamps): void {
		// Accept either Date objects (from models) or strings (from API)
		if (entity.created_at instanceof Date) {
			expect(entity.created_at).toBeInstanceOf(Date);
			expect(entity.updated_at).toBeInstanceOf(Date);
		} else {
			expect(entity.created_at).toEqual(expect.any(String));
			expect(entity.updated_at).toEqual(expect.any(String));

			// Validate that string dates can be parsed
			expect(new Date(entity.created_at)).toBeInstanceOf(Date);
			expect(new Date(entity.updated_at)).toBeInstanceOf(Date);
		}
	}

	/**
	 * Standardized ID field validation
	 */
	static expectValidId(id: unknown): void {
		expect(typeof id).toBe("string");
		expect((id as string).length).toBeGreaterThan(0);
	}

	/**
	 * Standardized email field validation
	 */
	static expectValidEmail(email: unknown): void {
		expect(typeof email).toBe("string");
		expect(email as string).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
	}

	/**
	 * Standardized security field validation (no sensitive data exposed)
	 */
	static expectNoSensitiveData(response: Record<string, unknown>): void {
		expect(response).not.toHaveProperty("password");
		expect(response).not.toHaveProperty("password_hash");
		expect(response).not.toHaveProperty("token");
		expect(response).not.toHaveProperty("secret");
	}

	/**
	 * Standardized object property validation
	 */
	static expectHasProperties(obj: Record<string, unknown>, properties: string[]): void {
		properties.forEach(prop => {
			expect(obj).toHaveProperty(prop);
		});
	}

	/**
	 * Standardized object property absence validation
	 */
	static expectMissingProperties(obj: Record<string, unknown>, properties: string[]): void {
		properties.forEach(prop => {
			expect(obj).not.toHaveProperty(prop);
		});
	}

	/**
	 * Standardized business rule validation
	 */
	static expectBusinessRuleValid(condition: boolean, errorMessage: string): void {
		if (!condition) {
			throw new Error(`Business rule violation: ${errorMessage}`);
		}
	}

	/**
	 * Standardized validation error testing
	 */
	static expectValidationError(error: ValidationError, expectedField?: string, expectedMessage?: string): void {
		expect(error).toHaveProperty("field");
		expect(error).toHaveProperty("message");

		if (expectedField) {
			expect(error.field).toBe(expectedField);
		}

		if (expectedMessage) {
			expect(error.message).toContain(expectedMessage);
		}
	}

	/**
	 * Standardized database error testing
	 */
	static async expectDatabaseError(promise: Promise<unknown>, context?: string): Promise<void> {
		const errorMessage = context ? `Database connection failed: ${context}` : "Database connection failed";
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized security error testing
	 */
	static async expectSecurityError(promise: Promise<unknown>, context?: string): Promise<void> {
		const errorMessage = context ? `Security violation: ${context}` : "Unauthorized access";
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized business rule error testing
	 */
	static async expectBusinessRuleError(promise: Promise<unknown>, rule: string): Promise<void> {
		const errorMessage = `Business rule violation: ${rule}`;
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized validation error response testing (for API)
	 */
	static expectValidationErrorResponse(
		response: ApiResponse,
		expectedField?: string,
		expectedMessage?: string
	): void {
		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("message");

		if (expectedField ?? expectedMessage) {
			expect(response.body).toHaveProperty("field");
			const responseBody = response.body as { field: string; message: string };
			if (expectedField) {
				expect(responseBody.field).toBe(expectedField);
			}
			if (expectedMessage) {
				expect(responseBody.message).toContain(expectedMessage);
			}
		}
	}

	/**
	 * Standardized conflict error response testing (for API)
	 */
	static expectConflictErrorResponse(response: ApiResponse, expectedMessage: string): void {
		expect(response.status).toBe(409);
		expect(response.body).toHaveProperty("message");
		const responseBody = response.body as { message: string };
		expect(responseBody.message).toBe(expectedMessage);
	}

	/**
	 * Standardized not found error response testing (for API)
	 */
	static expectNotFoundErrorResponse(response: ApiResponse, expectedMessage: string): void {
		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
		const responseBody = response.body as { message: string };
		expect(responseBody.message).toBe(expectedMessage);
	}

	/**
	 * Standardized server error response testing (for API)
	 */
	static expectServerErrorResponse(response: ApiResponse, expectedMessage?: string): void {
		expect(response.status).toBe(500);
		expect(response.body).toHaveProperty("message");
		if (expectedMessage) {
			const responseBody = response.body as { message: string };
			expect(responseBody.message).toBe(expectedMessage);
		}
	}

	/**
	 * Standardized partial message error testing
	 */
	static async expectAsyncErrorContaining(promise: Promise<unknown>, expectedMessagePart: string): Promise<void> {
		try {
			await promise;
			throw new Error(`Expected promise to reject with message containing "${expectedMessagePart}"`);
		} catch (error) {
			expect((error as Error).message).toContain(expectedMessagePart);
		}
	}

	/**
	 * Standardized error type testing
	 */
	static expectErrorType(error: unknown, expectedType: new (...args: unknown[]) => Error, context?: string): void {
		expect(error instanceof expectedType).toBe(true);
		if (context) {
			expect((error as Error).message).toContain(context);
		}
	}
}

/**
 * Specialized assertion helpers for different domains
 */
export class DomainAssertionHelpers extends AssertionHelpers {
	/**
	 * Calendar entry specific validations
	 */
	static expectValidCalendarEntry(entry: CalendarEntryResponse): void {
		this.expectHasProperties(entry, [
			"id",
			"user_id",
			"team_id",
			"entry_type",
			"title",
			"start_date",
			"end_date",
			"all_day"
		]);
		this.expectValidId(entry.id);
		this.expectValidDateFields(entry);

		// Validate entry type
		expect(["pto", "holiday", "sick", "personal"]).toContain(entry.entry_type);

		// Validate date order
		const startDate = new Date(entry.start_date);
		const endDate = new Date(entry.end_date);
		expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
	}

	/**
	 * Team specific validations
	 */
	static expectValidTeam(team: TeamResponse): void {
		this.expectHasProperties(team, [
			"id",
			"name",
			"velocity_baseline",
			"sprint_length_days",
			"working_days_per_week"
		]);
		this.expectValidId(team.id);
		this.expectValidDateFields(team);

		// Validate business rules
		expect(team.velocity_baseline).toBeGreaterThan(0);
		expect(team.sprint_length_days).toBeGreaterThan(0);
		expect(team.working_days_per_week).toBeGreaterThan(0);
		expect(team.working_days_per_week).toBeLessThanOrEqual(7);
	}

	/**
	 * User specific validations
	 */
	static expectValidUser(user: UserResponse): void {
		this.expectHasProperties(user, ["id", "email", "first_name", "last_name", "role"]);
		this.expectValidId(user.id);
		this.expectValidEmail(user.email);
		this.expectValidDateFields(user);

		// Validate role
		expect(["team_lead", "team_member"]).toContain(user.role);
	}

	/**
	 * Session specific validations
	 */
	static expectValidSession(session: SessionResponse): void {
		this.expectHasProperties(session, [
			"id",
			"user_id",
			"session_token",
			"created_at",
			"updated_at",
			"expires_at",
			"is_active"
		]);
		this.expectValidId(session.id);
		this.expectValidId(session.user_id);
		this.expectValidDateFields(session);

		// Validate session token format (64 character hex string)
		expect(session.session_token).toMatch(/^[a-f0-9]{64}$/);

		// Validate boolean fields
		expect(typeof session.is_active).toBe("boolean");

		// Validate expiration is in the future for active sessions
		if (session.is_active) {
			const expiresAt = new Date(session.expires_at);
			const createdAt = new Date(session.created_at);
			expect(expiresAt.getTime()).toBeGreaterThan(createdAt.getTime());
		}

		// Validate optional fields if present
		if (session.ip_address) {
			expect(typeof session.ip_address).toBe("string");
			expect(session.ip_address.length).toBeGreaterThan(0);
		}

		if (session.user_agent) {
			expect(typeof session.user_agent).toBe("string");
			expect(session.user_agent.length).toBeGreaterThan(0);
		}
	}
}
