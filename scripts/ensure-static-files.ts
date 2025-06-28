#!/usr/bin/env node

/**
 * Ensures static files are copied to dist/public after TypeScript builds
 * This prevents static files from being deleted during development
 */

/* eslint-disable no-console */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const srcPublic = path.join(__dirname, "../src/public");
const distPublic = path.join(__dirname, "../dist/public");

console.log("Checking static files...");

// Check if src/public exists
if (!fs.existsSync(srcPublic)) {
	console.log("No src/public directory found, skipping static file copy");
	process.exit(0);
}

// Create dist/public if it doesn't exist
if (!fs.existsSync(distPublic)) {
	console.log("Creating dist/public directory...");
	fs.mkdirSync(distPublic, { recursive: true });
}

// Get list of files in src/public
const srcFiles = fs.readdirSync(srcPublic);
const distFiles = fs.existsSync(distPublic) ? fs.readdirSync(distPublic) : [];

// Check if any files are missing
const missingFiles = srcFiles.filter((file: string) => !distFiles.includes(file));

if (missingFiles.length > 0) {
	console.log(`Missing static files detected: ${missingFiles.join(", ")}`);
	console.log("Copying static files...");

	try {
		execSync("npm run copy-static", { stdio: "inherit" });
		console.log("✅ Static files copied successfully");
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		console.error("❌ Failed to copy static files:", errorMessage);
		process.exit(1);
	}
} else {
	console.log("✅ All static files are present");
}
