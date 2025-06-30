/**
 * Team Core Module - Consolidated Team Management System
 *
 * Consolidates functionality from:
 * - teams-business-logic.ts (data validation, processing, capacity calculation)
 * - team-validation.ts (API validation functions)
 * - team-model-extensions.ts (database operations with roles)
 * - team-form-processing-utils.ts (form data processing)
 * - team-management-ui-utils.ts (UI integration and DOM manipulation)
 *
 * Follows security-first approach with comprehensive error handling
 * Implements containerized architecture with clear module boundaries
 */

import { sanitizeInput } from "./validation.js";
import type { Team } from "../models/Team.js";
import type { User, UserRole } from "../models/User.js";

// Type definitions - consolidating all team-related interfaces
export interface CreateTeamData {
	name: string;
	description: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

export interface TeamValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: CreateTeamData;
}

export interface TeamDisplayData {
	id: string;
	name: string;
	description: string;
	memberCount: number;
	velocityBaseline: number;
	sprintLength: number;
	workingDaysPerWeek: number;
	createdAt: string;
	capacity: TeamCapacityMetrics;
}

export interface TeamCapacityMetrics {
	dailyVelocity: number;
	weeklyCapacity: number;
	sprintCapacity: number;
	utilizationRate: number;
}

export interface TeamFormData {
	name: string;
	description: string;
	velocity_baseline: string;
	sprint_length_days: string;
	working_days_per_week: string;
}

export interface ProcessedTeamData {
	stringFields: Record<string, string>;
	numberFields: Record<string, number>;
	booleanFields: Record<string, boolean>;
}

export interface FormFieldConfig {
	name: string;
	type: "string" | "number" | "boolean";
	required: boolean;
	validators?: ValidationFunction[];
}

export interface ValidationFunction {
	(value: unknown): { isValid: boolean; error?: string };
}

export interface TeamMembershipWithRole {
	id: string;
	team_id: string;
	user_id: string;
	role: UserRole;
	created_at: string;
	user: User;
}

export interface CreateTeamMembershipData {
	team_id: string;
	user_id: string;
	role: UserRole;
}

export interface SortCriteria {
	field: keyof Team;
	direction: "asc" | "desc";
	searchTerm?: string;
}

/**
 * TeamCore - Consolidated Team Management Module
 * Provides all team-related functionality in a single containerized module
 */
export class TeamCore {
	private membershipCounter = 0;

	// ========================
	// BUSINESS LOGIC (from teams-business-logic)
	// ========================

	/**
	 * Validate team data with comprehensive business rules
	 */
	validateTeamData(data: CreateTeamData): TeamValidationResult {
		const errors: Record<string, string> = {};

		// Name validation
		if (!data.name || data.name.trim() === "") {
			errors.name = "Team name is required";
		} else if (data.name.length > 255) {
			errors.name = "Team name must be less than 255 characters";
		}

		// Description validation
		if (data.description && data.description.length > 1000) {
			errors.description = "Team description must be less than 1000 characters";
		}

		// Velocity validation
		if (data.velocity_baseline < 0) {
			errors.velocity_baseline = "Velocity baseline must be greater than 0";
		}

		// Sprint length validation
		if (data.sprint_length_days < 1 || data.sprint_length_days > 28) {
			errors.sprint_length_days = "Sprint length must be between 1 and 28 days";
		}

		// Working days validation
		if (data.working_days_per_week < 1 || data.working_days_per_week > 7) {
			errors.working_days_per_week = "Working days per week must be between 1 and 7";
		}

		const isValid = Object.keys(errors).length === 0;

		if (isValid) {
			return {
				isValid,
				errors,
				sanitizedData: this.sanitizeTeamData(data)
			};
		} else {
			return {
				isValid,
				errors
			};
		}
	}

	/**
	 * Sanitize team data to prevent XSS and normalize inputs
	 */
	private sanitizeTeamData(data: CreateTeamData): CreateTeamData {
		return {
			name: this.escapeHtml(data.name.trim()),
			description: this.escapeHtml(data.description.trim()),
			velocity_baseline: data.velocity_baseline,
			sprint_length_days: data.sprint_length_days,
			working_days_per_week: data.working_days_per_week
		};
	}

	/**
	 * Escape HTML characters to prevent XSS
	 */
	private escapeHtml(text: string): string {
		if (typeof document !== "undefined") {
			const div = document.createElement("div");
			div.textContent = text;
			return div.innerHTML;
		} else {
			// Fallback for server-side or test environments
			return text
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#x27;");
		}
	}

	/**
	 * Process team form data from strings to appropriate types
	 */
	processTeamFormData(formData: TeamFormData): CreateTeamData {
		return {
			name: this.escapeHtml(formData.name.trim()),
			description: this.escapeHtml(formData.description.trim()),
			velocity_baseline: Math.floor(parseFloat(formData.velocity_baseline) || 0),
			sprint_length_days: Math.floor(parseFloat(formData.sprint_length_days) || 0),
			working_days_per_week: Math.floor(parseFloat(formData.working_days_per_week) || 0)
		};
	}

	/**
	 * Create display data from team model with calculated metrics
	 */
	createTeamDisplayData(team: Team, memberCount: number = 0): TeamDisplayData {
		const capacity = this.calculateTeamCapacity(team);

		return {
			id: team.id,
			name: team.name,
			description: team.description ?? "",
			memberCount,
			velocityBaseline: team.velocity_baseline,
			sprintLength: team.sprint_length_days,
			workingDaysPerWeek: team.working_days_per_week,
			createdAt: this.formatDateForDisplay(team.created_at),
			capacity
		};
	}

	/**
	 * Calculate team capacity metrics based on team configuration
	 */
	calculateTeamCapacity(team: Team, utilizationRate: number = 1.0): TeamCapacityMetrics {
		const dailyVelocity = team.velocity_baseline / team.working_days_per_week;
		const weeklyCapacity = team.velocity_baseline;
		// Sprint capacity = velocity baseline scaled by sprint length in weeks
		const sprintCapacity = team.velocity_baseline * (team.sprint_length_days / 7);

		return {
			dailyVelocity: Math.round(dailyVelocity * 100) / 100, // Round to 2 decimal places
			weeklyCapacity: Math.round(weeklyCapacity * utilizationRate),
			sprintCapacity: Math.round(sprintCapacity * utilizationRate * 100) / 100,
			utilizationRate: Math.round(utilizationRate * 100)
		};
	}

	/**
	 * Filter and sort teams based on criteria
	 */
	filterAndSortTeams(teams: Team[], criteria: SortCriteria): Team[] {
		let filteredTeams = teams;

		// Apply search filter if provided
		if (criteria.searchTerm && criteria.searchTerm.trim() !== "") {
			const searchLower = criteria.searchTerm.toLowerCase();
			filteredTeams = teams.filter(
				team =>
					team.name.toLowerCase().includes(searchLower) ||
					(team.description && team.description.toLowerCase().includes(searchLower))
			);
		}

		// Sort teams
		return filteredTeams.sort((a, b) => {
			const aValue = a[criteria.field];
			const bValue = b[criteria.field];

			// Handle string comparisons
			if (typeof aValue === "string" && typeof bValue === "string") {
				const comparison = aValue.localeCompare(bValue);
				return criteria.direction === "asc" ? comparison : -comparison;
			}

			// Handle number comparisons
			if (typeof aValue === "number" && typeof bValue === "number") {
				const comparison = aValue - bValue;
				return criteria.direction === "asc" ? comparison : -comparison;
			}

			// Handle date comparisons
			if (aValue instanceof Date && bValue instanceof Date) {
				const comparison = aValue.getTime() - bValue.getTime();
				return criteria.direction === "asc" ? comparison : -comparison;
			}

			// Handle string date comparisons (for created_at as string)
			if (typeof aValue === "string" && typeof bValue === "string" && criteria.field === "created_at") {
				const aDate = new Date(aValue);
				const bDate = new Date(bValue);
				const comparison = aDate.getTime() - bDate.getTime();
				return criteria.direction === "asc" ? comparison : -comparison;
			}

			return 0;
		});
	}

	/**
	 * Format date for display
	 */
	private formatDateForDisplay(date: Date | string): string {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return dateObj.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "UTC"
		});
	}

	// ========================
	// API VALIDATION (from team-validation)
	// ========================

	/**
	 * Validate team input for API requests
	 */
	validateTeamInput(data: unknown): CreateTeamData {
		if (!data || typeof data !== "object") {
			throw new Error("Invalid team data provided");
		}

		const teamData = data as Record<string, unknown>;

		// Validate required fields
		if (typeof teamData.name !== "string" || !teamData.name.trim()) {
			throw new Error("Team name is required");
		}

		if (typeof teamData.description !== "string") {
			throw new Error("Team description must be a string");
		}

		if (typeof teamData.velocity_baseline !== "number" || teamData.velocity_baseline < 0) {
			throw new Error("Velocity baseline must be a non-negative number");
		}

		if (
			typeof teamData.sprint_length_days !== "number" ||
			teamData.sprint_length_days < 1 ||
			teamData.sprint_length_days > 28
		) {
			throw new Error("Sprint length must be between 1 and 28 days");
		}

		if (
			typeof teamData.working_days_per_week !== "number" ||
			teamData.working_days_per_week < 1 ||
			teamData.working_days_per_week > 7
		) {
			throw new Error("Working days per week must be between 1 and 7");
		}

		return {
			name: teamData.name.trim(),
			description: teamData.description.trim(),
			velocity_baseline: teamData.velocity_baseline,
			sprint_length_days: teamData.sprint_length_days,
			working_days_per_week: teamData.working_days_per_week
		};
	}

	/**
	 * Validate sprint length for API
	 */
	validateSprintLength(days: number): boolean {
		return Number.isInteger(days) && days >= 1 && days <= 28;
	}

	/**
	 * Validate working days for API
	 */
	validateWorkingDays(days: number): boolean {
		return Number.isInteger(days) && days >= 1 && days <= 7;
	}

	// ========================
	// MODEL EXTENSIONS (from team-model-extensions)
	// ========================

	/**
	 * Add member to team with specific role
	 */
	addMemberWithRole(data: CreateTeamMembershipData): TeamMembershipWithRole {
		// This would integrate with the database layer
		// For now, return a mock implementation that matches the interface
		this.membershipCounter++;
		const membership: TeamMembershipWithRole = {
			id: `membership-${Date.now()}-${this.membershipCounter}`,
			team_id: data.team_id,
			user_id: data.user_id,
			role: data.role,
			created_at: new Date().toISOString(),
			user: {
				id: data.user_id,
				email: "user@example.com",
				password_hash: "mock_hash",
				first_name: "Test",
				last_name: "User",
				role: data.role,
				is_active: true,
				last_login_at: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		};

		return membership;
	}

	/**
	 * Get team memberships with roles
	 */
	getTeamMemberships(): TeamMembershipWithRole[] {
		// This would integrate with the database layer
		// For now, return empty array for testing
		return [];
	}

	/**
	 * Update member role in team
	 */
	updateMemberRole(): TeamMembershipWithRole | null {
		// This would integrate with the database layer
		// For now, return null for testing
		return null;
	}

	// ========================
	// FORM PROCESSING (from team-form-processing-utils)
	// ========================

	/**
	 * Extract form data from DOM form element
	 */
	extractFormData(form: HTMLFormElement): TeamFormData {
		const formData = new FormData(form);
		return {
			name: (formData.get("name") as string) || "",
			description: (formData.get("description") as string) || "",
			velocity_baseline: (formData.get("velocity_baseline") as string) || "0",
			sprint_length_days: (formData.get("sprint_length_days") as string) || "14",
			working_days_per_week: (formData.get("working_days_per_week") as string) || "5"
		};
	}

	/**
	 * Create form validator with custom rules
	 */
	createFormValidator(
		config: FormFieldConfig[]
	): (data: Record<string, unknown>) => { isValid: boolean; errors: Record<string, string> } {
		return (data: Record<string, unknown>) => {
			const errors: Record<string, string> = {};

			for (const field of config) {
				const value = data[field.name];

				// Check required fields
				if (field.required && (value === undefined || value === null || value === "")) {
					errors[field.name] = `${field.name} is required`;
					continue;
				}

				// Type validation
				if (value !== undefined && value !== null && value !== "") {
					if (field.type === "number" && typeof value !== "number" && isNaN(Number(value))) {
						errors[field.name] = `${field.name} must be a number`;
					} else if (field.type === "string" && typeof value !== "string") {
						errors[field.name] = `${field.name} must be a string`;
					} else if (field.type === "boolean" && typeof value !== "boolean") {
						errors[field.name] = `${field.name} must be a boolean`;
					}
				}

				// Custom validators
				if (field.validators?.length && value !== undefined) {
					for (const validator of field.validators) {
						const result = validator(value);
						if (!result.isValid) {
							errors[field.name] = result.error ?? `${field.name} validation failed`;
							break;
						}
					}
				}
			}

			return {
				isValid: Object.keys(errors).length === 0,
				errors
			};
		};
	}

	// ========================
	// UI INTEGRATION (from team-management-ui-utils)
	// ========================

	/**
	 * Render user search results in the UI
	 */
	renderUserSearchResults(users: User[], containerId: string): void {
		// Check if we're in a DOM environment
		if (typeof document === "undefined") {
			return;
		}

		const container = document.getElementById(containerId);
		if (!container) {
			return;
		}

		container.innerHTML = users
			.map(
				user => `
			<div class="user-result" data-user-id="${user.id}">
				<div class="user-info">
					<strong>${sanitizeInput(user.first_name)} ${sanitizeInput(user.last_name)}</strong>
					<span class="user-email">${sanitizeInput(user.email)}</span>
					<span class="user-role">${sanitizeInput(user.role)}</span>
				</div>
				<button class="btn btn-primary btn-small" data-action="add-user" data-user-id="${user.id}">
					Add to Team
				</button>
			</div>
		`
			)
			.join("");
	}

	/**
	 * Handle user search functionality
	 */
	async handleUserSearch(searchTerm: string, callback: (users: User[]) => void): Promise<void> {
		try {
			if (!searchTerm || searchTerm.trim().length < 2) {
				callback([]);
				return;
			}

			const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
			if (!response.ok) {
				throw new Error("Search failed");
			}

			const users = (await response.json()) as User[];
			callback(users);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("User search error:", error);
			callback([]);
		}
	}

	/**
	 * Show team management UI
	 */
	showTeamManagementUI(_teamId: string, containerId: string): void {
		// Check if we're in a DOM environment
		if (typeof document === "undefined") {
			return;
		}

		const container = document.getElementById(containerId);
		if (!container) {
			return;
		}

		container.innerHTML = `
			<div class="team-management">
				<h3>Manage Team Members</h3>
				<div class="search-section">
					<input type="text" id="user-search" placeholder="Search users..." class="form-control">
					<div id="search-results" class="search-results"></div>
				</div>
				<div class="members-section">
					<h4>Current Members</h4>
					<div id="team-members" class="team-members"></div>
				</div>
			</div>
		`;

		// Setup search handler (only in DOM environment)
		if (typeof document !== "undefined") {
			const searchInput = document.getElementById("user-search") as HTMLInputElement;
			if (searchInput) {
				let searchTimeout: NodeJS.Timeout;
				searchInput.addEventListener("input", e => {
					clearTimeout(searchTimeout);
					searchTimeout = setTimeout(() => {
						const target = e.target as HTMLInputElement;
						void this.handleUserSearch(target.value, users => {
							this.renderUserSearchResults(users, "search-results");
						});
					}, 300);
				});
			}
		}
	}
}

// Export singleton instance for consistent usage across the application
export const teamCore = new TeamCore();

// Export individual functions for backward compatibility during migration
export const validateTeamData = teamCore.validateTeamData.bind(teamCore);
export const processTeamFormData = teamCore.processTeamFormData.bind(teamCore);
export const createTeamDisplayData = teamCore.createTeamDisplayData.bind(teamCore);
export const calculateTeamCapacity = teamCore.calculateTeamCapacity.bind(teamCore);
export const filterAndSortTeams = teamCore.filterAndSortTeams.bind(teamCore);
export const validateTeamInput = teamCore.validateTeamInput.bind(teamCore);
export const validateSprintLength = teamCore.validateSprintLength.bind(teamCore);
export const validateWorkingDays = teamCore.validateWorkingDays.bind(teamCore);
export const addMemberWithRole = teamCore.addMemberWithRole.bind(teamCore);
export const getTeamMemberships = teamCore.getTeamMemberships.bind(teamCore);
export const updateMemberRole = teamCore.updateMemberRole.bind(teamCore);
export const extractFormData = teamCore.extractFormData.bind(teamCore);
export const createFormValidator = teamCore.createFormValidator.bind(teamCore);
export const renderUserSearchResults = teamCore.renderUserSearchResults.bind(teamCore);
export const handleUserSearch = teamCore.handleUserSearch.bind(teamCore);
export const showTeamManagementUI = teamCore.showTeamManagementUI.bind(teamCore);
