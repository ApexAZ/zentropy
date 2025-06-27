import express, { Request, Response } from "express";
import path from "path";
import { testConnection } from "../database/connection";
import { TeamModel } from "../models/Team";
import { ValidationError } from "../utils/validation";
import { validateTeamInput } from "../utils/team-validation";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving - serve HTML, CSS, JS files from public directory
app.use(express.static(path.join(__dirname, "../public")));

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

// Team Management API endpoints
// GET /api/teams - Get all teams
app.get("/api/teams", async (_req: Request, res: Response) => {
	try {
		const teams = await TeamModel.findAll();
		res.json(teams);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching teams:", error);
		res.status(500).json({ 
			message: "Failed to fetch teams", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
});

// GET /api/teams/:id - Get team by ID
app.get("/api/teams/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}
		
		const team = await TeamModel.findById(id);
		
		if (!team) {
			res.status(404).json({ message: "Team not found" });
			return;
		}
		
		res.json(team);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching team:", error);
		res.status(500).json({ 
			message: "Failed to fetch team", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
});

// POST /api/teams - Create new team
app.post("/api/teams", async (req: Request, res: Response): Promise<void> => {
	try {
		// Validate input data
		const teamData = validateTeamInput(req.body);
		
		const newTeam = await TeamModel.create(teamData);
		res.status(201).json(newTeam);
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error creating team:", error);
		
		if (error instanceof ValidationError) {
			res.status(400).json({ 
				message: "Validation error", 
				field: error.field,
				details: error.message 
			});
			return;
		}
		
		res.status(500).json({ 
			message: "Failed to create team", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
});

// PUT /api/teams/:id - Update team
app.put("/api/teams/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}
		
		// Check if team exists
		const existingTeam = await TeamModel.findById(id);
		if (!existingTeam) {
			res.status(404).json({ message: "Team not found" });
			return;
		}
		
		// Validate input data
		const updateData = validateTeamInput(req.body, true);
		
		const updatedTeam = await TeamModel.update(id, updateData);
		if (!updatedTeam) {
			res.status(404).json({ message: "Team not found after update" });
			return;
		}
		
		res.json(updatedTeam);
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error updating team:", error);
		
		if (error instanceof ValidationError) {
			res.status(400).json({ 
				message: "Validation error", 
				field: error.field,
				details: error.message 
			});
			return;
		}
		
		res.status(500).json({ 
			message: "Failed to update team", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
});

// DELETE /api/teams/:id - Delete team
app.delete("/api/teams/:id", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}
		
		const deleted = await TeamModel.delete(id);
		if (!deleted) {
			res.status(404).json({ message: "Team not found" });
			return;
		}
		
		res.json({ message: "Team deleted successfully" });
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error deleting team:", error);
		res.status(500).json({ 
			message: "Failed to delete team", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
});

// GET /api/teams/:id/members - Get team members
app.get("/api/teams/:id/members", async (req: Request, res: Response): Promise<void> => {
	try {
		const { id } = req.params;
		if (!id) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}
		
		// Check if team exists
		const team = await TeamModel.findById(id);
		if (!team) {
			res.status(404).json({ message: "Team not found" });
			return;
		}
		
		const members = await TeamModel.getMembers(id);
		res.json(members);
		
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error fetching team members:", error);
		res.status(500).json({ 
			message: "Failed to fetch team members", 
			error: error instanceof Error ? error.message : "Unknown error" 
		});
	}
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
	try {
		// Test database connection on startup
		const dbConnected = await testConnection();
		if (!dbConnected) {
			// eslint-disable-next-line no-console
			console.warn("⚠️  Starting server without database connection");
		}

		app.listen(PORT, () => {
			// eslint-disable-next-line no-console
			console.log(`🚀 Server running on http://localhost:${PORT}`);
			// eslint-disable-next-line no-console
			console.log(`📊 Health check: http://localhost:${PORT}/health`);
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

void startServer();
