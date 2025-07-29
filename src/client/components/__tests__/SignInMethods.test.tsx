/**
 * SignInMethods Component Tests - Simplified & Focused
 *
 * This test file focuses on the core behaviors that are working and testable,
 * particularly the OAuth unlink to password setup flow that was implemented.
 *
 * Tests use Global Mock Architecture Level 1 (Module-Level Service Mocking).
 */

import React from "react";
import { screen } from "@testing-library/react";
import { vi, beforeEach, describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { SignInMethods } from "../SignInMethods";
import { renderWithFullEnvironment, fastUserActions, fastStateSync } from "../../__tests__/utils/testRenderUtils";
import type { AccountSecurityResponse } from "../../types";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("../../services/OAuthProviderService", () => ({
	OAuthProviderService: {
		linkProvider: vi.fn(),
		unlinkProvider: vi.fn()
	}
}));

vi.mock("../../hooks/useMultiProviderOAuth", () => ({
	useMultiProviderOAuth: vi.fn()
}));

import { useMultiProviderOAuth } from "../../hooks/useMultiProviderOAuth";

// =============================================================================
// TEST DATA
// =============================================================================

const mockOAuthProviders = [
	{ name: "google", displayName: "Google", enabled: true },
	{ name: "microsoft", displayName: "Microsoft", enabled: true },
	{ name: "github", displayName: "GitHub", enabled: true }
];

const mockUseMultiProviderOAuth = {
	providers: mockOAuthProviders,
	linkProvider: vi.fn(),
	unlinkProvider: vi.fn(),
	isProviderLinked: vi.fn(),
	getProviderState: vi.fn().mockReturnValue({
		isReady: true,
		isLoading: false,
		error: null
	})
};

// User with email auth + Google OAuth (typical mixed scenario)
const mockMixedAuthStatus: AccountSecurityResponse = {
	email_auth_linked: true,
	google_auth_linked: true,
	google_email: "user@example.com",
	oauth_providers: [
		{
			provider: "google",
			identifier: "user@example.com",
			linked: true
		}
	]
};

// OAuth-only user (no email auth)
const mockOAuthOnlyStatus: AccountSecurityResponse = {
	email_auth_linked: false,
	google_auth_linked: true,
	google_email: "oauth@example.com",
	oauth_providers: [
		{
			provider: "google",
			identifier: "oauth@example.com",
			linked: true
		}
	]
};

// =============================================================================
// TESTS
// =============================================================================

describe("SignInMethods - Core Behaviors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useMultiProviderOAuth as any).mockReturnValue(mockUseMultiProviderOAuth);

		// Default: Google is linked
		mockUseMultiProviderOAuth.isProviderLinked.mockImplementation((provider: string) => {
			return provider === "google";
		});
	});

	describe("Component Structure", () => {
		it("should render main sections and headers", async () => {
			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={mockMixedAuthStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			expect(screen.getByText("Sign-In Methods")).toBeInTheDocument();
			expect(screen.getByText("Manage how you access your account")).toBeInTheDocument();
			expect(screen.getByText("Active Sign-in Methods (2)")).toBeInTheDocument();
			expect(screen.getByText("Available Methods")).toBeInTheDocument();

			testEnv.cleanup();
		});

		it("should show email auth and OAuth provider in active methods", async () => {
			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={mockMixedAuthStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Email auth should be active
			expect(screen.getByText("Email & Password")).toBeInTheDocument();
			expect(screen.getByText("Primary method")).toBeInTheDocument();
			expect(screen.getByText("Change Password")).toBeInTheDocument();

			// Google should be active
			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByText("Linked (user@example.com)")).toBeInTheDocument();
			expect(screen.getByText("Unlink")).toBeInTheDocument();

			testEnv.cleanup();
		});
	});

	describe("OAuth-Only User Scenarios", () => {
		it("should show email auth as available for OAuth-only users", async () => {
			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={mockOAuthOnlyStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Only 1 active method (Google OAuth)
			expect(screen.getByText("Active Sign-in Methods (1)")).toBeInTheDocument();

			// Email auth should be in Available Methods
			expect(screen.getByText("Email & Password")).toBeInTheDocument();
			expect(screen.getByText("Not set up")).toBeInTheDocument();
			expect(screen.getByText("Set up")).toBeInTheDocument();

			testEnv.cleanup();
		});
	});

	describe("Security Validation", () => {
		it("should prevent unlinking the last authentication method", async () => {
			// OAuth-only user with single provider
			const singleProviderStatus: AccountSecurityResponse = {
				email_auth_linked: false,
				google_auth_linked: true,
				google_email: "single@example.com",
				oauth_providers: [
					{
						provider: "google",
						identifier: "single@example.com",
						linked: true
					}
				]
			};

			const mockOnError = vi.fn();
			const testEnv = renderWithFullEnvironment(
				<SignInMethods
					securityStatus={singleProviderStatus}
					onSecurityUpdate={vi.fn()}
					onError={mockOnError}
				/>,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Try to unlink the only authentication method
			const unlinkButton = screen.getByText("Unlink");
			fastUserActions.click(unlinkButton);
			await fastStateSync();

			// Should call onError with appropriate message
			expect(mockOnError).toHaveBeenCalledWith(
				"You can't unlink your only authentication method. Set up email authentication first to safely remove OAuth providers."
			);

			testEnv.cleanup();
		});
	});

	describe("Provider Display", () => {
		it("should show unlinked providers in available methods", async () => {
			// Mock only Google as linked, others unlinked
			mockUseMultiProviderOAuth.isProviderLinked.mockImplementation((provider: string) => {
				return provider === "google"; // Only Google is linked
			});

			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={mockMixedAuthStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Should show unlinked providers in Available Methods
			expect(screen.getByText("Microsoft")).toBeInTheDocument();
			expect(screen.getByText("GitHub")).toBeInTheDocument();

			// Should have Connect buttons for unlinked providers
			const connectButtons = screen.getAllByText("Connect");
			expect(connectButtons.length).toBeGreaterThan(0);

			testEnv.cleanup();
		});

		it("should handle missing provider email gracefully", async () => {
			const noEmailStatus: AccountSecurityResponse = {
				email_auth_linked: true,
				google_auth_linked: true,
				google_email: undefined,
				oauth_providers: [
					{
						provider: "google",
						identifier: "",
						linked: true
					}
				]
			};

			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={noEmailStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Should show "Linked" without email when email is missing
			expect(screen.getByText("Linked")).toBeInTheDocument();

			testEnv.cleanup();
		});
	});

	describe("User Interface Behaviors", () => {
		it("should render provider icons as SVG elements", async () => {
			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={mockMixedAuthStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Should render Google provider
			expect(screen.getByText("Google")).toBeInTheDocument();

			// Should have SVG icons in DOM
			const svgElements = document.querySelectorAll('svg[width="18"][height="18"]');
			expect(svgElements.length).toBeGreaterThan(0);

			testEnv.cleanup();
		});

		it("should handle empty oauth_providers array gracefully", async () => {
			const emptyProvidersStatus: AccountSecurityResponse = {
				email_auth_linked: true,
				google_auth_linked: false,
				google_email: undefined,
				oauth_providers: []
			};

			const testEnv = renderWithFullEnvironment(
				<SignInMethods securityStatus={emptyProvidersStatus} onSecurityUpdate={vi.fn()} onError={vi.fn()} />,
				{ providers: { toast: true } }
			);

			await fastStateSync();

			// Should still render available OAuth providers
			expect(screen.getByText("Available Methods")).toBeInTheDocument();

			testEnv.cleanup();
		});
	});
});
