import type { DashboardStats, Team, CalendarEntry } from "../types";
import { TeamService } from "./TeamService";
import { CalendarService } from "./CalendarService";

export class DashboardService {
	/**
	 * Get comprehensive dashboard statistics
	 * Aggregates data from multiple services to provide complete dashboard metrics
	 */
	static async getDashboardStats(): Promise<DashboardStats> {
		try {
			// Get all teams first
			const teams = await TeamService.getTeams();
			const totalTeams = teams.length;

			// Get team members count across all teams
			const totalMembers = await this.getTotalMembers(teams);

			// Get active sprints count across all teams
			const activeSprints = await this.getActiveSprints(teams);

			// Get upcoming PTO entries
			const upcomingPto = await this.getUpcomingPtoCount();

			return {
				total_teams: totalTeams,
				total_members: totalMembers,
				active_sprints: activeSprints,
				upcoming_pto: upcomingPto
			};
		} catch (error) {
			throw new Error(
				error instanceof Error
					? `Failed to load dashboard stats: ${error.message}`
					: "Failed to load dashboard stats"
			);
		}
	}

	/**
	 * Calculate total members across all teams
	 * @param teams - Array of teams to count members for
	 */
	private static async getTotalMembers(teams: Team[]): Promise<number> {
		try {
			// Get member counts for all teams concurrently
			const memberCounts = await Promise.all(
				teams.map(async team => {
					try {
						const members = await TeamService.getTeamMembers(team.id);
						return members.length;
					} catch (error) {
						// If we can't get members for a specific team, return 0 and continue
						console.warn(`Failed to get members for team ${team.id}:`, error);
						return 0;
					}
				})
			);

			// Sum all member counts
			return memberCounts.reduce((total, count) => total + count, 0);
		} catch (error) {
			console.warn("Failed to calculate total members:", error);
			return 0;
		}
	}

	/**
	 * Count active sprints across all teams
	 * @param teams - Array of teams to count active sprints for
	 */
	private static async getActiveSprints(teams: Team[]): Promise<number> {
		try {
			// Get sprints for all teams concurrently
			const sprintCounts = await Promise.all(
				teams.map(async team => {
					try {
						const sprints = await TeamService.getTeamSprints(team.id);
						// Count only sprints with "active" status
						return sprints.filter(sprint => sprint.status === "active").length;
					} catch (error) {
						// If we can't get sprints for a specific team, return 0 and continue
						console.warn(`Failed to get sprints for team ${team.id}:`, error);
						return 0;
					}
				})
			);

			// Sum all active sprint counts
			return sprintCounts.reduce((total, count) => total + count, 0);
		} catch (error) {
			console.warn("Failed to calculate active sprints:", error);
			return 0;
		}
	}

	/**
	 * Count upcoming PTO entries (next 30 days)
	 */
	private static async getUpcomingPtoCount(): Promise<number> {
		try {
			const today = new Date();
			const thirtyDaysFromNow = new Date();
			thirtyDaysFromNow.setDate(today.getDate() + 30);

			// Get calendar entries for current month and next month to cover 30-day window
			const currentMonth = (today.getMonth() + 1).toString().padStart(2, "0");
			const currentYear = today.getFullYear().toString();
			const nextMonth = ((today.getMonth() + 2) % 12 || 12).toString().padStart(2, "0");
			const nextYear = (today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear()).toString();

			// Get calendar entries for both months
			const [currentMonthEntries, nextMonthEntries] = await Promise.all([
				CalendarService.getCalendarEntries({
					month: currentMonth,
					year: currentYear
				}).catch(() => [] as CalendarEntry[]),
				CalendarService.getCalendarEntries({
					month: nextMonth,
					year: nextYear
				}).catch(() => [] as CalendarEntry[])
			]);

			// Combine and filter entries
			const allEntries = [...currentMonthEntries, ...nextMonthEntries];

			// Filter for PTO entries that start within the next 30 days
			const upcomingPtoEntries = allEntries.filter(entry => {
				if (entry.entry_type !== "pto") return false;

				const entryStartDate = new Date(entry.start_date);
				return entryStartDate >= today && entryStartDate <= thirtyDaysFromNow;
			});

			return upcomingPtoEntries.length;
		} catch (error) {
			console.warn("Failed to calculate upcoming PTO:", error);
			return 0;
		}
	}

	/**
	 * Get teams data for dashboard display
	 * This is a convenience method that wraps TeamService.getTeams
	 */
	static async getTeams(): Promise<Team[]> {
		return TeamService.getTeams();
	}
}
