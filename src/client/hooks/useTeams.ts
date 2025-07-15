import { useState, useEffect, useCallback } from "react";
import { TeamService } from "../services/TeamService";
import { useToast } from "../contexts/ToastContext";
import type { Team, CreateTeamData } from "../types";

export interface UseTeamsResult {
	// Data state
	teams: Team[];
	isLoading: boolean;
	error: string;

	// Actions
	refreshTeams: () => Promise<void>;
	createTeam: (teamData: CreateTeamData) => Promise<void>;
	updateTeam: (teamId: string, teamData: CreateTeamData) => Promise<void>;
	deleteTeam: (teamId: string) => Promise<void>;
}

export const useTeams = (): UseTeamsResult => {
	// State management
	const [teams, setTeams] = useState<Team[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string>("");

	// Centralized toast notifications
	const { showSuccess, showError } = useToast();

	// Load teams function
	const loadTeams = useCallback(async (): Promise<void> => {
		try {
			setIsLoading(true);
			setError("");

			const data = await TeamService.getTeams();
			setTeams(data);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load teams";
			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Refresh teams (public API)
	const refreshTeams = useCallback(async (): Promise<void> => {
		await loadTeams();
	}, [loadTeams]);

	// Create team
	const createTeam = useCallback(
		async (teamData: CreateTeamData): Promise<void> => {
			try {
				await TeamService.createTeam(teamData);
				showSuccess("Team created successfully!");
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to create team";
				showError(errorMessage);
			}
		},
		[loadTeams, showSuccess, showError]
	);

	// Update team
	const updateTeam = useCallback(
		async (teamId: string, teamData: CreateTeamData): Promise<void> => {
			try {
				await TeamService.updateTeam(teamId, teamData);
				showSuccess("Team updated successfully!");
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to update team";
				showError(errorMessage);
			}
		},
		[loadTeams, showSuccess, showError]
	);

	// Delete team
	const deleteTeam = useCallback(
		async (teamId: string): Promise<void> => {
			try {
				await TeamService.deleteTeam(teamId);
				showSuccess("Team deleted successfully!");
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to delete team";
				showError(errorMessage);
			}
		},
		[loadTeams, showSuccess, showError]
	);

	// Load teams on mount
	useEffect(() => {
		void loadTeams();
	}, [loadTeams]);

	return {
		// Data state
		teams,
		isLoading,
		error,

		// Actions
		refreshTeams,
		createTeam,
		updateTeam,
		deleteTeam
	};
};
