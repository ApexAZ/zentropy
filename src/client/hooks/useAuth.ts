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
		const token = localStorage.getItem("authToken");
		if (token) {
			// TODO: Validate token with API and get user info
			// For now, just set authenticated with mock user
			setAuthState({
				isAuthenticated: true,
				user: {
					email: "john@example.com",
					name: "John Doe"
				},
				token
			});
		}
	}, []);

	const login = (token: string, user: AuthUser) => {
		localStorage.setItem("authToken", token);
		setAuthState({
			isAuthenticated: true,
			user,
			token
		});
	};

	const logout = async (): Promise<void> => {
		try {
			// Call logout endpoint
			const token = localStorage.getItem("authToken");
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
			localStorage.removeItem("authToken");
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
