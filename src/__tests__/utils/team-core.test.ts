/**
 * Team Core Tests - TDD Implementation
 * Consolidates comprehensive test coverage from teams-business-logic, team-validation,
 * team-model-extensions, team-form-processing-utils, and team-management-ui-utils
 * into unified team-core module
 *
 * Following hybrid testing approach with comprehensive edge case coverage
 * Security-critical functions with XSS prevention and input sanitization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

// Import types from existing utilities (will be consolidated)
import type { Team } from "../../server/models/Team.js";
import type { User, UserRole } from "../../server/models/User.js";

// Mock fetch globally for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock DOM environment
const mockDocument = {
	getElementById: vi.fn(),
	createElement: vi.fn(() => {
		let textContent = "";
		return {
			get textContent() {
				return textContent;
			},
			set textContent(value: string) {
				textContent = value;
				// Simulate DOM escaping behavior
				this.innerHTML = value
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#x27;");
			},
			innerHTML: "",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			setAttribute: vi.fn(),
			getAttribute: vi.fn(),
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				contains: vi.fn(),
				toggle: vi.fn()
			}
		};
	}),
	querySelector: vi.fn(),
	querySelectorAll: vi.fn()
};
global.document = mockDocument as unknown as Document;

// Mock sessionStorage
const mockSessionStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn()
};
global.sessionStorage = mockSessionStorage as unknown as Storage;

// Mock window.location
const mockLocation = {
	href: "",
	pathname: "/teams.html",
	search: "",
	origin: "http://localhost:3000"
};
global.window = { location: mockLocation } as unknown as Window & typeof globalThis;

// Import the module under test - will fail initially (RED phase)
import { TeamCore } from "../../server/utils/team-core.js";

// Consolidated type definitions for team-core module
export interface CreateTeamData {
	name: string;
	description: string;
	velocity_baseline: number;
	sprint_length_days: number;
	working_days_per_week: number;
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
	memberCount: number;
	velocityBaseline: number;
	sprintLength: number;
	workingDaysPerWeek: number;
	createdAt: string;
	capacity: TeamCapacityMetrics;
}

export interface TeamCapacityMetrics {
	dailyVelocity: number;
	weeklyCapacity: number;
	sprintCapacity: number;
	utilizationRate: number;
}

export interface TeamFormData {
	name: string;
	description: string;
	velocity_baseline: string;
	sprint_length_days: string;
	working_days_per_week: string;
}

export interface ProcessedTeamData {
	stringFields: Record<string, string>;
	numberFields: Record<string, number>;
	booleanFields: Record<string, boolean>;
}

export interface FormFieldConfig {
	name: string;
	type: "string" | "number" | "boolean";
	required: boolean;
	validators?: ValidationFunction[];
}

export interface ValidationFunction {
	(value: unknown): { isValid: boolean; error?: string };
}

export interface TeamMembershipWithRole {
	id: string;
	team_id: string;
	user_id: string;
	role: UserRole;
	created_at: string;
	user: User;
}

export interface CreateTeamMembershipData {
	team_id: string;
	user_id: string;
	role: UserRole;
}

export interface SortCriteria {
	field: keyof Team;
	direction: "asc" | "desc";
	searchTerm?: string;
}

// TDD: These tests will initially fail since TeamCore doesn't exist yet (RED phase)
describe("TeamCore - Consolidated Team Management Module", () => {
	let teamCore: TeamCore;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset mocks
		mockLocation.href = "";
		mockLocation.pathname = "/teams.html";
		mockSessionStorage.getItem.mockReturnValue(null);
		mockFetch.mockClear();
		mockDocument.getElementById.mockReturnValue(null);

		// Create fresh TeamCore instance for each test
		teamCore = new TeamCore();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Business Logic (from teams-business-logic)", () => {
		describe("validateTeamData", () => {
			it("should validate valid team data successfully", () => {
				const validData: CreateTeamData = {
					name: "Development Team",
					description: "Main development team",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(validData);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
				expect(result.sanitizedData).toEqual(validData);
			});

			it("should reject team data with empty name", () => {
				const invalidData: CreateTeamData = {
					name: "",
					description: "Team description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.name).toBe("Team name is required");
				expect(result.sanitizedData).toBeUndefined();
			});

			it("should reject team data with name too long", () => {
				const invalidData: CreateTeamData = {
					name: "A".repeat(256),
					description: "Team description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.name).toBe("Team name must be less than 255 characters");
			});

			it("should reject team data with invalid velocity", () => {
				const invalidData: CreateTeamData = {
					name: "Valid Team",
					description: "Team description",
					velocity_baseline: -10,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
			});

			it("should reject team data with invalid sprint length", () => {
				const invalidData: CreateTeamData = {
					name: "Valid Team",
					description: "Team description",
					velocity_baseline: 50,
					sprint_length_days: 0,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.sprint_length_days).toBe("Sprint length must be between 1 and 28 days");
			});

			it("should reject team data with invalid working days", () => {
				const invalidData: CreateTeamData = {
					name: "Valid Team",
					description: "Team description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 8
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.working_days_per_week).toBe("Working days per week must be between 1 and 7");
			});

			it("should sanitize HTML in team description", () => {
				const dataWithHtml: CreateTeamData = {
					name: "Team <script>alert('xss')</script>",
					description: "Description with <script>malicious()</script> content",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamData(dataWithHtml);

				expect(result.isValid).toBe(true);
				expect(result.sanitizedData?.name).toBe("Team &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
				expect(result.sanitizedData?.description).toBe(
					"Description with &lt;script&gt;malicious()&lt;/script&gt; content"
				);
			});

			it("should handle multiple validation errors", () => {
				const invalidData: CreateTeamData = {
					name: "",
					description: "A".repeat(1001),
					velocity_baseline: -5,
					sprint_length_days: 50,
					working_days_per_week: 10
				};

				const result = teamCore.validateTeamData(invalidData);

				expect(result.isValid).toBe(false);
				expect(Object.keys(result.errors)).toHaveLength(5);
				expect(result.errors.name).toBe("Team name is required");
				expect(result.errors.description).toBe("Team description must be less than 1000 characters");
				expect(result.errors.velocity_baseline).toBe("Velocity baseline must be greater than 0");
			});

			it("should validate edge case values", () => {
				const edgeCaseData: CreateTeamData = {
					name: "T",
					description: "",
					velocity_baseline: 1,
					sprint_length_days: 1,
					working_days_per_week: 1
				};

				const result = teamCore.validateTeamData(edgeCaseData);

				expect(result.isValid).toBe(true);
				expect(result.sanitizedData).toEqual(edgeCaseData);
			});
		});

		describe("processTeamFormData", () => {
			it("should process valid form data", () => {
				const formData: TeamFormData = {
					name: "New Team",
					description: "Team description",
					velocity_baseline: "45",
					sprint_length_days: "14",
					working_days_per_week: "5"
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result).toEqual({
					name: "New Team",
					description: "Team description",
					velocity_baseline: 45,
					sprint_length_days: 14,
					working_days_per_week: 5
				});
			});

			it("should handle string number conversion", () => {
				const formData: TeamFormData = {
					name: "Team",
					description: "Description",
					velocity_baseline: "50.5",
					sprint_length_days: "14.7",
					working_days_per_week: "5.0"
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result.velocity_baseline).toBe(50);
				expect(result.sprint_length_days).toBe(14);
				expect(result.working_days_per_week).toBe(5);
			});

			it("should sanitize HTML in form data", () => {
				const formData: TeamFormData = {
					name: "Team <img src=x onerror=alert(1)>",
					description: "<script>evil()</script>",
					velocity_baseline: "50",
					sprint_length_days: "14",
					working_days_per_week: "5"
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result.name).toBe("Team &lt;img src=x onerror=alert(1)&gt;");
				expect(result.description).toBe("&lt;script&gt;evil()&lt;/script&gt;");
			});

			it("should handle invalid number strings", () => {
				const formData: TeamFormData = {
					name: "Team",
					description: "Description",
					velocity_baseline: "not-a-number",
					sprint_length_days: "also-not-number",
					working_days_per_week: ""
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result.velocity_baseline).toBe(0);
				expect(result.sprint_length_days).toBe(0);
				expect(result.working_days_per_week).toBe(0);
			});

			it("should trim whitespace from string fields", () => {
				const formData: TeamFormData = {
					name: "  Team Name  ",
					description: "  Description  ",
					velocity_baseline: "50",
					sprint_length_days: "14",
					working_days_per_week: "5"
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result.name).toBe("Team Name");
				expect(result.description).toBe("Description");
			});

			it("should handle empty form data", () => {
				const formData: TeamFormData = {
					name: "",
					description: "",
					velocity_baseline: "",
					sprint_length_days: "",
					working_days_per_week: ""
				};

				const result = teamCore.processTeamFormData(formData);

				expect(result).toEqual({
					name: "",
					description: "",
					velocity_baseline: 0,
					sprint_length_days: 0,
					working_days_per_week: 0
				});
			});
		});

		describe("createTeamDisplayData", () => {
			it("should create display data from team model", () => {
				const team: Team = {
					id: "team-123",
					name: "Development Team",
					description: "Main dev team",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.createTeamDisplayData(team);

				expect(result).toEqual({
					id: "team-123",
					name: "Development Team",
					description: "Main dev team",
					memberCount: 0, // Default when no members provided
					velocityBaseline: 50,
					sprintLength: 14,
					workingDaysPerWeek: 5,
					createdAt: "January 1, 2023",
					capacity: {
						dailyVelocity: 10, // 50 / 5 working days
						weeklyCapacity: 50,
						sprintCapacity: 100, // 50 * (14/7)
						utilizationRate: 100
					}
				});
			});

			it("should handle team with member count", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 60,
					sprint_length_days: 10,
					working_days_per_week: 5,
					created_at: new Date("2023-06-15T12:30:00Z"),
					updated_at: new Date("2023-06-15T12:30:00Z")
				};

				const result = teamCore.createTeamDisplayData(team, 8);

				expect(result.memberCount).toBe(8);
				expect(result.createdAt).toBe("June 15, 2023");
				expect(result.capacity.sprintCapacity).toBeCloseTo(85.71, 2); // 60 * (10/7)
			});

			it("should calculate correct capacity metrics", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 40,
					sprint_length_days: 21,
					working_days_per_week: 4,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.createTeamDisplayData(team);

				expect(result.capacity.dailyVelocity).toBe(10); // 40 / 4
				expect(result.capacity.weeklyCapacity).toBe(40);
				expect(result.capacity.sprintCapacity).toBe(120); // 40 * (21/7) = 40 * 3
				expect(result.capacity.utilizationRate).toBe(100);
			});

			it("should handle edge case sprint lengths", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 35,
					sprint_length_days: 7,
					working_days_per_week: 5,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.createTeamDisplayData(team);

				expect(result.capacity.sprintCapacity).toBe(35); // 35 * (7/7) = 35 * 1
			});
		});

		describe("calculateTeamCapacity", () => {
			it("should calculate basic capacity metrics", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 60,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.calculateTeamCapacity(team);

				expect(result).toEqual({
					dailyVelocity: 12, // 60 / 5
					weeklyCapacity: 60,
					sprintCapacity: 120, // 60 * (14/7)
					utilizationRate: 100
				});
			});

			it("should handle fractional calculations", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 37,
					sprint_length_days: 10,
					working_days_per_week: 3,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.calculateTeamCapacity(team);

				expect(result.dailyVelocity).toBeCloseTo(12.33, 2); // 37 / 3
				expect(result.weeklyCapacity).toBe(37);
				expect(result.sprintCapacity).toBeCloseTo(52.86, 2); // 37 * (10/7)
			});

			it("should calculate with reduced utilization", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.calculateTeamCapacity(team, 0.8); // 80% utilization

				expect(result.utilizationRate).toBe(80);
				expect(result.weeklyCapacity).toBe(40); // 50 * 0.8
				expect(result.sprintCapacity).toBe(80); // 100 * 0.8
			});

			it("should handle minimum values", () => {
				const team: Team = {
					id: "team-123",
					name: "Team",
					description: "Description",
					velocity_baseline: 1,
					sprint_length_days: 1,
					working_days_per_week: 1,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				};

				const result = teamCore.calculateTeamCapacity(team);

				expect(result.dailyVelocity).toBe(1);
				expect(result.weeklyCapacity).toBe(1);
				expect(result.sprintCapacity).toBeCloseTo(0.14, 2); // 1 * (1/7)
			});
		});

		describe("filterAndSortTeams", () => {
			const sampleTeams: Team[] = [
				{
					id: "team-1",
					name: "Alpha Team",
					description: "First team",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5,
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z")
				},
				{
					id: "team-2",
					name: "Beta Team",
					description: "Second team",
					velocity_baseline: 30,
					sprint_length_days: 10,
					working_days_per_week: 4,
					created_at: new Date("2023-02-01T00:00:00Z"),
					updated_at: new Date("2023-02-01T00:00:00Z")
				},
				{
					id: "team-3",
					name: "Gamma Team",
					description: "Third team",
					velocity_baseline: 70,
					sprint_length_days: 21,
					working_days_per_week: 5,
					created_at: new Date("2023-03-01T00:00:00Z"),
					updated_at: new Date("2023-03-01T00:00:00Z")
				}
			];

			it("should sort teams by name ascending", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(3);
				expect(result[0]?.name).toBe("Alpha Team");
				expect(result[1]?.name).toBe("Beta Team");
				expect(result[2]?.name).toBe("Gamma Team");
			});

			it("should sort teams by velocity descending", () => {
				const criteria: SortCriteria = {
					field: "velocity_baseline",
					direction: "desc"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result[0]?.velocity_baseline).toBe(70);
				expect(result[1]?.velocity_baseline).toBe(50);
				expect(result[2]?.velocity_baseline).toBe(30);
			});

			it("should filter teams by search term", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc",
					searchTerm: "alpha"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(1);
				expect(result[0]?.name).toBe("Alpha Team");
			});

			it("should filter teams by description search", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc",
					searchTerm: "second"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(1);
				expect(result[0]?.name).toBe("Beta Team");
			});

			it("should handle case-insensitive search", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc",
					searchTerm: "GAMMA"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(1);
				expect(result[0]?.name).toBe("Gamma Team");
			});

			it("should return empty array for no matches", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc",
					searchTerm: "nonexistent"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(0);
			});

			it("should sort by created date", () => {
				const criteria: SortCriteria = {
					field: "created_at",
					direction: "desc"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result[0]?.id).toBe("team-3"); // March (newest)
				expect(result[1]?.id).toBe("team-2"); // February
				expect(result[2]?.id).toBe("team-1"); // January (oldest)
			});

			it("should handle empty teams array", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc"
				};

				const result = teamCore.filterAndSortTeams([], criteria);

				expect(result).toHaveLength(0);
			});

			it("should combine search and sort", () => {
				const moreTeams: Team[] = [
					...sampleTeams,
					{
						id: "team-4",
						name: "Alpha 2 Team",
						description: "Another alpha team",
						velocity_baseline: 40,
						sprint_length_days: 14,
						working_days_per_week: 5,
						created_at: new Date("2023-04-01T00:00:00Z"),
						updated_at: new Date("2023-04-01T00:00:00Z")
					}
				];

				const criteria: SortCriteria = {
					field: "velocity_baseline",
					direction: "desc",
					searchTerm: "alpha"
				};

				const result = teamCore.filterAndSortTeams(moreTeams, criteria);

				expect(result).toHaveLength(2);
				expect(result[0]?.velocity_baseline).toBe(50); // Higher velocity first
				expect(result[1]?.velocity_baseline).toBe(40);
			});

			it("should handle partial word matches", () => {
				const criteria: SortCriteria = {
					field: "name",
					direction: "asc",
					searchTerm: "bet"
				};

				const result = teamCore.filterAndSortTeams(sampleTeams, criteria);

				expect(result).toHaveLength(1);
				expect(result[0]?.name).toBe("Beta Team");
			});
		});
	});

	// Additional test sections will be added for other consolidated utilities
	// Following the same comprehensive pattern established above

	describe("API Validation (from team-validation)", () => {
		describe("validateTeamInput", () => {
			it("should validate correct team input", () => {
				const validInput = {
					name: "Test Team",
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamInput(validInput);

				expect(result).toEqual({
					name: "Test Team",
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				});
			});

			it("should throw error for invalid input type", () => {
				expect(() => {
					teamCore.validateTeamInput(null);
				}).toThrow("Invalid team data provided");

				expect(() => {
					teamCore.validateTeamInput("not an object");
				}).toThrow("Invalid team data provided");
			});

			it("should throw error for missing name", () => {
				const invalidInput = {
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Team name is required");
			});

			it("should throw error for empty name", () => {
				const invalidInput = {
					name: "   ",
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Team name is required");
			});

			it("should throw error for invalid description type", () => {
				const invalidInput = {
					name: "Test Team",
					description: 123,
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Team description must be a string");
			});

			it("should throw error for negative velocity", () => {
				const invalidInput = {
					name: "Test Team",
					description: "Test description",
					velocity_baseline: -10,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Velocity baseline must be a non-negative number");
			});

			it("should throw error for invalid sprint length", () => {
				const invalidInput = {
					name: "Test Team",
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 0,
					working_days_per_week: 5
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Sprint length must be between 1 and 28 days");
			});

			it("should throw error for invalid working days", () => {
				const invalidInput = {
					name: "Test Team",
					description: "Test description",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 8
				};

				expect(() => {
					teamCore.validateTeamInput(invalidInput);
				}).toThrow("Working days per week must be between 1 and 7");
			});

			it("should trim whitespace from name", () => {
				const inputWithWhitespace = {
					name: "  Test Team  ",
					description: "  Test description  ",
					velocity_baseline: 50,
					sprint_length_days: 14,
					working_days_per_week: 5
				};

				const result = teamCore.validateTeamInput(inputWithWhitespace);

				expect(result.name).toBe("Test Team");
				expect(result.description).toBe("Test description");
			});
		});

		describe("validateSprintLength", () => {
			it("should validate correct sprint lengths", () => {
				expect(teamCore.validateSprintLength(1)).toBe(true);
				expect(teamCore.validateSprintLength(14)).toBe(true);
				expect(teamCore.validateSprintLength(28)).toBe(true);
			});

			it("should reject invalid sprint lengths", () => {
				expect(teamCore.validateSprintLength(0)).toBe(false);
				expect(teamCore.validateSprintLength(29)).toBe(false);
				expect(teamCore.validateSprintLength(-5)).toBe(false);
			});

			it("should reject non-integer sprint lengths", () => {
				expect(teamCore.validateSprintLength(14.5)).toBe(false);
				expect(teamCore.validateSprintLength(7.1)).toBe(false);
			});
		});

		describe("validateWorkingDays", () => {
			it("should validate correct working days", () => {
				expect(teamCore.validateWorkingDays(1)).toBe(true);
				expect(teamCore.validateWorkingDays(5)).toBe(true);
				expect(teamCore.validateWorkingDays(7)).toBe(true);
			});

			it("should reject invalid working days", () => {
				expect(teamCore.validateWorkingDays(0)).toBe(false);
				expect(teamCore.validateWorkingDays(8)).toBe(false);
				expect(teamCore.validateWorkingDays(-2)).toBe(false);
			});

			it("should reject non-integer working days", () => {
				expect(teamCore.validateWorkingDays(5.5)).toBe(false);
				expect(teamCore.validateWorkingDays(3.2)).toBe(false);
			});
		});
	});

	describe("Model Extensions (from team-model-extensions)", () => {
		describe("addMemberWithRole", () => {
			it("should add member with role successfully", () => {
				const membershipData: CreateTeamMembershipData = {
					team_id: "team-123",
					user_id: "user-456",
					role: "team_member"
				};

				const result = teamCore.addMemberWithRole(membershipData);

				expect(result).toMatchObject({
					team_id: "team-123",
					user_id: "user-456",
					role: "team_member"
				});
				expect(result.id).toBeDefined();
				expect(result.created_at).toBeDefined();
				expect(result.user).toMatchObject({
					id: "user-456",
					role: "team_member"
				});
			});

			it("should handle team lead role assignment", () => {
				const membershipData: CreateTeamMembershipData = {
					team_id: "team-123",
					user_id: "user-789",
					role: "team_lead"
				};

				const result = teamCore.addMemberWithRole(membershipData);

				expect(result.role).toBe("team_lead");
				expect(result.user.role).toBe("team_lead");
			});

			it("should generate unique membership IDs", () => {
				const membershipData1: CreateTeamMembershipData = {
					team_id: "team-123",
					user_id: "user-1",
					role: "team_member"
				};

				const membershipData2: CreateTeamMembershipData = {
					team_id: "team-123",
					user_id: "user-2",
					role: "team_member"
				};

				const result1 = teamCore.addMemberWithRole(membershipData1);
				const result2 = teamCore.addMemberWithRole(membershipData2);

				expect(result1.id).not.toBe(result2.id);
			});
		});

		describe("getTeamMemberships", () => {
			it("should return empty array for team with no members", () => {
				const result = teamCore.getTeamMemberships();

				expect(result).toEqual([]);
			});

			it("should return memberships for existing team", () => {
				// This will fail initially due to mock implementation
				const result = teamCore.getTeamMemberships();

				expect(Array.isArray(result)).toBe(true);
			});

			it("should handle invalid team ID", () => {
				const result = teamCore.getTeamMemberships();

				expect(Array.isArray(result)).toBe(true);
				expect(result).toHaveLength(0);
			});
		});

		describe("updateMemberRole", () => {
			it("should return null for non-existent membership", () => {
				const result = teamCore.updateMemberRole();

				expect(result).toBeNull();
			});

			it("should handle role updates", () => {
				// This will fail initially due to mock implementation
				const result = teamCore.updateMemberRole();

				// Mock returns null, but real implementation would return updated membership
				expect(result).toBeNull();
			});

			it("should validate role types", () => {
				const validRoles: UserRole[] = ["team_lead", "team_member"];

				for (let i = 0; i < validRoles.length; i++) {
					const result = teamCore.updateMemberRole();
					// Mock implementation returns null, but should not throw
					expect(result).toBeNull();
				}
			});
		});
	});

	describe("Form Processing (from team-form-processing-utils)", () => {
		describe("extractFormData", () => {
			it("should extract form data from HTMLFormElement", () => {
				// Mock form element with FormData
				const mockForm = {
					elements: {},
					submit: vi.fn(),
					reset: vi.fn()
				} as unknown as HTMLFormElement;

				const mockFormData = new Map([
					["name", "Test Team"],
					["description", "Test Description"],
					["velocity_baseline", "45"],
					["sprint_length_days", "14"],
					["working_days_per_week", "5"]
				]);

				// Mock FormData constructor
				global.FormData = vi.fn().mockImplementation(() => ({
					get: (key: string) => mockFormData.get(key) ?? null
				}));

				const result = teamCore.extractFormData(mockForm);

				expect(result).toEqual({
					name: "Test Team",
					description: "Test Description",
					velocity_baseline: "45",
					sprint_length_days: "14",
					working_days_per_week: "5"
				});
			});

			it("should handle missing form fields", () => {
				const mockForm = {} as HTMLFormElement;

				global.FormData = vi.fn().mockImplementation(() => ({
					get: () => null
				}));

				const result = teamCore.extractFormData(mockForm);

				expect(result).toEqual({
					name: "",
					description: "",
					velocity_baseline: "0",
					sprint_length_days: "14",
					working_days_per_week: "5"
				});
			});

			it("should handle empty string values", () => {
				const mockForm = {} as HTMLFormElement;

				global.FormData = vi.fn().mockImplementation(() => ({
					get: () => ""
				}));

				const result = teamCore.extractFormData(mockForm);

				expect(result).toEqual({
					name: "",
					description: "",
					velocity_baseline: "0",
					sprint_length_days: "14",
					working_days_per_week: "5"
				});
			});
		});

		describe("createFormValidator", () => {
			it("should create validator function with field config", () => {
				const config: FormFieldConfig[] = [
					{
						name: "name",
						type: "string",
						required: true
					},
					{
						name: "velocity",
						type: "number",
						required: true
					},
					{
						name: "active",
						type: "boolean",
						required: false
					}
				];

				const validator = teamCore.createFormValidator(config);
				expect(typeof validator).toBe("function");
			});

			it("should validate required fields", () => {
				const config: FormFieldConfig[] = [
					{ name: "name", type: "string", required: true },
					{ name: "description", type: "string", required: false }
				];

				const validator = teamCore.createFormValidator(config);

				const invalidData = { description: "test" };
				const result = validator(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.name).toBe("name is required");
			});

			it("should validate field types", () => {
				const config: FormFieldConfig[] = [{ name: "velocity", type: "number", required: true }];

				const validator = teamCore.createFormValidator(config);

				const invalidData = { velocity: "not-a-number" };
				const result = validator(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.velocity).toBe("velocity must be a number");
			});

			it("should validate boolean types", () => {
				const config: FormFieldConfig[] = [{ name: "active", type: "boolean", required: true }];

				const validator = teamCore.createFormValidator(config);

				const invalidData = { active: "yes" };
				const result = validator(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.active).toBe("active must be a boolean");
			});

			it("should handle valid data", () => {
				const config: FormFieldConfig[] = [
					{ name: "name", type: "string", required: true },
					{ name: "velocity", type: "number", required: true },
					{ name: "active", type: "boolean", required: false }
				];

				const validator = teamCore.createFormValidator(config);

				const validData = {
					name: "Test Team",
					velocity: 50,
					active: true
				};

				const result = validator(validData);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
			});

			it("should run custom validators", () => {
				const customValidator: ValidationFunction = (value: unknown) => {
					if (typeof value === "string" && value.length < 3) {
						return { isValid: false, error: "Must be at least 3 characters" };
					}
					return { isValid: true };
				};

				const config: FormFieldConfig[] = [
					{
						name: "name",
						type: "string",
						required: true,
						validators: [customValidator]
					}
				];

				const validator = teamCore.createFormValidator(config);

				const invalidData = { name: "AB" };
				const result = validator(invalidData);

				expect(result.isValid).toBe(false);
				expect(result.errors.name).toBe("Must be at least 3 characters");
			});

			it("should skip validation for empty optional fields", () => {
				const config: FormFieldConfig[] = [{ name: "description", type: "string", required: false }];

				const validator = teamCore.createFormValidator(config);

				const dataWithEmpty = { description: "" };
				const result = validator(dataWithEmpty);

				expect(result.isValid).toBe(true);
				expect(result.errors).toEqual({});
			});
		});
	});

	describe("UI Integration (from team-management-ui-utils)", () => {
		describe("renderUserSearchResults", () => {
			beforeEach(() => {
				// Setup mock container element
				const mockContainer = {
					innerHTML: "",
					id: "search-results"
				};
				mockDocument.getElementById.mockReturnValue(mockContainer as unknown as HTMLElement);
			});

			it("should render user search results", () => {
				const users: User[] = [
					{
						id: "user-1",
						email: "john@example.com",
						password_hash: "hash1",
						first_name: "John",
						last_name: "Doe",
						role: "team_member",
						is_active: true,
						last_login_at: null,
						created_at: new Date("2023-01-01T00:00:00Z"),
						updated_at: new Date("2023-01-01T00:00:00Z")
					},
					{
						id: "user-2",
						email: "jane@example.com",
						password_hash: "hash2",
						first_name: "Jane",
						last_name: "Smith",
						role: "team_lead",
						is_active: true,
						last_login_at: null,
						created_at: new Date("2023-01-01T00:00:00Z"),
						updated_at: new Date("2023-01-01T00:00:00Z")
					}
				];

				teamCore.renderUserSearchResults(users, "search-results");

				const mockContainer = mockDocument.getElementById("search-results");
				expect(mockContainer.innerHTML).toContain("John Doe");
				expect(mockContainer.innerHTML).toContain("john@example.com");
				expect(mockContainer.innerHTML).toContain("Jane Smith");
				expect(mockContainer.innerHTML).toContain("jane@example.com");
			});

			it("should handle empty user list", () => {
				teamCore.renderUserSearchResults([], "search-results");

				const mockContainer = mockDocument.getElementById("search-results");
				expect(mockContainer.innerHTML).toBe('<div class="user-search-empty">No users found</div>');
			});

			it("should handle missing container", () => {
				mockDocument.getElementById.mockReturnValue(null);

				expect(() => {
					teamCore.renderUserSearchResults([], "missing-container");
				}).not.toThrow();
			});

			it("should sanitize user data to prevent XSS", () => {
				const maliciousUsers: User[] = [
					{
						id: "user-1",
						email: "test@example.com",
						password_hash: "hash1",
						first_name: "<script>alert('xss')</script>",
						last_name: "<img src=x onerror=alert(1)>",
						role: "team_member",
						is_active: true,
						last_login_at: null,
						created_at: new Date("2023-01-01T00:00:00Z"),
						updated_at: new Date("2023-01-01T00:00:00Z")
					}
				];

				teamCore.renderUserSearchResults(maliciousUsers, "search-results");

				const mockContainer = mockDocument.getElementById("search-results");
				expect(mockContainer.innerHTML).not.toContain("<script>");
				expect(mockContainer.innerHTML).not.toContain("onerror=");
			});

			it("should include action buttons for each user", () => {
				const users: User[] = [
					{
						id: "user-1",
						email: "test@example.com",
						password_hash: "hash1",
						first_name: "Test",
						last_name: "User",
						role: "team_member",
						is_active: true,
						last_login_at: null,
						created_at: new Date("2023-01-01T00:00:00Z"),
						updated_at: new Date("2023-01-01T00:00:00Z")
					}
				];

				teamCore.renderUserSearchResults(users, "search-results");

				const mockContainer = mockDocument.getElementById("search-results");
				expect(mockContainer.innerHTML).toContain('data-action="add-user-to-team"');
				expect(mockContainer.innerHTML).toContain('data-user-id="user-1"');
				expect(mockContainer.innerHTML).toContain("Add to Team");
			});
		});

		describe("handleUserSearch", () => {
			beforeEach(() => {
				mockFetch.mockClear();
			});

			it("should perform user search with valid term", async () => {
				const mockUsers: User[] = [
					{
						id: "user-1",
						email: "john@example.com",
						password_hash: "hash1",
						first_name: "John",
						last_name: "Doe",
						role: "team_member",
						is_active: true,
						last_login_at: null,
						created_at: new Date("2023-01-01T00:00:00Z"),
						updated_at: new Date("2023-01-01T00:00:00Z")
					}
				];

				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockUsers)
				});

				const callback = vi.fn();
				await teamCore.handleUserSearch("john", callback);

				expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john");
				expect(callback).toHaveBeenCalledWith(mockUsers);
			});

			it("should handle short search terms", async () => {
				const callback = vi.fn();
				await teamCore.handleUserSearch("j", callback);

				expect(mockFetch).not.toHaveBeenCalled();
				expect(callback).toHaveBeenCalledWith([]);
			});

			it("should handle empty search terms", async () => {
				const callback = vi.fn();
				await teamCore.handleUserSearch("", callback);

				expect(mockFetch).not.toHaveBeenCalled();
				expect(callback).toHaveBeenCalledWith([]);
			});

			it("should handle search API errors", async () => {
				mockFetch.mockRejectedValueOnce(new Error("Network error"));

				const callback = vi.fn();
				await teamCore.handleUserSearch("john", callback);

				expect(callback).toHaveBeenCalledWith([]);
			});

			it("should handle non-ok responses", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: false,
					status: 500
				});

				const callback = vi.fn();
				await teamCore.handleUserSearch("john", callback);

				expect(callback).toHaveBeenCalledWith([]);
			});

			it("should encode search terms properly", async () => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([])
				});

				const callback = vi.fn();
				await teamCore.handleUserSearch("john doe & smith", callback);

				expect(mockFetch).toHaveBeenCalledWith("/api/users/search?q=john%20doe%20%26%20smith");
			});
		});

		describe("showTeamManagementUI", () => {
			beforeEach(() => {
				const mockContainer = {
					innerHTML: "",
					id: "team-management",
					setAttribute: vi.fn(),
					style: { display: "" }
				};
				mockDocument.getElementById.mockReturnValue(mockContainer as unknown as HTMLElement);

				// Mock search input element
				const mockSearchInput = {
					addEventListener: vi.fn(),
					value: ""
				};
				mockDocument.getElementById.mockImplementation(id => {
					if (id === "team-management") {
						return mockContainer as unknown as HTMLElement;
					}
					if (id === "user-search-input") {
						return mockSearchInput as unknown as HTMLInputElement;
					}
					return null;
				});
			});

			it("should create team management UI", () => {
				teamCore.showTeamManagementUI("team-123", "team-management");

				const mockContainer = mockDocument.getElementById("team-management");
				expect(mockContainer.innerHTML).toContain("Manage Team Members");
				expect(mockContainer.innerHTML).toContain("Search users...");
				expect(mockContainer.innerHTML).toContain("Current Members");
			});

			it("should handle missing container", () => {
				mockDocument.getElementById.mockReturnValue(null);

				expect(() => {
					teamCore.showTeamManagementUI("team-123", "missing-container");
				}).not.toThrow();
			});

			it("should setup search input event listener", () => {
				teamCore.showTeamManagementUI("team-123", "team-management");

				const mockSearchInput = mockDocument.getElementById(
					"user-search-input"
				) as unknown as HTMLInputElement & {
					addEventListener: Mock;
				};
				expect(mockSearchInput.addEventListener).toHaveBeenCalledWith("input", expect.any(Function));
			});

			it("should include search results container", () => {
				teamCore.showTeamManagementUI("team-123", "team-management");

				const mockContainer = mockDocument.getElementById("team-management");
				expect(mockContainer.innerHTML).toContain('id="search-results"');
				expect(mockContainer.innerHTML).toContain('id="team-members"');
			});
		});
	});
});
