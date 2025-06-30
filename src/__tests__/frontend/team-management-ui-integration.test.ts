/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderUserSearchResults, showTeamManagementUI } from "../../utils/team-core";
import type { User } from "../../models/User";

// Mock the utility imports since we're testing integration, not utilities
vi.mock("../../utils/ui-core", () => ({
	formatUserForDisplay: vi.fn((user: User) => ({
		id: user.id,
		displayName: `${user.first_name} ${user.last_name}`,
		email: user.email,
		role: user.role,
		roleDisplayName: user.role === "team_lead" ? "Team Lead" : "Team Member"
	})),
	validateTeamManagementPermissions: vi.fn((user: User) => user.role === "team_lead"),
	createErrorMessage: vi.fn(() => "Test error message"),
	isRetryableError: vi.fn(() => true)
}));

vi.mock("../../utils/api-client-core", () => ({
	makeUserSearchRequest: vi.fn()
}));

describe("Team Management UI Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = "";
	});

	describe("renderUserSearchResults integration", () => {
		it("should render user search results with formatted data", () => {
			// ARRANGE
			const container = document.createElement("div");
			document.body.appendChild(container);

			const users: User[] = [
				{
					id: "user-1",
					email: "john@example.com",
					first_name: "John",
					last_name: "Doe",
					role: "team_member",
					is_active: true,
					password_hash: "hash",
					last_login_at: null,
					created_at: new Date("2024-01-01"),
					updated_at: new Date("2024-01-01")
				}
			];

			// ACT
			renderUserSearchResults(users, container);

			// ASSERT
			const userItem = container.querySelector(".user-search-item") as HTMLElement;
			expect(userItem).toBeTruthy();
			expect(userItem.dataset.userId).toBe("user-1");

			const addButton = container.querySelector("[data-action='add-user-to-team']") as HTMLElement;
			expect(addButton).toBeTruthy();
			expect(addButton.textContent).toContain("Add to Team");
		});

		it("should render empty state when no users found", () => {
			// ARRANGE
			const container = document.createElement("div");
			document.body.appendChild(container);

			// ACT
			renderUserSearchResults([], container);

			// ASSERT
			const emptyState = container.querySelector(".user-search-empty");
			expect(emptyState).toBeTruthy();
			expect(emptyState?.textContent).toBe("No users found");
		});
	});

	describe("showTeamManagementUI integration", () => {
		it("should show UI for team leads", () => {
			// ARRANGE
			const container = document.createElement("div");
			container.id = "team-management-container";
			container.style.display = "none";
			document.body.appendChild(container);

			const teamLead: User = {
				id: "user-1",
				email: "lead@example.com",
				first_name: "Team",
				last_name: "Lead",
				role: "team_lead",
				is_active: true,
				password_hash: "hash",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			// ACT
			showTeamManagementUI(teamLead, "team-123");

			// ASSERT
			expect(container.style.display).toBe("block");
			expect(container.querySelector("#user-search-input")).toBeTruthy();
			expect(container.querySelector("#search-results")).toBeTruthy();
			expect(container.dataset.teamId).toBe("team-123");
		});

		it("should hide UI for non-team leads", () => {
			// ARRANGE
			const container = document.createElement("div");
			container.id = "team-management-container";
			container.style.display = "block";
			document.body.appendChild(container);

			const basicUser: User = {
				id: "user-1",
				email: "basic@example.com",
				first_name: "Basic",
				last_name: "User",
				role: "basic_user",
				is_active: true,
				password_hash: "hash",
				last_login_at: null,
				created_at: new Date("2024-01-01"),
				updated_at: new Date("2024-01-01")
			};

			// ACT
			showTeamManagementUI(basicUser, "team-123");

			// ASSERT
			expect(container.style.display).toBe("none");
		});
	});
});
