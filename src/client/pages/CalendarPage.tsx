import React, { useState, useEffect } from "react";

interface CalendarEntry {
	id: string;
	team_id: string;
	user_id: string;
	entry_type: "pto" | "holiday" | "sick" | "personal";
	title: string;
	start_date: string;
	end_date: string;
	description?: string;
	all_day: boolean;
	created_at: string;
	updated_at: string;
}

interface Team {
	id: string;
	name: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

interface User {
	id: string;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

interface CreateCalendarEntryData {
	team_id: string;
	user_id: string;
	entry_type: string;
	title: string;
	start_date: string;
	end_date: string;
	description?: string;
	all_day?: boolean;
}

const CalendarPage: React.FC = () => {
	// State management
	const [entries, setEntries] = useState<CalendarEntry[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [currentEntry, setCurrentEntry] = useState<CalendarEntry | null>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [showEntryModal, setShowEntryModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

	// Filter state
	const [selectedTeam, setSelectedTeam] = useState<string>("");
	const [selectedMonth, setSelectedMonth] = useState<string>(
		new Date().toISOString().slice(0, 7) // YYYY-MM format
	);

	// Form state
	const [formData, setFormData] = useState<CreateCalendarEntryData>({
		team_id: "",
		user_id: "",
		entry_type: "pto",
		title: "",
		start_date: "",
		end_date: "",
		description: "",
		all_day: true
	});
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [teamUsers, setTeamUsers] = useState<User[]>([]);

	// Load initial data on component mount
	useEffect(() => {
		const initializeData = async () => {
			try {
				setIsLoading(true);
				setError("");

				// Load teams and users in parallel
				const [teamsResponse, usersResponse] = await Promise.all([fetch("/api/teams"), fetch("/api/users")]);

				if (!teamsResponse.ok || !usersResponse.ok) {
					throw new Error("Failed to load initial data");
				}

				const [teamsData, usersData] = await Promise.all([
					teamsResponse.json() as Promise<Team[]>,
					usersResponse.json() as Promise<User[]>
				]);

				setTeams(teamsData);
				setUsers(usersData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load calendar data");
			} finally {
				setIsLoading(false);
			}
		};

		void initializeData();
	}, []);

	// Load entries when filters change
	useEffect(() => {
		const loadCalendarEntries = async () => {
			try {
				const params = new URLSearchParams();
				if (selectedTeam) {
					params.append("team_id", selectedTeam);
				}
				if (selectedMonth) {
					const [year, month] = selectedMonth.split("-");
					params.append("month", month);
					params.append("year", year);
				}

				const response = await fetch(`/api/calendar-entries?${params.toString()}`);
				if (!response.ok) {
					throw new Error(`Failed to load entries: ${response.status}`);
				}

				const data = (await response.json()) as CalendarEntry[];
				setEntries(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Error loading calendar entries. Please try again.");
			}
		};

		void loadCalendarEntries();
	}, [selectedTeam, selectedMonth]);

	// Refresh entries function for post-operation updates
	const refreshEntries = async (): Promise<void> => {
		try {
			const params = new URLSearchParams();
			if (selectedTeam) {
				params.append("team_id", selectedTeam);
			}
			if (selectedMonth) {
				const [year, month] = selectedMonth.split("-");
				params.append("month", month);
				params.append("year", year);
			}

			const response = await fetch(`/api/calendar-entries?${params.toString()}`);
			if (!response.ok) {
				throw new Error(`Failed to load entries: ${response.status}`);
			}

			const data = (await response.json()) as CalendarEntry[];
			setEntries(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error loading calendar entries. Please try again.");
		}
	};

	// Retry function for error recovery
	const retryInitialization = async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			// Load teams and users in parallel
			const [teamsResponse, usersResponse] = await Promise.all([fetch("/api/teams"), fetch("/api/users")]);

			if (!teamsResponse.ok || !usersResponse.ok) {
				throw new Error("Failed to load initial data");
			}

			const [teamsData, usersData] = await Promise.all([
				teamsResponse.json() as Promise<Team[]>,
				usersResponse.json() as Promise<User[]>
			]);

			setTeams(teamsData);
			setUsers(usersData);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load calendar data");
		} finally {
			setIsLoading(false);
		}
	};

	// Hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	// Load team users when team is selected
	useEffect(() => {
		if (formData.team_id) {
			void loadTeamUsers(formData.team_id);
		} else {
			setTeamUsers([]);
			setFormData(prev => ({ ...prev, user_id: "" }));
		}
	}, [formData.team_id]);

	const loadTeamUsers = async (teamId: string): Promise<void> => {
		try {
			const response = await fetch(`/api/teams/${teamId}/users`);
			if (response.ok) {
				const users = (await response.json()) as User[];
				setTeamUsers(users);
			}
		} catch {
			// Error loading team users - handle silently
		}
	};

	const openCreateModal = (): void => {
		setCurrentEntry(null);
		setIsEditing(false);
		setFormData({
			team_id: "",
			user_id: "",
			entry_type: "pto",
			title: "",
			start_date: "",
			end_date: "",
			description: "",
			all_day: true
		});
		setFormErrors({});
		setShowEntryModal(true);
	};

	const openEditModal = (entry: CalendarEntry): void => {
		setCurrentEntry(entry);
		setIsEditing(true);
		setFormData({
			team_id: entry.team_id,
			user_id: entry.user_id,
			entry_type: entry.entry_type,
			title: entry.title,
			start_date: entry.start_date.split("T")[0], // Extract date part
			end_date: entry.end_date.split("T")[0],
			description: entry.description ?? "",
			all_day: entry.all_day
		});
		setFormErrors({});
		setShowEntryModal(true);
	};

	const openDeleteModal = (entry: CalendarEntry): void => {
		setCurrentEntry(entry);
		setShowDeleteModal(true);
	};

	const closeModals = (): void => {
		setShowEntryModal(false);
		setShowDeleteModal(false);
		setCurrentEntry(null);
		setFormErrors({});
		setTeamUsers([]);
	};

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		if (!formData.team_id) {
			errors.team_id = "Please select a team";
		}

		if (!formData.user_id) {
			errors.user_id = "Please select a team member";
		}

		if (!formData.title.trim()) {
			errors.title = "Title is required";
		}

		if (!formData.start_date) {
			errors.start_date = "Start date is required";
		}

		if (!formData.end_date) {
			errors.end_date = "End date is required";
		}

		if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
			errors.end_date = "End date must be after start date";
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
			const url = isEditing ? `/api/calendar-entries/${currentEntry?.id}` : "/api/calendar-entries";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to save calendar entry");
			}

			setToast({
				message: isEditing ? "Calendar entry updated successfully!" : "Calendar entry created successfully!",
				type: "success"
			});

			closeModals();
			await refreshEntries();
		} catch (err) {
			// console.error('Error saving calendar entry:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to save calendar entry",
				type: "error"
			});
		}
	};

	const handleDelete = async (): Promise<void> => {
		if (!currentEntry) {
			return;
		}

		try {
			const response = await fetch(`/api/calendar-entries/${currentEntry.id}`, {
				method: "DELETE"
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Failed to delete calendar entry");
			}

			setToast({
				message: "Calendar entry deleted successfully!",
				type: "success"
			});

			closeModals();
			await refreshEntries();
		} catch (err) {
			// console.error('Error deleting calendar entry:', err)
			setToast({
				message: err instanceof Error ? err.message : "Failed to delete calendar entry",
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

	const getEntryTypeLabel = (type: string): string => {
		const labels = {
			pto: "PTO / Vacation",
			holiday: "Holiday",
			sick: "Sick Leave",
			personal: "Personal Time"
		};
		return labels[type as keyof typeof labels] ?? type;
	};

	const getEntryTypeColor = (type: string): string => {
		const colors = {
			pto: "bg-blue-100 text-blue-800",
			holiday: "bg-green-100 text-green-800",
			sick: "bg-red-100 text-red-800",
			personal: "bg-purple-100 text-purple-800"
		};
		return colors[type as keyof typeof colors] ?? "bg-gray-100 text-text-contrast";
	};

	const getUserDisplayName = (userId: string): string => {
		const user = users.find(u => u.id === userId);
		return user ? `${user.first_name} ${user.last_name}` : "Unknown User";
	};

	const getTeamName = (teamId: string): string => {
		const team = teams.find(t => t.id === teamId);
		return team ? team.name : "Unknown Team";
	};

	const generateMonthOptions = (): { value: string; label: string }[] => {
		const options = [];
		const currentDate = new Date();

		for (let i = -6; i <= 6; i++) {
			const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
			const value = date.toISOString().slice(0, 7);
			const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
			options.push({ value, label });
		}

		return options;
	};

	if (isLoading) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Calendar</h2>
						<p className="text-text-primary mt-2">
							Manage team calendar entries and PTO for accurate sprint capacity planning
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div className="border-layout-background border-t-interactive mb-4 h-10 w-10 animate-spin rounded-full border-4"></div>
					<p className="text-text-primary mb-4">Loading calendar entries...</p>
				</div>
			</main>
		);
	}

	if (error) {
		return (
			<main className="w-full py-8">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Calendar</h2>
						<p className="text-text-primary mt-2">
							Manage team calendar entries and PTO for accurate sprint capacity planning
						</p>
					</div>
				</div>
				<div className="flex min-h-[300px] flex-col items-center justify-center text-center">
					<div>
						<svg className="mx-auto mb-4 h-12 w-12 text-red-600" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
						</svg>
						<h3 className="mb-3 text-xl font-semibold text-red-600">Unable to Load Calendar</h3>
						<p className="text-text-primary mb-6">{error}</p>
						<button
							onClick={() => void retryInitialization()}
							className="border-layout-background bg-content-background text-text-primary hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200 hover:border-gray-400"
						>
							Try Again
						</button>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="w-full py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h2 className="text-text-contrast m-0 text-3xl font-semibold">Team Calendar</h2>
					<p className="text-text-primary mt-2">
						Manage team calendar entries and PTO for accurate sprint capacity planning
					</p>
				</div>
			</div>

			{/* Action Bar */}
			<div className="border-layout-background bg-content-background mb-6 flex items-center justify-between rounded-lg border p-4 shadow-sm">
				<div className="flex gap-4">
					<select
						value={selectedTeam}
						onChange={e => setSelectedTeam(e.target.value)}
						className="border-layout-background focus:border-interactive rounded-md border p-2 text-base transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
					>
						<option value="">All Teams</option>
						{teams.map(team => (
							<option key={team.id} value={team.id}>
								{team.name}
							</option>
						))}
					</select>
					<select
						value={selectedMonth}
						onChange={e => setSelectedMonth(e.target.value)}
						className="border-layout-background focus:border-interactive rounded-md border p-2 text-base transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
					>
						{generateMonthOptions().map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>
				<button
					onClick={openCreateModal}
					className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:-translate-y-px hover:shadow-md active:translate-y-0"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
					</svg>
					Add Calendar Entry
				</button>
			</div>

			{/* Calendar Grid Placeholder */}
			<div className="border-layout-background bg-content-background mb-6 rounded-lg border shadow-sm">
				<div className="p-4">
					<p className="text-text-primary py-8 text-center">Calendar grid view coming soon...</p>
				</div>
			</div>

			{/* Entries List */}
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<h3 className="text-text-contrast mb-4 text-xl font-semibold">Upcoming Entries</h3>

				{entries.length === 0 ? (
					<div className="text-text-primary p-8 text-center italic">
						<p>No calendar entries for the selected period.</p>
					</div>
				) : (
					<div className="space-y-4">
						{entries.map(entry => (
							<div
								key={entry.id}
								className="border-layout-background rounded-lg border p-4 transition-shadow hover:shadow-sm"
							>
								<div className="mb-2 flex items-start justify-between">
									<div>
										<h4 className="text-text-contrast font-semibold">{entry.title}</h4>
										<p className="text-text-primary text-sm">
											{getUserDisplayName(entry.user_id)} • {getTeamName(entry.team_id)}
										</p>
									</div>
									<div className="flex gap-2">
										<button
											onClick={() => openEditModal(entry)}
											className="hover:text-text-primary p-2 text-gray-400 transition-colors"
											title="Edit entry"
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
												<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
											</svg>
										</button>
										<button
											onClick={() => openDeleteModal(entry)}
											className="p-2 text-gray-400 transition-colors hover:text-red-600"
											title="Delete entry"
										>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
												<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
											</svg>
										</button>
									</div>
								</div>

								<div className="flex items-center gap-4 text-sm">
									<span
										className={`rounded-full px-2 py-1 text-xs font-medium ${getEntryTypeColor(entry.entry_type)}`}
									>
										{getEntryTypeLabel(entry.entry_type)}
									</span>
									<span className="text-text-primary">
										{formatDate(entry.start_date)} - {formatDate(entry.end_date)}
									</span>
								</div>

								{entry.description && (
									<p className="text-text-primary mt-2 text-sm">{entry.description}</p>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Entry Modal */}
			{showEntryModal && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
					<div className="bg-content-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg shadow-lg">
						<div className="border-layout-background flex items-center justify-between border-b p-6">
							<h3 className="text-text-contrast m-0 text-xl font-semibold">
								{isEditing ? "Edit Calendar Entry" : "Add Calendar Entry"}
							</h3>
							<button
								onClick={closeModals}
								className="hover:text-text-primary cursor-pointer rounded-md border-none bg-none p-2 text-2xl text-gray-400 transition-colors duration-200"
							>
								&times;
							</button>
						</div>

						<form onSubmit={e => void handleSubmit(e)} className="p-6">
							<div className="space-y-6">
								<div className="flex flex-col gap-2">
									<label htmlFor="team-select" className="text-text-primary block font-medium">
										Team *
									</label>
									<select
										id="team-select"
										value={formData.team_id}
										onChange={e => setFormData({ ...formData, team_id: e.target.value })}
										className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									>
										<option value="">Select a team</option>
										{teams.map(team => (
											<option key={team.id} value={team.id}>
												{team.name}
											</option>
										))}
									</select>
									{formErrors.team_id && (
										<span className="mt-1 text-sm text-red-600">{formErrors.team_id}</span>
									)}
								</div>

								<div className="flex flex-col gap-2">
									<label htmlFor="user-select" className="text-text-primary block font-medium">
										Team Member *
									</label>
									<select
										id="user-select"
										value={formData.user_id}
										onChange={e => setFormData({ ...formData, user_id: e.target.value })}
										disabled={!formData.team_id}
										className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
										required
									>
										<option value="">
											{formData.team_id ? "Select a team member" : "Select team first"}
										</option>
										{teamUsers.map(user => (
											<option key={user.id} value={user.id}>
												{user.first_name} {user.last_name}
											</option>
										))}
									</select>
									{formErrors.user_id && (
										<span className="mt-1 text-sm text-red-600">{formErrors.user_id}</span>
									)}
								</div>

								<div className="flex flex-col gap-2">
									<label htmlFor="entry-type-select" className="text-text-primary block font-medium">
										Entry Type *
									</label>
									<select
										id="entry-type-select"
										value={formData.entry_type}
										onChange={e => setFormData({ ...formData, entry_type: e.target.value })}
										className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									>
										<option value="pto">PTO / Vacation</option>
										<option value="holiday">Holiday</option>
										<option value="sick">Sick Leave</option>
										<option value="personal">Personal Time</option>
									</select>
								</div>

								<div className="flex flex-col gap-2">
									<label htmlFor="title-input" className="text-text-primary block font-medium">
										Title *
									</label>
									<input
										id="title-input"
										type="text"
										value={formData.title}
										onChange={e => setFormData({ ...formData, title: e.target.value })}
										placeholder="e.g., Summer Vacation"
										className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
										required
									/>
									{formErrors.title && (
										<span className="mt-1 text-sm text-red-600">{formErrors.title}</span>
									)}
								</div>

								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<label
											htmlFor="start-date-input"
											className="text-text-primary block font-medium"
										>
											Start Date *
										</label>
										<input
											id="start-date-input"
											type="date"
											value={formData.start_date}
											onChange={e => setFormData({ ...formData, start_date: e.target.value })}
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
											required
										/>
										{formErrors.start_date && (
											<span className="mt-1 text-sm text-red-600">{formErrors.start_date}</span>
										)}
									</div>

									<div className="flex flex-col gap-2">
										<label htmlFor="end-date-input" className="text-text-primary block font-medium">
											End Date *
										</label>
										<input
											id="end-date-input"
											type="date"
											value={formData.end_date}
											onChange={e => setFormData({ ...formData, end_date: e.target.value })}
											className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
											required
										/>
										{formErrors.end_date && (
											<span className="mt-1 text-sm text-red-600">{formErrors.end_date}</span>
										)}
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<label
										htmlFor="description-textarea"
										className="text-text-primary block font-medium"
									>
										Description
									</label>
									<textarea
										id="description-textarea"
										value={formData.description}
										onChange={e => setFormData({ ...formData, description: e.target.value })}
										rows={3}
										placeholder="Optional notes about this calendar entry"
										className="resize-vertical border-layout-background focus:border-interactive min-h-[80px] w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
									/>
								</div>
							</div>

							<div className="border-layout-background mt-6 flex justify-end gap-4 border-t p-6">
								<button
									type="button"
									onClick={closeModals}
									className="border-layout-background bg-content-background text-text-primary hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200 hover:border-gray-400"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200"
								>
									{isEditing ? "Update Entry" : "Add Entry"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{showDeleteModal && currentEntry && (
				<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
					<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-lg">
						<div className="border-layout-background flex items-center justify-between border-b p-6">
							<h3 className="text-text-contrast m-0 text-xl font-semibold">Delete Calendar Entry</h3>
							<button
								onClick={closeModals}
								className="hover:text-text-primary cursor-pointer rounded-md border-none bg-none p-2 text-2xl text-gray-400 transition-colors duration-200"
							>
								&times;
							</button>
						</div>

						<div className="p-6">
							<p className="text-text-primary mb-4">
								Are you sure you want to delete this calendar entry?
							</p>
							<p className="text-text-primary font-medium">
								{currentEntry.title} ({formatDate(currentEntry.start_date)} -{" "}
								{formatDate(currentEntry.end_date)})
							</p>
						</div>

						<div className="border-layout-background flex justify-end gap-4 border-t p-6">
							<button
								onClick={closeModals}
								className="border-layout-background bg-content-background text-text-primary hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200 hover:border-gray-400"
							>
								Cancel
							</button>
							<button
								onClick={() => void handleDelete()}
								className="inline-flex cursor-pointer items-center gap-2 rounded-md border-none bg-red-600 px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:bg-red-700"
							>
								Delete Entry
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
							aria-label="Close notification"
						>
							&times;
						</button>
					</div>
				</div>
			)}
		</main>
	);
};

export default CalendarPage;
