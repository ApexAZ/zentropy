import express from 'express';
import { testConnection } from '../database/connection';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (_req, res) => {
	res.json({ 
		message: 'Capacity Planner API',
		version: '1.0.0',
		timestamp: new Date().toISOString()
	});
});

// Health check route
app.get('/health', async (_req, res) => {
	const dbConnected = await testConnection();
	res.json({
		status: 'ok',
		database: dbConnected ? 'connected' : 'disconnected',
		timestamp: new Date().toISOString()
	});
});

// Start server
async function startServer() {
	try {
		// Test database connection on startup
		const dbConnected = await testConnection();
		if (!dbConnected) {
			console.warn('⚠️  Starting server without database connection');
		}

		app.listen(PORT, () => {
			console.log(`🚀 Server running on http://localhost:${PORT}`);
			console.log(`📊 Health check: http://localhost:${PORT}/health`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

startServer();