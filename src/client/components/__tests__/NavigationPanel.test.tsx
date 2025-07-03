import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import NavigationPanel from "../NavigationPanel";

const mockOnPageChange = vi.fn();
const mockOnShowRegistration = vi.fn();
const mockOnShowLogin = vi.fn();
const mockLogout = vi.fn();

const mockAuthenticatedUser = {
	isAuthenticated: true,
	user: {
		name: "Integration Test", // Real API formatted name (first_name + last_name)
		email: "integration.test@example.com",
		has_projects_access: true
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

describe("NavigationPanel", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
		mockOnShowRegistration.mockClear();
		mockOnShowLogin.mockClear();
		mockLogout.mockClear();
	});

	it("renders profile icon", () => {
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toBeInTheDocument();
	});

	it("opens navigation panel when profile icon is clicked", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		expect(screen.getByText("Integration Test")).toBeInTheDocument();
		expect(screen.getByText("integration.test@example.com")).toBeInTheDocument();
	});

	it("closes navigation panel when clicking outside", async () => {
		const user = userEvent.setup();
		render(
			<div>
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockAuthenticatedUser}
				/>
				<div data-testid="outside">Outside element</div>
			</div>
		);

		// Open navigation panel
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);
		expect(screen.getByText("Integration Test")).toBeInTheDocument();

		// Click outside
		const outsideElement = screen.getByTestId("outside");
		await user.click(outsideElement);

		await waitFor(() => {
			expect(screen.queryByText("Integration Test")).not.toBeInTheDocument();
		});
	});

	it("navigates to profile page when profile link is clicked", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open navigation panel
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// Click profile link
		const profileLink = screen.getByText("My Profile");
		await user.click(profileLink);

		expect(mockOnPageChange).toHaveBeenCalledWith("profile");
	});

	it("closes navigation panel after navigation", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open navigation panel
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// Click profile link
		const profileLink = screen.getByText("My Profile");
		await user.click(profileLink);

		await waitFor(() => {
			expect(screen.queryByText("Integration Test")).not.toBeInTheDocument();
		});
	});

	it("supports keyboard navigation", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });

		// Open with Enter key
		profileButton.focus();
		await user.keyboard("{Enter}");
		expect(screen.getByText("Integration Test")).toBeInTheDocument();

		// Close with Escape key
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByText("Integration Test")).not.toBeInTheDocument();
		});
	});

	it("has proper accessibility attributes", () => {
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toHaveAttribute("aria-haspopup", "true");
		expect(profileButton).toHaveAttribute("aria-expanded", "false");
	});

	it("updates aria-expanded when navigation panel opens", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		expect(profileButton).toHaveAttribute("aria-expanded", "true");
	});

	it("calls logout and navigates to home when sign out is clicked", async () => {
		const user = userEvent.setup();
		render(
			<NavigationPanel
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open navigation panel
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// Click sign out
		const signOutButton = screen.getByText("Sign Out");
		await user.click(signOutButton);

		// Verify logout was called and page changed to home
		expect(mockLogout).toHaveBeenCalledOnce();
		expect(mockOnPageChange).toHaveBeenCalledWith("home");
	});

	describe("Authentication State Conditional Rendering", () => {
		it("should hide Login and Register buttons for authenticated users", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockAuthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Login and Register buttons should not be visible for authenticated users
			expect(screen.queryByText("Login")).not.toBeInTheDocument();
			expect(screen.queryByText("Register")).not.toBeInTheDocument();

			// Sign Out button should be visible
			expect(screen.getByText("Sign Out")).toBeInTheDocument();
		});

		it("should show Login and Register buttons for unauthenticated users", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Login and Register buttons should be visible in slideout
			expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();

			// Sign Out button should not be visible
			expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
		});

		it("should call onShowLogin when Login button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Click Login button in slideout
			const loginButton = screen.getByRole("button", { name: "Login" });
			await user.click(loginButton);

			// Verify onShowLogin was called
			expect(mockOnShowLogin).toHaveBeenCalledOnce();
		});

		it("should close navigation panel when Login button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Verify panel is open
			expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();

			// Click Login button
			const loginButton = screen.getByRole("button", { name: "Login" });
			await user.click(loginButton);

			// Verify navigation panel is closed
			await waitFor(() => {
				expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
			});
		});

		it("should call onShowRegistration when Register button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Click Register button in slideout
			const registerButton = screen.getByRole("button", { name: "Register" });
			await user.click(registerButton);

			// Verify onShowRegistration was called
			expect(mockOnShowRegistration).toHaveBeenCalledOnce();
		});

		it("should close navigation panel when Register button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Verify panel is open
			expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();

			// Click Register button
			const registerButton = screen.getByRole("button", { name: "Register" });
			await user.click(registerButton);

			// Verify navigation panel is closed
			await waitFor(() => {
				expect(screen.queryByRole("button", { name: "Register" })).not.toBeInTheDocument();
			});
		});

		it("should show Login and Register buttons next to person icon for unauthenticated users", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Person icon should be clickable for unauthenticated users
			const personIcon = screen.getByRole("button", { name: /profile menu/i });
			expect(personIcon).not.toBeDisabled();
			expect(personIcon).toHaveAttribute("aria-expanded", "false");
			expect(personIcon).toHaveAttribute("aria-haspopup", "true");

			// Open slideout
			await user.click(personIcon);

			// Should show Login and Register buttons in slideout next to person icon
			expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();

			// No "Guest User" text should be shown
			expect(screen.queryByText("Guest User")).not.toBeInTheDocument();
			expect(screen.queryByText("Not signed in")).not.toBeInTheDocument();
		});
	});

	describe("Real User Data Integration", () => {
		it("should display real user data from API response (not hardcoded 'John Doe')", async () => {
			const user = userEvent.setup();

			// Mock real API user data format (first_name + last_name)
			const realApiUserData = {
				isAuthenticated: true,
				user: {
					name: "Jane Smith", // Real API response: first_name + " " + last_name
					email: "jane.smith@company.com",
					has_projects_access: true
				},
				token: "real-api-token",
				login: vi.fn(),
				logout: mockLogout
			};

			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={realApiUserData}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Verify real user data is displayed, NOT hardcoded "John Doe"
			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			expect(screen.getByText("jane.smith@company.com")).toBeInTheDocument();

			// Ensure no hardcoded fallback values
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
			expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
		});

		it("should handle user data with different name formats", async () => {
			const user = userEvent.setup();

			const testUsers = [
				{
					name: "Maria José García-López", // Multi-part names
					email: "maria.garcia@international.com",
					has_projects_access: true
				},
				{
					name: "李 明", // Non-ASCII characters
					email: "li.ming@example.cn",
					has_projects_access: true
				},
				{
					name: "Jean-Luc Picard", // Hyphenated names
					email: "jean.luc@starfleet.com",
					has_projects_access: true
				}
			];

			for (const testUser of testUsers) {
				const userAuth = {
					isAuthenticated: true,
					user: testUser,
					token: "test-token",
					login: vi.fn(),
					logout: mockLogout
				};

				const { unmount } = render(
					<NavigationPanel
						onPageChange={mockOnPageChange}
						onShowRegistration={mockOnShowRegistration}
						onShowLogin={mockOnShowLogin}
						auth={userAuth}
					/>
				);

				// Open navigation panel
				const profileButton = screen.getByRole("button", { name: /profile/i });
				await user.click(profileButton);

				// Verify user data is displayed correctly
				expect(screen.getByText(testUser.name)).toBeInTheDocument();
				expect(screen.getByText(testUser.email)).toBeInTheDocument();

				// Clean up for next iteration
				unmount();
			}
		});

		it("should prevent 'John Doe' bug regression by validating real user data format", async () => {
			const user = userEvent.setup();

			// This test ensures the NavigationPanel correctly displays user data
			// in the format returned by the useAuth hook after API integration
			const authenticatedUserFromAPI = {
				isAuthenticated: true,
				user: {
					// This name format should come from: first_name + " " + last_name
					// as implemented in the useAuth hook's /api/users/me integration
					name: "Real User Name",
					email: "real.user@api.example.com",
					has_projects_access: true
				},
				token: "api-validated-token",
				login: vi.fn(),
				logout: mockLogout
			};

			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={authenticatedUserFromAPI}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Critical assertion: Real user data is displayed
			expect(screen.getByText("Real User Name")).toBeInTheDocument();
			expect(screen.getByText("real.user@api.example.com")).toBeInTheDocument();

			// Critical regression test: "John Doe" should NEVER appear
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
			expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
		});
	});

	describe("Projects Module Access", () => {
		const userWithProjectsAccess = {
			isAuthenticated: true,
			user: {
				name: "Project User",
				email: "project.user@example.com",
				has_projects_access: true
			},
			token: "mock-token",
			login: vi.fn(),
			logout: mockLogout
		};

		const userWithoutProjectsAccess = {
			isAuthenticated: true,
			user: {
				name: "Basic User",
				email: "basic.user@example.com",
				has_projects_access: false
			},
			token: "mock-token",
			login: vi.fn(),
			logout: mockLogout
		};

		it("should show Projects section for users with projects access", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Projects section should be visible
			expect(screen.getByText("Projects")).toBeInTheDocument();
		});

		it("should hide Projects section for users without projects access", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithoutProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Projects section should not be visible
			expect(screen.queryByText("Projects")).not.toBeInTheDocument();
		});

		it("should expand Projects section when clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Click Projects section to expand
			const projectsButton = screen.getByText("Projects");
			await user.click(projectsButton);

			// Create Project and Join Project buttons should appear
			expect(screen.getByText("Create Project")).toBeInTheDocument();
			expect(screen.getByText("Join Project")).toBeInTheDocument();
		});

		it("should collapse Projects section when clicked again", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Expand Projects section
			const projectsButton = screen.getByText("Projects");
			await user.click(projectsButton);
			expect(screen.getByText("Create Project")).toBeInTheDocument();

			// Collapse Projects section
			await user.click(projectsButton);
			await waitFor(() => {
				expect(screen.queryByText("Create Project")).not.toBeInTheDocument();
				expect(screen.queryByText("Join Project")).not.toBeInTheDocument();
			});
		});

		it("should navigate to create-project page when Create Project is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel and expand Projects
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);
			const projectsButton = screen.getByText("Projects");
			await user.click(projectsButton);

			// Click Create Project
			const createProjectButton = screen.getByText("Create Project");
			await user.click(createProjectButton);

			// Should navigate to create-project page and close panel
			expect(mockOnPageChange).toHaveBeenCalledWith("create-project");
			await waitFor(() => {
				expect(screen.queryByText("Project User")).not.toBeInTheDocument();
			});
		});

		it("should navigate to join-project page when Join Project is clicked", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel and expand Projects
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);
			const projectsButton = screen.getByText("Projects");
			await user.click(projectsButton);

			// Click Join Project
			const joinProjectButton = screen.getByText("Join Project");
			await user.click(joinProjectButton);

			// Should navigate to join-project page and close panel
			expect(mockOnPageChange).toHaveBeenCalledWith("join-project");
			await waitFor(() => {
				expect(screen.queryByText("Project User")).not.toBeInTheDocument();
			});
		});

		it("should have proper accessibility attributes for Projects section", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Projects button should have proper ARIA attributes
			const projectsButton = screen.getByText("Projects").closest("button");
			expect(projectsButton).toHaveAttribute("aria-expanded", "false");

			// Expand and check aria-expanded changes
			await user.click(projectsButton!);
			expect(projectsButton).toHaveAttribute("aria-expanded", "true");
		});

		it("should show chevron icon indicating expandable state", async () => {
			const user = userEvent.setup();
			render(
				<NavigationPanel
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={userWithProjectsAccess}
				/>
			);

			// Open navigation panel
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Projects section should have a chevron/arrow icon
			const projectsButton = screen.getByText("Projects").closest("button");
			const chevronIcons = projectsButton?.querySelectorAll("svg");
			expect(chevronIcons).toHaveLength(2); // Project icon + chevron icon
		});
	});
});
