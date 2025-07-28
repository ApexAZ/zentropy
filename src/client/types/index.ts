// Central type definitions for the Zentropy application
// This file provides a single source of truth for all shared interfaces and types

// Authentication types
export interface AuthUser {
	email: string;
	name: string;
	has_projects_access: boolean;
	email_verified: boolean;
}

export interface AuthState {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
}

export interface SignInCredentials {
	email: string;
	password: string;
	remember_me?: boolean;
}

export interface SignUpData {
	first_name?: string;
	last_name?: string;
	email: string;
	password: string;
	terms_agreement: boolean;
	has_projects_access?: boolean;
}

export interface AuthResponse {
	access_token: string;
	token_type: string;
	user: {
		first_name: string | null;
		last_name: string | null;
		display_name?: string | null;
		email: string;
		has_projects_access: boolean;
		email_verified: boolean;
	};
	action?: "sign_in" | "account_linked" | "complete_profile";
}

// Team types
export interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	working_days?: number[];
	created_at: string;
	updated_at: string;
}

export interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

export interface UpdateTeamData extends CreateTeamData {
	id: string;
}

export interface TeamValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

// User types
export interface User {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	display_name?: string | null;
	phone_number?: string;
	role: string;
	has_projects_access: boolean;
	email_verified: boolean;
	registration_type: string;
	organization_id?: string;
	created_at?: string;
	updated_at?: string;
}

export interface ProfileUpdateData {
	first_name: string;
	last_name: string;
	display_name: string;
	email: string;
	phone_number?: string;
}

export interface PasswordUpdateData {
	current_password: string;
	new_password: string;
	confirm_new_password: string;
}

// Calendar types
export interface CalendarEntry {
	id: string;
	team_id: string;
	user_id: string;
	entry_type: "pto" | "holiday" | "sick" | "personal";
	title: string;
	start_date: string;
	end_date: string;
	description?: string;
	all_day: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreateCalendarEntryData {
	team_id: string;
	user_id: string;
	entry_type: string;
	title: string;
	start_date: string;
	end_date: string;
	description?: string;
	all_day?: boolean;
}

// Form validation types
export interface FormValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

// Team member types
export interface TeamMember {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
	team_role: "member" | "lead";
}

export interface AddMemberData {
	email: string;
	role: "member" | "lead";
}

// Sprint types
export interface Sprint {
	id: string;
	name: string;
	start_date: string;
	end_date: string;
	team_id: string;
	status: "planned" | "active" | "completed";
}

export interface CreateSprintData {
	name: string;
	start_date: string;
	end_date: string;
}

// Team configuration types
export interface TeamBasicData {
	name: string;
	description: string;
	working_days: number[];
}

export interface VelocityData {
	baseline_velocity: number;
	sprint_length: number;
}

// Dashboard types
export interface DashboardStats {
	total_teams: number;
	total_members: number;
	active_sprints: number;
	upcoming_pto: number;
}

export interface PasswordValidationResult {
	isValid: boolean;
	requirements: {
		length: boolean;
		uppercase: boolean;
		lowercase: boolean;
		number: boolean;
		symbol: boolean;
		match: boolean;
	};
}

// Organization types
export interface Organization {
	id: string;
	name: string;
	short_name?: string;
	domain?: string;
	description?: string;
	scope: "personal" | "shared" | "enterprise";
	max_users?: number;
	created_by?: string;
	created_at: string;
	updated_at: string;
}

export interface CreateOrganizationData {
	name: string;
	domain?: string;
	scope?: "personal" | "shared" | "enterprise";
	max_users?: number;
	description?: string;
}

export interface UpdateOrganizationData {
	name?: string;
	domain?: string;
	scope?: "personal" | "shared" | "enterprise";
	max_users?: number;
	description?: string;
}

export interface DomainCheckResult {
	domain_found: boolean;
	domain: string;
	organization?: Organization;
	suggestions: {
		action: "join" | "create" | "personal";
		can_join: boolean;
		can_create: boolean;
		suggested_name?: string;
		message: string;
	};
}

export interface JoinOrganizationResult {
	message: string;
	status: string;
	organization_id: string;
}

export interface OrganizationListResponse {
	organizations: Organization[];
	total: number;
	page: number;
	limit: number;
}

// Project types
export interface Project {
	id: string;
	name: string;
	description?: string;
	visibility: "personal" | "team" | "organization";
	status: "active" | "completed" | "archived";
	organization_id?: string;
	created_by: string;
	created_at: string;
	updated_at: string;
}

export interface CreateProjectData {
	name: string;
	description?: string;
	visibility: "personal" | "team" | "organization";
	organization_id?: string;
}

export interface UpdateProjectData {
	name?: string;
	description?: string;
	visibility?: "personal" | "team" | "organization";
	status?: "active" | "completed" | "archived";
	organization_id?: string;
}

export interface ProjectListResponse {
	projects: Project[];
	total: number;
	page?: number;
	limit?: number;
}

export interface ProjectValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

export interface OrganizationValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

// API Error types for better error handling
export interface APIError {
	detail:
		| string
		| {
				detail: string;
				error_type: string;
		  };
	message?: string;
}

export interface CustomError extends Error {
	type?: string;
}

// Account Security types
export interface OAuthProviderStatus {
	provider: string;
	linked: boolean;
	identifier?: string;
}

export interface AccountSecurityResponse {
	email_auth_linked: boolean;
	oauth_providers: OAuthProviderStatus[];
	// Backwards compatibility - deprecated but maintained
	google_auth_linked: boolean;
	google_email?: string;
}

export interface LinkGoogleAccountRequest {
	google_credential: string;
}

export interface UnlinkGoogleAccountRequest {
	password: string;
}

export interface LinkAccountResponse {
	message: string;
	google_email: string;
	success: boolean;
}

export interface UnlinkAccountResponse {
	message: string;
	success: boolean;
}

// OAuth Provider types for scalability
export interface OAuthProvider {
	/** Provider name (e.g., 'google', 'github', 'microsoft') */
	name: string;
	/** Display name for UI (e.g., 'Google', 'GitHub', 'Microsoft') */
	displayName: string;
	/** CSS class for provider icon styling */
	iconClass: string;
	/** Primary brand color for UI theming */
	brandColor: string;
}

export interface OAuthProviderConfig {
	/** Whether this provider is enabled */
	enabled: boolean;
	/** Provider-specific configuration */
	config: Record<string, any>;
	/** OAuth scopes required */
	scopes: string[];
}

export interface OAuthProviderState {
	/** Whether OAuth initialization is complete */
	isReady: boolean;
	/** Whether authentication is in progress */
	isLoading: boolean;
	/** Current error state */
	error: string | null;
}

export interface OAuthCredential {
	/** The credential token from the OAuth provider */
	token: string;
	/** Provider name that issued the credential */
	provider: string;
	/** Optional additional provider data */
	providerData?: Record<string, any>;
}

// Enhanced Account Security types with provider abstraction
export interface ProviderAccountStatus {
	/** Whether this provider is linked to the account */
	linked: boolean;
	/** Provider name */
	provider: string;
	/** Provider-specific identifier (email, username, etc.) */
	identifier?: string;
	/** When this provider was linked */
	linked_at?: string;
}

export interface EnhancedAccountSecurityResponse {
	/** Primary authentication method always available */
	email_auth: ProviderAccountStatus;
	/** All linked OAuth providers */
	oauth_providers: ProviderAccountStatus[];
	/** Available OAuth providers that can be linked */
	available_providers: OAuthProvider[];
}

// Generic OAuth operation types
export interface LinkOAuthProviderRequest {
	/** OAuth credential from provider */
	credential: string;
	/** Provider name */
	provider: string;
}

export interface UnlinkOAuthProviderRequest {
	/** User password for security verification */
	password: string;
	/** Provider name to unlink */
	provider: string;
}

export interface OAuthOperationResponse {
	/** Operation result message */
	message: string;
	/** Whether the operation succeeded */
	success: boolean;
	/** Provider that was affected */
	provider: string;
	/** Provider-specific identifier (email, username, etc.) */
	provider_identifier?: string;
}

export interface OperationTokenResponse {
	operation_token: string;
	expires_in: number;
}
