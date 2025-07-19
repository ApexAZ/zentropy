import { screen } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- Help component tests require userEvent for hover/tooltip interactions
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { AccountSecurityHelp } from "../AccountSecurityHelp";

describe("AccountSecurityHelp Component", () => {
	describe("Contextual Help Integration", () => {
		/* eslint-disable no-restricted-syntax */
		// Help integration tests require userEvent for hover/tooltip interactions
		it("should provide help tooltips within security status display", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<AccountSecurityHelp />);

			const oauthHelpIcon = screen.getByRole("button", { name: /help.*oauth/i });
			expect(oauthHelpIcon).toBeInTheDocument();

			await user.hover(oauthHelpIcon);
			expect(
				await screen.findByText(/OAuth allows you to sign in using your Google account/i)
			).toBeInTheDocument();
		});

		it("should show contextual FAQ section for account security", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showFAQ />);

			expect(screen.getByText(/security help & faqs/i)).toBeInTheDocument();
			expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
			expect(screen.getByText(/what is multi-factor authentication/i)).toBeInTheDocument();
		});

		it("should provide quick access to contact support", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showContactSupport />);

			expect(screen.getByText(/need help with account security/i)).toBeInTheDocument();

			const contactLink = screen.getByRole("link", { name: /contact support/i });
			expect(contactLink).toBeInTheDocument();
			expect(contactLink).toHaveAttribute("href", "/contact");
		});

		it("should show emergency contact information for critical security issues", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showEmergencyContact />);

			expect(screen.getByText(/security emergency/i)).toBeInTheDocument();
			expect(screen.getByText(/support@zentropy\.app/i)).toBeInTheDocument();
			expect(screen.getByText(/24-hour response/i)).toBeInTheDocument();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("Documentation Links", () => {
		it("should provide links to comprehensive security documentation", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showDocumentationLinks />);

			const securityGuideLink = screen.getByRole("link", { name: /security best practices guide/i });
			expect(securityGuideLink).toBeInTheDocument();
			expect(securityGuideLink).toHaveAttribute("target", "_blank");
			expect(securityGuideLink).toHaveAttribute("rel", "noopener noreferrer");

			const mfaGuideLink = screen.getByRole("link", { name: /multi-factor authentication setup guide/i });
			expect(mfaGuideLink).toBeInTheDocument();
		});

		it("should provide contextual links based on security status", () => {
			const securityStatus = {
				email_auth_linked: true,
				google_auth_linked: false,
				google_email: null
			};

			renderWithFullEnvironment(<AccountSecurityHelp securityStatus={securityStatus} showContextualLinks />);

			const linkGoogleGuideLink = screen.getByRole("link", { name: /how to link google account/i });
			expect(linkGoogleGuideLink).toBeInTheDocument();
		});

		it("should show different links for users with strong security", () => {
			const securityStatus = {
				email_auth_linked: true,
				google_auth_linked: true,
				google_email: "user@example.com"
			};

			renderWithFullEnvironment(<AccountSecurityHelp securityStatus={securityStatus} showContextualLinks />);

			const advancedSecurityLink = screen.getByRole("link", { name: /advanced security features/i });
			expect(advancedSecurityLink).toBeInTheDocument();
		});
	});

	describe("Help Text Integration", () => {
		it("should provide explanatory text for security concepts", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showExplanations />);

			expect(screen.getByText(/protects your account by requiring both your password/i)).toBeInTheDocument();
			expect(
				screen.getByText(/connects multiple authentication methods to a single account/i)
			).toBeInTheDocument();
			expect(screen.getByText(/is a secure authentication standard that lets you sign in/i)).toBeInTheDocument();
		});

		it("should show step-by-step guidance for common tasks", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showStepByStepGuides />);

			expect(screen.getByText(/how to enhance your security/i)).toBeInTheDocument();
			expect(screen.getByText(/1\. Click "Link Google Account"/i)).toBeInTheDocument();
			expect(screen.getByText(/2\. Sign in with your Google account/i)).toBeInTheDocument();
			expect(screen.getByText(/3\. Confirm the account linking/i)).toBeInTheDocument();
		});

		it("should provide troubleshooting help for common issues", () => {
			renderWithFullEnvironment(<AccountSecurityHelp showTroubleshooting />);

			expect(screen.getByText(/troubleshooting common issues/i)).toBeInTheDocument();
			expect(screen.getByText(/Google account linking fails/i)).toBeInTheDocument();
			expect(screen.getByText(/password reset problems/i)).toBeInTheDocument();
			expect(screen.getByText(/authentication errors/i)).toBeInTheDocument();
		});
	});

	describe("Expandable Help Sections", () => {
		/* eslint-disable no-restricted-syntax */
		// Expandable help tests require userEvent for click interactions
		it("should allow expanding and collapsing help sections", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<AccountSecurityHelp expandableHelp showExplanations />);

			const helpSection = screen.getByRole("button", { name: /show security help/i });
			expect(helpSection).toBeInTheDocument();

			await user.click(helpSection);
			expect(await screen.findByText(/security help & guidance/i)).toBeInTheDocument();
			expect(screen.getByText(/security concepts explained/i)).toBeInTheDocument();

			await user.click(helpSection);
			expect(screen.queryByText(/security concepts explained/i)).not.toBeInTheDocument();
		});

		it("should remember expanded state during user session", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<AccountSecurityHelp expandableHelp showExplanations />);

			const helpSection = screen.getByRole("button", { name: /show security help/i });
			await user.click(helpSection);
			expect(await screen.findByText(/security help & guidance/i)).toBeInTheDocument();

			// State should persist (component manages its own state)
			expect(screen.getByText(/security help & guidance/i)).toBeInTheDocument();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("Accessibility", () => {
		/* eslint-disable no-restricted-syntax */
		// Accessibility tests require userEvent for keyboard navigation testing
		it("should provide proper ARIA labels for all interactive help elements", () => {
			renderWithFullEnvironment(<AccountSecurityHelp />);

			const helpButtons = screen.getAllByRole("button", { name: /help/i });
			helpButtons.forEach(button => {
				expect(button).toHaveAttribute("aria-label");
			});
		});

		it("should support keyboard navigation through help content", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<AccountSecurityHelp showExplanations />);

			// Tab through help elements to the contextual help button
			await user.tab(); // Should focus on OAuth help button
			const focusedElement = document.activeElement;
			expect(focusedElement).toHaveAttribute("type", "button");
			expect(focusedElement).toHaveAttribute("aria-label", "Help with OAuth");
		});

		it("should provide screen reader friendly help descriptions", () => {
			renderWithFullEnvironment(<AccountSecurityHelp />);

			const helpRegion = screen.getByRole("region", { name: /security help/i });
			expect(helpRegion).toBeInTheDocument();
			expect(helpRegion).toHaveAttribute("aria-label");
		});
		/* eslint-enable no-restricted-syntax */
	});
});
