import { useState, useCallback } from "react";
import { OrganizationService } from "../services/OrganizationService";
import { useToast } from "../contexts/ToastContext";
import type {
	Organization,
	CreateOrganizationData,
	UpdateOrganizationData,
	DomainCheckResult,
	JoinOrganizationResult,
	OrganizationListResponse
} from "../types";

export interface UseOrganizationResult {
	// Data state
	organizations: Organization[];
	currentOrganization: Organization | null;
	isLoading: boolean;
	error: string;

	// Domain checking
	checkDomain: (email: string) => Promise<DomainCheckResult>;

	// Data loading actions
	loadOrganizations: (page?: number, limit?: number, scope?: string, domain?: string) => Promise<void>;
	getOrganizationById: (id: string) => Promise<void>;

	// CRUD actions
	createOrganization: (data: CreateOrganizationData) => Promise<void>;
	updateOrganization: (id: string, data: UpdateOrganizationData) => Promise<void>;
	deleteOrganization: (id: string) => Promise<void>;

	// Organization membership actions
	joinOrganization: (id: string) => Promise<JoinOrganizationResult>;
	leaveOrganization: (id: string) => Promise<void>;
}

export const useOrganization = (): UseOrganizationResult => {
	// State management
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");

	// Centralized toast notifications
	const { showSuccess, showError } = useToast();

	// Domain checking
	const checkDomain = useCallback(async (email: string): Promise<DomainCheckResult> => {
		try {
			setError("");
			return await OrganizationService.checkDomain(email);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Domain check failed";
			setError(errorMessage);
			throw err;
		}
	}, []);

	// Load organizations with pagination and filtering
	const loadOrganizations = useCallback(
		async (page: number = 1, limit: number = 50, scope?: string, domain?: string): Promise<void> => {
			try {
				setIsLoading(true);
				setError("");

				const filters: {
					page: number;
					limit: number;
					scope?: "personal" | "shared" | "enterprise";
					domain?: string;
				} = { page, limit };

				if (scope) filters.scope = scope as "personal" | "shared" | "enterprise";
				if (domain) filters.domain = domain;

				const response: OrganizationListResponse = await OrganizationService.getAll(filters);
				setOrganizations(response.organizations);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to load organizations";
				setError(errorMessage);
				setOrganizations([]);
			} finally {
				setIsLoading(false);
			}
		},
		[]
	);

	// Get organization by ID
	const getOrganizationById = useCallback(async (id: string): Promise<void> => {
		try {
			setError("");

			const organization = await OrganizationService.getById(id);
			setCurrentOrganization(organization);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to get organization";
			setError(errorMessage);
			setCurrentOrganization(null);
		}
	}, []);

	// Create organization
	const createOrganization = useCallback(
		async (data: CreateOrganizationData): Promise<void> => {
			try {
				await OrganizationService.create(data);
				showSuccess("Organization created successfully!");

				// Reload organizations to reflect the new organization
				await loadOrganizations();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to create organization";
				showError(errorMessage);
			}
		},
		[loadOrganizations, showSuccess, showError]
	);

	// Update organization
	const updateOrganization = useCallback(
		async (id: string, data: UpdateOrganizationData): Promise<void> => {
			try {
				await OrganizationService.update(id, data);
				showSuccess("Organization updated successfully!");

				// Reload organizations to reflect the changes
				await loadOrganizations();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to update organization";
				showError(errorMessage);
			}
		},
		[loadOrganizations, showSuccess, showError]
	);

	// Delete organization
	const deleteOrganization = useCallback(
		async (id: string): Promise<void> => {
			try {
				await OrganizationService.delete(id);
				showSuccess("Organization deleted successfully!");

				// Reload organizations to reflect the deletion
				await loadOrganizations();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to delete organization";
				showError(errorMessage);
			}
		},
		[loadOrganizations, showSuccess, showError]
	);

	// Join organization
	const joinOrganization = useCallback(
		async (id: string): Promise<JoinOrganizationResult> => {
			try {
				const result = await OrganizationService.join(id);
				showSuccess("Successfully joined organization!");
				return result;
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to join organization";
				showError(errorMessage);
				throw err;
			}
		},
		[showSuccess, showError]
	);

	// Leave organization
	const leaveOrganization = useCallback(
		async (id: string): Promise<void> => {
			try {
				await OrganizationService.leave(id);
				showSuccess("Successfully left organization!");
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to leave organization";
				showError(errorMessage);
			}
		},
		[showSuccess, showError]
	);

	return {
		// Data state
		organizations,
		currentOrganization,
		isLoading,
		error,

		// Domain checking
		checkDomain,

		// Data loading actions
		loadOrganizations,
		getOrganizationById,

		// CRUD actions
		createOrganization,
		updateOrganization,
		deleteOrganization,

		// Organization membership actions
		joinOrganization,
		leaveOrganization
	};
};
