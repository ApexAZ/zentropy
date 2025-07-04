interface AuthUser {
	email: string;
	name: string;
	has_projects_access: boolean;
	email_verified: boolean;
}

interface SignInCredentials {
	email: string;
	password: string;
	remember_me?: boolean;
}

interface SignUpData {
	first_name: string;
	last_name: string;
	email: string;
	organization: string;
	password: string;
	terms_agreement: boolean;
	has_projects_access?: boolean;
}

interface AuthResponse {
	access_token: string;
	token_type: string;
	user: {
		first_name: string;
		last_name: string;
		email: string;
		has_projects_access: boolean;
		email_verified: boolean;
	};
}

export class AuthService {
	/**
	 * Sign in with email and password
	 */
	static async signIn(credentials: SignInCredentials): Promise<{ token: string; user: AuthUser }> {
		const response = await fetch("/api/v1/auth/login-json", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(credentials)
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Login failed");
		}

		const data: AuthResponse = await response.json();

		return {
			token: data.access_token,
			user: {
				email: data.user.email,
				name: `${data.user.first_name} ${data.user.last_name}`,
				has_projects_access: data.user.has_projects_access,
				email_verified: data.user.email_verified
			}
		};
	}

	/**
	 * Sign up with email registration
	 */
	static async signUp(userData: SignUpData): Promise<{ token: string; user: AuthUser }> {
		const response = await fetch("/api/v1/auth/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(userData)
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "Registration failed");
		}

		const data: AuthResponse = await response.json();

		return {
			token: data.access_token,
			user: {
				email: data.user.email,
				name: `${data.user.first_name} ${data.user.last_name}`,
				has_projects_access: data.user.has_projects_access,
				email_verified: data.user.email_verified
			}
		};
	}

	/**
	 * Sign in with Google OAuth
	 */
	static async oauthSignIn(
		provider: "google",
		credential: string,
		organization?: string
	): Promise<{ token: string; user: AuthUser }> {
		if (provider !== "google") {
			throw new Error("Only Google OAuth is currently supported");
		}

		const response = await fetch("/api/v1/auth/google-oauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				credential,
				organization
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.detail || "OAuth authentication failed");
		}

		const data: AuthResponse = await response.json();

		return {
			token: data.access_token,
			user: {
				email: data.user.email,
				name: `${data.user.first_name} ${data.user.last_name}`,
				has_projects_access: data.user.has_projects_access,
				email_verified: data.user.email_verified
			}
		};
	}

	/**
	 * Sign out - handled by useAuth hook
	 */
	static async signOut(): Promise<void> {
		// Note: Actual logout logic is in useAuth hook
		// This method exists for consistency but delegates to useAuth.logout()
		throw new Error("Use auth.logout() from useAuth hook instead");
	}

	/**
	 * Validate password strength
	 */
	static validatePassword(password: string): {
		isValid: boolean;
		requirements: {
			length: boolean;
			uppercase: boolean;
			lowercase: boolean;
			number: boolean;
			symbol: boolean;
		};
	} {
		const requirements = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password)
		};

		const isValid = Object.values(requirements).every(req => req);

		return {
			isValid,
			requirements
		};
	}

	/**
	 * Validate email format
	 */
	static validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}

export type { AuthUser, SignInCredentials, SignUpData };
