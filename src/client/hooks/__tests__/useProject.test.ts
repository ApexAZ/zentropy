import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { useProject } from "../useProject";
import { ToastProvider } from "../../contexts/ToastContext";
import type { Project, CreateProjectData, UpdateProjectData } from "../../types";

// Mock ProjectService
vi.mock("../../services/ProjectService", () => ({
	ProjectService: {
		getAll: vi.fn(),
		getByOrganization: vi.fn(),
		getById: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		archive: vi.fn(),
		restore: vi.fn(),
		validate: vi.fn()
	}
}));

import { ProjectService } from "../../services/ProjectService";

// Test wrapper to provide ToastProvider context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
	React.createElement(ToastProvider, null, children);

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

	const mockProjects: Project[] = [mockProject];

	const mockCreateData: CreateProjectData = {
		name: "New Project",
		description: "A new project",
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

	describe("Initial State", () => {
		it("should start with empty state and loading false", () => {
			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			expect(result.current.projects).toEqual([]);
			expect(result.current.currentProject).toBeNull();
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
		});

		it("should not call any service methods on initialization", () => {
			renderHook(() => useProject(), { wrapper: TestWrapper });

			expect(ProjectService.getAll).not.toHaveBeenCalled();
			expect(ProjectService.getById).not.toHaveBeenCalled();
			expect(ProjectService.create).not.toHaveBeenCalled();
		});
	});

	describe("Loading Projects", () => {
		it("should load projects successfully", async () => {
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: mockProjects,
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.projects).toEqual(mockProjects);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("");
		});

		it("should handle loading errors", async () => {
			const errorMessage = "Failed to load projects";
			vi.mocked(ProjectService.getAll).mockRejectedValue(new Error(errorMessage));

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.loadProjects();
			});

			expect(result.current.projects).toEqual([]);
			expect(result.current.error).toBe(errorMessage);
			expect(result.current.isLoading).toBe(false);
		});

		it("should load projects by organization", async () => {
			vi.mocked(ProjectService.getByOrganization).mockResolvedValue({
				projects: mockProjects,
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.loadProjectsByOrganization("org-123");
			});

			expect(result.current.projects).toEqual(mockProjects);
			expect(ProjectService.getByOrganization).toHaveBeenCalledWith("org-123", 1, 50, undefined);
		});
	});

	describe("Project Operations", () => {
		it("should create project successfully", async () => {
			// Mock validation to pass
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.create).mockResolvedValue(mockProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [mockProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.createProject(mockCreateData);
			});

			expect(ProjectService.create).toHaveBeenCalledWith(mockCreateData);
			expect(ProjectService.getAll).toHaveBeenCalled();
		});

		it("should get project by ID successfully", async () => {
			vi.mocked(ProjectService.getById).mockResolvedValue(mockProject);

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.getProjectById("proj-123");
			});

			expect(result.current.currentProject).toEqual(mockProject);
			expect(ProjectService.getById).toHaveBeenCalledWith("proj-123");
		});

		it("should update project successfully", async () => {
			const updatedProject = { ...mockProject, name: "Updated Project" };
			// Mock validation to pass
			vi.mocked(ProjectService.validate).mockReturnValue({ isValid: true, errors: {} });
			vi.mocked(ProjectService.update).mockResolvedValue(updatedProject);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [updatedProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.updateProject("proj-123", mockUpdateData);
			});

			expect(ProjectService.update).toHaveBeenCalledWith("proj-123", mockUpdateData);
			expect(ProjectService.getAll).toHaveBeenCalled();
		});

		it("should delete project successfully", async () => {
			vi.mocked(ProjectService.delete).mockResolvedValue(undefined);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [],
				total: 0,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.deleteProject("proj-123");
			});

			expect(ProjectService.delete).toHaveBeenCalledWith("proj-123");
			expect(ProjectService.getAll).toHaveBeenCalled();
		});

		it("should archive project successfully", async () => {
			vi.mocked(ProjectService.archive).mockResolvedValue(undefined);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [],
				total: 0,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.archiveProject("proj-123");
			});

			expect(ProjectService.archive).toHaveBeenCalledWith("proj-123");
			expect(ProjectService.getAll).toHaveBeenCalled();
		});

		it("should restore project successfully", async () => {
			vi.mocked(ProjectService.restore).mockResolvedValue(undefined);
			vi.mocked(ProjectService.getAll).mockResolvedValue({
				projects: [mockProject],
				total: 1,
				page: 1,
				limit: 50
			});

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			await act(async () => {
				await result.current.restoreProject("proj-123");
			});

			expect(ProjectService.restore).toHaveBeenCalledWith("proj-123");
			expect(ProjectService.getAll).toHaveBeenCalled();
		});
	});

	describe("Validation", () => {
		it("should validate project data", () => {
			const mockValidationResult = {
				isValid: true,
				errors: {}
			};
			vi.mocked(ProjectService.validate).mockReturnValue(mockValidationResult);

			const { result } = renderHook(() => useProject(), { wrapper: TestWrapper });

			const validationResult = result.current.validateProject(mockCreateData);

			expect(ProjectService.validate).toHaveBeenCalledWith(mockCreateData);
			expect(validationResult).toEqual(mockValidationResult);
		});
	});
});
