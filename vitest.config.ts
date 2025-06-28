import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Support TypeScript files in both src and tests directories
		include: ["src/**/*.{test,spec}.{js,ts}", "tests/**/*.{test,spec}.{js,ts}"]
	}
});
