import type {
	Organization,
	CreateOrganizationData,
	UpdateOrganizationData,
	DomainCheckResult,
	JoinOrganizationResult,
	OrganizationListResponse,
	OrganizationValidationResult
} from "../types";
import { createAuthHeaders } from "../utils/auth";

/**
 * OrganizationService - Just-in-Time Organization System
 *
 * This service provides API integration for organization management that supports
 * the just-in-time organization system where organization creation/assignment
 * is deferred to project creation time, enabling frictionless registration.
 */
export class OrganizationService {
	private static readonly API_BASE = "/api/v1/organizations";

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
	 * Check if an organization exists for the given email domain
	 *
	 * This supports the just-in-time organization workflow by providing
	 * domain-based organization discovery during project creation.
	 *
	 * @param email - Email address to check domain for
	 * @returns Domain check result with organization suggestions
	 */
	static async checkDomain(email: string): Promise<DomainCheckResult> {
		const encodedEmail = encodeURIComponent(email);
		const response = await fetch(`${this.API_BASE}/check-domain?email=${encodedEmail}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		});

		return this.handleResponse<DomainCheckResult>(response);
	}

	/**
	 * Create a new organization
	 *
	 * @param organizationData - Organization creation data
	 * @returns Created organization
	 */
	static async create(organizationData: CreateOrganizationData): Promise<Organization> {
		const response = await fetch(`${this.API_BASE}/`, {
			method: "POST",
			headers: createAuthHeaders(),
			body: JSON.stringify(organizationData)
		});

		return this.handleResponse<Organization>(response);
	}

	/**
	 * Get all organizations with optional filtering and pagination
	 *
	 * @param filters - Optional filters for scope, domain, pagination
	 * @returns List of organizations with pagination info
	 */
	static async getAll(filters?: {
		page?: number;
		limit?: number;
		scope?: "personal" | "shared" | "enterprise";
		domain?: string;
	}): Promise<OrganizationListResponse> {
		const params = new URLSearchParams();

		if (filters?.page) params.append("page", filters.page.toString());
		if (filters?.limit) params.append("limit", filters.limit.toString());
		if (filters?.scope) params.append("scope", filters.scope);
		if (filters?.domain) params.append("domain", filters.domain);

		const url = params.toString() ? `${this.API_BASE}/?${params.toString()}` : `${this.API_BASE}/`;

		const response = await fetch(url, {
			method: "GET",
			headers: createAuthHeaders()
		});

		return this.handleResponse<OrganizationListResponse>(response);
	}

	/**
	 * Get organization by ID
	 *
	 * @param organizationId - Organization UUID
	 * @returns Organization details
	 */
	static async getById(organizationId: string): Promise<Organization> {
		const response = await fetch(`${this.API_BASE}/${organizationId}`, {
			method: "GET",
			headers: createAuthHeaders()
		});

		return this.handleResponse<Organization>(response);
	}

	/**
	 * Update organization information
	 *
	 * @param organizationId - Organization UUID
	 * @param updateData - Fields to update
	 * @returns Updated organization
	 */
	static async update(organizationId: string, updateData: UpdateOrganizationData): Promise<Organization> {
		const response = await fetch(`${this.API_BASE}/${organizationId}`, {
			method: "PUT",
			headers: createAuthHeaders(),
			body: JSON.stringify(updateData)
		});

		return this.handleResponse<Organization>(response);
	}

	/**
	 * Delete organization
	 *
	 * @param organizationId - Organization UUID
	 */
	static async delete(organizationId: string): Promise<void> {
		const response = await fetch(`${this.API_BASE}/${organizationId}`, {
			method: "DELETE",
			headers: createAuthHeaders()
		});

		await this.handleResponse(response);
	}

	/**
	 * Request to join an organization
	 *
	 * This supports the just-in-time organization workflow by allowing
	 * users to join organizations during project creation.
	 *
	 * @param organizationId - Organization UUID to join
	 * @returns Join request result
	 */
	static async join(organizationId: string): Promise<JoinOrganizationResult> {
		const response = await fetch(`${this.API_BASE}/${organizationId}/join`, {
			method: "POST",
			headers: createAuthHeaders()
		});

		return this.handleResponse<JoinOrganizationResult>(response);
	}

	/**
	 * Leave an organization
	 *
	 * @param organizationId - Organization UUID to leave
	 */
	static async leave(organizationId: string): Promise<void> {
		const response = await fetch(`${this.API_BASE}/${organizationId}/leave`, {
			method: "POST",
			headers: createAuthHeaders()
		});

		await this.handleResponse(response);
	}

	/**
	 * Validate organization data before submission
	 *
	 * @param data - Organization data to validate
	 * @returns Validation result with errors
	 */
	static validate(data: CreateOrganizationData): OrganizationValidationResult {
		const errors: Record<string, string> = {};

		// Validate required name
		if (!data.name?.trim()) {
			errors.name = "Organization name is required";
		} else if (data.name.length > 255) {
			errors.name = "Organization name must be less than 255 characters";
		}

		// Validate domain format if provided
		if (data.domain) {
			const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
			if (!domainRegex.test(data.domain)) {
				errors.domain = "Invalid domain format";
			}
		}

		// Validate scope-specific rules
		if (data.scope === "personal" && data.max_users && data.max_users > 1) {
			errors.max_users = "Personal organizations cannot have more than 1 user";
		}

		// Validate max_users is positive if provided
		if (data.max_users !== undefined && data.max_users !== null && data.max_users <= 0) {
			errors.max_users = "Maximum users must be a positive number";
		}

		// Validate description length if provided
		if (data.description && data.description.length > 1000) {
			errors.description = "Description must be less than 1000 characters";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Extract domain from email address
	 *
	 * @param email - Email address
	 * @returns Domain portion of email
	 */
	static extractDomainFromEmail(email: string): string {
		const parts = email.split("@");
		if (parts.length !== 2 || !parts[1]) {
			throw new Error("Invalid email format");
		}
		return parts[1].toLowerCase();
	}

	/**
	 * Check if domain is a personal email provider
	 *
	 * @param domain - Domain to check
	 * @returns True if domain is a personal email provider
	 */
	static isPersonalEmailDomain(domain: string): boolean {
		const personalDomains = [
			"gmail.com",
			"yahoo.com",
			"hotmail.com",
			"outlook.com",
			"icloud.com",
			"protonmail.com",
			"aol.com",
			"mail.com",
			"yandex.com",
			"zoho.com"
		];
		return personalDomains.includes(domain.toLowerCase());
	}

	/**
	 * Generate organization name suggestion from domain
	 *
	 * @param domain - Domain to generate name from
	 * @returns Suggested organization name
	 */
	static generateNameSuggestion(domain: string): string {
		// Remove TLD and convert to title case
		const name = domain.split(".")[0];
		if (!name) {
			throw new Error("Invalid domain format");
		}
		// Remove hyphens and underscores, replace with spaces
		const cleanName = name.replace(/[-_]/g, " ");
		// Convert to title case
		return cleanName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
	}
}
