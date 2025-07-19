import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../../__tests__/utils/testRenderUtils";
import { vi } from "vitest";
import Card from "../Card";

describe("Card Component", () => {
	it("renders basic card with children", () => {
		renderWithFullEnvironment(
			<Card>
				<h2>Card Title</h2>
				<p>Card content</p>
			</Card>
		);

		expect(screen.getByText("Card Title")).toBeInTheDocument();
		expect(screen.getByText("Card content")).toBeInTheDocument();
	});

	it("applies semantic styling classes", () => {
		renderWithFullEnvironment(<Card data-testid="card">Content</Card>);
		const card = screen.getByTestId("card");

		expect(card).toHaveClass(
			"border-layout-background",
			"bg-content-background",
			"rounded-lg",
			"border",
			"p-6",
			"shadow-sm",
			"transition-shadow",
			"hover:shadow-md"
		);
	});

	it("renders title when provided", () => {
		renderWithFullEnvironment(<Card title="Team Alpha">Content</Card>);
		expect(screen.getByText("Team Alpha")).toBeInTheDocument();
		expect(screen.getByText("Team Alpha")).toHaveClass("text-text-contrast", "mb-2", "text-lg", "font-semibold");
	});

	it("renders description when provided", () => {
		renderWithFullEnvironment(
			<Card title="Team" description="A great team">
				Content
			</Card>
		);
		expect(screen.getByText("A great team")).toBeInTheDocument();
		expect(screen.getByText("A great team")).toHaveClass("text-text-primary", "mb-3", "text-sm");
	});

	it("renders action buttons in header", () => {
		const editAction = { label: "Edit", onClick: vi.fn(), icon: "✏️" };
		const deleteAction = { label: "Delete", onClick: vi.fn(), icon: "🗑️" };

		renderWithFullEnvironment(
			<Card title="Team" actions={[editAction, deleteAction]}>
				Content
			</Card>
		);

		expect(screen.getByLabelText("Edit")).toBeInTheDocument();
		expect(screen.getByLabelText("Delete")).toBeInTheDocument();
	});

	it("handles action button clicks", () => {
		const mockEdit = vi.fn();
		const mockDelete = vi.fn();
		const actions = [
			{ label: "Edit", onClick: mockEdit, icon: "✏️" },
			{ label: "Delete", onClick: mockDelete, icon: "🗑️" }
		];

		renderWithFullEnvironment(
			<Card title="Team" actions={actions}>
				Content
			</Card>
		);

		fireEvent.click(screen.getByLabelText("Edit"));
		expect(mockEdit).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByLabelText("Delete"));
		expect(mockDelete).toHaveBeenCalledTimes(1);
	});

	it("renders data list when provided", () => {
		const data = [
			{ label: "Velocity", value: "25 points" },
			{ label: "Sprint Length", value: "14 days" },
			{ label: "Working Days", value: "5 days/week" }
		];

		renderWithFullEnvironment(
			<Card title="Team" data={data}>
				Content
			</Card>
		);

		expect(screen.getByText(/Velocity:/)).toBeInTheDocument();
		expect(screen.getByText("25 points")).toBeInTheDocument();
		expect(screen.getByText(/Sprint Length:/)).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
	});

	it("renders custom footer when provided", () => {
		const footer = <div>Custom Footer</div>;
		renderWithFullEnvironment(<Card footer={footer}>Content</Card>);
		expect(screen.getByText("Custom Footer")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		renderWithFullEnvironment(
			<Card className="custom-class" data-testid="card">
				Content
			</Card>
		);
		const card = screen.getByTestId("card");
		expect(card).toHaveClass("custom-class");
	});

	it("renders without title/description when not provided", () => {
		renderWithFullEnvironment(<Card>Just content</Card>);
		expect(screen.getByText("Just content")).toBeInTheDocument();
		// Should not have title/description elements
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});

	it("renders data list with proper structure", () => {
		const data = [
			{ label: "Status", value: "Active" },
			{ label: "Members", value: "5" }
		];

		renderWithFullEnvironment(<Card data={data}>Content</Card>);

		// Check that data is in a structured list
		const statusRow = screen.getByText(/Status:/).closest("div");
		expect(statusRow).toHaveClass("flex", "justify-between");
		expect(statusRow).toContainElement(screen.getByText("Active"));
	});
});
