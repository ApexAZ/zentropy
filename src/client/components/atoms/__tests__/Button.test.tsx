import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import Button from "../Button";

describe("Button Component", () => {
	it("renders with default props", () => {
		render(<Button>Click me</Button>);
		const button = screen.getByRole("button", { name: "Click me" });
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass("bg-interactive", "hover:bg-interactive-hover");
	});

	it("handles click events", () => {
		const handleClick = vi.fn();
		render(<Button onClick={handleClick}>Click me</Button>);

		fireEvent.click(screen.getByRole("button"));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	it("renders primary variant by default", () => {
		render(<Button>Primary</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-interactive", "text-white");
	});

	it("renders secondary variant", () => {
		render(<Button variant="secondary">Secondary</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("bg-content-background", "border-layout-background", "text-text-primary");
	});

	it("renders danger variant", () => {
		render(<Button variant="danger">Delete</Button>);
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
		render(<Button isLoading>Loading</Button>);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveTextContent("Loading...");
	});

	it("respects disabled state", () => {
		render(<Button disabled>Disabled</Button>);
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
		render(<Button className="custom-class">Custom</Button>);
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
		render(<Button fullWidth>Full Width</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("w-full");
	});
});
