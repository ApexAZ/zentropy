import React from "react";
import { screen, act, fireEvent } from "@testing-library/react";
import { renderWithFullEnvironment } from "../../../__tests__/utils/testRenderUtils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { Toast } from "../Toast";

describe("Toast", () => {
	const mockOnDismiss = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Following User-Focused Testing pattern from tests/README.md
	describe("User sees toast notifications", () => {
		it("should display success toast with message", () => {
			renderWithFullEnvironment(
				<Toast
					message="Operation completed successfully"
					type="success"
					isVisible={true}
					onDismiss={mockOnDismiss}
				/>
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
			expect(screen.getByText("✓")).toBeInTheDocument();
		});

		it("should display error toast with message", () => {
			renderWithFullEnvironment(
				<Toast message="Something went wrong" type="error" isVisible={true} onDismiss={mockOnDismiss} />
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
			expect(screen.getByText("✕")).toBeInTheDocument();
		});

		it("should display info toast with message", () => {
			renderWithFullEnvironment(
				<Toast message="Information message" type="info" isVisible={true} onDismiss={mockOnDismiss} />
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Information message")).toBeInTheDocument();
			expect(screen.getByText("ℹ")).toBeInTheDocument();
		});

		it("should display warning toast with message", () => {
			renderWithFullEnvironment(
				<Toast message="Warning message" type="warning" isVisible={true} onDismiss={mockOnDismiss} />
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Warning message")).toBeInTheDocument();
			expect(screen.getByText("⚠")).toBeInTheDocument();
		});

		it("should not render when not visible", () => {
			renderWithFullEnvironment(
				<Toast message="Hidden message" type="success" isVisible={false} onDismiss={mockOnDismiss} />
			);

			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});

	describe("User can dismiss toast notifications", () => {
		it("should call onDismiss when dismiss button is clicked", () => {
			renderWithFullEnvironment(
				<Toast message="Test message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const dismissButton = screen.getByRole("button", { name: /dismiss notification/i });
			fireEvent.click(dismissButton);

			expect(mockOnDismiss).toHaveBeenCalledTimes(1);
		});

		it("should call onDismiss when escape key is pressed", () => {
			renderWithFullEnvironment(
				<Toast message="Test message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			toast.focus();
			fireEvent.keyDown(toast, { key: "Escape" });

			expect(mockOnDismiss).toHaveBeenCalledTimes(1);
		});
	});

	describe("User sees appropriate styling for different toast types", () => {
		it("should apply success styling classes", () => {
			renderWithFullEnvironment(
				<Toast message="Success message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveClass("border-green-200", "bg-green-50", "text-green-700");
		});

		it("should apply error styling classes", () => {
			renderWithFullEnvironment(
				<Toast message="Error message" type="error" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveClass("border-red-200", "bg-red-50", "text-red-700");
		});

		it("should apply info styling classes", () => {
			renderWithFullEnvironment(
				<Toast message="Info message" type="info" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveClass("border-blue-200", "bg-blue-50", "text-blue-700");
		});

		it("should apply warning styling classes", () => {
			renderWithFullEnvironment(
				<Toast message="Warning message" type="warning" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveClass("border-yellow-200", "bg-yellow-50", "text-yellow-700");
		});

		it("should apply custom className", () => {
			renderWithFullEnvironment(
				<Toast
					message="Custom message"
					type="success"
					isVisible={true}
					onDismiss={mockOnDismiss}
					className="custom-class"
				/>
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveClass("custom-class");
		});
	});

	describe("User experiences auto-dismiss behavior", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
		});

		it("should auto-dismiss toast after default timeout", () => {
			renderWithFullEnvironment(
				<Toast message="Auto-dismiss message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			expect(mockOnDismiss).not.toHaveBeenCalled();

			// Fast-forward time by 5 seconds (default timeout)
			act(() => {
				vi.advanceTimersByTime(5000);
			});

			expect(mockOnDismiss).toHaveBeenCalledTimes(1);
		});

		it("should auto-dismiss toast after custom timeout", () => {
			renderWithFullEnvironment(
				<Toast
					message="Custom timeout message"
					type="success"
					isVisible={true}
					onDismiss={mockOnDismiss}
					autoDissmissTimeout={3000}
				/>
			);

			expect(mockOnDismiss).not.toHaveBeenCalled();

			// Fast-forward time by 3 seconds (custom timeout)
			act(() => {
				vi.advanceTimersByTime(3000);
			});

			expect(mockOnDismiss).toHaveBeenCalledTimes(1);
		});

		it("should not auto-dismiss when timeout is 0", () => {
			renderWithFullEnvironment(
				<Toast
					message="No auto-dismiss message"
					type="success"
					isVisible={true}
					onDismiss={mockOnDismiss}
					autoDissmissTimeout={0}
				/>
			);

			// Fast-forward time by 10 seconds
			act(() => {
				vi.advanceTimersByTime(10000);
			});

			expect(mockOnDismiss).not.toHaveBeenCalled();
		});

		it("should clear timeout when component unmounts", () => {
			const { result } = renderWithFullEnvironment(
				<Toast message="Unmount message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			// Unmount before timeout
			result.unmount();

			// Fast-forward time by 5 seconds
			act(() => {
				vi.advanceTimersByTime(5000);
			});

			expect(mockOnDismiss).not.toHaveBeenCalled();
		});
	});

	describe("User understands toast accessibility", () => {
		it("should have proper ARIA attributes", () => {
			renderWithFullEnvironment(
				<Toast message="Accessible message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const toast = screen.getByRole("alert");
			expect(toast).toHaveAttribute("aria-live", "polite");
			expect(toast).toHaveAttribute("aria-atomic", "true");
			expect(toast).toHaveAttribute("tabIndex", "0");
		});

		it("should have properly labeled dismiss button", () => {
			renderWithFullEnvironment(
				<Toast message="Accessible message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			const dismissButton = screen.getByRole("button", { name: /dismiss notification/i });
			expect(dismissButton).toBeInTheDocument();
			expect(dismissButton).toHaveAttribute("aria-label", "Dismiss notification");
		});

		it("should have icon marked as decorative", () => {
			renderWithFullEnvironment(
				<Toast message="Accessible message" type="success" isVisible={true} onDismiss={mockOnDismiss} />
			);

			// Look for the icon container div directly
			const iconContainer = screen.getByText("✓").closest('div[aria-hidden="true"]');
			expect(iconContainer).toBeInTheDocument();
		});
	});
});
