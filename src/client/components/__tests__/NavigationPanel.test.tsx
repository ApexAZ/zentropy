import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import NavigationPanel from "../NavigationPanel";

/**
 * NavigationPanel Test Suite - User-Focused Testing
 *
 * These tests focus on user workflows and behaviors rather than implementation details.
 * Consolidated from 27 granular tests to 6 meaningful user scenarios.
 *
 * BEFORE: 755 lines, 27 tests testing every small interaction
 * AFTER: ~200 lines, 6 tests covering complete user workflows
 */

const mockOnPageChange = vi.fn();
const mockOnShowRegistration = vi.fn();
const mockOnShowSignIn = vi.fn();
const mockLogout = vi.fn();

const mockAuthenticatedUser = {
	isAuthenticated: true,
	user: {
		name: "Jane Smith",
		email: "jane.smith@example.com",
		has_projects_access: true,
		email_verified: true
	},
	token: "mock-token",
	login: vi.fn(),
	logout: mockLogout
};

const mockUnauthenticatedUser = {
	isAuthenticated: false,
	user: null,
	token: null,
	login: vi.fn(),
	logout: mockLogout
};

const mockUserWithoutProjects = {
	isAuthenticated: true,
	user: {
		name: "Basic User",
		email: "basic.user@example.com",
		has_projects_access: false,
		email_verified: true
	},
	token: "mock-token",
	login: vi.fn(),
	logout: mockLogout
};

describe("NavigationPanel - User Workflows", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
		mockOnShowRegistration.mockClear();
		mockOnShowSignIn.mockClear();
		mockLogout.mockClear();
	});

	it("authenticated user can navigate and sign out successfully", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowSignIn={mockOnShowSignIn}
				auth={mockAuthenticatedUser}
			/>
		);

		// User opens navigation
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// User sees their profile information
		expect(screen.getByText("Jane Smith")).toBeInTheDocument();
		expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();

		// User navigates to profile page
		const profileLink = screen.getByText("My Profile");
		await user.click(profileLink);
		expect(mockOnPageChange).toHaveBeenCalledWith("profile");

		// Navigation panel closes after navigation
		await waitFor(() => {
			expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
		});

		// User can sign out
		await user.click(profileButton);
		const signOutButton = screen.getByText("Sign Out");
		await user.click(signOutButton);
		expect(mockLogout).toHaveBeenCalledOnce();
		expect(mockOnPageChange).toHaveBeenCalledWith("home");
	});

	it("unauthenticated user can access sign-in and registration", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowSignIn={mockOnShowSignIn}
				auth={mockUnauthenticatedUser}
			/>
		);

		// User opens navigation
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// User sees authentication options (no sign out option)
		expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
		expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();

		// User can access sign-in
		const signInButton = screen.getByRole("button", { name: "Sign in" });
		await user.click(signInButton);
		expect(mockOnShowSignIn).toHaveBeenCalledOnce();

		// Panel closes after action
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
		});

		// User can access registration
		await user.click(profileButton);
		const registerButton = screen.getByRole("button", { name: "Register" });
		await user.click(registerButton);
		expect(mockOnShowRegistration).toHaveBeenCalledOnce();
	});

	it("displays real user data correctly across different name formats", async () => {
		const user = userEvent.setup();

		// Test various user name formats
		const testUsers = [
			{ name: "María José García-López", email: "maria@example.com" },
			{ name: "李 明", email: "li.ming@example.cn" },
			{ name: "Jean-Luc Picard", email: "jean.luc@starfleet.com" }
		];

		for (const testUser of testUsers) {
			const userAuth = {
				...mockAuthenticatedUser,
				user: { ...mockAuthenticatedUser.user, ...testUser }
			};

			const { unmount } = render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowSignIn={mockOnShowSignIn}
					auth={userAuth}
				/>
			);

			// User opens navigation and sees their correct data
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);
			expect(screen.getByText(testUser.name)).toBeInTheDocument();
			expect(screen.getByText(testUser.email)).toBeInTheDocument();

			// No hardcoded fallback values
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
			unmount();
		}
	});

	it("users with projects access can manage projects effectively", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowSignIn={mockOnShowSignIn}
				auth={mockAuthenticatedUser}
			/>
		);

		// User opens navigation and sees projects section
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);
		expect(screen.getByText("Projects")).toBeInTheDocument();

		// User expands projects to see options
		const projectsButton = screen.getByText("Projects");
		await user.click(projectsButton);
		expect(screen.getByText("Create Project")).toBeInTheDocument();
		expect(screen.getByText("Join Project")).toBeInTheDocument();

		// User can create project
		const createProjectButton = screen.getByText("Create Project");
		await user.click(createProjectButton);
		expect(mockOnPageChange).toHaveBeenCalledWith("teams");
	});

	it("users without projects access see limited navigation options", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowSignIn={mockOnShowSignIn}
				auth={mockUserWithoutProjects}
			/>
		);

		// User opens navigation but doesn't see projects section
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);
		expect(screen.getByText("Basic User")).toBeInTheDocument();
		expect(screen.queryByText("Projects")).not.toBeInTheDocument();
	});

	it("navigation is accessible via keyboard and click-outside", async () => {
		const user = userEvent.setup();
		render(
			<div>
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowSignIn={mockOnShowSignIn}
					auth={mockAuthenticatedUser}
				/>
				<div data-testid="outside">Outside element</div>
			</div>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });

		// User can open with keyboard
		profileButton.focus();
		await user.keyboard("{Enter}");
		expect(screen.getByText("Jane Smith")).toBeInTheDocument();

		// User can close with Escape
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
		});

		// User can close by clicking outside
		await user.click(profileButton);
		await user.click(screen.getByTestId("outside"));
		await waitFor(() => {
			expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
		});
	});
});
