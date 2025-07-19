import { vi, describe, it, expect, beforeEach } from "vitest";
import { OrganizationService } from "../OrganizationService";
import type {
	Organization,
	CreateOrganizationData,
	UpdateOrganizationData,
	DomainCheckResult,
	JoinOrganizationResult,
	OrganizationListResponse
} from "../../types";

// Mock fetch globally

global.fetch = vi.fn();

// Mock authentication token
const mockToken = "mock-auth-token-123";
vi.mock("../../utils/auth", () => ({
	getAuthToken: () => mockToken,
	createAuthHeaders: () => ({
		"Content-Type": "application/json",
		Authorization: `Bearer ${mockToken}`
	})
}));

describe("OrganizationService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("checkDomain", () => {
		it("should check domain and find existing organization", async () => {
			const mockResponse: DomainCheckResult = {
				domain_found: true,
				domain: "example.com",
				organization: {
					id: "org-123",
					name: "Example Corp",
					domain: "example.com",
					scope: "shared",
					max_users: 100,
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z"
				},
				suggestions: {
					action: "join",
					can_join: true,
					can_create: false,
					message: "Organization 'Example Corp' exists for example.com. You can request to join."
				}
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			} as Response);

			const result = await OrganizationService.checkDomain("user@example.com");

			expect(result).toEqual(mockResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/check-domain?email=user%40example.com", {
				method: "GET",
				headers: {
					"Content-Type": "application/json"
				}
			});
		});

		it("should check domain and suggest creating new organization", async () => {
			const mockResponse: DomainCheckResult = {
				domain_found: false,
				domain: "newcompany.com",
				suggestions: {
					action: "create",
					can_join: false,
					can_create: true,
					suggested_name: "newcompany",
					message: "No organization found for newcompany.com. You can create a new organization."
				}
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			} as Response);

			const result = await OrganizationService.checkDomain("user@newcompany.com");

			expect(result).toEqual(mockResponse);
		});

		it("should handle personal email domains", async () => {
			const mockResponse: DomainCheckResult = {
				domain_found: false,
				domain: "gmail.com",
				suggestions: {
					action: "personal",
					can_join: false,
					can_create: false,
					message:
						"Personal email domain detected. Consider creating personal projects or use a business email domain."
				}
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse)
			} as Response);

			const result = await OrganizationService.checkDomain("user@gmail.com");

			expect(result).toEqual(mockResponse);
		});

		it("should handle invalid email format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: () => Promise.resolve({ detail: "Invalid email format" })
			} as Response);

			await expect(OrganizationService.checkDomain("invalid-email")).rejects.toThrow("Invalid email format");
		});

		it("should handle API errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({ detail: "Internal server error" })
			} as Response);

			await expect(OrganizationService.checkDomain("user@example.com")).rejects.toThrow(
				"Server error. Please try again later."
			);
		});

		it("should handle network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

			await expect(OrganizationService.checkDomain("user@example.com")).rejects.toThrow("Network error");
		});
	});

	describe("create", () => {
		const mockOrganizationData: CreateOrganizationData = {
			name: "Test Organization",
			domain: "test.com",
			scope: "shared",
			max_users: 50,
			description: "A test organization"
		};

		const mockCreatedOrganization: Organization = {
			id: "org-456",
			name: "Test Organization",
			domain: "test.com",
			scope: "shared",
			max_users: 50,
			description: "A test organization",
			created_by: "user-123",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		};

		it("should create organization successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockCreatedOrganization)
			} as Response);

			const result = await OrganizationService.create(mockOrganizationData);

			expect(result).toEqual(mockCreatedOrganization);
			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				},
				body: JSON.stringify(mockOrganizationData)
			});
		});

		it("should create personal organization", async () => {
			const personalOrgData: CreateOrganizationData = {
				name: "Personal Workspace",
				scope: "personal",
				max_users: 1
			};

			const mockPersonalOrg: Organization = {
				...mockCreatedOrganization,
				name: "Personal Workspace",
				scope: "personal",
				max_users: 1,
				domain: undefined
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockPersonalOrg)
			} as Response);

			const result = await OrganizationService.create(personalOrgData);

			expect(result).toEqual(mockPersonalOrg);
		});

		it("should handle validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Organization name already exists" })
			} as Response);

			await expect(OrganizationService.create(mockOrganizationData)).rejects.toThrow(
				"Organization name already exists"
			);
		});

		it("should handle permission errors for enterprise organizations", async () => {
			const enterpriseOrgData: CreateOrganizationData = {
				name: "Enterprise Corp",
				scope: "enterprise"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ detail: "Only admins can create enterprise organizations" })
			} as Response);

			await expect(OrganizationService.create(enterpriseOrgData)).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle authentication errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ detail: "Authentication required" })
			} as Response);

			await expect(OrganizationService.create(mockOrganizationData)).rejects.toThrow(
				"Authentication required. Please sign in again."
			);
		});
	});

	describe("getAll", () => {
		const mockOrganizations: Organization[] = [
			{
				id: "org-1",
				name: "Organization 1",
				domain: "org1.com",
				scope: "shared",
				max_users: 50,
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			},
			{
				id: "org-2",
				name: "Organization 2",
				domain: "org2.com",
				scope: "enterprise",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			}
		];

		const mockListResponse: OrganizationListResponse = {
			organizations: mockOrganizations,
			total: 2,
			page: 1,
			limit: 50
		};

		it("should fetch all organizations with default pagination", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			const result = await OrganizationService.getAll();

			expect(result).toEqual(mockListResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should fetch organizations with custom pagination", async () => {
			const filters = { page: 2, limit: 10 };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			await OrganizationService.getAll(filters);

			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/?page=2&limit=10", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should fetch organizations with filters", async () => {
			const filters = { scope: "shared" as const, domain: "example" };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			await OrganizationService.getAll(filters);

			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/?scope=shared&domain=example", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle API errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({ detail: "Internal server error" })
			} as Response);

			await expect(OrganizationService.getAll()).rejects.toThrow("Server error. Please try again later.");
		});
	});

	describe("getById", () => {
		const mockOrganization: Organization = {
			id: "org-123",
			name: "Test Organization",
			domain: "test.com",
			scope: "shared",
			max_users: 50,
			description: "A test organization",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		};

		it("should fetch organization by ID", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockOrganization)
			} as Response);

			const result = await OrganizationService.getById("org-123");

			expect(result).toEqual(mockOrganization);
			expect(fetch).toHaveBeenCalledWith("/api/v1/organizations/org-123", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle organization not found", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ detail: "Organization not found" })
			} as Response);

			await expect(OrganizationService.getById("non-existent")).rejects.toThrow(
				"The requested resource was not found."
			);
		});

		it("should handle invalid UUID format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: () => Promise.resolve({ detail: "Invalid UUID format" })
			} as Response);

			await expect(OrganizationService.getById("invalid-id")).rejects.toThrow("Invalid UUID format");
		});
	});

	describe("update", () => {
		const organizationId = "org-123";
		const updateData: UpdateOrganizationData = {
			name: "Updated Organization Name",
			description: "Updated description"
		};

		const mockUpdatedOrganization: Organization = {
			id: organizationId,
			name: "Updated Organization Name",
			domain: "test.com",
			scope: "shared",
			max_users: 50,
			description: "Updated description",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		};

		it("should update organization successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUpdatedOrganization)
			} as Response);

			const result = await OrganizationService.update(organizationId, updateData);

			expect(result).toEqual(mockUpdatedOrganization);
			expect(fetch).toHaveBeenCalledWith(`/api/v1/organizations/${organizationId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				},
				body: JSON.stringify(updateData)
			});
		});

		it("should handle authorization errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ detail: "Not authorized to update this organization" })
			} as Response);

			await expect(OrganizationService.update(organizationId, updateData)).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Domain 'test.com' is already in use" })
			} as Response);

			await expect(OrganizationService.update(organizationId, { domain: "test.com" })).rejects.toThrow(
				"Domain 'test.com' is already in use"
			);
		});
	});

	describe("delete", () => {
		const organizationId = "org-123";

		it("should delete organization successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ message: "Organization deleted successfully" })
			} as Response);

			await OrganizationService.delete(organizationId);

			expect(fetch).toHaveBeenCalledWith(`/api/v1/organizations/${organizationId}`, {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle authorization errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ detail: "Not authorized to delete this organization" })
			} as Response);

			await expect(OrganizationService.delete(organizationId)).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle organization with active members", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () =>
					Promise.resolve({
						detail: "Cannot delete organization with 5 active members. Remove all members first."
					})
			} as Response);

			await expect(OrganizationService.delete(organizationId)).rejects.toThrow(
				"Cannot delete organization with 5 active members. Remove all members first."
			);
		});
	});

	describe("join", () => {
		const organizationId = "org-123";
		const mockJoinResult: JoinOrganizationResult = {
			message: "Successfully joined organization 'Test Organization'",
			status: "approved",
			organization_id: organizationId
		};

		it("should join organization successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockJoinResult)
			} as Response);

			const result = await OrganizationService.join(organizationId);

			expect(result).toEqual(mockJoinResult);
			expect(fetch).toHaveBeenCalledWith(`/api/v1/organizations/${organizationId}/join`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle already member error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "You are already a member of this organization" })
			} as Response);

			await expect(OrganizationService.join(organizationId)).rejects.toThrow(
				"You are already a member of this organization"
			);
		});

		it("should handle organization capacity full", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Organization has reached maximum capacity" })
			} as Response);

			await expect(OrganizationService.join(organizationId)).rejects.toThrow(
				"Organization has reached maximum capacity"
			);
		});

		it("should handle organization not found", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ detail: "Organization not found" })
			} as Response);

			await expect(OrganizationService.join(organizationId)).rejects.toThrow(
				"The requested resource was not found."
			);
		});
	});

	describe("leave", () => {
		const organizationId = "org-123";

		it("should leave organization successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ message: "Successfully left organization 'Test Organization'" })
			} as Response);

			await OrganizationService.leave(organizationId);

			expect(fetch).toHaveBeenCalledWith(`/api/v1/organizations/${organizationId}/leave`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle not a member error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "You are not a member of this organization" })
			} as Response);

			await expect(OrganizationService.leave(organizationId)).rejects.toThrow(
				"You are not a member of this organization"
			);
		});

		it("should handle sole creator error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () =>
					Promise.resolve({
						detail: "Cannot leave organization as sole creator. Delete the organization or transfer ownership first."
					})
			} as Response);

			await expect(OrganizationService.leave(organizationId)).rejects.toThrow(
				"Cannot leave organization as sole creator. Delete the organization or transfer ownership first."
			);
		});
	});

	describe("validate", () => {
		it("should validate valid organization data", () => {
			const validData: CreateOrganizationData = {
				name: "Valid Organization",
				domain: "valid.com",
				scope: "shared",
				max_users: 50,
				description: "A valid organization"
			};

			const result = OrganizationService.validate(validData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should validate required name field", () => {
			const invalidData: CreateOrganizationData = {
				name: "",
				scope: "shared"
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Organization name is required");
		});

		it("should validate name length", () => {
			const invalidData: CreateOrganizationData = {
				name: "a".repeat(256),
				scope: "shared"
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Organization name must be less than 255 characters");
		});

		it("should validate domain format", () => {
			const invalidData: CreateOrganizationData = {
				name: "Test Org",
				domain: "invalid_domain_format_with_underscore",
				scope: "shared"
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.domain).toBe("Invalid domain format");
		});

		it("should validate personal organization max_users", () => {
			const invalidData: CreateOrganizationData = {
				name: "Personal Org",
				scope: "personal",
				max_users: 5
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.max_users).toBe("Personal organizations cannot have more than 1 user");
		});

		it("should validate max_users positive value", () => {
			const invalidData: CreateOrganizationData = {
				name: "Test Org",
				scope: "shared",
				max_users: -1
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.max_users).toBe("Maximum users must be a positive number");
		});

		it("should validate description length", () => {
			const invalidData: CreateOrganizationData = {
				name: "Test Org",
				scope: "shared",
				description: "a".repeat(1001)
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Description must be less than 1000 characters");
		});

		it("should handle multiple validation errors", () => {
			const invalidData: CreateOrganizationData = {
				name: "",
				domain: "invalid_domain_format_with_underscore",
				scope: "personal",
				max_users: 5
			};

			const result = OrganizationService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(Object.keys(result.errors)).toHaveLength(3);
			expect(result.errors.name).toBe("Organization name is required");
			expect(result.errors.domain).toBe("Invalid domain format");
			expect(result.errors.max_users).toBe("Personal organizations cannot have more than 1 user");
		});
	});

	describe("error handling", () => {
		it("should handle malformed JSON responses", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(OrganizationService.checkDomain("user@example.com")).rejects.toThrow(
				"Server error. Please try again later."
			);
		});

		it("should handle responses without detail", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(OrganizationService.checkDomain("user@example.com")).rejects.toThrow(
				"Server error. Please try again later."
			);
		});

		it("should handle authentication token missing", async () => {
			// Mock getAuthToken to return null
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ detail: "Authentication required" })
			} as Response);

			await expect(OrganizationService.create({ name: "Test", scope: "shared" })).rejects.toThrow(
				"Authentication required"
			);
		});
	});
});
