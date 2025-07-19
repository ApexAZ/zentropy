/**
 * Global Mock Registry - Centralized mock architecture for zentropy test suite
 *
 * This file provides:
 * - Type-safe service mock interfaces
 * - Standardized mock factory functions
 * - Centralized cleanup and reset mechanisms
 * - Realistic default mock responses
 *
 * Usage:
 * ```typescript
 * import { createStandardMocks, resetAllMocks } from '../setup/globalMocks';
 *
 * const mocks = createStandardMocks();
 * // Use mocks in tests...
 * resetAllMocks(mocks); // Cleanup
 * ```
 */

import { vi, type MockedFunction } from "vitest";
import type {
	AuthUser,
	SignInCredentials,
	SignUpData,
	Organization,
	CreateOrganizationData,
	DomainCheckResult,
	Project,
	CreateProjectData,
	Team,
	CreateTeamData,
	CalendarEntry,
	CreateCalendarEntryData,
	User,
	ProfileUpdateData,
	PasswordUpdateData,
	AccountSecurityResponse,
	DashboardStats,
	OAuthProvider
} from "../../types";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface MockToastContext {
	showSuccess: MockedFunction<(message: string) => void>;
	showError: MockedFunction<(message: string) => void>;
	showInfo: MockedFunction<(message: string) => void>;
	showWarning: MockedFunction<(message: string) => void>;
	toasts: any[];
	removeToast: MockedFunction<(id: string) => void>;
}

export interface MockAuthService {
	signIn: MockedFunction<(credentials: SignInCredentials) => Promise<{ token: string; user: AuthUser }>>;
	signUp: MockedFunction<(userData: SignUpData) => Promise<{ message: string }>>;
	oauthSignIn: MockedFunction<(provider: "google", credential: string) => Promise<{ token: string; user: AuthUser }>>;
	signOut: MockedFunction<() => Promise<void>>;
	sendEmailVerification: MockedFunction<(email: string) => Promise<{ message: string }>>;
	validatePassword: MockedFunction<(password: string, confirmPassword?: string) => any>;
	validateEmail: MockedFunction<(email: string) => boolean>;
	getCurrentUser: MockedFunction<() => Promise<AuthUser | null>>;
	refreshToken: MockedFunction<() => Promise<{ token: string }>>;
}

export interface MockOrganizationService {
	checkDomain: MockedFunction<(email: string) => Promise<DomainCheckResult>>;
	create: MockedFunction<(organizationData: CreateOrganizationData) => Promise<Organization>>;
	getAll: MockedFunction<(filters?: any) => Promise<{ organizations: Organization[] }>>;
	getById: MockedFunction<(organizationId: string) => Promise<Organization>>;
	update: MockedFunction<(organizationId: string, updateData: any) => Promise<Organization>>;
	delete: MockedFunction<(organizationId: string) => Promise<void>>;
	join: MockedFunction<(organizationId: string) => Promise<any>>;
	leave: MockedFunction<(organizationId: string) => Promise<void>>;
}

export interface MockProjectService {
	create: MockedFunction<(projectData: CreateProjectData) => Promise<Project>>;
	getAll: MockedFunction<(filters?: any) => Promise<{ projects: Project[] }>>;
	getById: MockedFunction<(projectId: string) => Promise<Project>>;
	update: MockedFunction<(projectId: string, updateData: any) => Promise<Project>>;
	delete: MockedFunction<(projectId: string) => Promise<void>>;
	getByOrganization: MockedFunction<(organizationId: string, filters?: any) => Promise<{ projects: Project[] }>>;
	getPersonalProjects: MockedFunction<(filters?: any) => Promise<{ projects: Project[] }>>;
	upgradeToTeamProject: MockedFunction<(projectId: string, organizationId: string) => Promise<Project>>;
	changeStatus: MockedFunction<(projectId: string, status: string) => Promise<Project>>;
}

export interface MockTeamService {
	getTeams: MockedFunction<() => Promise<Team[]>>;
	getTeam: MockedFunction<(teamId: string) => Promise<Team>>;
	createTeam: MockedFunction<(teamData: CreateTeamData) => Promise<Team>>;
	updateTeam: MockedFunction<(teamId: string, teamData: any) => Promise<Team>>;
	deleteTeam: MockedFunction<(teamId: string) => Promise<void>>;
	getTeamMembers: MockedFunction<(teamId: string) => Promise<any[]>>;
	getTeamUsers: MockedFunction<(teamId: string) => Promise<User[]>>;
	addTeamMember: MockedFunction<(teamId: string, memberData: any) => Promise<any>>;
	removeTeamMember: MockedFunction<(teamId: string, memberId: string) => Promise<void>>;
	getTeamSprints: MockedFunction<(teamId: string) => Promise<any[]>>;
	createSprint: MockedFunction<(teamId: string, sprintData: any) => Promise<any>>;
	updateTeamBasicInfo: MockedFunction<(teamId: string, teamData: any) => Promise<Team>>;
	updateTeamVelocity: MockedFunction<(teamId: string, velocityData: any) => Promise<Team>>;
}

export interface MockCalendarService {
	getCalendarEntries: MockedFunction<(filters?: any) => Promise<CalendarEntry[]>>;
	createCalendarEntry: MockedFunction<(entryData: CreateCalendarEntryData) => Promise<CalendarEntry>>;
	updateCalendarEntry: MockedFunction<(entryId: string, entryData: any) => Promise<CalendarEntry>>;
	deleteCalendarEntry: MockedFunction<(entryId: string) => Promise<void>>;
	getInitializationData: MockedFunction<() => Promise<{ teams: Team[]; users: User[] }>>;
}

export interface MockUserService {
	getCurrentUser: MockedFunction<() => Promise<User>>;
	updateProfile: MockedFunction<(profileData: ProfileUpdateData) => Promise<User>>;
	updatePassword: MockedFunction<(passwordData: PasswordUpdateData) => Promise<{ message: string }>>;
	getAllUsers: MockedFunction<() => Promise<User[]>>;
	getAccountSecurity: MockedFunction<() => Promise<AccountSecurityResponse>>;
	linkGoogleAccount: MockedFunction<(linkData: any) => Promise<any>>;
	unlinkGoogleAccount: MockedFunction<(unlinkData: any) => Promise<any>>;
	validateProfile: MockedFunction<
		(profileData: ProfileUpdateData) => { isValid: boolean; errors: Record<string, string> }
	>;
	validatePasswordUpdate: MockedFunction<
		(passwordData: PasswordUpdateData) => { isValid: boolean; errors: Record<string, string> }
	>;
}

export interface MockDashboardService {
	getDashboardStats: MockedFunction<() => Promise<DashboardStats>>;
	getTeams: MockedFunction<() => Promise<Team[]>>;
}

export interface MockOAuthProviderService {
	getAvailableProviders: MockedFunction<() => OAuthProvider[]>;
	getProvider: MockedFunction<(name: string) => OAuthProvider | undefined>;
	isProviderSupported: MockedFunction<(name: string) => boolean>;
	linkProvider: MockedFunction<(request: any) => Promise<any>>;
	unlinkProvider: MockedFunction<(request: any) => Promise<any>>;
}

export interface StandardMocks {
	fetch: MockedFunction<typeof fetch>;
	authService: MockAuthService;
	organizationService: MockOrganizationService;
	projectService: MockProjectService;
	teamService: MockTeamService;
	calendarService: MockCalendarService;
	userService: MockUserService;
	dashboardService: MockDashboardService;
	oauthProviderService: MockOAuthProviderService;
	toastContext: MockToastContext;
}

// =============================================================================
// DEFAULT MOCK DATA
// =============================================================================

export const mockUser: AuthUser = {
	email: "test@example.com",
	name: "Test User",
	has_projects_access: true,
	email_verified: true
};

export const mockProfileUser: User = {
	id: "user-123",
	username: "testuser",
	email: "test@example.com",
	first_name: "Test",
	last_name: "User",
	role: "team_member",
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z"
};

export const mockOrganization: Organization = {
	id: "org-123",
	name: "Test Organization",
	domain: "test.com",
	description: "Test organization for development",
	scope: "shared",
	max_users: 50,
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z",
	created_by: "user-123"
};

export const mockProject: Project = {
	id: "project-123",
	name: "Test Project",
	description: "Test project for development",
	status: "active",
	visibility: "team",
	organization_id: "org-123",
	created_by: "user-123",
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z"
};

export const mockTeam: Team = {
	id: "team-123",
	name: "Test Team",
	description: "Test team for development",
	velocity_baseline: 35,
	sprint_length_days: 14,
	working_days_per_week: 5,
	working_days: [1, 2, 3, 4, 5],
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z"
};

export const mockCalendarEntry: CalendarEntry = {
	id: "calendar-123",
	title: "Test Event",
	description: "Test calendar entry",
	start_date: "2023-06-01",
	end_date: "2023-06-01",
	all_day: true,
	entry_type: "pto",
	user_id: "user-123",
	team_id: "team-123",
	created_at: "2023-01-01T00:00:00Z",
	updated_at: "2023-01-01T00:00:00Z"
};

export const mockDomainCheckResult: DomainCheckResult = {
	domain_found: true,
	domain: "test.com",
	organization: mockOrganization,
	suggestions: {
		action: "join",
		can_join: true,
		can_create: false,
		suggested_name: "Test Organization",
		message: "You can join this organization"
	}
};

export const mockAccountSecurityResponse: AccountSecurityResponse = {
	email_auth_linked: true,
	google_auth_linked: false,
	google_email: undefined
};

// =============================================================================
// MOCK FACTORY FUNCTIONS
// =============================================================================

export const createMockAuthService = (overrides?: Partial<MockAuthService>): MockAuthService => ({
	signIn: vi.fn().mockResolvedValue({
		token: "mock-token-123",
		user: mockUser
	}),
	signUp: vi.fn().mockResolvedValue({
		message: "Account created successfully"
	}),
	oauthSignIn: vi.fn().mockResolvedValue({
		token: "mock-oauth-token",
		user: mockUser
	}),
	signOut: vi.fn().mockResolvedValue(undefined),
	sendEmailVerification: vi.fn().mockResolvedValue({
		message: "Verification email sent"
	}),
	validatePassword: vi.fn().mockReturnValue({
		isValid: true,
		errors: []
	}),
	validateEmail: vi.fn().mockReturnValue(true),
	getCurrentUser: vi.fn().mockResolvedValue(mockUser),
	refreshToken: vi.fn().mockResolvedValue({
		token: "mock-refreshed-token"
	}),
	...overrides
});

export const createMockOrganizationService = (
	overrides?: Partial<MockOrganizationService>
): MockOrganizationService => ({
	checkDomain: vi.fn().mockResolvedValue(mockDomainCheckResult),
	create: vi.fn().mockResolvedValue(mockOrganization),
	getAll: vi.fn().mockResolvedValue({
		organizations: [mockOrganization]
	}),
	getById: vi.fn().mockResolvedValue(mockOrganization),
	update: vi.fn().mockResolvedValue(mockOrganization),
	delete: vi.fn().mockResolvedValue(undefined),
	join: vi.fn().mockResolvedValue({
		success: true,
		organization: mockOrganization
	}),
	leave: vi.fn().mockResolvedValue(undefined),
	...overrides
});

export const createMockProjectService = (overrides?: Partial<MockProjectService>): MockProjectService => ({
	create: vi.fn().mockResolvedValue(mockProject),
	getAll: vi.fn().mockResolvedValue({
		projects: [mockProject]
	}),
	getById: vi.fn().mockResolvedValue(mockProject),
	update: vi.fn().mockResolvedValue(mockProject),
	delete: vi.fn().mockResolvedValue(undefined),
	getByOrganization: vi.fn().mockResolvedValue({
		projects: [mockProject]
	}),
	getPersonalProjects: vi.fn().mockResolvedValue({
		projects: []
	}),
	upgradeToTeamProject: vi.fn().mockResolvedValue({
		...mockProject,
		visibility: "team"
	}),
	changeStatus: vi.fn().mockResolvedValue(mockProject),
	...overrides
});

export const createMockTeamService = (overrides?: Partial<MockTeamService>): MockTeamService => ({
	getTeams: vi.fn().mockResolvedValue([mockTeam]),
	getTeam: vi.fn().mockResolvedValue(mockTeam),
	createTeam: vi.fn().mockResolvedValue(mockTeam),
	updateTeam: vi.fn().mockResolvedValue(mockTeam),
	deleteTeam: vi.fn().mockResolvedValue(undefined),
	getTeamMembers: vi.fn().mockResolvedValue([]),
	getTeamUsers: vi.fn().mockResolvedValue([mockProfileUser]),
	addTeamMember: vi.fn().mockResolvedValue({
		id: "member-123",
		user_id: "user-123",
		team_id: "team-123"
	}),
	removeTeamMember: vi.fn().mockResolvedValue(undefined),
	getTeamSprints: vi.fn().mockResolvedValue([]),
	createSprint: vi.fn().mockResolvedValue({
		id: "sprint-123",
		name: "Sprint 1",
		team_id: "team-123"
	}),
	updateTeamBasicInfo: vi.fn().mockResolvedValue(mockTeam),
	updateTeamVelocity: vi.fn().mockResolvedValue(mockTeam),
	...overrides
});

export const createMockCalendarService = (overrides?: Partial<MockCalendarService>): MockCalendarService => ({
	getCalendarEntries: vi.fn().mockResolvedValue([mockCalendarEntry]),
	createCalendarEntry: vi.fn().mockResolvedValue(mockCalendarEntry),
	updateCalendarEntry: vi.fn().mockResolvedValue(mockCalendarEntry),
	deleteCalendarEntry: vi.fn().mockResolvedValue(undefined),
	getInitializationData: vi.fn().mockResolvedValue({
		teams: [mockTeam],
		users: [mockProfileUser]
	}),
	...overrides
});

export const createMockUserService = (overrides?: Partial<MockUserService>): MockUserService => ({
	getCurrentUser: vi.fn().mockResolvedValue(mockProfileUser),
	updateProfile: vi.fn().mockResolvedValue(mockProfileUser),
	updatePassword: vi.fn().mockResolvedValue({
		message: "Password updated successfully"
	}),
	getAllUsers: vi.fn().mockResolvedValue([mockProfileUser]),
	getAccountSecurity: vi.fn().mockResolvedValue(mockAccountSecurityResponse),
	linkGoogleAccount: vi.fn().mockResolvedValue({
		success: true,
		message: "Google account linked"
	}),
	unlinkGoogleAccount: vi.fn().mockResolvedValue({
		success: true,
		message: "Google account unlinked"
	}),
	validateProfile: vi.fn().mockReturnValue({
		isValid: true,
		errors: {}
	}),
	validatePasswordUpdate: vi.fn().mockReturnValue({
		isValid: true,
		errors: {}
	}),
	...overrides
});

export const createMockDashboardService = (overrides?: Partial<MockDashboardService>): MockDashboardService => ({
	getDashboardStats: vi.fn().mockResolvedValue({
		total_projects: 5,
		active_projects: 3,
		total_teams: 2,
		total_users: 10,
		recent_activity: []
	}),
	getTeams: vi.fn().mockResolvedValue([mockTeam]),
	...overrides
});

export const createMockOAuthProviderService = (
	overrides?: Partial<MockOAuthProviderService>
): MockOAuthProviderService => ({
	getAvailableProviders: vi.fn().mockReturnValue([{ name: "google", displayName: "Google", enabled: true }]),
	getProvider: vi.fn().mockReturnValue({ name: "google", displayName: "Google", enabled: true }),
	isProviderSupported: vi.fn().mockReturnValue(true),
	linkProvider: vi.fn().mockResolvedValue({
		success: true,
		message: "Provider linked"
	}),
	unlinkProvider: vi.fn().mockResolvedValue({
		success: true,
		message: "Provider unlinked"
	}),
	...overrides
});

export const createMockToastContext = (overrides?: Partial<MockToastContext>): MockToastContext => ({
	showSuccess: vi.fn(),
	showError: vi.fn(),
	showInfo: vi.fn(),
	showWarning: vi.fn(),
	toasts: [],
	removeToast: vi.fn(),
	...overrides
});

// =============================================================================
// GLOBAL MOCK CREATION & MANAGEMENT
// =============================================================================

export const createStandardMocks = (overrides?: Partial<StandardMocks>): StandardMocks => {
	const standardMocks: StandardMocks = {
		fetch: vi.fn(),
		authService: createMockAuthService(),
		organizationService: createMockOrganizationService(),
		projectService: createMockProjectService(),
		teamService: createMockTeamService(),
		calendarService: createMockCalendarService(),
		userService: createMockUserService(),
		dashboardService: createMockDashboardService(),
		oauthProviderService: createMockOAuthProviderService(),
		toastContext: createMockToastContext(),
		...overrides
	};

	return standardMocks;
};

/**
 * Recursively reset all mocks in the StandardMocks object
 * Handles nested objects and preserves the mock structure
 */
export const resetAllMocks = (mocks: StandardMocks): void => {
	Object.values(mocks).forEach(serviceOrMock => {
		if (typeof serviceOrMock === "function" && "mockReset" in serviceOrMock) {
			// Direct mock function
			(serviceOrMock as any).mockReset();
		} else if (typeof serviceOrMock === "object" && serviceOrMock !== null) {
			// Service object containing mock functions
			Object.values(serviceOrMock).forEach(mock => {
				if (typeof mock === "function" && "mockReset" in mock) {
					(mock as any).mockReset();
				}
			});
		}
	});
};

/**
 * Configure global fetch mock with standard responses
 * Provides sensible defaults for common API endpoints
 */
export const configureFetchMock = (fetchMock: MockedFunction<typeof fetch>): void => {
	fetchMock.mockImplementation((url: string | Request | URL) => {
		const urlString = typeof url === "string" ? url : url.toString();

		// Default successful response
		const defaultResponse = {
			ok: true,
			status: 200,
			statusText: "OK",
			json: () => Promise.resolve({}),
			text: () => Promise.resolve("")
		} as Response;

		// Add URL-specific responses if needed
		if (urlString.includes("/api/v1/auth/")) {
			return Promise.resolve({
				...defaultResponse,
				json: () => Promise.resolve({ token: "mock-token", user: mockUser })
			} as Response);
		}

		if (urlString.includes("/api/v1/organizations/")) {
			return Promise.resolve({
				...defaultResponse,
				json: () => Promise.resolve(mockOrganization)
			} as Response);
		}

		return Promise.resolve(defaultResponse);
	});
};

// =============================================================================
// SCENARIO-BASED MOCK CONFIGURATIONS
// =============================================================================

/**
 * Pre-configured mock scenarios for common test cases
 */
export const MockScenarios = {
	/**
	 * Authenticated user with successful operations
	 */
	authenticatedUser: (): StandardMocks =>
		createStandardMocks({
			authService: createMockAuthService({
				getCurrentUser: vi.fn().mockResolvedValue(mockUser)
			})
		}),

	/**
	 * Unauthenticated user (signed out state)
	 */
	unauthenticatedUser: (): StandardMocks =>
		createStandardMocks({
			authService: createMockAuthService({
				getCurrentUser: vi.fn().mockResolvedValue(null)
			})
		}),

	/**
	 * User with organization access
	 */
	userWithOrganization: (): StandardMocks =>
		createStandardMocks({
			authService: createMockAuthService({
				getCurrentUser: vi.fn().mockResolvedValue(mockUser)
			}),
			organizationService: createMockOrganizationService({
				getAll: vi.fn().mockResolvedValue({
					organizations: [mockOrganization]
				})
			})
		}),

	/**
	 * Network error scenarios
	 */
	networkError: (): StandardMocks =>
		createStandardMocks({
			fetch: vi.fn().mockRejectedValue(new Error("Network error"))
		}),

	/**
	 * Rate limiting scenarios
	 */
	rateLimited: (): StandardMocks =>
		createStandardMocks({
			authService: createMockAuthService({
				signIn: vi.fn().mockRejectedValue(new Error("Rate limit exceeded"))
			})
		})
};
