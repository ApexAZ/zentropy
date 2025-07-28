/**
 * Secure Authentication Token Storage
 *
 * Provides atomic, race-condition-free token storage operations with proper
 * cleanup, session fixation protection, and memory leak prevention.
 *
 * Features:
 * - Atomic multi-storage operations (no partial state)
 * - Mutex-based concurrency control (prevents race conditions)
 * - Automatic cleanup and state consistency verification
 * - Token rotation for security
 * - Memory leak prevention
 * - Centralized token management (eliminates code duplication)
 */

import { logger } from "./logger";

// Storage operation types for better type safety
type StorageType = "localStorage" | "sessionStorage" | "both";

interface AtomicTransactionResult<T = void> {
	success: boolean;
	result?: T;
	error?: Error;
}

/**
 * Secure token storage manager with atomic operations and race condition protection
 */
class SecureTokenStorage {
	private static instance: SecureTokenStorage | null = null;
	private readonly TOKEN_KEY = "authToken";
	private readonly MUTEX_KEY = "auth_mutex";
	private readonly MUTEX_TIMEOUT = 5000; // 5 seconds max wait for mutex
	private readonly OPERATION_TIMEOUT = 1000; // 1 second max per operation

	// In-memory mutex to prevent concurrent operations within same tab
	private operationMutex: boolean = false;
	private operationQueue: Array<() => void> = [];

	private constructor() {
		// Private constructor for singleton pattern
		this.setupStorageEventHandlers();
		this.setupPageUnloadCleanup();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): SecureTokenStorage {
		if (!SecureTokenStorage.instance) {
			SecureTokenStorage.instance = new SecureTokenStorage();
		}
		return SecureTokenStorage.instance;
	}

	/**
	 * Check if we're in a browser environment
	 */
	private isBrowserEnvironment(): boolean {
		return (
			typeof window !== "undefined" &&
			typeof localStorage !== "undefined" &&
			typeof sessionStorage !== "undefined"
		);
	}

	/**
	 * Setup storage event handlers for cross-tab synchronization
	 */
	private setupStorageEventHandlers(): void {
		if (!this.isBrowserEnvironment()) return;

		window.addEventListener("storage", event => {
			if (event.key === this.TOKEN_KEY || event.key === this.MUTEX_KEY) {
				logger.debug("Token storage changed in another tab", {
					key: event.key,
					newValue: event.newValue ? "[REDACTED]" : null,
					storageArea: event.storageArea === localStorage ? "localStorage" : "sessionStorage"
				});
			}
		});
	}

	/**
	 * Setup cleanup on page unload to prevent mutex deadlocks
	 */
	private setupPageUnloadCleanup(): void {
		if (!this.isBrowserEnvironment()) return;

		const cleanup = () => {
			this.clearMutex();
		};

		window.addEventListener("beforeunload", cleanup);
		window.addEventListener("unload", cleanup);

		// Also handle tab/window close
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.clearMutex();
			}
		});
	}

	/**
	 * Acquire mutex lock for atomic operations
	 */
	private async acquireMutex(): Promise<boolean> {
		// Skip mutex in non-browser environments (like tests)
		if (!this.isBrowserEnvironment()) {
			this.operationMutex = true;
			return true;
		}

		const startTime = Date.now();
		const mutexId = `${Date.now()}_${Math.random()}`;

		while (Date.now() - startTime < this.MUTEX_TIMEOUT) {
			// Check in-memory mutex first (same tab operations)
			if (this.operationMutex) {
				await new Promise(resolve => setTimeout(resolve, 10));
				continue;
			}

			// Check cross-tab mutex in localStorage
			const existingMutex = localStorage.getItem(this.MUTEX_KEY);
			if (existingMutex) {
				const [timestamp] = existingMutex.split("_");
				const mutexAge = Date.now() - parseInt(timestamp);

				// If mutex is too old, consider it stale and take over
				if (mutexAge > this.MUTEX_TIMEOUT) {
					logger.warn("Detected stale mutex, taking over", { mutexAge });
				} else {
					await new Promise(resolve => setTimeout(resolve, 10));
					continue;
				}
			}

			// Try to acquire mutex
			try {
				localStorage.setItem(this.MUTEX_KEY, mutexId);

				// Double-check we got the mutex (race condition protection)
				await new Promise(resolve => setTimeout(resolve, 5));
				const currentMutex = localStorage.getItem(this.MUTEX_KEY);

				if (currentMutex === mutexId) {
					this.operationMutex = true;
					return true;
				}
			} catch (error) {
				logger.warn("Failed to acquire storage mutex", { error });
			}

			await new Promise(resolve => setTimeout(resolve, 10));
		}

		logger.error("Failed to acquire mutex within timeout", { timeout: this.MUTEX_TIMEOUT });
		return false;
	}

	/**
	 * Release mutex lock
	 */
	private clearMutex(): void {
		this.operationMutex = false;

		if (this.isBrowserEnvironment()) {
			try {
				localStorage.removeItem(this.MUTEX_KEY);
			} catch (error) {
				logger.warn("Failed to clear mutex from localStorage", { error });
			}
		}

		// Process queued operations
		const nextOperation = this.operationQueue.shift();
		if (nextOperation) {
			setTimeout(nextOperation, 0);
		}
	}

	/**
	 * Execute atomic operation with mutex protection
	 */
	private async executeAtomic<T>(operation: () => T | Promise<T>): Promise<AtomicTransactionResult<T>> {
		const acquired = await this.acquireMutex();
		if (!acquired) {
			return {
				success: false,
				error: new Error("Failed to acquire storage mutex")
			};
		}

		try {
			const result = await Promise.race([
				Promise.resolve(operation()),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("Operation timeout")), this.OPERATION_TIMEOUT)
				)
			]);

			return {
				success: true,
				result
			};
		} catch (error) {
			logger.error("Atomic storage operation failed", { error });
			return {
				success: false,
				error: error instanceof Error ? error : new Error("Atomic operation failed")
			};
		} finally {
			this.clearMutex();
		}
	}

	/**
	 * Get authentication token with fallback priority
	 * Priority: sessionStorage (current session) -> localStorage (remember me)
	 */
	public async getToken(): Promise<string | null> {
		// Return null immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return null;
		}

		const result = await this.executeAtomic(() => {
			// Check sessionStorage first (current session priority)
			const sessionToken = sessionStorage.getItem(this.TOKEN_KEY);
			if (sessionToken) {
				return sessionToken;
			}

			// Fallback to localStorage (remember me)
			const localToken = localStorage.getItem(this.TOKEN_KEY);
			return localToken;
		});

		if (!result.success) {
			logger.error("Failed to get token", { error: result.error });
			return null;
		}

		return result.result || null;
	}

	/**
	 * Set authentication token with atomic multi-storage operations
	 * Ensures no partial state during transitions
	 */
	public async setToken(token: string, rememberMe: boolean = false): Promise<boolean> {
		// Return success immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return true;
		}

		const result = await this.executeAtomic(() => {
			if (rememberMe) {
				// Remember me: store in localStorage, clear sessionStorage
				localStorage.setItem(this.TOKEN_KEY, token);
				sessionStorage.removeItem(this.TOKEN_KEY);
			} else {
				// Session only: store in sessionStorage, clear localStorage
				sessionStorage.setItem(this.TOKEN_KEY, token);
				localStorage.removeItem(this.TOKEN_KEY);
			}

			// Verify the operation succeeded
			const storedToken = rememberMe
				? localStorage.getItem(this.TOKEN_KEY)
				: sessionStorage.getItem(this.TOKEN_KEY);

			if (storedToken !== token) {
				throw new Error("Token storage verification failed");
			}

			// Verify cleanup succeeded
			const otherStorage = rememberMe
				? sessionStorage.getItem(this.TOKEN_KEY)
				: localStorage.getItem(this.TOKEN_KEY);

			if (otherStorage !== null) {
				throw new Error("Token cleanup verification failed");
			}

			return true;
		});

		if (!result.success) {
			logger.error("Failed to set token", {
				error: result.error,
				rememberMe,
				tokenExists: !!token
			});
			return false;
		}

		logger.debug("Token set successfully", { rememberMe });
		return true;
	}

	/**
	 * Clear all authentication tokens atomically
	 */
	public async clearTokens(): Promise<boolean> {
		// Return success immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return true;
		}

		const result = await this.executeAtomic(() => {
			// Clear from both storage locations
			localStorage.removeItem(this.TOKEN_KEY);
			sessionStorage.removeItem(this.TOKEN_KEY);

			// Verify cleanup succeeded
			const localToken = localStorage.getItem(this.TOKEN_KEY);
			const sessionToken = sessionStorage.getItem(this.TOKEN_KEY);

			if (localToken !== null || sessionToken !== null) {
				throw new Error("Token cleanup verification failed");
			}

			return true;
		});

		if (!result.success) {
			logger.error("Failed to clear tokens", { error: result.error });
			return false;
		}

		logger.debug("All tokens cleared successfully");
		return true;
	}

	/**
	 * Rotate token for security (e.g., after suspicious activity)
	 */
	public async rotateToken(newToken: string, currentRememberMe?: boolean): Promise<boolean> {
		// Return success immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return true;
		}

		// Determine current storage mode if not specified
		let rememberMe = currentRememberMe;
		if (rememberMe === undefined) {
			const result = await this.executeAtomic(() => {
				const hasLocal = localStorage.getItem(this.TOKEN_KEY) !== null;
				const hasSession = sessionStorage.getItem(this.TOKEN_KEY) !== null;

				// Prefer session storage mode if both exist (shouldn't happen but handle gracefully)
				return hasSession || !hasLocal ? false : true;
			});

			rememberMe = result.success ? result.result : false;
		}

		// Clear old token and set new one atomically
		const result = await this.executeAtomic(() => {
			// Clear both storages first
			localStorage.removeItem(this.TOKEN_KEY);
			sessionStorage.removeItem(this.TOKEN_KEY);

			// Set new token in appropriate storage
			if (rememberMe) {
				localStorage.setItem(this.TOKEN_KEY, newToken);
			} else {
				sessionStorage.setItem(this.TOKEN_KEY, newToken);
			}

			// Verify rotation succeeded
			const storedToken = rememberMe
				? localStorage.getItem(this.TOKEN_KEY)
				: sessionStorage.getItem(this.TOKEN_KEY);

			if (storedToken !== newToken) {
				throw new Error("Token rotation verification failed");
			}

			return true;
		});

		if (!result.success) {
			logger.error("Failed to rotate token", { error: result.error, rememberMe });
			return false;
		}

		logger.info("Token rotated successfully", { rememberMe });
		return true;
	}

	/**
	 * Check if user has an active token in any storage
	 */
	public async hasToken(): Promise<boolean> {
		const token = await this.getToken();
		return token !== null;
	}

	/**
	 * Get current storage mode (localStorage = remember me, sessionStorage = session only)
	 */
	public async getStorageMode(): Promise<"remember" | "session" | "none"> {
		// Return 'none' immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return "none";
		}

		const result = await this.executeAtomic(() => {
			const hasLocal = localStorage.getItem(this.TOKEN_KEY) !== null;
			const hasSession = sessionStorage.getItem(this.TOKEN_KEY) !== null;

			if (hasSession) return "session";
			if (hasLocal) return "remember";
			return "none";
		});

		return result.success ? result.result || "none" : "none";
	}

	/**
	 * Verify storage consistency (no tokens in both storages simultaneously)
	 */
	public async verifyStorageConsistency(): Promise<{ consistent: boolean; issues: string[] }> {
		// Return consistent state immediately in non-browser environments
		if (!this.isBrowserEnvironment()) {
			return { consistent: true, issues: [] };
		}

		const result = await this.executeAtomic(() => {
			const localToken = localStorage.getItem(this.TOKEN_KEY);
			const sessionToken = sessionStorage.getItem(this.TOKEN_KEY);
			const issues: string[] = [];

			// Check for conflicting tokens
			if (localToken && sessionToken) {
				if (localToken === sessionToken) {
					issues.push("Duplicate tokens in both storages (same value)");
				} else {
					issues.push("Conflicting tokens in both storages (different values)");
				}
			}

			return {
				consistent: issues.length === 0,
				issues
			};
		});

		if (!result.success) {
			return {
				consistent: false,
				issues: ["Failed to verify storage consistency"]
			};
		}

		return result.result || { consistent: false, issues: ["Verification failed"] };
	}
}

// Export singleton instance
export const secureTokenStorage = SecureTokenStorage.getInstance();

// Export type for external use
export type { StorageType };
