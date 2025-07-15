import React, { useState, useRef, useEffect } from "react";
import { useOrganization } from "../hooks/useOrganization";
import { useProject } from "../hooks/useProject";
import OrganizationSelector from "./OrganizationSelector";
import ProjectCreationModal from "./ProjectCreationModal";
import { logger } from "../utils/logger";
import type { AuthUser, Organization } from "../types";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser) => void;
	logout: () => Promise<void>;
}

interface NavigationPanelProps {
	onPageChange: (page: Page) => void;
	onShowRegistration: () => void;
	onShowSignIn: () => void;
	auth: Auth;
	isOpen: boolean;
	onClose: () => void;
	userEmail: string;
	userName: string;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
	onPageChange,
	onShowRegistration,
	onShowSignIn,
	auth,
	isOpen,
	onClose,
	userEmail,
	userName
}) => {
	const {
		organizations,
		currentOrganization,
		error: orgError,
		loadOrganizations,
		getOrganizationById,
		leaveOrganization
	} = useOrganization();

	const {
		projects,
		isLoading: projectLoading,
		error: projectError,
		loadProjects,
		loadProjectsByOrganization
	} = useProject();

	const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
	const [showOrganizationSelector, setShowOrganizationSelector] = useState(false);
	const [showProjectCreationModal, setShowProjectCreationModal] = useState(false);
	const [showOrgDropdown, setShowOrgDropdown] = useState(false);
	const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "active" | "completed" | "archived">("all");

	const panelRef = useRef<HTMLDivElement>(null);
	const toggleRef = useRef<HTMLButtonElement>(null);

	// Load organizations and projects on mount
	useEffect(() => {
		if (auth.isAuthenticated) {
			loadOrganizations();
		}
	}, [auth.isAuthenticated, loadOrganizations]);

	// Load projects when organization changes
	useEffect(() => {
		if (auth.isAuthenticated) {
			if (currentOrganization) {
				loadProjectsByOrganization(currentOrganization.id);
			} else {
				loadProjects();
			}
		}
	}, [auth.isAuthenticated, currentOrganization, loadProjects, loadProjectsByOrganization]);

	// Close navigation panel when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent): void => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		const handleEscapeKey = (event: KeyboardEvent): void => {
			if (event.key === "Escape") {
				onClose();
				toggleRef.current?.focus();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscapeKey);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen, onClose]);

	const handleMenuItemClick = (page: Page): void => {
		onClose();
		onPageChange(page);
	};

	const handleProjectsToggle = (): void => {
		setIsProjectsExpanded(!isProjectsExpanded);
	};

	const handleShowSignIn = (): void => {
		onClose();
		onShowSignIn();
	};

	const handleShowRegistration = (): void => {
		onClose();
		onShowRegistration();
	};

	const handleLogout = async (): Promise<void> => {
		onClose();
		try {
			await auth.logout();
			onPageChange("home");
		} catch (error) {
			logger.error("Logout error", { error });
			onPageChange("home");
		}
	};

	const handleOrganizationSwitch = async (orgId: string): Promise<void> => {
		try {
			await getOrganizationById(orgId);
			setShowOrgDropdown(false);
		} catch (error) {
			logger.error("Failed to switch organization", { error });
		}
	};

	const handleLeaveOrganization = async (): Promise<void> => {
		if (currentOrganization) {
			try {
				await leaveOrganization(currentOrganization.id);
				setShowLeaveConfirmation(false);
			} catch (error) {
				logger.error("Failed to leave organization", { error });
			}
		}
	};

	const handleProjectCreated = (): void => {
		setShowProjectCreationModal(false);
		// Refresh projects list
		if (currentOrganization) {
			loadProjectsByOrganization(currentOrganization.id);
		} else {
			loadProjects();
		}
	};

	const handleOrganizationSelected = (organization: Organization | null): void => {
		setShowOrganizationSelector(false);
		if (organization) {
			getOrganizationById(organization.id);
		}
	};

	const handleRetryOrganizations = (): void => {
		loadOrganizations();
	};

	const handleRetryProjects = (): void => {
		if (currentOrganization) {
			loadProjectsByOrganization(currentOrganization.id);
		} else {
			loadProjects();
		}
	};

	// Filter projects based on search term and status
	const filteredProjects = projects.filter(project => {
		const matchesSearch =
			project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));

		const matchesStatus = projectStatusFilter === "all" || project.status === projectStatusFilter;

		return matchesSearch && matchesStatus;
	});

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};

	if (!isOpen) return null;

	return (
		<>
			<div className="fixed inset-0 z-50 flex">
				{/* Backdrop */}
				<div className="fixed inset-0 bg-black/50" onClick={onClose} />

				{/* Panel */}
				<div
					ref={panelRef}
					className="border-layout-background bg-content-background fixed top-0 right-0 z-[1000] h-screen w-96 overflow-y-auto border-l shadow-lg"
					role="dialog"
					aria-labelledby="navigation-panel-title"
				>
					{/* Header */}
					<div className="border-layout-background bg-layout-background sticky top-0 z-10 flex items-center justify-between border-b p-4">
						<div className="flex items-center gap-3">
							<div className="bg-layout-background text-interactive flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
								</svg>
							</div>
							<div className="min-w-0">
								{auth.isAuthenticated ? (
									<>
										<div className="text-text-primary text-sm font-semibold">{userName}</div>
										<div className="text-text-primary/70 text-xs">{userEmail}</div>
									</>
								) : (
									<div className="text-text-primary text-sm">Guest</div>
								)}
							</div>
						</div>

						<button
							onClick={onClose}
							className="text-text-primary/50 hover:text-text-primary"
							aria-label="Close"
						>
							✕
						</button>
					</div>

					{/* Organization Context */}
					{auth.isAuthenticated && (
						<div className="border-layout-background border-b p-4">
							<div className="flex items-center justify-between">
								<div className="min-w-0 flex-1">
									<h3 className="text-text-primary text-sm font-semibold">
										{currentOrganization ? currentOrganization.name : "Personal"}
									</h3>
									<p className="text-text-primary/70 text-xs">
										{currentOrganization ? currentOrganization.domain : userEmail}
									</p>
									{currentOrganization && (
										<p className="text-text-primary/60 text-xs">
											{currentOrganization.max_users} members • Created{" "}
											{formatDate(currentOrganization.created_at)}
										</p>
									)}
								</div>

								<div className="relative">
									<button
										onClick={() => setShowOrgDropdown(!showOrgDropdown)}
										className="text-text-primary/70 hover:text-text-primary"
										aria-label="Switch Organization"
										aria-expanded={showOrgDropdown}
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
											<path d="M7 10l5 5 5-5z" />
										</svg>
									</button>

									{showOrgDropdown && (
										<div className="border-layout-background bg-content-background absolute top-full right-0 z-20 mt-1 w-48 rounded-lg border shadow-lg">
											<div className="p-2">
												{organizations.map(org => (
													<button
														key={org.id}
														onClick={() => handleOrganizationSwitch(org.id)}
														className={`text-text-primary hover:bg-interactive-hover hover:text-text-primary w-full rounded px-3 py-2 text-left text-sm transition-colors ${
															currentOrganization?.id === org.id
																? "bg-interactive-hover"
																: ""
														}`}
														role="option"
														aria-label={`Switch to ${org.name}`}
													>
														{org.name}
													</button>
												))}

												<div className="border-layout-background my-2 border-t" />

												<button
													onClick={() => {
														setShowOrgDropdown(false);
														setShowOrganizationSelector(true);
													}}
													className="text-text-primary hover:bg-interactive-hover hover:text-text-primary w-full rounded px-3 py-2 text-left text-sm transition-colors"
													aria-label="Join Organization"
												>
													Join Organization
												</button>

												<button
													onClick={() => setShowOrganizationSelector(true)}
													className="text-text-primary hover:bg-interactive-hover hover:text-text-primary w-full rounded px-3 py-2 text-left text-sm transition-colors"
													aria-label="Create Organization"
												>
													Create Organization
												</button>
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Organization Actions */}
							<div className="mt-3 flex gap-2">
								<button
									onClick={() => setShowProjectCreationModal(true)}
									className="bg-interactive hover:bg-interactive-hover flex-1 rounded px-3 py-2 text-xs text-white transition-colors"
									aria-label="Create Project"
								>
									Create Project
								</button>

								{currentOrganization && currentOrganization.scope !== "personal" && (
									<button
										onClick={() => setShowLeaveConfirmation(true)}
										className="border-layout-background flex-1 rounded border px-3 py-2 text-xs text-red-600 transition-colors hover:bg-red-50"
										aria-label="Leave Organization"
									>
										Leave Org
									</button>
								)}
							</div>
						</div>
					)}

					{/* Error Messages */}
					{orgError && (
						<div className="bg-error-background text-error mx-4 mt-4 rounded-lg p-3">
							<div className="flex items-center justify-between">
								<span className="text-sm">{orgError}</span>
								<button
									onClick={handleRetryOrganizations}
									className="ml-2 text-sm underline"
									aria-label="Retry"
								>
									Retry
								</button>
							</div>
						</div>
					)}

					{projectError && (
						<div className="bg-error-background text-error mx-4 mt-4 rounded-lg p-3">
							<div className="flex items-center justify-between">
								<span className="text-sm">{projectError}</span>
								<button
									onClick={handleRetryProjects}
									className="ml-2 text-sm underline"
									aria-label="Retry"
								>
									Retry
								</button>
							</div>
						</div>
					)}

					{/* Projects Section */}
					{auth.isAuthenticated && auth.user?.has_projects_access && (
						<div className="p-4">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-text-primary text-sm font-semibold">Projects</h3>
								<button
									onClick={handleProjectsToggle}
									className="text-text-primary/70 hover:text-text-primary"
									aria-expanded={isProjectsExpanded}
								>
									<svg
										className={`transition-transform duration-200 ${
											isProjectsExpanded ? "rotate-90" : ""
										}`}
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M9 5l7 7-7 7V5z" />
									</svg>
								</button>
							</div>

							{isProjectsExpanded && (
								<div className="space-y-4">
									{/* Search and Filter */}
									<div className="space-y-2">
										<input
											type="text"
											placeholder="Search projects..."
											value={searchTerm}
											onChange={e => setSearchTerm(e.target.value)}
											className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded border px-3 py-2 text-sm focus:ring-1"
										/>

										<select
											value={projectStatusFilter}
											onChange={e =>
												setProjectStatusFilter(e.target.value as typeof projectStatusFilter)
											}
											className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded border px-3 py-2 text-sm focus:ring-1"
											aria-label="Status Filter"
										>
											<option value="all">All Status</option>
											<option value="active">Active</option>
											<option value="completed">Completed</option>
											<option value="archived">Archived</option>
										</select>
									</div>

									{/* Loading State */}
									{projectLoading && (
										<div className="text-text-primary/70 py-4 text-center text-sm">
											Loading projects...
										</div>
									)}

									{/* Projects List */}
									{!projectLoading && (
										<div className="space-y-2">
											{filteredProjects.length > 0 ? (
												filteredProjects.map(project => (
													<div
														key={project.id}
														className="border-layout-background hover:bg-layout-background cursor-pointer rounded border p-3 transition-colors"
													>
														<div className="flex items-center justify-between">
															<div className="min-w-0 flex-1">
																<h4 className="text-text-primary text-sm font-medium">
																	{project.name}
																</h4>
																{project.description && (
																	<p className="text-text-primary/70 text-xs">
																		{project.description}
																	</p>
																)}
																<div className="text-text-primary/60 mt-1 text-xs">
																	<span className="capitalize">
																		{project.visibility}
																	</span>
																	<span className="mx-1">•</span>
																	<span className="capitalize">{project.status}</span>
																</div>
															</div>
														</div>
													</div>
												))
											) : (
												<div className="text-text-primary/70 py-8 text-center text-sm">
													No projects found
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Navigation Menu */}
					<div className="border-layout-background border-t p-4">
						{auth.isAuthenticated ? (
							<div className="space-y-2">
								<button
									onClick={() => handleMenuItemClick("profile")}
									className="text-text-primary hover:bg-interactive-hover hover:text-text-primary flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
									</svg>
									My Profile
								</button>

								<button
									onClick={() => handleMenuItemClick("teams")}
									className="text-text-primary hover:bg-interactive-hover hover:text-text-primary flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4h2v-7H7v2H4V8h3V7H2v11h2zm11-1c-1.11 0-2-.89-2-2s.89-2 2-2 2 .89 2 2-.89 2-2 2zm-1-9v3h2v-3h-2z" />
									</svg>
									My Teams
								</button>

								<button
									onClick={() => handleMenuItemClick("calendar")}
									className="text-text-primary hover:bg-interactive-hover hover:text-text-primary flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
									</svg>
									Calendar
								</button>

								<button
									onClick={() => handleMenuItemClick("dashboard")}
									className="text-text-primary hover:bg-interactive-hover hover:text-text-primary flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
									</svg>
									Dashboard
								</button>

								<button
									onClick={() => handleMenuItemClick("team-configuration")}
									className="text-text-primary hover:bg-interactive-hover hover:text-text-primary flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
									Team Configuration
								</button>

								<div className="border-layout-background my-4 border-t" />

								<button
									onClick={() => void handleLogout()}
									className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
									role="menuitem"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
									</svg>
									Sign Out
								</button>
							</div>
						) : (
							<div className="space-y-2">
								<button
									onClick={handleShowSignIn}
									className="text-interactive hover:text-interactive-hover flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
									</svg>
									Sign In
								</button>

								<button
									onClick={handleShowRegistration}
									className="text-interactive hover:text-interactive-hover flex w-full items-center gap-3 rounded px-3 py-2 text-sm transition-colors"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
									</svg>
									Register
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Leave Organization Confirmation */}
			{showLeaveConfirmation && currentOrganization && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
					<div className="bg-content-background max-w-md rounded-lg p-6">
						<h3 className="text-text-primary mb-4 text-lg font-semibold">Leave Organization</h3>
						<p className="text-text-primary/70 mb-6">
							Are you sure you want to leave {currentOrganization.name}?
						</p>
						<div className="flex gap-3">
							<button
								onClick={handleLeaveOrganization}
								className="flex-1 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
								aria-label="Confirm"
							>
								Leave
							</button>
							<button
								onClick={() => setShowLeaveConfirmation(false)}
								className="border-layout-background hover:bg-layout-background flex-1 rounded border px-4 py-2"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modals */}
			{showOrganizationSelector && (
				<OrganizationSelector
					isOpen={true}
					onClose={() => setShowOrganizationSelector(false)}
					onSelect={handleOrganizationSelected}
					userEmail={userEmail}
					allowCreate={true}
					allowPersonal={false}
					mode="select"
				/>
			)}

			{showProjectCreationModal && (
				<ProjectCreationModal
					isOpen={true}
					onClose={() => setShowProjectCreationModal(false)}
					onSuccess={handleProjectCreated}
					userEmail={userEmail}
					preselectedOrganization={currentOrganization}
					defaultVisibility="team"
				/>
			)}
		</>
	);
};

export default NavigationPanel;
