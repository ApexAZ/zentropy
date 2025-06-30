/**
 * API Client Core Module - Consolidated API Management System
 *
 * Consolidates functionality from:
 * - api-client.ts (authentication API client)
 * - team-invitation-api-client.ts (team invitation API operations)
 * - team-membership-api-client.ts (team membership API operations)
 * - user-search-api-client.ts (user search API operations)
 *
 * Provides unified, type-safe API client with consistent error handling
 * and request/response patterns across all endpoints
 */

import type { UserRole } from "../models/User.js";

// ========================
// CORE TYPE DEFINITIONS
// ========================

// Base interfaces for all API operations
export interface ApiRequestConfig extends RequestInit {
	url: string;
}

export interface ApiResponse<T = unknown> {
	data: T;
	status: number;
	statusText: string;
}

export interface ApiError {
	message: string;
	status?: number;
	field?: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

// ========================
// AUTHENTICATION TYPES
// ========================

export interface LoginRequestData {
	email: string;
	password: string;
}

export interface LoginResponse {
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: UserRole;
	};
	sessionId: string;
}

export interface SessionCheckResponse {
	isAuthenticated: boolean;
	user?: LoginResponse["user"];
}

// ========================
// TEAM INVITATION TYPES
// ========================

export interface SendInvitationData {
	teamId: string;
	userEmail: string;
	role: UserRole;
}

export interface InvitationResponseData {
	invitationId: string;
	action: "accept" | "decline";
}

export interface SendInvitationApiResponse {
	invitation: {
		id: string;
		team_id: string;
		user_email: string;
		role: UserRole;
		status: "pending";
		created_at: string;
	};
	message: string;
}

export interface InvitationResponseApiResponse {
	message: string;
	status: "accepted" | "declined";
}

// ========================
// TEAM MEMBERSHIP TYPES
// ========================

export interface AddMemberData {
	teamId: string;
	userId: string;
	role: UserRole;
}

export interface AddMemberApiResponse {
	membership: {
		id: string;
		team_id: string;
		user_id: string;
		role: UserRole;
		created_at: string;
	};
	message: string;
}

// ========================
// USER SEARCH TYPES
// ========================

export interface UserSearchParams {
	query: string;
	limit?: number;
	excludeTeamId?: string;
}

export interface UserSearchResponse {
	users: Array<{
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: UserRole;
		is_active: boolean;
		created_at: string;
		updated_at: string;
	}>;
	total: number;
}

// ========================
// API CLIENT CORE CLASS
// ========================

/**
 * ApiClientCore - Consolidated API Management System
 * Provides all API client functionality in a single containerized module
 */
export class ApiClientCore {
	private readonly baseUrl: string;

	constructor(baseUrl: string = "") {
		this.baseUrl = baseUrl;
	}

	// ========================
	// CORE HTTP UTILITIES
	// ========================

	/**
	 * Create base request configuration with common settings
	 */
	private createBaseRequestConfig(options: Partial<RequestInit> = {}): RequestInit {
		return {
			credentials: "include" as RequestCredentials,
			...options
		};
	}

	/**
	 * Create request configuration for JSON POST requests
	 */
	private createJsonPostRequest<T>(data: T): RequestInit {
		return this.createBaseRequestConfig({
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(data)
		});
	}

	/**
	 * Create request configuration for GET requests
	 */
	private createGetRequest(): RequestInit {
		return this.createBaseRequestConfig({
			method: "GET"
		});
	}

	/**
	 * Generic API response handler with type safety
	 */
	private async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

			try {
				const errorData = (await response.json()) as { message?: string; field?: string };
				if (errorData.message) {
					errorMessage = errorData.message;
				}
			} catch {
				// Use default error message if JSON parsing fails
			}

			throw new Error(errorMessage);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * Build URL with path segments
	 */
	private buildUrl(path: string): string {
		const cleanPath = path.startsWith("/") ? path.slice(1) : path;
		return this.baseUrl ? `${this.baseUrl}/${cleanPath}` : `/${cleanPath}`;
	}

	/**
	 * Build URL with query parameters
	 */
	private buildUrlWithQuery(path: string, params: Record<string, string | number | undefined>): string {
		const baseUrl = this.buildUrl(path);
		const searchParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				searchParams.append(key, String(value));
			}
		});

		const queryString = searchParams.toString();
		return queryString ? `${baseUrl}?${queryString}` : baseUrl;
	}

	// ========================
	// VALIDATION UTILITIES
	// ========================

	/**
	 * Validate common required fields
	 */
	private validateRequired(fields: Record<string, unknown>): ValidationResult {
		const errors: string[] = [];

		Object.entries(fields).forEach(([fieldName, value]) => {
			if (!value || (typeof value === "string" && value.trim() === "")) {
				errors.push(`${fieldName} is required`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Check for XSS attempts in string fields
	 */
	private validateNoXss(fields: Record<string, string>): ValidationResult {
		const errors: string[] = [];

		Object.entries(fields).forEach(([fieldName, value]) => {
			if (/<[^>]*>/g.test(value)) {
				errors.push(`${fieldName} contains invalid characters`);
			}
		});

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Validate email format
	 */
	private validateEmail(email: string): ValidationResult {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const isValid = emailRegex.test(email);

		return {
			isValid,
			errors: isValid ? [] : ["Invalid email format"]
		};
	}

	/**
	 * Validate user role
	 */
	private validateUserRole(role: UserRole): ValidationResult {
		const validRoles: UserRole[] = ["basic_user", "team_member", "team_lead"];
		const isValid = validRoles.includes(role);

		return {
			isValid,
			errors: isValid ? [] : ["Invalid user role"]
		};
	}

	// ========================
	// AUTHENTICATION API (from api-client)
	// ========================

	/**
	 * Create login request configuration
	 */
	createLoginRequest(data: LoginRequestData): ApiRequestConfig {
		return {
			url: this.buildUrl("api/users/login"),
			...this.createJsonPostRequest(data)
		};
	}

	/**
	 * Create session check request configuration
	 */
	createSessionCheckRequest(): ApiRequestConfig {
		return {
			url: this.buildUrl("api/users/session"),
			...this.createGetRequest()
		};
	}

	/**
	 * Handle API response with proper typing (public method)
	 */
	async handleApiResponse<T>(response: Response): Promise<T> {
		return this.handleResponse<T>(response);
	}

	/**
	 * Make login request
	 */
	async makeLoginRequest(data: LoginRequestData): Promise<LoginResponse> {
		try {
			const config = this.createLoginRequest(data);
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleResponse<LoginResponse>(response);
		} catch (error) {
			throw new Error(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	/**
	 * Make session check request
	 */
	async makeSessionCheckRequest(): Promise<SessionCheckResponse> {
		try {
			const config = this.createSessionCheckRequest();
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleResponse<SessionCheckResponse>(response);
		} catch (error) {
			throw new Error(`Session check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// ========================
	// TEAM INVITATION API (from team-invitation-api-client)
	// ========================

	/**
	 * Build invitation URL
	 */
	buildInvitationUrl(teamId: string): string {
		return this.buildUrl(`api/teams/${teamId}/invitations`);
	}

	/**
	 * Build invitation response URL
	 */
	buildInvitationResponseUrl(invitationId: string): string {
		return this.buildUrl(`api/invitations/${invitationId}/respond`);
	}

	/**
	 * Create send invitation request configuration
	 */
	createSendInvitationRequest(data: SendInvitationData): ApiRequestConfig {
		return {
			url: this.buildInvitationUrl(data.teamId),
			...this.createJsonPostRequest({
				user_email: data.userEmail,
				role: data.role
			})
		};
	}

	/**
	 * Create invitation response request configuration
	 */
	createInvitationResponseRequest(data: InvitationResponseData): ApiRequestConfig {
		return {
			url: this.buildInvitationResponseUrl(data.invitationId),
			...this.createJsonPostRequest({
				action: data.action
			})
		};
	}

	/**
	 * Handle invitation API response
	 */
	async handleInvitationApiResponse<T>(response: Response): Promise<T> {
		return this.handleResponse<T>(response);
	}

	/**
	 * Validate invitation API parameters
	 */
	validateInvitationApiParams(data: SendInvitationData): ValidationResult {
		// Check required fields
		const requiredValidation = this.validateRequired({
			teamId: data.teamId,
			userEmail: data.userEmail,
			role: data.role
		});

		if (!requiredValidation.isValid) {
			return requiredValidation;
		}

		// Check XSS
		const xssValidation = this.validateNoXss({
			teamId: data.teamId,
			userEmail: data.userEmail
		});

		if (!xssValidation.isValid) {
			return xssValidation;
		}

		// Check email format
		const emailValidation = this.validateEmail(data.userEmail);
		if (!emailValidation.isValid) {
			return emailValidation;
		}

		// Check role
		const roleValidation = this.validateUserRole(data.role);
		if (!roleValidation.isValid) {
			return roleValidation;
		}

		return { isValid: true, errors: [] };
	}

	/**
	 * Validate invitation response parameters
	 */
	validateInvitationResponseParams(data: InvitationResponseData): ValidationResult {
		const requiredValidation = this.validateRequired({
			invitationId: data.invitationId,
			action: data.action
		});

		if (!requiredValidation.isValid) {
			return requiredValidation;
		}

		const xssValidation = this.validateNoXss({
			invitationId: data.invitationId
		});

		if (!xssValidation.isValid) {
			return xssValidation;
		}

		const validActions = ["accept", "decline"] as const;
		if (!validActions.includes(data.action)) {
			return {
				isValid: false,
				errors: ['Invalid action. Must be "accept" or "decline"']
			};
		}

		return { isValid: true, errors: [] };
	}

	/**
	 * Make send invitation request
	 */
	async makeSendInvitationRequest(data: SendInvitationData): Promise<SendInvitationApiResponse> {
		const validation = this.validateInvitationApiParams(data);
		if (!validation.isValid) {
			throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
		}

		try {
			const config = this.createSendInvitationRequest(data);
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleInvitationApiResponse<SendInvitationApiResponse>(response);
		} catch (error) {
			throw new Error(`Send invitation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	/**
	 * Make invitation response request
	 */
	async makeInvitationResponseRequest(data: InvitationResponseData): Promise<InvitationResponseApiResponse> {
		const validation = this.validateInvitationResponseParams(data);
		if (!validation.isValid) {
			throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
		}

		try {
			const config = this.createInvitationResponseRequest(data);
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleInvitationApiResponse<InvitationResponseApiResponse>(response);
		} catch (error) {
			throw new Error(`Invitation response failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// ========================
	// TEAM MEMBERSHIP API (from team-membership-api-client)
	// ========================

	/**
	 * Build add member URL
	 */
	buildAddMemberUrl(teamId: string): string {
		return this.buildUrl(`api/teams/${teamId}/members`);
	}

	/**
	 * Create add member request configuration
	 */
	createAddMemberRequest(data: AddMemberData): ApiRequestConfig {
		return {
			url: this.buildAddMemberUrl(data.teamId),
			...this.createJsonPostRequest({
				user_id: data.userId,
				role: data.role
			})
		};
	}

	/**
	 * Handle add member response
	 */
	async handleAddMemberResponse(response: Response): Promise<AddMemberApiResponse> {
		return this.handleResponse<AddMemberApiResponse>(response);
	}

	/**
	 * Validate add member parameters
	 */
	validateAddMemberParams(data: AddMemberData): ValidationResult {
		const requiredValidation = this.validateRequired({
			teamId: data.teamId,
			userId: data.userId,
			role: data.role
		});

		if (!requiredValidation.isValid) {
			return requiredValidation;
		}

		const xssValidation = this.validateNoXss({
			teamId: data.teamId,
			userId: data.userId
		});

		if (!xssValidation.isValid) {
			return xssValidation;
		}

		const roleValidation = this.validateUserRole(data.role);
		if (!roleValidation.isValid) {
			return roleValidation;
		}

		return { isValid: true, errors: [] };
	}

	/**
	 * Make add member request
	 */
	async makeAddMemberRequest(data: AddMemberData): Promise<AddMemberApiResponse> {
		const validation = this.validateAddMemberParams(data);
		if (!validation.isValid) {
			throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
		}

		try {
			const config = this.createAddMemberRequest(data);
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleAddMemberResponse(response);
		} catch (error) {
			throw new Error(`Add member failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}

	// ========================
	// USER SEARCH API (from user-search-api-client)
	// ========================

	/**
	 * Build user search URL with query parameters
	 */
	buildUserSearchUrl(params: UserSearchParams): string {
		return this.buildUrlWithQuery("api/users/search", {
			q: params.query,
			limit: params.limit,
			excludeTeamId: params.excludeTeamId
		});
	}

	/**
	 * Create user search request configuration
	 */
	createUserSearchRequest(params: UserSearchParams): ApiRequestConfig {
		return {
			url: this.buildUserSearchUrl(params),
			...this.createGetRequest()
		};
	}

	/**
	 * Handle user search response
	 */
	async handleUserSearchResponse(response: Response): Promise<UserSearchResponse> {
		return this.handleResponse<UserSearchResponse>(response);
	}

	/**
	 * Make user search request
	 */
	async makeUserSearchRequest(params: UserSearchParams): Promise<UserSearchResponse> {
		if (!params.query || params.query.trim().length < 2) {
			return { users: [], total: 0 };
		}

		try {
			const config = this.createUserSearchRequest(params);
			const { url, ...requestInit } = config;
			const response = await fetch(url, requestInit);
			return await this.handleUserSearchResponse(response);
		} catch (error) {
			throw new Error(`User search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
		}
	}
}

// Export singleton instance for consistent usage across the application
export const apiClientCore = new ApiClientCore();

// Export individual functions for backward compatibility during migration
export const createLoginRequest = (data: LoginRequestData): ApiRequestConfig => apiClientCore.createLoginRequest(data);
export const createSessionCheckRequest = (): ApiRequestConfig => apiClientCore.createSessionCheckRequest();
export const handleApiResponse = <T>(response: Response): Promise<T> => apiClientCore.handleApiResponse<T>(response);
export const makeLoginRequest = (data: LoginRequestData): Promise<LoginResponse> =>
	apiClientCore.makeLoginRequest(data);
export const makeSessionCheckRequest = (): Promise<SessionCheckResponse> => apiClientCore.makeSessionCheckRequest();

export const buildInvitationUrl = (teamId: string): string => apiClientCore.buildInvitationUrl(teamId);
export const buildInvitationResponseUrl = (invitationId: string): string =>
	apiClientCore.buildInvitationResponseUrl(invitationId);
export const createSendInvitationRequest = (data: SendInvitationData): ApiRequestConfig =>
	apiClientCore.createSendInvitationRequest(data);
export const createInvitationResponseRequest = (data: InvitationResponseData): ApiRequestConfig =>
	apiClientCore.createInvitationResponseRequest(data);
export const handleInvitationApiResponse = <T>(response: Response): Promise<T> =>
	apiClientCore.handleInvitationApiResponse<T>(response);
export const validateInvitationApiParams = (data: SendInvitationData): ValidationResult =>
	apiClientCore.validateInvitationApiParams(data);
export const validateInvitationResponseParams = (data: InvitationResponseData): ValidationResult =>
	apiClientCore.validateInvitationResponseParams(data);
export const makeSendInvitationRequest = (data: SendInvitationData): Promise<SendInvitationApiResponse> =>
	apiClientCore.makeSendInvitationRequest(data);
export const makeInvitationResponseRequest = (data: InvitationResponseData): Promise<InvitationResponseApiResponse> =>
	apiClientCore.makeInvitationResponseRequest(data);

export const buildAddMemberUrl = (teamId: string): string => apiClientCore.buildAddMemberUrl(teamId);
export const createAddMemberRequest = (data: AddMemberData): ApiRequestConfig =>
	apiClientCore.createAddMemberRequest(data);
export const handleAddMemberResponse = (response: Response): Promise<AddMemberApiResponse> =>
	apiClientCore.handleAddMemberResponse(response);
export const validateAddMemberParams = (data: AddMemberData): ValidationResult =>
	apiClientCore.validateAddMemberParams(data);
export const makeAddMemberRequest = (data: AddMemberData): Promise<AddMemberApiResponse> =>
	apiClientCore.makeAddMemberRequest(data);

export const buildUserSearchUrl = (params: UserSearchParams): string => apiClientCore.buildUserSearchUrl(params);
export const createUserSearchRequest = (params: UserSearchParams): ApiRequestConfig =>
	apiClientCore.createUserSearchRequest(params);
export const handleUserSearchResponse = (response: Response): Promise<UserSearchResponse> =>
	apiClientCore.handleUserSearchResponse(response);
export const makeUserSearchRequest = (params: UserSearchParams): Promise<UserSearchResponse> =>
	apiClientCore.makeUserSearchRequest(params);
