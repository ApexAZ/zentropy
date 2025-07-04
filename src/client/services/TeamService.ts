export interface Team {
	id: string;
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
	created_at: string;
	updated_at: string;
}

export interface CreateTeamData {
	name: string;
	description?: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
}

export interface UpdateTeamData extends CreateTeamData {
	id: string;
}

export interface TeamValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

export class TeamService {
	private static async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
		return response.json();
	}

	/**
	 * Load all teams for the current user
	 */
	static async getTeams(): Promise<Team[]> {
		const response = await fetch("/api/v1/teams");
		return this.handleResponse<Team[]>(response);
	}

	/**
	 * Create a new team
	 */
	static async createTeam(teamData: CreateTeamData): Promise<Team> {
		const response = await fetch("/api/v1/teams", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(teamData)
		});
		return this.handleResponse<Team>(response);
	}

	/**
	 * Update an existing team
	 */
	static async updateTeam(teamId: string, teamData: CreateTeamData): Promise<Team> {
		const response = await fetch(`/api/v1/teams/${teamId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(teamData)
		});
		return this.handleResponse<Team>(response);
	}

	/**
	 * Delete a team
	 */
	static async deleteTeam(teamId: string): Promise<void> {
		const response = await fetch(`/api/v1/teams/${teamId}`, {
			method: "DELETE"
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
	}

	/**
	 * Validate team form data
	 */
	static validateTeam(teamData: CreateTeamData): TeamValidationResult {
		const errors: Record<string, string> = {};

		// Name validation
		if (!teamData.name.trim()) {
			errors.name = "Team name is required";
		} else if (teamData.name.length > 100) {
			errors.name = "Team name must be less than 100 characters";
		}

		// Description validation
		if (teamData.description && teamData.description.length > 500) {
			errors.description = "Description must be less than 500 characters";
		}

		// Velocity validation
		if (teamData.velocity_baseline < 0) {
			errors.velocity_baseline = "Velocity must be 0 or greater";
		}

		// Sprint length validation
		if (![7, 14, 21, 28].includes(teamData.sprint_length_days)) {
			errors.sprint_length_days = "Sprint length must be 1, 2, 3, or 4 weeks";
		}

		// Working days validation
		if (teamData.working_days_per_week < 1 || teamData.working_days_per_week > 7) {
			errors.working_days_per_week = "Working days must be between 1 and 7";
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors
		};
	}

	/**
	 * Format date for display
	 */
	static formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}

	/**
	 * Format velocity for display
	 */
	static formatVelocity(velocity: number): string {
		return velocity > 0 ? `${velocity} points` : "Not set";
	}

	/**
	 * Format sprint length for display
	 */
	static formatSprintLength(days: number): string {
		return `${days} days`;
	}

	/**
	 * Format working days for display
	 */
	static formatWorkingDays(days: number): string {
		return `${days} days/week`;
	}
}
