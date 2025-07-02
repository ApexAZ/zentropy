import { useState, useEffect, useCallback, useRef } from "react";

interface AuthUser {
	email: string;
	name: string;
}

interface AuthState {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
}

export const useAuth = () => {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
		token: null
	});

	// Session timeout configuration
	const TIMEOUT_DURATION = process.env.NODE_ENV === "test" ? 200 : 15 * 60 * 1000; // 200ms for tests, 15 minutes for production
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastActivityRef = useRef<number>(Date.now());

	// Check for existing token on mount
	useEffect(() => {
		const token = localStorage.getItem("access_token");
		if (token) {
			// Validate token with API and get user info
			fetch("/api/users/me", {
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			})
				.then(async response => {
					if (response.ok) {
						const userData = await response.json();
						setAuthState({
							isAuthenticated: true,
							user: {
								email: userData.email,
								name: `${userData.first_name} ${userData.last_name}`
							},
							token
						});
						// Reset activity tracking when token is validated
						lastActivityRef.current = Date.now();
					} else {
						// Token is invalid, remove it
						localStorage.removeItem("access_token");
						setAuthState({
							isAuthenticated: false,
							user: null,
							token: null
						});
					}
				})
				.catch(error => {
					console.warn("Failed to validate token:", error);
					// Token validation failed, remove it
					localStorage.removeItem("access_token");
					setAuthState({
						isAuthenticated: false,
						user: null,
						token: null
					});
				});
		}
	}, []);

	const login = (token: string, user: AuthUser) => {
		localStorage.setItem("access_token", token);
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
			// Call logout endpoint
			const token = localStorage.getItem("access_token");
			if (token) {
				await fetch("/api/auth/logout", {
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
			// Always clear local state and storage
			localStorage.removeItem("access_token");
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
			// Call logout endpoint
			const token = localStorage.getItem("access_token");
			if (token) {
				await fetch("/api/auth/logout", {
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
			// Always clear local state and storage
			localStorage.removeItem("access_token");
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

	// Reset the timeout whenever there's user activity
	const resetTimeout = useCallback(() => {
		lastActivityRef.current = Date.now();

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		if (authState.isAuthenticated) {
			timeoutRef.current = setTimeout(() => {
				void logoutDueToInactivity();
			}, TIMEOUT_DURATION);
		}
	}, [authState.isAuthenticated, TIMEOUT_DURATION]);

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
	}, [authState.isAuthenticated, TIMEOUT_DURATION, logoutDueToInactivity]);

	return {
		...authState,
		login,
		logout
	};
};
