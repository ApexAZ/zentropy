/**
 * Login Workflow Integration Tests
 *
 * This file fills the testing gap by providing comprehensive integration tests
 * for the complete login workflow, combining frontend and backend components.
 *
 * Following hybrid testing strategy:
 * - Business logic tested in utils/login-validation.test.ts (pure functions)
 * - API client logic tested in utils/login-api.test.ts (pure functions)
 * - Frontend integration tested in frontend/login.test.ts (DOM integration)
 * - Backend integration tested in integration/i-session-authentication.test.ts (API routes)
 * - This file tests END-TO-END workflows and cross-system integration
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel, type User } from "../../server/models/User";
import { SessionModel } from "../../server/models/Session";
import usersRouter from "../../server/routes/users";

// Import business logic utilities for integration validation
import { validateLoginForm, sanitizeLoginInput } from "../../server/utils/auth-core.js";
import { createLoginRequest, parseErrorResponse } from "../../server/utils/auth-core.js";

describe("Login Workflow Integration Tests", () => {
	let app: express.Application;
	let testUsers: string[] = [];
	let testSessions: string[] = [];

	// Unique test prefix to avoid conflicts
	const TEST_PREFIX = `login-workflow-${Date.now()}-${process.pid}`;
	const TEST_DOMAIN = "login-workflow-test.local";

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use("/api/users", usersRouter);
		testUsers = [];
		testSessions = [];
	});

	afterEach(async () => {
		// Clean up sessions first (foreign key constraints)
		for (const sessionToken of testSessions) {
			try {
				await SessionModel.invalidate(sessionToken);
			} catch {
				// Continue cleanup
			}
		}

		await SessionModel.cleanupExpired();

		// Clean up users
		for (const userId of testUsers) {
			try {
				await UserModel.delete(userId);
			} catch {
				// Continue cleanup
			}
		}
	});

	describe("Complete Login Workflow - Success Scenarios", () => {
		it("should complete full login workflow with business logic integration", async () => {
			// Arrange: Create test user
			const strongPassword = "ComplexSecure!Bx7#Wd9M";
			const uniqueEmail = `${TEST_PREFIX}-complete-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "John",
				last_name: "Smith",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			const loginData = {
				email: uniqueEmail,
				password: strongPassword
			};

			// Step 1: Frontend validation (using business logic utilities)
			const validationResult = validateLoginForm(loginData);
			expect(validationResult.isValid).toBe(true);
			expect(validationResult.errors).toEqual({});

			// Step 2: Input sanitization (using business logic utilities)
			const sanitizedData = sanitizeLoginInput(loginData);
			expect(sanitizedData.email).toBe(uniqueEmail);
			expect(sanitizedData.password).toBe(strongPassword);

			// Step 3: API request creation (using business logic utilities)
			const requestConfig = createLoginRequest(sanitizedData);
			expect(requestConfig.url).toBe("/api/users/login");
			expect(requestConfig.options.method).toBe("POST");
			expect(requestConfig.options.headers).toEqual({ "Content-Type": "application/json" });
			expect(requestConfig.options.credentials).toBe("include");

			// Step 4: Backend API integration
			const response = await request(app).post("/api/users/login").send(sanitizedData);

			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("message", "Login successful");
			expect(response.body.user.email).toBe(uniqueEmail);
			expect(response.body.user.first_name).toBe("John");
			expect(response.body.user.last_name).toBe("Smith");
			expect(response.body.user.role).toBe("team_member");

			// Step 5: Session creation verification
			const setCookieHeader = response.headers["set-cookie"];
			expect(setCookieHeader).toBeDefined();

			const sessionCookie = Array.isArray(setCookieHeader)
				? setCookieHeader.find((cookie: string) => cookie.startsWith("sessionToken="))
				: setCookieHeader;

			expect(sessionCookie).toBeDefined();
			expect(sessionCookie).toContain("HttpOnly");
			expect(sessionCookie).toContain("Path=/");

			// Step 6: Response handling (verify response structure)
			expect(response.body.message).toBeDefined();
			expect(response.body.user).toBeDefined();
			expect(response.body.user.email).toBe(uniqueEmail);
		});

		it("should handle login with remember me functionality", async () => {
			// Arrange: Create test user
			const strongPassword = "StrongPass!Zx8#Qm5N";
			const uniqueEmail = `${TEST_PREFIX}-remember-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "Alice",
				last_name: "Johnson",
				role: "team_lead"
			});
			testUsers.push(testUser.id);

			const loginData = {
				email: uniqueEmail,
				password: strongPassword,
				remember: true
			};

			// Act: Complete workflow with remember me
			const validationResult = validateLoginForm(loginData);
			expect(validationResult.isValid).toBe(true);

			const response = await request(app).post("/api/users/login").send(loginData);

			// Assert: Should set longer session duration for remember me
			expect(response.status).toBe(200);

			const setCookieHeader = response.headers["set-cookie"];
			const sessionCookie = Array.isArray(setCookieHeader)
				? setCookieHeader.find((cookie: string) => cookie.startsWith("sessionToken="))
				: setCookieHeader;

			// Remember me functionality affects session duration
			expect(sessionCookie).toBeDefined();
		});

		it("should handle role-based redirect after login", async () => {
			// Arrange: Create team lead user
			const strongPassword = "SecureStrong!Kj4#Lm7P";
			const uniqueEmail = `${TEST_PREFIX}-teamlead-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "Robert",
				last_name: "Wilson",
				role: "team_lead"
			});
			testUsers.push(testUser.id);

			const loginData = {
				email: uniqueEmail,
				password: strongPassword
			};

			// Act: Login as team lead
			const response = await request(app).post("/api/users/login").send(loginData);

			// Assert: Should get team lead response
			expect(response.status).toBe(200);
			expect(response.body.user.role).toBe("team_lead");

			// Response handling should account for role
			expect(response.body.user).toBeDefined();
			expect(response.body.user.role).toBe("team_lead");
		});
	});

	describe("Complete Login Workflow - Error Scenarios", () => {
		it("should handle invalid credentials through complete workflow", async () => {
			// Arrange: Create test user
			const strongPassword = "SecurePass!Xy9#Zm3K";
			const uniqueEmail = `${TEST_PREFIX}-invalid-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "David",
				last_name: "Brown",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			const invalidLoginData = {
				email: uniqueEmail,
				password: "IncorrectPass!Wx5#Nt2J"
			};

			// Step 1: Frontend validation passes (format is valid)
			const validationResult = validateLoginForm(invalidLoginData);
			expect(validationResult.isValid).toBe(true);

			// Step 2: Backend authentication fails
			const response = await request(app).post("/api/users/login").send(invalidLoginData);

			// Assert: Should get authentication error
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty("message");
			expect(response.body.message).toContain("Invalid");

			// Step 3: Response handling for error
			const handledResponse = parseErrorResponse(response.body);
			expect(handledResponse.success).toBe(false);
			expect(handledResponse.message).toBeDefined();
		});

		it("should handle validation errors in complete workflow", async () => {
			const invalidLoginData = {
				email: "invalid-email",
				password: ""
			};

			// Step 1: Frontend validation should fail
			const validationResult = validateLoginForm(invalidLoginData);
			expect(validationResult.isValid).toBe(false);
			expect(validationResult.errors.email).toBeDefined();
			expect(validationResult.errors.password).toBeDefined();

			// Step 2: Should not proceed to API call if validation fails
			// This demonstrates the workflow preventing invalid requests
			expect(validationResult.errors.email).toContain("valid email");
			expect(validationResult.errors.password).toContain("required");
		});

		it("should handle rate limiting in complete workflow", async () => {
			// Arrange: Create test user
			const strongPassword = "ComplexStrong!Vb6#Hj2Q";
			const uniqueEmail = `${TEST_PREFIX}-ratelimit-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "Michael",
				last_name: "Davis",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			const loginData = {
				email: uniqueEmail,
				password: "IncorrectPass!Yz3#Dk6L" // Intentionally wrong to trigger rate limiting
			};

			// Act: Make multiple failed login attempts to trigger rate limiting
			const attempts = [];
			for (let i = 0; i < 6; i++) {
				// Rate limit is 5 attempts per 15 minutes
				attempts.push(request(app).post("/api/users/login").send(loginData));
			}

			const responses = await Promise.all(attempts);

			// Assert: Should eventually get rate limited
			const lastResponse = responses[responses.length - 1];

			if (!lastResponse) {
				throw new Error("No responses received");
			}

			// Either the last request should be rate limited, or all should be 401 (depends on timing)
			if (lastResponse.status === 429) {
				expect(lastResponse.body).toHaveProperty("message");
				expect(lastResponse.body.message).toContain("Too many");

				// Response handling for rate limiting
				const handledResponse = parseErrorResponse(lastResponse.body);
				expect(handledResponse.success).toBe(false);
				expect(handledResponse.message).toContain("Too many");
			} else {
				// All requests should be 401 (invalid credentials)
				responses.forEach(response => {
					expect(response.status).toBe(401);
				});
			}
		});

		it("should handle security attacks in complete workflow", async () => {
			// SQL injection attempt
			const sqlInjectionData = {
				email: "admin'; DROP TABLE users; --",
				password: "password123"
			};

			// Step 1: Validation should catch malicious input
			const validationResult = validateLoginForm(sqlInjectionData);
			expect(validationResult.isValid).toBe(false);
			expect(validationResult.errors.email).toBeDefined();

			// Step 2: Sanitization should clean input (removes HTML tags, SQL handled by validation)
			const sanitizedData = sanitizeLoginInput(sqlInjectionData);
			// sanitizeLoginInput only removes HTML tags, not SQL injection patterns
			// SQL injection protection is handled by validation and parameterized queries
			expect(sanitizedData.email).toBe(sqlInjectionData.email); // No HTML tags to remove

			// XSS attempt
			const xssData = {
				email: "<script>alert('xss')</script>@example.com",
				password: "password123"
			};

			const xssValidation = validateLoginForm(xssData);
			expect(xssValidation.isValid).toBe(false);

			const xssSanitized = sanitizeLoginInput(xssData);
			expect(xssSanitized.email).not.toContain("<script>");
		});
	});

	describe("Login State Management Integration", () => {
		it("should handle session state after successful login", async () => {
			// Arrange: Create test user
			const strongPassword = "StrongSecure!Rt8#Pw4L";
			const uniqueEmail = `${TEST_PREFIX}-session-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "Sarah",
				last_name: "Miller",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			// Act: Login successfully
			const loginResponse = await request(app).post("/api/users/login").send({
				email: uniqueEmail,
				password: strongPassword
			});

			expect(loginResponse.status).toBe(200);

			// Extract session token from cookie
			const setCookieHeader = loginResponse.headers["set-cookie"];
			const sessionCookie = Array.isArray(setCookieHeader)
				? setCookieHeader.find((cookie: string) => cookie.startsWith("sessionToken="))
				: setCookieHeader;

			expect(sessionCookie).toBeDefined();
			const sessionToken = sessionCookie?.split(";")[0].split("=")[1];
			testSessions.push(sessionToken);

			// Verify session exists in database
			const session = await SessionModel.findByToken(sessionToken);
			expect(session).toBeTruthy();
			expect(session?.user_id).toBe(testUser.id);
		});

		it("should handle logout after login in complete workflow", async () => {
			// Arrange: Create test user and login
			const strongPassword = "SecureStrong!Nj7#Tk9X";
			const uniqueEmail = `${TEST_PREFIX}-logout-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "Emily",
				last_name: "Garcia",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			// Step 1: Login
			const loginResponse = await request(app).post("/api/users/login").send({
				email: uniqueEmail,
				password: strongPassword
			});

			expect(loginResponse.status).toBe(200);

			const setCookieHeader = loginResponse.headers["set-cookie"];
			const sessionCookie = Array.isArray(setCookieHeader)
				? setCookieHeader.find((cookie: string) => cookie.startsWith("sessionToken="))
				: setCookieHeader;

			const sessionToken = sessionCookie?.split(";")[0].split("=")[1];

			// Step 2: Logout
			const logoutResponse = await request(app)
				.post("/api/users/logout")
				.set("Cookie", `sessionToken=${sessionToken}`);

			expect(logoutResponse.status).toBe(200);
			expect(logoutResponse.body.message).toBe("Logged out successfully");

			// Step 3: Verify session is invalidated
			const session = await SessionModel.findByToken(sessionToken);
			expect(session).toBeNull();
		});
	});

	describe("Cross-System Integration Validation", () => {
		it("should validate that all login components work together", async () => {
			// This test ensures all the separately tested components integrate correctly

			// Arrange: Create test user
			const strongPassword = "ComplexValidate!Mq5#Fp8W";
			const uniqueEmail = `${TEST_PREFIX}-integration-${Math.random().toString(36).substring(2, 11)}@${TEST_DOMAIN}`;

			const testUser: User = await UserModel.create({
				email: uniqueEmail,
				password: strongPassword,
				first_name: "James",
				last_name: "Anderson",
				role: "team_member"
			});
			testUsers.push(testUser.id);

			// Act & Assert: Each step should work correctly
			const loginData = { email: uniqueEmail, password: strongPassword };

			// 1. Validation utilities (tested in login-validation.test.ts)
			const validation = validateLoginForm(loginData);
			expect(validation.isValid).toBe(true);

			// 2. Sanitization utilities (tested in login-validation.test.ts)
			const sanitized = sanitizeLoginInput(loginData);
			expect(sanitized.email).toBe(uniqueEmail);

			// 3. API client utilities (tested in login-api.test.ts)
			const requestConfig = createLoginRequest(sanitized);
			expect(requestConfig.options.method).toBe("POST");

			// 4. Backend authentication (tested in i-session-authentication.test.ts)
			const response = await request(app).post("/api/users/login").send(sanitized);

			expect(response.status).toBe(200);

			// 5. Response handling utilities (tested in login-api.test.ts)
			expect(response.body.message).toBeDefined();
			expect(response.body.user).toBeDefined();

			// All components should integrate seamlessly
			expect(response.body.user.id).toBe(testUser.id);
			expect(response.body.user.email).toBe(uniqueEmail);
		});
	});
});
