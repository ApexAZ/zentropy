import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { renderWithFullEnvironment } from "../../../__tests__/utils/testRenderUtils";
import Input from "../Input";

describe("Input Component", () => {
	it("renders text input with label", () => {
		renderWithFullEnvironment(<Input label="Email" />);
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("handles value changes", () => {
		const handleChange = vi.fn();
		renderWithFullEnvironment(<Input label="Name" value="" onChange={handleChange} />);

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "John" } });
		expect(handleChange).toHaveBeenCalledTimes(1);
	});

	it("renders with required asterisk when required", () => {
		renderWithFullEnvironment(<Input label="Required Field" required />);
		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("shows error message when error prop provided", () => {
		renderWithFullEnvironment(<Input label="Email" error="Email is required" />);
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		expect(screen.getByText("Email is required")).toHaveClass("text-red-500");
	});

	it("renders different input types", () => {
		const { rerender } = renderWithFullEnvironment(<Input label="Email" type="email" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");

		rerender(<Input label="Password" type="password" />);
		expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");

		rerender(<Input label="Age" type="number" />);
		expect(screen.getByRole("spinbutton")).toHaveAttribute("type", "number");
	});

	it("renders textarea when multiline is true", () => {
		renderWithFullEnvironment(<Input label="Description" multiline />);
		expect(screen.getByRole("textbox")).toBeInTheDocument();
		expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
	});

	it("renders select when options are provided", () => {
		const options = [
			{ value: "1", label: "Option 1" },
			{ value: "2", label: "Option 2" }
		];
		renderWithFullEnvironment(<Input label="Choice" options={options} />);
		expect(screen.getByRole("combobox")).toBeInTheDocument();
		expect(screen.getByText("Option 1")).toBeInTheDocument();
		expect(screen.getByText("Option 2")).toBeInTheDocument();
	});

	it("applies semantic focus styles", () => {
		renderWithFullEnvironment(<Input label="Test" />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveClass("focus:border-interactive");
	});

	it("shows placeholder text", () => {
		renderWithFullEnvironment(<Input label="Email" placeholder="Enter your email" />);
		expect(screen.getByPlaceholderText("Enter your email")).toBeInTheDocument();
	});

	it("handles disabled state", () => {
		renderWithFullEnvironment(<Input label="Disabled" disabled />);
		const input = screen.getByRole("textbox");
		expect(input).toBeDisabled();
		expect(input).toHaveClass("opacity-50");
	});

	it("forwards HTML input attributes", () => {
		renderWithFullEnvironment(<Input label="Test" id="custom-id" name="test-name" />);
		const input = screen.getByRole("textbox");
		expect(input).toHaveAttribute("id", "custom-id");
		expect(input).toHaveAttribute("name", "test-name");
	});

	it("auto-generates id from label when id not provided", () => {
		renderWithFullEnvironment(<Input label="Email Address" />);
		const input = screen.getByRole("textbox");
		const label = screen.getByText("Email Address");
		const expectedId = "email-address";
		expect(input).toHaveAttribute("id", expectedId);
		expect(label).toHaveAttribute("for", expectedId);
	});

	it("shows helper text when provided", () => {
		renderWithFullEnvironment(<Input label="Password" helper="Must be at least 8 characters" />);
		expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
		expect(screen.getByText("Must be at least 8 characters")).toHaveClass("text-text-primary");
	});
});
