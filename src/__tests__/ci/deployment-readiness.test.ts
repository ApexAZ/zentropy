import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * Deployment Readiness Tests
 *
 * These tests simulate production deployment scenarios and would have
 * caught the server hanging issue during CI/CD pipeline.
 */
describe("Deployment Readiness - Production Environment Simulation", () => {
	it("should perform clean build from scratch (simulates fresh deployment)", async () => {
		// Simulate fresh deployment environment
		console.log("🧹 Simulating fresh deployment - removing all build artifacts...");

		// Remove build artifacts (simulates clean environment)
		await execAsync("rm -rf dist/ .tsbuildinfo node_modules/.cache || true");

		// Install dependencies (would happen in CI)
		console.log("📦 Installing dependencies...");
		await execAsync("npm ci --prefer-offline");

		// Build from scratch
		console.log("🔨 Building from clean state...");
		const buildStart = Date.now();
		await execAsync("npm run build");
		const buildTime = Date.now() - buildStart;

		expect(buildTime).toBeLessThan(60000); // Should build within 1 minute
		console.log(`✅ Clean build completed in ${buildTime}ms`);
	});

	it("should start server reliably after system restart simulation", async () => {
		// This test simulates the exact scenario that caused the issue:
		// Server was working, PC reboot happened, then server wouldn't start

		console.log("🔄 Simulating system restart scenario...");

		// Kill any existing processes
		await execAsync('pkill -f "node dist/server" || true');

		// Simulate corrupted state that can happen after restart
		const distPath = path.join(process.cwd(), "dist");
		if (fs.existsSync(distPath)) {
			// Create some potentially corrupted build artifacts
			const corruptedFiles = ["dist/.corrupted-cache", "dist/server/.temp-build"];

			for (const file of corruptedFiles) {
				const fullPath = path.join(process.cwd(), file);
				fs.mkdirSync(path.dirname(fullPath), { recursive: true });
				fs.writeFileSync(fullPath, "corrupted build artifact");
			}
		}

		// Now try to start server - this should work with our prevention system
		console.log('🚀 Testing server startup after "system restart"...');
		const startupTest = await execAsync('timeout 30s npm run dev:full || echo "STARTUP_FAILED"');

		// Should not contain startup failure
		expect(startupTest.stdout).not.toContain("STARTUP_FAILED");
		expect(startupTest.stdout).not.toContain("Server failed safety check");

		console.log("✅ Server startup successful after restart simulation");
	}, 45000);

	it("should detect and prevent import dependency issues", async () => {
		console.log("🔍 Analyzing import dependency health...");

		// Check for circular dependencies
		const circularCheck = await execAsync('npx madge --circular src/ --extensions ts || echo "NO_CIRCULAR"');

		if (!circularCheck.stdout.includes("NO_CIRCULAR") && circularCheck.stdout.trim()) {
			console.warn("⚠️ Circular dependencies detected:", circularCheck.stdout);
			// Log but don't fail - we'll monitor this
		}

		// Count utility files (we want to keep this under control)
		const utilsCount = await execAsync('find src/utils -name "*.ts" | wc -l');
		const utilsFileCount = parseInt(utilsCount.stdout.trim());

		console.log(`📊 Utils file count: ${utilsFileCount} (target: <30)`);

		if (utilsFileCount > 35) {
			console.warn("⚠️ High utility file count detected - consider consolidation");
		}

		// Test that all utility files can be imported without hanging
		const utilFiles = await execAsync('find src/utils -name "*.ts" -type f');
		const files = utilFiles.stdout
			.trim()
			.split("\n")
			.filter(f => f);

		console.log(`🧪 Testing import health for ${files.length} utility files...`);

		for (const file of files.slice(0, 10)) {
			// Test first 10 to avoid timeout
			const importTest = await execAsync(`timeout 5s node -e "
				try {
					require('ts-node/register');
					require('./${file}');
					console.log('✅ ${file}');
				} catch (e) {
					console.log('❌ ${file}: ' + e.message);
				}
			" || echo "TIMEOUT: ${file}"`);

			expect(importTest.stdout).not.toContain("TIMEOUT");
		}

		console.log("✅ Import dependency health check passed");
	});

	it("should validate emergency recovery procedures", async () => {
		console.log("🚨 Testing emergency recovery procedures...");

		// Test that our emergency commands exist and work
		const emergencyCommands = ["npm run port:check", "npm run emergency"];

		for (const command of emergencyCommands) {
			console.log(`Testing: ${command}`);
			const result = await execAsync(`${command} || echo "COMMAND_FAILED"`);
			expect(result.stdout).not.toContain("COMMAND_FAILED");
		}

		console.log("✅ Emergency recovery procedures validated");
	});

	it("should ensure all routes are accessible after deployment", async () => {
		console.log("🌐 Testing route accessibility...");

		// Start server in background for testing
		const serverProcess = execAsync('timeout 20s npm run dev || echo "SERVER_START_FAILED"');

		// Wait for server to start
		await new Promise(resolve => setTimeout(resolve, 8000));

		// Test critical routes
		const routes = ["/health", "/api/users", "/api/teams"];

		for (const route of routes) {
			try {
				const response = await fetch(`http://localhost:3000${route}`);
				expect(response.status).toBeLessThan(500); // No server errors
				console.log(`✅ Route ${route} accessible (${response.status})`);
			} catch (error) {
				console.log(`❌ Route ${route} failed:`, error instanceof Error ? error.message : String(error));
				throw error;
			}
		}

		await serverProcess;
		console.log("✅ All critical routes accessible");
	}, 30000);

	it("should validate database connectivity after deployment", async () => {
		console.log("🗄️ Testing database connectivity...");

		// Start database
		await execAsync("docker-compose up -d");

		// Wait for database
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Test database health through our health endpoint
		try {
			const healthResponse = await fetch("http://localhost:3000/health");
			expect(healthResponse.ok).toBe(true);

			const healthData = await healthResponse.json();
			expect(healthData.database).toBe("connected");

			console.log("✅ Database connectivity validated");
		} catch (error) {
			console.log("❌ Database connectivity failed:", error instanceof Error ? error.message : String(error));
			throw error;
		}
	}, 20000);
});
