/**
 * Environment configuration with validation and type safety
 */
import { config } from "dotenv";

// Load environment variables from .env file
config();

/**
 * Environment enumeration
 */
export const ENVIRONMENTS = {
	DEVELOPMENT: "development",
	TEST: "test",
	PRODUCTION: "production"
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

/**
 * Configuration interface
 */
export interface AppConfig {
	readonly environment: Environment;
	readonly port: number;
	readonly database: {
		readonly host: string;
		readonly port: number;
		readonly name: string;
		readonly user: string;
		readonly password: string;
		readonly ssl: boolean;
		readonly maxConnections: number;
	};
	readonly server: {
		readonly corsOrigins: string[];
		readonly rateLimitWindowMs: number;
		readonly rateLimitMaxRequests: number;
	};
	readonly logging: {
		readonly level: string;
		readonly enableConsole: boolean;
	};
}

/**
 * Get required environment variable
 */

/**
 * Get optional environment variable with default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
	return process.env[key] ?? defaultValue;
}

/**
 * Get environment variable as integer
 */
function getEnvAsInt(key: string, defaultValue: number): number {
	const value = process.env[key];
	if (!value) {
		return defaultValue;
	}

	const parsed = parseInt(value, 10);
	if (isNaN(parsed)) {
		throw new Error(`Environment variable ${key} must be a valid integer`);
	}
	return parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
	const value = process.env[key];
	if (!value) {
		return defaultValue;
	}

	return value.toLowerCase() === "true";
}

/**
 * Get current environment
 */
function getCurrentEnvironment(): Environment {
	const env = process.env.NODE_ENV ?? ENVIRONMENTS.DEVELOPMENT;

	if (!Object.values(ENVIRONMENTS).includes(env as Environment)) {
		throw new Error(`Invalid environment: ${env}. Must be one of: ${Object.values(ENVIRONMENTS).join(", ")}`);
	}

	return env as Environment;
}

/**
 * Application configuration
 */
export const appConfig: AppConfig = {
	environment: getCurrentEnvironment(),
	port: getEnvAsInt("PORT", 3000),
	database: {
		host: getOptionalEnv("DB_HOST", "localhost"),
		port: getEnvAsInt("DB_PORT", 5432),
		name: getOptionalEnv("DB_NAME", "capacity_planner"),
		user: getOptionalEnv("DB_USER", "postgres"),
		password: getOptionalEnv("DB_PASSWORD", "postgres"),
		ssl: getEnvAsBoolean("DB_SSL", false),
		maxConnections: getEnvAsInt("DB_MAX_CONNECTIONS", 10)
	},
	server: {
		corsOrigins: getOptionalEnv("CORS_ORIGINS", "http://localhost:3000").split(","),
		rateLimitWindowMs: getEnvAsInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000), // 15 minutes
		rateLimitMaxRequests: getEnvAsInt("RATE_LIMIT_MAX_REQUESTS", 100)
	},
	logging: {
		level: getOptionalEnv("LOG_LEVEL", "info"),
		enableConsole: getEnvAsBoolean("LOG_CONSOLE", true)
	}
};

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
	return appConfig.environment === ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
	return appConfig.environment === ENVIRONMENTS.TEST;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
	return appConfig.environment === ENVIRONMENTS.PRODUCTION;
}
