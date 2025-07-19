import React from "react";
// eslint-disable-next-line no-restricted-imports -- Testing click-outside behavior requires custom DOM structure
import { screen, fireEvent, render } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../__tests__/utils/testRenderUtils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { fastUserActions, fastStateSync } from "../../__tests__/utils";
import FlyoutNavigation from "../FlyoutNavigation";

describe("FlyoutNavigation", () => {
	const mockOnPageChange = vi.fn();

	const defaultProps = {
		currentPage: "home" as const,
		onPageChange: mockOnPageChange
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the menu button with proper accessibility attributes", () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });
		expect(menuButton).toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-label", "Navigation menu");
		expect(menuButton).toHaveAttribute("aria-expanded", "false");
		expect(menuButton).toHaveAttribute("aria-haspopup", "true");
	});

	it("shows the list icon in the menu button", () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const icon = screen.getByRole("button", { name: /navigation menu/i }).querySelector("svg");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
	});

	it("does not show the dropdown menu initially", () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		expect(screen.queryByText("About")).not.toBeInTheDocument();
		expect(screen.queryByText("Contact")).not.toBeInTheDocument();
	});

	it("shows the dropdown menu when button is clicked", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });
		fastUserActions.click(menuButton);
		await fastStateSync();

		expect(screen.getByText("About")).toBeInTheDocument();
		expect(screen.getByText("Contact")).toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-expanded", "true");
	});

	it("hides the dropdown menu when button is clicked again", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });

		// Open menu
		fastUserActions.click(menuButton);
		await fastStateSync();
		expect(screen.getByText("About")).toBeInTheDocument();

		// Close menu
		fastUserActions.click(menuButton);
		await fastStateSync();
		expect(screen.queryByText("About")).not.toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-expanded", "false");
	});

	it("calls onPageChange when About is clicked", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		// Open menu
		fastUserActions.click(screen.getByRole("button", { name: /navigation menu/i }));
		await fastStateSync();

		// Click About
		fastUserActions.click(screen.getByText("About"));
		await fastStateSync();

		expect(mockOnPageChange).toHaveBeenCalledWith("about");
	});

	it("calls onPageChange when Contact is clicked", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		// Open menu
		fastUserActions.click(screen.getByRole("button", { name: /navigation menu/i }));
		await fastStateSync();

		// Click Contact
		fastUserActions.click(screen.getByText("Contact"));
		await fastStateSync();

		expect(mockOnPageChange).toHaveBeenCalledWith("contact");
	});

	it("closes the menu after clicking a navigation item", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });

		// Open menu
		fastUserActions.click(menuButton);
		await fastStateSync();
		expect(screen.getByText("About")).toBeInTheDocument();

		// Click About
		fastUserActions.click(screen.getByText("About"));
		await fastStateSync();

		// Menu should be closed
		expect(screen.queryByText("About")).not.toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-expanded", "false");
	});

	it("highlights the current page in the dropdown", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} currentPage="about" />);

		// Open menu
		fastUserActions.click(screen.getByRole("button", { name: /navigation menu/i }));
		await fastStateSync();

		const aboutButton = screen.getByText("About");
		const contactButton = screen.getByText("Contact");

		expect(aboutButton).toHaveClass("bg-content-background-hover");
		expect(contactButton).not.toHaveClass("bg-content-background-hover");
	});

	it("closes the menu when clicking outside", async () => {
		render(
			<div>
				<FlyoutNavigation {...defaultProps} />
				<div data-testid="outside-element">Outside</div>
			</div>
		);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });

		// Open menu
		fireEvent.click(menuButton);
		expect(screen.getByText("About")).toBeInTheDocument();

		// Click outside
		fireEvent.mouseDown(screen.getByTestId("outside-element"));

		// Menu should be closed
		expect(screen.queryByText("About")).not.toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-expanded", "false");
	});

	it("does not close the menu when clicking inside the dropdown", async () => {
		renderWithFullEnvironment(<FlyoutNavigation {...defaultProps} />);

		const menuButton = screen.getByRole("button", { name: /navigation menu/i });

		// Open menu
		fireEvent.click(menuButton);
		expect(screen.getByText("About")).toBeInTheDocument();

		// Click inside the dropdown (but not on a menu item)
		const dropdown = screen.getByText("About").closest("div");
		fireEvent.mouseDown(dropdown!);

		// Menu should stay open
		expect(screen.getByText("About")).toBeInTheDocument();
		expect(menuButton).toHaveAttribute("aria-expanded", "true");
	});
});
