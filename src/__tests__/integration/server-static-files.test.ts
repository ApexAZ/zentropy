import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';

/**
 * Test constants for consistent integration testing
 */
const TEST_CONFIG = {
	BASE_URL: 'http://localhost:3000',
	PATHS: {
		PUBLIC_DIR: path.join(__dirname, '../../src/public'),
		TEAMS_HTML: 'teams.html',
		CALENDAR_HTML: 'calendar.html',
		CSS_FILE: 'styles.css'
	},
	HTTP_STATUS: {
		OK: 200,
		NOT_FOUND: 404
	},
	CONTENT_TYPES: {
		HTML: 'text/html',
		CSS: 'text/css'
	},
	SECURITY: {
		TRAVERSAL_PATHS: ['/../../package.json', '/../../../etc/passwd', '/..\\..\\package.json']
	}
} as const;

/**
 * Test content factories for consistent test data
 */
class TestContentFactory {
	static createTestHtml(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Team Management - Capacity Planner</title>
	<link rel="stylesheet" href="/styles.css">
</head>
<body>
	<div class="container">
		<h2>Team Management</h2>
		<p>Test HTML content served by Express</p>
	</div>
</body>
</html>`;
	}

	static createTestCss(): string {
		return `body {
	font-family: Arial, sans-serif;
	margin: 0;
	padding: 20px;
}
h1 {
	color: #333;
}`;
	}
}

/**
 * Test file management utilities
 */
class TestFileManager {
	private publicDir: string;
	private htmlFile: string;
	private cssFile: string;

	constructor() {
		this.publicDir = TEST_CONFIG.PATHS.PUBLIC_DIR;
		this.htmlFile = path.join(this.publicDir, TEST_CONFIG.PATHS.TEAMS_HTML);
		this.cssFile = path.join(this.publicDir, TEST_CONFIG.PATHS.CSS_FILE);
	}

	async setup(): Promise<void> {
		await fs.mkdir(this.publicDir, { recursive: true });
		await Promise.all([
			fs.writeFile(this.htmlFile, TestContentFactory.createTestHtml()),
			fs.writeFile(this.cssFile, TestContentFactory.createTestCss())
		]);
	}

	async cleanup(): Promise<void> {
		try {
			await Promise.all([
				fs.unlink(this.htmlFile),
				fs.unlink(this.cssFile)
			]);
			await fs.rmdir(this.publicDir);
		} catch (error) {
			// Ignore cleanup errors in tests
		}
	}
}

/**
 * HTTP request assertion helpers
 */
class HttpAssertions {
	static async expectSuccessfulResponse(
		url: string, 
		expectedContentType: string,
		expectedContent: string[]
	): Promise<void> {
		const response = await request(TEST_CONFIG.BASE_URL)
			.get(url)
			.expect(TEST_CONFIG.HTTP_STATUS.OK);

		expect(response.headers['content-type']).toContain(expectedContentType);
		
		expectedContent.forEach(content => {
			expect(response.text).toContain(content);
		});
	}

	static async expectNotFoundResponse(url: string): Promise<void> {
		await request(TEST_CONFIG.BASE_URL)
			.get(url)
			.expect(TEST_CONFIG.HTTP_STATUS.NOT_FOUND);
	}

	static async expectSecurityBlocked(paths: readonly string[]): Promise<void> {
		const requests = paths.map(path => 
			HttpAssertions.expectNotFoundResponse(path)
		);
		await Promise.all(requests);
	}
}

describe('Server Static File Serving Integration', () => {
	describe('Static file serving capabilities', () => {
		it('should serve teams HTML with correct content and headers', async () => {
			const response = await request(TEST_CONFIG.BASE_URL)
				.get(`/${TEST_CONFIG.PATHS.TEAMS_HTML}`)
				.expect(TEST_CONFIG.HTTP_STATUS.OK);

			expect(response.headers['content-type']).toContain(TEST_CONFIG.CONTENT_TYPES.HTML);
			expect(response.text).toContain('<title>Team Management - Capacity Planner</title>');
			expect(response.text).toContain('<h2>Team Management</h2>');
		});

		it('should serve calendar HTML with correct content and headers', async () => {
			const response = await request(TEST_CONFIG.BASE_URL)
				.get(`/${TEST_CONFIG.PATHS.CALENDAR_HTML}`)
				.expect(TEST_CONFIG.HTTP_STATUS.OK);

			expect(response.headers['content-type']).toContain(TEST_CONFIG.CONTENT_TYPES.HTML);
			expect(response.text).toContain('<title>Team Calendar - Capacity Planning</title>');
			expect(response.text).toContain('Calendar');
		});

		it('should serve CSS files with correct content and headers', async () => {
			const response = await request(TEST_CONFIG.BASE_URL)
				.get(`/${TEST_CONFIG.PATHS.CSS_FILE}`)
				.expect(TEST_CONFIG.HTTP_STATUS.OK);

			expect(response.headers['content-type']).toContain(TEST_CONFIG.CONTENT_TYPES.CSS);
			expect(response.text).toContain('--primary-blue:');
			expect(response.text).toContain('font-family:');
		});

		it('should return 404 for non-existent files', async () => {
			await HttpAssertions.expectNotFoundResponse('/non-existent-file.html');
		});
	});

	describe('Security protections', () => {
		it('should prevent directory traversal attacks', async () => {
			await HttpAssertions.expectSecurityBlocked(TEST_CONFIG.SECURITY.TRAVERSAL_PATHS);
		});

		it('should not expose server implementation details in error responses', async () => {
			const response = await request(TEST_CONFIG.BASE_URL)
				.get('/non-existent.html')
				.expect(TEST_CONFIG.HTTP_STATUS.NOT_FOUND);

			// Should not expose internal paths or server details
			const sensitivePaths = ['node_modules', 'express', 'dist/', 'src/'];
			sensitivePaths.forEach(path => {
				expect(response.text).not.toContain(path);
			});
		});
	});
});