import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { UserModel } from "../../models/User";
import { SessionModel } from "../../models/Session";
import { CalendarEntryModel } from "../../models/CalendarEntry";
import { TeamModel } from "../../models/Team";
import calendarEntriesRouter from "../../routes/calendar-entries";

// Integration test for protected calendar routes
describe("Protected Calendar Routes", () => {
	let app: express.Application;
	let testUser: any;
	let testSession: any;
	let testTeam: any;
	let testCalendarEntry: any;

	beforeEach(async () => {
		app = express();
		app.use(express.json());
		app.use("/api/calendar-entries", calendarEntriesRouter);

		// Create test user and session for authentication testing
		const strongPassword = "ComplexSecureP@ssw0rd2024!ZqX6";
		testUser = await UserModel.create({
			email: "calendar-protection-test@example.com",
			password: strongPassword,
			first_name: "Emily",
			last_name: "Martinez",
			role: "team_member"
		});

		testSession = await SessionModel.create({
			user_id: testUser.id,
			ip_address: "192.168.1.170",
			user_agent: "Test Browser Calendar Protection v1.0"
		});

		// Create a test team for calendar entries
		testTeam = await TeamModel.create({
			name: "Calendar Test Team",
			description: "Team for calendar testing",
			velocity_points_per_sprint: 40,
			sprint_length_weeks: 2,
			is_active: true
		});

		// Create a test calendar entry
		testCalendarEntry = await CalendarEntryModel.create({
			team_id: testTeam.id,
			user_id: testUser.id,
			entry_type: "pto",
			title: "Test PTO Entry",
			start_date: new Date("2024-07-01"),
			end_date: new Date("2024-07-05"),
			description: "Test vacation time",
			all_day: true
		});
	});

	afterEach(async () => {
		// Clean up test data
		if (testCalendarEntry) {
			await CalendarEntryModel.delete(testCalendarEntry.id);
		}
		if (testTeam) {
			await TeamModel.delete(testTeam.id);
		}
		if (testSession) {
			await SessionModel.invalidate(testSession.session_token);
		}
		if (testUser) {
			await UserModel.delete(testUser.id);
		}
		await SessionModel.cleanupExpired();
	});

	describe("Authenticated Access", () => {
		it("should allow GET /api/calendar-entries with valid session", async () => {
			const response = await request(app)
				.get("/api/calendar-entries")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it("should allow GET /api/calendar-entries with team filter with valid session", async () => {
			const response = await request(app)
				.get(`/api/calendar-entries?team_id=${testTeam.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it("should allow GET /api/calendar-entries/:id with valid session", async () => {
			const response = await request(app)
				.get(`/api/calendar-entries/${testCalendarEntry.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(200);

			expect(response.body).toHaveProperty("id", testCalendarEntry.id);
			expect(response.body).toHaveProperty("title", "Test PTO Entry");
		});

		it("should allow POST /api/calendar-entries with valid session", async () => {
			const newEntryData = {
				team_id: testTeam.id,
				user_id: testUser.id,
				entry_type: "holiday",
				title: "New Year Holiday",
				start_date: "2024-01-01",
				end_date: "2024-01-01",
				description: "New Year's Day",
				all_day: true
			};

			const response = await request(app)
				.post("/api/calendar-entries")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(newEntryData)
				.expect(201);

			expect(response.body).toHaveProperty("title", "New Year Holiday");
			expect(response.body).toHaveProperty("entry_type", "holiday");

			// Clean up the created entry
			await CalendarEntryModel.delete(response.body.id);
		});

		it("should allow PUT /api/calendar-entries/:id with valid session", async () => {
			const updateData = {
				team_id: testTeam.id,
				user_id: testUser.id,
				entry_type: "personal",
				title: "Updated PTO Entry",
				start_date: "2024-07-01",
				end_date: "2024-07-03",
				description: "Updated vacation description",
				all_day: false
			};

			const response = await request(app)
				.put(`/api/calendar-entries/${testCalendarEntry.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.send(updateData)
				.expect(200);

			expect(response.body).toHaveProperty("title", "Updated PTO Entry");
			expect(response.body).toHaveProperty("entry_type", "personal");
		});

		it("should allow DELETE /api/calendar-entries/:id with valid session", async () => {
			// Create a separate entry for deletion test
			const deleteEntry = await CalendarEntryModel.create({
				team_id: testTeam.id,
				user_id: testUser.id,
				entry_type: "sick",
				title: "Delete Test Entry",
				start_date: new Date("2024-08-01"),
				end_date: new Date("2024-08-01"),
				description: "Entry for deletion testing",
				all_day: true
			});

			const response = await request(app)
				.delete(`/api/calendar-entries/${deleteEntry.id}`)
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(204);

			// 204 No Content doesn't have a response body
			expect(response.body).toEqual({});

			// Verify entry was deleted
			const deletedEntry = await CalendarEntryModel.findById(deleteEntry.id);
			expect(deletedEntry).toBeNull();
		});
	});

	describe("Unauthenticated Access Denied", () => {
		it("should deny GET /api/calendar-entries without session", async () => {
			const response = await request(app)
				.get("/api/calendar-entries")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny GET /api/calendar-entries/:id without session", async () => {
			const response = await request(app)
				.get(`/api/calendar-entries/${testCalendarEntry.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny POST /api/calendar-entries without session", async () => {
			const newEntryData = {
				team_id: testTeam.id,
				user_id: testUser.id,
				entry_type: "pto",
				title: "Unauthorized Entry",
				start_date: "2024-07-01",
				end_date: "2024-07-01",
				description: "Should not be created",
				all_day: true
			};

			const response = await request(app)
				.post("/api/calendar-entries")
				.send(newEntryData)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny PUT /api/calendar-entries/:id without session", async () => {
			const updateData = {
				title: "Should Not Update"
			};

			const response = await request(app)
				.put(`/api/calendar-entries/${testCalendarEntry.id}`)
				.send(updateData)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});

		it("should deny DELETE /api/calendar-entries/:id without session", async () => {
			const response = await request(app)
				.delete(`/api/calendar-entries/${testCalendarEntry.id}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Authentication required");
		});
	});

	describe("Invalid Session Access Denied", () => {
		it("should deny access with invalid session token", async () => {
			const response = await request(app)
				.get("/api/calendar-entries")
				.set("Cookie", "sessionToken=invalid-calendar-token-12345")
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});

		it("should deny access with expired session", async () => {
			// Invalidate the session
			await SessionModel.invalidate(testSession.session_token);

			const response = await request(app)
				.get("/api/calendar-entries")
				.set("Cookie", `sessionToken=${testSession.session_token}`)
				.expect(401);

			expect(response.body).toHaveProperty("message", "Invalid or expired session");
		});
	});
});