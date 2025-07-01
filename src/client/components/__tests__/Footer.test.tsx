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
		expect(footer).toHaveClass("main-footer");
	});

	it("is wrapped in app-container layout", () => {
		render(<App />);
		
		const appContainer = document.querySelector(".app-container");
		expect(appContainer).toBeInTheDocument();
		expect(appContainer).toHaveClass("app-container");
		
		const footer = screen.getByRole("contentinfo");
		expect(appContainer).toContainElement(footer);
	});
});