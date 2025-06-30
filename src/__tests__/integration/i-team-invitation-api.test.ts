import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testConnection } from "../../database/connection";
import { TestDataFactory } from "../helpers/test-data-factory";
import { UserModel } from "../../models/User";
import { TeamModel } from "../../models/Team";
import { TeamInvitationModel } from "../../models/TeamInvitation";

// Integration test for team invitation system
describe("Team Invitation API Integration Tests", () => {
	let createdUsers: string[] = [];
	let createdTeams: string[] = [];
	let createdInvitations: string[] = [];

	beforeEach(async () => {
		// Ensure database connection
		const isConnected = await testConnection();
		if (!isConnected) {
			throw new Error("Database connection failed");
		}

		// Reset cleanup arrays
		createdUsers = [];
		createdTeams = [];
		createdInvitations = [];
	});

	afterEach(async () => {
		// Clean up test data in proper order (invitations -> teams -> users)
		await new Promise(resolve => setTimeout(resolve, 50));

		try {
			// Clean up invitations first
			for (const invitationId of createdInvitations) {
				try {
					await TeamInvitationModel.delete(invitationId);
				} catch (error) {
					// Invitation might already be deleted
				}
			}

			// Clean up teams
			for (const teamId of createdTeams) {
				try {
					await TeamModel.delete(teamId);
				} catch (error) {
					// Team might already be deleted
				}
			}

			// Clean up users
			for (const userId of createdUsers) {
				try {
					await UserModel.delete(userId);
				} catch (error) {
					// User might already be deleted
				}
			}
		} catch (error) {
			// Continue cleanup even if some fails
		}
	});

	describe("Invitation Utilities Integration", () => {
		it("should validate invitation workflow components", async () => {
			// Test that our utilities work together
			const teamId = "team-123";
			const invitedEmail = "test@example.com";
			const invitedBy = "user-456";
			const role = "team_member" as const;

			// This tests our utility functions work without database calls
			const { validateInvitationData, sanitizeInvitationData, createInvitationToken } = await import(
				"../../utils/team-invitation-utils"
			);

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
			const { createInvitationToken, isInvitationExpired, getInvitationExpiryDate } = await import(
				"../../utils/team-invitation-utils"
			);

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
			const { canUserInviteToTeam, shouldPromoteUserOnAccept } = await import(
				"../../utils/team-invitation-utils"
			);

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
			} = await import("../../utils/api-client-core");

			// Test URL building
			expect(buildInvitationUrl("team-123")).toBe("/api/teams/team-123/invitations");
			expect(buildInvitationResponseUrl("invitation-123")).toBe("/api/invitations/invitation-123/respond");

			// Test request creation
			const inviteRequest = createSendInvitationRequest({
				userEmail: "test@example.com",
				role: "team_member",
				teamId: "team-123"
			});
			expect(inviteRequest.method).toBe("POST");
			expect(inviteRequest.credentials).toBe("include");

			const responseRequest = createInvitationResponseRequest({
				invitationId: "invitation-123",
				action: "accept"
			});
			expect(responseRequest.method).toBe("POST");

			const body = JSON.parse(responseRequest.body as string) as { token: string; action: string };
			expect(body.action).toBe("accept");

			// Test validation
			const validation = validateInvitationApiParams({
				teamId: "team-123",
				userEmail: "test@example.com",
				role: "team_member"
			});
			expect(validation.isValid).toBe(true);

			const invalidValidation = validateInvitationApiParams({
				teamId: "",
				userEmail: "invalid-email",
				role: "team_member"
			});
			expect(invalidValidation.isValid).toBe(false);
		});
	});

	describe("Database Model Integration", () => {
		it("should interact with invitation model correctly", async () => {
			// Create test user and team first with secure password
			const userData = TestDataFactory.createUserData({
				email: "inviter@example.com",
				password: "ComplexSecureP@ssw0rd2024!ZqX7",
				first_name: "John",
				last_name: "Doe",
				role: "team_lead"
			});
			const user = await UserModel.create(userData);
			createdUsers.push(user.id);

			const teamData = TestDataFactory.createTeamData({
				name: "Test Team",
				created_by: user.id
			});
			const team = await TeamModel.create(teamData);
			createdTeams.push(team.id);

			// Test invitation creation
			const { createInvitationToken, getInvitationExpiryDate } = await import(
				"../../utils/team-invitation-utils"
			);

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
			createdInvitations.push(invitation.id);

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
		});
	});

	describe("Complete Invitation Workflow", () => {
		it("should support full invitation lifecycle", async () => {
			// Create test users and team with secure passwords
			const inviterData = TestDataFactory.createUserData({
				email: "team.lead@example.com",
				password: "ComplexSecureP@ssw0rd2024!ZqX7",
				first_name: "Alice",
				last_name: "Manager",
				role: "team_lead"
			});
			const inviter = await UserModel.create(inviterData);
			createdUsers.push(inviter.id);

			const inviteeData = TestDataFactory.createUserData({
				email: "new.member@example.com",
				password: "AnotherSecureP@ssw0rd2024!Bx9",
				first_name: "Bob",
				last_name: "Member",
				role: "basic_user"
			});
			const invitee = await UserModel.create(inviteeData);
			createdUsers.push(invitee.id);

			const teamData = TestDataFactory.createTeamData({
				name: "Development Team",
				created_by: inviter.id
			});
			const team = await TeamModel.create(teamData);
			createdTeams.push(team.id);

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
			createdInvitations.push(invitation.id);

			// Test invitation can be acted upon
			expect(canActOnInvitation(invitation)).toBe(true);

			// Test invitation formatting
			const formatted = formatInvitationForResponse(
				invitation,
				team.name,
				`${inviter.first_name} ${inviter.last_name}`
			);
			expect(formatted.teamName).toBe(team.name);
			expect(formatted.status).toBe("pending");
		});
	});
});
