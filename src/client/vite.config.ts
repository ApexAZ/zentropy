import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
	plugins: [react()],
	css: {
		postcss: {
			plugins: [tailwindcss()]
		}
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
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
				rewrite: path => path
			},
			"/health": {
				target: "http://localhost:3000",
				changeOrigin: true,
				secure: false,
				rewrite: path => path
			}
		}
	}
});
