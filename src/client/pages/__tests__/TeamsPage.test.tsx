import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TeamsPage from "../TeamsPage";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";

// Mock useTeams hook for integration testing
vi.mock("../../hooks/useTeams", () => ({
	useTeams: vi.fn()
}));

import { useTeams } from "../../hooks/useTeams";
const mockUseTeams = useTeams as any;

describe("TeamsPage", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	const mockTeams = [
		{
			id: "1",
			name: "Frontend Team",
			description: "React development team",
			velocity_baseline: 40,
			sprint_length_days: 14,
			working_days_per_week: 5
		}
	];

	it("renders teams page with main elements", async () => {
		mockUseTeams.mockReturnValue({
			teams: [],
			isLoading: false,
			error: "",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });
		expect(screen.getByText("Team Management")).toBeInTheDocument();
	});

	it("displays loading state initially", () => {
		mockUseTeams.mockReturnValue({
			teams: [],
			isLoading: true,
			error: "",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });
		expect(screen.getByText("Loading teams...")).toBeInTheDocument();
	});

	it("loads and displays teams", async () => {
		mockUseTeams.mockReturnValue({
			teams: mockTeams,
			isLoading: false,
			error: "",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });

		expect(screen.getByText("Frontend Team")).toBeInTheDocument();
	});

	it("displays empty state when no teams", async () => {
		mockUseTeams.mockReturnValue({
			teams: [],
			isLoading: false,
			error: "",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });

		expect(screen.getByText("No Teams Yet")).toBeInTheDocument();
	});

	it("handles API errors gracefully", async () => {
		mockUseTeams.mockReturnValue({
			teams: [],
			isLoading: false,
			error: "Network error",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });

		expect(screen.getByText("Unable to Load Teams")).toBeInTheDocument();
	});

	it("opens create modal when Create New Team button is clicked", async () => {
		mockUseTeams.mockReturnValue({
			teams: [],
			isLoading: false,
			error: "",
			refreshTeams: vi.fn(),
			createTeam: vi.fn(),
			updateTeam: vi.fn(),
			deleteTeam: vi.fn()
		});
		renderWithFullEnvironment(<TeamsPage />, { providers: { toast: true } });
		fireEvent.click(screen.getByText("Create New Team"));
		expect(screen.getByText("Basic Information")).toBeInTheDocument();
	});
});
