/**
 * Error Handling Utilities
 *
 * Provides comprehensive error handling with user-friendly messages,
 * resolution guidance, and retry mechanisms for account security operations.
 */

export interface ErrorDetails {
	/** User-friendly error message */
	message: string;
	/** Specific guidance for resolving the error */
	resolution?: string;
	/** Whether this error is retryable */
	isRetryable: boolean;
	/** Error severity level */
	severity: "error" | "warning" | "info";
	/** Error category for analytics/tracking */
	category: "network" | "auth" | "validation" | "server" | "unknown";
}

export interface AccountSecurityErrorDetails extends ErrorDetails {
	/** Whether user should be redirected to login */
	requiresReauth?: boolean;
	/** Whether user should contact support */
	requiresSupport?: boolean;
}

/**
 * Maps backend error messages to user-friendly error details
 */
export function mapAccountSecurityError(
	error: Error | string,
	context: "loading" | "linking" | "unlinking" = "loading"
): AccountSecurityErrorDetails {
	const errorMessage = typeof error === "string" ? error : error.message;
	const lowerMessage = errorMessage.toLowerCase();

	// Network/Connection Errors
	if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
		return {
			message: "Connection problem. Please check your internet connection and try again.",
			resolution: "Check your internet connection and try again in a moment.",
			isRetryable: true,
			severity: "error",
			category: "network"
		};
	}

	// Authentication Errors
	if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
		return {
			message: "Your session has expired. Please sign in again.",
			resolution: "Sign out and sign back in to refresh your session.",
			isRetryable: false,
			severity: "error",
			category: "auth",
			requiresReauth: true
		};
	}

	// Google Account Linking Specific Errors
	if (context === "linking") {
		if (
			lowerMessage.includes("email does not match") ||
			lowerMessage.includes("email mismatch") ||
			lowerMessage.includes("email must match")
		) {
			return {
				message: "The Google account email doesn't match your account email.",
				resolution:
					"Make sure you're signing in with the Google account that uses the same email address as your account.",
				isRetryable: true,
				severity: "warning",
				category: "validation"
			};
		}

		if (lowerMessage.includes("already linked") || lowerMessage.includes("already associated")) {
			return {
				message: "This Google account is already linked to another user.",
				resolution: "Use a different Google account or contact support if you believe this is your account.",
				isRetryable: false,
				severity: "error",
				category: "validation",
				requiresSupport: true
			};
		}

		if (lowerMessage.includes("invalid google credential") || lowerMessage.includes("invalid credential")) {
			return {
				message: "Google sign-in was not completed successfully.",
				resolution:
					"Try the Google sign-in process again. Make sure you complete the entire Google authentication flow.",
				isRetryable: true,
				severity: "warning",
				category: "auth"
			};
		}

		if (lowerMessage.includes("google sign-in was cancelled") || lowerMessage.includes("cancelled")) {
			return {
				message: "Google sign-in was cancelled.",
				resolution: 'Click "Link Google Account" and complete the Google sign-in process.',
				isRetryable: true,
				severity: "info",
				category: "auth"
			};
		}
	}

	// Google Account Unlinking Specific Errors
	if (context === "unlinking") {
		if (lowerMessage.includes("incorrect password") || lowerMessage.includes("password is incorrect")) {
			return {
				message: "The password you entered is incorrect.",
				resolution: "Enter your current account password to confirm this action.",
				isRetryable: true,
				severity: "warning",
				category: "validation"
			};
		}

		if (lowerMessage.includes("no google account") || lowerMessage.includes("not linked")) {
			return {
				message: "No Google account is currently linked to your account.",
				resolution: "Refresh the page to see the current account status.",
				isRetryable: true,
				severity: "info",
				category: "validation"
			};
		}

		if (lowerMessage.includes("last authentication method") || lowerMessage.includes("cannot remove last")) {
			return {
				message: "You can't remove your last authentication method.",
				resolution:
					"Add another authentication method (like setting a password) before removing Google authentication.",
				isRetryable: false,
				severity: "warning",
				category: "validation"
			};
		}
	}

	// Rate Limiting Errors
	if (
		lowerMessage.includes("rate limit") ||
		lowerMessage.includes("too many requests") ||
		lowerMessage.includes("429")
	) {
		return {
			message: "Too many requests. Please wait before trying again.",
			resolution: "Wait a few minutes before attempting this action again.",
			isRetryable: true,
			severity: "warning",
			category: "validation"
		};
	}

	// Validation Errors
	if (lowerMessage.includes("validation") || lowerMessage.includes("invalid") || lowerMessage.includes("400")) {
		return {
			message: "The information provided is not valid.",
			resolution: "Please check your input and try again.",
			isRetryable: true,
			severity: "warning",
			category: "validation"
		};
	}

	// Server Errors
	if (
		lowerMessage.includes("server error") ||
		lowerMessage.includes("internal server") ||
		lowerMessage.includes("500")
	) {
		return {
			message: "A server error occurred. Please try again.",
			resolution: "This is a temporary problem. Try again in a few moments.",
			isRetryable: true,
			severity: "error",
			category: "server"
		};
	}

	// Service Unavailable
	if (lowerMessage.includes("service unavailable") || lowerMessage.includes("503")) {
		return {
			message: "The service is temporarily unavailable.",
			resolution: "The service is temporarily down. Please try again in a few minutes.",
			isRetryable: true,
			severity: "error",
			category: "server"
		};
	}

	// Context-specific fallbacks
	const contextMessages = {
		loading: "Unable to load account security information.",
		linking: "Unable to link Google account.",
		unlinking: "Unable to unlink Google account."
	};

	// Unknown/Fallback Error
	return {
		message: contextMessages[context] || "An unexpected error occurred.",
		resolution: "Please try again. If the problem persists, contact support.",
		isRetryable: true,
		severity: "error",
		category: "unknown",
		requiresSupport: true
	};
}

/**
 * Determines if an error should trigger an automatic retry
 */
export function shouldAutoRetry(errorDetails: ErrorDetails, attemptCount: number): boolean {
	// Don't auto-retry after 3 attempts
	if (attemptCount >= 3) return false;

	// Only auto-retry network errors and server errors
	if (errorDetails.category === "network" || errorDetails.category === "server") {
		return errorDetails.isRetryable;
	}

	return false;
}

/**
 * Calculates retry delay with exponential backoff
 */
export function getRetryDelay(attemptCount: number): number {
	// Base delay of 1 second, doubling each time (1s, 2s, 4s)
	return Math.min(1000 * Math.pow(2, attemptCount), 5000);
}

/**
 * Enhanced error handler for account security operations
 */
export class AccountSecurityErrorHandler {
	private static readonly MAX_RETRY_ATTEMPTS = 3;

	/**
	 * Process an error with enhanced error handling
	 */
	static processError(
		error: Error | string,
		context: "loading" | "linking" | "unlinking" = "loading"
	): AccountSecurityErrorDetails {
		return mapAccountSecurityError(error, context);
	}

	/**
	 * Execute an operation with automatic retry logic
	 */
	static async executeWithRetry<T>(
		operation: () => Promise<T>,
		context: "loading" | "linking" | "unlinking" = "loading",
		onError?: (error: AccountSecurityErrorDetails, attemptCount: number) => void
	): Promise<T> {
		let lastError: Error | null = null;
		let attemptCount = 0;

		while (attemptCount < this.MAX_RETRY_ATTEMPTS) {
			try {
				attemptCount++;
				return await operation();
			} catch (error) {
				lastError = error as Error;
				const errorDetails = this.processError(error as Error, context);

				// Notify callback about the error
				if (onError) {
					onError(errorDetails, attemptCount);
				}

				// Check if we should retry
				if (shouldAutoRetry(errorDetails, attemptCount)) {
					const delay = getRetryDelay(attemptCount - 1);
					await new Promise(resolve => setTimeout(resolve, delay));
					continue;
				}

				// Don't retry, re-throw the error
				throw lastError;
			}
		}

		// If we've exhausted all retries, throw the last error
		throw lastError;
	}

	/**
	 * Get user-friendly error message for display
	 */
	static getDisplayMessage(error: Error | string, context: "loading" | "linking" | "unlinking" = "loading"): string {
		const errorDetails = this.processError(error, context);
		return errorDetails.message;
	}

	/**
	 * Get resolution guidance for an error
	 */
	static getResolutionGuidance(
		error: Error | string,
		context: "loading" | "linking" | "unlinking" = "loading"
	): string | undefined {
		const errorDetails = this.processError(error, context);
		return errorDetails.resolution;
	}

	/**
	 * Check if an error is retryable
	 */
	static isRetryable(error: Error | string, context: "loading" | "linking" | "unlinking" = "loading"): boolean {
		const errorDetails = this.processError(error, context);
		return errorDetails.isRetryable;
	}
}
