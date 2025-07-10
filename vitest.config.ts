import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		// Only include React component tests
		include: ["src/client/**/*.{test,spec}.{js,ts,tsx}"],
		// Increase timeout for async operations
		testTimeout: 15000,
		// Suppress React act() warnings in test environment
		silent: false,
		logHeapUsage: false,
		// Standard configuration for React component tests
		pool: 'threads',
		maxConcurrency: 1,
		// Environment variables for tests
		env: {
			VITE_GOOGLE_CLIENT_ID: "test-google-client-id"
		}
	}
});
