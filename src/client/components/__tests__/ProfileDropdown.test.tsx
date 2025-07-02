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
		name: "John Doe",
		email: "john@example.com"
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

		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("john@example.com")).toBeInTheDocument();
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
		expect(screen.getByText("John Doe")).toBeInTheDocument();

		// Click outside
		const outsideElement = screen.getByTestId("outside");
		await user.click(outsideElement);

		await waitFor(() => {
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
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
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
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
		expect(screen.getByText("John Doe")).toBeInTheDocument();

		// Close with Escape key
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
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
});
