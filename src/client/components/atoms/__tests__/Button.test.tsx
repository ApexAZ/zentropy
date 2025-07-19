import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../../__tests__/utils/testRenderUtils";
import { vi } from "vitest";
import Button from "../Button";

describe("Button Component", () => {
	it("renders with default props", () => {
		renderWithFullEnvironment(<Button>Click me</Button>);
		const button = screen.getByRole("button", { name: "Click me" });
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("bg-interactive", "hover:bg-interactive-hover");
	});

	it("handles click events", () => {
		const handleClick = vi.fn();
		renderWithFullEnvironment(<Button onClick={handleClick}>Click me</Button>);

		fireEvent.click(screen.getByRole("button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("renders primary variant by default", () => {
		renderWithFullEnvironment(<Button>Primary</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-interactive", "text-white");
	});

	it("renders secondary variant", () => {
		renderWithFullEnvironment(<Button variant="secondary">Secondary</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-content-background", "border-layout-background", "text-text-primary");
	});

	it("renders danger variant", () => {
		renderWithFullEnvironment(<Button variant="danger">Delete</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-red-600", "text-white");
	});

	it("renders icon variant for small icon buttons", () => {
		render(
			<Button variant="icon" aria-label="Edit">
				✏️
			</Button>
		);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("p-2", "transition-colors");
	});

	it("shows loading state", () => {
		renderWithFullEnvironment(<Button isLoading>Loading</Button>);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveTextContent("Loading...");
	});

	it("respects disabled state", () => {
		renderWithFullEnvironment(<Button disabled>Disabled</Button>);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveClass("opacity-50");
	});

	it("renders custom loading text", () => {
		render(
			<Button isLoading loadingText="Processing...">
				Submit
			</Button>
		);
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("Processing...");
	});

	it("applies custom className", () => {
		renderWithFullEnvironment(<Button className="custom-class">Custom</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("custom-class");
	});

	it("forwards all HTML button props", () => {
		render(
			<Button type="submit" form="my-form">
				Submit
			</Button>
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "submit");
		expect(button).toHaveAttribute("form", "my-form");
	});

	it("renders full width when specified", () => {
		renderWithFullEnvironment(<Button fullWidth>Full Width</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("w-full");
	});
});
