import { test, expect } from "../../fixtures/base";
import { AuthPage } from "../../pages/auth-page";
import { generateTestEmail, config } from "../../config/environment";

/**
 * Account Security Status Tests
 * 
 * These tests cover:
 * - Test 2.1: LOCAL User Security Status
 * - Test 2.2: GOOGLE User Security Status
 * 
 * Following the Login System Test Plan specifications
 */

test.describe("Authentication - Security Status", () => {
	let authPage: AuthPage;
	
	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
		await authPage.goto("/");
	});
	
	test("Test 2.1: LOCAL User Security Status", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Create and authenticate LOCAL user
		const email = generateTestEmail("local", "security");
		const password = config.testUsers.defaultPassword;
		
		await db.createTestUser({
			email,
			password,
			emailType: "local",
			verified: true,
			authProvider: "LOCAL"
		});
		
		// Login user
		await auth.loginWithPassword(email, password);
		expect(await auth.isLoggedIn()).toBe(true);
		
		// API Test: GET /api/v1/users/me/security
		const securityStatus = await auth.getSecurityStatus();
		
		// Expected Response:
		expect(securityStatus).toEqual({
			email_auth_linked: true,
			google_auth_linked: false,
			google_email: null
		});
		
		console.log("✅ Test 2.1: LOCAL User Security Status - PASSED");
	});
	
	test("Test 2.2: GOOGLE User Security Status", async ({ 
		page, 
		db, 
		auth 
	}) => {
		// Note: This test requires Google OAuth setup
		test.skip(config.oauth.google.mockMode === false, "Google OAuth not configured for testing");
		
		// Test data
		const email = generateTestEmail("google", "security");
		
		// Create GOOGLE user (would require OAuth integration)
		// For now, this is a placeholder
		
		// Expected Response (when OAuth is implemented):
		// {
		//   "email_auth_linked": false,
		//   "google_auth_linked": true,
		//   "google_email": "testgoogle+security@gmail.com"
		// }
		
		console.log("⚠️ Test 2.2: GOOGLE User Security Status - SKIPPED (OAuth setup required)");
	});
	
	test("Security status requires authentication", async ({ 
		page, 
		auth 
	}) => {
		// Test unauthenticated access
		try {
			await auth.getSecurityStatus();
			// Should not reach here
			expect(true).toBe(false);
		} catch (error) {
			// Should get authentication error
			expect(error.message).toContain("Failed to get security status");
		}
	});
	
	test("Security status with invalid token", async ({ 
		page, 
		auth 
	}) => {
		// Set invalid token
		await auth.setJWTToken("invalid.token.here");
		
		try {
			await auth.getSecurityStatus();
			// Should not reach here
			expect(true).toBe(false);
		} catch (error) {
			// Should get authentication error
			expect(error.message).toContain("Failed to get security status");
		}
	});
});