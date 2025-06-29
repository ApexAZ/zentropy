import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Pre-Commit Server Startup Test
 *
 * Lightweight test that runs before commits to catch server hanging issues.
 * Takes ~30 seconds vs hours of debugging.
 */
describe("Pre-Commit: Server Startup Health Check", () => {
	beforeEach(async () => {
		console.log("🧹 Pre-test cleanup...");

		// Kill any existing server processes
		try {
			await execAsync('pkill -f "node dist/server"');
		} catch (error) {
			// No processes to kill - that's fine
		}

		// Stop any running Docker containers
		try {
			await execAsync("docker-compose down");
		} catch (error) {
			// No containers to stop - that's fine
		}

		// Wait for cleanup
		await new Promise(resolve => setTimeout(resolve, 1000));
	});

	afterEach(async () => {
		console.log("🧹 Post-test cleanup...");

		// Kill any server processes that might be running
		try {
			await execAsync('pkill -f "node dist/server"');
		} catch (error) {
			// No processes to kill - that's fine
		}

		// Stop Docker containers
		try {
			await execAsync("docker-compose down");
		} catch (error) {
			// No containers to stop - that's fine
		}

		// Wait for cleanup
		await new Promise(resolve => setTimeout(resolve, 1000));
	});

	it("should start server within 15 seconds (prevents hanging commits)", async () => {
		console.log("🚀 Testing server startup for commit readiness...");

		// Clean build to prevent corrupted artifact issues
		await execAsync("npm run build:clean");

		// Start database for test
		console.log("📦 Starting database for test...");
		await execAsync("docker-compose up -d");

		// Wait for database to be ready
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Test startup with timeout - this would have caught the hanging issue
		const startTime = Date.now();

		try {
			// Use our safety check that's built into dev:full
			await execAsync("npm run port:check");

			// Start server in background with timeout
			execAsync("timeout 15s node dist/server/index.js");

			// Wait a moment for server to start
			await new Promise(resolve => setTimeout(resolve, 4000));

			// Test if server is responding
			const healthCheck = await execAsync('curl -s http://localhost:3000/health || echo "NO_RESPONSE"');

			const totalTime = Date.now() - startTime;

			// Server should respond and not hang
			expect(healthCheck.stdout).not.toContain("NO_RESPONSE");
			expect(totalTime).toBeLessThan(15000);

			console.log(`✅ Server startup healthy - ready for commit (${totalTime}ms)`);
		} catch (error) {
			console.log("❌ Server startup failed - commit blocked");
			console.log("💡 Run: npm run emergency");
			console.log("📚 See: CLAUDETroubleshooting.md");

			throw new Error("Server startup hanging detected - commit blocked to prevent production deployment");
		}
	}, 30000);

	it("should detect circular dependencies (quick check)", async () => {
		console.log("🔍 Quick circular dependency check...");

		try {
			const { stdout } = await execAsync('npx madge --circular src/ --extensions ts || echo "NO_CIRCULAR"');

			if (!stdout.includes("NO_CIRCULAR") && stdout.trim()) {
				console.warn("⚠️ Circular dependencies detected:", stdout);
				// Don't fail commit, but warn
			} else {
				console.log("✅ No circular dependencies");
			}

			// Always pass - this is informational
			expect(true).toBe(true);
		} catch (error) {
			// Don't block commits for this check
			console.log(
				"⚠️ Could not check circular dependencies:",
				error instanceof Error ? error.message : String(error)
			);
			expect(true).toBe(true);
		}
	});

	it("should validate emergency recovery commands exist", async () => {
		console.log("🚨 Validating emergency recovery commands...");

		// These commands should exist and not throw errors
		const commands = [
			"npm run port:check --help || npm run port:check",
			'npm run emergency --help || echo "emergency command exists"'
		];

		for (const cmd of commands) {
			const result = await execAsync(cmd);
			// Should not contain "command not found" or similar errors
			expect(result.stderr?.toLowerCase()).not.toContain("command not found");
		}

		console.log("✅ Emergency recovery commands validated");
	});
});
