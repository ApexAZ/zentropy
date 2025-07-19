/**
 * Service Mock Factories - Dedicated mock implementations for each service
 *
 * This file provides specialized mock factories for each service with
 * realistic default behaviors and easy customization options.
 *
 * Usage:
 * ```typescript
 * import { createAuthServiceMocks, AuthServiceScenarios } from '../mocks/serviceMocks';
 *
 * // Basic usage
 * const authMocks = createAuthServiceMocks();
 *
 * // Scenario-based usage
 * const failedLoginMocks = AuthServiceScenarios.failedLogin();
 *
 * // Custom overrides
 * const customMocks = createAuthServiceMocks({
 *   signIn: vi.fn().mockRejectedValue(new Error('Custom error'))
 * });
 * ```
 */

import { vi } from "vitest";
import type {
	SignInCredentials,
	SignUpData,
	CreateOrganizationData,
	CreateProjectData,
	CreateTeamData,
	CreateCalendarEntryData,
	ProfileUpdateData,
	PasswordUpdateData
} from "../../types";
import type {
	MockAuthService,
	MockOrganizationService,
	MockProjectService,
	MockTeamService,
	MockCalendarService,
	MockUserService,
	MockDashboardService,
	MockOAuthProviderService
} from "../setup/globalMocks";
import {
	mockUser,
	mockProfileUser,
	mockOrganization,
	mockProject,
	mockTeam,
	mockCalendarEntry,
	mockDomainCheckResult,
	mockAccountSecurityResponse
} from "../setup/globalMocks";

// =============================================================================
// AUTH SERVICE MOCKS
// =============================================================================

/**
 * Create AuthService mocks with realistic default behaviors
 */
export const createAuthServiceMocks = (overrides?: Partial<MockAuthService>): MockAuthService => ({
	// Authentication operations
	signIn: vi.fn().mockImplementation(async (credentials: SignInCredentials) => {
		if (credentials.email === "fail@test.com") {
			throw new Error("Invalid credentials");
		}
		return { token: "mock-token-123", user: mockUser };
	}),

	signUp: vi.fn().mockImplementation(async (userData: SignUpData) => {
		if (userData.email === "exists@test.com") {
			throw new Error("Email already exists");
		}
		return { message: "Account created successfully" };
	}),

	oauthSignIn: vi.fn().mockImplementation(async (provider: "google", credential: string) => {
		if (credential === "invalid-credential") {
			throw new Error("Invalid OAuth credential");
		}
		return { token: "mock-oauth-token", user: mockUser };
	}),

	signOut: vi.fn().mockResolvedValue(undefined),

	// User management
	getCurrentUser: vi.fn().mockResolvedValue(mockUser),
	refreshToken: vi.fn().mockResolvedValue({ token: "mock-refreshed-token" }),

	// Email verification
	sendEmailVerification: vi.fn().mockImplementation(async (email: string) => {
		if (email === "invalid@test.com") {
			throw new Error("Invalid email address");
		}
		return { message: "Verification email sent" };
	}),

	// Validation methods (synchronous)
	validateEmail: vi.fn().mockImplementation((email: string) => {
		return email.includes("@") && email.includes(".");
	}),

	validatePassword: vi.fn().mockImplementation((password: string, confirmPassword?: string) => {
		const errors = [];

		if (password.length < 8) {
			errors.push("Password must be at least 8 characters");
		}

		if (confirmPassword && password !== confirmPassword) {
			errors.push("Passwords do not match");
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}),

	...overrides
});

/**
 * Pre-configured AuthService scenarios for common test cases
 */
export const AuthServiceScenarios = {
	successfulSignIn: () => createAuthServiceMocks(),

	failedSignIn: () =>
		createAuthServiceMocks({
			signIn: vi.fn().mockRejectedValue(new Error("Invalid credentials"))
		}),

	rateLimited: () =>
		createAuthServiceMocks({
			signIn: vi.fn().mockRejectedValue(new Error("Rate limit exceeded"))
		}),

	emailAlreadyExists: () =>
		createAuthServiceMocks({
			signUp: vi.fn().mockRejectedValue(new Error("Email already exists"))
		}),

	oauthFailed: () =>
		createAuthServiceMocks({
			oauthSignIn: vi.fn().mockRejectedValue(new Error("OAuth authentication failed"))
		}),

	unauthenticatedUser: () =>
		createAuthServiceMocks({
			getCurrentUser: vi.fn().mockResolvedValue(null)
		}),

	expiredSession: () =>
		createAuthServiceMocks({
			getCurrentUser: vi.fn().mockRejectedValue(new Error("Session expired")),
			refreshToken: vi.fn().mockRejectedValue(new Error("Refresh token expired"))
		})
};

// =============================================================================
// ORGANIZATION SERVICE MOCKS
// =============================================================================

/**
 * Create OrganizationService mocks with realistic default behaviors
 */
export const createOrganizationServiceMocks = (
	overrides?: Partial<MockOrganizationService>
): MockOrganizationService => ({
	checkDomain: vi.fn().mockImplementation(async (email: string) => {
		const domain = email.split("@")[1];

		if (domain === "test.com") {
			return mockDomainCheckResult;
		}

		return {
			domain_found: false,
			organization: null,
			can_join: false,
			requires_approval: false
		};
	}),

	create: vi.fn().mockImplementation(async (organizationData: CreateOrganizationData) => {
		if (organizationData.domain === "forbidden.com") {
			throw new Error("Domain not allowed");
		}

		return {
			...mockOrganization,
			name: organizationData.name,
			domain: organizationData.domain
		};
	}),

	getAll: vi.fn().mockResolvedValue({
		organizations: [mockOrganization]
	}),

	getById: vi.fn().mockImplementation(async (organizationId: string) => {
		if (organizationId === "not-found") {
			throw new Error("Organization not found");
		}
		return { ...mockOrganization, id: organizationId };
	}),

	update: vi.fn().mockImplementation(async (organizationId: string, updateData: any) => {
		return { ...mockOrganization, id: organizationId, ...updateData };
	}),

	delete: vi.fn().mockImplementation(async (organizationId: string) => {
		if (organizationId === "cannot-delete") {
			throw new Error("Cannot delete organization with active projects");
		}
		return undefined;
	}),

	join: vi.fn().mockImplementation(async (organizationId: string) => {
		if (organizationId === "full-org") {
			throw new Error("Organization has reached maximum members");
		}

		return {
			success: true,
			organization: { ...mockOrganization, id: organizationId }
		};
	}),

	leave: vi.fn().mockImplementation(async (organizationId: string) => {
		if (organizationId === "last-admin") {
			throw new Error("Cannot leave organization as the last administrator");
		}
		return undefined;
	}),

	...overrides
});

/**
 * Pre-configured OrganizationService scenarios
 */
export const OrganizationServiceScenarios = {
	domainFound: () => createOrganizationServiceMocks(),

	domainNotFound: () =>
		createOrganizationServiceMocks({
			checkDomain: vi.fn().mockResolvedValue({
				domain_found: false,
				organization: null,
				can_join: false,
				requires_approval: false
			})
		}),

	organizationFull: () =>
		createOrganizationServiceMocks({
			join: vi.fn().mockRejectedValue(new Error("Organization has reached maximum members"))
		}),

	noPermissions: () =>
		createOrganizationServiceMocks({
			update: vi.fn().mockRejectedValue(new Error("Insufficient permissions")),
			delete: vi.fn().mockRejectedValue(new Error("Insufficient permissions"))
		})
};

// =============================================================================
// PROJECT SERVICE MOCKS
// =============================================================================

/**
 * Create ProjectService mocks with realistic default behaviors
 */
export const createProjectServiceMocks = (overrides?: Partial<MockProjectService>): MockProjectService => ({
	create: vi.fn().mockImplementation(async (projectData: CreateProjectData) => {
		return {
			...mockProject,
			name: projectData.name,
			description: projectData.description || mockProject.description
		};
	}),

	getAll: vi.fn().mockResolvedValue({
		projects: [mockProject]
	}),

	getById: vi.fn().mockImplementation(async (projectId: string) => {
		if (projectId === "not-found") {
			throw new Error("Project not found");
		}
		return { ...mockProject, id: projectId };
	}),

	update: vi.fn().mockImplementation(async (projectId: string, updateData: any) => {
		return { ...mockProject, id: projectId, ...updateData };
	}),

	delete: vi.fn().mockImplementation(async (projectId: string) => {
		if (projectId === "active-project") {
			throw new Error("Cannot delete active project");
		}
		return undefined;
	}),

	getByOrganization: vi.fn().mockImplementation(async (organizationId: string) => {
		return {
			projects: [{ ...mockProject, organization_id: organizationId }]
		};
	}),

	getPersonalProjects: vi.fn().mockResolvedValue({
		projects: [{ ...mockProject, visibility: "personal" }]
	}),

	upgradeToTeamProject: vi.fn().mockImplementation(async (projectId: string, organizationId: string) => {
		return {
			...mockProject,
			id: projectId,
			organization_id: organizationId,
			visibility: "team"
		};
	}),

	changeStatus: vi.fn().mockImplementation(async (projectId: string, status: string) => {
		return { ...mockProject, id: projectId, status };
	}),

	...overrides
});

/**
 * Pre-configured ProjectService scenarios
 */
export const ProjectServiceScenarios = {
	standardProject: () => createProjectServiceMocks(),

	personalProjectsOnly: () =>
		createProjectServiceMocks({
			getAll: vi.fn().mockResolvedValue({
				projects: [{ ...mockProject, visibility: "personal" }]
			})
		}),

	noProjects: () =>
		createProjectServiceMocks({
			getAll: vi.fn().mockResolvedValue({ projects: [] }),
			getPersonalProjects: vi.fn().mockResolvedValue({ projects: [] })
		}),

	projectNotFound: () =>
		createProjectServiceMocks({
			getById: vi.fn().mockRejectedValue(new Error("Project not found"))
		})
};

// =============================================================================
// TEAM SERVICE MOCKS
// =============================================================================

/**
 * Create TeamService mocks with realistic default behaviors
 */
export const createTeamServiceMocks = (overrides?: Partial<MockTeamService>): MockTeamService => ({
	getTeams: vi.fn().mockResolvedValue([mockTeam]),

	getTeam: vi.fn().mockImplementation(async (teamId: string) => {
		if (teamId === "not-found") {
			throw new Error("Team not found");
		}
		return { ...mockTeam, id: teamId };
	}),

	createTeam: vi.fn().mockImplementation(async (teamData: CreateTeamData) => {
		return {
			...mockTeam,
			name: teamData.name,
			description: teamData.description || mockTeam.description
		};
	}),

	updateTeam: vi.fn().mockImplementation(async (teamId: string, teamData: any) => {
		return { ...mockTeam, id: teamId, ...teamData };
	}),

	deleteTeam: vi.fn().mockImplementation(async (teamId: string) => {
		if (teamId === "has-active-projects") {
			throw new Error("Cannot delete team with active projects");
		}
		return undefined;
	}),

	getTeamMembers: vi
		.fn()
		.mockResolvedValue([{ id: "member-1", user_id: "user-123", team_id: mockTeam.id, role: "member" }]),

	getTeamUsers: vi.fn().mockResolvedValue([mockProfileUser]),

	addTeamMember: vi.fn().mockImplementation(async (teamId: string, memberData: any) => {
		return {
			id: "new-member-123",
			user_id: memberData.user_id,
			team_id: teamId,
			role: memberData.role || "member"
		};
	}),

	removeTeamMember: vi.fn().mockImplementation(async (teamId: string, memberId: string) => {
		if (memberId === "last-admin") {
			throw new Error("Cannot remove the last administrator");
		}
		return undefined;
	}),

	getTeamSprints: vi
		.fn()
		.mockResolvedValue([{ id: "sprint-1", name: "Sprint 1", team_id: mockTeam.id, status: "active" }]),

	createSprint: vi.fn().mockImplementation(async (teamId: string, sprintData: any) => {
		return {
			id: "new-sprint-123",
			name: sprintData.name,
			team_id: teamId,
			status: "planning"
		};
	}),

	updateTeamBasicInfo: vi.fn().mockImplementation(async (teamId: string, teamData: any) => {
		return { ...mockTeam, id: teamId, ...teamData };
	}),

	updateTeamVelocity: vi.fn().mockImplementation(async (teamId: string, velocityData: any) => {
		return {
			...mockTeam,
			id: teamId,
			velocity_average: velocityData.velocity_average
		};
	}),

	...overrides
});

/**
 * Pre-configured TeamService scenarios
 */
export const TeamServiceScenarios = {
	standardTeam: () => createTeamServiceMocks(),

	noTeams: () =>
		createTeamServiceMocks({
			getTeams: vi.fn().mockResolvedValue([])
		}),

	teamWithMultipleMembers: () =>
		createTeamServiceMocks({
			getTeamMembers: vi.fn().mockResolvedValue([
				{ id: "member-1", user_id: "user-123", team_id: mockTeam.id, role: "admin" },
				{ id: "member-2", user_id: "user-456", team_id: mockTeam.id, role: "member" },
				{ id: "member-3", user_id: "user-789", team_id: mockTeam.id, role: "member" }
			])
		}),

	teamNotFound: () =>
		createTeamServiceMocks({
			getTeam: vi.fn().mockRejectedValue(new Error("Team not found"))
		})
};

// =============================================================================
// CALENDAR SERVICE MOCKS
// =============================================================================

/**
 * Create CalendarService mocks with realistic default behaviors
 */
export const createCalendarServiceMocks = (overrides?: Partial<MockCalendarService>): MockCalendarService => ({
	getCalendarEntries: vi.fn().mockResolvedValue([mockCalendarEntry]),

	createCalendarEntry: vi.fn().mockImplementation(async (entryData: CreateCalendarEntryData) => {
		return {
			...mockCalendarEntry,
			title: entryData.title,
			start_date: entryData.start_date,
			end_date: entryData.end_date
		};
	}),

	updateCalendarEntry: vi.fn().mockImplementation(async (entryId: string, entryData: any) => {
		return { ...mockCalendarEntry, id: entryId, ...entryData };
	}),

	deleteCalendarEntry: vi.fn().mockImplementation(async (entryId: string) => {
		if (entryId === "cannot-delete") {
			throw new Error("Cannot delete past calendar entry");
		}
		return undefined;
	}),

	getInitializationData: vi.fn().mockResolvedValue({
		teams: [mockTeam],
		users: [mockProfileUser]
	}),

	...overrides
});

/**
 * Pre-configured CalendarService scenarios
 */
export const CalendarServiceScenarios = {
	withEntries: () => createCalendarServiceMocks(),

	noEntries: () =>
		createCalendarServiceMocks({
			getCalendarEntries: vi.fn().mockResolvedValue([])
		}),

	initializationError: () =>
		createCalendarServiceMocks({
			getInitializationData: vi.fn().mockRejectedValue(new Error("Failed to load initialization data"))
		})
};

// =============================================================================
// USER SERVICE MOCKS
// =============================================================================

/**
 * Create UserService mocks with realistic default behaviors
 */
export const createUserServiceMocks = (overrides?: Partial<MockUserService>): MockUserService => ({
	getCurrentUser: vi.fn().mockResolvedValue(mockProfileUser),

	updateProfile: vi.fn().mockImplementation(async (profileData: ProfileUpdateData) => {
		return { ...mockProfileUser, ...profileData };
	}),

	updatePassword: vi.fn().mockImplementation(async (passwordData: PasswordUpdateData) => {
		if (passwordData.current_password === "wrong-password") {
			throw new Error("Current password is incorrect");
		}
		return { message: "Password updated successfully" };
	}),

	getAllUsers: vi.fn().mockResolvedValue([mockProfileUser]),

	getAccountSecurity: vi.fn().mockResolvedValue(mockAccountSecurityResponse),

	linkGoogleAccount: vi.fn().mockImplementation(async (linkData: any) => {
		if (linkData.credential === "invalid") {
			throw new Error("Invalid Google credential");
		}
		return { success: true, message: "Google account linked successfully" };
	}),

	unlinkGoogleAccount: vi.fn().mockImplementation(async (unlinkData: any) => {
		if (unlinkData.password === "wrong-password") {
			throw new Error("Incorrect password");
		}
		return { success: true, message: "Google account unlinked successfully" };
	}),

	...overrides
});

/**
 * Pre-configured UserService scenarios
 */
export const UserServiceScenarios = {
	standardUser: () => createUserServiceMocks(),

	googleLinked: () =>
		createUserServiceMocks({
			getAccountSecurity: vi.fn().mockResolvedValue({
				...mockAccountSecurityResponse,
				has_google_linked: true,
				google_email: "user@gmail.com"
			})
		}),

	passwordUpdateFailed: () =>
		createUserServiceMocks({
			updatePassword: vi.fn().mockRejectedValue(new Error("Current password is incorrect"))
		})
};

// =============================================================================
// DASHBOARD SERVICE MOCKS
// =============================================================================

/**
 * Create DashboardService mocks with realistic default behaviors
 */
export const createDashboardServiceMocks = (overrides?: Partial<MockDashboardService>): MockDashboardService => ({
	getDashboardStats: vi.fn().mockResolvedValue({
		total_projects: 5,
		active_projects: 3,
		total_teams: 2,
		total_users: 10,
		recent_activity: [
			{ id: "1", type: "project_created", message: 'Project "Test" created' },
			{ id: "2", type: "team_updated", message: 'Team "Development" updated' }
		]
	}),

	getTeams: vi.fn().mockResolvedValue([mockTeam]),

	...overrides
});

/**
 * Pre-configured DashboardService scenarios
 */
export const DashboardServiceScenarios = {
	activeEnvironment: () => createDashboardServiceMocks(),

	emptyEnvironment: () =>
		createDashboardServiceMocks({
			getDashboardStats: vi.fn().mockResolvedValue({
				total_projects: 0,
				active_projects: 0,
				total_teams: 0,
				total_users: 1,
				recent_activity: []
			}),
			getTeams: vi.fn().mockResolvedValue([])
		})
};

// =============================================================================
// OAUTH PROVIDER SERVICE MOCKS
// =============================================================================

/**
 * Create OAuthProviderService mocks with realistic default behaviors
 */
export const createOAuthProviderServiceMocks = (
	overrides?: Partial<MockOAuthProviderService>
): MockOAuthProviderService => ({
	getAvailableProviders: vi.fn().mockReturnValue([
		{ name: "google", displayName: "Google", enabled: true },
		{ name: "github", displayName: "GitHub", enabled: false },
		{ name: "microsoft", displayName: "Microsoft", enabled: false }
	]),

	getProvider: vi.fn().mockImplementation((name: string) => {
		const providers = [
			{ name: "google", displayName: "Google", enabled: true },
			{ name: "github", displayName: "GitHub", enabled: false },
			{ name: "microsoft", displayName: "Microsoft", enabled: false }
		];
		return providers.find(p => p.name === name);
	}),

	isProviderSupported: vi.fn().mockImplementation((name: string) => {
		return ["google", "github", "microsoft"].includes(name);
	}),

	linkProvider: vi.fn().mockImplementation(async (request: any) => {
		if (request.credential === "invalid") {
			throw new Error("Invalid provider credential");
		}
		return { success: true, message: `${request.provider} account linked` };
	}),

	unlinkProvider: vi.fn().mockImplementation(async (request: any) => {
		if (request.password === "wrong-password") {
			throw new Error("Incorrect password");
		}
		return { success: true, message: `${request.provider} account unlinked` };
	}),

	...overrides
});

/**
 * Pre-configured OAuthProviderService scenarios
 */
export const OAuthProviderServiceScenarios = {
	googleOnly: () => createOAuthProviderServiceMocks(),

	multipleProviders: () =>
		createOAuthProviderServiceMocks({
			getAvailableProviders: vi.fn().mockReturnValue([
				{ name: "google", displayName: "Google", enabled: true },
				{ name: "github", displayName: "GitHub", enabled: true },
				{ name: "microsoft", displayName: "Microsoft", enabled: true }
			])
		}),

	noProviders: () =>
		createOAuthProviderServiceMocks({
			getAvailableProviders: vi.fn().mockReturnValue([])
		})
};
