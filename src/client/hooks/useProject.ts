import { useState, useCallback } from "react";
import { ProjectService } from "../services/ProjectService";
import type {
	Project,
	CreateProjectData,
	UpdateProjectData,
	ProjectListResponse,
	ProjectValidationResult
} from "../types";

export interface UseProjectToast {
	message: string;
	type: "success" | "error";
}

export interface UseProjectResult {
	// Data state
	projects: Project[];
	currentProject: Project | null;
	isLoading: boolean;
	error: string;

	// Toast state
	toast: UseProjectToast | null;
	setToast: (toast: UseProjectToast | null) => void;

	// Data loading actions
	loadProjects: (
		page?: number,
		limit?: number,
		status?: "active" | "completed" | "archived",
		visibility?: "personal" | "team" | "organization",
		organizationId?: string
	) => Promise<void>;
	loadProjectsByOrganization: (
		organizationId: string,
		page?: number,
		limit?: number,
		status?: "active" | "completed" | "archived"
	) => Promise<void>;
	getProjectById: (id: string) => Promise<void>;

	// CRUD actions
	createProject: (data: CreateProjectData) => Promise<void>;
	updateProject: (id: string, data: UpdateProjectData) => Promise<void>;
	deleteProject: (id: string) => Promise<void>;

	// Project status management
	archiveProject: (id: string) => Promise<void>;
	restoreProject: (id: string) => Promise<void>;

	// Validation
	validateProject: (data: CreateProjectData | UpdateProjectData) => ProjectValidationResult;
}

export const useProject = (): UseProjectResult => {
	// State management
	const [projects, setProjects] = useState<Project[]>([]);
	const [currentProject, setCurrentProject] = useState<Project | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");
	const [toast, setToast] = useState<UseProjectToast | null>(null);

	// Load projects with pagination and filtering
	const loadProjects = useCallback(
		async (
			page: number = 1,
			limit: number = 50,
			status?: "active" | "completed" | "archived",
			visibility?: "personal" | "team" | "organization",
			organizationId?: string
		): Promise<void> => {
			try {
				setIsLoading(true);
				setError("");

				const filters: {
					page: number;
					limit: number;
					status?: "active" | "completed" | "archived";
					visibility?: "personal" | "team" | "organization";
					organization_id?: string;
				} = { page, limit };

				if (status) filters.status = status;
				if (visibility) filters.visibility = visibility;
				if (organizationId) filters.organization_id = organizationId;

				const response: ProjectListResponse = await ProjectService.getAll(filters);
				setProjects(response.projects);

				// Update currentProject if it exists in the new projects list
				if (currentProject) {
					const updatedCurrentProject = response.projects.find(p => p.id === currentProject.id);
					if (updatedCurrentProject) {
						setCurrentProject(updatedCurrentProject);
					}
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to load projects";
				setError(errorMessage);
				setProjects([]);
			} finally {
				setIsLoading(false);
			}
		},
		[currentProject]
	);

	// Load projects by organization
	const loadProjectsByOrganization = useCallback(
		async (
			organizationId: string,
			page: number = 1,
			limit: number = 50,
			status?: "active" | "completed" | "archived"
		): Promise<void> => {
			try {
				setIsLoading(true);
				setError("");

				const response: ProjectListResponse = await ProjectService.getByOrganization(
					organizationId,
					page,
					limit,
					status
				);
				setProjects(response.projects);

				// Update currentProject if it exists in the new projects list
				if (currentProject) {
					const updatedCurrentProject = response.projects.find(p => p.id === currentProject.id);
					if (updatedCurrentProject) {
						setCurrentProject(updatedCurrentProject);
					}
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to load organization projects";
				setError(errorMessage);
				setProjects([]);
			} finally {
				setIsLoading(false);
			}
		},
		[currentProject]
	);

	// Get project by ID
	const getProjectById = useCallback(async (id: string): Promise<void> => {
		try {
			setError("");

			const project = await ProjectService.getById(id);
			setCurrentProject(project);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to get project";
			setError(errorMessage);
			setCurrentProject(null);
		}
	}, []);

	// Validate project data
	const validateProject = useCallback((data: CreateProjectData | UpdateProjectData): ProjectValidationResult => {
		return ProjectService.validate(data);
	}, []);

	// Create project
	const createProject = useCallback(
		async (data: CreateProjectData): Promise<void> => {
			try {
				// Validate data first
				const validation = ProjectService.validate(data);
				if (!validation.isValid) {
					const firstError = Object.values(validation.errors)[0];
					setToast({
						message: `Validation error: ${firstError}`,
						type: "error"
					});
					return;
				}

				await ProjectService.create(data);
				setToast({
					message: "Project created successfully!",
					type: "success"
				});

				// Reload projects to reflect the new project
				await loadProjects();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to create project";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadProjects]
	);

	// Update project
	const updateProject = useCallback(
		async (id: string, data: UpdateProjectData): Promise<void> => {
			try {
				// Validate data first
				const validation = ProjectService.validate(data);
				if (!validation.isValid) {
					const firstError = Object.values(validation.errors)[0];
					setToast({
						message: `Validation error: ${firstError}`,
						type: "error"
					});
					return;
				}

				await ProjectService.update(id, data);
				setToast({
					message: "Project updated successfully!",
					type: "success"
				});

				// Reload projects to reflect the changes
				await loadProjects();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to update project";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadProjects]
	);

	// Delete project
	const deleteProject = useCallback(
		async (id: string): Promise<void> => {
			try {
				await ProjectService.delete(id);
				setToast({
					message: "Project deleted successfully!",
					type: "success"
				});

				// Clear current project if it was deleted
				if (currentProject?.id === id) {
					setCurrentProject(null);
				}

				// Reload projects to reflect the deletion
				await loadProjects();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to delete project";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[currentProject, loadProjects]
	);

	// Archive project
	const archiveProject = useCallback(
		async (id: string): Promise<void> => {
			try {
				await ProjectService.archive(id);
				setToast({
					message: "Project archived successfully!",
					type: "success"
				});

				// Reload projects to reflect the status change
				await loadProjects();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to archive project";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadProjects]
	);

	// Restore project
	const restoreProject = useCallback(
		async (id: string): Promise<void> => {
			try {
				await ProjectService.restore(id);
				setToast({
					message: "Project restored successfully!",
					type: "success"
				});

				// Reload projects to reflect the status change
				await loadProjects();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to restore project";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadProjects]
	);

	return {
		// Data state
		projects,
		currentProject,
		isLoading,
		error,

		// Toast state
		toast,
		setToast,

		// Data loading actions
		loadProjects,
		loadProjectsByOrganization,
		getProjectById,

		// CRUD actions
		createProject,
		updateProject,
		deleteProject,

		// Project status management
		archiveProject,
		restoreProject,

		// Validation
		validateProject
	};
};
