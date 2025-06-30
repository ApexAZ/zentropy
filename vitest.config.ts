import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		// Support TypeScript files in both src and tests directories
		include: ["src/**/*.{test,spec}.{js,ts,tsx}", "tests/**/*.{test,spec}.{js,ts,tsx}"]
	}
});
