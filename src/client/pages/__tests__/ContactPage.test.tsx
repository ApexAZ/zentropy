import { render, screen, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import ContactPage from "../ContactPage";

describe("ContactPage", () => {
	beforeEach(() => {
		// Clear any previous state
	});

	afterEach(() => {
		cleanup();
	});

	it("should render the main page structure", () => {
		render(<ContactPage />);

		// Verify main container exists
		const mainElement = screen.getByRole("main");
		expect(mainElement).toBeInTheDocument();
		expect(mainElement).toHaveClass("w-full", "py-8");
	});

	it("should display the page title with proper styling", () => {
		render(<ContactPage />);

		// Check for page title
		const pageTitle = screen.getByRole("heading", { name: /contact us/i });
		expect(pageTitle).toBeInTheDocument();
		expect(pageTitle).toHaveClass("text-primary", "m-0", "text-3xl", "font-semibold");

		// Check title is in header div with proper styling
		const headerDiv = pageTitle.parentElement;
		expect(headerDiv).toHaveClass("mb-8", "flex", "items-center", "justify-between");
	});

	it("should display the main content section with proper styling", () => {
		render(<ContactPage />);

		// Check for main content section
		const contentSection = document.querySelector("section");
		expect(contentSection).toBeInTheDocument();
		expect(contentSection).toHaveClass("bg-content-background", "rounded-lg", "p-8", "shadow-sm");
	});

	it("should display the introduction paragraph", () => {
		render(<ContactPage />);

		// Check for introduction paragraph
		const introText = screen.getByText(
			/we'd love to hear from you! whether you have questions, feedback, or need support/i
		);
		expect(introText).toBeInTheDocument();
		expect(introText).toHaveClass("text-primary", "mb-4");
	});

	it("should display the 'Get In Touch' section with proper content", () => {
		render(<ContactPage />);

		// Check for 'Get In Touch' heading
		const getInTouchHeading = screen.getByRole("heading", { name: /get in touch/i });
		expect(getInTouchHeading).toBeInTheDocument();
		expect(getInTouchHeading).toHaveClass("text-primary", "mb-3", "text-xl", "font-semibold");

		// Check for get in touch paragraph
		const getInTouchText = screen.getByText(/reach out to us through any of the following channels/i);
		expect(getInTouchText).toBeInTheDocument();
		expect(getInTouchText).toHaveClass("text-primary", "mb-4");
	});

	it("should display the Support section with proper content", () => {
		render(<ContactPage />);

		// Check for Support heading
		const supportHeading = screen.getByRole("heading", { name: /support/i });
		expect(supportHeading).toBeInTheDocument();
		expect(supportHeading).toHaveClass("text-primary", "mb-2", "text-lg", "font-semibold");

		// Check for support description
		const supportDescription = screen.getByText(/for technical support and help with using zentropy/i);
		expect(supportDescription).toBeInTheDocument();
		expect(supportDescription).toHaveClass("text-primary", "mb-2");

		// Check for support email
		const supportEmail = screen.getByText(/support@zentropy.app/i);
		expect(supportEmail).toBeInTheDocument();

		// Check for response time
		const responseTime = screen.getByText(/within 24 hours/i);
		expect(responseTime).toBeInTheDocument();
	});

	it("should display the General Inquiries section with proper content", () => {
		render(<ContactPage />);

		// Check for General Inquiries heading
		const generalInquiriesHeading = screen.getByRole("heading", { name: /general inquiries/i });
		expect(generalInquiriesHeading).toBeInTheDocument();
		expect(generalInquiriesHeading).toHaveClass("text-primary", "mb-2", "text-lg", "font-semibold");

		// Check for general inquiries description
		const generalInquiriesDescription = screen.getByText(/for general questions and business inquiries/i);
		expect(generalInquiriesDescription).toBeInTheDocument();
		expect(generalInquiriesDescription).toHaveClass("text-primary", "mb-2");

		// Check for general inquiries email
		const generalInquiriesEmail = screen.getByText(/hello@zentropy.app/i);
		expect(generalInquiriesEmail).toBeInTheDocument();
	});

	it("should display the Feedback section with proper content", () => {
		render(<ContactPage />);

		// Check for Feedback heading
		const feedbackHeading = screen.getByRole("heading", { name: /feedback/i });
		expect(feedbackHeading).toBeInTheDocument();
		expect(feedbackHeading).toHaveClass("text-primary", "mb-2", "text-lg", "font-semibold");

		// Check for feedback description
		const feedbackDescription = screen.getByText(/we value your input and suggestions for improving zentropy/i);
		expect(feedbackDescription).toBeInTheDocument();
		expect(feedbackDescription).toHaveClass("text-primary", "mb-2");

		// Check for feedback email
		const feedbackEmail = screen.getByText(/feedback@zentropy.app/i);
		expect(feedbackEmail).toBeInTheDocument();
	});

	it("should display the Office Hours section with proper content", () => {
		render(<ContactPage />);

		// Check for Office Hours heading
		const officeHoursHeading = screen.getByRole("heading", { name: /office hours/i });
		expect(officeHoursHeading).toBeInTheDocument();
		expect(officeHoursHeading).toHaveClass("text-primary", "mb-3", "text-xl", "font-semibold");

		// Check for office hours introduction
		const officeHoursIntro = screen.getByText(/our support team is available/i);
		expect(officeHoursIntro).toBeInTheDocument();
		expect(officeHoursIntro).toHaveClass("text-primary", "mb-4");
	});

	it("should display all office hours with proper formatting", () => {
		render(<ContactPage />);

		// Check for office hours list
		const officeHoursList = screen.getByRole("list", { hidden: true }); // list-none makes it not accessible by default
		expect(officeHoursList).toBeInTheDocument();
		expect(officeHoursList).toHaveClass("text-primary", "mb-4", "list-none");

		// Check for each office hour item
		const mondayFriday = screen.getByText(/monday - friday: 9:00 am - 6:00 pm \(pst\)/i);
		expect(mondayFriday).toBeInTheDocument();
		expect(mondayFriday).toHaveClass("mb-2");

		const saturday = screen.getByText(/saturday: 10:00 am - 2:00 pm \(pst\)/i);
		expect(saturday).toBeInTheDocument();
		expect(saturday).toHaveClass("mb-2");

		const sunday = screen.getByText(/sunday: closed/i);
		expect(sunday).toBeInTheDocument();
		expect(sunday).toHaveClass("mb-2");
	});

	it("should display the closing paragraph", () => {
		render(<ContactPage />);

		// Check for closing paragraph
		const closingText = screen.getByText(
			/we strive to respond to all inquiries promptly and look forward to helping you succeed/i
		);
		expect(closingText).toBeInTheDocument();
		expect(closingText).toHaveClass("text-primary", "mb-4");
	});

	it("should use semantic styling classes consistently", () => {
		render(<ContactPage />);

		// Check main content section uses semantic background
		const contentSection = document.querySelector("section");
		expect(contentSection).toHaveClass("bg-content-background");

		// Check all headings use semantic text styling
		const h2Heading = screen.getByRole("heading", { name: /contact us/i });
		expect(h2Heading).toHaveClass("text-primary");

		const h3Headings = screen.getAllByRole("heading", { level: 3 });
		expect(h3Headings).toHaveLength(2);
		h3Headings.forEach(heading => {
			expect(heading).toHaveClass("text-primary");
		});

		const h4Headings = screen.getAllByRole("heading", { level: 4 });
		expect(h4Headings).toHaveLength(3);
		h4Headings.forEach(heading => {
			expect(heading).toHaveClass("text-primary");
		});

		// Check all paragraphs use semantic text styling
		const paragraphs = document.querySelectorAll("p");
		paragraphs.forEach(paragraph => {
			expect(paragraph).toHaveClass("text-primary");
		});
	});

	it("should have proper accessibility structure", () => {
		render(<ContactPage />);

		// Check that main heading exists
		const mainHeading = screen.getByRole("heading", { level: 2 });
		expect(mainHeading).toBeInTheDocument();

		// Check that subheadings exist
		const h3Headings = screen.getAllByRole("heading", { level: 3 });
		expect(h3Headings).toHaveLength(2);

		const h4Headings = screen.getAllByRole("heading", { level: 4 });
		expect(h4Headings).toHaveLength(3);

		// Verify heading hierarchy (h2 followed by h3s and h4s)
		const allHeadings = screen.getAllByRole("heading");
		expect(allHeadings).toHaveLength(6); // 1 h2 + 2 h3s + 3 h4s
		expect(allHeadings[0].tagName).toBe("H2");
		expect(allHeadings[1].tagName).toBe("H3");
		expect(allHeadings[2].tagName).toBe("H4");
		expect(allHeadings[3].tagName).toBe("H4");
		expect(allHeadings[4].tagName).toBe("H4");
		expect(allHeadings[5].tagName).toBe("H3");
	});

	it("should have proper content structure and organization", () => {
		render(<ContactPage />);

		// Verify content flows logically
		const contentSection = document.querySelector("section");
		expect(contentSection).toBeInTheDocument();

		// Check content order: intro paragraph, sections with contact info, office hours, closing paragraph
		const paragraphs = contentSection!.querySelectorAll("p");
		expect(paragraphs.length).toBeGreaterThan(5); // Multiple paragraphs for different sections

		const h3Headings = contentSection!.querySelectorAll("h3");
		expect(h3Headings).toHaveLength(2); // Get In Touch + Office Hours

		const h4Headings = contentSection!.querySelectorAll("h4");
		expect(h4Headings).toHaveLength(3); // Support + General Inquiries + Feedback

		const list = contentSection!.querySelector("ul");
		expect(list).toBeInTheDocument();
		expect(list!.children).toHaveLength(3); // 3 office hour items
	});
});
