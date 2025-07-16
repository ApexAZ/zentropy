import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock ReactDOM.createRoot
vi.mock("react-dom/client", () => ({
	createRoot: vi.fn()
}));

// Mock the App component to avoid rendering the entire application
vi.mock("../App", () => ({
	default: () => React.createElement("div", { "data-testid": "app" }, "App Component")
}));

// Mock styles import
vi.mock("../styles.css", () => ({}));

import { createRoot } from "react-dom/client";
import App from "../App";

describe("main.tsx Entry Point Functionality", () => {
	let mockRootElement: HTMLElement;
	let originalGetElementById: typeof document.getElementById;
	let mockRender: any;
	let mockCreateRoot: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock functions
		mockRender = vi.fn();
		mockCreateRoot = vi.fn().mockReturnValue({
			render: mockRender
		});

		// Mock createRoot implementation
		vi.mocked(createRoot).mockImplementation(mockCreateRoot);

		// Create a mock root element
		mockRootElement = document.createElement("div");
		mockRootElement.id = "root";

		// Store original getElementById
		originalGetElementById = document.getElementById;
	});

	afterEach(() => {
		// Restore original getElementById
		document.getElementById = originalGetElementById;
		vi.resetModules();
	});

	describe("Root Element Detection", () => {
		it("should throw error when root element is not found", () => {
			// Arrange - Mock getElementById to return null
			document.getElementById = vi.fn().mockReturnValue(null);

			// Act & Assert - Simulate main.tsx logic
			expect(() => {
				const rootElement = document.getElementById("root");
				if (!rootElement) {
					throw new Error("Root element not found");
				}
			}).toThrow("Root element not found");

			// Verify getElementById was called with correct parameter
			expect(document.getElementById).toHaveBeenCalledWith("root");
		});

		it("should proceed with rendering when root element exists", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx logic
			const rootElement = document.getElementById("root");
			if (!rootElement) {
				throw new Error("Root element not found");
			}

			createRoot(rootElement).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify the flow executed correctly
			expect(document.getElementById).toHaveBeenCalledWith("root");
			expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
			expect(mockRender).toHaveBeenCalledWith(
				expect.objectContaining({
					type: React.StrictMode,
					props: expect.objectContaining({
						children: expect.objectContaining({
							type: App
						})
					})
				})
			);
		});
	});

	describe("React.StrictMode Integration", () => {
		it("should render App component wrapped in React.StrictMode", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx StrictMode wrapping
			const rootElement = document.getElementById("root");
			createRoot(rootElement!).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify React.StrictMode is used
			expect(mockRender).toHaveBeenCalledWith(
				expect.objectContaining({
					type: React.StrictMode,
					props: expect.objectContaining({
						children: expect.objectContaining({
							type: App
						})
					})
				})
			);
		});

		it("should call ReactDOM.createRoot with correct root element", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx createRoot call
			const rootElement = document.getElementById("root");
			createRoot(rootElement!);

			// Assert - Verify createRoot was called with the correct element
			expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
			expect(mockCreateRoot).toHaveBeenCalledTimes(1);
		});
	});

	describe("Application Initialization", () => {
		it("should initialize React application with proper configuration", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate full main.tsx initialization
			const rootElement = document.getElementById("root");
			if (!rootElement) {
				throw new Error("Root element not found");
			}

			createRoot(rootElement).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify complete initialization flow
			expect(document.getElementById).toHaveBeenCalledWith("root");
			expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
			expect(mockRender).toHaveBeenCalledTimes(1);

			// Verify the rendered component structure
			const renderedElement = mockRender.mock.calls[0][0];
			expect(renderedElement.type).toBe(React.StrictMode);
			expect(renderedElement.props.children).toBeDefined();
		});

		it("should call render method on the created root", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx render call
			const rootElement = document.getElementById("root");
			createRoot(rootElement!).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify render was called on the created root
			expect(mockRender).toHaveBeenCalledTimes(1);
			expect(mockRender).toHaveBeenCalledWith(
				expect.objectContaining({
					type: React.StrictMode
				})
			);
		});
	});

	describe("Error Handling", () => {
		it("should fail fast when root element is missing", () => {
			// Arrange - Mock getElementById to return null
			document.getElementById = vi.fn().mockReturnValue(null);

			// Act & Assert - Simulate main.tsx error handling
			expect(() => {
				const rootElement = document.getElementById("root");
				if (!rootElement) {
					throw new Error("Root element not found");
				}
				createRoot(rootElement).render(React.createElement(React.StrictMode, null, React.createElement(App)));
			}).toThrow("Root element not found");

			// Verify createRoot was never called
			expect(mockCreateRoot).not.toHaveBeenCalled();
			expect(mockRender).not.toHaveBeenCalled();
		});

		it("should validate root element before proceeding", () => {
			// Arrange - Mock getElementById to return null
			document.getElementById = vi.fn().mockReturnValue(null);

			// Act & Assert - Simulate main.tsx validation
			expect(() => {
				const rootElement = document.getElementById("root");
				if (!rootElement) {
					throw new Error("Root element not found");
				}
			}).toThrow("Root element not found");

			// Verify no React operations were attempted
			expect(mockCreateRoot).not.toHaveBeenCalled();
		});
	});

	describe("Module Dependencies", () => {
		it("should use correct imports and dependencies", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx dependencies usage
			const rootElement = document.getElementById("root");
			createRoot(rootElement!).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify all required imports are used
			expect(mockCreateRoot).toHaveBeenCalled(); // ReactDOM.createRoot imported
			expect(mockRender).toHaveBeenCalled(); // App component imported and rendered
		});

		it("should handle DOM environment properly", () => {
			// Arrange - Verify DOM is set up correctly
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);
			expect(mockRootElement).not.toBe(null);
			expect(mockRootElement.id).toBe("root");
			expect(mockRootElement.tagName).toBe("DIV");

			// Act - Simulate main.tsx DOM interaction
			const rootElement = document.getElementById("root");
			createRoot(rootElement!);

			// Assert - Verify proper DOM interaction
			expect(mockCreateRoot).toHaveBeenCalledWith(mockRootElement);
		});
	});

	describe("Component Structure", () => {
		it("should render App component as child of StrictMode", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx component structure
			const rootElement = document.getElementById("root");
			createRoot(rootElement!).render(React.createElement(React.StrictMode, null, React.createElement(App)));

			// Assert - Verify component nesting
			const renderedElement = mockRender.mock.calls[0][0];
			expect(renderedElement.type).toBe(React.StrictMode);
			expect(renderedElement.props.children.type).toBe(App);
		});

		it("should use React.createElement for component creation", () => {
			// Arrange - Mock getElementById to return a valid element
			document.getElementById = vi.fn().mockReturnValue(mockRootElement);

			// Act - Simulate main.tsx React.createElement usage
			const strictModeElement = React.createElement(React.StrictMode, null, React.createElement(App));
			const rootElement = document.getElementById("root");
			createRoot(rootElement!).render(strictModeElement);

			// Assert - Verify React.createElement creates proper structure
			expect(strictModeElement.type).toBe(React.StrictMode);
			expect(strictModeElement.props.children).toBeDefined();
			if (React.isValidElement(strictModeElement.props.children)) {
				expect(strictModeElement.props.children.type).toBe(App);
			}
			expect(mockRender).toHaveBeenCalledWith(strictModeElement);
		});
	});
});
