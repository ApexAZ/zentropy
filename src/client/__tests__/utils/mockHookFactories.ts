/**
 * Mock Hook Factories
 * 
 * Provides consistent, reusable mock implementations for common hooks.
 * Following CLAUDE.md principles for shared test utilities.
 */

import { vi } from "vitest";
import { OrganizationFactory, ProjectFactory, AccountSecurityFactory } from "./testDataFactories";

/**
 * useOrganization Mock Factory
 */
export class MockUseOrganizationFactory {
	static create(overrides: any = {}) {
		return {
			organizations: OrganizationFactory.createMultiple(2),
			currentOrganization: null,
			isLoading: false,
			error: "",
			toast: null,
			setToast: vi.fn(),
			checkDomain: vi.fn(),
			loadOrganizations: vi.fn(),
			getOrganizationById: vi.fn(),
			createOrganization: vi.fn(),
			updateOrganization: vi.fn(),
			deleteOrganization: vi.fn(),
			joinOrganization: vi.fn(),
			leaveOrganization: vi.fn(),
			...overrides
		};
	}

	static createLoading(overrides: any = {}) {
		return this.create({
			isLoading: true,
			organizations: [],
			...overrides
		});
	}

	static createWithError(error: string = "Failed to load organizations") {
		return this.create({
			error,
			organizations: []
		});
	}
}

/**
 * useProject Mock Factory
 */
export class MockUseProjectFactory {
	static create(overrides: any = {}) {
		return {
			projects: [],
			currentProject: null,
			isLoading: false,
			error: "",
			toast: null,
			setToast: vi.fn(),
			loadProjects: vi.fn(),
			loadProjectsByOrganization: vi.fn(),
			getProjectById: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			archiveProject: vi.fn(),
			restoreProject: vi.fn(),
			validateProject: vi.fn(),
			...overrides
		};
	}

	static createWithProjects(count: number = 3, organizationId: string = "org-1") {
		return this.create({
			projects: ProjectFactory.createMultiple(count, organizationId)
		});
	}

	static createLoading(overrides: any = {}) {
		return this.create({
			isLoading: true,
			projects: [],
			...overrides
		});
	}
}

/**
 * useAccountSecurity Mock Factory
 */
export class MockUseAccountSecurityFactory {
	static create(overrides: any = {}) {
		return {
			securityStatus: AccountSecurityFactory.createEmailOnly(),
			loading: false,
			error: null,
			linkingLoading: false,
			unlinkingLoading: false,
			googleOAuthReady: true,
			oauthLoading: false,
			optimisticSecurityStatus: null,
			loadSecurityStatus: vi.fn(),
			handleLinkGoogle: vi.fn(),
			handleUnlinkGoogle: vi.fn(),
			...overrides
		};
	}

	static createLoading(overrides: any = {}) {
		return this.create({
			securityStatus: null,
			loading: true,
			...overrides
		});
	}

	static createWithError(error: string = "Failed to load security status") {
		return this.create({
			securityStatus: null,
			error,
			...overrides
		});
	}

	static createHybridAccount(overrides: any = {}) {
		return this.create({
			securityStatus: AccountSecurityFactory.createHybrid(),
			...overrides
		});
	}
}

/**
 * useMultiProviderOAuth Mock Factory
 */
export class MockUseMultiProviderOAuthFactory {
	static create(overrides: any = {}) {
		return {
			providers: [
				{
					name: "google",
					displayName: "Google",
					iconClass: "fab fa-google",
					brandColor: "#4285f4"
				},
				{
					name: "microsoft",
					displayName: "Microsoft",
					iconClass: "fab fa-microsoft",
					brandColor: "#0078d4"
				},
				{
					name: "github",
					displayName: "GitHub",
					iconClass: "fab fa-github",
					brandColor: "#333"
				}
			],
			linkProvider: vi.fn(),
			unlinkProvider: vi.fn(),
			getProviderState: vi.fn().mockReturnValue({
				isReady: true,
				isLoading: false,
				error: null
			}),
			isProviderLinked: vi.fn().mockReturnValue(false),
			...overrides
		};
	}

	static createWithLinkedProvider(providerName: string) {
		return this.create({
			isProviderLinked: vi.fn().mockImplementation((name: string) => name === providerName)
		});
	}

	static createWithLoadingProvider(providerName: string) {
		return this.create({
			getProviderState: vi.fn().mockImplementation((name: string) => ({
				isReady: name !== providerName,
				isLoading: name === providerName,
				error: null
			}))
		});
	}
}

/**
 * Utility function to clear all mock functions in an object
 */
export function clearAllMockFunctions(mockObject: any): void {
	Object.values(mockObject).forEach(value => {
		if (typeof value === "function" && "mockClear" in value) {
			(value as any).mockClear();
		}
	});
}