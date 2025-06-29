/**
 * Teams Business Logic
 * Pure functions extracted from teams.ts following hybrid testing approach
 * These functions handle core business logic without DOM dependencies for easy testing
 */

// Core team interfaces
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

export interface TeamFormData {
	name: string;
	description: string;
	velocity_baseline: string;
	sprint_length_days: string;
	working_days_per_week: string;
}

export interface TeamValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
	sanitizedData?: CreateTeamData;
}

export interface TeamDisplayData {
	id: string;
	name: string;
	description: string;
	velocityText: string;
	sprintText: string;
	workingDaysText: string;
	createdDateFormatted: string;
	updatedDateFormatted: string;
}

/**
 * Validate team form data with comprehensive business rules
 */
export function validateTeamData(data: CreateTeamData): TeamValidationResult {
	const errors: Record<string, string> = {};

	// Name validation
	if (!data.name || data.name.trim().length === 0) {
		errors.name = "Team name is required";
	} else if (data.name.trim().length < 2) {
		errors.name = "Team name must be at least 2 characters";
	} else if (data.name.length > 100) {
		errors.name = "Team name must be less than 100 characters";
	} else if (!/^[a-zA-Z0-9\s\-_.]+$/.test(data.name)) {
		errors.name = "Team name contains invalid characters";
	}

	// Description validation (optional but with limits)
	if (data.description && data.description.length > 500) {
		errors.description = "Description must be less than 500 characters";
	}

	// Velocity baseline validation
	if (!Number.isInteger(data.velocity_baseline) || data.velocity_baseline < 0) {
		errors.velocity_baseline = "Velocity baseline must be a non-negative integer";
	} else if (data.velocity_baseline > 1000) {
		errors.velocity_baseline = "Velocity baseline seems unreasonably high (max 1000)";
	}

	// Sprint length validation
	if (!Number.isInteger(data.sprint_length_days) || data.sprint_length_days < 1) {
		errors.sprint_length_days = "Sprint length must be at least 1 day";
	} else if (data.sprint_length_days > 28) {
		errors.sprint_length_days = "Sprint length should not exceed 28 days";
	}

	// Working days per week validation
	if (!Number.isInteger(data.working_days_per_week) || data.working_days_per_week < 1) {
		errors.working_days_per_week = "Working days per week must be at least 1";
	} else if (data.working_days_per_week > 7) {
		errors.working_days_per_week = "Working days per week cannot exceed 7";
	}

	// Business rule: velocity should be reasonable for team size
	if (data.velocity_baseline > 0 && data.sprint_length_days > 0) {
		const velocityPerDay = data.velocity_baseline / data.sprint_length_days;
		if (velocityPerDay > 50) {
			errors.velocity_baseline = "Velocity per day seems unreasonably high";
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
		sanitizedData: Object.keys(errors).length === 0 ? data : undefined
	};
}

/**
 * Process form data into team data with type conversion and sanitization
 */
export function processTeamFormData(formData: TeamFormData): CreateTeamData {
	return {
		name: escapeHtml(formData.name.trim()),
		description: formData.description ? escapeHtml(formData.description.trim()) : undefined,
		velocity_baseline: parseInt(formData.velocity_baseline, 10) || 0,
		sprint_length_days: parseInt(formData.sprint_length_days, 10) || 14,
		working_days_per_week: parseInt(formData.working_days_per_week, 10) || 5
	};
}

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
	if (!text || typeof text !== "string") {
		return "";
	}

	const htmlEscapes: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#x27;",
		"/": "&#x2F;"
	};

	return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match] || match);
}

/**
 * Format date for display with proper error handling
 */
export function formatTeamDate(dateString: string): string {
	if (!dateString) {
		return "Unknown";
	}

	try {
		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return "Invalid date";
		}

		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	} catch {
		return "Invalid date";
	}
}

/**
 * Create display data for team cards
 */
export function createTeamDisplayData(team: Team): TeamDisplayData {
	return {
		id: team.id,
		name: escapeHtml(team.name),
		description: team.description ? escapeHtml(team.description) : "No description",
		velocityText: `${team.velocity_baseline} points`,
		sprintText: `${team.sprint_length_days} days`,
		workingDaysText: `${team.working_days_per_week} days/week`,
		createdDateFormatted: formatTeamDate(team.created_at),
		updatedDateFormatted: formatTeamDate(team.updated_at)
	};
}

/**
 * Calculate team capacity metrics
 */
export function calculateTeamCapacity(team: Team): {
	dailyVelocity: number;
	weeklyCapacity: number;
	sprintCapacity: number;
} {
	const dailyVelocity = team.sprint_length_days > 0 ? team.velocity_baseline / team.sprint_length_days : 0;
	const weeklyCapacity = dailyVelocity * team.working_days_per_week;
	const sprintCapacity = team.velocity_baseline;

	return {
		dailyVelocity: Math.round(dailyVelocity * 100) / 100, // Round to 2 decimal places
		weeklyCapacity: Math.round(weeklyCapacity * 100) / 100,
		sprintCapacity
	};
}

/**
 * Validate team name for uniqueness (used with existing teams list)
 */
export function validateTeamNameUniqueness(
	newName: string, 
	existingTeams: Team[], 
	excludeTeamId?: string
): boolean {
	const trimmedName = newName.trim().toLowerCase();
	
	return !existingTeams.some(team => 
		team.name.toLowerCase() === trimmedName && team.id !== excludeTeamId
	);
}

/**
 * Generate team summary text for cards
 */
export function generateTeamSummary(team: Team): string {
	const capacity = calculateTeamCapacity(team);
	
	return `Sprint: ${team.sprint_length_days}d | Velocity: ${team.velocity_baseline} pts | Daily: ${capacity.dailyVelocity} pts`;
}

/**
 * Validate sprint configuration for business rules
 */
export function validateSprintConfiguration(sprintDays: number, workingDays: number): {
	isValid: boolean;
	warnings: string[];
} {
	const warnings: string[] = [];
	let isValid = true;

	// Check if sprint is too short
	if (sprintDays < 7) {
		warnings.push("Sprints shorter than 1 week may not provide enough planning time");
	}

	// Check if sprint is too long
	if (sprintDays > 21) {
		warnings.push("Sprints longer than 3 weeks may reduce agility");
	}

	// Check working days vs sprint length
	const maxWorkingDaysInSprint = Math.floor(sprintDays / 7) * workingDays + Math.min(sprintDays % 7, workingDays);
	if (workingDays * 2 > sprintDays) {
		warnings.push("Working days per week seems high relative to sprint length");
	}

	// Weekend-heavy sprints
	if (workingDays < 5 && sprintDays >= 14) {
		warnings.push("Consider standard 5-day work week for longer sprints");
	}

	return {
		isValid: warnings.length === 0,
		warnings
	};
}

/**
 * Filter and sort teams by various criteria
 */
export function filterAndSortTeams(
	teams: Team[], 
	searchTerm: string = "", 
	sortBy: "name" | "velocity" | "sprint_length" | "created" = "name",
	sortOrder: "asc" | "desc" = "asc"
): Team[] {
	// Filter by search term
	let filteredTeams = teams;
	if (searchTerm.trim()) {
		const term = searchTerm.toLowerCase();
		filteredTeams = teams.filter(team => 
			team.name.toLowerCase().includes(term) ||
			(team.description && team.description.toLowerCase().includes(term))
		);
	}

	// Sort teams
	const sorted = [...filteredTeams].sort((a, b) => {
		let comparison = 0;

		switch (sortBy) {
			case "name":
				comparison = a.name.localeCompare(b.name);
				break;
			case "velocity":
				comparison = a.velocity_baseline - b.velocity_baseline;
				break;
			case "sprint_length":
				comparison = a.sprint_length_days - b.sprint_length_days;
				break;
			case "created":
				comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
				break;
		}

		return sortOrder === "desc" ? -comparison : comparison;
	});

	return sorted;
}