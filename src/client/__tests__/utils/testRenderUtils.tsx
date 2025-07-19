/**
 * Test Rendering Utilities
 *
 * Provides consistent test wrappers and rendering utilities.
 * Following CLAUDE.md principles for shared test utilities.
 */

import React from "react";
import { render, RenderOptions, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import { ToastProvider } from "../../contexts/ToastContext";

/**
 * Test wrapper component that provides all necessary contexts
 */
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return <ToastProvider>{children}</ToastProvider>;
};

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
	return render(ui, { wrapper: TestWrapper, ...options });
}

/**
 * Utility for rendering components that require ToastProvider
 */
export function renderWithToast(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
	return renderWithProviders(ui, options);
}

/**
 * Common test setup for modal components
 */
export function setupModalTest() {
	// Mock document.body.style for modal backdrop
	Object.defineProperty(document.body.style, "overflow", {
		writable: true,
		value: ""
	});

	// Mock window.HTMLElement.prototype.scrollIntoView for accessibility
	window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

/**
 * Common cleanup for modal components
 */
export function cleanupModalTest() {
	document.body.style.overflow = "";
	vi.clearAllMocks();
}

// 🚀 PERFORMANCE OPTIMIZATION UTILITIES
// ✅ Fast alternatives to userEvent for common test patterns

/**
 * Fast user interaction utilities using fireEvent
 * 99%+ faster than userEvent for most test scenarios
 */
export const fastUserActions = {
	/**
	 * Fast alternative to userEvent.click()
	 * Use for buttons, links, and clickable elements
	 */
	click: (element: Element) => {
		fireEvent.click(element);
	},

	/**
	 * Fast alternative to userEvent.type()
	 * Use for text inputs, textareas
	 */
	type: (element: Element, text: string) => {
		fireEvent.change(element, { target: { value: text } });
	},

	/**
	 * Fast alternative to userEvent.clear() + userEvent.type()
	 * Use for replacing input values completely
	 */
	replaceText: (element: Element, text: string) => {
		fireEvent.change(element, { target: { value: text } });
	},

	/**
	 * Fast alternative to userEvent.selectOptions()
	 * Use for select dropdowns
	 */
	selectOption: (selectElement: Element, value: string) => {
		fireEvent.change(selectElement, { target: { value } });
	},

	/**
	 * Fast alternative to userEvent.keyboard() for common keys
	 * Use for Enter, Escape, Tab, etc.
	 */
	pressKey: (element: Element, key: string) => {
		fireEvent.keyDown(element, { key });
	},

	/**
	 * Fast alternative to userEvent.hover()
	 * Use for hover states and tooltips
	 */
	hover: (element: Element) => {
		fireEvent.mouseEnter(element);
	},

	/**
	 * Fast alternative to userEvent.unhover()
	 * Use for removing hover states
	 */
	unhover: (element: Element) => {
		fireEvent.mouseLeave(element);
	}
};

/**
 * Fast form filling utility
 * Replaces multiple userEvent calls with single fireEvent calls
 */
export function fastFillForm(formData: Record<string, string>) {
	return {
		/**
		 * Fill form fields by label text
		 * @param getByLabelText - screen.getByLabelText function
		 */
		byLabel: (getByLabelText: (text: RegExp | string) => Element) => {
			Object.entries(formData).forEach(([label, value]) => {
				const field = getByLabelText(new RegExp(label, "i"));
				fastUserActions.type(field, value);
			});
		},

		/**
		 * Fill form fields by placeholder text
		 * @param getByPlaceholderText - screen.getByPlaceholderText function
		 */
		byPlaceholder: (getByPlaceholderText: (text: RegExp | string) => Element) => {
			Object.entries(formData).forEach(([placeholder, value]) => {
				const field = getByPlaceholderText(new RegExp(placeholder, "i"));
				fastUserActions.type(field, value);
			});
		},

		/**
		 * Fill form fields by test-id
		 * @param getByTestId - screen.getByTestId function
		 */
		byTestId: (getByTestId: (testId: string) => Element) => {
			Object.entries(formData).forEach(([testId, value]) => {
				const field = getByTestId(testId);
				fastUserActions.type(field, value);
			});
		}
	};
}

/**
 * Fast React state synchronization
 * Replaces complex waitFor patterns with simple act() calls
 */
export async function fastStateSync() {
	await act(async () => {
		await Promise.resolve();
	});
}

/**
 * Performance-optimized render with common setup
 * Includes state synchronization and common patterns
 */
export async function renderFast(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
	const result = renderWithToast(ui, options);

	// Let React finish initial rendering
	await fastStateSync();

	return result;
}
