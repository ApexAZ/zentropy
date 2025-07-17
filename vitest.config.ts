import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		typecheck: {
			tsconfig: './tsconfig.test.json'
		},
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		// Only include React component tests
		include: ["src/client/**/*.{test,spec}.{js,ts,tsx}"],
		// Aggressive timeout for fast failure detection
		testTimeout: 300,
		// Suppress React act() warnings in test environment
		silent: false,
		logHeapUsage: false,
		// Standard configuration for React component tests
		pool: 'threads',
		maxConcurrency: 5,
		// Environment variables for tests
		env: {
			VITE_GOOGLE_CLIENT_ID: "test-google-client-id"
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'clover', 'json'],
			reportsDirectory: './coverage',
			exclude: [
				'node_modules/',
				'src/test-setup.ts',
				'**/*.d.ts',
				'**/*.config.{js,ts,cjs}',
				'**/dist/**',
				'**/coverage/**',
				'**/htmlcov/**',
				'scripts/**',
				'tests-e2e/**', // E2E tests not part of unit test coverage
				'src/client/main.tsx', // Entry point - not testable
				'src/client/types/index.ts' // Type definitions - no executable code
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80
				}
			},
			all: true,
			skipFull: false
		}
	}
});
