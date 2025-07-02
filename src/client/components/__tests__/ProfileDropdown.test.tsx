import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileDropdown from "../ProfileDropdown";

const mockOnPageChange = vi.fn();
const mockLogout = vi.fn();

const mockAuth = {
	isAuthenticated: true,
	user: {
		name: "John Doe",
		email: "john@example.com"
	},
	token: "mock-token",
	login: vi.fn(),
	logout: mockLogout
};

describe("ProfileDropdown", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
		mockLogout.mockClear();
	});

	it("renders profile icon", () => {
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toBeInTheDocument();
	});

	it("opens dropdown when profile icon is clicked", async () => {
		const user = userEvent.setup();
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.getByText("john@example.com")).toBeInTheDocument();
	});

	it("closes dropdown when clicking outside", async () => {
		const user = userEvent.setup();
		render(
			<div>
				<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />
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
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

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
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

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
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

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
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toHaveAttribute("aria-haspopup", "true");
		expect(profileButton).toHaveAttribute("aria-expanded", "false");
	});

	it("updates aria-expanded when dropdown opens", async () => {
		const user = userEvent.setup();
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		await user.click(profileButton);

		expect(profileButton).toHaveAttribute("aria-expanded", "true");
	});

	it("calls logout and navigates to home when sign out is clicked", async () => {
		const user = userEvent.setup();
		render(<ProfileDropdown onPageChange={mockOnPageChange} auth={mockAuth} />);

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
});
