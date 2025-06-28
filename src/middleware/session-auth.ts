/* eslint-disable @typescript-eslint/no-namespace */
import { Request, Response, NextFunction } from "express";
import { SessionModel, SessionWithUser } from "../models/Session";

// Extend Request interface to include user data
declare global {
	namespace Express {
		interface Request {
			user?: SessionWithUser["user"];
		}
	}
}

/**
 * Session authentication middleware
 * Validates session tokens and attaches user data to request
 */
const sessionAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	try {
		// Extract session token from cookies
		const sessionToken = extractSessionToken(req);

		if (!sessionToken) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// First check if session exists (regardless of user status)
		const session = await SessionModel.findByToken(sessionToken);

		if (!session) {
			res.status(401).json({ message: "Invalid or expired session" });
			return;
		}

		// Get session with user data (this will exclude inactive users)
		const sessionWithUser = await SessionModel.findByTokenWithUser(sessionToken);

		if (!sessionWithUser) {
			// Session exists but user is inactive
			res.status(401).json({ message: "User account is not active" });
			return;
		}

		// Update session activity timestamp
		await SessionModel.updateActivity(sessionToken);

		// Attach user data to request and response locals
		req.user = sessionWithUser.user;
		res.locals.user = sessionWithUser.user;

		next();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Session authentication error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

/**
 * Extract session token from request cookies
 */
function extractSessionToken(req: Request): string | null {
	const cookies = req.headers.cookie;

	if (!cookies) {
		return null;
	}

	// Parse cookies to find sessionToken
	const cookiePairs = cookies.split(";");

	for (const pair of cookiePairs) {
		const [name, value] = pair.trim().split("=");
		if (name === "sessionToken") {
			return value ?? null;
		}
	}

	return null;
}

export default sessionAuthMiddleware;
