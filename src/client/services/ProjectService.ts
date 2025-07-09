import type {
	Project,
	CreateProjectData,
	UpdateProjectData,
	ProjectListResponse,
	ProjectValidationResult
} from "../types";
import { createAuthHeaders } from "../utils/auth";

/**
 * ProjectService - Just-in-Time Organization System Integration
 *
 * This service provides API integration for project management that supports
 * the just-in-time organization system where project creation drives
 * organization assignment decisions and enables frictionless project workflows.
 */
export class ProjectService {
	private static readonly API_BASE = "/api/v1/projects";

	/**
	 * Handle API response errors consistently with improved error classification
	 *
	 * @param response - The fetch Response object
	 * @returns Parsed JSON response data
	 * @throws Error with appropriate message based on response status
	 */
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({
				message: "Unknown error"
			}));

			// Classify error types for better user experience
			const errorMessage =
				errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

			// Add context for common HTTP status codes
			if (response.status === 401) {
				throw new Error("Authentication required. Please sign in again.");
			} else if (response.status === 403) {
				throw new Error("You don't have permission to perform this action.");
			} else if (response.status === 404) {
				throw new Error("The requested resource was not found.");
			} else if (response.status === 422) {
				throw new Error(`Validation error: ${errorMessage}`);
			} else if (response.status >= 500) {
				throw new Error("Server error. Please try again later.");
			}

			throw new Error(errorMessage);
		}
		return response.json();
	}

	/**
	 * Create a new project with organization decision workflow
	 *
	 * This supports the just-in-time organization workflow where:
	 * - Personal projects can be created without organization assignment
	 * - Team/organization projects require organization assignment
	 * - Project creation can trigger organization creation/joining workflow
	 *
	 * @param projectData - Project creation data
	 * @returns Created project
	 */
	static async create(projectData: CreateProjectData): Promise<Project> {
		const response = await fetch(`${this.API_BASE}/`, {
			method: "POST",
			headers: createAuthHeaders(),
			body: JSON.stringify(projectData)
		});

		return this.handleResponse<Project>(response);
	}

	/**
	 * Get all projects with optional filtering and pagination
	 *
	 * @param filters - Optional filters for status, visibility, pagination
	 * @returns List of projects with pagination info
	 */
	static async getAll(filters?: {
		page?: number;
		limit?: number;
		status?: "active" | "completed" | "archived";
		visibility?: "personal" | "team" | "organization";
		organization_id?: string;
	}): Promise<ProjectListResponse> {
		const params = new URLSearchParams();

		if (filters?.page) params.append("page", filters.page.toString());
		if (filters?.limit) params.append("limit", filters.limit.toString());
		if (filters?.status) params.append("status", filters.status);
		if (filters?.visibility) params.append("visibility", filters.visibility);
		if (filters?.organization_id) params.append("organization_id", filters.organization_id);

		const url = params.toString() ? `${this.API_BASE}/?${params.toString()}` : `${this.API_BASE}/`;

		const response = await fetch(url, {
			method: "GET",
			headers: createAuthHeaders()
		});

		return this.handleResponse<ProjectListResponse>(response);
	}

	/**
	 * Get project by ID
	 *
	 * @param projectId - Project UUID
	 * @returns Project details
	 */
	static async getById(projectId: string): Promise<Project> {
		const response = await fetch(`${this.API_BASE}/${projectId}`, {
			method: "GET",
			headers: createAuthHeaders()
		});

		return this.handleResponse<Project>(response);
	}

	/**
	 * Update project information
	 *
	 * This supports the just-in-time organization workflow by allowing:
	 * - Personal to team project upgrades with organization assignment
	 * - Project visibility changes based on organization context
	 * - Project status transitions (active → completed → archived)
	 *
	 * @param projectId - Project UUID
	 * @param updateData - Fields to update
	 * @returns Updated project
	 */
	static async update(projectId: string, updateData: UpdateProjectData): Promise<Project> {
		const response = await fetch(`${this.API_BASE}/${projectId}`, {
			method: "PUT",
			headers: createAuthHeaders(),
			body: JSON.stringify(updateData)
		});

		return this.handleResponse<Project>(response);
	}

	/**
	 * Delete project
	 *
	 * @param projectId - Project UUID
	 */
	static async delete(projectId: string): Promise<void> {
		const response = await fetch(`${this.API_BASE}/${projectId}`, {
			method: "DELETE",
			headers: createAuthHeaders()
		});

		await this.handleResponse(response);
	}

	/**
	 * Validate project data before submission
	 *
	 * This includes validation for the just-in-time organization workflow:
	 * - Personal projects cannot have organization assignment
	 * - Team/organization projects require organization assignment
	 * - Project visibility and organization consistency
	 *
	 * @param data - Project data to validate
	 * @returns Validation result with errors
	 */
	static validate(data: CreateProjectData | UpdateProjectData): ProjectValidationResult {
		const errors: Record<string, string> = {};

		// Validate required name for create operations
		if ("name" in data) {
			if (!data.name?.trim()) {
				errors.name = "Project name is required";
			} else if (data.name.length > 255) {
				errors.name = "Project name must be less than 255 characters";
			}
		}

		// Validate description length if provided
		if (data.description && data.description.length > 2000) {
			errors.description = "Description must be less than 2000 characters";
		}

		// Validate visibility and organization constraints
		if (data.visibility) {
			if (data.visibility === "personal" && data.organization_id) {
				errors.organization_id = "Personal projects cannot be assigned to an organization";
			}

			if ((data.visibility === "team" || data.visibility === "organization") && !data.organization_id) {
				errors.organization_id = "Team and organization projects require an organization";
			}
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Get projects by organization ID
	 *
	 * @param organizationId - Organization UUID
	 * @param page - Page number for pagination
	 * @param limit - Items per page for pagination
	 * @param status - Optional status filter
	 * @returns Projects belonging to the organization
	 */
	static async getByOrganization(
		organizationId: string,
		page: number = 1,
		limit: number = 50,
		status?: "active" | "completed" | "archived"
	): Promise<ProjectListResponse> {
		const filters: {
			page: number;
			limit: number;
			status?: "active" | "completed" | "archived";
			organization_id: string;
		} = {
			page,
			limit,
			organization_id: organizationId
		};

		if (status) {
			filters.status = status;
		}

		return this.getAll(filters);
	}

	/**
	 * Get personal projects for current user
	 *
	 * @param filters - Optional filters for status
	 * @returns Personal projects
	 */
	static async getPersonalProjects(filters?: {
		status?: "active" | "completed" | "archived";
	}): Promise<ProjectListResponse> {
		return this.getAll({
			visibility: "personal",
			...filters
		});
	}

	/**
	 * Upgrade personal project to team project
	 *
	 * This supports the just-in-time organization workflow where users
	 * can upgrade personal projects to team projects when they need collaboration.
	 *
	 * @param projectId - Project UUID to upgrade
	 * @param organizationId - Organization to assign project to
	 * @returns Updated project
	 */
	static async upgradeToTeamProject(projectId: string, organizationId: string): Promise<Project> {
		return this.update(projectId, {
			visibility: "team",
			organization_id: organizationId
		});
	}

	/**
	 * Change project status
	 *
	 * @param projectId - Project UUID
	 * @param status - New project status
	 * @returns Updated project
	 */
	static async changeStatus(projectId: string, status: "active" | "completed" | "archived"): Promise<Project> {
		return this.update(projectId, { status });
	}

	/**
	 * Complete project lifecycle workflow
	 *
	 * This provides a helper for the common workflow of:
	 * active → completed → archived
	 *
	 * @param projectId - Project UUID
	 * @returns Updated project
	 */
	static async completeProject(projectId: string): Promise<Project> {
		return this.changeStatus(projectId, "completed");
	}

	/**
	 * Archive project
	 *
	 * @param projectId - Project UUID
	 * @returns Updated project
	 */
	static async archiveProject(projectId: string): Promise<Project> {
		return this.changeStatus(projectId, "archived");
	}

	/**
	 * Reactivate archived project
	 *
	 * @param projectId - Project UUID
	 * @returns Updated project
	 */
	static async reactivateProject(projectId: string): Promise<Project> {
		return this.changeStatus(projectId, "active");
	}

	/**
	 * Archive project (alias for archiveProject)
	 *
	 * @param projectId - Project UUID
	 * @returns Updated project
	 */
	static async archive(projectId: string): Promise<Project> {
		return this.archiveProject(projectId);
	}

	/**
	 * Restore archived project (alias for reactivateProject)
	 *
	 * @param projectId - Project UUID
	 * @returns Updated project
	 */
	static async restore(projectId: string): Promise<Project> {
		return this.reactivateProject(projectId);
	}

	/**
	 * Check if project name is available for current user
	 *
	 * This is a client-side helper that doesn't make an API call.
	 * The actual uniqueness validation happens on the server.
	 *
	 * @param name - Project name to check
	 * @returns Basic validation result
	 */
	static validateProjectName(name: string): { isValid: boolean; error?: string } {
		if (!name?.trim()) {
			return { isValid: false, error: "Project name is required" };
		}

		if (name.length > 255) {
			return { isValid: false, error: "Project name must be less than 255 characters" };
		}

		// Basic character validation
		if (!/^[a-zA-Z0-9\s\-_.,!?()]+$/.test(name)) {
			return { isValid: false, error: "Project name contains invalid characters" };
		}

		return { isValid: true };
	}

	/**
	 * Get project visibility options based on user context
	 *
	 * This helper determines what visibility options are available
	 * based on whether the user has an organization assignment.
	 *
	 * @param hasOrganization - Whether user is assigned to an organization
	 * @returns Available visibility options
	 */
	static getVisibilityOptions(hasOrganization: boolean): Array<{
		value: "personal" | "team" | "organization";
		label: string;
		description: string;
		disabled: boolean;
	}> {
		return [
			{
				value: "personal",
				label: "Personal",
				description: "Only you can see and edit this project",
				disabled: false
			},
			{
				value: "team",
				label: "Team",
				description: "Team members in your organization can collaborate",
				disabled: !hasOrganization
			},
			{
				value: "organization",
				label: "Organization",
				description: "All organization members can view and contribute",
				disabled: !hasOrganization
			}
		];
	}
}
