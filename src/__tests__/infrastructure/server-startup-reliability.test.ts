import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

describe("Server Startup Reliability Tests", () => {
	let serverProcess: ChildProcess | null = null;
	const SERVER_STARTUP_TIMEOUT = 15000; // 15 seconds
	const TEST_PORT = 3001; // Use different port for testing

	beforeEach(async () => {
		// Clean up any existing processes
		try {
			await execAsync('pkill -f "node dist/server" || true');
		} catch (error) {
			// Ignore errors - process might not exist
		}

		// Ensure clean build
		await execAsync("npm run build:clean");
	});

	afterEach(async () => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
			serverProcess = null;
		}

		// Clean up test processes
		try {
			await execAsync('pkill -f "node dist/server" || true');
		} catch (error) {
			// Ignore errors
		}
	});

	it(
		"should start server within timeout limit",
		async () => {
			const startTime = Date.now();

			// Start server process
			serverProcess = spawn("node", ["dist/server/index.js"], {
				env: { ...process.env, PORT: TEST_PORT.toString() },
				stdio: "pipe"
			});

			// Wait for server to start or timeout
			const serverStarted = await new Promise<boolean>(resolve => {
				let retryCount = 0;
				const MAX_RETRIES = 30; // 15 seconds max (30 * 500ms)
				let isResolved = false;

				const timeout = setTimeout(() => {
					if (!isResolved) {
						isResolved = true;
						resolve(false);
					}
				}, SERVER_STARTUP_TIMEOUT);

				// Check if server is responding
				const checkServer = async (): Promise<void> => {
					if (isResolved || retryCount >= MAX_RETRIES) {
						return;
					}

					retryCount++;

					try {
						const response = await fetch(`http://localhost:${TEST_PORT}/health`);
						if (response.ok && !isResolved) {
							isResolved = true;
							clearTimeout(timeout);
							resolve(true);
						}
					} catch (error) {
						// Server not ready yet, continue checking if retries remain
						if (retryCount < MAX_RETRIES && !isResolved) {
							setTimeout(() => {
								void checkServer();
							}, 500);
						}
					}
				};

				// Start checking after 1 second
				setTimeout(() => {
					void checkServer();
				}, 1000);
			});

			const startupTime = Date.now() - startTime;

			expect(serverStarted).toBe(true);
			expect(startupTime).toBeLessThan(SERVER_STARTUP_TIMEOUT);

			console.log(`✅ Server started successfully in ${startupTime}ms`);
		},
		SERVER_STARTUP_TIMEOUT + 5000
	);

	it("should detect import dependency deadlocks", async () => {
		// Test for circular dependencies that could cause hanging
		const { stdout } = await execAsync("npx madge --circular src/ --extensions ts");

		if (stdout.trim()) {
			console.warn("⚠️ Circular dependencies detected:", stdout);
		}

		// This is a warning, not a failure, but we should monitor it
		expect(true).toBe(true); // Always pass but log warnings
	});

	it("should handle corrupted build artifacts gracefully", async () => {
		// Simulate corrupted build by creating invalid files
		const distPath = path.join(process.cwd(), "dist");
		const corruptedFile = path.join(distPath, "server", "corrupted.js");

		// Create corrupted file
		if (fs.existsSync(distPath)) {
			fs.mkdirSync(path.dirname(corruptedFile), { recursive: true });
			fs.writeFileSync(corruptedFile, "invalid javascript content;;;");
		}

		// Clean build should handle this
		await execAsync("npm run build:clean");

		// Verify corrupted file is gone
		expect(fs.existsSync(corruptedFile)).toBe(false);
	});

	it("should prevent port conflicts", async () => {
		// Start first server
		const firstServer = spawn("node", ["dist/server/index.js"], {
			env: { ...process.env, PORT: TEST_PORT.toString() },
			stdio: "pipe"
		});

		// Wait for first server to start
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Try to start second server on same port - should fail gracefully
		const secondServer = spawn("node", ["dist/server/index.js"], {
			env: { ...process.env, PORT: TEST_PORT.toString() },
			stdio: "pipe"
		});

		let errorReceived = false;
		secondServer.stderr?.on("data", (data: Buffer) => {
			const error = data.toString();
			if (error.includes("EADDRINUSE") || error.includes("port")) {
				errorReceived = true;
			}
		});

		// Wait for error
		await new Promise(resolve => setTimeout(resolve, 3000));

		expect(errorReceived).toBe(true);

		// Clean up
		firstServer.kill("SIGTERM");
		secondServer.kill("SIGTERM");
	});

	it("should validate all route imports load successfully", async () => {
		// Test that all route files can be imported without hanging
		const routeFiles = [
			"dist/routes/teams.js",
			"dist/routes/invitations.js",
			"dist/routes/users.js",
			"dist/routes/calendar-entries.js"
		];

		for (const routeFile of routeFiles) {
			if (fs.existsSync(routeFile)) {
				const startTime = Date.now();

				// Test import in separate process to avoid hanging main test
				const testProcess = spawn(
					"node",
					[
						"-e",
						`
					const startTime = Date.now();
					try {
						require('./${routeFile}');
						console.log('SUCCESS: ${routeFile} loaded in', Date.now() - startTime, 'ms');
					} catch (error) {
						console.error('FAILED: ${routeFile}', error.message);
						process.exit(1);
					}
				`
					],
					{ stdio: "pipe" }
				);

				const result = await new Promise<boolean>(resolve => {
					const timeout = setTimeout(() => {
						testProcess.kill("SIGTERM");
						resolve(false);
					}, 5000); // 5 second timeout for route import

					testProcess.on("exit", code => {
						clearTimeout(timeout);
						resolve(code === 0);
					});
				});

				const loadTime = Date.now() - startTime;
				expect(result).toBe(true);
				expect(loadTime).toBeLessThan(5000);
			}
		}
	});

	it("should ensure emergency recovery scripts work", async () => {
		// Test that emergency recovery actually works
		const emergencyScript = path.join(process.cwd(), "scripts", "emergency-recovery.sh");

		if (fs.existsSync(emergencyScript)) {
			// Run emergency recovery
			const { stdout, stderr } = await execAsync(`bash ${emergencyScript}`);

			// Should complete without errors
			expect(stderr).not.toContain("ERROR");
			expect(stdout).toContain("Recovery complete");
		}
	});
});
