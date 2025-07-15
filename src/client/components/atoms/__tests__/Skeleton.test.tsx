import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import Skeleton from "../Skeleton";

describe("Skeleton", () => {
	// Following User-Focused Testing pattern from tests/README.md
	describe("User sees loading placeholder", () => {
		it("should display single skeleton element with default props", () => {
			render(<Skeleton />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toBeInTheDocument();
			expect(skeleton).toHaveAttribute("aria-label", "Loading content");
		});

		it("should display multiple skeleton lines when lines prop is provided", () => {
			render(<Skeleton lines={3} />);

			const skeletons = screen.getAllByRole("status");
			expect(skeletons).toHaveLength(1); // Parent container has role="status"

			const skeletonContainer = screen.getByRole("status");
			expect(skeletonContainer.children).toHaveLength(3);
		});

		it("should display circular skeleton when circle prop is true", () => {
			render(<Skeleton circle />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveClass("rounded-full");
		});

		it("should display rectangular skeleton by default", () => {
			render(<Skeleton />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveClass("rounded-md");
			expect(skeleton).not.toHaveClass("rounded-full");
		});
	});

	describe("User sees consistent visual styling", () => {
		it("should apply background color and animation classes", () => {
			render(<Skeleton />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveClass("bg-neutral-background");
			expect(skeleton).toHaveClass("animate-pulse");
		});

		it("should apply custom height and width", () => {
			render(<Skeleton height="h-8" width="w-32" />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveClass("h-8");
			expect(skeleton).toHaveClass("w-32");
		});

		it("should apply custom className", () => {
			render(<Skeleton className="custom-class" />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveClass("custom-class");
		});
	});

	describe("User understands loading context", () => {
		it("should provide proper accessibility attributes", () => {
			render(<Skeleton />);

			const skeleton = screen.getByRole("status");
			expect(skeleton).toHaveAttribute("aria-label", "Loading content");
		});

		it("should maintain accessibility for multiple lines", () => {
			render(<Skeleton lines={2} />);

			const skeletonContainer = screen.getByRole("status");
			expect(skeletonContainer).toHaveAttribute("aria-label", "Loading content");
		});
	});
});
