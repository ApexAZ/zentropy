import React from "react";
import { screen } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- SecurityRecommendations tests require userEvent for keyboard navigation accessibility testing
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { SecurityRecommendations } from "../SecurityRecommendations";
import type { AccountSecurityResponse } from "../../types";

describe("SecurityRecommendations", () => {
	const mockEmailOnlyResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: false,
		google_email: undefined
	};

	const mockHybridResponse: AccountSecurityResponse = {
		email_auth_linked: true,
		google_auth_linked: true,
		google_email: "john@gmail.com"
	};

	const mockNoAuthResponse: AccountSecurityResponse = {
		email_auth_linked: false,
		google_auth_linked: false,
		google_email: undefined
	};

	const mockOnDismiss = vi.fn();
	const mockOnLearnMore = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("User sees helpful security recommendations", () => {
		it("should show recommendation to add Google authentication for email-only users", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByTestId("security-recommendation")).toBeInTheDocument();
			expect(screen.getByText(/Enhance your account security/)).toBeInTheDocument();
			expect(screen.getByText(/Add Google authentication/)).toBeInTheDocument();
		});

		it("should show critical recommendation for users with no authentication", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockNoAuthResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByTestId("security-recommendation")).toBeInTheDocument();
			expect(screen.getByText(/Secure your account/)).toBeInTheDocument();
			expect(screen.getByText(/Enable authentication/)).toBeInTheDocument();
		});

		it("should not show recommendations for users with strong security", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockHybridResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.queryByTestId("security-recommendation")).not.toBeInTheDocument();
		});
	});

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing interactive educational content and user engagement workflows
	describe("User can learn about multi-factor authentication benefits", () => {
		it("should show educational content when user clicks learn more", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const learnMoreButton = screen.getByRole("button", { name: /learn more/i });
			await user.click(learnMoreButton);

			expect(mockOnLearnMore).toHaveBeenCalled();
			expect(screen.getByTestId("educational-content")).toBeInTheDocument();
			expect(screen.getByText(/Multi-factor authentication/)).toBeInTheDocument();
			expect(screen.getByText(/protects your account/)).toBeInTheDocument();
		});

		it("should show specific MFA benefits for email-only users", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const learnMoreButton = screen.getByRole("button", { name: /learn more/i });
			await user.click(learnMoreButton);

			expect(screen.getByText(/Even if your password is compromised/)).toBeInTheDocument();
			expect(screen.getByText(/Alternative sign-in option/)).toBeInTheDocument();
			expect(screen.getByText(/Industry-standard security practice/)).toBeInTheDocument();
		});

		it("should collapse educational content when user clicks collapse", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			// Expand first
			const learnMoreButton = screen.getByRole("button", { name: /learn more/i });
			await user.click(learnMoreButton);
			expect(screen.getByTestId("educational-content")).toBeInTheDocument();

			// Then collapse
			const collapseButton = screen.getByRole("button", { name: /show less/i });
			await user.click(collapseButton);
			expect(screen.queryByTestId("educational-content")).not.toBeInTheDocument();
		});
	});
	/* eslint-enable no-restricted-syntax */

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing recommendation dismissal workflows
	describe("User can dismiss recommendations gently", () => {
		it("should allow user to dismiss recommendation", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const dismissButton = screen.getByRole("button", { name: /dismiss/i });
			await user.click(dismissButton);

			expect(mockOnDismiss).toHaveBeenCalledWith("email-only-mfa");
		});

		it("should show 'remind me later' option for gentle dismissal", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByRole("button", { name: /remind me later/i })).toBeInTheDocument();
		});

		it("should call onDismiss with postpone flag when user clicks remind me later", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const postponeButton = screen.getByRole("button", { name: /remind me later/i });
			await user.click(postponeButton);

			expect(mockOnDismiss).toHaveBeenCalledWith("email-only-mfa", true);
		});
	});
	/* eslint-enable no-restricted-syntax */

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing keyboard navigation accessibility features
	describe("User experiences accessible design", () => {
		it("should provide proper ARIA labels for screen readers", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const recommendation = screen.getByTestId("security-recommendation");
			expect(recommendation).toHaveAttribute("role", "alert");
			expect(recommendation).toHaveAttribute("aria-live", "polite");
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			// Tab through interactive elements
			await user.tab();
			expect(screen.getByRole("button", { name: /learn more/i })).toHaveFocus();

			await user.tab();
			expect(screen.getByRole("button", { name: /remind me later/i })).toHaveFocus();

			await user.tab();
			expect(screen.getByRole("button", { name: /dismiss/i })).toHaveFocus();
		});

		it("should have proper semantic structure", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
			expect(screen.getByRole("region")).toBeInTheDocument();
		});
	});
	/* eslint-enable no-restricted-syntax */

	describe("User sees appropriate recommendation urgency", () => {
		it("should show moderate urgency styling for email-only authentication", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const recommendation = screen.getByTestId("security-recommendation");
			expect(recommendation).toHaveClass("border-warning");
		});

		it("should show high urgency styling for no authentication", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockNoAuthResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const recommendation = screen.getByTestId("security-recommendation");
			expect(recommendation).toHaveClass("border-error");
		});

		it("should use appropriate icons for different security levels", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByText("🔒")).toBeInTheDocument(); // Security icon for moderate

			// Unmount and test critical
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockNoAuthResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByText("⚠️")).toBeInTheDocument(); // Warning icon for critical
		});
	});

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing value proposition and user engagement features
	describe("User receives non-pushy recommendations", () => {
		it("should use gentle, helpful language", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			// Should use encouraging language, not demanding
			expect(screen.getByText(/enhance your account security/i)).toBeInTheDocument();
			expect(screen.queryByText(/you must/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
		});

		it("should emphasize benefits rather than risks", () => {
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByText(/extra layer of protection/i)).toBeInTheDocument();
			expect(screen.getByText(/convenience/i)).toBeInTheDocument();
		});

		it("should provide clear value proposition", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			const learnMoreButton = screen.getByRole("button", { name: /learn more/i });
			await user.click(learnMoreButton);

			expect(screen.getByText(/takes less than 1 minute/i)).toBeInTheDocument();
			expect(screen.getByText(/one-click setup/i)).toBeInTheDocument();
		});
	});
	/* eslint-enable no-restricted-syntax */
});
