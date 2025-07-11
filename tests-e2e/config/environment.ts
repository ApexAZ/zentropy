/**
 * Environment Configuration for Zentropy E2E Tests
 * 
 * Centralizes all environment-specific settings and URLs
 */

export const config = {
	// Base URLs
	frontend: {
		baseUrl: process.env.E2E_FRONTEND_URL || "http://localhost:5173",
		timeout: 30000,
	},
	
	backend: {
		baseUrl: process.env.E2E_BACKEND_URL || "http://localhost:3000",
		apiPrefix: "/api/v1",
		timeout: 10000,
	},
	
	// Email testing
	mailpit: {
		baseUrl: process.env.E2E_MAILPIT_URL || "http://localhost:8025",
		apiUrl: process.env.E2E_MAILPIT_URL || "http://localhost:8025/api/v1",
		timeout: 5000,
	},
	
	// Database
	database: {
		// E2E tests use the same database as development
		// but with strict cleanup procedures
		cleanup: true,
		timeout: 5000,
	},
	
	// Test user configuration
	testUsers: {
		// Patterns for test email addresses
		emailPatterns: {
			local: "testlocal+{id}@zentropy.test",
			google: "testgoogle+{id}@gmail.com",
			victim: "testvictim+{id}@zentropy.test",
			e2e: "e2e+test+{id}@zentropy.test",
		},
		
		// Default test passwords
		defaultPassword: "TestPassword123!",
		wrongPassword: "WrongPassword123!",
		
		// Test user data
		defaultUser: {
			firstName: "Test",
			lastName: "User",
		},
	},
	
	// OAuth configuration
	oauth: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "test-google-client-id",
			// For E2E tests, we'll use mock OAuth or sandbox accounts
			mockMode: process.env.E2E_MOCK_OAUTH === "true",
		},
	},
	
	// Test timeouts
	timeouts: {
		navigation: 30000,
		action: 10000,
		assertion: 5000,
		emailVerification: 15000,
		oauthFlow: 30000,
	},
	
	// Retry configuration
	retries: {
		flaky: 2, // For flaky network operations
		oauth: 3, // OAuth flows can be unstable
		email: 2, // Email delivery can be delayed
	},
} as const;

/**
 * Generate a unique test email address
 */
export function generateTestEmail(type: keyof typeof config.testUsers.emailPatterns, id?: string): string {
	const timestamp = Date.now();
	const uniqueId = id || `${timestamp}`;
	return config.testUsers.emailPatterns[type].replace("{id}", uniqueId);
}

/**
 * Get a full API URL
 */
export function getApiUrl(endpoint: string): string {
	return `${config.backend.baseUrl}${config.backend.apiPrefix}${endpoint}`;
}

/**
 * Get a full frontend URL
 */
export function getFrontendUrl(path: string = ""): string {
	return `${config.frontend.baseUrl}${path}`;
}

/**
 * Get environment-specific configuration
 */
export function isCI(): boolean {
	return !!process.env.CI;
}

export function isDevelopment(): boolean {
	return !process.env.CI && process.env.NODE_ENV !== "production";
}