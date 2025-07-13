import React from "react";
import { render, screen } from "@testing-library/react";
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

	it("should display email-only authentication status correctly", () => {
		render(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

		// Should show email authentication as linked
		expect(screen.getByText("Email Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
		expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-success");

		// Should show Google authentication as not linked
		expect(screen.getByText("Google Authentication")).toBeInTheDocument();
		expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Not linked");
		expect(screen.getByTestId("google-auth-indicator")).toHaveClass("bg-neutral");

		// Should show default OAuth description
		expect(screen.getByText("OAuth-based authentication")).toBeInTheDocument();
	});

	it("should display hybrid authentication status correctly", () => {
		render(<AuthenticationStatusDisplay securityStatus={mockHybridResponse} />);

		// Should show both authentication methods as active
		expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Active");
		expect(screen.getByTestId("google-auth-status")).toHaveTextContent("Active");

		// Should show both indicators as success
		expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-success");
		expect(screen.getByTestId("google-auth-indicator")).toHaveClass("bg-success");

		// Should show linked Google email
		expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
	});

	it("should display correct accessibility attributes", () => {
		render(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

		// Check ARIA labels
		expect(screen.getByTestId("email-auth-status")).toHaveAttribute("aria-label", "Email authentication is active");
		expect(screen.getByTestId("google-auth-status")).toHaveAttribute(
			"aria-label",
			"Google authentication is not linked"
		);
	});

	it("should display correct styling for active vs inactive states", () => {
		render(<AuthenticationStatusDisplay securityStatus={mockEmailOnlyResponse} />);

		// Email auth should have success styling
		expect(screen.getByTestId("email-auth-status")).toHaveClass("bg-success-light", "text-success");

		// Google auth should have neutral styling
		expect(screen.getByTestId("google-auth-status")).toHaveClass("bg-neutral-light", "text-neutral");
	});

	it("should handle edge case where email auth is inactive", () => {
		const inactiveEmailResponse: AccountSecurityResponse = {
			email_auth_linked: false,
			google_auth_linked: false,
			google_email: undefined
		};

		render(<AuthenticationStatusDisplay securityStatus={inactiveEmailResponse} />);

		expect(screen.getByTestId("email-auth-status")).toHaveTextContent("Inactive");
		expect(screen.getByTestId("email-auth-indicator")).toHaveClass("bg-neutral");
	});
});
