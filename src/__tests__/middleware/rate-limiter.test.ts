import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express, { Request, Response } from "express";
import {
	loginRateLimit,
	passwordUpdateRateLimit,
	generalApiRateLimit,
	userCreationRateLimit
} from "../../middleware/rate-limiter";

describe("Rate Limiter Middleware", () => {
	let app: express.Application;

	beforeEach(() => {
		app = express();
		app.use(express.json());

		// Test routes that mirror actual usage
		app.post("/test/login", loginRateLimit, (req: Request, res: Response): void => {
			const body = req.body as { email?: string };
			if (!body.email) {
				res.status(400).json({ message: "Email required" });
				return;
			}
			res.json({ success: true, email: body.email });
		});

		app.put("/test/users/:id/password", passwordUpdateRateLimit, (req: Request, res: Response) => {
			res.json({ success: true, userId: req.params.id });
		});

		app.post("/test/users", userCreationRateLimit, (_req: Request, res: Response) => {
			res.status(201).json({ success: true });
		});

		app.get("/test/general", generalApiRateLimit, (_req: Request, res: Response) => {
			res.json({ success: true });
		});
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe("loginRateLimit", () => {
		test("should allow requests within rate limit", async () => {
			const email = "test@example.com";

			// Should allow up to 5 requests
			for (let i = 0; i < 5; i++) {
				const response = await request(app)
					.post("/test/login")
					.send({ email })
					.set("X-Forwarded-For", "127.0.0.1");

				expect(response.status).toBe(200);
				expect((response.body as { success: boolean }).success).toBe(true);
			}
		});

		test("should rate limit after 5 failed login attempts", async () => {
			const email = "test@example.com";

			// Make 5 requests (at the limit)
			for (let i = 0; i < 5; i++) {
				await request(app).post("/test/login").send({ email }).set("X-Forwarded-For", "127.0.0.1");
			}

			// 6th request should be rate limited
			const response = await request(app).post("/test/login").send({ email }).set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(429);
			expect((response.body as { error: string }).error).toBe("Too many login attempts");
		});

		test("should use IP+email combination for rate limiting", async () => {
			// Different emails from same IP should be allowed
			await request(app)
				.post("/test/login")
				.send({ email: "user1@example.com" })
				.set("X-Forwarded-For", "127.0.0.1");

			const response = await request(app)
				.post("/test/login")
				.send({ email: "user2@example.com" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(200);
		});

		test("should include rate limit headers", async () => {
			const response = await request(app)
				.post("/test/login")
				.send({ email: "test@example.com" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.headers["ratelimit-limit"]).toBeDefined();
			expect(response.headers["ratelimit-remaining"]).toBeDefined();
			expect(response.headers["ratelimit-reset"]).toBeDefined();
		});
	});

	describe("passwordUpdateRateLimit", () => {
		test("should allow requests within rate limit", async () => {
			const userId = "test-user-id";

			// Should allow up to 3 requests
			for (let i = 0; i < 3; i++) {
				const response = await request(app)
					.put(`/test/users/${userId}/password`)
					.send({ currentPassword: "old", newPassword: "new" })
					.set("X-Forwarded-For", "127.0.0.1");

				expect(response.status).toBe(200);
				expect((response.body as { success: boolean }).success).toBe(true);
			}
		});

		test("should rate limit after 3 password update attempts", async () => {
			const userId = "test-user-id";

			// Make 3 requests (at the limit)
			for (let i = 0; i < 3; i++) {
				await request(app)
					.put(`/test/users/${userId}/password`)
					.send({ currentPassword: "old", newPassword: "new" })
					.set("X-Forwarded-For", "127.0.0.1");
			}

			// 4th request should be rate limited
			const response = await request(app)
				.put(`/test/users/${userId}/password`)
				.send({ currentPassword: "old", newPassword: "new" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(429);
			expect((response.body as { error: string }).error).toBe("Too many password update attempts");
		});

		test("should use IP+userId combination for rate limiting", async () => {
			// Different users from same IP should be allowed
			await request(app)
				.put("/test/users/user1/password")
				.send({ currentPassword: "old", newPassword: "new" })
				.set("X-Forwarded-For", "127.0.0.1");

			const response = await request(app)
				.put("/test/users/user2/password")
				.send({ currentPassword: "old", newPassword: "new" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(200);
		});
	});

	describe("userCreationRateLimit", () => {
		test("should allow requests within rate limit", async () => {
			// Should allow up to 2 requests
			for (let i = 0; i < 2; i++) {
				const response = await request(app)
					.post("/test/users")
					.send({ email: `user${i}@example.com`, password: "password" })
					.set("X-Forwarded-For", "127.0.0.1");

				expect(response.status).toBe(201);
				expect((response.body as { success: boolean }).success).toBe(true);
			}
		});

		test("should rate limit after 2 user creation attempts", async () => {
			// Make 2 requests (at the limit)
			for (let i = 0; i < 2; i++) {
				await request(app)
					.post("/test/users")
					.send({ email: `user${i}@example.com`, password: "password" })
					.set("X-Forwarded-For", "127.0.0.1");
			}

			// 3rd request should be rate limited
			const response = await request(app)
				.post("/test/users")
				.send({ email: "user3@example.com", password: "password" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(429);
			expect((response.body as { error: string }).error).toBe("Too many account creation attempts");
		});
	});

	describe("generalApiRateLimit", () => {
		test("should allow many requests within rate limit", async () => {
			// Should allow up to 100 requests - test first 10
			for (let i = 0; i < 10; i++) {
				const response = await request(app).get("/test/general").set("X-Forwarded-For", "127.0.0.1");

				expect(response.status).toBe(200);
				expect((response.body as { success: boolean }).success).toBe(true);
			}
		});

		test("should have appropriate rate limit headers", async () => {
			const response = await request(app).get("/test/general").set("X-Forwarded-For", "127.0.0.1");

			expect(response.headers["ratelimit-limit"]).toBe("100");
			expect(parseInt(response.headers["ratelimit-remaining"] ?? "0")).toBeLessThan(100);
		});
	});

	describe("Rate limit message format", () => {
		test("should return consistent error format for rate limited requests", async () => {
			// Exhaust login rate limit
			for (let i = 0; i < 5; i++) {
				await request(app)
					.post("/test/login")
					.send({ email: "test@example.com" })
					.set("X-Forwarded-For", "127.0.0.1");
			}

			const response = await request(app)
				.post("/test/login")
				.send({ email: "test@example.com" })
				.set("X-Forwarded-For", "127.0.0.1");

			expect(response.status).toBe(429);
			expect(response.body).toHaveProperty("error");
			expect(response.body).toHaveProperty("message");
			expect(response.body).toHaveProperty("retryAfter");
			expect((response.body as { retryAfter: string }).retryAfter).toBe("15 minutes");
		});
	});

	describe("IP address handling", () => {
		test("should handle different IP addresses independently", async () => {
			// Use fresh app instance to avoid rate limit conflicts
			const freshApp = express();
			freshApp.use(express.json());
			freshApp.post("/test/login", loginRateLimit, (req: Request, res: Response): void => {
				const body = req.body as { email?: string };
				if (!body.email) {
					res.status(400).json({ message: "Email required" });
					return;
				}
				res.json({ success: true, email: body.email });
			});

			// Make requests from different IPs - should not interfere with each other
			const response1 = await request(freshApp)
				.post("/test/login")
				.send({ email: "different1@example.com" })
				.set("X-Forwarded-For", "192.168.1.1");

			const response2 = await request(freshApp)
				.post("/test/login")
				.send({ email: "different2@example.com" })
				.set("X-Forwarded-For", "192.168.1.2");

			expect(response1.status).toBe(200);
			expect(response2.status).toBe(200);
		});

		test("should handle missing IP address gracefully", async () => {
			// Use fresh app instance to avoid rate limit conflicts
			const freshApp = express();
			freshApp.use(express.json());
			freshApp.post("/test/login", loginRateLimit, (req: Request, res: Response): void => {
				const body = req.body as { email?: string };
				if (!body.email) {
					res.status(400).json({ message: "Email required" });
					return;
				}
				res.json({ success: true, email: body.email });
			});

			const response = await request(freshApp).post("/test/login").send({ email: "unique@example.com" });

			expect(response.status).toBe(200);
		});
	});
});
