import React, { useState } from "react";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import Card from "../components/atoms/Card";
import { useTeams } from "../hooks/useTeams";
import { TeamService } from "../services/TeamService";
import type { Team, CreateTeamData } from "../types";
import { formatDate, formatVelocity, formatSprintLength, formatWorkingDays } from "../utils/formatters";

const TeamsPage: React.FC = () => {
	// Use teams hook for all data management
	const { teams, isLoading, error, refreshTeams, createTeam, updateTeam, deleteTeam } = useTeams();

	// Modal and form state
	const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [showTeamModal, setShowTeamModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	// Form state
	const [formData, setFormData] = useState<CreateTeamData>({
		name: "",
		description: "",
		velocity_baseline: 0,
		sprint_length_days: 14,
		working_days_per_week: 5
	});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});

	// Modal handlers
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

	// Form submission
	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		// Use TeamService for validation
		const validation = TeamService.validateTeam(formData);
		if (!validation.isValid) {
			setFormErrors(validation.errors);
			return;
		}

		try {
			if (isEditing && currentTeam) {
				await updateTeam(currentTeam.id, formData);
			} else {
				await createTeam(formData);
			}
			closeModals();
		} catch {
			// Error handling is done in the hook
		}
	};

	// Delete handler
	const handleDelete = async (): Promise<void> => {
		if (!currentTeam) return;

		try {
			await deleteTeam(currentTeam.id);
			closeModals();
		} catch {
			// Error handling is done in the hook
		}
	};

	// Render team card using Card component
	const renderTeamCard = (team: Team): React.JSX.Element => {
		const actions = [
			{
				label: "Edit team",
				onClick: () => openEditModal(team),
				icon: "✏️"
			},
			{
				label: "Delete team",
				onClick: () => openDeleteModal(team),
				icon: "🗑️"
			}
		];

		const data = [
			{ label: "Velocity", value: formatVelocity(team.velocity_baseline) },
			{ label: "Sprint Length", value: formatSprintLength(team.sprint_length_days) },
			{ label: "Working Days", value: formatWorkingDays(team.working_days_per_week) },
			{ label: "Created", value: formatDate(team.created_at) }
		];

		return <Card key={team.id} title={team.name} description={team.description} actions={actions} data={data} />;
	};

	// Loading state
	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Management</h2>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
					<p className="text-text-primary mb-4">Loading teams...</p>
				</div>
			</main>
		);
	}

	// Error state
	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Management</h2>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Teams</h3>
						<p className="text-text-primary mb-6">{error}</p>
						<Button onClick={() => void refreshTeams()} variant="secondary">
							Retry
						</Button>
					</div>
				</div>
			</main>
		);
	}

	// Main content
	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Management</h2>
				<Button onClick={openCreateModal}>Create New Team</Button>
			</div>

			{teams.length === 0 ? (
				<div className="border-layout-background text-text-primary rounded-md border border-dashed bg-gray-50 p-8 text-center italic">
					<div className="mx-auto max-w-sm">
						<h3 className="text-text-primary mb-3 text-xl font-semibold">No Teams Yet</h3>
						<p className="text-text-primary mb-6">
							Create your first team to start planning sprint capacity.
						</p>
						<Button onClick={openCreateModal}>Create Team</Button>
					</div>
				</div>
			) : (
				<div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
					{Array.isArray(teams) ? teams.map(renderTeamCard) : []}
				</div>
			)}

			{/* Team Modal */}
			{showTeamModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
					<div className="bg-content-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg shadow-lg">
						<div className="border-layout-background flex items-center justify-between border-b p-6">
							<h3 className="text-text-contrast m-0 text-xl font-semibold">
								{isEditing ? "Edit Team" : "Create New Team"}
							</h3>
							<Button onClick={closeModals} variant="icon">
								&times;
							</Button>
						</div>

						<form onSubmit={e => void handleSubmit(e)} className="p-6">
							<div className="border-layout-background mb-8 border-b pb-6">
								<h4 className="text-text-contrast mb-6 text-base font-semibold">Basic Information</h4>

								<Input
									label="Team Name"
									required
									value={formData.name}
									onChange={e => setFormData({ ...formData, name: e.target.value })}
									placeholder="e.g., Frontend Development Team"
									error={formErrors.name}
								/>

								<Input
									label="Description"
									multiline
									value={formData.description}
									onChange={e => setFormData({ ...formData, description: e.target.value })}
									placeholder="Brief description of the team's focus and responsibilities"
									error={formErrors.description}
								/>
							</div>

							<div className="border-layout-background mb-8 border-b pb-6">
								<h4 className="text-text-contrast mb-6 text-base font-semibold">
									Sprint Configuration
								</h4>

								<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
									<Input
										label="Velocity"
										type="number"
										value={formData.velocity_baseline.toString()}
										onChange={e =>
											setFormData({
												...formData,
												velocity_baseline: parseInt(e.target.value) || 0
											})
										}
										min="0"
										step="1"
										placeholder="Story points per sprint"
										helper="Average story points completed per sprint (leave 0 if unknown)"
										error={formErrors.velocity_baseline}
									/>

									<Input
										label="Sprint Length"
										required
										options={[
											{ value: 7, label: "1 Week" },
											{ value: 14, label: "2 Weeks" },
											{ value: 21, label: "3 Weeks" },
											{ value: 28, label: "4 Weeks" }
										]}
										value={formData.sprint_length_days.toString()}
										onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
											setFormData({
												...formData,
												sprint_length_days: parseInt(e.target.value)
											})
										}
									/>
								</div>

								<Input
									label="Working Days per Week"
									required
									options={[
										{ value: 3, label: "3 Days" },
										{ value: 4, label: "4 Days" },
										{ value: 5, label: "5 Days (Standard)" },
										{ value: 6, label: "6 Days" }
									]}
									value={formData.working_days_per_week.toString()}
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setFormData({
											...formData,
											working_days_per_week: parseInt(e.target.value)
										})
									}
								/>
							</div>

							<div className="border-layout-background flex justify-end gap-4 border-t p-6">
								<Button type="button" onClick={closeModals} variant="secondary">
									Cancel
								</Button>
								<Button type="submit">{isEditing ? "Update Team" : "Create Team"}</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && currentTeam && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
					<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-lg">
						<div className="border-layout-background flex items-center justify-between border-b p-6">
							<h3 className="text-text-contrast m-0 text-xl font-semibold">Delete Team</h3>
							<Button onClick={closeModals} variant="icon">
								&times;
							</Button>
						</div>

						<div className="p-6">
							<p className="text-text-primary mb-4">
								Are you sure you want to delete <strong>{currentTeam.name}</strong>?
							</p>
							<p className="text-sm text-red-600">
								This action cannot be undone. All team data and calendar entries will be permanently
								removed.
							</p>
						</div>

						<div className="border-layout-background flex justify-end gap-4 border-t p-6">
							<Button onClick={closeModals} variant="secondary">
								Cancel
							</Button>
							<Button onClick={() => void handleDelete()} variant="danger">
								Delete Team
							</Button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
};

export default TeamsPage;
