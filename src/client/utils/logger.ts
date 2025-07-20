/**
 * Simple logger utility for development and production
 * Replaces console.log statements with configurable logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: Date;
	data?: unknown;
}

class Logger {
	private isDevelopment = import.meta.env.MODE === "development";
	private logHistory: LogEntry[] = [];
	private maxHistorySize = 100;

	private log(level: LogLevel, message: string, data?: unknown): void {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date(),
			data
		};

		// Add to history (keep last 100 entries)
		this.logHistory.push(entry);
		if (this.logHistory.length > this.maxHistorySize) {
			this.logHistory.shift();
		}

		// In development, log to console
		if (this.isDevelopment) {
			const timestamp = entry.timestamp.toISOString();
			const logMessage = `[${timestamp}] ${message}`;

			switch (level) {
				case "debug":
					console.log(logMessage, data);
					break;
				case "info":
					console.info(logMessage, data);
					break;
				case "warn":
					console.warn(logMessage, data);
					break;
				case "error":
					console.error(logMessage, data);
					break;
			}
		}

		// In production, send to logging service
		// TEMP: Disabled production logging to prevent infinite loop
		// if (!this.isDevelopment) {
		// 	this.sendToProductionLogging(entry);
		// }
	}

	debug(message: string, data?: unknown): void {
		this.log("debug", message, data);
	}

	info(message: string, data?: unknown): void {
		this.log("info", message, data);
	}

	warn(message: string, data?: unknown): void {
		this.log("warn", message, data);
	}

	error(message: string, data?: unknown): void {
		this.log("error", message, data);
	}

	getHistory(): LogEntry[] {
		return [...this.logHistory];
	}

	clearHistory(): void {
		this.logHistory = [];
	}

	// TODO: Production logging implementation will be added in the future
	// when the logging infrastructure is properly set up to avoid infinite loops
}

export const logger = new Logger();
export type { LogLevel, LogEntry };
