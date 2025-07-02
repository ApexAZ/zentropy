import React, { useState, useEffect } from "react";

interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at: string;
	updated_at: string;
}

interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

// interface ValidationError {
//   message: string
//   field?: string
//   details?: string
// }

const TeamsPage: React.FC = () => {
	// State management
	const [teams, setTeams] = useState<Team[]>([]);
	const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [showTeamModal, setShowTeamModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	// Form state
	const [formData, setFormData] = useState<CreateTeamData>({
		name: "",
		description: "",
		velocity_baseline: 0,
		sprint_length_days: 14,
		working_days_per_week: 5
	});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	// Load teams on component mount
	useEffect(() => {
		const loadTeams = async (): Promise<void> => {
			try {
				setIsLoading(true);
				setError("");

				const response = await fetch("/api/teams");
				if (!response.ok) {
					throw new Error(`Failed to load teams: ${response.status}`);
				}

				const data = (await response.json()) as Team[];
				setTeams(data);
			} catch (err) {
				// console.error('Error loading teams:', err)
				setError(err instanceof Error ? err.message : "Failed to load teams");
			} finally {
				setIsLoading(false);
			}
		};

		void loadTeams();
	}, []);

	// Hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const refreshTeams = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			const response = await fetch("/api/teams");
			if (!response.ok) {
				throw new Error(`Failed to load teams: ${response.status}`);
			}

			const data = (await response.json()) as Team[];
			setTeams(data);
		} catch (err) {
			// console.error('Error loading teams:', err)
			setError(err instanceof Error ? err.message : "Failed to load teams");
		} finally {
			setIsLoading(false);
		}
	};

	const openCreateModal = (): void => {
		setCurrentTeam(null);
		setIsEditing(false);
		setFormData({
			name: "",
			description: "",
			velocity_baseline: 0,
			sprint_length_days: 14,
			working_days_per_week: 5
		});
		setFormErrors({});
		setShowTeamModal(true);
	};

	const openEditModal = (team: Team): void => {
		setCurrentTeam(team);
		setIsEditing(true);
		setFormData({
			name: team.name,
			description: team.description ?? "",
			velocity_baseline: team.velocity_baseline,
			sprint_length_days: team.sprint_length_days,
			working_days_per_week: team.working_days_per_week
		});
		setFormErrors({});
		setShowTeamModal(true);
	};

	const openDeleteModal = (team: Team): void => {
		setCurrentTeam(team);
		setShowDeleteModal(true);
	};

	const closeModals = (): void => {
		setShowTeamModal(false);
		setShowDeleteModal(false);
		setCurrentTeam(null);
		setFormErrors({});
	};

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		if (!formData.name.trim()) {
			errors.name = "Team name is required";
		} else if (formData.name.length > 100) {
			errors.name = "Team name must be less than 100 characters";
		}

		if (formData.description && formData.description.length > 500) {
			errors.description = "Description must be less than 500 characters";
		}

		if (formData.velocity_baseline < 0) {
			errors.velocity_baseline = "Velocity must be 0 or greater";
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			const method = isEditing ? "PUT" : "POST";
			const url = isEditing ? `/api/teams/${currentTeam?.id}` : "/api/teams";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to save team");
			}

			setToast({
				message: isEditing ? "Team updated successfully!" : "Team created successfully!",
				type: "success"
			});

			closeModals();
			void refreshTeams();
		} catch (err) {
			// console.error('Error saving team:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to save team",
				type: "error"
			});
		}
	};

	const handleDelete = async (): Promise<void> => {
		if (!currentTeam) {
			return;
		}

		try {
			const response = await fetch(`/api/teams/${currentTeam.id}`, {
				method: "DELETE"
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to delete team");
			}

			setToast({
				message: "Team deleted successfully!",
				type: "success"
			});

			closeModals();
			void refreshTeams();
		} catch (err) {
			// console.error('Error deleting team:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to delete team",
				type: "error"
			});
		}
	};

	const formatDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};

	const renderTeamCard = (team: Team): React.JSX.Element => (
		<div
			key={team.id}
			className="rounded-lg border border-layout-background bg-content-background p-6 shadow-sm transition-shadow hover:shadow-md"
		>
			<div className="mb-4 flex items-start justify-between">
				<div>
					<h3 className="mb-2 text-lg font-semibold text-text-contrast">{team.name}</h3>
					{team.description && <p className="mb-3 text-sm text-text-primary">{team.description}</p>}
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => openEditModal(team)}
						className="p-2 text-text-primary transition-colors hover:text-text-contrast"
						title="Edit team"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
						</svg>
					</button>
					<button
						onClick={() => openDeleteModal(team)}
						className="p-2 text-text-primary transition-colors hover:text-red-600"
						title="Delete team"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
						</svg>
					</button>
				</div>
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-text-primary">Velocity:</span>
					<span className="font-medium">
						{team.velocity_baseline > 0 ? `${team.velocity_baseline} points` : "Not set"}
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-primary">Sprint Length:</span>
					<span className="font-medium">{team.sprint_length_days} days</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-primary">Working Days:</span>
					<span className="font-medium">{team.working_days_per_week} days/week</span>
				</div>
				<div className="flex justify-between">
					<span className="text-text-primary">Created:</span>
					<span className="font-medium">{formatDate(team.created_at)}</span>
				</div>
			</div>
		</div>
	);

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-text-contrast">Team Management</h2>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-layout-background border-t-interactive"></div>
					<p className="mb-4 text-text-primary">Loading teams...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="m-0 text-3xl font-semibold text-text-contrast">Team Management</h2>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Teams</h3>
						<p className="mb-6 text-text-primary">{error}</p>
						<button
							onClick={() => void refreshTeams()}
							className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-layout-background bg-content-background px-4 py-2 text-center text-base font-medium text-text-primary no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
						>
							Retry
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="m-0 text-3xl font-semibold text-text-contrast">Team Management</h2>
				<button
					onClick={openCreateModal}
					className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-interactive px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:-translate-y-px hover:bg-interactive-hover hover:shadow-md active:translate-y-0"
				>
					Create New Team
				</button>
			</div>

			{teams.length === 0 ? (
				<div className="rounded-md border border-dashed border-layout-background bg-gray-50 p-8 text-center text-text-primary italic">
					<div className="mx-auto max-w-sm">
						<h3 className="mb-3 text-xl font-semibold text-text-primary">No Teams Yet</h3>
						<p className="mb-6 text-text-primary">Create your first team to start planning sprint capacity.</p>
						<button
							onClick={openCreateModal}
							className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-interactive px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-interactive-hover"
						>
							Create Team
						</button>
					</div>
				</div>
			) : (
				<div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
					{teams.map(renderTeamCard)}
				</div>
			)}

			{/* Team Modal */}
			{showTeamModal && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
					<div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-content-background shadow-lg">
						<div className="flex items-center justify-between border-b border-layout-background p-6">
							<h3 className="m-0 text-xl font-semibold text-text-contrast">
								{isEditing ? "Edit Team" : "Create New Team"}
							</h3>
							<button
								onClick={closeModals}
								className="cursor-pointer rounded-md border-none bg-none p-2 text-2xl text-text-primary transition-colors duration-200 hover:text-text-contrast"
							>
								&times;
							</button>
						</div>

						<form onSubmit={e => void handleSubmit(e)} className="p-6">
							<div className="mb-8 border-b border-layout-background pb-6">
								<h4 className="mb-6 text-base font-semibold text-text-contrast">Basic Information</h4>

								<div className="mb-6">
									<label htmlFor="teamNameInput" className="mb-2 block font-medium text-text-primary">
										Team Name *
									</label>
									<input
										id="teamNameInput"
										type="text"
										value={formData.name}
										onChange={e => setFormData({ ...formData, name: e.target.value })}
										placeholder="e.g., Frontend Development Team"
										className="w-full rounded-md border border-layout-background p-3 text-base leading-6 transition-all duration-200 focus:border-interactive focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									{formErrors.name && (
										<span className="mt-1 block text-sm text-red-600">{formErrors.name}</span>
									)}
								</div>

								<div className="mb-6">
									<label htmlFor="teamDescInput" className="mb-2 block font-medium text-text-primary">
										Description
									</label>
									<textarea
										id="teamDescInput"
										value={formData.description}
										onChange={e => setFormData({ ...formData, description: e.target.value })}
										rows={3}
										placeholder="Brief description of the team's focus and responsibilities"
										className="resize-vertical min-h-[80px] w-full rounded-md border border-layout-background p-3 text-base leading-6 transition-all duration-200 focus:border-interactive focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
									/>
									{formErrors.description && (
										<span className="mt-1 block text-sm text-red-600">
											{formErrors.description}
										</span>
									)}
								</div>
							</div>

							<div className="mb-8 border-b border-layout-background pb-6">
								<h4 className="mb-6 text-base font-semibold text-text-contrast">Sprint Configuration</h4>

								<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
									<div>
										<label htmlFor="velocityInput" className="mb-2 block font-medium text-text-primary">
											Velocity
										</label>
										<input
											id="velocityInput"
											type="number"
											value={formData.velocity_baseline}
											onChange={e =>
												setFormData({
													...formData,
													velocity_baseline: parseInt(e.target.value) || 0
												})
											}
											min="0"
											step="1"
											placeholder="Story points per sprint"
											className="w-full rounded-md border border-layout-background p-3 text-base leading-6 transition-all duration-200 focus:border-interactive focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										/>
										<small className="mt-1 block text-sm text-text-primary">
											Average story points completed per sprint (leave 0 if unknown)
										</small>
										{formErrors.velocity_baseline && (
											<span className="mt-1 block text-sm text-red-600">
												{formErrors.velocity_baseline}
											</span>
										)}
									</div>

									<div>
										<label
											htmlFor="sprintLengthSelect"
											className="mb-2 block font-medium text-text-primary"
										>
											Sprint Length *
										</label>
										<select
											id="sprintLengthSelect"
											value={formData.sprint_length_days}
											onChange={e =>
												setFormData({
													...formData,
													sprint_length_days: parseInt(e.target.value)
												})
											}
											className="w-full rounded-md border border-layout-background p-3 text-base leading-6 transition-all duration-200 focus:border-interactive focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
											required
										>
											<option value={7}>1 Week</option>
											<option value={14}>2 Weeks</option>
											<option value={21}>3 Weeks</option>
											<option value={28}>4 Weeks</option>
										</select>
									</div>
								</div>

								<div>
									<label htmlFor="workingDaysSelect" className="mb-2 block font-medium text-text-primary">
										Working Days per Week *
									</label>
									<select
										id="workingDaysSelect"
										value={formData.working_days_per_week}
										onChange={e =>
											setFormData({
												...formData,
												working_days_per_week: parseInt(e.target.value)
											})
										}
										className="w-full rounded-md border border-layout-background p-3 text-base leading-6 transition-all duration-200 focus:border-interactive focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									>
										<option value={3}>3 Days</option>
										<option value={4}>4 Days</option>
										<option value={5}>5 Days (Standard)</option>
										<option value={6}>6 Days</option>
									</select>
								</div>
							</div>

							<div className="flex justify-end gap-4 border-t border-layout-background p-6">
								<button
									type="button"
									onClick={closeModals}
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-layout-background bg-content-background px-4 py-2 text-center text-base font-medium text-text-primary no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-interactive px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-interactive-hover"
								>
									{isEditing ? "Update Team" : "Create Team"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && currentTeam && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
					<div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-content-background shadow-lg">
						<div className="flex items-center justify-between border-b border-layout-background p-6">
							<h3 className="m-0 text-xl font-semibold text-text-contrast">Delete Team</h3>
							<button
								onClick={closeModals}
								className="cursor-pointer rounded-md border-none bg-none p-2 text-2xl text-text-primary transition-colors duration-200 hover:text-text-contrast"
							>
								&times;
							</button>
						</div>

						<div className="p-6">
							<p className="mb-4 text-text-primary">
								Are you sure you want to delete <strong>{currentTeam.name}</strong>?
							</p>
							<p className="text-sm text-red-600">
								This action cannot be undone. All team data and calendar entries will be permanently
								removed.
							</p>
						</div>

						<div className="flex justify-end gap-4 border-t border-layout-background p-6">
							<button
								onClick={closeModals}
								className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-layout-background bg-content-background px-4 py-2 text-center text-base font-medium text-text-primary no-underline transition-all duration-200 hover:border-gray-400 hover:bg-gray-50"
							>
								Cancel
							</button>
							<button
								onClick={() => void handleDelete()}
								className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-red-600 px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-red-700"
							>
								Delete Team
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast */}
			{toast && (
				<div className="fixed top-5 right-5 z-[60] min-w-[300px] animate-[slideIn_0.3s_ease] rounded-md shadow-lg">
					<div
						className={`flex items-center justify-between gap-2 p-4 ${
							toast.type === "success"
								? "border border-green-200 bg-green-50"
								: "border border-red-200 bg-red-50"
						}`}
					>
						<span className={toast.type === "success" ? "text-green-700" : "text-red-700"}>
							{toast.message}
						</span>
						<button
							onClick={() => setToast(null)}
							className="text-xl opacity-80 transition-opacity duration-200 hover:opacity-100"
						>
							&times;
						</button>
					</div>
				</div>
			)}
		</main>
	);
};

export default TeamsPage;
