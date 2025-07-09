import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { useProject } from "../useProject";
import type { Project, CreateProjectData, UpdateProjectData } from "../../types";

// Mock ProjectService
vi.mock("../../services/ProjectService", () => ({
	ProjectService: {
		getAll: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		archive: vi.fn(),
		restore: vi.fn(),
		getByOrganization: vi.fn(),
		validate: vi.fn()
	}
}));

import { ProjectService } from "../../services/ProjectService";

describe("useProject", () => {
	// Mock data
	const mockProject: Project = {
		id: "proj-123",
		name: "Test Project",
		description: "A test project",
		visibility: "team",
		status: "active",
		organization_id: "org-123",
		created_by: "user-123",
		created_at: "2024-01-01T00:00:00Z",
		updated_at: "2024-01-01T00:00:00Z"
	};

	const mockProjects: Project[] = [
		mockProject,
		{
			id: "proj-456",
			name: "Personal Project",
			visibility: "personal",
			status: "active",
			created_by: "user-123",
			created_at: "2024-01-02T00:00:00Z",
			updated_at: "2024-01-02T00:00:00Z"
		}
	];

	const mockCreateData: CreateProjectData = {
		name: "New Project",
		description: "A new test project",
		visibility: "team",
		organization_id: "org-123"
	};

	const mockUpdateData: UpdateProjectData = {
		name: "Updated Project",
		description: "Updated description"
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initial State", () => {
		it("should start with empty state and loading false", () => {
			const { result } = renderHook(() => useProject());

			expect(result.current.projects).toEqual([]);
			expect(result.current.currentProject).toBeNull();
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
			expect(result.current.toast).toBeNull();
		});

		it("should not call any service methods on initialization", () => {
			renderHook(() => useProject());

			expect(ProjectService.getAll).not.toHaveBeenCalled();
			expect(ProjectService.getById).not.toHaveBeenCalled();
		});
	});

	describe("Loading Projects", () => {
		it("should load all projects successfully", async () => {
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: mockProjects,
				total: 2,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.projects).toEqual(mockProjects);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
			expect(ProjectService.getAll).toHaveBeenCalledWith({ page: 1, limit: 50 });
		});

		it("should handle pagination and filter parameters", async () => {
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [mockProject],
				total: 1,
				page: 2,
				limit: 10
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjects(2, 10, "active", "team", "org-123");
			});

			expect(ProjectService.getAll).toHaveBeenCalledWith({
				page: 2,
				limit: 10,
				status: "active",
				visibility: "team",
				organization_id: "org-123"
			});
		});

		it("should handle loading errors and set error state", async () => {
			const errorMessage = "Failed to load projects";
			vi.mocked(ProjectService.getAll).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.projects).toEqual([]);
			expect(result.current.error).toBe(errorMessage);
			expect(result.current.isLoading).toBe(false);
		});

		it("should set loading state during API call", async () => {
			let resolvePromise: (value: any) => void;
			const loadPromise = new Promise(resolve => {
				resolvePromise = resolve;
			});
			vi.mocked(ProjectService.getAll).mockReturnValue(loadPromise as any);

			const { result } = renderHook(() => useProject());

			act(() => {
				result.current.loadProjects();
			});

			expect(result.current.isLoading).toBe(true);

			await act(async () => {
				resolvePromise!({
					projects: mockProjects,
					total: 2,
					page: 1,
					limit: 50
				});
				await loadPromise;
			});

			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Get Project by ID", () => {
		it("should get project by ID successfully", async () => {
			vi.mocked(ProjectService.getById).mockResolvedValue(mockProject);

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.getProjectById("proj-123");
			});

			expect(result.current.currentProject).toEqual(mockProject);
			expect(ProjectService.getById).toHaveBeenCalledWith("proj-123");
		});

		it("should handle get by ID errors", async () => {
			const errorMessage = "Project not found";
			vi.mocked(ProjectService.getById).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.getProjectById("invalid-id");
			});

			expect(result.current.currentProject).toBeNull();
			expect(result.current.error).toBe(errorMessage);
		});
	});

	describe("Creating Projects", () => {
		it("should create project successfully", async () => {
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.create).mockResolvedValue(mockProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [...mockProjects, mockProject],
				total: 3,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.createProject(mockCreateData);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(mockCreateData);
			expect(ProjectService.create).toHaveBeenCalledWith(mockCreateData);
			expect(result.current.toast).toEqual({
				message: "Project created successfully!",
				type: "success"
			});
			expect(ProjectService.getAll).toHaveBeenCalled();
		});

		it("should handle create errors and show error toast", async () => {
			const errorMessage = "Project name already exists";
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.create).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.createProject(mockCreateData);
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
			expect(ProjectService.getAll).not.toHaveBeenCalled();
		});

		it("should validate project data before creation", async () => {
			const validationResult = {
				isValid: false,
				errors: { name: "Project name is required" }
			};
			vi.mocked(ProjectService.validate).mockReturnValue(validationResult);

			const { result } = renderHook(() => useProject());

			const invalidData = { ...mockCreateData, name: "" };

			await act(async () => {
				await result.current.createProject(invalidData);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(invalidData);
			expect(result.current.toast).toEqual({
				message: "Validation error: Project name is required",
				type: "error"
			});
			expect(ProjectService.create).not.toHaveBeenCalled();
		});
	});

	describe("Updating Projects", () => {
		it("should update project successfully", async () => {
			const updatedProject = { ...mockProject, name: "Updated Name" };
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.update).mockResolvedValue(updatedProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [updatedProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.updateProject("proj-123", mockUpdateData);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(mockUpdateData);
			expect(ProjectService.update).toHaveBeenCalledWith("proj-123", mockUpdateData);
			expect(result.current.toast).toEqual({
				message: "Project updated successfully!",
				type: "success"
			});
		});

		it("should handle update errors", async () => {
			const errorMessage = "Update failed";
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.update).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.updateProject("proj-123", mockUpdateData);
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});

		it("should validate project data before update", async () => {
			const validationResult = {
				isValid: false,
				errors: { visibility: "Invalid visibility setting" }
			};
			vi.mocked(ProjectService.validate).mockReturnValue(validationResult);

			const { result } = renderHook(() => useProject());

			const invalidUpdate = { visibility: "invalid" as any };

			await act(async () => {
				await result.current.updateProject("proj-123", invalidUpdate);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(invalidUpdate);
			expect(result.current.toast).toEqual({
				message: "Validation error: Invalid visibility setting",
				type: "error"
			});
			expect(ProjectService.update).not.toHaveBeenCalled();
		});
	});

	describe("Deleting Projects", () => {
		it("should delete project successfully", async () => {
			vi.mocked(ProjectService.delete).mockResolvedValue(undefined);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [],
				total: 0,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.deleteProject("proj-123");
			});

			expect(ProjectService.delete).toHaveBeenCalledWith("proj-123");
			expect(result.current.toast).toEqual({
				message: "Project deleted successfully!",
				type: "success"
			});
		});

		it("should handle delete errors", async () => {
			const errorMessage = "Cannot delete project with active tasks";
			vi.mocked(ProjectService.delete).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.deleteProject("proj-123");
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Project Status Management", () => {
		it("should archive project successfully", async () => {
			const archivedProject = { ...mockProject, status: "archived" as const };
			vi.mocked(ProjectService.archive).mockResolvedValue(archivedProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [archivedProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.archiveProject("proj-123");
			});

			expect(ProjectService.archive).toHaveBeenCalledWith("proj-123");
			expect(result.current.toast).toEqual({
				message: "Project archived successfully!",
				type: "success"
			});
		});

		it("should restore project successfully", async () => {
			const restoredProject = { ...mockProject, status: "active" as const };
			vi.mocked(ProjectService.restore).mockResolvedValue(restoredProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [restoredProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.restoreProject("proj-123");
			});

			expect(ProjectService.restore).toHaveBeenCalledWith("proj-123");
			expect(result.current.toast).toEqual({
				message: "Project restored successfully!",
				type: "success"
			});
		});

		it("should handle archive errors", async () => {
			const errorMessage = "Cannot archive active project";
			vi.mocked(ProjectService.archive).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.archiveProject("proj-123");
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});

		it("should handle restore errors", async () => {
			const errorMessage = "Cannot restore project";
			vi.mocked(ProjectService.restore).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.restoreProject("proj-123");
			});

			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
		});
	});

	describe("Organization-specific Projects", () => {
		it("should load projects by organization", async () => {
			const orgProjects = [mockProject];
			vi.mocked(ProjectService.getByOrganization).mockResolvedValue({
				projects: orgProjects,
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjectsByOrganization("org-123");
			});

			expect(ProjectService.getByOrganization).toHaveBeenCalledWith("org-123", 1, 50, undefined);
			expect(result.current.projects).toEqual(orgProjects);
		});

		it("should handle organization project loading errors", async () => {
			const errorMessage = "Organization not found";
			vi.mocked(ProjectService.getByOrganization).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjectsByOrganization("invalid-org");
			});

			expect(result.current.error).toBe(errorMessage);
			expect(result.current.projects).toEqual([]);
		});
	});

	describe("Toast Management", () => {
		it("should allow setting custom toast messages", () => {
			const { result } = renderHook(() => useProject());

			const customToast = { message: "Custom message", type: "success" as const };

			act(() => {
				result.current.setToast(customToast);
			});

			expect(result.current.toast).toEqual(customToast);
		});

		it("should allow clearing toast messages", () => {
			const { result } = renderHook(() => useProject());

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
			vi.mocked(ProjectService.getAll).mockRejectedValue(new Error("Initial error"));

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.error).toBe("Initial error");

			// Now make a successful call
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: mockProjects,
				total: 2,
				page: 1,
				limit: 50
			});

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.error).toBe("");
		});

		it("should update currentProject when it exists in the projects list", async () => {
			// Set current project first
			vi.mocked(ProjectService.getById).mockResolvedValue(mockProject);

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.getProjectById("proj-123");
			});

			expect(result.current.currentProject).toEqual(mockProject);

			// Now update the project and reload the list
			const updatedProject = { ...mockProject, name: "Updated Name" };
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [updatedProject],
				total: 1,
				page: 1,
				limit: 50
			});

			await act(async () => {
				await result.current.loadProjects();
			});

			// currentProject should be updated with the new data
			expect(result.current.currentProject).toEqual(updatedProject);
		});

		it("should clear currentProject when it no longer exists in projects list", async () => {
			// Set current project first
			vi.mocked(ProjectService.getById).mockResolvedValue(mockProject);

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.getProjectById("proj-123");
			});

			expect(result.current.currentProject).toEqual(mockProject);

			// Now load projects that don't include the current project
			const otherProject = { ...mockProject, id: "other-proj" };
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [otherProject],
				total: 1,
				page: 1,
				limit: 50
			});

			await act(async () => {
				await result.current.loadProjects();
			});

			// currentProject should remain (not automatically cleared)
			expect(result.current.currentProject).toEqual(mockProject);
		});
	});

	describe("Just-in-Time Organization Workflow", () => {
		it("should create personal project without organization", async () => {
			const personalProject = {
				...mockProject,
				visibility: "personal" as const,
				organization_id: undefined
			};
			const personalData: CreateProjectData = {
				name: "Personal Project",
				visibility: "personal"
			};

			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.create).mockResolvedValue(personalProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [personalProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.createProject(personalData);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(personalData);
			expect(ProjectService.create).toHaveBeenCalledWith(personalData);
		});

		it("should create team project with organization assignment", async () => {
			const teamData: CreateProjectData = {
				name: "Team Project",
				visibility: "team",
				organization_id: "org-123"
			};

			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.create).mockResolvedValue(mockProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [mockProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject());

			await act(async () => {
				await result.current.createProject(teamData);
			});

			expect(ProjectService.validate).toHaveBeenCalledWith(teamData);
			expect(ProjectService.create).toHaveBeenCalledWith(teamData);
		});
	});
});
