import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	root: "src/client",
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: "index.html"
		}
	},
	server: {
		port: 5173,
		proxy: {
			"/api": "http://localhost:3000",
			"/health": "http://localhost:3000"
		}
	}
});
