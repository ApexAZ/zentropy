import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { OAuthConsentModal } from "../OAuthConsentModal";
import type { OAuthConsentResponse } from "../../types";

describe("OAuthConsentModal", () => {
	const mockConsentResponse: OAuthConsentResponse = {
		action: "consent_required",
		provider: "google",
		existing_email: "john@example.com",
		provider_display_name: "Google",
		security_context: {
			existing_auth_method: "email_password",
			provider_email_verified: true
		}
	};

	const mockOnConsentDecision = vi.fn();
	const mockOnClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Modal Rendering", () => {
		it("should not render when closed", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={false}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should not render when consent response is null", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={null}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("should render when open with consent response", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText("Link Google Account?")).toBeInTheDocument();
			expect(screen.getByText(/We found an existing account with the email/)).toBeInTheDocument();
			expect(screen.getAllByText("john@example.com").length).toBeGreaterThan(0);
		});
	});

	describe("Account Information Display", () => {
		it("should display current account details correctly", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.getByText("Current Account Details")).toBeInTheDocument();
			expect(screen.getAllByText("john@example.com").length).toBeGreaterThan(0);
			expect(screen.getByText("Email Password")).toBeInTheDocument(); // formatted from "email_password"
			expect(screen.getByText("Yes")).toBeInTheDocument(); // provider_email_verified: true
		});

		it("should display unverified email correctly", () => {
			const unverifiedResponse: OAuthConsentResponse = {
				...mockConsentResponse,
				security_context: {
					existing_auth_method: "google_oauth",
					provider_email_verified: false
				}
			};

			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={unverifiedResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.getByText("Google Oauth")).toBeInTheDocument(); // formatted from "google_oauth"
			expect(screen.getByText("No")).toBeInTheDocument(); // provider_email_verified: false
		});
	});

	describe("Options Display", () => {
		it("should display both consent options", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			// Link Accounts option
			expect(screen.getByText("Link Accounts (Recommended)")).toBeInTheDocument();
			expect(screen.getByText(/Use both password and Google to sign in/)).toBeInTheDocument();
			expect(screen.getByText(/Single account with multiple sign-in options/)).toBeInTheDocument();

			// Separate Account option
			expect(screen.getAllByText("Create Separate Account")).toHaveLength(2); // Heading and button
			expect(screen.getByText(/Keep Google account completely separate/)).toBeInTheDocument();
			expect(screen.getByText(/Two independent accounts with same email/)).toBeInTheDocument();
		});

		it("should display provider-specific text", () => {
			const microsoftResponse: OAuthConsentResponse = {
				...mockConsentResponse,
				provider: "microsoft",
				provider_display_name: "Microsoft"
			};

			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={microsoftResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.getByText("Link Microsoft Account?")).toBeInTheDocument();
			expect(screen.getByText(/Use both password and Microsoft to sign in/)).toBeInTheDocument();
			expect(screen.getByText(/Keep Microsoft account completely separate/)).toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onConsentDecision with true when linking accounts", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			const linkButton = screen.getByText("Link Accounts");
			fireEvent.click(linkButton);

			expect(mockOnConsentDecision).toHaveBeenCalledWith({
				consent_given: true,
				provider: "google",
				context: mockConsentResponse.security_context
			});
		});

		it("should call onConsentDecision with false when creating separate account", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			const separateButton = screen.getByRole("button", { name: "Create Separate Account" });
			fireEvent.click(separateButton);

			expect(mockOnConsentDecision).toHaveBeenCalledWith({
				consent_given: false,
				provider: "google",
				context: mockConsentResponse.security_context
			});
		});

		it("should call onClose when cancel button is clicked", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			const cancelButton = screen.getByText("Cancel");
			fireEvent.click(cancelButton);

			expect(mockOnClose).toHaveBeenCalled();
		});

		it("should not call onClose when loading", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
					loading={true}
				/>
			);

			const cancelButton = screen.getByText("Cancel");
			fireEvent.click(cancelButton);

			expect(mockOnClose).not.toHaveBeenCalled();
		});
	});

	describe("Loading States", () => {
		it("should disable buttons when loading", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
					loading={true}
				/>
			);

			expect(screen.getByText("Cancel")).toBeDisabled();
			expect(screen.getByRole("button", { name: "Create Separate Account" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Linking..." })).toBeDisabled();
		});

		it("should show loading text on primary button when loading", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
					loading={true}
				/>
			);

			// The Button component should show loading text when isLoading=true
			// Verify that the button shows "Linking..." instead of "Link Accounts"
			const linkButton = screen.getByRole("button", { name: "Linking..." });
			expect(linkButton).toBeDisabled();
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-labelledby", "oauth-consent-title");
			expect(dialog).toHaveAttribute("aria-describedby", "oauth-consent-description");

			expect(screen.getByText("Link Google Account?")).toHaveAttribute("id", "oauth-consent-title");
			expect(screen.getByText(/We found an existing account/).closest("p")).toHaveAttribute(
				"id",
				"oauth-consent-description"
			);
		});

		it("should be keyboard accessible", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			// All buttons should be focusable
			const buttons = screen.getAllByRole("button");
			buttons.forEach(button => {
				expect(button).not.toHaveAttribute("tabindex", "-1");
			});
		});
	});

	describe("Security Notice", () => {
		it("should display security information", () => {
			renderWithFullEnvironment(
				<OAuthConsentModal
					isOpen={true}
					consentResponse={mockConsentResponse}
					onConsentDecision={mockOnConsentDecision}
					onClose={mockOnClose}
				/>
			);

			expect(screen.getByText("Security Note:")).toBeInTheDocument();
			expect(screen.getByText(/Both options are secure/)).toBeInTheDocument();
			expect(screen.getByText(/Linking accounts is recommended/)).toBeInTheDocument();
		});
	});
});
