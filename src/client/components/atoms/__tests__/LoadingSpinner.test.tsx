import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner", () => {
	// Following User-Focused Testing pattern from tests/README.md
	describe("User sees loading feedback", () => {
		it("should display spinner with default props", () => {
			render(<LoadingSpinner />);

			const spinner = screen.getByRole("status");
			expect(spinner).toBeInTheDocument();
			expect(spinner).toHaveAttribute("aria-label", "Loading");
		});

		it("should display spinner with custom text", () => {
			render(<LoadingSpinner text="Loading data..." />);

			const spinner = screen.getByRole("status");
			expect(spinner).toHaveAttribute("aria-label", "Loading data...");
			expect(screen.getByText("Loading data...", { selector: "span:not(.sr-only)" })).toBeInTheDocument();
		});

		it("should display spinner without text when text prop is not provided", () => {
			render(<LoadingSpinner />);

			const spinner = screen.getByRole("status");
			expect(spinner).toHaveAttribute("aria-label", "Loading");
			expect(screen.queryByText("Loading", { selector: "span:not(.sr-only)" })).not.toBeInTheDocument();
		});
	});

	describe("User sees appropriate sizing", () => {
		it("should apply small size classes", () => {
			render(<LoadingSpinner size="small" text="Loading..." />);

			const spinner = screen.getByRole("status");
			const spinnerElement = spinner.querySelector("div");
			const textElement = screen.getByText("Loading...", { selector: "span:not(.sr-only)" });

			expect(spinnerElement).toHaveClass("h-4", "w-4");
			expect(textElement).toHaveClass("text-sm");
		});

		it("should apply medium size classes by default", () => {
			render(<LoadingSpinner text="Loading..." />);

			const spinner = screen.getByRole("status");
			const spinnerElement = spinner.querySelector("div");
			const textElement = screen.getByText("Loading...", { selector: "span:not(.sr-only)" });

			expect(spinnerElement).toHaveClass("h-6", "w-6");
			expect(textElement).toHaveClass("text-base");
		});

		it("should apply large size classes", () => {
			render(<LoadingSpinner size="large" text="Loading..." />);

			const spinner = screen.getByRole("status");
			const spinnerElement = spinner.querySelector("div");
			const textElement = screen.getByText("Loading...", { selector: "span:not(.sr-only)" });

			expect(spinnerElement).toHaveClass("h-8", "w-8");
			expect(textElement).toHaveClass("text-lg");
		});
	});

	describe("User sees proper positioning", () => {
		it("should center spinner when centered prop is true", () => {
			render(<LoadingSpinner centered />);

			const spinner = screen.getByRole("status");
			expect(spinner).toHaveClass("justify-center");
		});

		it("should not center spinner by default", () => {
			render(<LoadingSpinner />);

			const spinner = screen.getByRole("status");
			expect(spinner).not.toHaveClass("justify-center");
		});

		it("should apply custom className", () => {
			render(<LoadingSpinner className="custom-spinner" />);

			const spinner = screen.getByRole("status");
			expect(spinner).toHaveClass("custom-spinner");
		});
	});

	describe("User understands loading context", () => {
		it("should provide proper accessibility attributes", () => {
			render(<LoadingSpinner />);

			const spinner = screen.getByRole("status");
			expect(spinner).toHaveAttribute("aria-label", "Loading");
		});

		it("should have screen reader text", () => {
			render(<LoadingSpinner text="Loading data..." />);

			const srText = screen.getByText("Loading data...", { selector: ".sr-only" });
			expect(srText).toBeInTheDocument();
		});

		it("should have default screen reader text when no text provided", () => {
			render(<LoadingSpinner />);

			const srText = screen.getByText("Loading", { selector: ".sr-only" });
			expect(srText).toBeInTheDocument();
		});
	});

	describe("User sees consistent visual styling", () => {
		it("should apply spinner animation classes", () => {
			render(<LoadingSpinner />);

			const spinner = screen.getByRole("status");
			const spinnerElement = spinner.querySelector("div");

			expect(spinnerElement).toHaveClass("animate-spin");
			expect(spinnerElement).toHaveClass("border-interactive");
			expect(spinnerElement).toHaveClass("rounded-full");
			expect(spinnerElement).toHaveClass("border-2");
			expect(spinnerElement).toHaveClass("border-t-transparent");
		});

		it("should apply text color classes", () => {
			render(<LoadingSpinner text="Loading..." />);

			const textElement = screen.getByText("Loading...", { selector: "span:not(.sr-only)" });
			expect(textElement).toHaveClass("text-primary");
		});
	});
});
