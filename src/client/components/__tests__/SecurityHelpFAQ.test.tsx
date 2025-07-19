import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- SecurityHelpFAQ tests require userEvent for keyboard navigation accessibility testing
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { SecurityHelpFAQ } from "../SecurityHelpFAQ";

describe("SecurityHelpFAQ Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const expandFAQ = (questionText: string | RegExp) => {
		const questionButton = screen.getByRole("button", { name: questionText });
		fireEvent.click(questionButton);
		return questionButton;
	};

	const findFAQButton = (questionText: string | RegExp) => {
		return screen.getByRole("button", { name: questionText });
	};
	describe("FAQ Questions Display", () => {
		it("should display frequently asked questions about account security", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
			expect(screen.getByText(/what is multi-factor authentication/i)).toBeInTheDocument();
			expect(screen.getByText(/why should i link my google account/i)).toBeInTheDocument();
			expect(screen.getByText(/can i remove google authentication later/i)).toBeInTheDocument();
			expect(screen.getByText(/what happens if i lose access to my google account/i)).toBeInTheDocument();
		});

		it("should show expandable FAQ answers when clicked", async () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expandFAQ(/what is multi-factor authentication/i);

			expect(
				await screen.findByText(/Multi-factor authentication \(MFA\) adds an extra layer of security/i)
			).toBeInTheDocument();
			expect(screen.getByText(/even if someone steals your password/i)).toBeInTheDocument();
		});

		it("should show Google account benefits when FAQ is expanded", async () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expandFAQ(/why should i link my google account/i);

			expect(
				await screen.findByText(/linking your Google account provides several benefits/i)
			).toBeInTheDocument();
			expect(screen.getByText(/convenient one-click sign-in/i)).toBeInTheDocument();
			expect(screen.getByText(/backup authentication method/i)).toBeInTheDocument();
		});

		it("should provide guidance for account recovery scenarios", async () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expandFAQ(/what happens if i lose access to my google account/i);

			expect(await screen.findByText(/if you lose access to your Google account/i)).toBeInTheDocument();
			expect(screen.getByText(/you can still sign in using your email and password/i)).toBeInTheDocument();
			expect(screen.getByText(/contact our support team for assistance/i)).toBeInTheDocument();
		});

		it("should allow collapsing expanded FAQ answers", async () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const mfaQuestion = findFAQButton(/what is multi-factor authentication/i);

			// Expand the answer
			fireEvent.click(mfaQuestion);
			expect(
				await screen.findByText(/Multi-factor authentication \(MFA\) adds an extra layer of security/i)
			).toBeInTheDocument();

			// Collapse the answer
			fireEvent.click(mfaQuestion);
			expect(
				screen.queryByText(/Multi-factor authentication \(MFA\) adds an extra layer of security/i)
			).not.toBeInTheDocument();
		});
	});

	describe("Contact Support Integration", () => {
		it("should provide contact support options for unresolved issues", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expect(screen.getByText(/need more help/i)).toBeInTheDocument();

			const contactSupportLink = screen.getByRole("link", { name: /contact our support team/i });
			expect(contactSupportLink).toBeInTheDocument();
			expect(contactSupportLink).toHaveAttribute("href", "/contact");
		});

		it("should show emergency contact information for critical account issues", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			expect(screen.getByText(/account security emergency/i)).toBeInTheDocument();
			expect(screen.getByText(/support@zentropy\.app/i)).toBeInTheDocument();
		});

		it("should provide direct links to specific help topics", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const securityGuideLink = screen.getByRole("link", { name: /comprehensive security guide/i });
			expect(securityGuideLink).toBeInTheDocument();
			expect(securityGuideLink).toHaveAttribute("target", "_blank");
			expect(securityGuideLink).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing comprehensive keyboard navigation accessibility features
	describe("Accessibility", () => {
		it("should support keyboard navigation for FAQ expansion", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const mfaQuestion = findFAQButton(/what is multi-factor authentication/i);

			await user.tab();
			expect(mfaQuestion).toHaveFocus();

			await user.keyboard("{Enter}");
			expect(
				await screen.findByText(/Multi-factor authentication \(MFA\) adds an extra layer of security/i)
			).toBeInTheDocument();
		});

		it("should have proper ARIA attributes for expandable content", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const mfaQuestion = findFAQButton(/what is multi-factor authentication/i);
			expect(mfaQuestion).toHaveAttribute("aria-expanded", "false");
			expect(mfaQuestion).toHaveAttribute("aria-controls");
		});

		it("should update ARIA attributes when FAQ is expanded", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const mfaQuestion = expandFAQ(/what is multi-factor authentication/i);
			expect(mfaQuestion).toHaveAttribute("aria-expanded", "true");
		});

		it("should provide proper heading structure for screen readers", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ />);

			const mainHeading = screen.getByRole("heading", { name: /frequently asked questions/i });
			expect(mainHeading).toBeInTheDocument();

			const faqHeadings = screen.getAllByRole("heading", { level: 4 });
			expect(faqHeadings.length).toBeGreaterThan(0);
		});
	});
	/* eslint-enable no-restricted-syntax */

	describe("Search and Filtering", () => {
		it("should allow searching through FAQ content", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ searchable />);

			const searchInput = screen.getByLabelText(/search faqs/i);
			expect(searchInput).toBeInTheDocument();

			fireEvent.change(searchInput, { target: { value: "multi-factor" } });
			expect(screen.getByText(/what is multi-factor authentication/i)).toBeInTheDocument();
			expect(screen.queryByText(/why should i link my google account/i)).not.toBeInTheDocument();
		});

		it("should show no results message when search finds nothing", () => {
			renderWithFullEnvironment(<SecurityHelpFAQ searchable />);

			const searchInput = screen.getByLabelText(/search faqs/i);
			fireEvent.change(searchInput, { target: { value: "nonexistent topic" } });

			expect(screen.getByText(/no matching questions found/i)).toBeInTheDocument();
		});
	});
});
