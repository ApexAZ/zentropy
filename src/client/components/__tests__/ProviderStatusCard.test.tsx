import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import ProviderStatusCard from "../ProviderStatusCard";
import type { OAuthProvider } from "../../types";

const mockGoogleProvider: OAuthProvider = {
	name: "google",
	displayName: "Google",
	iconClass: "fab fa-google",
	brandColor: "#4285f4"
};

const mockMicrosoftProvider: OAuthProvider = {
	name: "microsoft",
	displayName: "Microsoft",
	iconClass: "fab fa-microsoft",
	brandColor: "#0078d4"
};

const mockGitHubProvider: OAuthProvider = {
	name: "github",
	displayName: "GitHub",
	iconClass: "fab fa-github",
	brandColor: "#333"
};

describe("ProviderStatusCard", () => {
	const mockOnLink = vi.fn();
	const mockOnUnlink = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("Provider Display", () => {
		it("should display Google provider information correctly", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link google/i })).toBeInTheDocument();
		});

		it("should display Microsoft provider information correctly", () => {
			render(
				<ProviderStatusCard
					provider={mockMicrosoftProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText("Microsoft")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link microsoft/i })).toBeInTheDocument();
		});

		it("should display GitHub provider information correctly", () => {
			render(
				<ProviderStatusCard
					provider={mockGitHubProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText("GitHub")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link github/i })).toBeInTheDocument();
		});
	});

	describe("Link/Unlink States", () => {
		it("should show link button when provider is not linked", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByRole("button", { name: /link google/i })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /unlink google/i })).not.toBeInTheDocument();
			expect(screen.queryByText(/✓ Linked/i)).not.toBeInTheDocument();
		});

		it("should show unlink button and status when provider is linked", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					providerEmail="test@example.com"
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByRole("button", { name: /unlink google/i })).toBeInTheDocument();
			expect(screen.queryByRole("button", { name: /^link google/i })).not.toBeInTheDocument();
			expect(screen.getByText(/✓ Linked/i)).toBeInTheDocument();
			expect(screen.getByText("(test@example.com)")).toBeInTheDocument();
		});

		it("should show linked status without email when no provider email given", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText(/✓ Linked/i)).toBeInTheDocument();
			expect(screen.queryByText("@")).not.toBeInTheDocument();
		});
	});

	describe("User Interactions", () => {
		it("should call onLink when link button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });
			await user.click(linkButton);

			expect(mockOnLink).toHaveBeenCalledOnce();
		});

		it("should call onUnlink when unlink button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			await user.click(unlinkButton);

			expect(mockOnUnlink).toHaveBeenCalledOnce();
		});

		it("should handle keyboard navigation for link button", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });

			// Focus the button using Tab
			await user.tab();
			expect(linkButton).toHaveFocus();

			// Activate using Enter
			await user.keyboard("{Enter}");
			expect(mockOnLink).toHaveBeenCalledOnce();
		});

		it("should handle keyboard navigation for unlink button", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });

			// Focus the button using Tab
			await user.tab();
			expect(unlinkButton).toHaveFocus();

			// Activate using Enter
			await user.keyboard("{Enter}");
			expect(mockOnUnlink).toHaveBeenCalledOnce();
		});
	});

	describe("Loading States", () => {
		it("should show loading state when linking is in progress", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					linkingLoading={true}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });
			expect(linkButton).toBeDisabled();
			expect(linkButton.querySelector(".animate-spin")).toBeInTheDocument();
		});

		it("should show loading state when unlinking is in progress", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					unlinkingLoading={true}
				/>
			);

			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).toBeDisabled();
			expect(unlinkButton.querySelector(".animate-spin")).toBeInTheDocument();
		});

		it("should prevent interaction when linking is loading", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					linkingLoading={true}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });
			await user.click(linkButton);

			expect(mockOnLink).not.toHaveBeenCalled();
		});

		it("should prevent interaction when unlinking is loading", async () => {
			const user = userEvent.setup();
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					unlinkingLoading={true}
				/>
			);

			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			await user.click(unlinkButton);

			expect(mockOnUnlink).not.toHaveBeenCalled();
		});
	});

	describe("Provider-Specific Styling", () => {
		it("should apply Google brand color", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			// Check for provider-specific styling elements
			const providerIcon = screen.getByTestId("provider-icon");
			expect(providerIcon).toHaveClass("fab", "fa-google");
		});

		it("should apply Microsoft brand color", () => {
			render(
				<ProviderStatusCard
					provider={mockMicrosoftProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const providerIcon = screen.getByTestId("provider-icon");
			expect(providerIcon).toHaveClass("fab", "fa-microsoft");
		});

		it("should apply GitHub brand color", () => {
			render(
				<ProviderStatusCard
					provider={mockGitHubProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const providerIcon = screen.getByTestId("provider-icon");
			expect(providerIcon).toHaveClass("fab", "fa-github");
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels for link button", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });
			expect(linkButton).toHaveAttribute("aria-label", "Link Google Account");
		});

		it("should have proper ARIA labels for unlink button", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).toHaveAttribute("aria-label", "Unlink Google Account");
		});

		it("should have proper ARIA labels during loading states", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					linkingLoading={true}
				/>
			);

			const linkButton = screen.getByRole("button", { name: /link google/i });
			expect(linkButton).toHaveAttribute("aria-label", "Link Google Account");
		});

		it("should provide clear status information for screen readers", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					providerEmail="test@example.com"
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			const statusElement = screen.getByLabelText(/google account linked/i);
			expect(statusElement).toBeInTheDocument();
			expect(statusElement).toHaveAttribute("aria-live", "polite");
		});
	});

	describe("Edge Cases", () => {
		it("should handle provider with no brand color gracefully", () => {
			const providerWithoutColor = {
				...mockGoogleProvider,
				brandColor: ""
			};

			render(
				<ProviderStatusCard
					provider={providerWithoutColor}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link google/i })).toBeInTheDocument();
		});

		it("should handle provider with no icon class gracefully", () => {
			const providerWithoutIcon = {
				...mockGoogleProvider,
				iconClass: ""
			};

			render(
				<ProviderStatusCard
					provider={providerWithoutIcon}
					isLinked={false}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
				/>
			);

			expect(screen.getByText("Google")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /link google/i })).toBeInTheDocument();
		});

		it("should handle simultaneous loading states gracefully", () => {
			render(
				<ProviderStatusCard
					provider={mockGoogleProvider}
					isLinked={true}
					onLink={mockOnLink}
					onUnlink={mockOnUnlink}
					linkingLoading={true}
					unlinkingLoading={true}
				/>
			);

			// Should prioritize the unlinking state since the provider is linked
			const unlinkButton = screen.getByRole("button", { name: /unlink google/i });
			expect(unlinkButton).toBeDisabled();
		});
	});
});
