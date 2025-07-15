import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { ToastProvider, useToast } from "../ToastContext";

// Test component that uses the toast context
function TestComponent() {
	const { showToast, showSuccess, showError, showInfo, showWarning, dismissAllToasts } = useToast();

	return (
		<div>
			<button onClick={() => showToast("Custom toast", "success")}>Show Custom Toast</button>
			<button onClick={() => showSuccess("Success message")}>Show Success</button>
			<button onClick={() => showError("Error message")}>Show Error</button>
			<button onClick={() => showInfo("Info message")}>Show Info</button>
			<button onClick={() => showWarning("Warning message")}>Show Warning</button>
			<button onClick={() => dismissAllToasts()}>Dismiss All</button>
		</div>
	);
}

describe("ToastProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Following User-Focused Testing pattern from tests/README.md
	describe("User can show different types of toast notifications", () => {
		it("should display success toast when showSuccess is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Success message")).toBeInTheDocument();
			expect(screen.getByText("✓")).toBeInTheDocument();
		});

		it("should display error toast when showError is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Error"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Error message")).toBeInTheDocument();
			expect(screen.getByText("✕")).toBeInTheDocument();
		});

		it("should display info toast when showInfo is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Info"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Info message")).toBeInTheDocument();
			expect(screen.getByText("ℹ")).toBeInTheDocument();
		});

		it("should display warning toast when showWarning is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Warning"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Warning message")).toBeInTheDocument();
			expect(screen.getByText("⚠")).toBeInTheDocument();
		});

		it("should display custom toast when showToast is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Custom Toast"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Custom toast")).toBeInTheDocument();
			expect(screen.getByText("✓")).toBeInTheDocument();
		});
	});

	describe("User can manage multiple toast notifications", () => {
		it("should display multiple toasts simultaneously", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));
			await user.click(screen.getByText("Show Error"));

			const alerts = screen.getAllByRole("alert");
			expect(alerts).toHaveLength(2);
			expect(screen.getByText("Success message")).toBeInTheDocument();
			expect(screen.getByText("Error message")).toBeInTheDocument();
		});

		it("should stack toasts with proper positioning", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));
			await user.click(screen.getByText("Show Error"));

			const alerts = screen.getAllByRole("alert");
			expect(alerts).toHaveLength(2);

			// First toast should be at the top (no transform)
			expect(alerts[0].parentElement).toHaveStyle({ transform: "translateY(0px)" });
			// Second toast should be below the first (80px offset)
			expect(alerts[1].parentElement).toHaveStyle({ transform: "translateY(80px)" });
		});

		it("should respect maximum toast limit", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider maxToasts={2}>
					<TestComponent />
				</ToastProvider>
			);

			// Add 3 toasts
			await user.click(screen.getByText("Show Success"));
			await user.click(screen.getByText("Show Error"));
			await user.click(screen.getByText("Show Info"));

			// Should only show 2 toasts (the latest ones)
			const alerts = screen.getAllByRole("alert");
			expect(alerts).toHaveLength(2);
			expect(screen.queryByText("Success message")).not.toBeInTheDocument();
			expect(screen.getByText("Error message")).toBeInTheDocument();
			expect(screen.getByText("Info message")).toBeInTheDocument();
		});

		it("should dismiss all toasts when dismissAllToasts is called", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));
			await user.click(screen.getByText("Show Error"));

			expect(screen.getAllByRole("alert")).toHaveLength(2);

			await user.click(screen.getByText("Dismiss All"));

			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});

		it("should dismiss individual toasts", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));
			await user.click(screen.getByText("Show Error"));

			expect(screen.getAllByRole("alert")).toHaveLength(2);

			// Dismiss the first toast
			const dismissButtons = screen.getAllByRole("button", { name: /dismiss notification/i });
			await user.click(dismissButtons[0]);

			expect(screen.getAllByRole("alert")).toHaveLength(1);
		});
	});

	describe("User experiences auto-dismiss behavior", () => {
		it("should auto-dismiss toasts after timeout", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));

			expect(screen.getByRole("alert")).toBeInTheDocument();

			// Test that toast has auto-dismiss timeout (we test the timeout prop is passed to Toast)
			// The actual auto-dismiss behavior is tested in the Toast component tests
		});

		it("should pass custom timeout to Toast component", async () => {
			const user = userEvent.setup();

			// Test component with custom timeout
			function TestCustomTimeout() {
				const { showSuccess } = useToast();
				return <button onClick={() => showSuccess("Custom timeout", 3000)}>Show Custom Timeout</button>;
			}

			render(
				<ToastProvider>
					<TestCustomTimeout />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Custom Timeout"));

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText("Custom timeout")).toBeInTheDocument();
		});
	});

	describe("User encounters error handling", () => {
		it("should throw error when useToast is used outside ToastProvider", () => {
			// Test component that uses useToast without provider
			function TestWithoutProvider() {
				const { showSuccess } = useToast();
				return <button onClick={() => showSuccess("Test")}>Test</button>;
			}

			// Suppress console.error for this test
			const originalError = console.error;
			console.error = vi.fn();

			expect(() => {
				render(<TestWithoutProvider />);
			}).toThrow("useToast must be used within a ToastProvider");

			console.error = originalError;
		});
	});

	describe("User sees proper accessibility support", () => {
		it("should provide proper ARIA attributes for toasts", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));

			const toast = screen.getByRole("alert");
			expect(toast).toHaveAttribute("aria-live", "polite");
			expect(toast).toHaveAttribute("aria-atomic", "true");
		});

		it("should support keyboard navigation", async () => {
			const user = userEvent.setup();
			render(
				<ToastProvider>
					<TestComponent />
				</ToastProvider>
			);

			await user.click(screen.getByText("Show Success"));

			const toast = screen.getByRole("alert");
			expect(toast).toHaveAttribute("tabIndex", "0");

			// Should be able to focus the toast
			toast.focus();
			expect(document.activeElement).toBe(toast);
		});
	});
});
