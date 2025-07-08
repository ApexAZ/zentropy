import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import "@testing-library/jest-dom";
import RequiredAsterisk from "../RequiredAsterisk";

describe("RequiredAsterisk", () => {
	afterEach(() => {
		cleanup(); // Ensure DOM is cleaned up after each test
	});

	describe("Visibility Logic", () => {
		it("should show asterisk when field is empty and required", () => {
			render(<RequiredAsterisk isEmpty={true} isRequired={true} />);

			const asterisk = screen.getByText("*");
			expect(asterisk).toBeInTheDocument();
			expect(asterisk).toHaveClass("text-red-500");
			expect(asterisk).toHaveClass("ml-1");
		});

		it("should not show asterisk when field is populated", () => {
			render(<RequiredAsterisk isEmpty={false} isRequired={true} />);

			expect(screen.queryByText("*")).not.toBeInTheDocument();
		});

		it("should not show asterisk when field is not required", () => {
			render(<RequiredAsterisk isEmpty={true} isRequired={false} />);

			expect(screen.queryByText("*")).not.toBeInTheDocument();
		});

		it("should not show asterisk when field is populated and not required", () => {
			render(<RequiredAsterisk isEmpty={false} isRequired={false} />);

			expect(screen.queryByText("*")).not.toBeInTheDocument();
		});
	});

	describe("Styling", () => {
		it("should apply correct CSS classes for styling", () => {
			render(<RequiredAsterisk isEmpty={true} isRequired={true} />);

			const asterisk = screen.getByText("*");
			expect(asterisk).toHaveClass("text-red-500");
			expect(asterisk).toHaveClass("ml-1");
		});

		it("should use semantic color classes that work with theme system", () => {
			render(<RequiredAsterisk isEmpty={true} isRequired={true} />);

			const asterisk = screen.getByText("*");
			// Should use red color for required field indicators
			expect(asterisk.className).toContain("text-red-500");
			// Should have proper spacing
			expect(asterisk.className).toContain("ml-1");
		});
	});

	describe("Accessibility", () => {
		it("should render as inline span element", () => {
			render(<RequiredAsterisk isEmpty={true} isRequired={true} />);

			const asterisk = screen.getByText("*");
			expect(asterisk.tagName.toLowerCase()).toBe("span");
		});

		it("should not interfere with screen reader flow", () => {
			render(
				<div>
					<label>
						First Name
						<RequiredAsterisk isEmpty={true} isRequired={true} />
					</label>
				</div>
			);

			// The asterisk should be part of the label text
			expect(screen.getByText("First Name")).toBeInTheDocument();
			expect(screen.getByText("*")).toBeInTheDocument();
		});
	});

	describe("Component API", () => {
		it("should accept isEmpty boolean prop", () => {
			const { rerender } = render(<RequiredAsterisk isEmpty={true} isRequired={true} />);
			expect(screen.getByText("*")).toBeInTheDocument();

			rerender(<RequiredAsterisk isEmpty={false} isRequired={true} />);
			expect(screen.queryByText("*")).not.toBeInTheDocument();
		});

		it("should accept isRequired boolean prop", () => {
			const { rerender } = render(<RequiredAsterisk isEmpty={true} isRequired={true} />);
			expect(screen.getByText("*")).toBeInTheDocument();

			rerender(<RequiredAsterisk isEmpty={true} isRequired={false} />);
			expect(screen.queryByText("*")).not.toBeInTheDocument();
		});
	});
});
