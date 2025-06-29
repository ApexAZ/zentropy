import express, { Request, Response } from "express";
import path from "path";
import { testConnection } from "../database/connection";
// TESTING: Restore full original configuration
import calendarEntriesRouter from "../routes/calendar-entries";
import usersRouter from "../routes/users";
import teamsRouter from "../routes/teams";
import invitationsRouter from "../routes/invitations";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving - serve HTML, CSS, JS files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// API Routes - FULL ORIGINAL CONFIGURATION RESTORED
app.use("/api/calendar-entries", calendarEntriesRouter);
app.use("/api/users", usersRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/invitations", invitationsRouter);

// Basic route
app.get("/", (_req: Request, res: Response) => {
	res.json({
		message: "Capacity Planner API",
		version: "1.0.0",
		timestamp: new Date().toISOString()
	});
});

// Health check route
app.get("/health", async (_req: Request, res: Response) => {
	const dbConnected = await testConnection();
	res.json({
		status: "ok",
		database: dbConnected ? "connected" : "disconnected",
		timestamp: new Date().toISOString()
	});
});

// Legacy team configuration endpoints (for backwards compatibility)
app.post("/api/team/basic", (_req: Request, res: Response) => {
	res.status(410).json({
		message: "This endpoint is deprecated. Use POST /api/teams instead."
	});
});

app.post("/api/team/velocity", (_req: Request, res: Response) => {
	res.status(410).json({
		message: "This endpoint is deprecated. Use PUT /api/teams/:id instead."
	});
});

app.post("/api/team/members", (_req: Request, res: Response) => {
	res.status(410).json({
		message: "This endpoint is deprecated. Team member management coming soon."
	});
});

// Sprint endpoints (placeholder for future implementation)
app.post("/api/sprints", (_req: Request, res: Response) => {
	res.status(501).json({ message: "Sprint creation not yet implemented" });
});

app.post("/api/sprints/generate", (_req: Request, res: Response) => {
	res.status(501).json({ message: "Sprint generation not yet implemented" });
});

// Start server
async function startServer(): Promise<void> {
	const handleServerError = (error: NodeJS.ErrnoException): void => {
		if (error.code === "EADDRINUSE") {
			// eslint-disable-next-line no-console
			console.error(`Port ${PORT} is already in use`);
		} else if (error.code === "EACCES") {
			// eslint-disable-next-line no-console
			console.error(`Permission denied to bind to port ${PORT}`);
		} else {
			// eslint-disable-next-line no-console
			console.error("Server error:", error);
		}
		process.exit(1);
	};

	try {
		// Test database connection on startup
		const dbConnected = await testConnection();
		if (!dbConnected) {
			// eslint-disable-next-line no-console
			console.warn("⚠️  Starting server without database connection");
		} else {
			// eslint-disable-next-line no-console
			console.log("✅ Database connection successful");
		}

		// Configurable host binding for WSL2 compatibility
		const host = process.env.HOST;

		if (host) {
			// Bind to specific host if provided
			const server = app.listen(PORT, host, () => {
				// eslint-disable-next-line no-console
				console.log(`🚀 Server running on http://localhost:${PORT}`);
				// eslint-disable-next-line no-console
				console.log(`📊 Health check: http://localhost:${PORT}/health`);
				// eslint-disable-next-line no-console
				console.log(`🌐 Listening on: ${host}:${PORT}`);
			});

			server.on("error", handleServerError);
		} else {
			// Default binding (localhost)
			const server = app.listen(PORT, () => {
				// eslint-disable-next-line no-console
				console.log(`🚀 Server running on http://localhost:${PORT}`);
				// eslint-disable-next-line no-console
				console.log(`📊 Health check: http://localhost:${PORT}/health`);
			});

			server.on("error", handleServerError);
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

// Process-level error handlers to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
	// eslint-disable-next-line no-console
	console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", error => {
	// eslint-disable-next-line no-console
	console.error("Uncaught Exception:", error);
	process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
	// eslint-disable-next-line no-console
	console.log("SIGTERM received, shutting down gracefully");
	process.exit(0);
});

process.on("SIGINT", () => {
	// eslint-disable-next-line no-console
	console.log("SIGINT received, shutting down gracefully");
	process.exit(0);
});

void startServer();
