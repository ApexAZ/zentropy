import React, { useState, useEffect, useCallback, useRef } from "react";
import { useProject } from "../hooks/useProject";
import { useOrganization } from "../hooks/useOrganization";
import { useFormValidation } from "../hooks/useFormValidation";
import OrganizationSelector from "./OrganizationSelector";
import RequiredAsterisk from "./RequiredAsterisk";
import type { Organization, CreateProjectData } from "../types";

interface ProjectCreationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (project?: any) => void;
	userEmail: string;
	preselectedOrganization?: Organization | null;
	defaultVisibility?: "personal" | "team" | "organization";
}

interface ProjectFormData {
	name: string;
	description: string;
	visibility: "personal" | "team" | "organization";
	organization_id?: string | undefined;
}

const ProjectCreationModal: React.FC<ProjectCreationModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	userEmail,
	preselectedOrganization = null,
	defaultVisibility = "team"
}) => {
	const { isLoading: projectLoading, createProject, validateProject } = useProject();

	const {} = useOrganization();

	const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(preselectedOrganization);
	const [showOrganizationSelector, setShowOrganizationSelector] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);

	// Project form validation
	const projectForm = useFormValidation<ProjectFormData>({
		initialValues: {
			name: "",
			description: "",
			visibility: defaultVisibility,
			organization_id: preselectedOrganization?.id || undefined
		},
		validate: data => {
			const projectData: CreateProjectData = {
				name: data.name,
				description: data.description,
				visibility: data.visibility,
				...(data.organization_id && { organization_id: data.organization_id })
			};

			return validateProject(projectData);
		},
		onSubmit: async values => {
			setIsSubmitting(true);
			try {
				const projectData: CreateProjectData = {
					name: values.name.trim(),
					description: values.description.trim(),
					visibility: values.visibility,
					...(values.organization_id && { organization_id: values.organization_id })
				};

				const createdProject = await createProject(projectData);

				// Reset form
				projectForm.resetForm();
				setSelectedOrganization(preselectedOrganization);

				// Call success callback
				onSuccess(createdProject);

				// UX/Accessibility timing (environment-specific)
				const closeDelay = import.meta.env.NODE_ENV === "test" ? 0 : 1000;
				setTimeout(() => {
					onClose();
				}, closeDelay);
			} catch {
				// Error is handled by the hook's toast system
			} finally {
				setIsSubmitting(false);
			}
		}
	});

	// Update form when organization changes
	useEffect(() => {
		if (selectedOrganization) {
			projectForm.handleChange("organization_id", selectedOrganization.id);
		} else {
			projectForm.handleChange("organization_id", undefined);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedOrganization]);

	// Reset form when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			projectForm.resetForm();
			setSelectedOrganization(preselectedOrganization);
			setShowOrganizationSelector(false);
			setIsSubmitting(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, preselectedOrganization]);

	// Focus dialog when opened
	useEffect(() => {
		if (isOpen && dialogRef.current) {
			dialogRef.current.focus();
		}
	}, [isOpen]);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		},
		[onClose]
	);

	// Handle backdrop click
	const handleBackdropClick = useCallback(
		(event: React.MouseEvent) => {
			if (event.target === event.currentTarget) {
				onClose();
			}
		},
		[onClose]
	);

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await projectForm.handleSubmit(e);
		} catch {
			// Error is handled by the form validation
		}
	};

	// Handle organization selection
	const handleOrganizationSelect = useCallback(
		(organization: Organization | null) => {
			setSelectedOrganization(organization);
			setShowOrganizationSelector(false);

			// Update visibility based on organization selection
			if (organization) {
				// If organization is selected, ensure visibility is not personal
				if (projectForm.values.visibility === "personal") {
					projectForm.handleChange("visibility", "team");
				}
			} else {
				// If no organization, set to personal
				projectForm.handleChange("visibility", "personal");
			}
		},
		[projectForm]
	);

	// Handle visibility change
	const handleVisibilityChange = useCallback(
		(visibility: "personal" | "team" | "organization") => {
			projectForm.handleChange("visibility", visibility);

			// Clear organization if personal is selected
			if (visibility === "personal") {
				setSelectedOrganization(null);
				projectForm.handleChange("organization_id", undefined);
			}
		},
		[projectForm]
	);

	// Get visibility description
	const getVisibilityDescription = (visibility: "personal" | "team" | "organization"): string => {
		switch (visibility) {
			case "personal":
				return "Only you can see this project";
			case "team":
				return "Selected team members can see this project";
			case "organization":
				return "All organization members can see this project";
			default:
				return "";
		}
	};

	// Check if organization is required
	const isOrganizationRequired =
		projectForm.values.visibility === "team" || projectForm.values.visibility === "organization";

	if (!isOpen) return null;

	// Show organization selector if needed
	if (showOrganizationSelector) {
		return (
			<OrganizationSelector
				isOpen={true}
				onClose={() => setShowOrganizationSelector(false)}
				onSelect={handleOrganizationSelect}
				userEmail={userEmail}
				allowCreate={true}
				allowPersonal={false}
				mode="select"
			/>
		);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			onClick={handleBackdropClick}
		>
			<div
				ref={dialogRef}
				className="bg-content-background max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-xl"
				role="dialog"
				aria-labelledby="project-creation-title"
				aria-describedby="project-creation-description"
				data-organization={selectedOrganization?.id}
				onKeyDown={handleKeyDown}
				tabIndex={-1}
			>
				<div className="p-6">
					{/* Header */}
					<div className="mb-6 flex items-center justify-between">
						<div>
							<h2 id="project-creation-title" className="text-text-primary text-2xl font-bold">
								Create New Project
							</h2>
							<p id="project-creation-description" className="text-text-primary/70 mt-1">
								Set up a new project for your work
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-text-primary/50 hover:text-text-primary"
							aria-label="Close"
						>
							✕
						</button>
					</div>

					{/* Project Form */}
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Project Name */}
						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								Project Name{" "}
								<RequiredAsterisk isEmpty={!projectForm.values.name.trim()} isRequired={true} />
							</label>
							<input
								type="text"
								value={projectForm.values.name}
								onChange={e => projectForm.handleChange("name", e.target.value)}
								onBlur={() => projectForm.handleBlur("name")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={projectLoading || isSubmitting}
								placeholder="Enter project name"
								aria-label="Project Name"
							/>
							{projectForm.touched.name && projectForm.errors.name && (
								<p className="text-error mt-1 text-sm" role="alert">
									{projectForm.errors.name}
								</p>
							)}
						</div>

						{/* Description */}
						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								Description (Optional)
							</label>
							<textarea
								value={projectForm.values.description}
								onChange={e => projectForm.handleChange("description", e.target.value)}
								onBlur={() => projectForm.handleBlur("description")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								rows={3}
								disabled={projectLoading || isSubmitting}
								placeholder="Describe your project (optional)"
								aria-label="Description"
							/>
							{projectForm.touched.description && projectForm.errors.description && (
								<p className="text-error mt-1 text-sm" role="alert">
									{projectForm.errors.description}
								</p>
							)}
						</div>

						{/* Visibility */}
						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">Visibility</label>
							<select
								value={projectForm.values.visibility}
								onChange={e =>
									handleVisibilityChange(e.target.value as "personal" | "team" | "organization")
								}
								onBlur={() => projectForm.handleBlur("visibility")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={projectLoading || isSubmitting}
								aria-label="Visibility"
							>
								<option value="personal">Personal</option>
								<option value="team">Team</option>
								<option value="organization">Organization</option>
							</select>
							<p className="text-text-primary/60 mt-1 text-sm">
								{getVisibilityDescription(projectForm.values.visibility)}
							</p>
							{projectForm.touched.visibility && projectForm.errors.visibility && (
								<p className="text-error mt-1 text-sm" role="alert">
									{projectForm.errors.visibility}
								</p>
							)}
						</div>

						{/* Organization Selection */}
						{projectForm.values.visibility !== "personal" && (
							<div>
								<label className="text-text-primary mb-2 block text-sm font-medium">
									Organization
									{isOrganizationRequired && (
										<RequiredAsterisk isEmpty={!selectedOrganization} isRequired={true} />
									)}
								</label>

								{selectedOrganization ? (
									<div className="border-layout-background rounded-lg border p-4">
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-text-primary font-semibold">
													Organization: {selectedOrganization.name}
												</h3>
												{selectedOrganization.description && (
													<p className="text-text-primary/70 text-sm">
														{selectedOrganization.description}
													</p>
												)}
											</div>
											<button
												type="button"
												onClick={() => setShowOrganizationSelector(true)}
												className="border-interactive text-interactive hover:bg-interactive rounded-lg border px-4 py-2 transition-colors hover:text-white"
												aria-label="Change Organization"
											>
												Change
											</button>
										</div>
									</div>
								) : (
									<div className="border-layout-background rounded-lg border p-4">
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-text-primary font-semibold">Select Organization</h3>
												{isOrganizationRequired && (
													<p className="text-text-primary/70 text-sm">
														An organization is required for team projects
													</p>
												)}
											</div>
											<button
												type="button"
												onClick={() => setShowOrganizationSelector(true)}
												className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors"
												aria-label="Choose Organization"
											>
												Choose
											</button>
										</div>
									</div>
								)}

								{projectForm.touched.organization_id && projectForm.errors.organization_id && (
									<p className="text-error mt-1 text-sm" role="alert">
										{projectForm.errors.organization_id}
									</p>
								)}
							</div>
						)}

						{/* Form Actions */}
						<div className="flex gap-3 pt-4">
							<button
								type="submit"
								disabled={projectLoading || isSubmitting || projectForm.isSubmitting}
								className="bg-interactive hover:bg-interactive-hover flex-1 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
							>
								{projectLoading || isSubmitting || projectForm.isSubmitting
									? "Creating..."
									: "Create Project"}
							</button>
							<button
								type="button"
								onClick={onClose}
								className="border-layout-background hover:bg-layout-background flex-1 rounded-lg border px-4 py-2 transition-colors"
								aria-label="Cancel"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default ProjectCreationModal;
