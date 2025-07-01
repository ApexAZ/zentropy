/**
 * Calendar Utilities
 * Pure functions extracted from calendar.test.ts following hybrid testing approach
 * These functions handle calendar business logic without DOM dependencies for easy testing
 */

// Type definitions for calendar utilities
export interface CalendarEntry {
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

export interface Team {
	id: string;
	name: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

export interface User {
	id: string;
	username: string;
	email: string;
	first_name: string;
	last_name: string;
	role: string;
}

export interface CreateCalendarEntryData {
	team_id: string;
	user_id: string;
	entry_type: string;
	title: string;
	start_date: string;
	end_date: string;
	description?: string;
	all_day?: boolean;
}

export interface CalendarValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface CapacityImpact {
	workingDays: number;
	percentage: number;
}

/**
 * Get calendar entries for a specific date
 * @param date - The date to check for entries
 * @param calendarEntries - Array of calendar entries to filter
 * @returns Array of entries that overlap with the given date
 */
export function getEntriesForDate(date: Date, calendarEntries: CalendarEntry[]): CalendarEntry[] {
	return calendarEntries.filter(entry => {
		const startDate = new Date(entry.start_date);
		const endDate = new Date(entry.end_date);
		return date >= startDate && date <= endDate;
	});
}

/**
 * Get entry title for display
 * @param entry - The calendar entry
 * @param users - Array of users to look up names
 * @returns Formatted title with user name and entry type
 */
export function getEntryTitle(entry: CalendarEntry, users: User[]): string {
	const user = users.find(u => u.id === entry.user_id);
	const userName = user ? `${user.first_name} ${user.last_name}` : "Unknown";
	const typeLabel = getEntryTypeLabel(entry.entry_type);
	return `${userName} - ${typeLabel}`;
}

/**
 * Get human-readable label for entry type
 * @param type - The entry type
 * @returns Human-readable label for the entry type
 */
export function getEntryTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		pto: "PTO / Vacation",
		holiday: "Holiday",
		sick: "Sick Leave",
		personal: "Personal Time"
	};
	return labels[type] ?? type;
}

/**
 * Validate calendar entry data
 * @param data - The entry data to validate
 * @returns Validation result with errors array
 */
export function validateEntryData(data: CreateCalendarEntryData): CalendarValidationResult {
	const errors: string[] = [];

	if (!data.team_id) {
		errors.push("Please select a team");
	}

	if (!data.user_id) {
		errors.push("Please select a team member");
	}

	if (!data.start_date) {
		errors.push("Start date is required");
	}

	if (!data.end_date) {
		errors.push("End date is required");
	}

	if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
		errors.push("End date must be after start date");
	}

	if (data.description && data.description.length > 500) {
		errors.push("Description must be less than 500 characters");
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Calculate working days between two dates
 * @param startDate - Start date for calculation
 * @param endDate - End date for calculation
 * @returns Number of working days (Monday-Friday)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
	let workingDays = 0;
	const current = new Date(startDate);

	while (current <= endDate) {
		const dayOfWeek = current.getDay();
		// Monday-Friday are working days (1-5)
		if (dayOfWeek >= 1 && dayOfWeek <= 5) {
			workingDays++;
		}
		current.setDate(current.getDate() + 1);
	}

	return workingDays;
}

/**
 * Calculate capacity impact for a team
 * @param team - Team configuration
 * @param startDate - Start date of the absence
 * @param endDate - End date of the absence
 * @returns Working days count and percentage impact
 */
export function calculateCapacityImpact(team: Team, startDate: Date, endDate: Date): CapacityImpact {
	const workingDays = calculateWorkingDays(startDate, endDate);
	const sprintWorkingDays = (team.sprint_length_days / 7) * team.working_days_per_week;
	const percentage = Math.round((workingDays / sprintWorkingDays) * 100);

	return {
		workingDays,
		percentage
	};
}

/**
 * Escape HTML to prevent XSS attacks
 * @param text - Text to escape
 * @returns HTML-safe text
 */
export function escapeHtml(text: string): string {
	// Always use manual escaping for consistent behavior across environments
	// (DOM-based escaping can vary between browsers and jsdom)
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric"
	});
}

/**
 * Format date for input fields
 * @param date - Date object to format
 * @returns YYYY-MM-DD formatted string for input fields
 */
export function formatDateForInput(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Filter entries for a specific month
 * @param calendarEntries - Array of calendar entries
 * @param selectedMonth - Date representing the month to filter
 * @returns Sorted array of entries that overlap with the month
 */
export function getEntriesForMonth(calendarEntries: CalendarEntry[], selectedMonth: Date): CalendarEntry[] {
	const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
	const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

	return calendarEntries
		.filter(entry => {
			const startDate = new Date(entry.start_date);
			const endDate = new Date(entry.end_date);
			return startDate <= monthEnd && endDate >= monthStart;
		})
		.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}
