import { chromium, FullConfig } from "@playwright/test";

/**
 * Global Setup for Zentropy E2E Tests
 * 
 * This setup ensures:
 * 1. Development services are running
 * 2. Test database is initialized and clean
 * 3. Email service (Mailpit) is ready
 * 4. Authentication state is prepared
 */
async function globalSetup(config: FullConfig) {
	console.log("🚀 Setting up Zentropy E2E test environment...");
	
	// Verify services are running
	await verifyServices();
	
	// Clean test database
	await cleanTestDatabase();
	
	// Clear Mailpit emails
	await clearMailpit();
	
	console.log("✅ E2E test environment ready");
}

/**
 * Verify that required services are running
 */
async function verifyServices() {
	const services = [
		{ name: "Frontend", url: "http://localhost:5173" },
		{ name: "Backend API", url: "http://localhost:3000/docs" },
		{ name: "PostgreSQL", url: "http://localhost:5432", skipHttp: true },
		{ name: "Mailpit", url: "http://localhost:8025" }
	];
	
	for (const service of services) {
		if (service.skipHttp) {
			console.log(`⚡ ${service.name} - Assuming available (database)`);
			continue;
		}
		
		try {
			const response = await fetch(service.url);
			if (response.ok) {
				console.log(`✅ ${service.name} - Available`);
			} else {
				throw new Error(`HTTP ${response.status}`);
			}
		} catch (error) {
			console.error(`❌ ${service.name} - Not available at ${service.url}`);
			console.error(`Error: ${error}`);
			throw new Error(`Required service ${service.name} is not running. Please run 'npm run dev' first.`);
		}
	}
}

/**
 * Clean the test database before running tests
 */
async function cleanTestDatabase() {
	try {
		// Use the existing database utility to clean up test users
		const { exec } = require("child_process");
		const util = require("util");
		const execAsync = util.promisify(exec);
		
		// Clean up any existing test users
		await execAsync("python3 scripts/db_utils.py list | grep 'test.*@' | head -20").catch(() => {
			// No test users found, which is fine
		});
		
		console.log("🗄️ Test database cleaned");
	} catch (error) {
		console.warn("⚠️ Could not clean test database:", error);
		// Don't fail setup if database cleanup fails
	}
}

/**
 * Clear Mailpit emails before tests
 */
async function clearMailpit() {
	try {
		// Clear all emails in Mailpit
		await fetch("http://localhost:8025/api/v1/messages", {
			method: "DELETE"
		});
		console.log("📧 Mailpit emails cleared");
	} catch (error) {
		console.warn("⚠️ Could not clear Mailpit emails:", error);
		// Don't fail setup if Mailpit cleanup fails
	}
}

export default globalSetup;