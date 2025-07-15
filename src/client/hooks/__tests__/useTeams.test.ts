import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useTeams } from "../useTeams";
import { TeamService } from "../../services/TeamService";
import type { Team, CreateTeamData } from "../../types";

// Mock the TeamService
vi.mock("../../services/TeamService");
const mockTeamService = vi.mocked(TeamService);

// Mock the toast context
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock("../../contexts/ToastContext", () => ({
	useToast: () => ({
		showSuccess: mockShowSuccess,
		showError: mockShowError
	})
}));

describe("useTeams", () => {
	// Mock data following actual types from the application
	const mockTeams: Team[] = [
		{
			id: "team-1",
			name: "Frontend Team",
			description: "React and TypeScript development team",
			velocity_baseline: 25,
			sprint_length_days: 14,
			working_days_per_week: 5,
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z"
		},
		{
			id: "team-2",
			name: "Backend Team",
			description: "Python FastAPI development team",
			velocity_baseline: 30,
			sprint_length_days: 14,
			working_days_per_week: 5,
			created_at: "2025-01-02T00:00:00Z",
			updated_at: "2025-01-02T00:00:00Z"
		}
	];

	const mockCreateTeamData: CreateTeamData = {
		name: "New Team",
		description: "A newly created team",
		velocity_baseline: 20,
		sprint_length_days: 14,
		working_days_per_week: 5
	};

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		mockShowSuccess.mockClear();
		mockShowError.mockClear();
	});

	describe("Initial State and Data Loading", () => {
		it("should start with loading state and fetch teams on mount", async () => {
			// Arrange: Mock successful API response
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);

			// Act: Render the hook
			const { result } = renderHook(() => useTeams());

			// Assert: Initially loading
			expect(result.current.isLoading).toBe(true);
			expect(result.current.teams).toEqual([]);
			expect(result.current.error).toBe("");

			// Wait for async operation to complete
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Assert: Teams loaded successfully
			expect(result.current.teams).toEqual(mockTeams);
			expect(result.current.error).toBe("");
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(1);
		});

		it("should handle teams loading errors gracefully", async () => {
			// Arrange: Mock API error
			const errorMessage = "Failed to fetch teams";
			mockTeamService.getTeams.mockRejectedValueOnce(new Error(errorMessage));

			// Act: Render the hook
			const { result } = renderHook(() => useTeams());

			// Wait for async operation to complete
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Assert: Error state is set correctly
			expect(result.current.teams).toEqual([]);
			expect(result.current.error).toBe(errorMessage);
		});

		it("should handle empty teams list without errors", async () => {
			// Arrange: Mock empty response
			mockTeamService.getTeams.mockResolvedValueOnce([]);

			// Act: Render the hook
			const { result } = renderHook(() => useTeams());

			// Wait for async operation to complete
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Assert: Empty state handled correctly
			expect(result.current.teams).toEqual([]);
			expect(result.current.error).toBe("");
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Team Creation Workflow", () => {
		it("should create team and provide success feedback to user", async () => {
			// Arrange: Mock initial load and create team operations
			mockTeamService.getTeams
				.mockResolvedValueOnce(mockTeams) // Initial load
				.mockResolvedValueOnce([
					...mockTeams,
					{
						...mockCreateTeamData,
						id: "team-3",
						created_at: "2025-01-03T00:00:00Z",
						updated_at: "2025-01-03T00:00:00Z"
					}
				]); // After creation
			mockTeamService.createTeam.mockResolvedValueOnce(undefined);

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Create team
			await act(async () => {
				await result.current.createTeam(mockCreateTeamData);
			});

			// Assert: User receives success feedback and sees updated teams list
			expect(mockShowSuccess).toHaveBeenCalledWith("Team created successfully!");
			expect(result.current.teams).toHaveLength(3);
			expect(mockTeamService.createTeam).toHaveBeenCalledWith(mockCreateTeamData);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2); // Initial + refresh
		});

		it("should provide error feedback when team creation fails", async () => {
			// Arrange: Mock initial load success and create failure
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);
			const errorMessage = "Team name already exists";
			mockTeamService.createTeam.mockRejectedValueOnce(new Error(errorMessage));

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Attempt to create team
			await act(async () => {
				await result.current.createTeam(mockCreateTeamData);
			});

			// Assert: User receives error feedback and teams list remains unchanged
			expect(mockShowError).toHaveBeenCalledWith(errorMessage);
			expect(result.current.teams).toEqual(mockTeams); // No change
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(1); // Only initial load
		});

		it("should handle non-Error exceptions during team creation", async () => {
			// Arrange: Mock initial load and string error
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);
			mockTeamService.createTeam.mockRejectedValueOnce("String error");

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Attempt to create team
			await act(async () => {
				await result.current.createTeam(mockCreateTeamData);
			});

			// Assert: User receives fallback error message
			expect(mockShowError).toHaveBeenCalledWith("Failed to create team");
		});
	});

	describe("Team Update Workflow", () => {
		it("should update team and provide success feedback to user", async () => {
			// Arrange: Mock operations
			const teamId = "team-1";
			const updateData: CreateTeamData = {
				name: "Updated Team Name",
				description: "Updated description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5
			};
			const updatedTeams = mockTeams.map(team => (team.id === teamId ? { ...team, ...updateData } : team));

			mockTeamService.getTeams
				.mockResolvedValueOnce(mockTeams) // Initial load
				.mockResolvedValueOnce(updatedTeams); // After update
			mockTeamService.updateTeam.mockResolvedValueOnce(undefined);

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Update team
			await act(async () => {
				await result.current.updateTeam(teamId, updateData);
			});

			// Assert: User receives success feedback and sees updated teams list
			expect(mockShowSuccess).toHaveBeenCalledWith("Team updated successfully!");
			expect(result.current.teams).toEqual(updatedTeams);
			expect(mockTeamService.updateTeam).toHaveBeenCalledWith(teamId, updateData);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should provide error feedback when team update fails", async () => {
			// Arrange: Mock initial success and update failure
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);
			const errorMessage = "Insufficient permissions to update team";
			mockTeamService.updateTeam.mockRejectedValueOnce(new Error(errorMessage));

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Attempt team update
			await act(async () => {
				await result.current.updateTeam("team-1", mockCreateTeamData);
			});

			// Assert: User receives error feedback and teams list remains unchanged
			expect(mockShowError).toHaveBeenCalledWith(errorMessage);
			expect(result.current.teams).toEqual(mockTeams);
		});
	});

	describe("Team Deletion Workflow", () => {
		it("should delete team and provide success feedback to user", async () => {
			// Arrange: Mock operations
			const teamIdToDelete = "team-1";
			const remainingTeams = mockTeams.filter(team => team.id !== teamIdToDelete);

			mockTeamService.getTeams
				.mockResolvedValueOnce(mockTeams) // Initial load
				.mockResolvedValueOnce(remainingTeams); // After deletion
			mockTeamService.deleteTeam.mockResolvedValueOnce(undefined);

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Delete team
			await act(async () => {
				await result.current.deleteTeam(teamIdToDelete);
			});

			// Assert: User receives success feedback and sees updated teams list
			expect(mockShowSuccess).toHaveBeenCalledWith("Team deleted successfully!");
			expect(result.current.teams).toEqual(remainingTeams);
			expect(mockTeamService.deleteTeam).toHaveBeenCalledWith(teamIdToDelete);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should provide error feedback when team deletion fails", async () => {
			// Arrange: Mock initial success and deletion failure
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);
			const errorMessage = "Cannot delete team with active members";
			mockTeamService.deleteTeam.mockRejectedValueOnce(new Error(errorMessage));

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Attempt team deletion
			await act(async () => {
				await result.current.deleteTeam("team-1");
			});

			// Assert: User receives error feedback and teams list remains unchanged
			expect(mockShowError).toHaveBeenCalledWith(errorMessage);
			expect(result.current.teams).toEqual(mockTeams);
		});
	});

	describe("Manual Refresh Functionality", () => {
		it("should refresh teams data when user requests refresh", async () => {
			// Arrange: Mock multiple getTeams calls with different data
			const initialTeams = [mockTeams[0]];
			const refreshedTeams = mockTeams;

			mockTeamService.getTeams
				.mockResolvedValueOnce(initialTeams) // Initial load
				.mockResolvedValueOnce(refreshedTeams); // Manual refresh

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Verify initial state
			expect(result.current.teams).toEqual(initialTeams);

			// Act: User manually refreshes
			await act(async () => {
				await result.current.refreshTeams();
			});

			// Assert: User sees refreshed teams data
			expect(result.current.teams).toEqual(refreshedTeams);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should handle refresh errors without losing current teams data", async () => {
			// Arrange: Mock initial success and refresh failure
			mockTeamService.getTeams
				.mockResolvedValueOnce(mockTeams) // Initial load success
				.mockRejectedValueOnce(new Error("Network error")); // Refresh failure

			// Act: Render hook and wait for initial load
			const { result } = renderHook(() => useTeams());
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Verify initial state
			expect(result.current.teams).toEqual(mockTeams);
			expect(result.current.error).toBe("");

			// Act: User attempts manual refresh that fails
			await act(async () => {
				await result.current.refreshTeams();
			});

			// Assert: User sees error but retains their teams data
			expect(result.current.error).toBe("Network error");
			expect(result.current.teams).toEqual(mockTeams); // Data preserved
		});
	});

	describe("Hook Interface Consistency", () => {
		it("should provide stable function references between renders", async () => {
			// Arrange: Mock initial load
			mockTeamService.getTeams.mockResolvedValue(mockTeams);

			// Act: Render hook
			const { result, rerender } = renderHook(() => useTeams());

			// Wait for initial load
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Store initial function references
			const initialFunctions = {
				refreshTeams: result.current.refreshTeams,
				createTeam: result.current.createTeam,
				updateTeam: result.current.updateTeam,
				deleteTeam: result.current.deleteTeam
			};

			// Act: Force re-render
			rerender();

			// Assert: Function references remain stable
			expect(result.current.refreshTeams).toBe(initialFunctions.refreshTeams);
			expect(result.current.createTeam).toBe(initialFunctions.createTeam);
			expect(result.current.updateTeam).toBe(initialFunctions.updateTeam);
			expect(result.current.deleteTeam).toBe(initialFunctions.deleteTeam);
		});

		it("should provide complete interface as documented in types", async () => {
			// Arrange: Mock initial load
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);

			// Act: Render hook
			const { result } = renderHook(() => useTeams());

			// Assert: All required properties are present immediately
			expect(result.current).toHaveProperty("teams");
			expect(result.current).toHaveProperty("isLoading");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("refreshTeams");
			expect(result.current).toHaveProperty("createTeam");
			expect(result.current).toHaveProperty("updateTeam");
			expect(result.current).toHaveProperty("deleteTeam");

			// Assert: Function types are correct
			expect(typeof result.current.refreshTeams).toBe("function");
			expect(typeof result.current.createTeam).toBe("function");
			expect(typeof result.current.updateTeam).toBe("function");
			expect(typeof result.current.deleteTeam).toBe("function");

			// Wait for initial load to complete to avoid act warnings
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});
		});
	});
});
