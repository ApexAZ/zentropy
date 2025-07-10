import { vi, describe, it, expect, beforeEach } from "vitest";
import { DashboardService } from "../DashboardService";
import { TeamService } from "../TeamService";
import { CalendarService } from "../CalendarService";
import type { DashboardStats, Team, TeamMember, Sprint, CalendarEntry } from "../../types";

// Mock the service dependencies
vi.mock("../TeamService");
vi.mock("../CalendarService");

describe("DashboardService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Test data
	const mockTeam1: Team = {
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

	const mockTeam2: Team = {
		id: "team-456",
		name: "QA Team",
		description: "Quality assurance team",
		velocity_baseline: 15,
		sprint_length_days: 14,
		working_days_per_week: 5,
		working_days: [1, 2, 3, 4, 5],
		created_at: "2025-01-08T12:00:00Z",
		updated_at: "2025-01-08T12:00:00Z"
	};

	const mockTeamMembers1: TeamMember[] = [
		{
			id: "member-1",
			email: "dev1@example.com",
			first_name: "John",
			last_name: "Doe",
			role: "developer",
			team_role: "member"
		},
		{
			id: "member-2",
			email: "dev2@example.com",
			first_name: "Jane",
			last_name: "Smith",
			role: "developer",
			team_role: "lead"
		}
	];

	const mockTeamMembers2: TeamMember[] = [
		{
			id: "member-3",
			email: "qa1@example.com",
			first_name: "Bob",
			last_name: "Wilson",
			role: "tester",
			team_role: "member"
		}
	];

	const mockActiveSprints: Sprint[] = [
		{
			id: "sprint-1",
			name: "Sprint 1",
			start_date: "2025-01-08",
			end_date: "2025-01-22",
			team_id: "team-123",
			status: "active"
		},
		{
			id: "sprint-2",
			name: "Sprint 2",
			start_date: "2025-01-08",
			end_date: "2025-01-22",
			team_id: "team-123",
			status: "completed"
		}
	];

	// Create PTO entries that will be within the next 30 days from the test runtime
	const today = new Date();
	const futureDate1 = new Date();
	futureDate1.setDate(today.getDate() + 10); // 10 days from now
	const futureDate2 = new Date();
	futureDate2.setDate(today.getDate() + 20); // 20 days from now

	const mockPtoEntries: CalendarEntry[] = [
		{
			id: "entry-1",
			team_id: "team-123",
			user_id: "user-123",
			entry_type: "pto",
			title: "Vacation",
			start_date: futureDate1.toISOString().split("T")[0],
			end_date: futureDate1.toISOString().split("T")[0],
			all_day: true,
			created_at: "2025-01-10T12:00:00Z",
			updated_at: "2025-01-10T12:00:00Z"
		},
		{
			id: "entry-2",
			team_id: "team-456",
			user_id: "user-456",
			entry_type: "pto",
			title: "Personal Day",
			start_date: futureDate2.toISOString().split("T")[0],
			end_date: futureDate2.toISOString().split("T")[0],
			all_day: true,
			created_at: "2025-01-10T12:00:00Z",
			updated_at: "2025-01-10T12:00:00Z"
		}
	];

	describe("getDashboardStats", () => {
		it("should aggregate dashboard statistics successfully", async () => {
			const mockTeams = [mockTeam1, mockTeam2];

			// Mock TeamService methods
			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers)
				.mockResolvedValueOnce(mockTeamMembers1)
				.mockResolvedValueOnce(mockTeamMembers2);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce(mockActiveSprints).mockResolvedValueOnce([]);

			// Mock CalendarService methods for current and next month
			vi.mocked(CalendarService.getCalendarEntries)
				.mockResolvedValueOnce(mockPtoEntries)
				.mockResolvedValueOnce([]);

			const expectedStats: DashboardStats = {
				total_teams: 2,
				total_members: 3, // 2 from team1 + 1 from team2
				active_sprints: 1, // 1 active sprint from team1, 0 from team2
				upcoming_pto: 2 // 2 PTO entries within next 30 days
			};

			const result = await DashboardService.getDashboardStats();

			expect(result).toEqual(expectedStats);
			expect(TeamService.getTeams).toHaveBeenCalledTimes(1);
			expect(TeamService.getTeamMembers).toHaveBeenCalledTimes(2);
			expect(TeamService.getTeamSprints).toHaveBeenCalledTimes(2);
			expect(CalendarService.getCalendarEntries).toHaveBeenCalledTimes(2);
		});

		it("should handle empty teams list", async () => {
			vi.mocked(TeamService.getTeams).mockResolvedValue([]);
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			const expectedStats: DashboardStats = {
				total_teams: 0,
				total_members: 0,
				active_sprints: 0,
				upcoming_pto: 0
			};

			const result = await DashboardService.getDashboardStats();

			expect(result).toEqual(expectedStats);
			expect(TeamService.getTeams).toHaveBeenCalledTimes(1);
			expect(TeamService.getTeamMembers).not.toHaveBeenCalled();
			expect(TeamService.getTeamSprints).not.toHaveBeenCalled();
		});

		it("should handle team member fetch errors gracefully", async () => {
			const mockTeams = [mockTeam1, mockTeam2];

			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers)
				.mockResolvedValueOnce(mockTeamMembers1)
				.mockRejectedValueOnce(new Error("Team members not found"));
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			const expectedStats: DashboardStats = {
				total_teams: 2,
				total_members: 2, // Only successful team1 members counted
				active_sprints: 0,
				upcoming_pto: 0
			};

			const result = await DashboardService.getDashboardStats();

			expect(result).toEqual(expectedStats);
		});

		it("should handle sprint fetch errors gracefully", async () => {
			const mockTeams = [mockTeam1, mockTeam2];

			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers)
				.mockResolvedValueOnce(mockTeamMembers1)
				.mockResolvedValueOnce(mockTeamMembers2);
			vi.mocked(TeamService.getTeamSprints)
				.mockResolvedValueOnce(mockActiveSprints)
				.mockRejectedValueOnce(new Error("Sprints not found"));
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			const expectedStats: DashboardStats = {
				total_teams: 2,
				total_members: 3,
				active_sprints: 1, // Only successful team1 sprints counted
				upcoming_pto: 0
			};

			const result = await DashboardService.getDashboardStats();

			expect(result).toEqual(expectedStats);
		});

		it("should handle calendar entries fetch errors gracefully", async () => {
			const mockTeams = [mockTeam1];

			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers).mockResolvedValueOnce(mockTeamMembers1);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce([]);
			vi.mocked(CalendarService.getCalendarEntries)
				.mockRejectedValueOnce(new Error("Calendar not available"))
				.mockRejectedValueOnce(new Error("Calendar not available"));

			const expectedStats: DashboardStats = {
				total_teams: 1,
				total_members: 2,
				active_sprints: 0,
				upcoming_pto: 0 // Falls back to 0 on calendar error
			};

			const result = await DashboardService.getDashboardStats();

			expect(result).toEqual(expectedStats);
		});

		it("should handle getTeams error", async () => {
			vi.mocked(TeamService.getTeams).mockRejectedValue(new Error("Teams service unavailable"));

			await expect(DashboardService.getDashboardStats()).rejects.toThrow(
				"Failed to load dashboard stats: Teams service unavailable"
			);
		});

		it("should handle unknown error types", async () => {
			vi.mocked(TeamService.getTeams).mockRejectedValue("String error");

			await expect(DashboardService.getDashboardStats()).rejects.toThrow("Failed to load dashboard stats");
		});

		it("should filter PTO entries correctly for upcoming 30 days", async () => {
			const mockTeams = [mockTeam1];
			const today = new Date();
			const futureDate = new Date();
			futureDate.setDate(today.getDate() + 25); // Within 30 days
			const farFutureDate = new Date();
			farFutureDate.setDate(today.getDate() + 35); // Beyond 30 days
			const pastDate = new Date();
			pastDate.setDate(today.getDate() - 5); // In the past

			const mixedPtoEntries: CalendarEntry[] = [
				{
					...mockPtoEntries[0],
					entry_type: "pto",
					start_date: futureDate.toISOString().split("T")[0]
				},
				{
					...mockPtoEntries[1],
					entry_type: "pto",
					start_date: farFutureDate.toISOString().split("T")[0]
				},
				{
					...mockPtoEntries[0],
					id: "entry-3",
					entry_type: "pto",
					start_date: pastDate.toISOString().split("T")[0]
				},
				{
					...mockPtoEntries[0],
					id: "entry-4",
					entry_type: "holiday", // Not PTO
					start_date: futureDate.toISOString().split("T")[0]
				}
			];

			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers).mockResolvedValueOnce(mockTeamMembers1);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce([]);
			vi.mocked(CalendarService.getCalendarEntries)
				.mockResolvedValueOnce(mixedPtoEntries)
				.mockResolvedValueOnce([]);

			const result = await DashboardService.getDashboardStats();

			expect(result.upcoming_pto).toBe(1); // Only the future PTO entry within 30 days
		});

		it("should count only active sprints", async () => {
			const mockTeams = [mockTeam1];
			const mixedSprints: Sprint[] = [
				{
					id: "sprint-1",
					name: "Active Sprint",
					start_date: "2025-01-08",
					end_date: "2025-01-22",
					team_id: "team-123",
					status: "active"
				},
				{
					id: "sprint-2",
					name: "Planned Sprint",
					start_date: "2025-01-23",
					end_date: "2025-02-06",
					team_id: "team-123",
					status: "planned"
				},
				{
					id: "sprint-3",
					name: "Completed Sprint",
					start_date: "2024-12-25",
					end_date: "2025-01-07",
					team_id: "team-123",
					status: "completed"
				}
			];

			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers).mockResolvedValueOnce(mockTeamMembers1);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce(mixedSprints);
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			const result = await DashboardService.getDashboardStats();

			expect(result.active_sprints).toBe(1); // Only the active sprint
		});
	});

	describe("getTeams", () => {
		it("should delegate to TeamService.getTeams", async () => {
			const mockTeams = [mockTeam1, mockTeam2];
			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);

			const result = await DashboardService.getTeams();

			expect(result).toEqual(mockTeams);
			expect(TeamService.getTeams).toHaveBeenCalledTimes(1);
		});

		it("should handle TeamService errors", async () => {
			vi.mocked(TeamService.getTeams).mockRejectedValue(new Error("Service unavailable"));

			await expect(DashboardService.getTeams()).rejects.toThrow("Service unavailable");
		});
	});

	describe("private method behavior through public interface", () => {
		it("should handle month/year boundary correctly for PTO calculation", async () => {
			const mockTeams = [mockTeam1];

			// Test date calculations by checking the API calls made to CalendarService
			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers).mockResolvedValueOnce(mockTeamMembers1);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce([]);
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			await DashboardService.getDashboardStats();

			// Verify that CalendarService is called for current and next month
			expect(CalendarService.getCalendarEntries).toHaveBeenCalledTimes(2);

			const calls = vi.mocked(CalendarService.getCalendarEntries).mock.calls;
			// Both calls should have month and year parameters
			expect(calls[0][0]).toHaveProperty("month");
			expect(calls[0][0]).toHaveProperty("year");
			expect(calls[1][0]).toHaveProperty("month");
			expect(calls[1][0]).toHaveProperty("year");
		});

		it("should handle year rollover for next month calculation", async () => {
			// Mock current date to be in December to test year rollover
			const mockDecemberDate = new Date("2024-12-15");
			vi.setSystemTime(mockDecemberDate);

			const mockTeams = [mockTeam1];
			vi.mocked(TeamService.getTeams).mockResolvedValue(mockTeams);
			vi.mocked(TeamService.getTeamMembers).mockResolvedValueOnce(mockTeamMembers1);
			vi.mocked(TeamService.getTeamSprints).mockResolvedValueOnce([]);
			vi.mocked(CalendarService.getCalendarEntries).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

			await DashboardService.getDashboardStats();

			// Check that calendar service was called with correct year rollover
			const calls = vi.mocked(CalendarService.getCalendarEntries).mock.calls;

			// First call should be December 2024
			expect(calls[0][0]).toEqual({
				month: "12",
				year: "2024"
			});

			// Second call should be January 2025 (year rolled over)
			expect(calls[1][0]).toEqual({
				month: "01",
				year: "2025"
			});

			vi.useRealTimers();
		});
	});
});
