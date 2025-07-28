import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "../utils/logger";
import { AuthService } from "../services/AuthService";
import { UserService } from "../services/UserService";
import { getAuthTokenAsync, setAuthTokenAsync } from "../utils/auth";
import type { AuthUser, AuthState } from "../types";

export const useAuth = () => {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
		token: null
	});

	// Session timeout configuration
	const TIMEOUT_DURATION = import.meta.env.MODE === "test" ? 200 : 15 * 60 * 1000; // 200ms for tests, 15 minutes for production
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastActivityRef = useRef<number>(Date.now());

	// Check for existing token on mount
	useEffect(() => {
		let isMounted = true;

		const validateExistingToken = async () => {
			// Get token using atomic operations when possible, fallback to direct access
			let token: string | null = null;
			try {
				token = await getAuthTokenAsync();
			} catch {
				// Fallback to direct storage access for backward compatibility
				token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
			}

			if (token) {
				try {
					// Validate token with API and get user info using service layer
					const userData = await UserService.validateTokenAndGetUser(token);

					if (isMounted) {
						setAuthState({
							isAuthenticated: true,
							user: {
								email: userData.email,
								name: userData.display_name || "",
								has_projects_access: userData.has_projects_access,
								email_verified: userData.email_verified || false
							},
							token
						});
						// Reset activity tracking when token is validated
						lastActivityRef.current = Date.now();
					}
				} catch (error) {
					logger.warn("Failed to validate token", { error });
					// Token is invalid, clear tokens using AuthService (includes atomic operations)
					await AuthService.signOut();

					if (isMounted) {
						setAuthState({
							isAuthenticated: false,
							user: null,
							token: null
						});
					}
				}
			}
		};

		void validateExistingToken();

		// Cleanup function
		return () => {
			isMounted = false;
		};
	}, []);

	const login = (token: string, user: AuthUser, rememberMe: boolean = false) => {
		// Store token with improved atomic operations when possible, fallback to direct storage
		const storeTokenSafely = async () => {
			try {
				const success = await setAuthTokenAsync(token, rememberMe);
				if (!success) {
					throw new Error("Atomic token storage failed");
				}
			} catch (error) {
				// Fallback to direct storage for immediate compatibility
				logger.warn("Using direct storage fallback for token", { error });
				if (rememberMe) {
					localStorage.setItem("authToken", token);
					sessionStorage.removeItem("authToken");
				} else {
					sessionStorage.setItem("authToken", token);
					localStorage.removeItem("authToken");
				}
			}
		};

		// Store token immediately for backward compatibility, then enhance with atomic operations
		if (rememberMe) {
			// Remember me: store in localStorage (persists across browser sessions)
			localStorage.setItem("authToken", token);
			// Remove from sessionStorage to avoid conflicts
			sessionStorage.removeItem("authToken");
		} else {
			// No remember me: store in sessionStorage (cleared when browser closes)
			sessionStorage.setItem("authToken", token);
			// Remove from localStorage to avoid conflicts
			localStorage.removeItem("authToken");
		}

		// Enhance storage with atomic operations in background
		storeTokenSafely();

		setAuthState({
			isAuthenticated: true,
			user,
			token
		});
		// Reset activity tracking when user logs in
		lastActivityRef.current = Date.now();
	};

	const logout = async (): Promise<void> => {
		try {
			// Get token using atomic operations when possible
			let token: string | null = null;
			try {
				token = await getAuthTokenAsync();
			} catch {
				// Fallback to direct storage access
				token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
			}

			// Call logout endpoint with current token
			if (token) {
				await fetch("/api/v1/auth/logout", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json"
					}
				});
			}
		} catch (error) {
			// Log error but don't prevent logout
			console.warn("Logout API call failed:", error);
		} finally {
			// Clear authentication tokens using AuthService (includes atomic operations)
			await AuthService.signOut();

			// Clear React state
			setAuthState({
				isAuthenticated: false,
				user: null,
				token: null
			});

			// Clear timeout when logging out
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		}
	};

	// Auto-logout due to inactivity
	const logoutDueToInactivity = useCallback(async (): Promise<void> => {
		console.warn("Session expired due to inactivity");
		try {
			// Get token using atomic operations when possible
			let token: string | null = null;
			try {
				token = await getAuthTokenAsync();
			} catch {
				// Fallback to direct storage access
				token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
			}

			// Call logout endpoint with current token
			if (token) {
				await fetch("/api/v1/auth/logout", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json"
					}
				});
			}
		} catch (error) {
			// Log error but don't prevent logout
			console.warn("Logout API call failed:", error);
		} finally {
			// Clear authentication tokens using AuthService (includes atomic operations)
			await AuthService.signOut();

			// Clear React state
			setAuthState({
				isAuthenticated: false,
				user: null,
				token: null
			});

			// Clear timeout when logging out
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		}
	}, []);

	// Track user activity
	useEffect(() => {
		if (!authState.isAuthenticated) {
			// Clear timeout if user is not authenticated
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			return;
		}

		// Activity events to monitor
		const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

		// Reset timeout function - defined inside useEffect to avoid circular dependency
		const resetActivityTimeout = () => {
			lastActivityRef.current = Date.now();

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				void logoutDueToInactivity();
			}, TIMEOUT_DURATION);
		};

		// Reset timeout on any activity
		const handleActivity = () => {
			resetActivityTimeout();
		};

		// Add event listeners
		activityEvents.forEach(event => {
			document.addEventListener(event, handleActivity, true);
		});

		// Start the initial timeout
		resetActivityTimeout();

		// Cleanup
		return () => {
			activityEvents.forEach(event => {
				document.removeEventListener(event, handleActivity, true);
			});
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [authState.isAuthenticated, logoutDueToInactivity]); // Intentionally omitting TIMEOUT_DURATION as it's a constant

	return {
		...authState,
		login,
		logout
	};
};
