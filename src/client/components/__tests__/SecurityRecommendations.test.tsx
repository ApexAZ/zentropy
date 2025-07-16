import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
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
			render(
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
			render(
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
			render(
				<SecurityRecommendations
					securityStatus={mockHybridResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.queryByTestId("security-recommendation")).not.toBeInTheDocument();
		});
	});

	describe("User can learn about multi-factor authentication benefits", () => {
		it("should show educational content when user clicks learn more", async () => {
			const user = userEvent.setup();
			render(
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
			render(
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
			render(
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

	describe("User can dismiss recommendations gently", () => {
		it("should allow user to dismiss recommendation", async () => {
			const user = userEvent.setup();
			render(
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
			render(
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
			render(
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

	describe("User experiences accessible design", () => {
		it("should provide proper ARIA labels for screen readers", () => {
			render(
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
			render(
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
			render(
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

	describe("User sees appropriate recommendation urgency", () => {
		it("should show moderate urgency styling for email-only authentication", () => {
			render(
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
			render(
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
			render(
				<SecurityRecommendations
					securityStatus={mockEmailOnlyResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByText("🔒")).toBeInTheDocument(); // Security icon for moderate

			// Unmount and test critical
			render(
				<SecurityRecommendations
					securityStatus={mockNoAuthResponse}
					onDismiss={mockOnDismiss}
					onLearnMore={mockOnLearnMore}
				/>
			);

			expect(screen.getByText("⚠️")).toBeInTheDocument(); // Warning icon for critical
		});
	});

	describe("User receives non-pushy recommendations", () => {
		it("should use gentle, helpful language", () => {
			render(
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
			render(
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
			render(
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
});
