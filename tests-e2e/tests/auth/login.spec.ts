import { test, expect } from "../../fixtures/base";
import { AuthPage } from "../../pages/auth-page";
import { generateTestEmail, config } from "../../config/environment";

/**
 * Core Authentication Tests - Login Flows
 * 
 * These tests cover:
 * - Test 1.3: Email/Password Login
 * - Test 1.4: Google OAuth Login
 * 
 * Following the Login System Test Plan specifications
 */

test.describe("Authentication - Login", () => {
	let authPage: AuthPage;
	
	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
		await authPage.goto("/");
	});
	
	test("Test 1.3: Email/Password Login", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Precondition: Create a LOCAL user (from Test 1.1)
		const email = generateTestEmail("local", "login");
		const password = config.testUsers.defaultPassword;
		
		const testUser = await db.createTestUser({
			email,
			password,
			emailType: "local",
			verified: true,
			authProvider: "LOCAL"
		});
		
		// Step 1: Use LOCAL user from Test 1.1 (created above)
		
		// Step 2: Navigate to login page (already done in beforeEach)
		
		// Step 3: Enter credentials and submit
		await authPage.login(email, password);
		
		// Step 4: Submit login form (already handled in login method)
		
		// Step 5: Verify successful authentication
		
		// Expected Results:
		// ✅ Login succeeds
		expect(await authPage.isLoggedIn()).toBe(true);
		
		// ✅ JWT token generated
		const token = await auth.getJWTToken();
		expect(token).toBeTruthy();
		expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format
		
		// ✅ User redirected to dashboard
		// (Check that we're no longer on login and modal is closed)
		expect(await authPage.isModalOpen()).toBe(false);
		
		// ✅ Session established correctly
		expect(await auth.validateSession()).toBe(true);
		
		// Additional validation: Check user data
		const currentUser = await auth.getCurrentUser();
		expect(currentUser.email).toBe(email);
		
		console.log("✅ Test 1.3: Email/Password Login - PASSED");
	});
	
	test("Test 1.4: Google OAuth Login", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Test data
		const email = generateTestEmail("google", "login");
		
		// Precondition: Create a GOOGLE user (from Test 1.2)
		// Note: This requires OAuth setup
		
		test.skip(config.oauth.google.mockMode === false, "Google OAuth not configured for testing");
		
		// Step 1: Use GOOGLE user from Test 1.2
		// (Would need to create a Google-authenticated user)
		
		// Step 2: Navigate to login page (already done in beforeEach)
		
		// Step 3: Click "Sign in with Google"
		await authPage.loginWithGoogle();
		
		// Step 4: Complete Google OAuth flow
		// (Implementation depends on OAuth setup)
		
		// Step 5: Verify successful authentication
		// (Would be implemented once OAuth is configured)
		
		// Expected Results (when OAuth is implemented):
		// ✅ OAuth login succeeds
		// ✅ JWT token generated
		// ✅ User redirected to dashboard
		// ✅ Session established correctly
		
		console.log("⚠️ Test 1.4: Google OAuth Login - SKIPPED (OAuth setup required)");
	});
	
	test("Login with invalid credentials should fail", async ({ page }) => {
		const email = generateTestEmail("local", "invalid");
		const wrongPassword = "WrongPassword123!";
		
		await authPage.login(email, wrongPassword);
		
		// Should show error and not be logged in
		expect(await authPage.isLoggedIn()).toBe(false);
		
		const error = await authPage.getLoginError();
		expect(error).toBeTruthy();
		expect(error.toLowerCase()).toContain("invalid" || "incorrect" || "wrong");
	});
	
	test("Login with unverified email should show verification prompt", async ({ 
		page, 
		db 
	}) => {
		// Create unverified user
		const email = generateTestEmail("local", "unverified");
		const password = config.testUsers.defaultPassword;
		
		await db.createTestUser({
			email,
			password,
			verified: false
		});
		
		await authPage.login(email, password);
		
		// Should show email verification requirement
		expect(await authPage.isEmailVerificationRequired()).toBe(true);
	});
	
	test("Remember me functionality", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Create verified user
		const email = generateTestEmail("local", "remember");
		const password = config.testUsers.defaultPassword;
		
		await db.createTestUser({
			email,
			password,
			verified: true
		});
		
		// Login with remember me checked
		await authPage.openAuthModal();
		await authPage.switchToSignin();
		await authPage.fillInput('[data-testid="email-input"]', email);
		await authPage.fillInput('[data-testid="password-input"]', password);
		await page.check('[data-testid="remember-me-checkbox"]');
		await page.click('[data-testid="signin-submit"]');
		
		// Verify login
		expect(await authPage.isLoggedIn()).toBe(true);
		
		// Check that token is stored persistently (localStorage vs sessionStorage)
		const hasRememberMeToken = await page.evaluate(() => {
			return localStorage.getItem("authToken") !== null;
		});
		expect(hasRememberMeToken).toBe(true);
	});
	
	test("Login form validation", async ({ page }) => {
		await authPage.openAuthModal();
		await authPage.switchToSignin();
		
		// Submit empty form
		await page.click('[data-testid="signin-submit"]');
		
		// Should show validation errors
		expect(await authPage.hasValidationErrors()).toBe(true);
	});
	
	test("Logout functionality", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Create and login user
		const email = generateTestEmail("local", "logout");
		const password = config.testUsers.defaultPassword;
		
		await db.createTestUser({
			email,
			password,
			verified: true
		});
		
		await auth.loginWithPassword(email, password);
		expect(await auth.isLoggedIn()).toBe(true);
		
		// Logout
		await auth.logout();
		
		// Verify logout
		expect(await auth.isLoggedIn()).toBe(false);
		
		// Check that token is cleared
		const token = await auth.getJWTToken();
		expect(token).toBeFalsy();
	});
	
	test("Session persistence after page reload", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Create and login user
		const email = generateTestEmail("local", "persist");
		const password = config.testUsers.defaultPassword;
		
		await db.createTestUser({
			email,
			password,
			verified: true
		});
		
		await auth.loginWithPassword(email, password);
		expect(await auth.isLoggedIn()).toBe(true);
		
		// Reload page
		await page.reload();
		
		// Should still be logged in
		expect(await auth.isLoggedIn()).toBe(true);
		expect(await auth.validateSession()).toBe(true);
	});
});