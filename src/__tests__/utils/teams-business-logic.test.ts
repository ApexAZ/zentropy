import { describe, it, expect } from "vitest";
import {
	validateTeamData,
	processTeamFormData,
	escapeHtml,
	formatTeamDate,
	createTeamDisplayData,
	calculateTeamCapacity,
	validateTeamNameUniqueness,
	generateTeamSummary,
	validateSprintConfiguration,
	filterAndSortTeams,
	type Team,
	type CreateTeamData,
	type TeamFormData
} from "../../utils/teams-business-logic";

describe("Teams Business Logic", () => {
	describe("validateTeamData", () => {
		it("should validate correct team data", () => {
			const validData: CreateTeamData = {
				name: "Frontend Team",
				description: "UI/UX Development Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(validData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
			expect(result.sanitizedData).toEqual(validData);
		});

		it("should reject empty team name", () => {
			const invalidData: CreateTeamData = {
				name: "",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
		});

		it("should reject team name that is too short", () => {
			const invalidData: CreateTeamData = {
				name: "A",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be at least 2 characters");
		});

		it("should reject team name that is too long", () => {
			const invalidData: CreateTeamData = {
				name: "A".repeat(101),
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be less than 100 characters");
		});

		it("should reject team name with invalid characters", () => {
			const invalidData: CreateTeamData = {
				name: "Team<script>alert('xss')</script>",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name contains invalid characters");
		});

		it("should reject description that is too long", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				description: "A".repeat(501),
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Description must be less than 500 characters");
		});

		it("should reject negative velocity baseline", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: -5,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity baseline must be a non-negative integer");
		});

		it("should reject unreasonably high velocity", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 1001,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity per day seems unreasonably high");
		});

		it("should reject sprint length less than 1 day", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 25,
				sprint_length_days: 0,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length must be at least 1 day");
		});

		it("should reject sprint length exceeding 28 days", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 25,
				sprint_length_days: 29,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length should not exceed 28 days");
		});

		it("should reject working days less than 1", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 0
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week must be at least 1");
		});

		it("should reject working days exceeding 7", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 8
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days per week cannot exceed 7");
		});

		it("should reject unreasonably high velocity per day", () => {
			const invalidData: CreateTeamData = {
				name: "Valid Team",
				velocity_baseline: 1000,
				sprint_length_days: 10,
				working_days_per_week: 5
			};

			const result = validateTeamData(invalidData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity per day seems unreasonably high");
		});
	});

	describe("processTeamFormData", () => {
		it("should process valid form data correctly", () => {
			const formData: TeamFormData = {
				name: "  Frontend Team  ",
				description: "  UI Development  ",
				velocity_baseline: "25",
				sprint_length_days: "14",
				working_days_per_week: "5"
			};

			const result = processTeamFormData(formData);

			expect(result).toEqual({
				name: "Frontend Team",
				description: "UI Development",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5
			});
		});

		it("should handle empty description", () => {
			const formData: TeamFormData = {
				name: "Frontend Team",
				description: "",
				velocity_baseline: "25",
				sprint_length_days: "14",
				working_days_per_week: "5"
			};

			const result = processTeamFormData(formData);

			expect(result.description).toBeUndefined();
		});

		it("should sanitize XSS attempts", () => {
			const formData: TeamFormData = {
				name: "<script>alert('xss')</script>Team",
				description: "<img src=x onerror=alert(1)>Description",
				velocity_baseline: "25",
				sprint_length_days: "14",
				working_days_per_week: "5"
			};

			const result = processTeamFormData(formData);

			expect(result.name).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;Team");
			expect(result.description).toBe("&lt;img src=x onerror=alert(1)&gt;Description");
		});

		it("should handle invalid numeric values", () => {
			const formData: TeamFormData = {
				name: "Frontend Team",
				description: "Description",
				velocity_baseline: "invalid",
				sprint_length_days: "",
				working_days_per_week: "not-a-number"
			};

			const result = processTeamFormData(formData);

			expect(result.velocity_baseline).toBe(0);
			expect(result.sprint_length_days).toBe(14);
			expect(result.working_days_per_week).toBe(5);
		});
	});

	describe("escapeHtml", () => {
		it("should escape all dangerous HTML characters", () => {
			const dangerous = '<script>alert("xss")</script>';
			const result = escapeHtml(dangerous);

			expect(result).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;");
		});

		it("should escape ampersands", () => {
			const text = "Tom & Jerry";
			const result = escapeHtml(text);

			expect(result).toBe("Tom &amp; Jerry");
		});

		it("should escape quotes and apostrophes", () => {
			const text = `He said "It's working!"`;
			const result = escapeHtml(text);

			expect(result).toBe("He said &quot;It&#x27;s working!&quot;");
		});

		it("should handle empty and null inputs", () => {
			expect(escapeHtml("")).toBe("");
			expect(escapeHtml(null as any)).toBe("");
			expect(escapeHtml(undefined as any)).toBe("");
		});

		it("should handle non-string inputs", () => {
			expect(escapeHtml(123 as any)).toBe("");
			expect(escapeHtml({} as any)).toBe("");
		});
	});

	describe("formatTeamDate", () => {
		it("should format valid date strings", () => {
			const dateString = "2024-01-15T10:30:00.000Z";
			const result = formatTeamDate(dateString);

			expect(result).toBe("Jan 15, 2024");
		});

		it("should handle empty date strings", () => {
			const result = formatTeamDate("");

			expect(result).toBe("Unknown");
		});

		it("should handle invalid date strings", () => {
			const result = formatTeamDate("invalid-date");

			expect(result).toBe("Invalid date");
		});

		it("should handle null and undefined", () => {
			expect(formatTeamDate(null as any)).toBe("Unknown");
			expect(formatTeamDate(undefined as any)).toBe("Unknown");
		});
	});

	describe("createTeamDisplayData", () => {
		it("should create correct display data", () => {
			const team: Team = {
				id: "team-123",
				name: "Frontend Team",
				description: "UI Development",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = createTeamDisplayData(team);

			expect(result.id).toBe("team-123");
			expect(result.name).toBe("Frontend Team");
			expect(result.description).toBe("UI Development");
			expect(result.velocityText).toBe("25 points");
			expect(result.sprintText).toBe("14 days");
			expect(result.workingDaysText).toBe("5 days/week");
			// Date formatting may vary by timezone, so just check structure
			expect(result.createdDateFormatted).toMatch(/\w+ \d{1,2}, \d{4}/);
			expect(result.updatedDateFormatted).toMatch(/\w+ \d{1,2}, \d{4}/);
		});

		it("should handle team without description", () => {
			const team: Team = {
				id: "team-123",
				name: "Backend Team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = createTeamDisplayData(team);

			expect(result.description).toBe("No description");
		});

		it("should sanitize malicious content", () => {
			const team: Team = {
				id: "team-123",
				name: "<script>alert('xss')</script>",
				description: "<img src=x onerror=alert(1)>",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = createTeamDisplayData(team);

			expect(result.name).not.toContain("<script>");
			expect(result.description).not.toContain("<img");
		});
	});

	describe("calculateTeamCapacity", () => {
		it("should calculate capacity metrics correctly", () => {
			const team: Team = {
				id: "team-123",
				name: "Test Team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = calculateTeamCapacity(team);

			expect(result.dailyVelocity).toBe(3);
			expect(result.weeklyCapacity).toBe(15);
			expect(result.sprintCapacity).toBe(30);
		});

		it("should handle zero sprint length", () => {
			const team: Team = {
				id: "team-123",
				name: "Test Team",
				velocity_baseline: 30,
				sprint_length_days: 0,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = calculateTeamCapacity(team);

			expect(result.dailyVelocity).toBe(0);
			expect(result.weeklyCapacity).toBe(0);
			expect(result.sprintCapacity).toBe(30);
		});

		it("should round decimal results properly", () => {
			const team: Team = {
				id: "team-123",
				name: "Test Team",
				velocity_baseline: 23,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = calculateTeamCapacity(team);

			expect(result.dailyVelocity).toBe(1.64); // 23/14 = 1.642857... rounded to 1.64
			expect(result.weeklyCapacity).toBe(8.21); // 1.64 * 5 = 8.21
		});
	});

	describe("validateTeamNameUniqueness", () => {
		const existingTeams: Team[] = [
			{
				id: "team-1",
				name: "Frontend Team",
				velocity_baseline: 25,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			},
			{
				id: "team-2",
				name: "Backend Team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			}
		];

		it("should allow unique team names", () => {
			const result = validateTeamNameUniqueness("Mobile Team", existingTeams);

			expect(result).toBe(true);
		});

		it("should reject duplicate team names", () => {
			const result = validateTeamNameUniqueness("Frontend Team", existingTeams);

			expect(result).toBe(false);
		});

		it("should handle case insensitive duplicates", () => {
			const result = validateTeamNameUniqueness("FRONTEND TEAM", existingTeams);

			expect(result).toBe(false);
		});

		it("should allow updating existing team with same name", () => {
			const result = validateTeamNameUniqueness("Frontend Team", existingTeams, "team-1");

			expect(result).toBe(true);
		});

		it("should handle whitespace differences", () => {
			const result = validateTeamNameUniqueness("  Frontend Team  ", existingTeams);

			expect(result).toBe(false);
		});
	});

	describe("generateTeamSummary", () => {
		it("should generate correct summary text", () => {
			const team: Team = {
				id: "team-123",
				name: "Test Team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			};

			const result = generateTeamSummary(team);

			expect(result).toBe("Sprint: 10d | Velocity: 30 pts | Daily: 3 pts");
		});
	});

	describe("validateSprintConfiguration", () => {
		it("should validate standard sprint configuration", () => {
			const result = validateSprintConfiguration(14, 5);

			expect(result.isValid).toBe(true);
			expect(result.warnings).toHaveLength(0);
		});

		it("should warn about very short sprints", () => {
			const result = validateSprintConfiguration(5, 5);

			expect(result.isValid).toBe(false);
			expect(result.warnings).toContain("Sprints shorter than 1 week may not provide enough planning time");
		});

		it("should warn about very long sprints", () => {
			const result = validateSprintConfiguration(28, 5);

			expect(result.isValid).toBe(false);
			expect(result.warnings).toContain("Sprints longer than 3 weeks may reduce agility");
		});

		it("should warn about high working days ratio", () => {
			const result = validateSprintConfiguration(10, 6);

			expect(result.isValid).toBe(false);
			expect(result.warnings).toContain("Working days per week seems high relative to sprint length");
		});

		it("should suggest standard work week for long sprints", () => {
			const result = validateSprintConfiguration(21, 3);

			expect(result.isValid).toBe(false);
			expect(result.warnings).toContain("Consider standard 5-day work week for longer sprints");
		});
	});

	describe("filterAndSortTeams", () => {
		const teams: Team[] = [
			{
				id: "team-1",
				name: "Alpha Team",
				description: "First team",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2024-01-01T00:00:00.000Z",
				updated_at: "2024-01-15T00:00:00.000Z"
			},
			{
				id: "team-2",
				name: "Beta Team",
				description: "Second team",
				velocity_baseline: 30,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_at: "2024-01-02T00:00:00.000Z",
				updated_at: "2024-01-16T00:00:00.000Z"
			},
			{
				id: "team-3",
				name: "Gamma Team",
				description: "Third team with mobile focus",
				velocity_baseline: 25,
				sprint_length_days: 21,
				working_days_per_week: 5,
				created_at: "2024-01-03T00:00:00.000Z",
				updated_at: "2024-01-17T00:00:00.000Z"
			}
		];

		it("should return all teams when no search term", () => {
			const result = filterAndSortTeams(teams);

			expect(result).toHaveLength(3);
		});

		it("should filter teams by search term in name", () => {
			const result = filterAndSortTeams(teams, "Alpha");

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Alpha Team");
		});

		it("should filter teams by search term in description", () => {
			const result = filterAndSortTeams(teams, "mobile");

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Gamma Team");
		});

		it("should sort teams by name ascending", () => {
			const result = filterAndSortTeams(teams, "", "name", "asc");

			expect(result[0]?.name).toBe("Alpha Team");
			expect(result[1]?.name).toBe("Beta Team");
			expect(result[2]?.name).toBe("Gamma Team");
		});

		it("should sort teams by name descending", () => {
			const result = filterAndSortTeams(teams, "", "name", "desc");

			expect(result[0]?.name).toBe("Gamma Team");
			expect(result[1]?.name).toBe("Beta Team");
			expect(result[2]?.name).toBe("Alpha Team");
		});

		it("should sort teams by velocity", () => {
			const result = filterAndSortTeams(teams, "", "velocity", "asc");

			expect(result[0]?.velocity_baseline).toBe(20);
			expect(result[1]?.velocity_baseline).toBe(25);
			expect(result[2]?.velocity_baseline).toBe(30);
		});

		it("should sort teams by sprint length", () => {
			const result = filterAndSortTeams(teams, "", "sprint_length", "desc");

			expect(result[0]?.sprint_length_days).toBe(21);
			expect(result[1]?.sprint_length_days).toBe(14);
			expect(result[2]?.sprint_length_days).toBe(10);
		});

		it("should sort teams by creation date", () => {
			const result = filterAndSortTeams(teams, "", "created", "asc");

			expect(result[0]?.id).toBe("team-1");
			expect(result[1]?.id).toBe("team-2");
			expect(result[2]?.id).toBe("team-3");
		});

		it("should handle case insensitive search", () => {
			const result = filterAndSortTeams(teams, "BETA");

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("Beta Team");
		});
	});
});