import { screen } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { beforeEach, describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import HomePage from "../HomePage";

describe("HomePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render the main page structure", () => {
		renderWithFullEnvironment(<HomePage />);

		// Verify main container exists
		const mainElement = screen.getByRole("main");
		expect(mainElement).toBeInTheDocument();
		expect(mainElement).toHaveClass("w-full", "py-8");
	});

	it("should display the Welcome section with proper content", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check for Welcome section by ID
		const welcomeSection = document.getElementById("home");
		expect(welcomeSection).toBeInTheDocument();
		expect(welcomeSection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");

		// Check heading
		const welcomeHeading = screen.getByRole("heading", { name: /welcome to zentropy/i });
		expect(welcomeHeading).toBeInTheDocument();
		expect(welcomeHeading).toHaveClass("text-primary", "text-3xl", "font-semibold");

		// Check description
		const welcomeDescription = screen.getByText(/your comprehensive product management platform/i);
		expect(welcomeDescription).toBeInTheDocument();
		expect(welcomeDescription).toHaveClass("text-primary");
	});

	it("should display the Projects section with proper content", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check for Projects section by ID
		const projectsSection = document.getElementById("projects");
		expect(projectsSection).toBeInTheDocument();
		expect(projectsSection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");

		// Check heading
		const projectsHeading = screen.getByRole("heading", { name: /^projects$/i });
		expect(projectsHeading).toBeInTheDocument();
		expect(projectsHeading).toHaveClass("text-primary", "text-3xl", "font-semibold");

		// Check description
		const projectsDescription = screen.getByText(/manage your projects with advanced workflows/i);
		expect(projectsDescription).toBeInTheDocument();
		expect(projectsDescription).toHaveClass("text-primary");
	});

	it("should display the Teams section with proper content", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check for Teams section by ID
		const teamsSection = document.getElementById("teams");
		expect(teamsSection).toBeInTheDocument();
		expect(teamsSection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");

		// Check heading
		const teamsHeading = screen.getByRole("heading", { name: /^teams$/i });
		expect(teamsHeading).toBeInTheDocument();
		expect(teamsHeading).toHaveClass("text-primary", "text-3xl", "font-semibold");

		// Check description
		const teamsDescription = screen.getByText(/collaborate effectively with your team members/i);
		expect(teamsDescription).toBeInTheDocument();
		expect(teamsDescription).toHaveClass("text-primary");
	});

	it("should display the Capacity Planning section with proper content", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check for Capacity Planning section by ID
		const capacitySection = document.getElementById("capacity");
		expect(capacitySection).toBeInTheDocument();
		expect(capacitySection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");

		// Check heading
		const capacityHeading = screen.getByRole("heading", { name: /capacity planning/i });
		expect(capacityHeading).toBeInTheDocument();
		expect(capacityHeading).toHaveClass("text-primary", "text-3xl", "font-semibold");

		// Check description
		const capacityDescription = screen.getByText(/plan and optimize your team's capacity and resources/i);
		expect(capacityDescription).toBeInTheDocument();
		expect(capacityDescription).toHaveClass("text-primary");
	});

	it("should use semantic styling classes consistently", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check all sections use semantic background styling
		const sections = document.querySelectorAll("section");
		expect(sections).toHaveLength(4);

		sections.forEach(section => {
			expect(section).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");
		});

		// Check all headings use semantic text styling
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings).toHaveLength(4);

		headings.forEach(heading => {
			expect(heading).toHaveClass("text-primary", "text-3xl", "font-semibold");
		});

		// Check all paragraphs use semantic text styling
		const paragraphs = screen.getAllByText(
			/manage your projects|collaborate effectively|plan and optimize|your comprehensive product/i
		);
		expect(paragraphs).toHaveLength(4);

		paragraphs.forEach(paragraph => {
			expect(paragraph).toHaveClass("text-primary");
		});
	});

	it("should have proper accessibility structure", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check that all sections exist
		const sections = document.querySelectorAll("section");
		expect(sections).toHaveLength(4);

		// Check that headings are properly structured
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings).toHaveLength(4);

		// Verify each section has a heading
		sections.forEach((section, index) => {
			const heading = headings[index];
			expect(section).toContainElement(heading);
		});
	});

	it("should render all sections in the correct order", () => {
		renderWithFullEnvironment(<HomePage />);

		const sections = document.querySelectorAll("section");
		expect(sections).toHaveLength(4);

		// Check section order by ID
		expect(sections[0]).toHaveAttribute("id", "home");
		expect(sections[1]).toHaveAttribute("id", "projects");
		expect(sections[2]).toHaveAttribute("id", "teams");
		expect(sections[3]).toHaveAttribute("id", "capacity");
	});

	it("should have proper spacing and layout classes", () => {
		renderWithFullEnvironment(<HomePage />);

		// Check main container has proper classes
		const mainElement = screen.getByRole("main");
		expect(mainElement).toHaveClass("w-full", "py-8");

		// Check all sections have proper spacing
		const sections = document.querySelectorAll("section");
		sections.forEach(section => {
			expect(section).toHaveClass("mb-8", "p-8");
		});

		// Check section header divs have proper classes
		const headings = screen.getAllByRole("heading", { level: 2 });

		headings.forEach(heading => {
			const headerDiv = heading.parentElement;
			expect(headerDiv).toHaveClass("mb-8", "flex", "items-center", "justify-between");
		});
	});
});
