import { FullConfig } from "@playwright/test";

/**
 * Global Teardown for Zentropy E2E Tests
 * 
 * This teardown ensures:
 * 1. Test data is cleaned up
 * 2. Database is left in a clean state
 * 3. Email service is cleared
 * 4. No test artifacts remain
 */
async function globalTeardown(config: FullConfig) {
	console.log("🧹 Cleaning up Zentropy E2E test environment...");
	
	// Clean up test data
	await cleanupTestData();
	
	// Clear Mailpit emails
	await clearMailpit();
	
	// Generate test report summary
	await generateTestSummary();
	
	console.log("✅ E2E test environment cleaned up");
}

/**
 * Clean up any test data created during test runs
 */
async function cleanupTestData() {
	try {
		const { exec } = require("child_process");
		const util = require("util");
		const execAsync = util.promisify(exec);
		
		// Delete any users with test email patterns
		const testEmailPatterns = [
			"testlocal+",
			"testgoogle+", 
			"testvictim+",
			"testuser+",
			"e2e+test"
		];
		
		for (const pattern of testEmailPatterns) {
			try {
				await execAsync(`python3 scripts/db_utils.py delete "${pattern}"`);
			} catch (error) {
				// User may not exist, which is fine
			}
		}
		
		console.log("🗄️ Test data cleaned up");
	} catch (error) {
		console.warn("⚠️ Could not clean up test data:", error);
		// Don't fail teardown if cleanup fails
	}
}

/**
 * Clear Mailpit emails after tests
 */
async function clearMailpit() {
	try {
		await fetch("http://localhost:8025/api/v1/messages", {
			method: "DELETE"
		});
		console.log("📧 Mailpit emails cleared");
	} catch (error) {
		console.warn("⚠️ Could not clear Mailpit emails:", error);
	}
}

/**
 * Generate a summary of test execution
 */
async function generateTestSummary() {
	try {
		const fs = require("fs");
		const path = require("path");
		
		// Check if test results exist
		const resultsPath = path.join(process.cwd(), "tests-e2e-results.json");
		if (fs.existsSync(resultsPath)) {
			const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
			
			console.log("📊 Test Summary:");
			console.log(`   Total: ${results.stats?.total || 0}`);
			console.log(`   Passed: ${results.stats?.passed || 0}`);
			console.log(`   Failed: ${results.stats?.failed || 0}`);
			console.log(`   Skipped: ${results.stats?.skipped || 0}`);
		}
	} catch (error) {
		// Silent fail - summary is optional
	}
}

export default globalTeardown;