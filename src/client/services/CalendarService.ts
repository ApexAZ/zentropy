import type { CalendarEntry, CreateCalendarEntryData, Team, User } from "../types";

export class CalendarService {
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Get calendar entries with optional filters
	 */
	static async getCalendarEntries(filters?: {
		team_id?: string;
		month?: string;
		year?: string;
	}): Promise<CalendarEntry[]> {
		const params = new URLSearchParams();
		if (filters?.team_id) {
			params.append("team_id", filters.team_id);
		}
		if (filters?.month) {
			params.append("month", filters.month);
		}
		if (filters?.year) {
			params.append("year", filters.year);
		}

		const response = await fetch(`/api/v1/calendar_entries?${params.toString()}`);
		return this.handleResponse<CalendarEntry[]>(response);
	}

	/**
	 * Create a new calendar entry
	 */
	static async createCalendarEntry(entryData: CreateCalendarEntryData): Promise<CalendarEntry> {
		const response = await fetch("/api/v1/calendar_entries", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(entryData)
		});
		return this.handleResponse<CalendarEntry>(response);
	}

	/**
	 * Update an existing calendar entry
	 */
	static async updateCalendarEntry(entryId: string, entryData: CreateCalendarEntryData): Promise<CalendarEntry> {
		const response = await fetch(`/api/v1/calendar_entries/${entryId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(entryData)
		});
		return this.handleResponse<CalendarEntry>(response);
	}

	/**
	 * Delete a calendar entry
	 */
	static async deleteCalendarEntry(entryId: string): Promise<void> {
		const response = await fetch(`/api/v1/calendar_entries/${entryId}`, {
			method: "DELETE"
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || "Failed to delete calendar entry");
		}
	}

	/**
	 * Get initialization data (teams and users)
	 */
	static async getInitializationData(): Promise<{ teams: Team[]; users: User[] }> {
		const [teamsResponse, usersResponse] = await Promise.all([fetch("/api/v1/teams"), fetch("/api/v1/users")]);

		if (!teamsResponse.ok || !usersResponse.ok) {
			throw new Error("Failed to load initial data");
		}

		const [teams, users] = await Promise.all([
			teamsResponse.json() as Promise<Team[]>,
			usersResponse.json() as Promise<User[]>
		]);

		return { teams, users };
	}

	/**
	 * Validate calendar entry form data
	 */
	static validateCalendarEntry(entryData: CreateCalendarEntryData): {
		isValid: boolean;
		errors: Record<string, string>;
	} {
		const errors: Record<string, string> = {};

		if (!entryData.team_id) {
			errors.team_id = "Please select a team";
		}

		if (!entryData.user_id) {
			errors.user_id = "Please select a team member";
		}

		if (!entryData.title.trim()) {
			errors.title = "Title is required";
		}

		if (!entryData.start_date) {
			errors.start_date = "Start date is required";
		}

		if (!entryData.end_date) {
			errors.end_date = "End date is required";
		}

		if (entryData.start_date && entryData.end_date && entryData.start_date > entryData.end_date) {
			errors.end_date = "End date must be after start date";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}
}
