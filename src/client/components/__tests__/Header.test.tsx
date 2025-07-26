import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- Header navigation tests require userEvent for flyout menu interactions and focus management
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

const mockAuthUnverified = {
	...mockAuth,
	user: {
		...mockAuth.user,
		email_verified: false
	}
};

describe("Header", () => {
	/* eslint-disable no-restricted-syntax */
	// Header navigation tests require userEvent for flyout menu interactions and focus management
	beforeEach(() => {
		mockOnPageChange.mockClear();
	});

	afterEach(() => {
		cleanup(); // Ensure DOM is cleaned up after each test
	});

	it("renders Zentropy logo", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const logoImage = screen.getByAltText("Zentropy");
		expect(logoImage).toBeInTheDocument();
		expect(logoImage).toHaveAttribute("src", "/images/ZentropyLogo.svg");
	});

	it("renders flyout navigation menu button", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="about"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		const menuButton = screen.getByRole("button", { name: "Navigation menu" });
		expect(menuButton).toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-label", "Navigation menu");
	});

	it("opens flyout navigation and calls onPageChange when link is clicked", async () => {
		const user = userEvent.setup();
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		// Open the flyout navigation
		const menuButton = screen.getByRole("button", { name: "Navigation menu" });
		await user.click(menuButton);

		// Click on About link in the flyout
		const aboutLink = screen.getByText("About");
		await user.click(aboutLink);

		expect(mockOnPageChange).toHaveBeenCalledWith("about");
	});

	it("renders navigation panel", () => {
		renderWithFullEnvironment(
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
		renderWithFullEnvironment(
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

		// The flyout navigation includes a nav element inside it
		const menuButton = screen.getByRole("button", { name: "Navigation menu" });
		expect(menuButton).toBeInTheDocument();
	});

	it("renders flyout navigation with all links when opened", async () => {
		const user = userEvent.setup();
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		// Open the flyout navigation
		const menuButton = screen.getByRole("button", { name: "Navigation menu" });
		await user.click(menuButton);

		// Check that navigation links are now visible
		expect(screen.getByText("About")).toBeInTheDocument();
		expect(screen.getByText("Contact")).toBeInTheDocument();
	});

	it("does not show email verification elements for verified users", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuth}
			/>
		);

		expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
	});

	it("shows email verification elements for unverified users", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuthUnverified}
			/>
		);

		expect(screen.getByText("Email verification required")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
	});

	it("does not show email verification elements for unauthenticated users", () => {
		const unauthenticatedAuth = {
			isAuthenticated: false,
			user: null,
			token: null,
			login: vi.fn(),
			logout: vi.fn()
		};

		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={unauthenticatedAuth}
			/>
		);

		expect(screen.queryByText("Email verification required")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
	});

	it("positions email verification elements correctly in header", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuthUnverified}
			/>
		);

		const emailVerificationText = screen.getByText("Email verification required");
		const resendButton = screen.getByRole("button", { name: "Resend" });
		const profileButton = screen.getByRole("button", { name: /profile/i });

		expect(emailVerificationText).toBeInTheDocument();
		expect(resendButton).toBeInTheDocument();
		expect(profileButton).toBeInTheDocument();

		// Verify email verification elements are together
		const emailVerificationContainer = emailVerificationText.closest("div");
		expect(emailVerificationContainer).toContainElement(resendButton);

		// Verify they're all in the header's right side
		const headerElement = screen.getByRole("banner");
		expect(headerElement).toContainElement(emailVerificationText);
		expect(headerElement).toContainElement(resendButton);
		expect(headerElement).toContainElement(profileButton);
	});

	it("shows Enter Code button when onShowVerification is provided", () => {
		const mockOnShowVerification = vi.fn();

		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				onShowVerification={mockOnShowVerification}
				auth={mockAuthUnverified}
			/>
		);

		expect(screen.getByText("Email verification required")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /enter code/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
	});

	it("does not show Enter Code button when onShowVerification is not provided", () => {
		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				auth={mockAuthUnverified}
			/>
		);

		expect(screen.getByText("Email verification required")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /enter code/i })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Resend" })).toBeInTheDocument();
	});

	it("calls onShowVerification with user email when Enter Code is clicked", async () => {
		const user = userEvent.setup();
		const mockOnShowVerification = vi.fn();

		renderWithFullEnvironment(
			<Header
				currentPage="home"
				onPageChange={mockOnPageChange}
				onShowRegistration={vi.fn()}
				onShowSignIn={vi.fn()}
				onShowVerification={mockOnShowVerification}
				auth={mockAuthUnverified}
			/>
		);

		const enterCodeButton = screen.getByRole("button", { name: /enter code/i });
		await user.click(enterCodeButton);

		expect(mockOnShowVerification).toHaveBeenCalledWith("john@example.com");
	});

	// Note: Cross-tab functionality has been replaced with a central verification code system
	/* eslint-enable no-restricted-syntax */
});
