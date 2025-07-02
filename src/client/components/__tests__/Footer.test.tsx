import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../App";

describe("Footer", () => {
	it("renders copyright information", () => {
		render(<App />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toBeInTheDocument();

		const copyrightText = screen.getByText(/© 2025 Zentropy. All rights reserved./);
		expect(copyrightText).toBeInTheDocument();
	});

	it("has proper semantic structure", () => {
		render(<App />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toHaveClass("mt-auto", "border-t", "border-layout-background", "bg-layout-background");
	});

	it("is positioned at bottom of layout", () => {
		render(<App />);

		const footer = screen.getByRole("contentinfo");
		expect(footer).toHaveClass("mt-auto");
		expect(footer).toHaveClass("text-center");
	});
});
