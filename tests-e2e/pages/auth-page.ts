import { Page } from "@playwright/test";
import { BasePage } from "./base-page";
import { config } from "../config/environment";

/**
 * Authentication Page Object for Zentropy E2E Tests
 * 
 * Handles all authentication-related interactions:
 * - Login/signup modal operations
 * - Form submissions
 * - OAuth flows
 * - Email verification
 */
export class AuthPage extends BasePage {
	// Selectors for authentication elements
	private selectors = {
		// Modal controls
		authModalTrigger: '[data-testid="auth-modal-trigger"]',
		authModal: '[data-testid="auth-modal"]',
		closeModal: '[data-testid="close-modal"]',
		
		// Tab controls
		signinTab: '[data-testid="signin-tab"]',
		signupTab: '[data-testid="signup-tab"]',
		
		// Form inputs
		firstNameInput: '[data-testid="first-name-input"]',
		lastNameInput: '[data-testid="last-name-input"]',
		emailInput: '[data-testid="email-input"]',
		passwordInput: '[data-testid="password-input"]',
		rememberMeCheckbox: '[data-testid="remember-me-checkbox"]',
		
		// Submit buttons
		signinSubmit: '[data-testid="signin-submit"]',
		signupSubmit: '[data-testid="signup-submit"]',
		
		// OAuth buttons
		googleOAuthButton: '[data-testid="google-oauth-button"]',
		
		// Status messages
		registrationSuccess: '[data-testid="registration-success"]',
		verificationSuccess: '[data-testid="verification-success"]',
		loginError: '[data-testid="login-error"]',
		registrationError: '[data-testid="registration-error"]',
		
		// User menu (post-login)
		userMenu: '[data-testid="user-menu"]',
		logoutButton: '[data-testid="logout-button"]',
		
		// Email verification banner
		verificationBanner: '[data-testid="email-verification-banner"]',
		resendVerificationButton: '[data-testid="resend-verification"]',
	};
	
	constructor(page: Page) {
		super(page);
	}
	
	/**
	 * Open the authentication modal
	 */
	async openAuthModal() {
		await this.clickWithRetry(this.selectors.authModalTrigger);
		await this.waitForVisible(this.selectors.authModal);
	}
	
	/**
	 * Close the authentication modal
	 */
	async closeAuthModal() {
		await this.clickWithRetry(this.selectors.closeModal);
		await this.waitForHidden(this.selectors.authModal);
	}
	
	/**
	 * Switch to signin tab
	 */
	async switchToSignin() {
		await this.clickWithRetry(this.selectors.signinTab);
		await this.waitForVisible(this.selectors.signinSubmit);
	}
	
	/**
	 * Switch to signup tab
	 */
	async switchToSignup() {
		await this.clickWithRetry(this.selectors.signupTab);
		await this.waitForVisible(this.selectors.signupSubmit);
	}
	
	/**
	 * Fill and submit login form
	 */
	async login(email: string, password: string, rememberMe: boolean = false) {
		await this.openAuthModal();
		await this.switchToSignin();
		
		await this.fillInput(this.selectors.emailInput, email);
		await this.fillInput(this.selectors.passwordInput, password);
		
		if (rememberMe) {
			await this.page.check(this.selectors.rememberMeCheckbox);
		}
		
		await this.clickWithRetry(this.selectors.signinSubmit);
		
		// Wait for either success (modal closes) or error
		await Promise.race([
			this.waitForHidden(this.selectors.authModal),
			this.waitForVisible(this.selectors.loginError)
		]);
	}
	
	/**
	 * Fill and submit registration form
	 */
	async register(
		firstName: string,
		lastName: string,
		email: string,
		password: string
	) {
		await this.openAuthModal();
		await this.switchToSignup();
		
		await this.fillInput(this.selectors.firstNameInput, firstName);
		await this.fillInput(this.selectors.lastNameInput, lastName);
		await this.fillInput(this.selectors.emailInput, email);
		await this.fillInput(this.selectors.passwordInput, password);
		
		await this.clickWithRetry(this.selectors.signupSubmit);
		
		// Wait for either success message or error
		await Promise.race([
			this.waitForVisible(this.selectors.registrationSuccess),
			this.waitForVisible(this.selectors.registrationError)
		]);
	}
	
	/**
	 * Login with Google OAuth
	 */
	async loginWithGoogle() {
		await this.openAuthModal();
		await this.clickWithRetry(this.selectors.googleOAuthButton);
		
		// Handle OAuth redirect - implementation depends on OAuth setup
		// For now, wait for either success or error
		await Promise.race([
			this.waitForVisible(this.selectors.userMenu),
			this.waitForVisible(this.selectors.loginError)
		]);
	}
	
	/**
	 * Logout current user
	 */
	async logout() {
		// Check if user menu is visible
		if (await this.isVisible(this.selectors.userMenu)) {
			await this.clickWithRetry(this.selectors.userMenu);
			await this.clickWithRetry(this.selectors.logoutButton);
			
			// Wait for user menu to disappear
			await this.waitForHidden(this.selectors.userMenu);
		}
	}
	
	/**
	 * Check if user is logged in
	 */
	async isLoggedIn(): Promise<boolean> {
		return await this.isVisible(this.selectors.userMenu);
	}
	
	/**
	 * Get login error message
	 */
	async getLoginError(): Promise<string | null> {
		if (await this.isVisible(this.selectors.loginError)) {
			return await this.getText(this.selectors.loginError);
		}
		return null;
	}
	
	/**
	 * Get registration error message
	 */
	async getRegistrationError(): Promise<string | null> {
		if (await this.isVisible(this.selectors.registrationError)) {
			return await this.getText(this.selectors.registrationError);
		}
		return null;
	}
	
	/**
	 * Check if registration was successful
	 */
	async isRegistrationSuccessful(): Promise<boolean> {
		return await this.isVisible(this.selectors.registrationSuccess);
	}
	
	/**
	 * Check if email verification is required
	 */
	async isEmailVerificationRequired(): Promise<boolean> {
		return await this.isVisible(this.selectors.verificationBanner);
	}
	
	/**
	 * Resend verification email
	 */
	async resendVerificationEmail() {
		if (await this.isVisible(this.selectors.resendVerificationButton)) {
			await this.clickWithRetry(this.selectors.resendVerificationButton);
		}
	}
	
	/**
	 * Verify email by visiting verification link
	 */
	async verifyEmail(verificationLink: string) {
		await this.page.goto(verificationLink);
		await this.waitForVisible(this.selectors.verificationSuccess);
	}
	
	/**
	 * Check if email verification was successful
	 */
	async isEmailVerificationSuccessful(): Promise<boolean> {
		return await this.isVisible(this.selectors.verificationSuccess);
	}
	
	/**
	 * Get current user from UI state
	 */
	async getCurrentUser(): Promise<any> {
		// Extract user information from the UI
		// This would depend on how user info is displayed in the UI
		if (await this.isLoggedIn()) {
			// Extract user info from user menu or profile
			return {
				loggedIn: true,
				// Additional user details would be extracted here
			};
		}
		return { loggedIn: false };
	}
	
	/**
	 * Check if modal is open
	 */
	async isModalOpen(): Promise<boolean> {
		return await this.isVisible(this.selectors.authModal);
	}
	
	/**
	 * Get the current tab (signin/signup)
	 */
	async getCurrentTab(): Promise<"signin" | "signup" | null> {
		if (await this.isVisible(this.selectors.signinSubmit)) {
			return "signin";
		}
		if (await this.isVisible(this.selectors.signupSubmit)) {
			return "signup";
		}
		return null;
	}
	
	/**
	 * Clear all form inputs
	 */
	async clearForm() {
		const inputs = [
			this.selectors.firstNameInput,
			this.selectors.lastNameInput,
			this.selectors.emailInput,
			this.selectors.passwordInput
		];
		
		for (const input of inputs) {
			if (await this.isVisible(input)) {
				await this.fillInput(input, "");
			}
		}
	}
	
	/**
	 * Check if form has validation errors
	 */
	async hasValidationErrors(): Promise<boolean> {
		const errorSelectors = [
			'[data-testid*="error"]',
			'.field-error',
			'.validation-error'
		];
		
		for (const selector of errorSelectors) {
			if (await this.isVisible(selector)) {
				return true;
			}
		}
		
		return false;
	}
}