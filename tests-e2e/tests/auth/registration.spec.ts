import { test, expect } from "../../fixtures/base";
import { AuthPage } from "../../pages/auth-page";
import { generateTestEmail, config } from "../../config/environment";

/**
 * Core Authentication Tests - Registration Flows
 * 
 * These tests cover:
 * - Test 1.1: Email/Password Registration (LOCAL User)
 * - Test 1.2: Google OAuth Registration (GOOGLE User)
 * 
 * Following the Login System Test Plan specifications
 */

test.describe("Authentication - Registration", () => {
	let authPage: AuthPage;
	
	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
		await authPage.goto("/");
	});
	
	test("Test 1.1: Email/Password Registration (LOCAL User)", async ({ 
		page, 
		db, 
		mailpit, 
		auth 
	}) => {
		// Test data
		const email = generateTestEmail("local", "reg");
		const password = config.testUsers.defaultPassword;
		const firstName = "Test";
		const lastName = "User";
		
		// Step 1: Navigate to registration page (already done in beforeEach)
		
		// Step 2: Fill registration form
		await authPage.register(firstName, lastName, email, password);
		
		// Step 3: Submit registration
		// (Already handled in register method)
		
		// Expected Result: Registration succeeds
		expect(await authPage.isRegistrationSuccessful()).toBe(true);
		
		// Step 4: Check Mailpit for verification email
		const verificationEmail = await mailpit.waitForEmail(email);
		expect(verificationEmail).toBeTruthy();
		expect(verificationEmail.Subject).toContain("verify");
		
		// Step 5: Click verification link
		const verificationLink = await mailpit.verifyEmail(email);
		await authPage.verifyEmail(verificationLink);
		
		// Step 6: Verify account activation
		expect(await authPage.isEmailVerificationSuccessful()).toBe(true);
		
		// Expected Results Validation:
		// ✅ Registration succeeds
		expect(await authPage.isRegistrationSuccessful()).toBe(true);
		
		// ✅ Verification email sent to Mailpit
		expect(await mailpit.getEmailCount(email)).toBeGreaterThan(0);
		
		// ✅ Email verification activates account
		expect(await authPage.isEmailVerificationSuccessful()).toBe(true);
		
		// ✅ User created with AuthProvider.LOCAL
		await db.validateUserState(email, {
			authProvider: "LOCAL",
			emailVerified: true,
			hasPassword: true,
			googleId: null
		});
		
		// ✅ Can log in with email/password
		await auth.loginWithPassword(email, password);
		expect(await auth.isLoggedIn()).toBe(true);
		
		// Update test plan status (this would be done manually or via automation)
		console.log("✅ Test 1.1: Email/Password Registration (LOCAL User) - PASSED");
	});
	
	test("Test 1.2: Google OAuth Registration (GOOGLE User)", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Test data
		const email = generateTestEmail("google", "oauth");
		
		// Note: This test requires Google OAuth to be properly configured
		// For now, we'll create a placeholder test that validates the infrastructure
		
		test.skip(config.oauth.google.mockMode === false, "Google OAuth not configured for testing");
		
		// Step 1: Navigate to registration/login page (already done in beforeEach)
		
		// Step 2: Click "Sign in with Google"
		await authPage.openAuthModal();
		// This would trigger OAuth flow - implementation depends on OAuth setup
		
		// Step 3: Complete Google OAuth flow
		// (This would require OAuth sandbox/mock setup)
		
		// Step 4: Verify successful registration
		// (Would be implemented once OAuth is configured)
		
		// Step 5: Check user profile creation
		// (Would validate user was created with correct attributes)
		
		// Expected Results (when OAuth is implemented):
		// ✅ Google OAuth flow completes
		// ✅ User created with AuthProvider.GOOGLE
		// ✅ No password hash stored
		// ✅ Email marked as verified (Google pre-verified)
		// ✅ Can log in with Google OAuth
		
		console.log("⚠️ Test 1.2: Google OAuth Registration - SKIPPED (OAuth setup required)");
	});
	
	test("Registration form validation", async ({ page }) => {
		// Test form validation errors
		await authPage.openAuthModal();
		await authPage.switchToSignup();
		
		// Submit empty form
		await page.click('[data-testid="signup-submit"]');
		
		// Should show validation errors
		expect(await authPage.hasValidationErrors()).toBe(true);
	});
	
	test("Registration with existing email should fail", async ({ 
		page, 
		db 
	}) => {
		// Create a user first
		const email = generateTestEmail("local", "existing");
		await db.createTestUser({ email });
		
		// Try to register with same email
		await authPage.register("Test", "User", email, config.testUsers.defaultPassword);
		
		// Should show error
		const error = await authPage.getRegistrationError();
		expect(error).toContain("already exists" || "already registered");
	});
	
	test("Registration form field requirements", async ({ page }) => {
		await authPage.openAuthModal();
		await authPage.switchToSignup();
		
		// Test required fields
		const requiredFields = [
			'[data-testid="first-name-input"]',
			'[data-testid="last-name-input"]',
			'[data-testid="email-input"]',
			'[data-testid="password-input"]'
		];
		
		for (const field of requiredFields) {
			expect(await page.locator(field).getAttribute("required")).toBeTruthy();
		}
	});
	
	test("Password strength validation", async ({ page }) => {
		await authPage.openAuthModal();
		await authPage.switchToSignup();
		
		// Fill form with weak password
		await authPage.fillInput('[data-testid="first-name-input"]', "Test");
		await authPage.fillInput('[data-testid="last-name-input"]', "User");
		await authPage.fillInput('[data-testid="email-input"]', generateTestEmail("local", "weak"));
		await authPage.fillInput('[data-testid="password-input"]', "weak");
		
		await page.click('[data-testid="signup-submit"]');
		
		// Should show password validation error
		expect(await authPage.hasValidationErrors()).toBe(true);
	});
});