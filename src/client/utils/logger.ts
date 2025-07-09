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
		if (!this.isDevelopment) {
			this.sendToProductionLogging(entry);
		}
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

	private async sendToProductionLogging(entry: LogEntry): Promise<void> {
		try {
			// Configuration for production logging
			const config = {
				endpoint: import.meta.env.VITE_LOGGING_ENDPOINT || "/api/v1/logs",
				maxRetries: 3,
				retryDelay: 1000,
				batchSize: 10,
				flushInterval: 5000 // 5 seconds
			};

			// Only send error and warn level logs in production to reduce noise
			if (entry.level !== "error" && entry.level !== "warn") {
				return;
			}

			// Prepare log payload
			const payload = {
				timestamp: entry.timestamp.toISOString(),
				level: entry.level,
				message: entry.message,
				data: entry.data,
				userAgent: navigator.userAgent,
				url: window.location.href,
				userId: this.getUserId(),
				sessionId: this.getSessionId()
			};

			// Send to logging endpoint with retry logic
			await this.sendWithRetry(config.endpoint, payload, config.maxRetries, config.retryDelay);
		} catch (error) {
			// Fail silently in production to avoid breaking the app
			// Store failed logs for potential retry
			console.warn("Failed to send log to production service:", error);
		}
	}

	private async sendWithRetry(
		endpoint: string,
		payload: unknown,
		maxRetries: number,
		retryDelay: number
	): Promise<void> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify(payload)
				});

				if (response.ok) {
					return; // Success
				}

				// If it's the last attempt, throw an error
				if (attempt === maxRetries) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, retryDelay));
				retryDelay *= 2; // Exponential backoff
			} catch (error) {
				if (attempt === maxRetries) {
					throw error;
				}

				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, retryDelay));
				retryDelay *= 2; // Exponential backoff
			}
		}
	}

	private getUserId(): string | null {
		// Try to get user ID from localStorage (set by auth system)
		try {
			const token = localStorage.getItem("token") || sessionStorage.getItem("token");
			if (token) {
				// Parse JWT token to get user ID (basic parsing, not validation)
				const parts = token.split(".");
				if (parts.length >= 3 && parts[1]) {
					const payload = JSON.parse(atob(parts[1]));
					return payload.sub || payload.user_id || null;
				}
			}
		} catch {
			// Ignore errors when parsing token
		}
		return null;
	}

	private getSessionId(): string {
		// Generate or retrieve session ID for tracking
		let sessionId = sessionStorage.getItem("logger_session_id");
		if (!sessionId) {
			sessionId = crypto.randomUUID();
			sessionStorage.setItem("logger_session_id", sessionId);
		}
		return sessionId;
	}
}

export const logger = new Logger();
export type { LogLevel, LogEntry };
