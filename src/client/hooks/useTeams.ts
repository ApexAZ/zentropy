import { useState, useEffect, useCallback } from "react";
import { TeamService } from "../services/TeamService";
import type { Team, CreateTeamData } from '../types';

export interface UseTeamsToast {
	message: string;
	type: "success" | "error";
}

export interface UseTeamsResult {
	// Data state
	teams: Team[];
	isLoading: boolean;
	error: string;

	// Toast state
	toast: UseTeamsToast | null;
	setToast: (toast: UseTeamsToast | null) => void;

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
	const [toast, setToast] = useState<UseTeamsToast | null>(null);

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
				setToast({
					message: "Team created successfully!",
					type: "success"
				});
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to create team";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadTeams]
	);

	// Update team
	const updateTeam = useCallback(
		async (teamId: string, teamData: CreateTeamData): Promise<void> => {
			try {
				await TeamService.updateTeam(teamId, teamData);
				setToast({
					message: "Team updated successfully!",
					type: "success"
				});
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to update team";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadTeams]
	);

	// Delete team
	const deleteTeam = useCallback(
		async (teamId: string): Promise<void> => {
			try {
				await TeamService.deleteTeam(teamId);
				setToast({
					message: "Team deleted successfully!",
					type: "success"
				});
				await loadTeams();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to delete team";
				setToast({
					message: errorMessage,
					type: "error"
				});
			}
		},
		[loadTeams]
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

		// Toast state
		toast,
		setToast,

		// Actions
		refreshTeams,
		createTeam,
		updateTeam,
		deleteTeam
	};
};
