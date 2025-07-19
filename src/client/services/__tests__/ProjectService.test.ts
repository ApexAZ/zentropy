import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProjectService } from "../ProjectService";
import type { Project, CreateProjectData, UpdateProjectData, ProjectListResponse } from "../../types";

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

describe("ProjectService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("create", () => {
		const mockProjectData: CreateProjectData = {
			name: "Test Project",
			description: "A test project",
			visibility: "personal"
		};

		const mockCreatedProject: Project = {
			id: "proj-123",
			name: "Test Project",
			description: "A test project",
			visibility: "personal",
			status: "active",
			created_by: "user-123",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		};

		it("should create personal project successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockCreatedProject)
			} as Response);

			const result = await ProjectService.create(mockProjectData);

			expect(result).toEqual(mockCreatedProject);
			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				},
				body: JSON.stringify(mockProjectData)
			});
		});

		it("should create team project with organization", async () => {
			const teamProjectData: CreateProjectData = {
				name: "Team Project",
				description: "A team project",
				visibility: "team",
				organization_id: "org-456"
			};

			const mockTeamProject: Project = {
				...mockCreatedProject,
				name: "Team Project",
				visibility: "team",
				organization_id: "org-456"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockTeamProject)
			} as Response);

			const result = await ProjectService.create(teamProjectData);

			expect(result).toEqual(mockTeamProject);
			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				},
				body: JSON.stringify(teamProjectData)
			});
		});

		it("should create organization-wide project", async () => {
			const orgProjectData: CreateProjectData = {
				name: "Enterprise Project",
				description: "An organization-wide project",
				visibility: "organization",
				organization_id: "org-789"
			};

			const mockOrgProject: Project = {
				...mockCreatedProject,
				name: "Enterprise Project",
				visibility: "organization",
				organization_id: "org-789"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockOrgProject)
			} as Response);

			const result = await ProjectService.create(orgProjectData);

			expect(result).toEqual(mockOrgProject);
		});

		it("should handle validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: () => Promise.resolve({ detail: "Project name is required" })
			} as Response);

			await expect(ProjectService.create({ name: "", visibility: "personal" })).rejects.toThrow(
				"Project name is required"
			);
		});

		it("should handle organization mismatch errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Team projects require an organization" })
			} as Response);

			await expect(
				ProjectService.create({
					name: "Team Project",
					visibility: "team"
				})
			).rejects.toThrow("Team projects require an organization");
		});

		it("should handle project name uniqueness errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Project with name 'Test Project' already exists" })
			} as Response);

			await expect(ProjectService.create(mockProjectData)).rejects.toThrow(
				"Project with name 'Test Project' already exists"
			);
		});

		it("should handle authentication errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ detail: "Authentication required" })
			} as Response);

			await expect(ProjectService.create(mockProjectData)).rejects.toThrow("Authentication required");
		});
	});

	describe("getAll", () => {
		const mockProjects: Project[] = [
			{
				id: "proj-1",
				name: "Project 1",
				description: "First project",
				visibility: "personal",
				status: "active",
				created_by: "user-123",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			},
			{
				id: "proj-2",
				name: "Project 2",
				description: "Second project",
				visibility: "team",
				status: "completed",
				organization_id: "org-456",
				created_by: "user-123",
				created_at: "2024-01-02T00:00:00Z",
				updated_at: "2024-01-02T00:00:00Z"
			}
		];

		const mockListResponse: ProjectListResponse = {
			projects: mockProjects,
			total: 2
		};

		it("should fetch all projects", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			const result = await ProjectService.getAll();

			expect(result).toEqual(mockListResponse);
			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should fetch projects with filters", async () => {
			const filters = {
				status: "active" as const,
				visibility: "personal" as const
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			await ProjectService.getAll(filters);

			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/?status=active&visibility=personal", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should fetch projects with pagination", async () => {
			const filters = { page: 2, limit: 10 };

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockListResponse)
			} as Response);

			await ProjectService.getAll(filters);

			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/?page=2&limit=10", {
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

			await expect(ProjectService.getAll()).rejects.toThrow("Server error. Please try again later.");
		});
	});

	describe("getById", () => {
		const mockProject: Project = {
			id: "proj-123",
			name: "Test Project",
			description: "A test project",
			visibility: "personal",
			status: "active",
			created_by: "user-123",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-01T00:00:00Z"
		};

		it("should fetch project by ID", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockProject)
			} as Response);

			const result = await ProjectService.getById("proj-123");

			expect(result).toEqual(mockProject);
			expect(fetch).toHaveBeenCalledWith("/api/v1/projects/proj-123", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				}
			});
		});

		it("should handle project not found", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ detail: "Project not found" })
			} as Response);

			await expect(ProjectService.getById("non-existent")).rejects.toThrow(
				"The requested resource was not found."
			);
		});

		it("should handle access denied errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ detail: "Not authorized to view this project" })
			} as Response);

			await expect(ProjectService.getById("private-proj")).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle invalid UUID format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 422,
				json: () => Promise.resolve({ detail: "Invalid UUID format" })
			} as Response);

			await expect(ProjectService.getById("invalid-id")).rejects.toThrow("Invalid UUID format");
		});
	});

	describe("update", () => {
		const projectId = "proj-123";
		const updateData: UpdateProjectData = {
			name: "Updated Project Name",
			description: "Updated description",
			status: "completed"
		};

		const mockUpdatedProject: Project = {
			id: projectId,
			name: "Updated Project Name",
			description: "Updated description",
			visibility: "personal",
			status: "completed",
			created_by: "user-123",
			created_at: "2024-01-01T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		};

		it("should update project successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUpdatedProject)
			} as Response);

			const result = await ProjectService.update(projectId, updateData);

			expect(result).toEqual(mockUpdatedProject);
			expect(fetch).toHaveBeenCalledWith(`/api/v1/projects/${projectId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${mockToken}`
				},
				body: JSON.stringify(updateData)
			});
		});

		it("should update project visibility and organization", async () => {
			const visibilityUpdate: UpdateProjectData = {
				visibility: "team",
				organization_id: "org-456"
			};

			const mockTeamProject: Project = {
				...mockUpdatedProject,
				visibility: "team",
				organization_id: "org-456"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockTeamProject)
			} as Response);

			const result = await ProjectService.update(projectId, visibilityUpdate);

			expect(result).toEqual(mockTeamProject);
		});

		it("should handle authorization errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: () => Promise.resolve({ detail: "Not authorized to update this project" })
			} as Response);

			await expect(ProjectService.update(projectId, updateData)).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle validation errors", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Organization projects cannot be assigned to an organization" })
			} as Response);

			await expect(
				ProjectService.update(projectId, {
					visibility: "personal",
					organization_id: "org-123"
				})
			).rejects.toThrow("Organization projects cannot be assigned to an organization");
		});

		it("should handle project not found", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ detail: "Project not found" })
			} as Response);

			await expect(ProjectService.update("non-existent", updateData)).rejects.toThrow(
				"The requested resource was not found."
			);
		});
	});

	describe("delete", () => {
		const projectId = "proj-123";

		it("should delete project successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ message: "Project deleted successfully" })
			} as Response);

			await ProjectService.delete(projectId);

			expect(fetch).toHaveBeenCalledWith(`/api/v1/projects/${projectId}`, {
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
				json: () => Promise.resolve({ detail: "Not authorized to delete this project" })
			} as Response);

			await expect(ProjectService.delete(projectId)).rejects.toThrow(
				"You don't have permission to perform this action."
			);
		});

		it("should handle project not found", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ detail: "Project not found" })
			} as Response);

			await expect(ProjectService.delete("non-existent")).rejects.toThrow(
				"The requested resource was not found."
			);
		});

		it("should handle projects with dependencies", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: () => Promise.resolve({ detail: "Cannot delete project with active dependencies" })
			} as Response);

			await expect(ProjectService.delete(projectId)).rejects.toThrow(
				"Cannot delete project with active dependencies"
			);
		});
	});

	describe("validate", () => {
		it("should validate valid project data", () => {
			const validData: CreateProjectData = {
				name: "Valid Project",
				description: "A valid project description",
				visibility: "team",
				organization_id: "org-123"
			};

			const result = ProjectService.validate(validData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should validate required name field", () => {
			const invalidData: CreateProjectData = {
				name: "",
				visibility: "personal"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Project name is required");
		});

		it("should validate name length", () => {
			const invalidData: CreateProjectData = {
				name: "a".repeat(256),
				visibility: "personal"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Project name must be less than 255 characters");
		});

		it("should validate team project requires organization", () => {
			const invalidData: CreateProjectData = {
				name: "Team Project",
				visibility: "team"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.organization_id).toBe("Team and organization projects require an organization");
		});

		it("should validate organization project requires organization", () => {
			const invalidData: CreateProjectData = {
				name: "Org Project",
				visibility: "organization"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.organization_id).toBe("Team and organization projects require an organization");
		});

		it("should validate personal project cannot have organization", () => {
			const invalidData: CreateProjectData = {
				name: "Personal Project",
				visibility: "personal",
				organization_id: "org-123"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.organization_id).toBe("Personal projects cannot be assigned to an organization");
		});

		it("should validate description length", () => {
			const invalidData: CreateProjectData = {
				name: "Test Project",
				description: "a".repeat(2001),
				visibility: "personal"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Description must be less than 2000 characters");
		});

		it("should handle multiple validation errors", () => {
			const invalidData: CreateProjectData = {
				name: "",
				description: "a".repeat(2001),
				visibility: "team"
			};

			const result = ProjectService.validate(invalidData);

			expect(result.isValid).toBe(false);
			expect(Object.keys(result.errors)).toHaveLength(3);
			expect(result.errors.name).toBe("Project name is required");
			expect(result.errors.description).toBe("Description must be less than 2000 characters");
			expect(result.errors.organization_id).toBe("Team and organization projects require an organization");
		});
	});

	describe("project lifecycle workflows", () => {
		it("should handle personal to team project upgrade", async () => {
			const upgradeData: UpdateProjectData = {
				visibility: "team",
				organization_id: "org-456"
			};

			const mockUpgradedProject: Project = {
				id: "proj-123",
				name: "Upgraded Project",
				visibility: "team",
				status: "active",
				organization_id: "org-456",
				created_by: "user-123",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-02T00:00:00Z"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUpgradedProject)
			} as Response);

			const result = await ProjectService.update("proj-123", upgradeData);

			expect(result).toEqual(mockUpgradedProject);
			expect(result.visibility).toBe("team");
			expect(result.organization_id).toBe("org-456");
		});

		it("should handle project status transitions", async () => {
			const statusUpdates = [
				{ status: "active" as const },
				{ status: "completed" as const },
				{ status: "archived" as const }
			];

			for (const update of statusUpdates) {
				const mockUpdatedProject: Project = {
					id: "proj-123",
					name: "Status Test Project",
					visibility: "personal",
					status: update.status,
					created_by: "user-123",
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-02T00:00:00Z"
				};

				vi.mocked(fetch).mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockUpdatedProject)
				} as Response);

				const result = await ProjectService.update("proj-123", update);
				expect(result.status).toBe(update.status);
			}
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

			await expect(ProjectService.getAll()).rejects.toThrow("Server error. Please try again later.");
		});

		it("should handle responses without detail", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(ProjectService.getAll()).rejects.toThrow("Server error. Please try again later.");
		});

		it("should handle network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error("Network timeout"));

			await expect(ProjectService.getAll()).rejects.toThrow("Network timeout");
		});

		it("should handle authentication token missing", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 401,
				json: () => Promise.resolve({ detail: "Authentication required" })
			} as Response);

			await expect(ProjectService.create({ name: "Test", visibility: "personal" })).rejects.toThrow(
				"Authentication required. Please sign in again."
			);
		});
	});

	describe("integration with organization workflow", () => {
		it("should create project after organization domain check", async () => {
			// This simulates the workflow where user checks domain, creates org, then creates project
			const projectWithOrgData: CreateProjectData = {
				name: "New Company Project",
				description: "First project for the new organization",
				visibility: "team",
				organization_id: "org-new-123"
			};

			const mockProjectWithOrg: Project = {
				id: "proj-new-456",
				name: "New Company Project",
				description: "First project for the new organization",
				visibility: "team",
				status: "active",
				organization_id: "org-new-123",
				created_by: "user-123",
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z"
			};

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 201,
				json: () => Promise.resolve(mockProjectWithOrg)
			} as Response);

			const result = await ProjectService.create(projectWithOrgData);

			expect(result).toEqual(mockProjectWithOrg);
			expect(result.organization_id).toBe("org-new-123");
			expect(result.visibility).toBe("team");
		});
	});
});
