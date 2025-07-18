import { fireEvent, screen } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";

/**
 * Test utilities for common patterns to speed up test execution
 */

/**
 * Fill verification code inputs quickly using fireEvent
 * @param code - 6-digit verification code
 */
export const fillVerificationCode = (code: string): void => {
	const codeInputs = screen.getAllByRole("textbox").filter(input => input.getAttribute("inputMode") === "numeric");

	code.split("").forEach((digit, index) => {
		if (index < codeInputs.length) {
			fireEvent.change(codeInputs[index], { target: { value: digit } });
		}
	});
};

/**
 * Fill form input quickly using fireEvent
 * @param labelText - Label text to find input
 * @param value - Value to fill
 */
export const fillInput = (labelText: string | RegExp, value: string): void => {
	const input = screen.getByLabelText(labelText);
	fireEvent.change(input, { target: { value } });
};

/**
 * Click button quickly using fireEvent
 * @param name - Button text or accessible name
 */
export const clickButton = (name: string | RegExp): void => {
	const button = screen.getByRole("button", { name });
	fireEvent.click(button);
};

/**
 * Simulate paste event for faster testing
 * @param element - HTML element to paste into
 * @param text - Text to paste
 */
export const simulatePaste = (element: HTMLElement, text: string): void => {
	const pasteEvent = new ClipboardEvent("paste", {
		clipboardData: new DataTransfer()
	});
	pasteEvent.clipboardData?.setData("text/plain", text);
	fireEvent(element, pasteEvent);
};

/**
 * Mock fetch response helper
 * @param ok - Response ok status
 * @param data - Response data
 */
export const mockFetchResponse = (ok: boolean, data: any) => {
	return {
		ok,
		json: () => Promise.resolve(data),
		status: ok ? 200 : 400,
		statusText: ok ? "OK" : "Bad Request"
	};
};

/**
 * Setup mock timers for tests that need time control
 */
export const setupMockTimers = () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
	});

	return {
		advanceTime: (ms: number) => vi.advanceTimersByTimeAsync(ms)
	};
};
