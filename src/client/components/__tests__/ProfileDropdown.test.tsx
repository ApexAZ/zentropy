import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ProfileDropdown from "../ProfileDropdown";

const mockOnPageChange = vi.fn();
const mockOnShowRegistration = vi.fn();
const mockOnShowLogin = vi.fn();
const mockLogout = vi.fn();

const mockAuthenticatedUser = {
	isAuthenticated: true,
	user: {
		name: "Integration Test", // Real API formatted name (first_name + last_name)
		email: "integration.test@example.com"
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

describe("ProfileDropdown", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
		mockOnShowRegistration.mockClear();
		mockOnShowLogin.mockClear();
		mockLogout.mockClear();
	});

	it("renders profile icon", () => {
		render(
			<ProfileDropdown
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toBeInTheDocument();
	});

	it("opens dropdown when profile icon is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ProfileDropdown
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

	it("closes dropdown when clicking outside", async () => {
		const user = userEvent.setup();
		render(
			<div>
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockAuthenticatedUser}
				/>
				<div data-testid="outside">Outside element</div>
			</div>
		);

		// Open dropdown
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
			<ProfileDropdown
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open dropdown
		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		// Click profile link
		const profileLink = screen.getByText("My Profile");
		await user.click(profileLink);

		expect(mockOnPageChange).toHaveBeenCalledWith("profile");
	});

	it("closes dropdown after navigation", async () => {
		const user = userEvent.setup();
		render(
			<ProfileDropdown
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open dropdown
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
			<ProfileDropdown
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
			<ProfileDropdown
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

	it("updates aria-expanded when dropdown opens", async () => {
		const user = userEvent.setup();
		render(
			<ProfileDropdown
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
			<ProfileDropdown
				onPageChange={mockOnPageChange}
				onShowRegistration={mockOnShowRegistration}
				onShowLogin={mockOnShowLogin}
				auth={mockAuthenticatedUser}
			/>
		);

		// Open dropdown
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
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockAuthenticatedUser}
				/>
			);

			// Open dropdown
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
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open dropdown
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Login and Register buttons should be visible for unauthenticated users
			expect(screen.getByText("Login")).toBeInTheDocument();
			expect(screen.getByText("Register")).toBeInTheDocument();

			// Sign Out button should not be visible
			expect(screen.queryByText("Sign Out")).not.toBeInTheDocument();
		});

		it("should call onShowLogin when Login button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open dropdown
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Click Login button
			const loginButton = screen.getByText("Login");
			await user.click(loginButton);

			// Verify onShowLogin was called
			expect(mockOnShowLogin).toHaveBeenCalledOnce();
		});

		it("should call onShowRegistration when Register button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open dropdown
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Click Register button
			const registerButton = screen.getByText("Register");
			await user.click(registerButton);

			// Verify onShowRegistration was called
			expect(mockOnShowRegistration).toHaveBeenCalledOnce();
		});

		it("should display guest user information for unauthenticated users", async () => {
			const user = userEvent.setup();
			render(
				<ProfileDropdown
					onPageChange={mockOnPageChange}
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={mockUnauthenticatedUser}
				/>
			);

			// Open dropdown
			const profileButton = screen.getByRole("button", { name: /profile/i });
			await user.click(profileButton);

			// Should show guest user info
			expect(screen.getByText("Guest User")).toBeInTheDocument();
			expect(screen.getByText("Not signed in")).toBeInTheDocument();
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
					email: "jane.smith@company.com"
				},
				token: "real-api-token",
				login: vi.fn(),
				logout: mockLogout
			};

			render(
				<ProfileDropdown 
					onPageChange={mockOnPageChange} 
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={realApiUserData} 
				/>
			);

			// Open dropdown
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
					email: "maria.garcia@international.com"
				},
				{
					name: "李 明", // Non-ASCII characters
					email: "li.ming@example.cn"
				},
				{
					name: "Jean-Luc Picard", // Hyphenated names
					email: "jean.luc@starfleet.com"
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
					<ProfileDropdown 
						onPageChange={mockOnPageChange} 
						onShowRegistration={mockOnShowRegistration}
						onShowLogin={mockOnShowLogin}
						auth={userAuth} 
					/>
				);

				// Open dropdown
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

			// This test ensures the ProfileDropdown correctly displays user data
			// in the format returned by the useAuth hook after API integration
			const authenticatedUserFromAPI = {
				isAuthenticated: true,
				user: {
					// This name format should come from: first_name + " " + last_name
					// as implemented in the useAuth hook's /api/users/me integration
					name: "Real User Name",
					email: "real.user@api.example.com"
				},
				token: "api-validated-token",
				login: vi.fn(),
				logout: mockLogout
			};

			render(
				<ProfileDropdown 
					onPageChange={mockOnPageChange} 
					onShowRegistration={mockOnShowRegistration}
					onShowLogin={mockOnShowLogin}
					auth={authenticatedUserFromAPI} 
				/>
			);

			// Open dropdown
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
});
