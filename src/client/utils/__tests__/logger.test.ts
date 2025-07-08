import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, LogLevel, LogEntry } from "../logger";

describe("logger", () => {
	// Mock console methods
	const consoleMocks = {
		log: vi.spyOn(console, "log"),
		info: vi.spyOn(console, "info"),
		warn: vi.spyOn(console, "warn"),
		error: vi.spyOn(console, "error")
	};

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		logger.clearHistory();
	});

	afterEach(() => {
		// Clean up after each test
		logger.clearHistory();
	});

	describe("Log Level Methods", () => {
		it("should log debug messages with correct level", () => {
			const message = "Debug message";
			const data = { test: "data" };

			logger.debug(message, data);

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].level).toBe("debug");
			expect(history[0].message).toBe(message);
			expect(history[0].data).toBe(data);
		});

		it("should log info messages with correct level", () => {
			const message = "Info message";
			const data = { info: "data" };

			logger.info(message, data);

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].level).toBe("info");
			expect(history[0].message).toBe(message);
			expect(history[0].data).toBe(data);
		});

		it("should log warn messages with correct level", () => {
			const message = "Warning message";
			const data = { warn: "data" };

			logger.warn(message, data);

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].level).toBe("warn");
			expect(history[0].message).toBe(message);
			expect(history[0].data).toBe(data);
		});

		it("should log error messages with correct level", () => {
			const message = "Error message";
			const data = { error: "data" };

			logger.error(message, data);

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].level).toBe("error");
			expect(history[0].message).toBe(message);
			expect(history[0].data).toBe(data);
		});

		it("should handle logging without additional data", () => {
			const message = "Simple message";

			logger.info(message);

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].level).toBe("info");
			expect(history[0].message).toBe(message);
			expect(history[0].data).toBeUndefined();
		});
	});

	describe("Environment Behavior", () => {
		it("should not log to console in non-development mode", () => {
			// In test environment, console should not be called
			const message = "Test message";

			logger.info(message);

			expect(consoleMocks.info).not.toHaveBeenCalled();

			// But should still add to history
			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].message).toBe(message);
		});

		it("should maintain log history regardless of environment", () => {
			logger.info("Message 1");
			logger.warn("Message 2");
			logger.error("Message 3");

			const history = logger.getHistory();
			expect(history).toHaveLength(3);
			expect(history[0].message).toBe("Message 1");
			expect(history[1].message).toBe("Message 2");
			expect(history[2].message).toBe("Message 3");
		});
	});

	describe("Log History Management", () => {
		it("should maintain log history", () => {
			logger.info("Message 1");
			logger.warn("Message 2");
			logger.error("Message 3");

			const history = logger.getHistory();
			expect(history).toHaveLength(3);
			expect(history[0].message).toBe("Message 1");
			expect(history[1].message).toBe("Message 2");
			expect(history[2].message).toBe("Message 3");
		});

		it("should limit history to maximum size", () => {
			// Log 105 messages (5 more than max of 100)
			for (let i = 1; i <= 105; i++) {
				logger.info(`Message ${i}`);
			}

			const history = logger.getHistory();
			expect(history).toHaveLength(100);
			// Should keep the last 100 messages (6-105)
			expect(history[0].message).toBe("Message 6");
			expect(history[99].message).toBe("Message 105");
		});

		it("should clear history when clearHistory is called", () => {
			logger.info("Message 1");
			logger.info("Message 2");

			let history = logger.getHistory();
			expect(history).toHaveLength(2);

			logger.clearHistory();

			history = logger.getHistory();
			expect(history).toHaveLength(0);
		});

		it("should return a copy of history to prevent external modification", () => {
			logger.info("Original message");

			const history = logger.getHistory();
			history.push({
				level: "info",
				message: "Malicious message",
				timestamp: new Date()
			});

			const actualHistory = logger.getHistory();
			expect(actualHistory).toHaveLength(1);
			expect(actualHistory[0].message).toBe("Original message");
		});
	});

	describe("Log Entry Structure", () => {
		it("should create log entries with correct structure", () => {
			const message = "Test message";
			const data = { test: "data" };
			const beforeTimestamp = new Date();

			logger.info(message, data);

			const afterTimestamp = new Date();
			const history = logger.getHistory();
			const logEntry = history[0];

			expect(logEntry).toHaveProperty("level", "info");
			expect(logEntry).toHaveProperty("message", message);
			expect(logEntry).toHaveProperty("data", data);
			expect(logEntry).toHaveProperty("timestamp");
			expect(logEntry.timestamp).toBeInstanceOf(Date);
			expect(logEntry.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
			expect(logEntry.timestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
		});

		it("should create unique timestamps for sequential logs", () => {
			logger.info("First message");
			logger.info("Second message");

			const history = logger.getHistory();
			expect(history).toHaveLength(2);
			expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(history[1].timestamp.getTime());
		});
	});

	describe("Data Handling", () => {
		it("should handle complex data objects", () => {
			const message = "Complex data test";
			const complexData = {
				nested: {
					array: [1, 2, 3],
					object: { key: "value" }
				},
				function: () => "test",
				date: new Date(),
				null: null,
				undefined: undefined
			};

			logger.info(message, complexData);

			const history = logger.getHistory();
			expect(history[0].data).toBe(complexData);
		});

		it("should handle primitive data types", () => {
			logger.info("String data", "test string");
			logger.info("Number data", 42);
			logger.info("Boolean data", true);
			logger.info("Null data", null);

			const history = logger.getHistory();
			expect(history[0].data).toBe("test string");
			expect(history[1].data).toBe(42);
			expect(history[2].data).toBe(true);
			expect(history[3].data).toBe(null);
		});

		it("should handle undefined data", () => {
			logger.info("Undefined data", undefined);

			const history = logger.getHistory();
			expect(history[0].data).toBeUndefined();
		});

		it("should handle circular references in data", () => {
			const circularData: { self?: unknown } = {};
			circularData.self = circularData;

			// Should not throw error
			expect(() => logger.info("Circular data", circularData)).not.toThrow();

			const history = logger.getHistory();
			expect(history[0].data).toBe(circularData);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty string messages", () => {
			logger.info("");

			const history = logger.getHistory();
			expect(history).toHaveLength(1);
			expect(history[0].message).toBe("");
		});

		it("should handle special characters in messages", () => {
			const message = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";

			logger.info(message);

			const history = logger.getHistory();
			expect(history[0].message).toBe(message);
		});

		it("should handle unicode characters in messages", () => {
			const message = "Unicode: 🚀 测试 العربية";

			logger.info(message);

			const history = logger.getHistory();
			expect(history[0].message).toBe(message);
		});

		it("should handle very long messages", () => {
			const longMessage = "A".repeat(10000);

			logger.info(longMessage);

			const history = logger.getHistory();
			expect(history[0].message).toBe(longMessage);
		});

		it("should handle rapid sequential logging", () => {
			// Log many messages quickly
			for (let i = 0; i < 10; i++) {
				logger.info(`Rapid message ${i}`);
			}

			const history = logger.getHistory();
			expect(history).toHaveLength(10);

			// Verify all messages are preserved
			for (let i = 0; i < 10; i++) {
				expect(history[i].message).toBe(`Rapid message ${i}`);
			}
		});
	});

	describe("Type Safety", () => {
		it("should maintain type safety for LogLevel", () => {
			logger.info("Type test");

			const logEntry = logger.getHistory()[0];
			const level: LogLevel = logEntry.level;

			expect(["debug", "info", "warn", "error"]).toContain(level);
		});

		it("should maintain type safety for LogEntry", () => {
			logger.info("Type test", { test: "data" });

			const logEntry: LogEntry = logger.getHistory()[0];

			expect(logEntry.level).toBeDefined();
			expect(logEntry.message).toBeDefined();
			expect(logEntry.timestamp).toBeDefined();
			expect(logEntry.data).toBeDefined();
		});
	});
});
