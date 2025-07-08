import { vi, describe, it, expect, beforeEach } from "vitest";
import { TeamService } from "../TeamService";
import type {
	Team,
	CreateTeamData,
	TeamMember,
	Sprint,
	User,
	AddMemberData,
	CreateSprintData,
	TeamBasicData,
	VelocityData
} from "../../types";

// Mock fetch globally
global.fetch = vi.fn();

describe("TeamService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Test data
	const mockTeam: Team = {
		id: "team-123",
		name: "Development Team",
		description: "Main development team",
		velocity_baseline: 20,
		sprint_length_days: 14,
		working_days_per_week: 5,
		working_days: [1, 2, 3, 4, 5],
		created_at: "2025-01-08T12:00:00Z",
		updated_at: "2025-01-08T12:00:00Z"
	};

	const mockTeamMember: TeamMember = {
		id: "member-123",
		email: "member@example.com",
		first_name: "John",
		last_name: "Doe",
		role: "developer",
		team_role: "member"
	};

	const mockUser: User = {
		id: "user-123",
		username: "johndoe",
		email: "john@example.com",
		first_name: "John",
		last_name: "Doe",
		role: "developer"
	};

	const mockSprint: Sprint = {
		id: "sprint-123",
		name: "Sprint 1",
		start_date: "2025-01-08",
		end_date: "2025-01-22",
		team_id: "team-123",
		status: "active"
	};

	// Helper function to mock successful fetch response
	const mockSuccessResponse = <T>(data: T) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(data)
		} as Response);
	};

	// Helper function to mock error response
	const mockErrorResponse = (status: number, message: string) => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status,
			statusText: status === 400 ? "Bad Request" : "Internal Server Error",
			json: () => Promise.resolve({ message })
		} as Response);
	};

	// Helper function to mock network error
	const mockNetworkError = () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));
	};

	describe("getTeams", () => {
		it("should retrieve all teams successfully", async () => {
			const mockTeams = [mockTeam, { ...mockTeam, id: "team-456", name: "QA Team" }];
			mockSuccessResponse(mockTeams);

			const result = await TeamService.getTeams();

			expect(result).toEqual(mockTeams);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams");
		});

		it("should handle empty teams list", async () => {
			mockSuccessResponse([]);

			const result = await TeamService.getTeams();

			expect(result).toEqual([]);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams");
		});

		it("should handle API errors when retrieving teams", async () => {
			mockErrorResponse(500, "Server error");

			await expect(TeamService.getTeams()).rejects.toThrow("Server error");
		});

		it("should handle network errors when retrieving teams", async () => {
			mockNetworkError();

			await expect(TeamService.getTeams()).rejects.toThrow("Network error");
		});
	});

	describe("getTeam", () => {
		it("should retrieve specific team successfully", async () => {
			mockSuccessResponse(mockTeam);

			const result = await TeamService.getTeam("team-123");

			expect(result).toEqual(mockTeam);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123");
		});

		it("should handle team not found error", async () => {
			mockErrorResponse(404, "Team not found");

			await expect(TeamService.getTeam("nonexistent")).rejects.toThrow("Team not found");
		});

		it("should handle API errors when retrieving specific team", async () => {
			mockErrorResponse(500, "Server error");

			await expect(TeamService.getTeam("team-123")).rejects.toThrow("Server error");
		});
	});

	describe("getTeamMembers", () => {
		it("should retrieve team members successfully", async () => {
			const mockMembers = [mockTeamMember, { ...mockTeamMember, id: "member-456", email: "jane@example.com" }];
			mockSuccessResponse(mockMembers);

			const result = await TeamService.getTeamMembers("team-123");

			expect(result).toEqual(mockMembers);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/members");
		});

		it("should handle empty members list", async () => {
			mockSuccessResponse([]);

			const result = await TeamService.getTeamMembers("team-123");

			expect(result).toEqual([]);
		});

		it("should handle API errors when retrieving team members", async () => {
			mockErrorResponse(403, "Access denied");

			await expect(TeamService.getTeamMembers("team-123")).rejects.toThrow("Access denied");
		});
	});

	describe("getTeamUsers", () => {
		it("should retrieve team users successfully", async () => {
			const mockUsers = [mockUser, { ...mockUser, id: "user-456", email: "jane@example.com" }];
			mockSuccessResponse(mockUsers);

			const result = await TeamService.getTeamUsers("team-123");

			expect(result).toEqual(mockUsers);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/users");
		});

		it("should handle API errors when retrieving team users", async () => {
			mockErrorResponse(500, "Server error");

			await expect(TeamService.getTeamUsers("team-123")).rejects.toThrow("Server error");
		});
	});

	describe("addTeamMember", () => {
		const memberData: AddMemberData = {
			email: "newmember@example.com",
			role: "member"
		};

		it("should add team member successfully", async () => {
			const newMember = { ...mockTeamMember, email: "newmember@example.com" };
			mockSuccessResponse(newMember);

			const result = await TeamService.addTeamMember("team-123", memberData);

			expect(result).toEqual(newMember);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/members", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(memberData)
			});
		});

		it("should handle validation errors when adding team member", async () => {
			mockErrorResponse(400, "Invalid email address");

			await expect(TeamService.addTeamMember("team-123", memberData)).rejects.toThrow("Invalid email address");
		});

		it("should handle member already exists error", async () => {
			mockErrorResponse(409, "Member already exists in team");

			await expect(TeamService.addTeamMember("team-123", memberData)).rejects.toThrow(
				"Member already exists in team"
			);
		});
	});

	describe("removeTeamMember", () => {
		it("should remove team member successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true
			} as Response);

			await TeamService.removeTeamMember("team-123", "member-123");

			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/members/member-123", {
				method: "DELETE"
			});
		});

		it("should handle member not found error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: () => Promise.resolve({ message: "Member not found" })
			} as Response);

			await expect(TeamService.removeTeamMember("team-123", "nonexistent")).rejects.toThrow("Member not found");
		});

		it("should handle API errors when removing team member", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({ message: "Server error" })
			} as Response);

			await expect(TeamService.removeTeamMember("team-123", "member-123")).rejects.toThrow("Server error");
		});
	});

	describe("getTeamSprints", () => {
		it("should retrieve team sprints successfully", async () => {
			const mockSprints = [mockSprint, { ...mockSprint, id: "sprint-456", name: "Sprint 2" }];
			mockSuccessResponse(mockSprints);

			const result = await TeamService.getTeamSprints("team-123");

			expect(result).toEqual(mockSprints);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/sprints");
		});

		it("should handle empty sprints list", async () => {
			mockSuccessResponse([]);

			const result = await TeamService.getTeamSprints("team-123");

			expect(result).toEqual([]);
		});

		it("should handle API errors when retrieving team sprints", async () => {
			mockErrorResponse(500, "Server error");

			await expect(TeamService.getTeamSprints("team-123")).rejects.toThrow("Server error");
		});
	});

	describe("createSprint", () => {
		const sprintData: CreateSprintData = {
			name: "New Sprint",
			start_date: "2025-01-08",
			end_date: "2025-01-22"
		};

		it("should create sprint successfully", async () => {
			const newSprint = { ...mockSprint, name: "New Sprint" };
			mockSuccessResponse(newSprint);

			const result = await TeamService.createSprint("team-123", sprintData);

			expect(result).toEqual(newSprint);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123/sprints", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					...sprintData,
					team_id: "team-123"
				})
			});
		});

		it("should handle validation errors when creating sprint", async () => {
			mockErrorResponse(400, "Invalid date range");

			await expect(TeamService.createSprint("team-123", sprintData)).rejects.toThrow("Invalid date range");
		});

		it("should handle overlapping sprint error", async () => {
			mockErrorResponse(409, "Sprint dates overlap with existing sprint");

			await expect(TeamService.createSprint("team-123", sprintData)).rejects.toThrow(
				"Sprint dates overlap with existing sprint"
			);
		});
	});

	describe("updateTeamBasicInfo", () => {
		const basicData: TeamBasicData = {
			name: "Updated Team Name",
			description: "Updated description",
			working_days: [1, 2, 3, 4, 5]
		};

		it("should update team basic info successfully", async () => {
			const updatedTeam = { ...mockTeam, name: "Updated Team Name" };
			mockSuccessResponse(updatedTeam);

			const result = await TeamService.updateTeamBasicInfo("team-123", basicData);

			expect(result).toEqual(updatedTeam);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					name: basicData.name,
					description: basicData.description,
					working_days: basicData.working_days,
					working_days_per_week: basicData.working_days.length
				})
			});
		});

		it("should handle validation errors when updating team basic info", async () => {
			mockErrorResponse(400, "Team name is required");

			await expect(TeamService.updateTeamBasicInfo("team-123", basicData)).rejects.toThrow(
				"Team name is required"
			);
		});
	});

	describe("updateTeamVelocity", () => {
		const velocityData: VelocityData = {
			baseline_velocity: 25,
			sprint_length: 2
		};

		it("should update team velocity successfully", async () => {
			const updatedTeam = { ...mockTeam, velocity_baseline: 25 };
			mockSuccessResponse(updatedTeam);

			const result = await TeamService.updateTeamVelocity("team-123", velocityData);

			expect(result).toEqual(updatedTeam);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					velocity_baseline: velocityData.baseline_velocity,
					sprint_length_days: velocityData.sprint_length * 7
				})
			});
		});

		it("should handle validation errors when updating team velocity", async () => {
			mockErrorResponse(400, "Invalid velocity baseline");

			await expect(TeamService.updateTeamVelocity("team-123", velocityData)).rejects.toThrow(
				"Invalid velocity baseline"
			);
		});
	});

	describe("createTeam", () => {
		const teamData: CreateTeamData = {
			name: "New Team",
			description: "A new team",
			velocity_baseline: 15,
			sprint_length_days: 14,
			working_days_per_week: 5
		};

		it("should create team successfully", async () => {
			const newTeam = { ...mockTeam, name: "New Team" };
			mockSuccessResponse(newTeam);

			const result = await TeamService.createTeam(teamData);

			expect(result).toEqual(newTeam);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(teamData)
			});
		});

		it("should handle validation errors when creating team", async () => {
			mockErrorResponse(400, "Team name is required");

			await expect(TeamService.createTeam(teamData)).rejects.toThrow("Team name is required");
		});

		it("should handle duplicate team name error", async () => {
			mockErrorResponse(409, "Team name already exists");

			await expect(TeamService.createTeam(teamData)).rejects.toThrow("Team name already exists");
		});
	});

	describe("updateTeam", () => {
		const teamData: CreateTeamData = {
			name: "Updated Team",
			description: "Updated description",
			velocity_baseline: 20,
			sprint_length_days: 21,
			working_days_per_week: 4
		};

		it("should update team successfully", async () => {
			const updatedTeam = { ...mockTeam, name: "Updated Team" };
			mockSuccessResponse(updatedTeam);

			const result = await TeamService.updateTeam("team-123", teamData);

			expect(result).toEqual(updatedTeam);
			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(teamData)
			});
		});

		it("should handle team not found error when updating", async () => {
			mockErrorResponse(404, "Team not found");

			await expect(TeamService.updateTeam("nonexistent", teamData)).rejects.toThrow("Team not found");
		});

		it("should handle validation errors when updating team", async () => {
			mockErrorResponse(400, "Invalid sprint length");

			await expect(TeamService.updateTeam("team-123", teamData)).rejects.toThrow("Invalid sprint length");
		});
	});

	describe("deleteTeam", () => {
		it("should delete team successfully", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true
			} as Response);

			await TeamService.deleteTeam("team-123");

			expect(fetch).toHaveBeenCalledWith("/api/v1/teams/team-123", {
				method: "DELETE"
			});
		});

		it("should handle team not found error when deleting", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: () => Promise.resolve({ message: "Team not found" })
			} as Response);

			await expect(TeamService.deleteTeam("nonexistent")).rejects.toThrow("Team not found");
		});

		it("should handle team has dependencies error", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 409,
				statusText: "Conflict",
				json: () => Promise.resolve({ message: "Cannot delete team with active sprints" })
			} as Response);

			await expect(TeamService.deleteTeam("team-123")).rejects.toThrow("Cannot delete team with active sprints");
		});
	});

	describe("validateTeam", () => {
		it("should validate valid team data successfully", () => {
			const validTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "A valid team description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(validTeamData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should validate team data with empty description", () => {
			const validTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(validTeamData);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it("should return error for empty team name", () => {
			const invalidTeamData: CreateTeamData = {
				name: "",
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
		});

		it("should return error for whitespace-only team name", () => {
			const invalidTeamData: CreateTeamData = {
				name: "   ",
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
		});

		it("should return error for team name too long", () => {
			const invalidTeamData: CreateTeamData = {
				name: "A".repeat(101),
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name must be less than 100 characters");
		});

		it("should return error for description too long", () => {
			const invalidTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "A".repeat(501),
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.description).toBe("Description must be less than 500 characters");
		});

		it("should return error for negative velocity baseline", () => {
			const invalidTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "Valid description",
				velocity_baseline: -5,
				sprint_length_days: 14,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.velocity_baseline).toBe("Velocity must be 0 or greater");
		});

		it("should return error for invalid sprint length", () => {
			const invalidTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 10,
				working_days_per_week: 5
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.sprint_length_days).toBe("Sprint length must be 1, 2, 3, or 4 weeks");
		});

		it("should return error for invalid working days per week (too few)", () => {
			const invalidTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 0
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days must be between 1 and 7");
		});

		it("should return error for invalid working days per week (too many)", () => {
			const invalidTeamData: CreateTeamData = {
				name: "Valid Team",
				description: "Valid description",
				velocity_baseline: 20,
				sprint_length_days: 14,
				working_days_per_week: 8
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.working_days_per_week).toBe("Working days must be between 1 and 7");
		});

		it("should return multiple validation errors", () => {
			const invalidTeamData: CreateTeamData = {
				name: "",
				description: "A".repeat(501),
				velocity_baseline: -10,
				sprint_length_days: 5,
				working_days_per_week: 8
			};

			const result = TeamService.validateTeam(invalidTeamData);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe("Team name is required");
			expect(result.errors.description).toBe("Description must be less than 500 characters");
			expect(result.errors.velocity_baseline).toBe("Velocity must be 0 or greater");
			expect(result.errors.sprint_length_days).toBe("Sprint length must be 1, 2, 3, or 4 weeks");
			expect(result.errors.working_days_per_week).toBe("Working days must be between 1 and 7");
		});

		it("should accept valid sprint length values", () => {
			const validSprintLengths = [7, 14, 21, 28];

			validSprintLengths.forEach(sprintLength => {
				const validTeamData: CreateTeamData = {
					name: "Valid Team",
					description: "Valid description",
					velocity_baseline: 20,
					sprint_length_days: sprintLength,
					working_days_per_week: 5
				};

				const result = TeamService.validateTeam(validTeamData);

				expect(result.isValid).toBe(true);
			});
		});

		it("should accept valid working days per week values", () => {
			const validWorkingDays = [1, 2, 3, 4, 5, 6, 7];

			validWorkingDays.forEach(workingDays => {
				const validTeamData: CreateTeamData = {
					name: "Valid Team",
					description: "Valid description",
					velocity_baseline: 20,
					sprint_length_days: 14,
					working_days_per_week: workingDays
				};

				const result = TeamService.validateTeam(validTeamData);

				expect(result.isValid).toBe(true);
			});
		});
	});

	describe("error handling", () => {
		it("should handle malformed JSON responses", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.reject(new Error("Invalid JSON"))
			} as Response);

			await expect(TeamService.getTeams()).rejects.toThrow("Unknown error");
		});

		it("should handle unknown error format", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				json: () => Promise.resolve({})
			} as Response);

			await expect(TeamService.getTeams()).rejects.toThrow("HTTP 500: Internal Server Error");
		});

		it("should handle fetch network errors", async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

			await expect(TeamService.getTeams()).rejects.toThrow("Failed to fetch");
		});
	});
});
