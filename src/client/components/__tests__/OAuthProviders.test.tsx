import React from "react";
import { screen, cleanup } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
// eslint-disable-next-line no-restricted-imports -- OAuth provider tests require userEvent for keyboard navigation and complex authentication workflows
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import OAuthProviders from "../OAuthProviders";
import { useGoogleOAuth } from "../../hooks/useGoogleOAuth";

// Mock the useGoogleOAuth hook
vi.mock("../../hooks/useGoogleOAuth", () => ({
	useGoogleOAuth: vi.fn()
}));

const mockUseGoogleOAuth = vi.mocked(useGoogleOAuth);

describe("OAuthProviders", () => {
	const mockOnGoogleSignIn = vi.fn();
	const mockTriggerOAuth = vi.fn();

	const defaultHookReturn = {
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: mockTriggerOAuth,
		clearError: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseGoogleOAuth.mockReturnValue(defaultHookReturn);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		cleanup();
	});

	describe("Component Rendering", () => {
		it("should render OAuth providers with instructions", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Check main instruction text
			expect(screen.getByText("Continue with your preferred account")).toBeInTheDocument();

			// Check all OAuth provider buttons are present
			expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /microsoft \(coming soon\)/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /github \(coming soon\)/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /apple \(coming soon\)/i })).toBeInTheDocument();

			// Check divider text
			expect(screen.getByText("or continue with email")).toBeInTheDocument();
		});

		it("should render with correct grid layout for 4 providers", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Check that the grid container has correct classes
			const gridContainer = screen.getByRole("button", { name: /continue with google/i }).parentElement;
			expect(gridContainer).toHaveClass("grid", "grid-cols-4", "gap-3");
		});

		it("should render Google logo SVG when not loading", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			const googleLogo = googleButton.querySelector("svg");
			expect(googleLogo).toBeInTheDocument();
			expect(googleLogo).toHaveAttribute("width", "24");
			expect(googleLogo).toHaveAttribute("height", "24");
		});
	});

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing OAuth authentication workflows with real user interactions
	describe("Google OAuth Integration", () => {
		it("should call triggerOAuth when Google button is clicked", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			await user.click(googleButton);

			expect(mockTriggerOAuth).toHaveBeenCalledOnce();
		});

		it("should call onGoogleSignIn when OAuth succeeds", () => {
			const mockCredential = "mock-credential-token";

			// Mock the hook to simulate successful OAuth
			mockUseGoogleOAuth.mockImplementation(({ onSuccess }) => {
				// Simulate successful OAuth by calling onSuccess immediately
				onSuccess(mockCredential);
				return defaultHookReturn;
			});

			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Verify the callback was called with transformed credential response
			expect(mockOnGoogleSignIn).toHaveBeenCalledWith({
				credential: mockCredential
			});
		});

		it("should handle OAuth without onGoogleSignIn callback", () => {
			const mockCredential = "mock-credential-token";

			// Mock the hook to simulate successful OAuth
			mockUseGoogleOAuth.mockImplementation(({ onSuccess }) => {
				onSuccess(mockCredential);
				return defaultHookReturn;
			});

			// Render without onGoogleSignIn prop
			expect(() => {
				renderWithFullEnvironment(<OAuthProviders />);
			}).not.toThrow();
		});

		it("should log error when OAuth fails", () => {
			const mockError = "OAuth failed";
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			// Mock the hook to simulate OAuth error
			mockUseGoogleOAuth.mockImplementation(({ onError }) => {
				onError?.(mockError);
				return defaultHookReturn;
			});

			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			expect(consoleSpy).toHaveBeenCalledWith("Google OAuth error in OAuthProviders:", mockError);
			consoleSpy.mockRestore();
		});
	});
	/* eslint-enable no-restricted-syntax */

	describe("Button States", () => {
		it("should disable Google button when disabled prop is true", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} disabled={true} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toBeDisabled();
		});

		it("should disable Google button when not ready", () => {
			mockUseGoogleOAuth.mockReturnValue({
				...defaultHookReturn,
				isReady: false
			});

			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toBeDisabled();
		});

		it("should show loading state when OAuth is in progress", () => {
			mockUseGoogleOAuth.mockReturnValue({
				...defaultHookReturn,
				isLoading: true
			});

			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /signing in with google/i });
			expect(googleButton).toBeDisabled();

			// Check loading spinner is present
			const loadingSpinner = googleButton.querySelector(".animate-spin");
			expect(loadingSpinner).toBeInTheDocument();

			// Check Google logo is not present during loading
			const googleLogo = googleButton.querySelector("svg path");
			expect(googleLogo).not.toBeInTheDocument();
		});

		it("should show error state when OAuth has error", () => {
			const mockError = "OAuth initialization failed";
			mockUseGoogleOAuth.mockReturnValue({
				...defaultHookReturn,
				error: mockError
			});

			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: `Google Sign-In Error: ${mockError}` });
			expect(googleButton).toBeDisabled();
			expect(googleButton).toHaveAttribute("title", `Google Sign-In Error: ${mockError}`);
		});
	});

	describe("Coming Soon Providers", () => {
		it("should render Microsoft provider as disabled with coming soon label", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const microsoftButton = screen.getByRole("button", { name: /microsoft \(coming soon\)/i });
			expect(microsoftButton).toBeDisabled();
			expect(microsoftButton).toHaveClass("cursor-not-allowed", "opacity-50");
			expect(microsoftButton).toHaveAttribute("title", "Microsoft (Coming Soon)");
		});

		it("should render GitHub provider as disabled with coming soon label", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const githubButton = screen.getByRole("button", { name: /github \(coming soon\)/i });
			expect(githubButton).toBeDisabled();
			expect(githubButton).toHaveClass("cursor-not-allowed", "opacity-50");
			expect(githubButton).toHaveAttribute("title", "GitHub (Coming Soon)");
		});

		it("should render Apple provider as disabled with coming soon label", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const appleButton = screen.getByRole("button", { name: /apple \(coming soon\)/i });
			expect(appleButton).toBeDisabled();
			expect(appleButton).toHaveClass("cursor-not-allowed", "opacity-50");
			expect(appleButton).toHaveAttribute("title", "Apple (Coming Soon)");
		});

		it("should render provider logos for all coming soon providers", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Check Microsoft logo
			const microsoftButton = screen.getByRole("button", { name: /microsoft \(coming soon\)/i });
			const microsoftLogo = microsoftButton.querySelector("svg");
			expect(microsoftLogo).toBeInTheDocument();

			// Check GitHub logo
			const githubButton = screen.getByRole("button", { name: /github \(coming soon\)/i });
			const githubLogo = githubButton.querySelector("svg");
			expect(githubLogo).toBeInTheDocument();

			// Check Apple logo
			const appleButton = screen.getByRole("button", { name: /apple \(coming soon\)/i });
			const appleLogo = appleButton.querySelector("svg");
			expect(appleLogo).toBeInTheDocument();
		});
	});

	/* eslint-disable no-restricted-syntax */
	// This section requires userEvent for testing keyboard navigation accessibility features
	describe("User Experience", () => {
		it("should provide clear visual feedback for different button states", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });

			// Check enabled state styling
			expect(googleButton).toHaveClass(
				"bg-content-background",
				"hover:bg-layout-background",
				"border-layout-background",
				"text-text-primary"
			);

			// Check hover effects
			expect(googleButton).toHaveClass("hover:-translate-y-px", "hover:shadow-md");
		});

		it("should maintain accessibility with proper ARIA labels", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).toHaveAttribute("aria-label", "Continue with Google");
			expect(googleButton).toHaveAttribute("title", "Continue with Google");
		});

		it("should handle keyboard navigation properly", async () => {
			const user = userEvent.setup();
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const googleButton = screen.getByRole("button", { name: /continue with google/i });

			// Focus the button using Tab
			await user.tab();
			expect(googleButton).toHaveFocus();

			// Activate using Enter
			await user.keyboard("{Enter}");
			expect(mockTriggerOAuth).toHaveBeenCalledOnce();
		});
	});
	/* eslint-enable no-restricted-syntax */

	describe("Hook Integration", () => {
		it("should pass correct props to useGoogleOAuth hook", () => {
			renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Verify hook was called with correct configuration
			expect(mockUseGoogleOAuth).toHaveBeenCalledWith({
				onSuccess: expect.any(Function),
				onError: expect.any(Function)
			});
		});

		it("should handle hook state changes correctly", () => {
			const { rerender } = renderWithFullEnvironment(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			// Initially ready
			const googleButton = screen.getByRole("button", { name: /continue with google/i });
			expect(googleButton).not.toBeDisabled();

			// Update hook to loading state
			mockUseGoogleOAuth.mockReturnValue({
				...defaultHookReturn,
				isLoading: true
			});

			rerender(<OAuthProviders onGoogleSignIn={mockOnGoogleSignIn} />);

			const loadingButton = screen.getByRole("button", { name: /signing in with google/i });
			expect(loadingButton).toBeDisabled();
		});
	});
});
