import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
		// Only include React component tests
		include: ["src/client/**/*.{test,spec}.{js,ts,tsx}"]
	}
});
