import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Database configuration
const dbConfig: PoolConfig = {
	host: process.env.DB_HOST ?? "localhost",
	port: parseInt(process.env.DB_PORT ?? "5432"),
	database: process.env.DB_NAME ?? "zentropy",
	user: process.env.DB_USER ?? "dev_user",
	password: process.env.DB_PASSWORD ?? "dev_password",
	max: 20, // Maximum number of connections in the pool
	idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
	connectionTimeoutMillis: 2000 // Return error after 2 seconds if connection fails
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test database connection
export async function testConnection(): Promise<boolean> {
	try {
		const client = await pool.connect();
		await client.query("SELECT NOW()");
		client.release();
		// eslint-disable-next-line no-console
		console.log("✅ Database connection successful");
		return true;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("❌ Database connection failed:", error);
		return false;
	}
}

// Graceful shutdown
export async function closePool(): Promise<void> {
	await pool.end();
	// eslint-disable-next-line no-console
	console.log("Database connection pool closed");
}

// Handle process termination
process.on("SIGINT", () => {
	void (async (): Promise<void> => {
		await closePool();
		process.exit(0);
	})();
});

process.on("SIGTERM", () => {
	void (async (): Promise<void> => {
		await closePool();
		process.exit(0);
	})();
});
