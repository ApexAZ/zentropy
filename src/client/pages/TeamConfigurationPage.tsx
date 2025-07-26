import React, { useState, useEffect } from "react";
import type { Team, TeamMember, Sprint, TeamBasicData, VelocityData, AddMemberData, CreateSprintData } from "../types";
import { formatDate, getDayName } from "../utils/formatters";
import { TeamService } from "../services";
import { useToast } from "../contexts/ToastContext";

// interface GenerateSprintsData {
//   starting_sprint_number: number
//   number_of_sprints: number
//   first_sprint_start_date: string
// }

const TeamConfigurationPage: React.FC = () => {
	const [team, setTeam] = useState<Team | null>(null);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [sprints, setSprints] = useState<Sprint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");

	// Toast notifications
	const { showSuccess, showError } = useToast();

	// Form states
	const [teamBasicData, setTeamBasicData] = useState<TeamBasicData>({
		name: "",
		description: "",
		working_days: [1, 2, 3, 4, 5] // Mon-Fri by default
	});
	const [velocityData, setVelocityData] = useState<VelocityData>({
		baseline_velocity: 0,
		sprint_length: 2 // 2 weeks default
	});

	// Modal states
	const [showAddMemberModal, setShowAddMemberModal] = useState(false);
	const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
	// const [showGenerateSprintsModal, setShowGenerateSprintsModal] = useState(false)

	const [addMemberData, setAddMemberData] = useState<AddMemberData>({
		email: "",
		role: "member"
	});
	const [createSprintData, setCreateSprintData] = useState<CreateSprintData>({
		name: "",
		start_date: "",
		end_date: ""
	});
	// const [generateSprintsData, setGenerateSprintsData] = useState<GenerateSprintsData>({
	//   starting_sprint_number: 3,
	//   number_of_sprints: 6,
	//   first_sprint_start_date: ''
	// })

	const [memberErrors, setMemberErrors] = useState<Record<string, string>>({});
	const [sprintErrors, setSprintErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		void loadTeamConfiguration();
	}, []);

	const loadTeamConfiguration = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			// Load team data - assuming we have a team ID (could come from URL params)
			const teamId = "1"; // This would typically come from route params

			const [teamData, membersData, sprintsData] = await Promise.all([
				TeamService.getTeam(teamId),
				TeamService.getTeamMembers(teamId).catch(() => []), // Graceful fallback for empty data
				TeamService.getTeamSprints(teamId).catch(() => []) // Graceful fallback for empty data
			]);

			setTeam(teamData);
			setTeamMembers(membersData);
			setSprints(sprintsData);

			// Initialize form data
			setTeamBasicData({
				name: teamData.name,
				description: teamData.description ?? "",
				working_days: teamData.working_days ?? [1, 2, 3, 4, 5]
			});
			setVelocityData({
				baseline_velocity: teamData.velocity_baseline,
				sprint_length: Math.ceil(teamData.sprint_length_days / 7)
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load team configuration");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveTeamInfo = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!team) {
			return;
		}

		try {
			const updatedTeam = await TeamService.updateTeamBasicInfo(team.id, teamBasicData);
			setTeam(updatedTeam);
			showSuccess("Team information updated successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to update team information");
		}
	};

	const handleSaveVelocity = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!team) {
			return;
		}

		try {
			const updatedTeam = await TeamService.updateTeamVelocity(team.id, velocityData);
			setTeam(updatedTeam);
			showSuccess("Velocity settings updated successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to update velocity settings");
		}
	};

	const handleAddMember = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!team) {
			return;
		}

		const errors: Record<string, string> = {};
		if (!addMemberData.email.trim()) {
			errors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addMemberData.email)) {
			errors.email = "Please enter a valid email address";
		}

		setMemberErrors(errors);
		if (Object.keys(errors).length > 0) {
			return;
		}

		try {
			const newMember = await TeamService.addTeamMember(team.id, addMemberData);
			setTeamMembers([...teamMembers, newMember]);
			setShowAddMemberModal(false);
			setAddMemberData({ email: "", role: "member" });
			setMemberErrors({});
			showSuccess("Team member added successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to add team member");
		}
	};

	const handleRemoveMember = async (memberId: string): Promise<void> => {
		if (!team || !confirm("Are you sure you want to remove this team member?")) {
			return;
		}

		try {
			await TeamService.removeTeamMember(team.id, memberId);
			setTeamMembers(teamMembers.filter(member => member.id !== memberId));
			showSuccess("Team member removed successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to remove team member");
		}
	};

	const handleCreateSprint = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!team) {
			return;
		}

		const errors: Record<string, string> = {};
		if (!createSprintData.name.trim()) {
			errors.name = "Sprint name is required";
		}
		if (!createSprintData.start_date) {
			errors.start_date = "Start date is required";
		}
		if (!createSprintData.end_date) {
			errors.end_date = "End date is required";
		}
		if (
			createSprintData.start_date &&
			createSprintData.end_date &&
			new Date(createSprintData.start_date) >= new Date(createSprintData.end_date)
		) {
			errors.end_date = "End date must be after start date";
		}

		setSprintErrors(errors);
		if (Object.keys(errors).length > 0) {
			return;
		}

		try {
			const newSprint = await TeamService.createSprint(team.id, createSprintData);
			setSprints([...sprints, newSprint]);
			setShowCreateSprintModal(false);
			setCreateSprintData({ name: "", start_date: "", end_date: "" });
			setSprintErrors({});
			showSuccess("Sprint created successfully!");
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to create sprint");
		}
	};

	const toggleWorkingDay = (day: number): void => {
		setTeamBasicData(prev => ({
			...prev,
			working_days: prev.working_days.includes(day)
				? prev.working_days.filter(d => d !== day)
				: [...prev.working_days, day].sort()
		}));
	};

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between px-8">
					<div>
						<h2 className="text-text-contrast font-heading-large m-0">Team Configuration</h2>
						<p className="text-text-primary font-body mt-2">
							Configure your team settings, members, velocity, and sprints
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="border-layout-background mb-4 h-10 w-10 animate-spin rounded-full border-4 border-t-blue-500"></div>
					<p className="text-text-primary font-body mb-4">Loading team configuration...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between px-8">
					<div>
						<h2 className="text-text-contrast font-heading-large m-0">Team Configuration</h2>
						<p className="text-text-primary font-body mt-2">
							Configure your team settings, members, velocity, and sprints
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<h3 className="text-error font-heading-medium mb-3">Unable to Load Configuration</h3>
						<p className="text-text-primary font-body mb-6">{error}</p>
						<button
							onClick={() => void loadTeamConfiguration()}
							className="border-layout-background bg-content-background text-text-primary hover:border-neutral-border hover:bg-neutral-background inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
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
			<div className="mb-8 flex items-center justify-between px-8">
				<div>
					<h2 className="text-text-contrast font-heading-large m-0">Team Configuration</h2>
					<p className="text-text-primary font-body mt-2">
						Configure your team settings, members, velocity, and sprints. All changes will automatically
						reflect in the calendar and capacity planning.
					</p>
				</div>
			</div>

			<div className="space-y-8">
				{/* Team Basic Settings */}
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<h3 className="text-text-contrast font-heading-medium mb-6">Team Information</h3>
					<form onSubmit={e => void handleSaveTeamInfo(e)} className="space-y-6">
						<div>
							<label htmlFor="teamName" className="text-text-primary font-body mb-2 block font-medium">
								Team Name:
							</label>
							<input
								type="text"
								id="teamName"
								value={teamBasicData.name}
								onChange={e => setTeamBasicData({ ...teamBasicData, name: e.target.value })}
								required
								placeholder="e.g., Frontend Development Team"
								className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
							/>
						</div>

						<div>
							<label
								htmlFor="teamDescription"
								className="text-text-primary font-body mb-2 block font-medium"
							>
								Description (Optional):
							</label>
							<textarea
								id="teamDescription"
								value={teamBasicData.description}
								onChange={e => setTeamBasicData({ ...teamBasicData, description: e.target.value })}
								rows={2}
								placeholder="Brief description of team responsibilities"
								className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
							/>
						</div>

						<div>
							<div className="text-text-primary font-body mb-2 block font-medium">
								Working Days Configuration:
							</div>
							<div className="text-text-primary font-body mb-4 text-sm">
								Select which days of the week your team works
							</div>
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
								{[1, 2, 3, 4, 5, 6, 0].map(day => (
									<label key={day} className="flex cursor-pointer items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={teamBasicData.working_days.includes(day)}
											onChange={() => toggleWorkingDay(day)}
											className="border-layout-background text-interactive focus:ring-interactive h-4 w-4 rounded focus:ring-2"
										/>
										<span className="text-text-primary">{getDayName(day)}</span>
									</label>
								))}
							</div>
						</div>

						<button
							type="submit"
							className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200"
						>
							Save Team Information
						</button>
					</form>
				</div>

				{/* Baseline Velocity Setting */}
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<h3 className="text-text-contrast font-heading-medium mb-6">Baseline Velocity</h3>
					<form onSubmit={e => void handleSaveVelocity(e)} className="space-y-6">
						<div>
							<label
								htmlFor="baselineVelocity"
								className="text-text-primary font-body mb-2 block font-medium"
							>
								Story Points per Sprint:
							</label>
							<input
								type="number"
								id="baselineVelocity"
								value={velocityData.baseline_velocity}
								onChange={e =>
									setVelocityData({
										...velocityData,
										baseline_velocity: parseInt(e.target.value) || 0
									})
								}
								min="1"
								step="1"
								required
								placeholder="50"
								className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
							/>
							<div className="text-text-primary font-body mt-2 text-sm">
								Average story points your team completes in a full sprint (all team members, no time
								off)
							</div>
						</div>

						<div>
							<label
								htmlFor="sprintLength"
								className="text-text-primary font-body mb-2 block font-medium"
							>
								Sprint Length (weeks):
							</label>
							<select
								id="sprintLength"
								value={velocityData.sprint_length}
								onChange={e =>
									setVelocityData({ ...velocityData, sprint_length: parseInt(e.target.value) })
								}
								required
								className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
							>
								<option value="1">1 week</option>
								<option value="2">2 weeks</option>
								<option value="3">3 weeks</option>
								<option value="4">4 weeks</option>
							</select>
						</div>

						<button
							type="submit"
							className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200"
						>
							Save Velocity Settings
						</button>
					</form>
				</div>

				{/* Team Member Management */}
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="text-text-contrast font-heading-medium">Team Members</h3>
						<button
							onClick={() => setShowAddMemberModal(true)}
							className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-4 py-2 text-center text-sm font-medium text-white no-underline transition-all duration-200"
						>
							Add Team Member
						</button>
					</div>

					{teamMembers.length === 0 ? (
						<div className="text-text-primary py-8 text-center">
							<p className="mb-4">No team members found. Add your first team member to get started.</p>
						</div>
					) : (
						<div className="space-y-4">
							{teamMembers.map(member => (
								<div
									key={member.id}
									className="border-layout-background flex items-center justify-between rounded-md border p-4"
								>
									<div>
										<div className="text-text-contrast font-medium">
											{member.first_name} {member.last_name}
										</div>
										<div className="text-text-primary text-sm">{member.email}</div>
										<div className="text-interactive text-sm">
											{member.team_role === "lead" ? "Team Lead" : "Team Member"}
										</div>
									</div>
									<button
										onClick={() => void handleRemoveMember(member.id)}
										className="text-error hover:text-error text-sm"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Sprint Management */}
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="mb-6 flex items-center justify-between">
						<h3 className="text-text-contrast font-heading-medium">Sprint Management</h3>
						<div className="flex gap-2">
							<button
								onClick={() => setShowCreateSprintModal(true)}
								className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-4 py-2 text-center text-sm font-medium text-white no-underline transition-all duration-200"
							>
								Create New Sprint
							</button>
							<button
								onClick={() => alert("Generate Multiple Sprints feature coming soon!")}
								className="border-layout-background bg-content-background text-text-primary hover:bg-neutral-background inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-sm font-medium no-underline transition-all duration-200"
							>
								Generate Multiple Sprints
							</button>
						</div>
					</div>

					{sprints.length === 0 ? (
						<div className="text-text-primary py-8 text-center">
							<p className="mb-4">No sprints found. Create your first sprint to get started.</p>
						</div>
					) : (
						<div className="space-y-4">
							{sprints.map(sprint => (
								<div
									key={sprint.id}
									className="border-layout-background flex items-center justify-between rounded-md border p-4"
								>
									<div>
										<div className="text-text-contrast font-medium">{sprint.name}</div>
										<div className="text-text-primary text-sm">
											{formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}
										</div>
										<div
											className={`text-sm ${
												sprint.status === "active"
													? "text-success"
													: sprint.status === "completed"
														? "text-interactive"
														: "text-text-primary"
											}`}
										>
											{sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Add Member Modal */}
			{showAddMemberModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
					<div className="bg-content-background w-full max-w-md rounded-lg p-6 shadow-lg">
						<h3 className="text-text-contrast font-heading-small mb-4">Add Team Member</h3>
						<form onSubmit={e => void handleAddMember(e)} className="space-y-4">
							<div>
								<label
									htmlFor="memberEmail"
									className="text-text-primary font-body mb-2 block font-medium"
								>
									Email Address:
								</label>
								<input
									type="email"
									id="memberEmail"
									value={addMemberData.email}
									onChange={e => setAddMemberData({ ...addMemberData, email: e.target.value })}
									required
									placeholder="user@company.com"
									className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
								/>
								{memberErrors.email && (
									<div className="text-error mt-1 text-sm">{memberErrors.email}</div>
								)}
								<div className="text-text-primary mt-1 text-sm">
									Must be a registered user in the system
								</div>
							</div>

							<div>
								<label
									htmlFor="memberRole"
									className="text-text-primary font-body mb-2 block font-medium"
								>
									Role:
								</label>
								<select
									id="memberRole"
									value={addMemberData.role}
									onChange={e =>
										setAddMemberData({
											...addMemberData,
											role: e.target.value as "member" | "lead"
										})
									}
									required
									className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
								>
									<option value="member">Team Member</option>
									<option value="lead">Team Lead</option>
								</select>
							</div>

							<div className="flex justify-end gap-4 pt-4">
								<button
									type="button"
									onClick={() => {
										setShowAddMemberModal(false);
										setAddMemberData({ email: "", role: "member" });
										setMemberErrors({});
									}}
									className="border-layout-background bg-content-background text-text-primary hover:bg-neutral-background inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-4 py-2 text-center text-base font-medium text-white no-underline transition-all duration-200"
								>
									Add Member
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create Sprint Modal */}
			{showCreateSprintModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
					<div className="bg-content-background w-full max-w-md rounded-lg p-6 shadow-lg">
						<h3 className="text-text-contrast font-heading-small mb-4">Create New Sprint</h3>
						<form onSubmit={e => void handleCreateSprint(e)} className="space-y-4">
							<div>
								<label
									htmlFor="sprintName"
									className="text-text-primary font-body mb-2 block font-medium"
								>
									Sprint Name:
								</label>
								<input
									type="text"
									id="sprintName"
									value={createSprintData.name}
									onChange={e => setCreateSprintData({ ...createSprintData, name: e.target.value })}
									required
									placeholder="Sprint 3"
									className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
								/>
								{sprintErrors.name && (
									<div className="text-error mt-1 text-sm">{sprintErrors.name}</div>
								)}
							</div>

							<div>
								<label
									htmlFor="sprintStartDate"
									className="text-text-primary font-body mb-2 block font-medium"
								>
									Start Date:
								</label>
								<input
									type="date"
									id="sprintStartDate"
									value={createSprintData.start_date}
									onChange={e =>
										setCreateSprintData({ ...createSprintData, start_date: e.target.value })
									}
									required
									className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
								/>
								{sprintErrors.start_date && (
									<div className="text-error mt-1 text-sm">{sprintErrors.start_date}</div>
								)}
							</div>

							<div>
								<label
									htmlFor="sprintEndDate"
									className="text-text-primary font-body mb-2 block font-medium"
								>
									End Date:
								</label>
								<input
									type="date"
									id="sprintEndDate"
									value={createSprintData.end_date}
									onChange={e =>
										setCreateSprintData({ ...createSprintData, end_date: e.target.value })
									}
									required
									className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base transition-all duration-200 focus:outline-none"
								/>
								{sprintErrors.end_date && (
									<div className="text-error mt-1 text-sm">{sprintErrors.end_date}</div>
								)}
							</div>

							<div className="flex justify-end gap-4 pt-4">
								<button
									type="button"
									onClick={() => {
										setShowCreateSprintModal(false);
										setCreateSprintData({ name: "", start_date: "", end_date: "" });
										setSprintErrors({});
									}}
									className="border-layout-background bg-content-background text-text-primary hover:bg-neutral-background inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-4 py-2 text-center text-base font-medium text-white no-underline transition-all duration-200"
								>
									Create Sprint
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
		</main>
	);
};

export default TeamConfigurationPage;
