/**
 * Calendar Management TypeScript
 * Handles calendar entries for PTO, holidays, and capacity calculation
 */

import { initializeNavigation } from "../utils/auth-core.js";

(function (): void {
	// Type definitions
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

	// State management
	let teams: Team[] = [];
	let users: User[] = [];
	let calendarEntries: CalendarEntry[] = [];
	let currentEntry: CalendarEntry | null = null;
	let isEditing = false;
	let selectedTeamId: string | null = null;
	let selectedMonth: Date = new Date();

	// DOM Elements
	const loadingState = document.getElementById("loading-state") as HTMLElement;
	const errorState = document.getElementById("error-state") as HTMLElement;
	const calendarSection = document.getElementById("calendar-section") as HTMLElement;
	const teamFilter = document.getElementById("team-filter") as HTMLSelectElement;
	const monthSelector = document.getElementById("month-selector") as HTMLSelectElement;
	const calendarGrid = document.getElementById("calendar-grid") as HTMLElement;
	const entriesList = document.getElementById("entries-list") as HTMLElement;
	const emptyEntries = document.getElementById("empty-entries") as HTMLElement;
	const entryModal = document.getElementById("entry-modal") as HTMLElement;
	const deleteModal = document.getElementById("delete-modal") as HTMLElement;
	const entryForm = document.getElementById("entry-form") as HTMLFormElement;
	const toast = document.getElementById("toast") as HTMLElement;

	// Initialize page
	document.addEventListener("DOMContentLoaded", function () {
		// Initialize authentication-aware navigation
		void initializeNavigation();

		// Initialize calendar functionality
		void initialize();
		setupEventListeners();
	});

	/**
	 * Initialize the calendar page
	 */
	async function initialize(): Promise<void> {
		try {
			showLoadingState();

			// Load teams and users in parallel
			const [teamsResponse, usersResponse] = await Promise.all([fetch("/api/teams"), fetch("/api/users")]);

			if (!teamsResponse.ok || !usersResponse.ok) {
				throw new Error("Failed to load initial data");
			}

			teams = (await teamsResponse.json()) as Team[];
			users = (await usersResponse.json()) as User[];

			// Populate filters
			populateTeamFilter();
			populateMonthSelector();

			// Load calendar entries
			await loadCalendarEntries();

			hideLoadingState();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error initializing calendar:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			showErrorState(errorMessage);
		}
	}

	/**
	 * Setup event listeners
	 */
	function setupEventListeners(): void {
		const addEntryBtn = document.getElementById("add-entry-btn") as HTMLButtonElement;
		const retryBtn = document.getElementById("retry-btn") as HTMLButtonElement;
		const teamSelect = document.getElementById("entry-team") as HTMLSelectElement;

		addEntryBtn.addEventListener("click", showCreateEntryModal);
		retryBtn.addEventListener("click", () => {
			initialize().catch((error: Error) => {
				// eslint-disable-next-line no-console
				console.error("Failed to initialize:", error);
			});
		});

		teamFilter.addEventListener("change", () => {
			selectedTeamId = teamFilter.value || null;
			void loadCalendarEntries();
		});

		monthSelector.addEventListener("change", () => {
			const value = monthSelector.value;
			if (!value) {
				return;
			}

			const [year, month] = value.split("-").map(n => parseInt(n));
			if (!year || !month) {
				return;
			}

			selectedMonth = new Date(year, month - 1);
			renderCalendar();
		});

		teamSelect.addEventListener("change", () => {
			populateTeamMembers(teamSelect.value);
		});

		entryForm.addEventListener("submit", (event: Event) => {
			handleEntrySubmit(event).catch((error: Error) => {
				// eslint-disable-next-line no-console
				console.error("Failed to submit entry:", error);
			});
		});

		// Date change listeners for capacity calculation
		const startDate = document.getElementById("start-date") as HTMLInputElement;
		const endDate = document.getElementById("end-date") as HTMLInputElement;

		startDate.addEventListener("change", calculateCapacityImpact);
		endDate.addEventListener("change", calculateCapacityImpact);

		// Modal close on backdrop click
		entryModal.addEventListener("click", function (e: MouseEvent) {
			if (e.target === entryModal) {
				closeEntryModal();
			}
		});

		deleteModal.addEventListener("click", function (e: MouseEvent) {
			if (e.target === deleteModal) {
				closeDeleteModal();
			}
		});
	}

	/**
	 * Load calendar entries from the API
	 */
	async function loadCalendarEntries(): Promise<void> {
		try {
			let url = "/api/calendar-entries";
			if (selectedTeamId) {
				url += `?team_id=${selectedTeamId}`;
			}

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Failed to load calendar entries: ${response.status}`);
			}

			calendarEntries = (await response.json()) as CalendarEntry[];
			renderCalendar();
			renderEntriesList();
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error loading calendar entries:", error);
			showToast("Failed to load calendar entries", "error");
		}
	}

	/**
	 * Populate team filter dropdown
	 */
	function populateTeamFilter(): void {
		teamFilter.innerHTML = '<option value="">All Teams</option>';

		teams.forEach((team: Team) => {
			const option = document.createElement("option");
			option.value = team.id;
			option.textContent = team.name;
			teamFilter.appendChild(option);
		});

		// Also populate the entry form team select
		const entryTeamSelect = document.getElementById("entry-team") as HTMLSelectElement;
		entryTeamSelect.innerHTML = '<option value="">Select a team</option>';

		teams.forEach((team: Team) => {
			const option = document.createElement("option");
			option.value = team.id;
			option.textContent = team.name;
			entryTeamSelect.appendChild(option);
		});
	}

	/**
	 * Populate month selector
	 */
	function populateMonthSelector(): void {
		const currentDate = new Date();
		const startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth());

		monthSelector.innerHTML = "";

		// Add 24 months (1 year back, 1 year forward)
		for (let i = 0; i < 24; i++) {
			const date = new Date(startDate);
			date.setMonth(startDate.getMonth() + i);

			const option = document.createElement("option");
			option.value = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
			option.textContent = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

			// Select current month by default
			if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
				option.selected = true;
			}

			monthSelector.appendChild(option);
		}
	}

	/**
	 * Populate team members dropdown based on selected team
	 */
	function populateTeamMembers(teamId: string): void {
		const memberSelect = document.getElementById("entry-member") as HTMLSelectElement;

		if (!teamId) {
			memberSelect.innerHTML = '<option value="">Select team first</option>';
			memberSelect.disabled = true;
			return;
		}

		// In a real app, we'd fetch team members from the API
		// For now, show all users
		memberSelect.innerHTML = '<option value="">Select a team member</option>';
		memberSelect.disabled = false;

		users.forEach((user: User) => {
			const option = document.createElement("option");
			option.value = user.id;
			option.textContent = `${user.first_name} ${user.last_name}`;
			memberSelect.appendChild(option);
		});
	}

	/**
	 * Render the calendar grid
	 */
	function renderCalendar(): void {
		const year = selectedMonth.getFullYear();
		const month = selectedMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const startDate = new Date(firstDay);
		startDate.setDate(startDate.getDate() - firstDay.getDay());

		let html = `
		<div class="weekday-header">Sun</div>
		<div class="weekday-header">Mon</div>
		<div class="weekday-header">Tue</div>
		<div class="weekday-header">Wed</div>
		<div class="weekday-header">Thu</div>
		<div class="weekday-header">Fri</div>
		<div class="weekday-header">Sat</div>
	`;

		// Generate 6 weeks of calendar
		for (let week = 0; week < 6; week++) {
			for (let day = 0; day < 7; day++) {
				const currentDay = new Date(startDate);
				currentDay.setDate(startDate.getDate() + week * 7 + day);

				const isCurrentMonth = currentDay.getMonth() === month;
				const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
				const dateStr = formatDateForInput(currentDay);

				// Check for calendar entries on this day
				const dayEntries = getEntriesForDate(currentDay);

				let dayClass = "calendar-day";
				if (!isCurrentMonth) {
					dayClass += " other-month";
				}
				if (isWeekend) {
					dayClass += " weekend";
				}
				if (dayEntries.length > 0) {
					dayClass += " has-entries";
				}

				html += `<div class="${dayClass}" data-date="${dateStr}">
				<div class="day-number">${currentDay.getDate()}</div>`;

				if (dayEntries.length > 0 && isCurrentMonth) {
					html += '<div class="day-entries">';
					dayEntries.slice(0, 2).forEach(entry => {
						html += `<div class="entry-dot ${entry.entry_type}" title="${escapeHtml(getEntryTitle(entry))}"></div>`;
					});
					if (dayEntries.length > 2) {
						html += `<div class="entry-more">+${dayEntries.length - 2}</div>`;
					}
					html += "</div>";
				}

				html += "</div>";
			}
		}

		calendarGrid.innerHTML = html;
	}

	/**
	 * Get calendar entries for a specific date
	 */
	function getEntriesForDate(date: Date): CalendarEntry[] {
		return calendarEntries.filter(entry => {
			const startDate = new Date(entry.start_date);
			const endDate = new Date(entry.end_date);
			return date >= startDate && date <= endDate;
		});
	}

	/**
	 * Get entry title for display
	 */
	function getEntryTitle(entry: CalendarEntry): string {
		const user = users.find(u => u.id === entry.user_id);
		const userName = user ? `${user.first_name} ${user.last_name}` : "Unknown";
		const typeLabel = getEntryTypeLabel(entry.entry_type);
		return `${userName} - ${typeLabel}`;
	}

	/**
	 * Get human-readable label for entry type
	 */
	function getEntryTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			pto: "PTO / Vacation",
			holiday: "Holiday",
			sick: "Sick Leave",
			personal: "Personal Time"
		};
		return labels[type] ?? type;
	}

	/**
	 * Render the list of calendar entries
	 */
	function renderEntriesList(): void {
		// Filter entries for the selected month
		const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
		const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

		const monthEntries = calendarEntries
			.filter(entry => {
				const startDate = new Date(entry.start_date);
				const endDate = new Date(entry.end_date);
				return startDate <= monthEnd && endDate >= monthStart;
			})
			.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

		if (monthEntries.length === 0) {
			entriesList.style.display = "none";
			emptyEntries.style.display = "block";
			return;
		}

		emptyEntries.style.display = "none";
		entriesList.style.display = "block";

		entriesList.innerHTML = monthEntries
			.map((entry: CalendarEntry) => {
				const user = users.find(u => u.id === entry.user_id);
				const team = teams.find(t => t.id === entry.team_id);
				const userName = user ? `${user.first_name} ${user.last_name}` : "Unknown User";
				const teamName = team ? team.name : "Unknown Team";

				return `
			<div class="entry-item" data-entry-id="${entry.id}">
				<div class="entry-header">
					<span class="entry-type-badge ${entry.entry_type}">${getEntryTypeLabel(entry.entry_type)}</span>
					<div class="entry-actions">
						<button class="btn-icon" data-action="edit-entry" data-entry-id="${entry.id}" title="Edit Entry">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
							</svg>
						</button>
						<button class="btn-icon btn-danger" data-action="confirm-delete-entry" data-entry-id="${entry.id}" title="Delete Entry">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
							</svg>
						</button>
					</div>
				</div>
				<div class="entry-details">
					<div class="entry-person">${escapeHtml(userName)}</div>
					<div class="entry-team">${escapeHtml(teamName)}</div>
					<div class="entry-dates">${formatDate(entry.start_date)} - ${formatDate(entry.end_date)}</div>
					${entry.description ? `<div class="entry-description">${escapeHtml(entry.description)}</div>` : ""}
				</div>
			</div>
		`;
			})
			.join("");
	}

	/**
	 * Show create entry modal
	 */
	function showCreateEntryModal(): void {
		isEditing = false;
		currentEntry = null;

		const modalTitle = document.getElementById("modal-title") as HTMLElement;
		const saveBtn = document.getElementById("save-entry-btn") as HTMLElement;

		modalTitle.textContent = "Add Calendar Entry";
		saveBtn.innerHTML = '<span class="btn-text">Add Entry</span>';

		// Reset form
		entryForm.reset();
		clearFormErrors();

		// Reset member dropdown
		const memberSelect = document.getElementById("entry-member") as HTMLSelectElement;
		memberSelect.innerHTML = '<option value="">Select team first</option>';
		memberSelect.disabled = true;

		// Hide capacity impact
		const capacityImpact = document.getElementById("capacity-impact") as HTMLElement;
		capacityImpact.style.display = "none";

		entryModal.style.display = "flex";
		(document.getElementById("entry-team") as HTMLSelectElement).focus();
	}

	/**
	 * Edit existing entry
	 */
	function editEntry(entryId: string): void {
		try {
			const entry = calendarEntries.find(e => e.id === entryId);
			if (!entry) {
				throw new Error("Entry not found");
			}

			isEditing = true;
			currentEntry = entry;

			// Populate form
			(document.getElementById("entry-team") as HTMLSelectElement).value = entry.team_id;
			populateTeamMembers(entry.team_id);
			(document.getElementById("entry-member") as HTMLSelectElement).value = entry.user_id;
			(document.getElementById("entry-type") as HTMLSelectElement).value = entry.entry_type;
			(document.getElementById("start-date") as HTMLInputElement).value = entry.start_date;
			(document.getElementById("end-date") as HTMLInputElement).value = entry.end_date;
			(document.getElementById("entry-description") as HTMLTextAreaElement).value = entry.description ?? "";

			// Update modal
			const modalTitle = document.getElementById("modal-title") as HTMLElement;
			const saveBtn = document.getElementById("save-entry-btn") as HTMLElement;

			modalTitle.textContent = "Edit Calendar Entry";
			saveBtn.innerHTML = '<span class="btn-text">Update Entry</span>';

			clearFormErrors();
			calculateCapacityImpact();
			entryModal.style.display = "flex";
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			showToast(errorMessage, "error");
		}
	}

	/**
	 * Handle entry form submission
	 */
	async function handleEntrySubmit(event: Event): Promise<void> {
		event.preventDefault();

		const formData = new FormData(entryForm);
		const entryData: CreateCalendarEntryData = {
			team_id: formData.get("team_id") as string,
			user_id: formData.get("user_id") as string,
			entry_type: formData.get("entry_type") as string,
			title: getEntryTypeLabel(formData.get("entry_type") as string),
			start_date: formData.get("start_date") as string,
			end_date: formData.get("end_date") as string,
			description: (formData.get("description") as string)?.trim() || "",
			all_day: true
		};

		// Client-side validation
		if (!validateEntryData(entryData)) {
			return;
		}

		try {
			setSaveButtonLoading(true);

			if (isEditing && !currentEntry) {
				throw new Error("Current entry not found");
			}

			const url = isEditing ? `/api/calendar-entries/${currentEntry?.id}` : "/api/calendar-entries";
			const method = isEditing ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(entryData)
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({ message: "Unknown error occurred" }))) as {
					message?: string;
				};
				throw new Error(errorData.message ?? `Server error: ${response.status}`);
			}

			const savedEntry = (await response.json()) as CalendarEntry;

			// Update local state
			const wasEditing = isEditing;
			if (isEditing && currentEntry) {
				const entryToUpdate = currentEntry;
				const index = calendarEntries.findIndex(e => e.id === entryToUpdate.id);
				if (index !== -1) {
					calendarEntries[index] = savedEntry;
				}
			} else {
				calendarEntries.push(savedEntry);
			}

			renderCalendar();
			renderEntriesList();
			closeEntryModal();
			showToast(
				wasEditing ? "Calendar entry updated successfully!" : "Calendar entry added successfully!",
				"success"
			);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error saving entry:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			showToast(errorMessage, "error");
		} finally {
			setSaveButtonLoading(false);
		}
	}

	/**
	 * Validate entry data
	 */
	function validateEntryData(data: CreateCalendarEntryData): boolean {
		clearFormErrors();
		let isValid = true;

		if (!data.team_id) {
			showFieldError("team-error", "Please select a team");
			isValid = false;
		}

		if (!data.user_id) {
			showFieldError("member-error", "Please select a team member");
			isValid = false;
		}

		if (!data.start_date) {
			showFieldError("start-date-error", "Start date is required");
			isValid = false;
		}

		if (!data.end_date) {
			showFieldError("end-date-error", "End date is required");
			isValid = false;
		}

		if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
			showFieldError("end-date-error", "End date must be after start date");
			isValid = false;
		}

		if (data.description && data.description.length > 500) {
			showFieldError("description-error", "Description must be less than 500 characters");
			isValid = false;
		}

		return isValid;
	}

	/**
	 * Calculate capacity impact
	 */
	function calculateCapacityImpact(): void {
		const teamSelect = document.getElementById("entry-team") as HTMLSelectElement;
		const startInput = document.getElementById("start-date") as HTMLInputElement;
		const endInput = document.getElementById("end-date") as HTMLInputElement;
		const capacityDiv = document.getElementById("capacity-impact") as HTMLElement;

		if (!teamSelect.value || !startInput.value || !endInput.value) {
			capacityDiv.style.display = "none";
			return;
		}

		const team = teams.find(t => t.id === teamSelect.value);
		if (!team) {
			return;
		}

		const startDate = new Date(startInput.value);
		const endDate = new Date(endInput.value);

		// Calculate working days affected
		let workingDays = 0;
		const current = new Date(startDate);

		while (current <= endDate) {
			const dayOfWeek = current.getDay();
			// Assume Monday-Friday are working days
			if (dayOfWeek >= 1 && dayOfWeek <= 5) {
				workingDays++;
			}
			current.setDate(current.getDate() + 1);
		}

		// Calculate sprint impact
		const sprintWorkingDays = (team.sprint_length_days / 7) * team.working_days_per_week;
		const percentage = Math.round((workingDays / sprintWorkingDays) * 100);

		const impactDaysElement = document.getElementById("impact-days");
		const impactPercentageElement = document.getElementById("impact-percentage");
		if (impactDaysElement) {
			impactDaysElement.textContent = workingDays.toString();
		}
		if (impactPercentageElement) {
			impactPercentageElement.textContent = `${percentage}%`;
		}
		capacityDiv.style.display = "block";
	}

	/**
	 * Confirm entry deletion
	 */
	function confirmDeleteEntry(entryId: string): void {
		const entry = calendarEntries.find(e => e.id === entryId);
		if (!entry) {
			showToast("Entry not found", "error");
			return;
		}

		currentEntry = entry;
		const user = users.find(u => u.id === entry.user_id);
		const userName = user ? `${user.first_name} ${user.last_name}` : "Unknown User";

		const detailsElement = document.getElementById("delete-entry-details") as HTMLElement;
		detailsElement.innerHTML = `
		<strong>${escapeHtml(userName)}</strong><br>
		${getEntryTypeLabel(entry.entry_type)}<br>
		${formatDate(entry.start_date)} - ${formatDate(entry.end_date)}
	`;

		deleteModal.style.display = "flex";

		// Setup delete confirmation
		const confirmBtn = document.getElementById("confirm-delete-btn") as HTMLButtonElement;
		confirmBtn.onclick = (): void => {
			void deleteEntry(entryId);
		};
	}

	/**
	 * Delete calendar entry
	 */
	async function deleteEntry(entryId: string): Promise<void> {
		try {
			setDeleteButtonLoading(true);

			const response = await fetch(`/api/calendar-entries/${entryId}`, {
				method: "DELETE"
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({ message: "Unknown error occurred" }))) as {
					message?: string;
				};
				throw new Error(errorData.message ?? `Failed to delete entry: ${response.status}`);
			}

			// Remove from local state
			calendarEntries = calendarEntries.filter(e => e.id !== entryId);
			renderCalendar();
			renderEntriesList();
			closeDeleteModal();
			showToast("Calendar entry deleted successfully!", "success");
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error deleting entry:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			showToast(errorMessage, "error");
		} finally {
			setDeleteButtonLoading(false);
		}
	}

	/**
	 * Close entry modal
	 */
	function closeEntryModal(): void {
		entryModal.style.display = "none";
		clearFormErrors();
		entryForm.reset();
		currentEntry = null;
		isEditing = false;
	}

	/**
	 * Close delete modal
	 */
	function closeDeleteModal(): void {
		deleteModal.style.display = "none";
		currentEntry = null;
	}

	/**
	 * UI State Management
	 */
	function showLoadingState(): void {
		loadingState.style.display = "flex";
		errorState.style.display = "none";
		calendarSection.style.display = "none";
	}

	function hideLoadingState(): void {
		loadingState.style.display = "none";
		calendarSection.style.display = "block";
	}

	function showErrorState(message: string): void {
		errorState.style.display = "flex";
		loadingState.style.display = "none";
		calendarSection.style.display = "none";
		(document.getElementById("error-message-text") as HTMLElement).textContent = message;
	}

	function setSaveButtonLoading(loading: boolean): void {
		const btn = document.getElementById("save-entry-btn") as HTMLButtonElement;
		const text = btn?.querySelector(".btn-text") as HTMLElement | undefined;
		const spinner = btn?.querySelector(".btn-spinner") as HTMLElement | undefined;

		if (!btn || !text || !spinner) {
			return;
		}

		if (loading) {
			btn.disabled = true;
			text.style.display = "none";
			spinner.style.display = "inline-block";
		} else {
			btn.disabled = false;
			text.style.display = "inline";
			spinner.style.display = "none";
		}
	}

	function setDeleteButtonLoading(loading: boolean): void {
		const btn = document.getElementById("confirm-delete-btn") as HTMLButtonElement;
		const text = btn?.querySelector(".btn-text") as HTMLElement | undefined;
		const spinner = btn?.querySelector(".btn-spinner") as HTMLElement | undefined;

		if (!btn || !text || !spinner) {
			return;
		}

		if (loading) {
			btn.disabled = true;
			text.style.display = "none";
			spinner.style.display = "inline-block";
		} else {
			btn.disabled = false;
			text.style.display = "inline";
			spinner.style.display = "none";
		}
	}

	/**
	 * Form validation helpers
	 */
	function clearFormErrors(): void {
		const errorElements = document.querySelectorAll<HTMLElement>(".field-error");
		errorElements.forEach((el: HTMLElement) => {
			el.textContent = "";
			el.style.display = "none";
		});

		const inputs = document.querySelectorAll<HTMLElement>(
			".form-group input, .form-group textarea, .form-group select"
		);
		inputs.forEach((input: HTMLElement) => input.classList.remove("error"));
	}

	function showFieldError(errorId: string, message: string): void {
		const errorElement = document.getElementById(errorId);
		if (errorElement) {
			errorElement.textContent = message;
			errorElement.style.display = "block";

			// Highlight the corresponding input
			const inputId = errorId.replace("-error", "");
			const input = document.getElementById(inputId) ?? document.getElementById(`entry-${inputId}`);
			if (input) {
				input.classList.add("error");
			}
		}
	}

	/**
	 * Toast notifications
	 */
	function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
		const toastElement = document.getElementById("toast") as HTMLElement;
		const messageElement = document.getElementById("toast-message") as HTMLElement;

		messageElement.textContent = message;
		toastElement.className = `toast toast-${type}`;
		toastElement.style.display = "block";

		// Auto-hide after 5 seconds
		setTimeout(hideToast, 5000);
	}

	function hideToast(): void {
		toast.style.display = "none";
	}

	/**
	 * Utility functions
	 */
	function escapeHtml(text: string): string {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}

	function formatDateForInput(date: Date): string {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const day = date.getDate().toString().padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	// Keyboard shortcuts
	document.addEventListener("keydown", function (e: KeyboardEvent) {
		// Escape key closes modals
		if (e.key === "Escape") {
			if (entryModal.style.display === "flex") {
				closeEntryModal();
			} else if (deleteModal.style.display === "flex") {
				closeDeleteModal();
			}
		}

		// Ctrl/Cmd + N creates new entry
		if ((e.ctrlKey || e.metaKey) && e.key === "n" && entryModal.style.display === "none") {
			e.preventDefault();
			showCreateEntryModal();
		}
	});

	// Event delegation for UI actions using data attributes
	document.addEventListener("click", (event: Event) => {
		const target = event.target as HTMLElement;
		const action = target.dataset.action;

		if (!action) {
			return;
		}

		switch (action) {
			case "edit-entry":
				editEntry(target.dataset.entryId ?? "");
				break;
			case "confirm-delete-entry":
				confirmDeleteEntry(target.dataset.entryId ?? "");
				break;
			case "close-entry-modal":
				closeEntryModal();
				break;
			case "close-delete-modal":
				closeDeleteModal();
				break;
			case "hide-toast":
				hideToast();
				break;
		}
	});
})();
