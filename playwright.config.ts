import { defineConfig, devices } from "@playwright/test";

/**
 * Zentropy Playwright E2E Test Configuration
 * 
 * This configuration follows the project's strict quality standards and integrates
 * with the existing development environment setup.
 */
export default defineConfig({
	// Test directory structure
	testDir: "./tests-e2e",
	
	// Test file patterns
	testMatch: ["**/*.spec.ts", "**/*.e2e.ts"],
	
	// Execution settings
	fullyParallel: true, // Run tests in parallel for speed
	forbidOnly: !!process.env.CI, // Fail CI if test.only() is committed
	retries: process.env.CI ? 2 : 0, // Retry on CI for flaky network conditions
	workers: process.env.CI ? 1 : undefined, // Limit workers in CI
	
	// Reporting
	reporter: [
		["html", { outputFolder: "tests-e2e-report" }],
		["json", { outputFile: "tests-e2e-results.json" }],
		process.env.CI ? ["github"] : ["list"]
	],
	
	// Global test settings
	use: {
		// Base URL for tests
		baseURL: "http://localhost:5173",
		
		// Browser context settings
		viewport: { width: 1280, height: 720 },
		
		// Trace collection on failure
		trace: "on-first-retry",
		
		// Screenshot on failure
		screenshot: "only-on-failure",
		
		// Video recording
		video: "retain-on-failure",
		
		// Navigation timeout
		navigationTimeout: 30000,
		
		// Action timeout
		actionTimeout: 10000,
		
		// Test timeout
		testTimeout: 60000,
	},
	
	// Environment setup for tests
	globalSetup: "./tests-e2e/global-setup.ts",
	globalTeardown: "./tests-e2e/global-teardown.ts",
	
	// Project configurations for different browsers
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Additional Chrome-specific settings
				launchOptions: {
					args: [
						"--disable-web-security", // For OAuth redirects
						"--disable-features=VizDisplayCompositor" // Reduce flakiness
					]
				}
			},
		},
		
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		
		// Mobile viewports for responsive testing
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
		},
		
		{
			name: "Mobile Safari",
			use: { ...devices["iPhone 12"] },
		},
	],
	
	// Web server configuration
	webServer: [
		{
			// Frontend development server
			command: "npm run dev:client",
			url: "http://localhost:5173",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000, // 2 minutes for startup
		},
		{
			// Backend API server
			command: "npm run dev:api",
			url: "http://localhost:3000/docs",
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000, // 2 minutes for startup
		}
	],
	
	// Output directories
	outputDir: "tests-e2e-results/",
	
	// Expect settings
	expect: {
		// Screenshot comparison threshold
		threshold: 0.2,
		// Animation handling
		toHaveScreenshot: { 
			animations: "disabled",
			caret: "hide"
		},
		// Page screenshot options
		toMatchSnapshot: { 
			animations: "disabled",
			caret: "hide"
		}
	},
});