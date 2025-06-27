import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs/promises";
import express from "express";

/**
 * Test constants for consistent integration testing
 */
const TEST_CONFIG = {
	PATHS: {
		PUBLIC_DIR: path.join(__dirname, "../../../dist/public"),
		TEAMS_HTML: "teams.html",
		CALENDAR_HTML: "calendar.html",
		CSS_FILE: "styles.css"
	},
	HTTP_STATUS: {
		OK: 200,
		NOT_FOUND: 404
	},
	CONTENT_TYPES: {
		HTML: "text/html",
		CSS: "text/css"
	},
	SECURITY: {
		TRAVERSAL_PATHS: ["/../../package.json", "/../../../etc/passwd", "/..\\..\\package.json"]
	}
} as const;

/**
 * Create test Express app with static file serving
 */
function createTestApp() {
	const app = express();

	// Disable x-powered-by header for security
	app.disable("x-powered-by");

	// Serve static files from dist/public (same as production server)
	app.use(express.static(TEST_CONFIG.PATHS.PUBLIC_DIR));

	return app;
}

/**
 * Test content factories for consistent test data
 */
class TestFileManager {
	/**
	 * Check if required static files exist
	 */
	static async validateRequiredFiles(): Promise<void> {
		const requiredFiles = [
			TEST_CONFIG.PATHS.TEAMS_HTML,
			TEST_CONFIG.PATHS.CALENDAR_HTML,
			TEST_CONFIG.PATHS.CSS_FILE
		];

		for (const file of requiredFiles) {
			const filePath = path.join(TEST_CONFIG.PATHS.PUBLIC_DIR, file);
			try {
				await fs.access(filePath);
			} catch (error) {
				throw new Error(`Required static file not found: ${filePath}`);
			}
		}
	}

	/**
	 * Get expected content for HTML files
	 */
	static getExpectedHtmlContent(): Record<string, string[]> {
		return {
			teams: ["Teams", "html", "DOCTYPE"],
			calendar: ["Calendar", "html", "DOCTYPE"]
		};
	}

	/**
	 * Get expected CSS content patterns
	 */
	static getExpectedCssPatterns(): string[] {
		return ["body", "font-family", "margin"];
	}
}

/**
 * HTTP request assertion helpers
 */
class HttpAssertions {
	static async expectSuccessfulResponse(
		app: express.Application,
		url: string,
		expectedContentType: string,
		expectedContent: string[]
	): Promise<void> {
		const response = await request(app).get(url).expect(TEST_CONFIG.HTTP_STATUS.OK);

		expect(response.headers["content-type"]).toContain(expectedContentType);

		expectedContent.forEach(content => {
			expect(response.text).toContain(content);
		});
	}

	static async expectNotFoundResponse(app: express.Application, url: string): Promise<void> {
		await request(app).get(url).expect(TEST_CONFIG.HTTP_STATUS.NOT_FOUND);
	}

	static async expectSecurityBlocked(app: express.Application, paths: readonly string[]): Promise<void> {
		const requests = paths.map(path => HttpAssertions.expectNotFoundResponse(app, path));
		await Promise.all(requests);
	}
}

describe("Server Static File Serving Integration", () => {
	const app = createTestApp();

	describe("Static file serving capabilities", () => {
		it("should serve teams HTML with correct content and headers", async () => {
			const expectedContent = TestFileManager.getExpectedHtmlContent().teams;

			await HttpAssertions.expectSuccessfulResponse(
				app,
				`/${TEST_CONFIG.PATHS.TEAMS_HTML}`,
				TEST_CONFIG.CONTENT_TYPES.HTML,
				expectedContent
			);
		});

		it("should serve calendar HTML with correct content and headers", async () => {
			const expectedContent = TestFileManager.getExpectedHtmlContent().calendar;

			await HttpAssertions.expectSuccessfulResponse(
				app,
				`/${TEST_CONFIG.PATHS.CALENDAR_HTML}`,
				TEST_CONFIG.CONTENT_TYPES.HTML,
				expectedContent
			);
		});

		it("should serve CSS files with correct content and headers", async () => {
			const expectedContent = TestFileManager.getExpectedCssPatterns();

			await HttpAssertions.expectSuccessfulResponse(
				app,
				`/${TEST_CONFIG.PATHS.CSS_FILE}`,
				TEST_CONFIG.CONTENT_TYPES.CSS,
				expectedContent
			);
		});

		it("should return 404 for non-existent files", async () => {
			await HttpAssertions.expectNotFoundResponse(app, "/nonexistent-file.html");
		});
	});

	describe("Security protections", () => {
		it("should prevent directory traversal attacks", async () => {
			await HttpAssertions.expectSecurityBlocked(app, TEST_CONFIG.SECURITY.TRAVERSAL_PATHS);
		});

		it("should not expose server implementation details in error responses", async () => {
			const response = await request(app).get("/nonexistent-file.html");

			// Should not be successful
			expect(response.status).toBe(TEST_CONFIG.HTTP_STATUS.NOT_FOUND);

			// Should not expose server implementation details
			expect(response.headers["x-powered-by"]).toBeUndefined();
		});
	});
});
