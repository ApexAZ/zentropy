import { render, screen, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import AboutPage from "../AboutPage";

describe("AboutPage", () => {
	beforeEach(() => {
		// Clear any previous state
	});

	afterEach(() => {
		cleanup();
	});

	it("should render the main page structure", () => {
		render(<AboutPage />);

		// Verify main container exists
		const mainElement = screen.getByRole("main");
		expect(mainElement).toBeInTheDocument();
		expect(mainElement).toHaveClass("w-full", "py-8");
	});

	it("should display the page title with proper styling", () => {
		render(<AboutPage />);

		// Check for page title
		const pageTitle = screen.getByRole("heading", { name: /about zentropy/i });
		expect(pageTitle).toBeInTheDocument();
		expect(pageTitle).toHaveClass("text-primary", "m-0", "text-3xl", "font-semibold");

		// Check title is in header div with proper styling
		const headerDiv = pageTitle.parentElement;
		expect(headerDiv).toHaveClass("mb-8", "flex", "items-center", "justify-between");
	});

	it("should display the main content section with proper styling", () => {
		render(<AboutPage />);

		// Check for main content section
		const contentSection = document.querySelector("section");
		expect(contentSection).toBeInTheDocument();
		expect(contentSection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");
	});

	it("should display the introduction paragraphs", () => {
		render(<AboutPage />);

		// Check for introduction paragraphs
		const introText1 = screen.getByText(/comprehensive product management platform designed to streamline/i);
		expect(introText1).toBeInTheDocument();
		expect(introText1).toHaveClass("text-primary", "mb-4");

		const introText2 = screen.getByText(/our mission is to bring clarity and efficiency/i);
		expect(introText2).toBeInTheDocument();
		expect(introText2).toHaveClass("text-primary", "mb-4");
	});

	it("should display the 'Our Vision' section with proper content", () => {
		render(<AboutPage />);

		// Check for 'Our Vision' heading
		const visionHeading = screen.getByRole("heading", { name: /our vision/i });
		expect(visionHeading).toBeInTheDocument();
		expect(visionHeading).toHaveClass("text-primary", "mb-3", "text-xl", "font-semibold");

		// Check for vision paragraph
		const visionText = screen.getByText(/we envision a world where product teams can seamlessly collaborate/i);
		expect(visionText).toBeInTheDocument();
		expect(visionText).toHaveClass("text-primary", "mb-4");
	});

	it("should display the 'Key Features' section with proper content", () => {
		render(<AboutPage />);

		// Check for 'Key Features' heading
		const featuresHeading = screen.getByRole("heading", { name: /key features/i });
		expect(featuresHeading).toBeInTheDocument();
		expect(featuresHeading).toHaveClass("text-primary", "mb-3", "text-xl", "font-semibold");

		// Check for features list
		const featuresList = screen.getByRole("list", { hidden: true }); // list-none makes it not accessible by default
		expect(featuresList).toBeInTheDocument();
		expect(featuresList).toHaveClass("text-primary", "mb-4", "list-none");
	});

	it("should display all four key features", () => {
		render(<AboutPage />);

		// Check for each key feature
		const feature1 = screen.getByText(/intuitive team management and collaboration tools/i);
		expect(feature1).toBeInTheDocument();
		expect(feature1).toHaveClass("mb-2");

		const feature2 = screen.getByText(/advanced capacity planning and sprint optimization/i);
		expect(feature2).toBeInTheDocument();
		expect(feature2).toHaveClass("mb-2");

		const feature3 = screen.getByText(/real-time calendar management for accurate resource allocation/i);
		expect(feature3).toBeInTheDocument();
		expect(feature3).toHaveClass("mb-2");

		const feature4 = screen.getByText(/comprehensive dashboard for team configuration and insights/i);
		expect(feature4).toBeInTheDocument();
		expect(feature4).toHaveClass("mb-2");
	});

	it("should display the closing paragraph", () => {
		render(<AboutPage />);

		// Check for closing paragraph
		const closingText = screen.getByText(/built with modern web technologies and a focus on user experience/i);
		expect(closingText).toBeInTheDocument();
		expect(closingText).toHaveClass("text-primary", "mb-4");
	});

	it("should use semantic styling classes consistently", () => {
		render(<AboutPage />);

		// Check main content section uses semantic background
		const contentSection = document.querySelector("section");
		expect(contentSection).toHaveClass("bg-content-background");

		// Check all headings use semantic text styling
		const h2Heading = screen.getByRole("heading", { name: /about zentropy/i });
		expect(h2Heading).toHaveClass("text-primary");

		const h3Headings = screen.getAllByRole("heading", { level: 3 });
		expect(h3Headings).toHaveLength(2);
		h3Headings.forEach(heading => {
			expect(heading).toHaveClass("text-primary");
		});

		// Check all paragraphs use semantic text styling
		const paragraphs = document.querySelectorAll("p");
		paragraphs.forEach(paragraph => {
			expect(paragraph).toHaveClass("text-primary");
		});
	});

	it("should have proper accessibility structure", () => {
		render(<AboutPage />);

		// Check that main heading exists
		const mainHeading = screen.getByRole("heading", { level: 2 });
		expect(mainHeading).toBeInTheDocument();

		// Check that subheadings exist
		const subHeadings = screen.getAllByRole("heading", { level: 3 });
		expect(subHeadings).toHaveLength(2);

		// Verify heading hierarchy (h2 followed by h3s)
		const allHeadings = screen.getAllByRole("heading");
		expect(allHeadings).toHaveLength(3);
		expect(allHeadings[0].tagName).toBe("H2");
		expect(allHeadings[1].tagName).toBe("H3");
		expect(allHeadings[2].tagName).toBe("H3");
	});

	it("should have proper content structure and organization", () => {
		render(<AboutPage />);

		// Verify content flows logically
		const contentSection = document.querySelector("section");
		expect(contentSection).toBeInTheDocument();

		// Check content order: intro paragraphs, vision section, features section, closing paragraph
		const paragraphs = contentSection!.querySelectorAll("p");
		expect(paragraphs).toHaveLength(4); // 2 intro + 1 vision + 1 closing

		const headings = contentSection!.querySelectorAll("h3");
		expect(headings).toHaveLength(2); // Our Vision + Key Features

		const list = contentSection!.querySelector("ul");
		expect(list).toBeInTheDocument();
		expect(list!.children).toHaveLength(4); // 4 key features
	});
});
