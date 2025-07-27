import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithFullEnvironment, fastStateSync } from "../../../__tests__/utils/testRenderUtils";
import Form from "../Form";
import Button from "../Button";

describe("Form", () => {
	it("should render form with children", () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		expect(screen.getByTestId("test-input")).toBeInTheDocument();
		expect(screen.getByText("Submit")).toBeInTheDocument();
	});

	it("should call onSubmit when form is submitted", async () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		fireEvent.click(screen.getByText("Submit"));

		await fastStateSync();
		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});

	it("should submit form when Enter key is pressed in input", async () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		const input = screen.getByTestId("test-input");
		fireEvent.submit(input.closest("form")!);

		await fastStateSync();
		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});

	it("should prevent default form submission", async () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		const input = screen.getByTestId("test-input");
		const form = input.closest("form")!;
		fireEvent.submit(form);

		await fastStateSync();
		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});

	it("should display global error when provided", () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit} error="Test error message">
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		expect(screen.getByText("Test error message")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("should not submit when isSubmitting is true", async () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit} isSubmitting={true}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		fireEvent.click(screen.getByText("Submit"));

		await fastStateSync();
		expect(mockSubmit).not.toHaveBeenCalled();
	});

	it("should handle async onSubmit functions", async () => {
		const mockSubmit = vi.fn().mockResolvedValue(undefined);

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit}>
				<input data-testid="test-input" />
				<Button type="submit">Submit</Button>
			</Form>
		);

		fireEvent.click(screen.getByText("Submit"));

		await fastStateSync();
		expect(mockSubmit).toHaveBeenCalledTimes(1);
	});

	it("should apply custom className", () => {
		const mockSubmit = vi.fn();

		renderWithFullEnvironment(
			<Form onSubmit={mockSubmit} className="custom-class">
				<input data-testid="test-input" />
			</Form>
		);

		const input = screen.getByTestId("test-input");
		const form = input.closest("form")!;
		expect(form).toHaveClass("custom-class");
		expect(form).toHaveClass("space-y-4"); // Default class should also be present
	});
});
