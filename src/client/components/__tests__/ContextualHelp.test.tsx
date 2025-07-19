// eslint-disable-next-line no-restricted-imports -- Testing edge case requires container.firstChild access
import { screen, render } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- Accessibility tests require userEvent for hover/keyboard interactions
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { ContextualHelp } from "../ContextualHelp";

describe("ContextualHelp Component", () => {
	describe("Help Tooltips", () => {
		/* eslint-disable no-restricted-syntax */
		// Help tooltip tests require userEvent for hover interactions
		it("should display help tooltip for OAuth concept", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<ContextualHelp concept="oauth" />);

			const helpIcon = screen.getByRole("button", { name: /help.*oauth/i });
			expect(helpIcon).toBeInTheDocument();

			await user.hover(helpIcon);
			expect(
				await screen.findByText(/OAuth allows you to sign in using your Google account/i)
			).toBeInTheDocument();
		});

		it("should display help tooltip for Multi-Factor Authentication concept", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<ContextualHelp concept="mfa" />);

			const helpIcon = screen.getByRole("button", { name: /help.*multi-factor authentication/i });
			expect(helpIcon).toBeInTheDocument();

			await user.hover(helpIcon);
			expect(
				await screen.findByText(/Multi-factor authentication adds an extra layer of security/i)
			).toBeInTheDocument();
		});

		it("should display help tooltip for Account Linking concept", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<ContextualHelp concept="account-linking" />);

			const helpIcon = screen.getByRole("button", { name: /help.*account linking/i });
			expect(helpIcon).toBeInTheDocument();

			await user.hover(helpIcon);
			expect(
				await screen.findByText(/Account linking connects your Google account to your Zentropy account/i)
			).toBeInTheDocument();
		});

		it("should show accessible tooltip with proper ARIA attributes", async () => {
			renderWithFullEnvironment(<ContextualHelp concept="oauth" />);

			const helpIcon = screen.getByRole("button", { name: /help.*oauth/i });
			expect(helpIcon).toHaveAttribute("aria-describedby");
			expect(helpIcon).toHaveAttribute("title");
		});

		it("should show no help icon for unknown concepts", () => {
			const { container } = render(<ContextualHelp concept="unknown-concept" />);

			// Component should render nothing for unknown concepts
			expect(container.firstChild).toBeNull();
		});
		/* eslint-enable no-restricted-syntax */
	});

	describe("Documentation Links", () => {
		it("should provide contextual documentation link for security topics", () => {
			renderWithFullEnvironment(<ContextualHelp concept="oauth" showDocumentationLink />);

			const docLink = screen.getByRole("link", { name: /learn more about oauth/i });
			expect(docLink).toBeInTheDocument();
			expect(docLink).toHaveAttribute("href", expect.stringContaining("oauth"));
			expect(docLink).toHaveAttribute("target", "_blank");
			expect(docLink).toHaveAttribute("rel", "noopener noreferrer");
		});

		it("should provide contextual documentation link for MFA topics", () => {
			renderWithFullEnvironment(<ContextualHelp concept="mfa" showDocumentationLink />);

			const docLink = screen.getByRole("link", { name: /learn more about multi-factor authentication/i });
			expect(docLink).toBeInTheDocument();
			expect(docLink).toHaveAttribute("href", expect.stringContaining("multi-factor"));
		});

		it("should not show documentation link when showDocumentationLink is false", () => {
			renderWithFullEnvironment(<ContextualHelp concept="oauth" showDocumentationLink={false} />);

			const docLink = screen.queryByRole("link", { name: /learn more/i });
			expect(docLink).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		/* eslint-disable no-restricted-syntax */
		// Accessibility tests require userEvent for keyboard navigation and focus management
		it("should support keyboard navigation for help tooltips", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<ContextualHelp concept="oauth" />);

			const helpIcon = screen.getByRole("button", { name: /help.*oauth/i });

			await user.tab();
			expect(helpIcon).toHaveFocus();

			await user.keyboard("{Enter}");
			expect(
				await screen.findByText(/OAuth allows you to sign in using your Google account/i)
			).toBeInTheDocument();
		});

		it("should provide proper screen reader support", () => {
			renderWithFullEnvironment(<ContextualHelp concept="mfa" />);

			const helpIcon = screen.getByRole("button", { name: /help.*multi-factor authentication/i });
			expect(helpIcon).toHaveAttribute("aria-label");
			expect(helpIcon).toHaveAttribute("aria-describedby");
		});
		/* eslint-enable no-restricted-syntax */
	});
});
