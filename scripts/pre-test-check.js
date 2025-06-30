#!/usr/bin/env node

/**
 * Pre-test environment check
 * Verifies and starts database/server services before running tests
 */

const { Client } = require("pg");
const { spawn, exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function checkDatabase() {
	console.log("🔍 Checking database connectivity...");

	const client = new Client({
		host: process.env.DB_HOST || "localhost",
		port: process.env.DB_PORT || 5432,
		database: process.env.DB_NAME || "capacity_planner",
		user: process.env.DB_USER || "dev_user",
		password: process.env.DB_PASSWORD || "dev_password"
	});

	try {
		await client.connect();
		await client.query("SELECT 1");
		await client.end();
		console.log("✅ Database connection successful");
		return true;
	} catch (error) {
		console.log("❌ Database connection failed:");
		console.log(`   Error: ${error.message}`);
		return false;
	}
}

async function checkServer() {
	console.log("🔍 Checking server connectivity...");

	try {
		// Use curl for server health check instead of fetch
		const { stdout, stderr } = await execAsync(
			"curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health"
		);

		if (stdout.trim() === "200") {
			console.log("✅ Server is running and healthy");
			return true;
		} else {
			console.log("❌ Server health check failed (HTTP " + stdout.trim() + ")");
			return false;
		}
	} catch (error) {
		console.log("❌ Server not accessible:");
		console.log(`   Error: ${error.message}`);
		return false;
	}
}

async function startDatabase() {
	console.log("🚀 Starting database with docker-compose...");

	try {
		// Check if docker-compose.yml exists
		await execAsync("test -f docker-compose.yml");

		// Start the database service
		const { stdout, stderr } = await execAsync("docker-compose up -d postgres");

		if (stderr && !stderr.includes("Creating") && !stderr.includes("Starting")) {
			throw new Error(`Docker compose error: ${stderr}`);
		}

		console.log("📦 Database container starting...");

		// Wait for database to be ready (max 30 seconds)
		console.log("⏳ Waiting for database to be ready...");

		for (let i = 0; i < 30; i++) {
			await new Promise(resolve => setTimeout(resolve, 1000));

			if (await checkDatabase()) {
				console.log("✅ Database started successfully");
				return true;
			}

			process.stdout.write(".");
		}

		console.log("\n❌ Database failed to start within 30 seconds");
		return false;
	} catch (error) {
		console.log("❌ Failed to start database:");
		console.log(`   Error: ${error.message}`);
		console.log("💡 Manual fix: docker-compose up -d");
		return false;
	}
}

async function startServer() {
	console.log("🚀 Starting development server...");

	try {
		// Check if port 3000 is already in use
		try {
			await execAsync("lsof -ti:3000");
			console.log("⚠️  Port 3000 is already in use, attempting cleanup...");
			await execAsync("npm run port:check");
			await new Promise(resolve => setTimeout(resolve, 2000));
		} catch {
			// Port is free, continue
		}

		// Start the server in background
		console.log("📦 Starting server with npm run dev:full...");

		const serverProcess = spawn("npm", ["run", "dev:full"], {
			detached: false,
			stdio: ["ignore", "pipe", "pipe"]
		});

		// Give the server more time to start (30 seconds)
		console.log("⏳ Waiting for server to be ready (up to 30s)...");

		for (let i = 0; i < 30; i++) {
			await new Promise(resolve => setTimeout(resolve, 1000));

			if (await checkServer()) {
				console.log("✅ Server started successfully");
				// Detach the process so it continues running
				serverProcess.unref();
				return true;
			}

			if (i % 5 === 0) {
				process.stdout.write(`\n   ${i}/30 seconds...`);
			} else {
				process.stdout.write(".");
			}
		}

		console.log("\n❌ Server failed to start within 30 seconds");
		console.log("💡 The server may still be starting. Check manually: curl http://localhost:3000/health");
		return false;
	} catch (error) {
		console.log("❌ Failed to start server:");
		console.log(`   Error: ${error.message}`);
		console.log("💡 Manual fix: npm run dev:full");
		return false;
	}
}

async function checkEnvironment() {
	console.log("🚀 Running pre-test environment checks...");
	console.log("");

	// Check database first
	let dbConnected = await checkDatabase();

	if (!dbConnected) {
		console.log("🔧 Auto-starting database...");
		dbConnected = await startDatabase();

		if (!dbConnected) {
			console.log("");
			console.log("⚠️  Failed to auto-start database. Integration tests will fail.");
			console.log("   Tests will still run, but expect ~121 database-related failures");
			console.log("");
			console.log("💡 Manual fix options:");
			console.log("   1. docker-compose up -d");
			console.log("   2. npm run test:unit (unit tests only)");
			console.log("");

			// Ask user if they want to continue without database
			const readline = require("readline");
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			return new Promise(resolve => {
				rl.question("Continue with tests anyway? (y/N): ", answer => {
					rl.close();
					const shouldContinue = answer.toLowerCase().startsWith("y");

					if (shouldContinue) {
						console.log("▶️  Continuing with tests (expect database failures)...");
						console.log("");
					} else {
						console.log("❌ Tests cancelled. Fix database connection first.");
					}

					resolve(shouldContinue);
				});
			});
		}
	}

	// Note: We don't need to start the dev server for tests
	// Integration tests start their own test server instances

	console.log("✅ Environment check complete - all systems ready");
	console.log("");
	return true;
}

// Main execution
if (require.main === module) {
	checkEnvironment()
		.then(shouldContinue => {
			process.exit(shouldContinue ? 0 : 1);
		})
		.catch(error => {
			console.error("❌ Environment check failed:", error.message);
			process.exit(1);
		});
}

module.exports = { checkDatabase, checkEnvironment };
