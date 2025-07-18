/**
 * Test Rendering Utilities
 *
 * Provides consistent test wrappers and rendering utilities.
 * Following CLAUDE.md principles for shared test utilities.
 */

import React from "react";
import { render, RenderOptions } from "@testing-library/react";
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
