import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../Header";

const mockOnPageChange = vi.fn();

describe("Header", () => {
	beforeEach(() => {
		mockOnPageChange.mockClear();
	});

	it("renders Zentropy logo", () => {
		render(<Header currentPage="home" onPageChange={mockOnPageChange} />);
		
		const logo = screen.getByRole("heading", { level: 1 });
		expect(logo).toHaveTextContent("Zentropy");
	});

	it("highlights current page in navigation", () => {
		render(<Header currentPage="about" onPageChange={mockOnPageChange} />);
		
		const aboutLink = screen.getByRole("link", { name: "About" });
		expect(aboutLink).toHaveClass("active");
		
		const contactLink = screen.getByRole("link", { name: "Contact" });
		expect(contactLink).not.toHaveClass("active");
	});

	it("calls onPageChange when navigation link is clicked", async () => {
		const user = userEvent.setup();
		render(<Header currentPage="home" onPageChange={mockOnPageChange} />);
		
		const aboutLink = screen.getByRole("link", { name: "About" });
		await user.click(aboutLink);
		
		expect(mockOnPageChange).toHaveBeenCalledWith("about");
	});

	it("renders profile dropdown", () => {
		render(<Header currentPage="home" onPageChange={mockOnPageChange} />);
		
		const profileButton = screen.getByRole("button", { name: /profile/i });
		expect(profileButton).toBeInTheDocument();
	});

	it("has proper semantic structure", () => {
		render(<Header currentPage="home" onPageChange={mockOnPageChange} />);
		
		const header = screen.getByRole("banner");
		expect(header).toBeInTheDocument();
		
		const navigation = screen.getByRole("navigation");
		expect(navigation).toBeInTheDocument();
	});

	it("renders all navigation links", () => {
		render(<Header currentPage="home" onPageChange={mockOnPageChange} />);
		
		expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument();
	});
});