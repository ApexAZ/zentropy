import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import DashboardPage from "../DashboardPage";
import { DashboardService } from "../../services";

// Mock the services
vi.mock("../../services", () => ({
	DashboardService: {
		getDashboardStats: vi.fn(),
		getTeams: vi.fn()
	}
}));

describe("DashboardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it("should display loading state while fetching dashboard data", async () => {
		// Mock services to return pending promises
		vi.mocked(DashboardService.getDashboardStats).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);
		vi.mocked(DashboardService.getTeams).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		render(<DashboardPage />);

		// Verify loading state is displayed
		expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
		expect(screen.getByText("Dashboard")).toBeInTheDocument();
		expect(screen.getByText("Overview of your teams and capacity planning")).toBeInTheDocument();

		// Verify loading spinner is present
		const spinner = screen.getByText("Loading dashboard...").previousElementSibling;
		expect(spinner).toHaveClass("animate-spin");
	});

	it("should display error state with retry functionality when data loading fails", async () => {
		const user = userEvent.setup();
		const errorMessage = "Failed to load dashboard data";

		// Mock services to reject
		vi.mocked(DashboardService.getDashboardStats).mockRejectedValue(new Error(errorMessage));
		vi.mocked(DashboardService.getTeams).mockRejectedValue(new Error(errorMessage));

		render(<DashboardPage />);

		// Wait for error state to appear
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Unable to Load Dashboard")).toBeInTheDocument();

		// Verify error message and retry button
		expect(screen.getByText(errorMessage)).toBeInTheDocument();
		const retryButton = screen.getByRole("button", { name: /retry/i });
		expect(retryButton).toBeInTheDocument();

		// Test retry functionality
		await user.click(retryButton);

		// Verify services are called again
		await act(async () => {
			await Promise.resolve();
		});
		expect(DashboardService.getDashboardStats).toHaveBeenCalledTimes(2);
		expect(DashboardService.getTeams).toHaveBeenCalledTimes(2);
	});

	it("should display dashboard stats cards with correct data", async () => {
		const mockStats = {
			total_teams: 5,
			total_members: 23,
			active_sprints: 3,
			upcoming_pto: 7
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Engineering Team",
				description: "Software development team",
				velocity_baseline: 40,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("5")).toBeInTheDocument();

		// Verify all stats cards display correct data
		expect(screen.getByText("Total Teams")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();

		expect(screen.getByText("Team Members")).toBeInTheDocument();
		expect(screen.getByText("23")).toBeInTheDocument();

		expect(screen.getByText("Active Sprints")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();

		expect(screen.getByText("Upcoming PTO")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
	});

	it("should display teams overview table with team data", async () => {
		const mockStats = {
			total_teams: 2,
			total_members: 10,
			active_sprints: 1,
			upcoming_pto: 2
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Engineering Team",
				description: "Software development team",
				velocity_baseline: 40,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			},
			{
				id: "team-2",
				name: "Design Team",
				description: "UI/UX design team",
				velocity_baseline: 25,
				sprint_length_days: 10,
				working_days_per_week: 4,
				created_at: "2025-01-02T11:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Teams Overview")).toBeInTheDocument();

		// Verify teams table headers
		expect(screen.getByText("Team Name")).toBeInTheDocument();
		expect(screen.getByText("Velocity")).toBeInTheDocument();
		expect(screen.getByText("Sprint Length")).toBeInTheDocument();
		expect(screen.getByText("Working Days")).toBeInTheDocument();
		expect(screen.getByText("Created")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();

		// Verify team data is displayed
		expect(screen.getByText("Engineering Team")).toBeInTheDocument();
		expect(screen.getByText("Software development team")).toBeInTheDocument();
		expect(screen.getByText("40")).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
		expect(screen.getByText("5 days/week")).toBeInTheDocument();

		expect(screen.getByText("Design Team")).toBeInTheDocument();
		expect(screen.getByText("UI/UX design team")).toBeInTheDocument();
		expect(screen.getByText("25")).toBeInTheDocument();
		expect(screen.getByText("10 days")).toBeInTheDocument();
		expect(screen.getByText("4 days/week")).toBeInTheDocument();

		// Verify action buttons are present
		expect(screen.getAllByText("View Details")).toHaveLength(2);
		expect(screen.getAllByText("Configure")).toHaveLength(2);
	});

	it("should display empty state when no teams exist", async () => {
		const mockStats = {
			total_teams: 0,
			total_members: 0,
			active_sprints: 0,
			upcoming_pto: 0
		};

		const mockTeams: any[] = [];

		// Mock successful service calls with empty data
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Teams Overview")).toBeInTheDocument();

		// Verify empty state message and create team button
		expect(screen.getByText("No teams found. Create your first team to get started.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /create team/i })).toBeInTheDocument();
	});

	it("should display quick actions section with all action buttons", async () => {
		const mockStats = {
			total_teams: 1,
			total_members: 5,
			active_sprints: 1,
			upcoming_pto: 1
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Test Team",
				description: "Test description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Quick Actions")).toBeInTheDocument();

		// Verify all quick action buttons are present
		expect(screen.getByText("+ Create New Team")).toBeInTheDocument();
		expect(screen.getByText("📅 Add Calendar Entry")).toBeInTheDocument();
		expect(screen.getByText("⚡ Start Sprint Planning")).toBeInTheDocument();
	});

	it("should display recent activity and system status sections", async () => {
		const mockStats = {
			total_teams: 1,
			total_members: 5,
			active_sprints: 1,
			upcoming_pto: 1
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Test Team",
				description: "Test description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Recent Activity")).toBeInTheDocument();

		// Verify recent activity section
		expect(screen.getByText("No recent activity to display.")).toBeInTheDocument();

		// Verify system status section
		expect(screen.getByText("System Status")).toBeInTheDocument();
		expect(screen.getByText("Database")).toBeInTheDocument();
		expect(screen.getByText("Connected")).toBeInTheDocument();
		expect(screen.getByText("API")).toBeInTheDocument();
		expect(screen.getByText("Operational")).toBeInTheDocument();
	});

	it("should handle team with no velocity baseline set", async () => {
		const mockStats = {
			total_teams: 1,
			total_members: 5,
			active_sprints: 1,
			upcoming_pto: 1
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "New Team",
				description: "Newly created team",
				velocity_baseline: 0, // No velocity set
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("New Team")).toBeInTheDocument();

		// Verify "Not set" is displayed for velocity
		expect(screen.getByText("Not set")).toBeInTheDocument();
	});

	it("should handle team without description", async () => {
		const mockStats = {
			total_teams: 1,
			total_members: 5,
			active_sprints: 1,
			upcoming_pto: 1
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Minimal Team",
				description: "", // No description
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Minimal Team")).toBeInTheDocument();

		// Verify team name is displayed without description
		expect(screen.getByText("Minimal Team")).toBeInTheDocument();
		expect(screen.getByText("30")).toBeInTheDocument();
	});

	it("should call services concurrently on component mount", async () => {
		const mockStats = {
			total_teams: 1,
			total_members: 5,
			active_sprints: 1,
			upcoming_pto: 1
		};

		const mockTeams = [
			{
				id: "team-1",
				name: "Test Team",
				description: "Test description",
				velocity_baseline: 30,
				sprint_length_days: 14,
				working_days_per_week: 5,
				created_at: "2025-01-01T10:00:00Z"
			}
		];

		// Mock successful service calls
		vi.mocked(DashboardService.getDashboardStats).mockResolvedValue(mockStats);
		vi.mocked(DashboardService.getTeams).mockResolvedValue(mockTeams);

		render(<DashboardPage />);

		// Wait for data to load
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("Test Team")).toBeInTheDocument();

		// Verify both services were called exactly once
		expect(DashboardService.getDashboardStats).toHaveBeenCalledTimes(1);
		expect(DashboardService.getTeams).toHaveBeenCalledTimes(1);
	});
});
