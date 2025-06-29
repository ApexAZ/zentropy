import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testConnection, closePool } from "../../database/connection";
import { TestDataFactory } from "../helpers/test-data-factory";
import { UserModel } from "../../models/User";
import { TeamModel } from "../../models/Team";
import { TeamInvitationModel } from "../../models/TeamInvitation";


// Simple test of invitation system
describe("Team Invitation API Integration Tests", () => {
	beforeEach(async () => {
		// Ensure database connection
		const isConnected = await testConnection();
		if (!isConnected) {
			throw new Error("Database connection failed");
		}
	});

	afterEach(async () => {
		await closePool();
	});

	describe("Invitation Utilities Integration", () => {
		it("should validate invitation workflow components", async () => {
			// Test that our utilities work together
			const teamId = "team-123";
			const invitedEmail = "test@example.com";
			const invitedBy = "user-456";
			const role = "team_member" as const;

			// This tests our utility functions work without database calls
			const { validateInvitationData, sanitizeInvitationData, createInvitationToken } = await import("../../utils/team-invitation-utils");

			const invitationData = {
				teamId,
				invitedEmail,
				invitedBy,
				role
			};

			const validation = validateInvitationData(invitationData);
			expect(validation.isValid).toBe(true);

			const sanitized = sanitizeInvitationData(invitationData);
			expect(sanitized.invitedEmail).toBe(invitedEmail);

			const token = createInvitationToken();
			expect(token).toHaveLength(64);
		});

		it("should create and validate invitation tokens", async () => {
			const { createInvitationToken, isInvitationExpired, getInvitationExpiryDate } = await import("../../utils/team-invitation-utils");

			// Test token creation
			const token1 = createInvitationToken();
			const token2 = createInvitationToken();
			
			expect(token1).not.toBe(token2);
			expect(token1).toMatch(/^[a-f0-9]{64}$/);

			// Test expiry logic
			const futureDate = getInvitationExpiryDate(1); // 1 day from now
			expect(isInvitationExpired(futureDate)).toBe(false);

			const pastDate = new Date(Date.now() - 86400000); // 1 day ago
			expect(isInvitationExpired(pastDate)).toBe(true);
		});

		it("should validate role permissions correctly", async () => {
			const { canUserInviteToTeam, shouldPromoteUserOnAccept } = await import("../../utils/team-invitation-utils");

			// Test invitation permissions
			expect(canUserInviteToTeam("team_lead")).toBe(true);
			expect(canUserInviteToTeam("team_member")).toBe(false);
			expect(canUserInviteToTeam("basic_user")).toBe(false);

			// Test promotion logic
			expect(shouldPromoteUserOnAccept("basic_user", "team_member")).toBe(true);
			expect(shouldPromoteUserOnAccept("team_member", "team_lead")).toBe(true);
			expect(shouldPromoteUserOnAccept("team_member", "team_member")).toBe(false);
		});
	});

	describe("API Client Integration", () => {
		it("should build correct API URLs and requests", async () => {
			const { 
				buildInvitationUrl, 
				buildInvitationResponseUrl, 
				createSendInvitationRequest,
				createInvitationResponseRequest,
				validateInvitationApiParams
			} = await import("../../utils/team-invitation-api-client");

			// Test URL building
			expect(buildInvitationUrl("team-123")).toBe("/api/teams/team-123/invitations");
			expect(buildInvitationResponseUrl()).toBe("/api/invitations/respond");

			// Test request creation
			const inviteRequest = createSendInvitationRequest("test@example.com", "team_member");
			expect(inviteRequest.method).toBe("POST");
			expect(inviteRequest.credentials).toBe("include");

			const responseRequest = createInvitationResponseRequest("token-123", "accept");
			expect(responseRequest.method).toBe("POST");
			
			const body = JSON.parse(responseRequest.body as string) as { token: string; action: string };
			expect(body.action).toBe("accept");

			// Test validation
			const validation = validateInvitationApiParams("team-123", "test@example.com", "team_member");
			expect(validation.isValid).toBe(true);

			const invalidValidation = validateInvitationApiParams("", "invalid-email", "team_member");
			expect(invalidValidation.isValid).toBe(false);
		});
	});

	describe("Database Model Integration", () => {
		it("should interact with invitation model correctly", async () => {
			// Create test user and team first
			const userData = TestDataFactory.createUserData({
				email: "inviter@example.com",
				role: "team_lead"
			});
			const user = await UserModel.create(userData);

			const teamData = TestDataFactory.createTeamData({
				name: "Test Team",
				created_by: user.id
			});
			const team = await TeamModel.create(teamData);

			// Test invitation creation
			const { createInvitationToken, getInvitationExpiryDate } = await import("../../utils/team-invitation-utils");
			
			const token = createInvitationToken();
			const expiresAt = getInvitationExpiryDate(7);

			const invitation = await TeamInvitationModel.create({
				team_id: team.id,
				invited_email: "invited@example.com",
				invited_by: user.id,
				role: "team_member",
				token: token,
				expires_at: expiresAt
			});

			expect(invitation.id).toBeDefined();
			expect(invitation.status).toBe("pending");
			expect(invitation.token).toBe(token);

			// Test finding by token
			const foundInvitation = await TeamInvitationModel.findByToken(token);
			expect(foundInvitation?.id).toBe(invitation.id);

			// Test finding with details
			const withDetails = await TeamInvitationModel.findByTokenWithDetails(token);
			expect(withDetails?.invitation.id).toBe(invitation.id);
			expect(withDetails?.team.name).toBe(team.name);
			expect(withDetails?.inviter.email).toBe(user.email);

			// Clean up
			await TeamInvitationModel.delete(invitation.id);
			await TeamModel.delete(team.id);
			await UserModel.delete(user.id);
		});
	});

	describe("Complete Invitation Workflow", () => {
		it("should support full invitation lifecycle", async () => {
			// Create test users and team
			const inviterData = TestDataFactory.createUserData({
				email: "team.lead@example.com",
				role: "team_lead"
			});
			const inviter = await UserModel.create(inviterData);

			const inviteeData = TestDataFactory.createUserData({
				email: "new.member@example.com",
				role: "basic_user"
			});
			const invitee = await UserModel.create(inviteeData);

			const teamData = TestDataFactory.createTeamData({
				name: "Development Team",
				created_by: inviter.id
			});
			const team = await TeamModel.create(teamData);

			// Test invitation creation workflow
			const { 
				validateInvitationData, 
				sanitizeInvitationData, 
				createInvitationToken, 
				getInvitationExpiryDate,
				canActOnInvitation,
				formatInvitationForResponse
			} = await import("../../utils/team-invitation-utils");

			const invitationData = {
				teamId: team.id,
				invitedEmail: invitee.email,
				invitedBy: inviter.id,
				role: "team_member" as const
			};

			// Validate and sanitize
			const validation = validateInvitationData(invitationData);
			expect(validation.isValid).toBe(true);

			const sanitized = sanitizeInvitationData(invitationData);
			
			// Create invitation in database
			const token = createInvitationToken();
			const expiresAt = getInvitationExpiryDate(7);

			const invitation = await TeamInvitationModel.create({
				team_id: sanitized.teamId,
				invited_email: sanitized.invitedEmail,
				invited_by: sanitized.invitedBy,
				role: sanitized.role,
				token: token,
				expires_at: expiresAt
			});

			// Test invitation can be acted upon
			expect(canActOnInvitation(invitation)).toBe(true);

			// Test invitation formatting
			const formatted = formatInvitationForResponse(invitation, team.name, `${inviter.first_name} ${inviter.last_name}`);
			expect(formatted.teamName).toBe(team.name);
			expect(formatted.status).toBe("pending");

			// Clean up
			await TeamInvitationModel.delete(invitation.id);
			await TeamModel.delete(team.id);
			await UserModel.delete(inviter.id);
			await UserModel.delete(invitee.id);
		});
	});
});