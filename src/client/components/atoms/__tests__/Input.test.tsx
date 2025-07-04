import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import Input from "../Input";

describe("Input Component", () => {
	it("renders text input with label", () => {
		render(<Input label="Email" />);
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("handles value changes", () => {
		const handleChange = vi.fn();
		render(<Input label="Name" value="" onChange={handleChange} />);

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "John" } });
		expect(handleChange).toHaveBeenCalledTimes(1);
	});

	it("renders with required asterisk when required", () => {
		render(<Input label="Required Field" required />);
		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("shows error message when error prop provided", () => {
		render(<Input label="Email" error="Email is required" />);
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		expect(screen.getByText("Email is required")).toHaveClass("text-red-500");
	});

	it("renders different input types", () => {
		const { rerender } = render(<Input label="Email" type="email" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");

		rerender(<Input label="Password" type="password" />);
		expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");

		rerender(<Input label="Age" type="number" />);
		expect(screen.getByRole("spinbutton")).toHaveAttribute("type", "number");
	});

	it("renders textarea when multiline is true", () => {
		render(<Input label="Description" multiline />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
	});

	it("renders select when options are provided", () => {
		const options = [
			{ value: "1", label: "Option 1" },
			{ value: "2", label: "Option 2" }
		];
		render(<Input label="Choice" options={options} />);
		expect(screen.getByRole("combobox")).toBeInTheDocument();
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		expect(screen.getByText("Option 2")).toBeInTheDocument();
	});

	it("applies semantic focus styles", () => {
		render(<Input label="Test" />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveClass("focus:border-interactive");
	});

	it("shows placeholder text", () => {
		render(<Input label="Email" placeholder="Enter your email" />);
		expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
	});

	it("handles disabled state", () => {
		render(<Input label="Disabled" disabled />);
		const input = screen.getByRole("textbox");
		expect(input).toBeDisabled();
		expect(input).toHaveClass("opacity-50");
	});

	it("forwards HTML input attributes", () => {
		render(<Input label="Test" id="custom-id" name="test-name" />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("id", "custom-id");
		expect(input).toHaveAttribute("name", "test-name");
	});

	it("auto-generates id from label when id not provided", () => {
		render(<Input label="Email Address" />);
		const input = screen.getByRole("textbox");
		const label = screen.getByText("Email Address");
		const expectedId = "email-address";
		expect(input).toHaveAttribute("id", expectedId);
		expect(label).toHaveAttribute("for", expectedId);
	});

	it("shows helper text when provided", () => {
		render(<Input label="Password" helper="Must be at least 8 characters" />);
		expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
		expect(screen.getByText("Must be at least 8 characters")).toHaveClass("text-text-primary");
	});
});
