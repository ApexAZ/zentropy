/**
 * Test Data Factories
 *
 * Provides consistent, reusable test data builders for common entities.
 * Following CLAUDE.md principles for shared test utilities.
 */

import { vi } from "vitest";
import type { Organization, Project, AccountSecurityResponse, DomainCheckResult } from "../../types";

/**
 * Organization Test Data Factory
 */
export class OrganizationFactory {
	static create(overrides: Partial<Organization> = {}): Organization {
		return {
			id: "org-1",
			name: "Test Organization",
			short_name: "test",
			domain: "test.com",
			description: "A test organization",
			scope: "shared",
			max_users: 50,
			created_by: "user-1",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
			...overrides
		};
	}

	static createPersonal(overrides: Partial<Organization> = {}): Organization {
		return this.create({
			id: "org-personal",
			name: "Personal Organization",
			short_name: "personal",
			domain: undefined,
			scope: "personal",
			max_users: 1,
			...overrides
		});
	}

	static createMultiple(count: number = 2): Organization[] {
		return Array.from({ length: count }, (_, index) =>
			this.create({
				id: `org-${index + 1}`,
				name: `Organization ${index + 1}`,
				short_name: `org${index + 1}`,
				domain: `org${index + 1}.com`,
				created_at: `2024-01-0${index + 1}T00:00:00Z`,
				updated_at: `2024-01-0${index + 1}T00:00:00Z`
			})
		);
	}
}

/**
 * Project Test Data Factory
 */
export class ProjectFactory {
	static create(overrides: Partial<Project> = {}): Project {
		return {
			id: "proj-1",
			name: "Test Project",
			description: "A test project",
			visibility: "team",
			status: "active",
			organization_id: "org-1",
			created_by: "user-1",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z",
			...overrides
		};
	}

	static createMultiple(count: number = 3, organizationId: string = "org-1"): Project[] {
		return Array.from({ length: count }, (_, index) =>
			this.create({
				id: `proj-${index + 1}`,
				name: `Project ${index + 1}`,
				description: `Test project ${index + 1}`,
				organization_id: organizationId,
				created_at: `2024-01-0${index + 1}T00:00:00Z`,
				updated_at: `2024-01-0${index + 1}T00:00:00Z`
			})
		);
	}
}

/**
 * Account Security Test Data Factory
 */
export class AccountSecurityFactory {
	static createEmailOnly(overrides: Partial<AccountSecurityResponse> = {}): AccountSecurityResponse {
		return {
			email_auth_linked: true,
			google_auth_linked: false,
			google_email: undefined,
			...overrides
		};
	}

	static createHybrid(overrides: Partial<AccountSecurityResponse> = {}): AccountSecurityResponse {
		return {
			email_auth_linked: true,
			google_auth_linked: true,
			google_email: "john@gmail.com",
			...overrides
		};
	}

	static createGoogleOnly(overrides: Partial<AccountSecurityResponse> = {}): AccountSecurityResponse {
		return {
			email_auth_linked: false,
			google_auth_linked: true,
			google_email: "john@gmail.com",
			...overrides
		};
	}
}

/**
 * Domain Check Result Test Data Factory
 */
export class DomainCheckFactory {
	static createFound(organization?: Organization): DomainCheckResult {
		const org = organization || OrganizationFactory.create();
		return {
			domain_found: true,
			domain: org.domain || "test.com",
			organization: org,
			suggestions: {
				action: "join",
				can_join: true,
				can_create: false,
				message: `Organization '${org.name}' exists for ${org.domain}. You can request to join.`
			}
		};
	}

	static createNotFound(domain: string = "newdomain.com"): DomainCheckResult {
		return {
			domain_found: false,
			domain,
			organization: undefined,
			suggestions: {
				action: "create",
				can_join: false,
				can_create: true,
				message: `No organization found for ${domain}. You can create a new organization.`
			}
		};
	}
}

/**
 * Common Test Props Factory
 */
export class TestPropsFactory {
	static createModalProps(overrides: any = {}) {
		return {
			isOpen: true,
			onClose: vi.fn(),
			onSuccess: vi.fn(),
			userEmail: "test@test.com",
			...overrides
		};
	}

	static createAccountSecurityProps(overrides: any = {}) {
		return {
			onSecurityUpdate: vi.fn(),
			onError: vi.fn(),
			...overrides
		};
	}

	static createOrganizationSelectorProps(overrides: any = {}) {
		return {
			isOpen: true,
			onClose: vi.fn(),
			onSelect: vi.fn(),
			userEmail: "test@test.com",
			allowCreate: true,
			allowPersonal: true,
			mode: "select" as const,
			...overrides
		};
	}
}
