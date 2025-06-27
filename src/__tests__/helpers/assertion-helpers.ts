/**
 * Shared assertion helpers for consistent testing patterns
 */
import { expect, type Mock } from "vitest";

export class AssertionHelpers {
	/**
	 * Standardized async error testing
	 */
	static async expectAsyncError(
		promise: Promise<any>,
		expectedMessage: string,
		context?: string
	): Promise<void> {
		await expect(promise).rejects.toThrow(expectedMessage);
	}

	/**
	 * Standardized synchronous error testing
	 */
	static expectSyncError(
		fn: () => void,
		expectedError: any,
		context?: string
	): void {
		expect(fn).toThrow(expectedError);
	}

	/**
	 * Standardized user response validation (without password hash)
	 */
	static expectUserResponse(actual: any, expected: Partial<any>): void {
		expect(actual).not.toHaveProperty("password_hash");
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
	}

	/**
	 * Standardized team response validation
	 */
	static expectTeamResponse(actual: any, expected: Partial<any>): void {
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
	}

	/**
	 * Standardized calendar entry response validation
	 */
	static expectCalendarEntryResponse(actual: any, expected: Partial<any>): void {
		expect(actual).toMatchObject(expected);
		expect(actual.created_at).toEqual(expect.any(String));
		expect(actual.updated_at).toEqual(expect.any(String));
		expect(actual.start_date).toEqual(expect.any(String));
		expect(actual.end_date).toEqual(expect.any(String));
	}

	/**
	 * Standardized database query verification
	 */
	static expectDatabaseCall(
		mockQuery: Mock,
		expectedSql: string,
		expectedParams: any[]
	): void {
		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringContaining(expectedSql),
			expectedParams
		);
	}

	/**
	 * Standardized database query verification with regex
	 */
	static expectDatabaseCallWithPattern(
		mockQuery: Mock,
		sqlPattern: RegExp,
		expectedParams: any[]
	): void {
		expect(mockQuery).toHaveBeenCalledWith(
			expect.stringMatching(sqlPattern),
			expectedParams
		);
	}

	/**
	 * Standardized API success response validation
	 */
	static expectApiSuccess(
		response: any,
		expectedStatus: number,
		expectedData?: any
	): void {
		expect(response.status).toBe(expectedStatus);
		if (expectedData) {
			expect(response.body).toMatchObject(expectedData);
		}
	}

	/**
	 * Standardized API error response validation
	 */
	static expectApiError(
		response: any,
		expectedStatus: number,
		expectedMessage: string
	): void {
		expect(response.status).toBe(expectedStatus);
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toBe(expectedMessage);
	}

	/**
	 * Standardized array response validation
	 */
	static expectArrayResponse(
		actual: any[],
		expectedLength: number,
		elementValidator?: (element: any) => void
	): void {
		expect(actual).toHaveLength(expectedLength);
		if (elementValidator) {
			actual.forEach(elementValidator);
		}
	}

	/**
	 * Standardized empty response validation
	 */
	static expectEmptyResponse(actual: any[]): void {
		expect(actual).toHaveLength(0);
		expect(Array.isArray(actual)).toBe(true);
	}

	/**
	 * Standardized pagination response validation
	 */
	static expectPaginatedResponse(
		response: any,
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
	static expectMockCalled(
		mock: Mock,
		expectedTimes: number = 1
	): void {
		expect(mock).toHaveBeenCalledTimes(expectedTimes);
	}

	/**
	 * Standardized mock call with parameters verification
	 */
	static expectMockCalledWith(
		mock: Mock,
		...expectedArgs: any[]
	): void {
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
	static expectValidDateFields(entity: any): void {
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
	static expectValidId(id: any): void {
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	}

	/**
	 * Standardized email field validation
	 */
	static expectValidEmail(email: any): void {
		expect(typeof email).toBe("string");
		expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
	}

	/**
	 * Standardized security field validation (no sensitive data exposed)
	 */
	static expectNoSensitiveData(response: any): void {
		expect(response).not.toHaveProperty("password");
		expect(response).not.toHaveProperty("password_hash");
		expect(response).not.toHaveProperty("token");
		expect(response).not.toHaveProperty("secret");
	}

	/**
	 * Standardized object property validation
	 */
	static expectHasProperties(obj: any, properties: string[]): void {
		properties.forEach(prop => {
			expect(obj).toHaveProperty(prop);
		});
	}

	/**
	 * Standardized object property absence validation
	 */
	static expectMissingProperties(obj: any, properties: string[]): void {
		properties.forEach(prop => {
			expect(obj).not.toHaveProperty(prop);
		});
	}

	/**
	 * Standardized business rule validation
	 */
	static expectBusinessRuleValid(
		condition: boolean,
		errorMessage: string
	): void {
		if (!condition) {
			throw new Error(`Business rule violation: ${errorMessage}`);
		}
	}

	/**
	 * Standardized validation error testing
	 */
	static expectValidationError(
		error: any,
		expectedField?: string,
		expectedMessage?: string
	): void {
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
	static async expectDatabaseError(
		promise: Promise<any>,
		context?: string
	): Promise<void> {
		const errorMessage = context 
			? `Database connection failed: ${context}`
			: "Database connection failed";
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized security error testing
	 */
	static async expectSecurityError(
		promise: Promise<any>,
		context?: string
	): Promise<void> {
		const errorMessage = context 
			? `Security violation: ${context}`
			: "Unauthorized access";
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized business rule error testing
	 */
	static async expectBusinessRuleError(
		promise: Promise<any>,
		rule: string
	): Promise<void> {
		const errorMessage = `Business rule violation: ${rule}`;
		await expect(promise).rejects.toThrow(errorMessage);
	}

	/**
	 * Standardized validation error response testing (for API)
	 */
	static expectValidationErrorResponse(
		response: any,
		expectedField?: string,
		expectedMessage?: string
	): void {
		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty("message");
		
		if (expectedField || expectedMessage) {
			expect(response.body).toHaveProperty("field");
			if (expectedField) {
				expect(response.body.field).toBe(expectedField);
			}
			if (expectedMessage) {
				expect(response.body.message).toContain(expectedMessage);
			}
		}
	}

	/**
	 * Standardized conflict error response testing (for API)
	 */
	static expectConflictErrorResponse(
		response: any,
		expectedMessage: string
	): void {
		expect(response.status).toBe(409);
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toBe(expectedMessage);
	}

	/**
	 * Standardized not found error response testing (for API)
	 */
	static expectNotFoundErrorResponse(
		response: any,
		expectedMessage: string
	): void {
		expect(response.status).toBe(404);
		expect(response.body).toHaveProperty("message");
		expect(response.body.message).toBe(expectedMessage);
	}

	/**
	 * Standardized server error response testing (for API)
	 */
	static expectServerErrorResponse(
		response: any,
		expectedMessage?: string
	): void {
		expect(response.status).toBe(500);
		expect(response.body).toHaveProperty("message");
		if (expectedMessage) {
			expect(response.body.message).toBe(expectedMessage);
		}
	}

	/**
	 * Standardized partial message error testing
	 */
	static async expectAsyncErrorContaining(
		promise: Promise<any>,
		expectedMessagePart: string
	): Promise<void> {
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
	static expectErrorType(
		error: any,
		expectedType: any,
		context?: string
	): void {
		expect(error instanceof expectedType).toBe(true);
		if (context) {
			expect(error.message).toContain(context);
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
	static expectValidCalendarEntry(entry: any): void {
		this.expectHasProperties(entry, [
			"id", "user_id", "team_id", "entry_type", 
			"title", "start_date", "end_date", "all_day"
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
	static expectValidTeam(team: any): void {
		this.expectHasProperties(team, [
			"id", "name", "velocity_baseline", 
			"sprint_length_days", "working_days_per_week"
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
	static expectValidUser(user: any): void {
		this.expectHasProperties(user, [
			"id", "email", "first_name", "last_name", "role"
		]);
		this.expectValidId(user.id);
		this.expectValidEmail(user.email);
		this.expectValidDateFields(user);
		
		// Validate role
		expect(["team_lead", "team_member"]).toContain(user.role);
	}
}