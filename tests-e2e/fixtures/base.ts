import { test as base, expect } from "@playwright/test";
import { DatabaseHelpers } from "../utils/database-helpers";
import { MailpitHelpers } from "../utils/mailpit-helpers";
import { AuthHelpers } from "../utils/auth-helpers";

/**
 * Extended Test Fixtures for Zentropy E2E Tests
 * 
 * These fixtures provide:
 * - Database management and cleanup
 * - Email verification automation
 * - Authentication state management
 * - Common test utilities
 */

type TestFixtures = {
	db: DatabaseHelpers;
	mailpit: MailpitHelpers;
	auth: AuthHelpers;
};

export const test = base.extend<TestFixtures>({
	/**
	 * Database helpers for test data management
	 */
	db: async ({}, use) => {
		const dbHelpers = new DatabaseHelpers();
		await use(dbHelpers);
		// Cleanup after each test
		await dbHelpers.cleanup();
	},
	
	/**
	 * Email testing helpers for Mailpit integration
	 */
	mailpit: async ({}, use) => {
		const mailpitHelpers = new MailpitHelpers();
		// Clear emails before each test
		await mailpitHelpers.clear();
		await use(mailpitHelpers);
		// Clear emails after each test
		await mailpitHelpers.clear();
	},
	
	/**
	 * Authentication helpers for login/logout flows
	 */
	auth: async ({ page, db }, use) => {
		const authHelpers = new AuthHelpers(page, db);
		await use(authHelpers);
		// Logout after each test if logged in
		await authHelpers.logout();
	},
});

export { expect } from "@playwright/test";