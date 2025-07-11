import { Page } from "@playwright/test";
import { DatabaseHelpers } from "./database-helpers";
import { MailpitHelpers } from "./mailpit-helpers";
import { config, getApiUrl } from "../config/environment";

/**
 * Authentication Helpers for E2E Tests
 * 
 * Provides utilities for:
 * - Login/logout flows
 * - JWT token management
 * - Session state management
 * - OAuth flow automation
 */
export class AuthHelpers {
	constructor(
		private page: Page,
		private db: DatabaseHelpers
	) {}
	
	/**
	 * Login with email and password
	 */
	async loginWithPassword(email: string, password: string = config.testUsers.defaultPassword) {
		// Navigate to the application if not already there
		await this.page.goto("/");
		
		// Open auth modal
		await this.page.click('[data-testid="auth-modal-trigger"]');
		
		// Switch to signin mode if needed
		await this.page.click('[data-testid="signin-tab"]');
		
		// Fill login form
		await this.page.fill('[data-testid="email-input"]', email);
		await this.page.fill('[data-testid="password-input"]', password);
		
		// Submit form
		await this.page.click('[data-testid="signin-submit"]');
		
		// Wait for successful login (modal should close and user should be redirected)
		await this.page.waitForSelector('[data-testid="auth-modal"]', { state: "hidden" });
		
		// Verify login success by checking for user menu or dashboard
		await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: config.timeouts.assertion });
	}
	
	/**
	 * Register a new user with email/password
	 */
	async registerWithPassword(
		email: string, 
		password: string = config.testUsers.defaultPassword,
		firstName: string = config.testUsers.defaultUser.firstName,
		lastName: string = config.testUsers.defaultUser.lastName,
		verifyEmail: boolean = true
	) {
		// Navigate to the application
		await this.page.goto("/");
		
		// Open auth modal
		await this.page.click('[data-testid="auth-modal-trigger"]');
		
		// Switch to signup mode
		await this.page.click('[data-testid="signup-tab"]');
		
		// Fill registration form
		await this.page.fill('[data-testid="first-name-input"]', firstName);
		await this.page.fill('[data-testid="last-name-input"]', lastName);
		await this.page.fill('[data-testid="email-input"]', email);
		await this.page.fill('[data-testid="password-input"]', password);
		
		// Submit form
		await this.page.click('[data-testid="signup-submit"]');
		
		// Wait for registration success message
		await this.page.waitForSelector('[data-testid="registration-success"]', { timeout: config.timeouts.assertion });
		
		// Handle email verification if requested
		if (verifyEmail) {
			await this.verifyEmailViaMailpit(email);
		}
	}
	
	/**
	 * Verify email using Mailpit integration
	 */
	async verifyEmailViaMailpit(email: string) {
		const mailpit = new MailpitHelpers();
		
		// Get verification link from email
		const verificationLink = await mailpit.verifyEmail(email);
		
		// Visit verification link
		await this.page.goto(verificationLink);
		
		// Wait for verification success
		await this.page.waitForSelector('[data-testid="verification-success"]', { timeout: config.timeouts.assertion });
	}
	
	/**
	 * Login with Google OAuth (mock/sandbox)
	 */
	async loginWithGoogle(email: string) {
		// Navigate to the application
		await this.page.goto("/");
		
		// Open auth modal
		await this.page.click('[data-testid="auth-modal-trigger"]');
		
		// Click Google login button
		await this.page.click('[data-testid="google-oauth-button"]');
		
		// Handle OAuth flow
		if (config.oauth.google.mockMode) {
			await this.handleMockGoogleOAuth(email);
		} else {
			await this.handleRealGoogleOAuth(email);
		}
		
		// Wait for successful login
		await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: config.timeouts.oauthFlow });
	}
	
	/**
	 * Handle mock Google OAuth flow
	 */
	private async handleMockGoogleOAuth(email: string) {
		// This would handle a mocked OAuth flow
		// For now, we'll simulate the OAuth callback
		
		// Wait for redirect to OAuth provider (or mock)
		await this.page.waitForURL(/google|oauth|mock/, { timeout: config.timeouts.oauthFlow });
		
		// If this is a mock, fill in the test credentials
		if (this.page.url().includes("mock")) {
			await this.page.fill('[data-testid="mock-oauth-email"]', email);
			await this.page.click('[data-testid="mock-oauth-submit"]');
		}
		
		// Wait for redirect back to application
		await this.page.waitForURL(/localhost:5173/, { timeout: config.timeouts.oauthFlow });
	}
	
	/**
	 * Handle real Google OAuth flow (for sandbox testing)
	 */
	private async handleRealGoogleOAuth(email: string) {
		// Wait for Google OAuth page
		await this.page.waitForURL(/accounts\.google\.com/, { timeout: config.timeouts.oauthFlow });
		
		// Fill in Google credentials (this would need real test credentials)
		await this.page.fill('[data-testid="identifierId"]', email);
		await this.page.click('[data-testid="identifierNext"]');
		
		// Handle password (if required)
		await this.page.fill('[data-testid="password"]', "test-password");
		await this.page.click('[data-testid="passwordNext"]');
		
		// Handle consent screen (if shown)
		await this.page.click('[data-testid="submit_approve_access"]').catch(() => {
			// Consent might not be required
		});
		
		// Wait for redirect back to application
		await this.page.waitForURL(/localhost:5173/, { timeout: config.timeouts.oauthFlow });
	}
	
	/**
	 * Logout current user
	 */
	async logout() {
		try {
			// Check if user is logged in
			const userMenu = await this.page.locator('[data-testid="user-menu"]').first();
			if (await userMenu.isVisible()) {
				// Click user menu
				await userMenu.click();
				
				// Click logout
				await this.page.click('[data-testid="logout-button"]');
				
				// Wait for logout to complete
				await this.page.waitForSelector('[data-testid="user-menu"]', { state: "hidden" });
			}
		} catch (error) {
			// User might not be logged in, which is fine
		}
	}
	
	/**
	 * Get current JWT token from browser storage
	 */
	async getJWTToken(): Promise<string | null> {
		return await this.page.evaluate(() => {
			return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
		});
	}
	
	/**
	 * Set JWT token in browser storage
	 */
	async setJWTToken(token: string) {
		await this.page.evaluate((token) => {
			localStorage.setItem("authToken", token);
		}, token);
	}
	
	/**
	 * Clear authentication state
	 */
	async clearAuthState() {
		await this.page.evaluate(() => {
			localStorage.removeItem("authToken");
			sessionStorage.removeItem("authToken");
			localStorage.removeItem("user");
			sessionStorage.removeItem("user");
		});
	}
	
	/**
	 * Check if user is currently logged in
	 */
	async isLoggedIn(): Promise<boolean> {
		try {
			const userMenu = await this.page.locator('[data-testid="user-menu"]').first();
			return await userMenu.isVisible();
		} catch (error) {
			return false;
		}
	}
	
	/**
	 * Get current user data from the frontend
	 */
	async getCurrentUser(): Promise<any> {
		return await this.page.evaluate(() => {
			const userData = localStorage.getItem("user") || sessionStorage.getItem("user");
			return userData ? JSON.parse(userData) : null;
		});
	}
	
	/**
	 * Make authenticated API request
	 */
	async apiRequest(endpoint: string, options: RequestInit = {}) {
		const token = await this.getJWTToken();
		
		const response = await fetch(getApiUrl(endpoint), {
			...options,
			headers: {
				"Content-Type": "application/json",
				"Authorization": token ? `Bearer ${token}` : "",
				...options.headers,
			},
		});
		
		return response;
	}
	
	/**
	 * Validate user session with backend
	 */
	async validateSession(): Promise<boolean> {
		try {
			const response = await this.apiRequest("/users/me");
			return response.ok;
		} catch (error) {
			return false;
		}
	}
	
	/**
	 * Get user security status from API
	 */
	async getSecurityStatus(): Promise<any> {
		const response = await this.apiRequest("/users/me/security");
		if (!response.ok) {
			throw new Error(`Failed to get security status: ${response.statusText}`);
		}
		return response.json();
	}
	
	/**
	 * Link Google account to current user
	 */
	async linkGoogleAccount(googleCredential: string) {
		const response = await this.apiRequest("/users/me/link-google", {
			method: "POST",
			body: JSON.stringify({ google_credential: googleCredential }),
		});
		
		if (!response.ok) {
			throw new Error(`Failed to link Google account: ${response.statusText}`);
		}
		
		return response.json();
	}
	
	/**
	 * Unlink Google account from current user
	 */
	async unlinkGoogleAccount(password: string) {
		const response = await this.apiRequest("/users/me/unlink-google", {
			method: "POST",
			body: JSON.stringify({ password }),
		});
		
		if (!response.ok) {
			throw new Error(`Failed to unlink Google account: ${response.statusText}`);
		}
		
		return response.json();
	}
}