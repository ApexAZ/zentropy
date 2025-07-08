import type {
	Team,
	CreateTeamData,
	TeamValidationResult,
	TeamMember,
	Sprint,
	User,
	AddMemberData,
	CreateSprintData,
	TeamBasicData,
	VelocityData
} from "../types";

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
	 * Get a specific team by ID
	 */
	static async getTeam(teamId: string): Promise<Team> {
		const response = await fetch(`/api/v1/teams/${teamId}`);
		return this.handleResponse<Team>(response);
	}

	/**
	 * Get team members for a specific team
	 */
	static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
		const response = await fetch(`/api/v1/teams/${teamId}/members`);
		return this.handleResponse<TeamMember[]>(response);
	}

	/**
	 * Get users for a specific team
	 */
	static async getTeamUsers(teamId: string): Promise<User[]> {
		const response = await fetch(`/api/v1/teams/${teamId}/users`);
		return this.handleResponse<User[]>(response);
	}

	/**
	 * Add a member to a team
	 */
	static async addTeamMember(teamId: string, memberData: AddMemberData): Promise<TeamMember> {
		const response = await fetch(`/api/v1/teams/${teamId}/members`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(memberData)
		});
		return this.handleResponse<TeamMember>(response);
	}

	/**
	 * Remove a member from a team
	 */
	static async removeTeamMember(teamId: string, memberId: string): Promise<void> {
		const response = await fetch(`/api/v1/teams/${teamId}/members/${memberId}`, {
			method: "DELETE"
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
			throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
		}
	}

	/**
	 * Get sprints for a specific team
	 */
	static async getTeamSprints(teamId: string): Promise<Sprint[]> {
		const response = await fetch(`/api/v1/teams/${teamId}/sprints`);
		return this.handleResponse<Sprint[]>(response);
	}

	/**
	 * Create a new sprint for a team
	 */
	static async createSprint(teamId: string, sprintData: CreateSprintData): Promise<Sprint> {
		const response = await fetch(`/api/v1/teams/${teamId}/sprints`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				...sprintData,
				team_id: teamId
			})
		});
		return this.handleResponse<Sprint>(response);
	}

	/**
	 * Update team basic information
	 */
	static async updateTeamBasicInfo(teamId: string, teamData: TeamBasicData): Promise<Team> {
		const response = await fetch(`/api/v1/teams/${teamId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				name: teamData.name,
				description: teamData.description,
				working_days: teamData.working_days,
				working_days_per_week: teamData.working_days.length
			})
		});
		return this.handleResponse<Team>(response);
	}

	/**
	 * Update team velocity settings
	 */
	static async updateTeamVelocity(teamId: string, velocityData: VelocityData): Promise<Team> {
		const response = await fetch(`/api/v1/teams/${teamId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				velocity_baseline: velocityData.baseline_velocity,
				sprint_length_days: velocityData.sprint_length * 7
			})
		});
		return this.handleResponse<Team>(response);
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
}
