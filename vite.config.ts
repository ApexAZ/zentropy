import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
	plugins: [react()],
	root: "src/client",
	css: {
		postcss: {
			plugins: [tailwindcss()],
		},
	},
	build: {
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			input: "./index.html"
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
