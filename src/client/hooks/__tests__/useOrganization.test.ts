import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useOrganization } from "../useOrganization";
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

	const mockOrganizations: Organization[] = [
		mockOrganization,
		{
			id: "org-456",
			name: "Another Org",
			scope: "personal",
			created_at: "2024-01-02T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		}
	];

	const mockCreateData: CreateOrganizationData = {
		name: "New Organization",
		domain: "neworg.com",
		scope: "shared",
		max_users: 25,
		description: "A new test organization"
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

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initial State", () => {
		it("should start with empty state and loading false", () => {
			const { result } = renderHook(() => useOrganization());

			expect(result.current.organizations).toEqual([]);
			expect(result.current.currentOrganization).toBeNull();
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
			expect(result.current.toast).toBeNull();
		});

		it("should not call any service methods on initialization", () => {
			renderHook(() => useOrganization());

			expect(OrganizationService.getAll).not.toHaveBeenCalled();
			expect(OrganizationService.getById).not.toHaveBeenCalled();
		});
	});

	describe("Domain Checking", () => {
		it("should check domain and return results", async () => {
			vi.mocked(OrganizationService.checkDomain).mockResolvedValue(mockDomainCheck);

			const { result } = renderHook(() => useOrganization());

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

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				try {
					await result.current.checkDomain("invalid@domain.com");
				} catch (error) {
					expect(error).toBeInstanceOf(Error);
					expect((error as Error).message).toBe(errorMessage);
				}
			});

			expect(result.current.error).toBe(errorMessage);
		});
	});

	describe("Loading Organizations", () => {
		it("should load all organizations successfully", async () => {
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: mockOrganizations,
				total: 2,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.organizations).toEqual(mockOrganizations);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
			expect(OrganizationService.getAll).toHaveBeenCalledWith({ page: 1, limit: 50 });
		});

		it("should handle pagination parameters", async () => {
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: [mockOrganization],
				total: 1,
				page: 2,
				limit: 10
			});

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.loadOrganizations(2, 10, "shared", "test.com");
			});

			expect(OrganizationService.getAll).toHaveBeenCalledWith({
				page: 2,
				limit: 10,
				scope: "shared",
				domain: "test.com"
			});
		});

		it("should handle loading errors and set error state", async () => {
			const errorMessage = "Failed to load organizations";
			vi.mocked(OrganizationService.getAll).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.organizations).toEqual([]);
			expect(result.current.error).toBe(errorMessage);
			expect(result.current.isLoading).toBe(false);
		});

		it("should set loading state during API call", async () => {
			let resolvePromise: (value: any) => void;
			const loadPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			vi.mocked(OrganizationService.getAll).mockReturnValue(loadPromise as any);

			const { result } = renderHook(() => useOrganization());

			act(() => {
				result.current.loadOrganizations();
			});

			expect(result.current.isLoading).toBe(true);

			await act(async () => {
				resolvePromise!({
					organizations: mockOrganizations,
					total: 2,
					page: 1,
					limit: 50
				});
				await loadPromise;
			});

			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Get Organization by ID", () => {
		it("should get organization by ID successfully", async () => {
			vi.mocked(OrganizationService.getById).mockResolvedValue(mockOrganization);

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.getOrganizationById("org-123");
			});

			expect(result.current.currentOrganization).toEqual(mockOrganization);
			expect(OrganizationService.getById).toHaveBeenCalledWith("org-123");
		});

		it("should handle get by ID errors", async () => {
			const errorMessage = "Organization not found";
			vi.mocked(OrganizationService.getById).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.getOrganizationById("invalid-id");
			});

			expect(result.current.currentOrganization).toBeNull();
			expect(result.current.error).toBe(errorMessage);
		});
	});

	describe("Creating Organizations", () => {
		it("should create organization successfully", async () => {
			vi.mocked(OrganizationService.create).mockResolvedValue(mockOrganization);
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: [...mockOrganizations, mockOrganization],
				total: 3,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.createOrganization(mockCreateData);
			});

			expect(OrganizationService.create).toHaveBeenCalledWith(mockCreateData);
			expect(result.current.toast).toEqual({
				message: "Organization created successfully!",
				type: "success"
			});
			expect(OrganizationService.getAll).toHaveBeenCalled();
		});

		it("should handle create errors and show error toast", async () => {
			const errorMessage = "Organization name already exists";
			vi.mocked(OrganizationService.create).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.createOrganization(mockCreateData);
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
			expect(OrganizationService.getAll).not.toHaveBeenCalled();
		});
	});

	describe("Updating Organizations", () => {
		it("should update organization successfully", async () => {
			const updatedOrg = { ...mockOrganization, name: "Updated Name" };
			vi.mocked(OrganizationService.update).mockResolvedValue(updatedOrg);
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: [updatedOrg],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.updateOrganization("org-123", { name: "Updated Name" });
			});

			expect(OrganizationService.update).toHaveBeenCalledWith("org-123", { name: "Updated Name" });
			expect(result.current.toast).toEqual({
				message: "Organization updated successfully!",
				type: "success"
			});
		});

		it("should handle update errors", async () => {
			const errorMessage = "Update failed";
			vi.mocked(OrganizationService.update).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.updateOrganization("org-123", { name: "New Name" });
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Deleting Organizations", () => {
		it("should delete organization successfully", async () => {
			vi.mocked(OrganizationService.delete).mockResolvedValue(undefined);
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: [],
				total: 0,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.deleteOrganization("org-123");
			});

			expect(OrganizationService.delete).toHaveBeenCalledWith("org-123");
			expect(result.current.toast).toEqual({
				message: "Organization deleted successfully!",
				type: "success"
			});
		});

		it("should handle delete errors", async () => {
			const errorMessage = "Cannot delete organization with active members";
			vi.mocked(OrganizationService.delete).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.deleteOrganization("org-123");
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Joining Organizations", () => {
		it("should join organization successfully", async () => {
			const joinResult = {
				message: "Successfully joined organization",
				status: "approved",
				organization_id: "org-123"
			};
			vi.mocked(OrganizationService.join).mockResolvedValue(joinResult);

			const { result } = renderHook(() => useOrganization());

			let response;
			await act(async () => {
				response = await result.current.joinOrganization("org-123");
			});

			expect(OrganizationService.join).toHaveBeenCalledWith("org-123");
			expect(response).toEqual(joinResult);
			expect(result.current.toast).toEqual({
				message: "Successfully joined organization!",
				type: "success"
			});
		});

		it("should handle join errors", async () => {
			const errorMessage = "Organization is at capacity";
			vi.mocked(OrganizationService.join).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				try {
					await result.current.joinOrganization("org-123");
				} catch (error) {
					expect(error).toBeInstanceOf(Error);
				}
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Leaving Organizations", () => {
		it("should leave organization successfully", async () => {
			vi.mocked(OrganizationService.leave).mockResolvedValue(undefined);

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.leaveOrganization("org-123");
			});

			expect(OrganizationService.leave).toHaveBeenCalledWith("org-123");
			expect(result.current.toast).toEqual({
				message: "Successfully left organization!",
				type: "success"
			});
		});

		it("should handle leave errors", async () => {
			const errorMessage = "Cannot leave organization as sole owner";
			vi.mocked(OrganizationService.leave).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.leaveOrganization("org-123");
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Toast Management", () => {
		it("should allow setting custom toast messages", () => {
			const { result } = renderHook(() => useOrganization());

			const customToast = { message: "Custom message", type: "success" as const };

			act(() => {
				result.current.setToast(customToast);
			});

			expect(result.current.toast).toEqual(customToast);
		});

		it("should allow clearing toast messages", () => {
			const { result } = renderHook(() => useOrganization());

			// Set a toast first
			act(() => {
				result.current.setToast({ message: "Test", type: "success" });
			});

			expect(result.current.toast).not.toBeNull();

			// Clear the toast
			act(() => {
				result.current.setToast(null);
			});

			expect(result.current.toast).toBeNull();
		});
	});

	describe("State Consistency", () => {
		it("should clear error when starting new operations", async () => {
			// First set an error state
			vi.mocked(OrganizationService.getAll).mockRejectedValue(new Error("Initial error"));

			const { result } = renderHook(() => useOrganization());

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.error).toBe("Initial error");

			// Now make a successful call
			vi.mocked(OrganizationService.getAll).mockResolvedValue({
				organizations: mockOrganizations,
				total: 2,
				page: 1,
				limit: 50
			});

			await act(async () => {
				await result.current.loadOrganizations();
			});

			expect(result.current.error).toBe("");
		});

		it("should handle concurrent operations correctly", async () => {
			let resolveFirst: (value: any) => void;
			let resolveSecond: (value: any) => void;

			const firstPromise = new Promise(resolve => {
				resolveFirst = resolve;
			});
			const secondPromise = new Promise(resolve => {
				resolveSecond = resolve;
			});

			vi.mocked(OrganizationService.getAll)
				.mockReturnValueOnce(firstPromise as any)
				.mockReturnValueOnce(secondPromise as any);

			const { result } = renderHook(() => useOrganization());

			// Start two concurrent operations
			act(() => {
				result.current.loadOrganizations();
				result.current.loadOrganizations();
			});

			expect(result.current.isLoading).toBe(true);

			// Resolve second operation first
			await act(async () => {
				resolveSecond!({
					organizations: [mockOrganization],
					total: 1,
					page: 1,
					limit: 50
				});
				await secondPromise;
			});

			// Then resolve first operation
			await act(async () => {
				resolveFirst!({
					organizations: mockOrganizations,
					total: 2,
					page: 1,
					limit: 50
				});
				await firstPromise;
			});

			// Should use result from the last completed operation
			expect(result.current.organizations).toEqual(mockOrganizations);
			expect(result.current.isLoading).toBe(false);
		});
	});
});
