import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useTeams } from "../useTeams";
import { TeamService } from "../../services/TeamService";
import type { Team, CreateTeamData } from "../../types";

// Mock the TeamService
vi.mock("../../services/TeamService");
const mockTeamService = vi.mocked(TeamService);

describe("useTeams", () => {
	// Mock data following actual types from the application
	const mockTeams: Team[] = [
		{
			id: "team-1",
			name: "Frontend Team",
			description: "React and TypeScript development team",
			created_at: "2025-01-01T00:00:00Z",
			updated_at: "2025-01-01T00:00:00Z"
		},
		{
			id: "team-2",
			name: "Backend Team",
			description: "Python FastAPI development team",
			created_at: "2025-01-02T00:00:00Z",
			updated_at: "2025-01-02T00:00:00Z"
		}
	];

	const mockCreateTeamData: CreateTeamData = {
		name: "New Team",
		description: "A newly created team"
	};

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
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
			expect(result.current.toast).toBeNull();
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
		it("should create team and refresh teams list with success toast", async () => {
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

			// Assert: Success toast is shown and teams list is refreshed
			expect(result.current.toast).toEqual({
				message: "Team created successfully!",
				type: "success"
			});
			expect(result.current.teams).toHaveLength(3);
			expect(mockTeamService.createTeam).toHaveBeenCalledWith(mockCreateTeamData);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2); // Initial + refresh
		});

		it("should show error toast when team creation fails", async () => {
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

			// Assert: Error toast is shown and teams list remains unchanged
			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
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

			// Assert: Fallback error message is used
			expect(result.current.toast).toEqual({
				message: "Failed to create team",
				type: "error"
			});
		});
	});

	describe("Team Update Workflow", () => {
		it("should update team and refresh teams list with success toast", async () => {
			// Arrange: Mock operations
			const teamId = "team-1";
			const updateData = { name: "Updated Team Name", description: "Updated description" };
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

			// Assert: Success toast and updated teams list
			expect(result.current.toast).toEqual({
				message: "Team updated successfully!",
				type: "success"
			});
			expect(result.current.teams).toEqual(updatedTeams);
			expect(mockTeamService.updateTeam).toHaveBeenCalledWith(teamId, updateData);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should show error toast when team update fails", async () => {
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

			// Assert: Error toast and unchanged teams list
			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
			expect(result.current.teams).toEqual(mockTeams);
		});
	});

	describe("Team Deletion Workflow", () => {
		it("should delete team and refresh teams list with success toast", async () => {
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

			// Assert: Success toast and updated teams list
			expect(result.current.toast).toEqual({
				message: "Team deleted successfully!",
				type: "success"
			});
			expect(result.current.teams).toEqual(remainingTeams);
			expect(mockTeamService.deleteTeam).toHaveBeenCalledWith(teamIdToDelete);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should show error toast when team deletion fails", async () => {
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

			// Assert: Error toast and unchanged teams list
			expect(result.current.toast).toEqual({
				message: errorMessage,
				type: "error"
			});
			expect(result.current.teams).toEqual(mockTeams);
		});
	});

	describe("Manual Refresh Functionality", () => {
		it("should refresh teams data when refreshTeams is called", async () => {
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

			// Act: Manual refresh
			await act(async () => {
				await result.current.refreshTeams();
			});

			// Assert: Teams are refreshed
			expect(result.current.teams).toEqual(refreshedTeams);
			expect(mockTeamService.getTeams).toHaveBeenCalledTimes(2);
		});

		it("should handle refresh errors without affecting current teams data", async () => {
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

			// Act: Manual refresh that fails
			await act(async () => {
				await result.current.refreshTeams();
			});

			// Assert: Error is set but teams data is preserved
			expect(result.current.error).toBe("Network error");
			expect(result.current.teams).toEqual(mockTeams); // Data preserved
		});
	});

	describe("Toast Management", () => {
		it("should allow manual toast management with setToast", async () => {
			// Arrange: Mock initial load
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);

			// Act: Render hook
			const { result } = renderHook(() => useTeams());

			// Wait for initial load to complete
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Act: Set custom toast
			act(() => {
				result.current.setToast({
					message: "Custom toast message",
					type: "success"
				});
			});

			// Assert: Toast is set
			expect(result.current.toast).toEqual({
				message: "Custom toast message",
				type: "success"
			});

			// Act: Clear toast
			act(() => {
				result.current.setToast(null);
			});

			// Assert: Toast is cleared
			expect(result.current.toast).toBeNull();
		});

		it("should start with null toast state", async () => {
			// Arrange: Mock initial load
			mockTeamService.getTeams.mockResolvedValueOnce(mockTeams);

			// Act: Render hook
			const { result } = renderHook(() => useTeams());

			// Assert: Initial toast state is null before async operations
			expect(result.current.toast).toBeNull();

			// Wait for initial load to complete
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			// Assert: Toast remains null after loading
			expect(result.current.toast).toBeNull();
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
				deleteTeam: result.current.deleteTeam,
				setToast: result.current.setToast
			};

			// Act: Force re-render
			rerender();

			// Assert: Function references remain stable
			expect(result.current.refreshTeams).toBe(initialFunctions.refreshTeams);
			expect(result.current.createTeam).toBe(initialFunctions.createTeam);
			expect(result.current.updateTeam).toBe(initialFunctions.updateTeam);
			expect(result.current.deleteTeam).toBe(initialFunctions.deleteTeam);
			expect(result.current.setToast).toBe(initialFunctions.setToast);
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
			expect(result.current).toHaveProperty("toast");
			expect(result.current).toHaveProperty("setToast");
			expect(result.current).toHaveProperty("refreshTeams");
			expect(result.current).toHaveProperty("createTeam");
			expect(result.current).toHaveProperty("updateTeam");
			expect(result.current).toHaveProperty("deleteTeam");

			// Assert: Function types are correct
			expect(typeof result.current.refreshTeams).toBe("function");
			expect(typeof result.current.createTeam).toBe("function");
			expect(typeof result.current.updateTeam).toBe("function");
			expect(typeof result.current.deleteTeam).toBe("function");
			expect(typeof result.current.setToast).toBe("function");

			// Wait for initial load to complete to avoid act warnings
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});
		});
	});
});
