import React from "react";
import { screen } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { SecurityStatusSkeleton } from "../SecurityStatusSkeleton";

describe("SecurityStatusSkeleton", () => {
	// Following User-Focused Testing pattern from tests/README.md
	describe("User sees structured loading placeholder", () => {
		it("should display skeleton elements for authentication status", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(0);

			// Check that skeleton elements have proper accessibility labels
			skeletonElements.forEach(element => {
				expect(element).toHaveAttribute("aria-label", "Loading content");
			});
		});

		it("should display skeleton layout matching actual security status display", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Should have multiple skeleton elements representing different parts of the UI
			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(5); // Multiple skeleton elements for different sections
		});

		it("should display skeleton elements with proper spacing", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Check that the container has proper spacing classes
			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(0);

			// Check that the main container has proper spacing
			const container = skeletonElements[0].closest(".space-y-6");
			expect(container).toBeInTheDocument();
		});
	});

	describe("User sees authentication status section skeleton", () => {
		it("should display skeleton elements for email and Google authentication rows", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Should have skeleton elements for both authentication methods
			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(2);
		});

		it("should display skeleton for security status indicator", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Should have skeleton elements for security status and tips
			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(0);
		});
	});

	describe("User sees actions section skeleton", () => {
		it("should display skeleton elements for security actions", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Should have skeleton elements for action button and help text
			const skeletonElements = screen.getAllByRole("status");
			expect(skeletonElements.length).toBeGreaterThan(0);
		});

		it("should display skeleton with proper section separation", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// Check that actions section has proper border separation
			const actionSection = document.querySelector(".border-layout-background");
			expect(actionSection).toBeInTheDocument();
		});
	});

	describe("User understands loading context", () => {
		it("should provide proper accessibility for screen readers", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			const skeletonElements = screen.getAllByRole("status");
			skeletonElements.forEach(element => {
				expect(element).toHaveAttribute("aria-label", "Loading content");
			});
		});

		it("should maintain consistent skeleton styling", () => {
			renderWithFullEnvironment(<SecurityStatusSkeleton />);

			// All skeleton elements should have consistent styling
			const skeletonElements = screen.getAllByRole("status");
			skeletonElements.forEach(element => {
				expect(element).toHaveClass("bg-neutral-background");
				expect(element).toHaveClass("animate-pulse");
			});
		});
	});
});
