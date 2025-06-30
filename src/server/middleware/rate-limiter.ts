import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Rate limiting configuration for authentication endpoints
 *
 * Security considerations:
 * - Prevents brute force attacks on login endpoints
 * - Prevents password enumeration attacks
 * - Protects against automated credential stuffing
 * - Uses sliding window approach for fairness
 */

/**
 * Rate limiter for login attempts
 * - 5 attempts per 15 minutes per IP
 * - Aggressive rate limiting for authentication endpoints
 * - Helps prevent credential stuffing and brute force attacks
 */
export const loginRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // 5 attempts per window
	standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message: {
		error: "Too many login attempts",
		message: "Too many login attempts from this IP, please try again later",
		retryAfter: "15 minutes"
	},
	statusCode: 429,
	// Custom key generator to include both IP and email for more targeted limiting
	keyGenerator: (req: Request): string => {
		const body = req.body as { email?: string };
		const email = body.email ? body.email.toLowerCase().trim() : "";
		return `${req.ip}:${email}`;
	},
	// Count all requests to prevent both successful and failed login attempts
	skipSuccessfulRequests: false,
	// Count all requests that reach the handler
	skipFailedRequests: false,
	// Custom handler for rate limit exceeded
	handler: (_req: Request, res: Response): void => {
		res.status(429).json({
			error: "Too many login attempts",
			message: "Too many login attempts from this IP, please try again later",
			retryAfter: "15 minutes"
		});
	}
});

/**
 * Rate limiter for password update attempts
 * - 3 attempts per 30 minutes per IP
 * - More restrictive than login due to higher security impact
 * - Prevents automated password change attacks
 */
export const passwordUpdateRateLimit = rateLimit({
	windowMs: 30 * 60 * 1000, // 30 minutes
	max: 3, // 3 attempts per window
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		error: "Too many password update attempts",
		message: "Too many password update attempts from this IP, please try again later",
		retryAfter: "30 minutes"
	},
	statusCode: 429,
	// Include user ID in the key for per-user limiting
	keyGenerator: (req: Request): string => {
		const userId = req.params.id ?? "";
		return `${req.ip}:${userId}`;
	},
	skipSuccessfulRequests: false,
	skipFailedRequests: false,
	handler: (_req: Request, res: Response): void => {
		res.status(429).json({
			error: "Too many password update attempts",
			message: "Too many password update attempts from this IP, please try again later",
			retryAfter: "30 minutes"
		});
	}
});

/**
 * General API rate limiter for user endpoints
 * - 100 requests per 15 minutes per IP
 * - Prevents API abuse while allowing normal usage
 */
export const generalApiRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // 100 requests per window
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		error: "Too many requests",
		message: "Too many requests from this IP, please try again later",
		retryAfter: "15 minutes"
	},
	statusCode: 429,
	keyGenerator: (req: Request): string => req.ip ?? "unknown",
	handler: (_req: Request, res: Response): void => {
		res.status(429).json({
			error: "Too many requests",
			message: "Too many requests from this IP, please try again later",
			retryAfter: "15 minutes"
		});
	}
});

/**
 * Strict rate limiter for sensitive user creation
 * - 2 user creations per hour per IP
 * - Prevents automated account creation
 */
export const userCreationRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 2, // 2 user creations per hour
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		error: "Too many account creation attempts",
		message: "Too many account creation attempts from this IP, please try again later",
		retryAfter: "1 hour"
	},
	statusCode: 429,
	keyGenerator: (req: Request): string => req.ip ?? "unknown",
	skipSuccessfulRequests: false, // Count both successful and failed creation attempts
	skipFailedRequests: false,
	handler: (_req: Request, res: Response): void => {
		res.status(429).json({
			error: "Too many account creation attempts",
			message: "Too many account creation attempts from this IP, please try again later",
			retryAfter: "1 hour"
		});
	}
});
