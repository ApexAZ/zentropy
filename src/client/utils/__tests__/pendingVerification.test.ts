import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	setPendingVerification,
	getPendingVerification,
	clearPendingVerification,
	hasPendingVerification,
	requestAppTabFocus,
	requestAppTabClosure
} from "../pendingVerification";

// Mock localStorage
const mockLocalStorage = {
	storage: new Map<string, string>(),
	getItem: vi.fn((key: string) => mockLocalStorage.storage.get(key) || null),
	setItem: vi.fn((key: string, value: string) => {
		mockLocalStorage.storage.set(key, value);
	}),
	removeItem: vi.fn((key: string) => {
		mockLocalStorage.storage.delete(key);
	}),
	clear: vi.fn(() => {
		mockLocalStorage.storage.clear();
	})
};

Object.defineProperty(window, "localStorage", {
	value: mockLocalStorage
});

describe("pendingVerification utilities", () => {
	beforeEach(() => {
		// Clear localStorage before each test
		mockLocalStorage.storage.clear();
		vi.clearAllMocks();
	});

	describe("setPendingVerification", () => {
		it("should store email and timestamp in localStorage", () => {
			const email = "test@example.com";
			const beforeTime = Date.now();

			setPendingVerification(email);

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"pendingEmailVerification",
				expect.stringContaining(email)
			);

			const stored = getPendingVerification();
			expect(stored).not.toBeNull();
			expect(stored?.email).toBe(email);
			expect(stored?.timestamp).toBeGreaterThanOrEqual(beforeTime);
		});
	});

	describe("getPendingVerification", () => {
		it("should return null when no pending verification exists", () => {
			const result = getPendingVerification();
			expect(result).toBeNull();
		});

		it("should return valid pending verification data", () => {
			const email = "test@example.com";
			setPendingVerification(email);

			const result = getPendingVerification();
			expect(result).not.toBeNull();
			expect(result?.email).toBe(email);
			expect(typeof result?.timestamp).toBe("number");
		});

		it("should return null and clear expired data", () => {
			const email = "test@example.com";

			// Manually set expired data (25 hours ago)
			const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000;
			const expiredData = JSON.stringify({
				email,
				timestamp: expiredTimestamp
			});
			mockLocalStorage.storage.set("pendingEmailVerification", expiredData);

			const result = getPendingVerification();
			expect(result).toBeNull();
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("pendingEmailVerification");
		});

		it("should handle invalid JSON data gracefully", () => {
			mockLocalStorage.storage.set("pendingEmailVerification", "invalid-json");

			const result = getPendingVerification();
			expect(result).toBeNull();
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("pendingEmailVerification");
		});
	});

	describe("clearPendingVerification", () => {
		it("should remove pending verification data from localStorage", () => {
			setPendingVerification("test@example.com");
			expect(hasPendingVerification()).toBe(true);

			clearPendingVerification();
			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("pendingEmailVerification");
			expect(hasPendingVerification()).toBe(false);
		});
	});

	describe("hasPendingVerification", () => {
		it("should return false when no pending verification exists", () => {
			expect(hasPendingVerification()).toBe(false);
		});

		it("should return true when valid pending verification exists", () => {
			setPendingVerification("test@example.com");
			expect(hasPendingVerification()).toBe(true);
		});

		it("should return false when pending verification is expired", () => {
			// Manually set expired data
			const expiredData = JSON.stringify({
				email: "test@example.com",
				timestamp: Date.now() - 25 * 60 * 60 * 1000
			});
			mockLocalStorage.storage.set("pendingEmailVerification", expiredData);

			expect(hasPendingVerification()).toBe(false);
		});
	});

	describe("expiration handling", () => {
		it("should keep data valid within 24 hours", () => {
			// Set data 23 hours ago (should still be valid)
			const validTimestamp = Date.now() - 23 * 60 * 60 * 1000;
			const validData = JSON.stringify({
				email: "test@example.com",
				timestamp: validTimestamp
			});
			mockLocalStorage.storage.set("pendingEmailVerification", validData);

			const result = getPendingVerification();
			expect(result).not.toBeNull();
			expect(result?.email).toBe("test@example.com");
		});
	});

	describe("requestAppTabFocus", () => {
		beforeEach(() => {
			vi.clearAllTimers();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should set focus request in localStorage", () => {
			const timestampSpy = vi.spyOn(Date, "now").mockReturnValue(123456789);

			requestAppTabFocus();

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith("appTabFocusRequest", "123456789");

			timestampSpy.mockRestore();
		});

		it("should remove focus request after 1 second", () => {
			requestAppTabFocus();

			// Fast-forward time by 1 second
			vi.advanceTimersByTime(1000);

			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("appTabFocusRequest");
		});

		it("should handle localStorage errors gracefully", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			mockLocalStorage.setItem.mockImplementationOnce(() => {
				throw new Error("localStorage error");
			});

			// Should not throw
			expect(() => requestAppTabFocus()).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith("Failed to request app tab focus:", expect.any(Error));

			consoleSpy.mockRestore();
		});
	});

	describe("requestAppTabClosure", () => {
		beforeEach(() => {
			vi.clearAllTimers();
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should set closure request in localStorage", () => {
			const timestampSpy = vi.spyOn(Date, "now").mockReturnValue(123456789);

			requestAppTabClosure();

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith("appTabClosureRequest", "123456789");

			timestampSpy.mockRestore();
		});

		it("should remove closure request after 1 second", () => {
			requestAppTabClosure();

			// Fast-forward time by 1 second
			vi.advanceTimersByTime(1000);

			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("appTabClosureRequest");
		});

		it("should handle localStorage errors gracefully", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			mockLocalStorage.setItem.mockImplementationOnce(() => {
				throw new Error("localStorage error");
			});

			// Should not throw
			expect(() => requestAppTabClosure()).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith("Failed to request app tab closure:", expect.any(Error));

			consoleSpy.mockRestore();
		});
	});
});
