import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { useOrganization } from "../useOrganization";
import { ToastProvider } from "../../contexts/ToastContext";
import type { Organization, CreateOrganizationData, DomainCheckResult } from "../../types";

// Mock OrganizationService
vi.mock("../../services/OrganizationService", () => ({
	OrganizationService: {
		checkDomain: vi.fn(),
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		join: vi.fn(),
		leave: vi.fn()
	}
}));

import { OrganizationService } from "../../services/OrganizationService";

// Test wrapper to provide ToastProvider context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
	React.createElement(ToastProvider, null, children);

describe("useOrganization", () => {
	// Mock data
	const mockOrganization: Organization = {
		id: "org-123",
		name: "Test Organization",
		domain: "test.com",
		scope: "shared",
		max_users: 50,
		created_by: "user-123",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z"
	};

	const mockOrganizations: Organization[] = [mockOrganization];

	const mockCreateData: CreateOrganizationData = {
		name: "New Organization",
		domain: "neworg.com",
		scope: "shared",
		max_users: 100
	};

	const mockDomainCheck: DomainCheckResult = {
		domain_found: true,
		domain: "test.com",
		organization: mockOrganization,
		suggestions: {
			action: "join",
			can_join: true,
			can_create: false,
			message: "Organization exists for this domain"
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Initial State", () => {
		it("should start with empty state and loading false", () => {
			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			expect(result.current.organizations).toEqual([]);
			expect(result.current.currentOrganization).toBeNull();
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
		});

		it("should not call any service methods on initialization", () => {
			renderHook(() => useOrganization(), { wrapper: TestWrapper });

			expect(OrganizationService.getAll).not.toHaveBeenCalled();
			expect(OrganizationService.getById).not.toHaveBeenCalled();
			expect(OrganizationService.create).not.toHaveBeenCalled();
		});
	});

	describe("Loading Organizations", () => {
		it("should load organizations successfully", async () => {
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: mockOrganizations,
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.organizations).toEqual(mockOrganizations);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
		});

		it("should handle loading errors", async () => {
			const errorMessage = "Failed to load organizations";
			vi.mocked(OrganizationService.getAll).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.organizations).toEqual([]);
			expect(result.current.error).toBe(errorMessage);
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Organization Operations", () => {
		it("should create organization successfully", async () => {
			vi.mocked(OrganizationService.create).mockResolvedValue(mockOrganization);
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: [mockOrganization],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.createOrganization(mockCreateData);
			});

			expect(OrganizationService.create).toHaveBeenCalledWith(mockCreateData);
			expect(OrganizationService.getAll).toHaveBeenCalled();
		});

		it("should get organization by ID successfully", async () => {
			vi.mocked(OrganizationService.getById).mockResolvedValue(mockOrganization);

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.getOrganizationById("org-123");
			});

			expect(result.current.currentOrganization).toEqual(mockOrganization);
			expect(OrganizationService.getById).toHaveBeenCalledWith("org-123");
		});

		it("should handle join organization", async () => {
			const joinResult = {
				message: "Successfully joined organization",
				status: "approved",
				organization_id: "org-123"
			};
			vi.mocked(OrganizationService.join).mockResolvedValue(joinResult);

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			let response;
			await act(async () => {
				response = await result.current.joinOrganization("org-123");
			});

			expect(OrganizationService.join).toHaveBeenCalledWith("org-123");
			expect(response).toEqual(joinResult);
		});

		it("should handle leave organization", async () => {
			vi.mocked(OrganizationService.leave).mockResolvedValue(undefined);

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.leaveOrganization("org-123");
			});

			expect(OrganizationService.leave).toHaveBeenCalledWith("org-123");
		});
	});

	describe("Domain Checking", () => {
		it("should check domain and return results", async () => {
			vi.mocked(OrganizationService.checkDomain).mockResolvedValue(mockDomainCheck);

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			let domainResult: DomainCheckResult | null = null;
			await act(async () => {
				domainResult = await result.current.checkDomain("test@test.com");
			});

			expect(OrganizationService.checkDomain).toHaveBeenCalledWith("test@test.com");
			expect(domainResult).toEqual(mockDomainCheck);
		});

		it("should handle domain check errors", async () => {
			const errorMessage = "Domain check failed";
			vi.mocked(OrganizationService.checkDomain).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization(), { wrapper: TestWrapper });

			await act(async () => {
				try {
					await result.current.checkDomain("invalid@domain.com");
				} catch (error) {
					expect(error).toBeInstanceOf(Error);
					expect((error as Error).message).toBe(errorMessage);
				}
			});
		});
	});
});
