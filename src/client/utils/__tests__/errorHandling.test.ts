import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapAccountSecurityError, shouldAutoRetry, getRetryDelay, AccountSecurityErrorHandler } from "../errorHandling";

describe("mapAccountSecurityError", () => {
	describe("User understands network/connection errors", () => {
		it("should map network errors to user-friendly messages", () => {
			const networkErrors = ["Network error", "Failed to fetch", "Connection refused", "Connection timeout"];

			networkErrors.forEach(errorMessage => {
				const result = mapAccountSecurityError(errorMessage);
				expect(result.message).toBe("Connection problem. Please check your internet connection and try again.");
				expect(result.resolution).toBe("Check your internet connection and try again in a moment.");
				expect(result.isRetryable).toBe(true);
				expect(result.category).toBe("network");
			});
		});
	});

	describe("User understands authentication errors", () => {
		it("should map authentication errors to user-friendly messages", () => {
			const authErrors = ["Unauthorized", "401 Unauthorized", "HTTP 401: Unauthorized"];

			authErrors.forEach(errorMessage => {
				const result = mapAccountSecurityError(errorMessage);
				expect(result.message).toBe("Your session has expired. Please sign in again.");
				expect(result.resolution).toBe("Sign out and sign back in to refresh your session.");
				expect(result.isRetryable).toBe(false);
				expect(result.category).toBe("auth");
				expect(result.requiresReauth).toBe(true);
			});
		});
	});

	describe("User understands linking-specific errors", () => {
		it("should map email mismatch errors for linking context", () => {
			const result = mapAccountSecurityError("Google email does not match account email", "linking");
			expect(result.message).toBe("The Google account email doesn't match your account email.");
			expect(result.resolution).toBe(
				"Make sure you're signing in with the Google account that uses the same email address as your account."
			);
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("validation");
		});

		it("should map already linked errors for linking context", () => {
			const result = mapAccountSecurityError("Google account already linked to another user", "linking");
			expect(result.message).toBe("This Google account is already linked to another user.");
			expect(result.resolution).toBe(
				"Use a different Google account or contact support if you believe this is your account."
			);
			expect(result.isRetryable).toBe(false);
			expect(result.category).toBe("validation");
			expect(result.requiresSupport).toBe(true);
		});

		it("should map invalid credential errors for linking context", () => {
			const result = mapAccountSecurityError("Invalid Google credential", "linking");
			expect(result.message).toBe("Google sign-in was not completed successfully.");
			expect(result.resolution).toBe(
				"Try the Google sign-in process again. Make sure you complete the entire Google authentication flow."
			);
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("auth");
		});

		it("should map cancelled OAuth errors for linking context", () => {
			const result = mapAccountSecurityError("Google sign-in was cancelled", "linking");
			expect(result.message).toBe("Google sign-in was cancelled.");
			expect(result.resolution).toBe('Click "Link Google Account" and complete the Google sign-in process.');
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("auth");
			expect(result.severity).toBe("info");
		});
	});

	describe("User understands unlinking-specific errors", () => {
		it("should map incorrect password errors for unlinking context", () => {
			const result = mapAccountSecurityError("Incorrect password", "unlinking");
			expect(result.message).toBe("The password you entered is incorrect.");
			expect(result.resolution).toBe("Enter your current account password to confirm this action.");
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("validation");
		});

		it("should map no Google account errors for unlinking context", () => {
			const result = mapAccountSecurityError("No Google account is currently linked", "unlinking");
			expect(result.message).toBe("No Google account is currently linked to your account.");
			expect(result.resolution).toBe("Refresh the page to see the current account status.");
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("validation");
		});

		it("should map last authentication method errors for unlinking context", () => {
			const result = mapAccountSecurityError("Cannot remove last authentication method", "unlinking");
			expect(result.message).toBe("You can't remove your last authentication method.");
			expect(result.resolution).toBe(
				"Add another authentication method (like setting a password) before removing Google authentication."
			);
			expect(result.isRetryable).toBe(false);
			expect(result.category).toBe("validation");
		});
	});

	describe("User understands rate limiting errors", () => {
		it("should map rate limiting errors to user-friendly messages", () => {
			const rateLimitErrors = ["Rate limit exceeded", "Too many requests", "HTTP 429: Too Many Requests"];

			rateLimitErrors.forEach(errorMessage => {
				const result = mapAccountSecurityError(errorMessage);
				expect(result.message).toBe("Too many requests. Please wait before trying again.");
				expect(result.resolution).toBe("Wait a few minutes before attempting this action again.");
				expect(result.isRetryable).toBe(true);
				expect(result.category).toBe("validation");
			});
		});
	});

	describe("User understands server errors", () => {
		it("should map server errors to user-friendly messages", () => {
			const serverErrors = ["Server error", "Internal server error", "HTTP 500: Internal Server Error"];

			serverErrors.forEach(errorMessage => {
				const result = mapAccountSecurityError(errorMessage);
				expect(result.message).toBe("A server error occurred. Please try again.");
				expect(result.resolution).toBe("This is a temporary problem. Try again in a few moments.");
				expect(result.isRetryable).toBe(true);
				expect(result.category).toBe("server");
			});
		});

		it("should map service unavailable errors", () => {
			const result = mapAccountSecurityError("Service unavailable");
			expect(result.message).toBe("The service is temporarily unavailable.");
			expect(result.resolution).toBe("The service is temporarily down. Please try again in a few minutes.");
			expect(result.isRetryable).toBe(true);
			expect(result.category).toBe("server");
		});
	});

	describe("User gets appropriate fallback messages", () => {
		it("should provide context-specific fallback messages", () => {
			const contexts = [
				{ context: "loading" as const, expected: "Unable to load account security information." },
				{ context: "linking" as const, expected: "Unable to link Google account." },
				{ context: "unlinking" as const, expected: "Unable to unlink Google account." }
			];

			contexts.forEach(({ context, expected }) => {
				const result = mapAccountSecurityError("Unknown error", context);
				expect(result.message).toBe(expected);
				expect(result.resolution).toBe("Please try again. If the problem persists, contact support.");
				expect(result.isRetryable).toBe(true);
				expect(result.category).toBe("unknown");
				expect(result.requiresSupport).toBe(true);
			});
		});
	});

	describe("User understands Error objects", () => {
		it("should handle Error objects correctly", () => {
			const error = new Error("Network error");
			const result = mapAccountSecurityError(error);
			expect(result.message).toBe("Connection problem. Please check your internet connection and try again.");
			expect(result.category).toBe("network");
		});
	});
});

describe("shouldAutoRetry", () => {
	it("should not retry after 3 attempts", () => {
		const errorDetails = {
			message: "Network error",
			isRetryable: true,
			severity: "error" as const,
			category: "network" as const
		};

		expect(shouldAutoRetry(errorDetails, 3)).toBe(false);
		expect(shouldAutoRetry(errorDetails, 4)).toBe(false);
	});

	it("should retry network errors", () => {
		const errorDetails = {
			message: "Network error",
			isRetryable: true,
			severity: "error" as const,
			category: "network" as const
		};

		expect(shouldAutoRetry(errorDetails, 1)).toBe(true);
		expect(shouldAutoRetry(errorDetails, 2)).toBe(true);
	});

	it("should retry server errors", () => {
		const errorDetails = {
			message: "Server error",
			isRetryable: true,
			severity: "error" as const,
			category: "server" as const
		};

		expect(shouldAutoRetry(errorDetails, 1)).toBe(true);
		expect(shouldAutoRetry(errorDetails, 2)).toBe(true);
	});

	it("should not retry validation errors", () => {
		const errorDetails = {
			message: "Validation error",
			isRetryable: true,
			severity: "warning" as const,
			category: "validation" as const
		};

		expect(shouldAutoRetry(errorDetails, 1)).toBe(false);
		expect(shouldAutoRetry(errorDetails, 2)).toBe(false);
	});

	it("should not retry auth errors", () => {
		const errorDetails = {
			message: "Auth error",
			isRetryable: true,
			severity: "error" as const,
			category: "auth" as const
		};

		expect(shouldAutoRetry(errorDetails, 1)).toBe(false);
		expect(shouldAutoRetry(errorDetails, 2)).toBe(false);
	});

	it("should not retry non-retryable errors", () => {
		const errorDetails = {
			message: "Network error",
			isRetryable: false,
			severity: "error" as const,
			category: "network" as const
		};

		expect(shouldAutoRetry(errorDetails, 1)).toBe(false);
	});
});

describe("getRetryDelay", () => {
	it("should calculate exponential backoff delay", () => {
		expect(getRetryDelay(0)).toBe(1000); // 1 second
		expect(getRetryDelay(1)).toBe(2000); // 2 seconds
		expect(getRetryDelay(2)).toBe(4000); // 4 seconds
	});

	it("should cap delay at 5 seconds", () => {
		expect(getRetryDelay(3)).toBe(5000); // Capped at 5 seconds
		expect(getRetryDelay(10)).toBe(5000); // Still capped at 5 seconds
	});
});

describe("AccountSecurityErrorHandler", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	describe("User gets processed errors", () => {
		it("should process errors correctly", () => {
			const result = AccountSecurityErrorHandler.processError("Network error", "loading");
			expect(result.message).toBe("Connection problem. Please check your internet connection and try again.");
			expect(result.category).toBe("network");
		});
	});

	describe("User gets display messages", () => {
		it("should return display message", () => {
			const result = AccountSecurityErrorHandler.getDisplayMessage("Network error", "loading");
			expect(result).toBe("Connection problem. Please check your internet connection and try again.");
		});
	});

	describe("User gets resolution guidance", () => {
		it("should return resolution guidance", () => {
			const result = AccountSecurityErrorHandler.getResolutionGuidance("Network error", "loading");
			expect(result).toBe("Check your internet connection and try again in a moment.");
		});

		it("should return undefined for errors without resolution", () => {
			const result = AccountSecurityErrorHandler.getResolutionGuidance(
				"Some error without resolution",
				"loading"
			);
			expect(result).toBe("Please try again. If the problem persists, contact support.");
		});
	});

	describe("User understands retryable errors", () => {
		it("should identify retryable errors", () => {
			expect(AccountSecurityErrorHandler.isRetryable("Network error", "loading")).toBe(true);
			expect(AccountSecurityErrorHandler.isRetryable("Unauthorized", "loading")).toBe(false);
		});
	});

	describe("User experiences automatic retry", () => {
		it("should execute operation successfully on first try", async () => {
			const mockOperation = vi.fn().mockResolvedValue("success");
			const mockOnError = vi.fn();

			const result = await AccountSecurityErrorHandler.executeWithRetry(mockOperation, "loading", mockOnError);

			expect(result).toBe("success");
			expect(mockOperation).toHaveBeenCalledTimes(1);
			expect(mockOnError).not.toHaveBeenCalled();
		});

		it("should retry network errors with exponential backoff", async () => {
			const mockOperation = vi
				.fn()
				.mockRejectedValueOnce(new Error("Network error"))
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce("success");
			const mockOnError = vi.fn();

			const retryPromise = AccountSecurityErrorHandler.executeWithRetry(mockOperation, "loading", mockOnError);

			// Advance time to trigger retries
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay

			const result = await retryPromise;

			expect(result).toBe("success");
			expect(mockOperation).toHaveBeenCalledTimes(3);
			expect(mockOnError).toHaveBeenCalledTimes(2);
		});

		it("should not retry validation errors", async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error("Invalid input"));
			const mockOnError = vi.fn();

			await expect(
				AccountSecurityErrorHandler.executeWithRetry(mockOperation, "loading", mockOnError)
			).rejects.toThrow("Invalid input");

			expect(mockOperation).toHaveBeenCalledTimes(1);
			expect(mockOnError).toHaveBeenCalledTimes(1);
		});

		it("should give up after max retries", async () => {
			const mockOperation = vi.fn().mockRejectedValue(new Error("Network error"));
			const mockOnError = vi.fn();

			// Suppress unhandled rejection warnings for this test
			const originalHandler = process.listeners("unhandledRejection");
			const rejectionHandler = () => {
				// Silently handle expected rejections during retry testing
			};
			process.removeAllListeners("unhandledRejection");
			process.on("unhandledRejection", rejectionHandler);

			try {
				// Start the retry operation
				const retryPromise = AccountSecurityErrorHandler.executeWithRetry(
					mockOperation,
					"loading",
					mockOnError
				);

				// Advance through all retry delays step by step
				await vi.advanceTimersByTimeAsync(1000); // First retry
				await vi.advanceTimersByTimeAsync(2000); // Second retry

				// Ensure the promise completes
				await expect(retryPromise).rejects.toThrow("Network error");

				// The operation is called once initially, and retried twice.
				expect(mockOperation).toHaveBeenCalledTimes(3);
				expect(mockOnError).toHaveBeenCalledTimes(3);
			} finally {
				// Restore original handlers
				process.removeAllListeners("unhandledRejection");
				originalHandler.forEach(handler => {
					process.on("unhandledRejection", handler);
				});
			}
		});
	});
});
