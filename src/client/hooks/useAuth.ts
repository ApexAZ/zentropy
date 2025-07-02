import { useState, useEffect } from "react";

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
		}
	};

	return {
		...authState,
		login,
		logout
	};
};
