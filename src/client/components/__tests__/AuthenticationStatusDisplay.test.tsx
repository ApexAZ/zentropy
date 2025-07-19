import React from "react";
import { screen } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { AuthenticationStatusDisplay } from "../AuthenticationStatusDisplay";
import type { AccountSecurityResponse } from "../../types";

describe("AuthenticationStatusDisplay", () => {
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

	describe("User can immediately understand their authentication status", () => {
		it("should show 'Email Only' badge for email-only authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			const providerBadge = screen.getByTestId("auth-provider-badge");
			expect(providerBadge).toHaveTextContent("Email Only");
			expect(providerBadge).toHaveClass("bg-warning-light", "text-warning");
		});

		it("should show 'Email + Google' badge for hybrid authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

			const providerBadge = screen.getByTestId("auth-provider-badge");
			expect(providerBadge).toHaveTextContent("Email + Google");
			expect(providerBadge).toHaveClass("bg-success-light", "text-success");
		});

		it("should show 'No Authentication' badge when no methods are active", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockNoAuthResponse} />);

			const providerBadge = screen.getByTestId("auth-provider-badge");
			expect(providerBadge).toHaveTextContent("No Authentication");
			expect(providerBadge).toHaveClass("bg-error-light", "text-error");
		});
	});

	describe("User sees security strength indicators", () => {
		it("should show 'Strong Security' for hybrid authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

			const strengthBadge = screen.getByTestId("security-strength-badge");
			expect(strengthBadge).toHaveTextContent("Strong Security");
			expect(strengthBadge).toHaveClass("bg-success-light", "text-success");
		});

		it("should show 'Moderate Security' for email-only authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			const strengthBadge = screen.getByTestId("security-strength-badge");
			expect(strengthBadge).toHaveTextContent("Moderate Security");
			expect(strengthBadge).toHaveClass("bg-warning-light", "text-warning");
		});

		it("should show 'Weak Security' when no authentication methods are active", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockNoAuthResponse} />);

			const strengthBadge = screen.getByTestId("security-strength-badge");
			expect(strengthBadge).toHaveTextContent("Weak Security");
			expect(strengthBadge).toHaveClass("bg-error-light", "text-error");
		});
	});

	describe("User gets helpful security recommendations", () => {
		it("should show security tip for email-only authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			expect(screen.getByText("Security Tip:")).toBeInTheDocument();
			expect(screen.getByText(/Consider adding Google authentication for enhanced security/)).toBeInTheDocument();
		});

		it("should show security tip for no authentication", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockNoAuthResponse} />);

			expect(screen.getByText("Security Tip:")).toBeInTheDocument();
			expect(screen.getByText(/Enable authentication methods to secure your account/)).toBeInTheDocument();
		});

		it("should not show security tip for strong security", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

			expect(screen.queryByText("Security Tip:")).not.toBeInTheDocument();
		});
	});

	describe("User gets helpful explanations through tooltips", () => {
		it("should provide helpful tooltip for provider badge", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			const providerBadge = screen.getByTestId("auth-provider-badge");
			expect(providerBadge).toHaveAttribute("title", "Email and password authentication only");
		});

		it("should provide helpful tooltip for security strength badge", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

			const strengthBadge = screen.getByTestId("security-strength-badge");
			expect(strengthBadge).toHaveAttribute(
				"title",
				"Multiple authentication methods provide excellent security"
			);
		});

		it("should provide helpful tooltips for authentication status indicators", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			const emailIndicator = screen.getByTestId("email-auth-indicator");
			expect(emailIndicator).toHaveAttribute("title", "Email authentication is enabled");

			const googleIndicator = screen.getByTestId("google-auth-indicator");
			expect(googleIndicator).toHaveAttribute("title", "Google authentication is disabled");
		});

		it("should provide helpful tooltips for status badges", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			const emailStatus = screen.getByTestId("email-auth-status");
			expect(emailStatus).toHaveAttribute(
				"title",
				"Email authentication: Your account can be accessed with email and password"
			);

			const googleStatus = screen.getByTestId("google-auth-status");
			expect(googleStatus).toHaveAttribute(
				"title",
				"Google authentication: Google authentication is not configured"
			);
		});
	});

	describe("User has accessible experience", () => {
		it("should provide comprehensive ARIA labels for screen readers", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			// Check provider badge accessibility
			const providerBadge = screen.getByTestId("auth-provider-badge");
			expect(providerBadge).toHaveAttribute(
				"aria-label",
				"Authentication provider: Email Only. Email and password authentication only"
			);

			// Check security strength badge accessibility
			const strengthBadge = screen.getByTestId("security-strength-badge");
			expect(strengthBadge).toHaveAttribute(
				"aria-label",
				"Security strength: Moderate Security. Consider adding Google authentication for enhanced security"
			);

			// Check individual authentication status accessibility
			expect(screen.getByTestId("email-auth-status")).toHaveAttribute(
				"aria-label",
				"Email authentication is active"
			);
			expect(screen.getByTestId("google-auth-status")).toHaveAttribute(
				"aria-label",
				"Google authentication is not linked"
			);
		});

		it("should use semantic HTML structure with proper headings", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			// Should have proper heading hierarchy
			expect(screen.getByRole("heading", { level: 3, name: "Authentication Status" })).toBeInTheDocument();
			expect(screen.getByRole("heading", { level: 4, name: "Email Authentication" })).toBeInTheDocument();
			expect(screen.getByRole("heading", { level: 4, name: "Google Authentication" })).toBeInTheDocument();
		});

		it("should provide meaningful color contrast and visual hierarchy", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			// Success states should use success colors
			expect(screen.getByTestId("email-auth-status")).toHaveClass("bg-success-light", "text-success");
			expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-success");

			// Neutral states should use neutral colors
			expect(screen.getByTestId("google-auth-status")).toHaveClass("bg-neutral-light", "text-neutral");
			expect(screen.getByTestId("google-auth-indicator")).toHaveClass("bg-neutral");

			// Provider badge should use warning colors for email-only
			expect(screen.getByTestId("auth-provider-badge")).toHaveClass("bg-warning-light", "text-warning");
		});
	});

	describe("User understands individual authentication methods", () => {
		it("should display email authentication details correctly", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			expect(screen.getByText("Email Authentication")).toBeInTheDocument();
			expect(screen.getByText("Password-based authentication")).toBeInTheDocument();
			expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
		});

		it("should display Google authentication details correctly", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

			expect(screen.getByText("Google Authentication")).toBeInTheDocument();
			expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
			expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");
		});

		it("should show generic OAuth description when Google is not linked", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			expect(screen.getByText("OAuth-based authentication")).toBeInTheDocument();
		});
	});

	describe("User sees consistent visual design", () => {
		it("should use consistent badge styling across all status indicators", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			// All badges should have consistent rounded-full styling
			expect(screen.getByTestId("auth-provider-badge")).toHaveClass(
				"rounded-full",
				"px-3",
				"py-1",
				"text-sm",
				"font-medium"
			);
			expect(screen.getByTestId("security-strength-badge")).toHaveClass(
				"rounded-full",
				"px-3",
				"py-1",
				"text-sm",
				"font-medium"
			);
			expect(screen.getByTestId("email-auth-status")).toHaveClass(
				"rounded-full",
				"px-3",
				"py-1",
				"text-sm",
				"font-medium"
			);
			expect(screen.getByTestId("google-auth-status")).toHaveClass(
				"rounded-full",
				"px-3",
				"py-1",
				"text-sm",
				"font-medium"
			);
		});

		it("should use consistent spacing and layout", () => {
			renderWithFullEnvironment(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

			// Should find the main container with proper spacing
			const container = screen.getByTestId("auth-provider-badge").parentElement;
			expect(container).toHaveClass("flex", "items-center", "space-x-3");
		});
	});
});
