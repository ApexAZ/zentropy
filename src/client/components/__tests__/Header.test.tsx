import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Header from "../Header";

const mockOnPageChange = vi.fn();

const mockAuth = {
	isAuthenticated: true,
	user: {
		name: "John Doe",
		email: "john@example.com",
		has_projects_access: true,
		email_verified: true
	},
	token: "mock-token",
	login: vi.fn(),
	logout: vi.fn()
};

describe("Header", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
	});

	afterEach(() => {
		cleanup(); // Ensure DOM is cleaned up after each test
	});

	it("renders Zentropy logo", () => {
		render(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const logo = screen.getByRole("heading", { level: 1 });
		expect(logo).toHaveTextContent("Zentropy");
	});

	it("highlights current page in navigation", () => {
		render(
			<Header
				currentPage="about"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const aboutLink = screen.getByRole("button", { name: "About" });
		expect(aboutLink).toHaveClass("text-interactive", "border-interactive", "border-b");

		const contactLink = screen.getByRole("button", { name: "Contact" });
		expect(contactLink).toHaveClass("text-interactive");
		expect(contactLink).not.toHaveClass("border-b");
	});

	it("calls onPageChange when navigation link is clicked", async () => {
		const user = userEvent.setup();
		render(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const aboutLink = screen.getByRole("button", { name: "About" });
		await user.click(aboutLink);

		expect(mockOnPageChange).toHaveBeenCalledWith("about");
	});

	it("renders navigation panel", () => {
		render(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toBeInTheDocument();
	});

	it("has proper semantic structure", () => {
		render(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const header = screen.getByRole("banner");
		expect(header).toBeInTheDocument();

		const navigation = screen.getByRole("navigation");
		expect(navigation).toBeInTheDocument();
	});

	it("renders all navigation links", () => {
		render(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Contact" })).toBeInTheDocument();
	});
});
