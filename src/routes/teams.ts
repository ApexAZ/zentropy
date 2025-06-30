import { Router, Request, Response } from "express";
import { TeamModel } from "../models/Team";
import { ValidationError } from "../utils/validation-core";
import { validateTeamInput } from "../utils/team-core";
import { handleTeamCreationWithRolePromotion } from "../utils/permission-core";
import { hasUserSearchPermission } from "../utils/user-search-utils";
import type { UserRole } from "../models/User";
import { teamCore } from "../utils/team-core";
import {
	validateTeamMembership,
	canAddUserToTeam,
	determineUserRoleForTeam,
	validateMembershipRequest,
	sanitizeMembershipData,
	formatMembershipResponse,
	type MembershipRecord
} from "../utils/team-membership-utils";
import {
	validateInvitationData,
	sanitizeInvitationData,
	createInvitationToken,
	canUserInviteToTeam,
	formatInvitationForResponse,
	getInvitationExpiryDate,
	type InvitationData
} from "../utils/team-invitation-utils";
import { UserModel } from "../models/User";
import { TeamInvitationModel } from "../models/TeamInvitation";
import sessionAuthMiddleware from "../middleware/session-auth";

const router = Router();

// GET /api/teams - Get all teams (requires authentication)
router.get("/", sessionAuthMiddleware, async (_req: Request, res: Response) => {
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

// GET /api/teams/:id - Get team by ID (requires authentication)
router.get("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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

// POST /api/teams - Create new team (requires authentication)
router.post("/", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
	try {
		// Get authenticated user from session middleware
		const user = req.user;
		if (!user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Validate input data
		const teamData = validateTeamInput(req.body);

		// Set the team creator to the authenticated user
		const teamDataWithCreator = {
			...teamData,
			created_by: user.id
		};

		// Handle team creation with automatic role promotion
		const result = await handleTeamCreationWithRolePromotion(teamDataWithCreator);

		// Return comprehensive response including promotion information
		res.status(201).json({
			team: result.team,
			userPromoted: result.userPromoted,
			membership: result.membership,
			message: result.userPromoted
				? "Team created successfully. You have been promoted to team lead!"
				: "Team created successfully."
		});
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

// PUT /api/teams/:id - Update team (requires authentication)
router.put("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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
		const updateData = validateTeamInput(req.body);

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

// DELETE /api/teams/:id - Delete team (requires authentication)
router.delete("/:id", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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

// GET /api/teams/:id/members - Get team members (requires authentication)
router.get("/:id/members", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
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

// POST /api/teams/:id/members - Add user to team (requires team_lead role)
router.post("/:id/members", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
	try {
		// Get authenticated user from session middleware
		const user = req.user;
		if (!user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Check if user has permission to add team members
		if (!hasUserSearchPermission(user.role as UserRole)) {
			res.status(403).json({
				message: "Insufficient permissions. Only team leads can add users to teams."
			});
			return;
		}

		const teamId = req.params.id;
		if (!teamId) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}

		// Validate team exists
		const team = await TeamModel.findById(teamId);
		if (!team) {
			res.status(404).json({ message: "Team not found" });
			return;
		}

		// Extract and validate request data
		const rawRequest = {
			userId: (req.body as { userId?: string }).userId ?? "",
			teamId: teamId,
			role: ((req.body as { role?: UserRole }).role ?? "team_member") as UserRole
		};

		// Validate membership request
		const validation = validateMembershipRequest(rawRequest);
		if (!validation.isValid) {
			res.status(400).json({
				message: "Invalid request data",
				errors: validation.errors
			});
			return;
		}

		// Sanitize input data
		const sanitizedRequest = sanitizeMembershipData(rawRequest);

		// Get user to add
		const userToAdd = await UserModel.findById(sanitizedRequest.userId);
		if (!userToAdd) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// Validate user can be added to team
		const userValidation = validateTeamMembership(userToAdd, teamId);
		if (!userValidation.isValid) {
			res.status(400).json({
				message: "Cannot add user to team",
				errors: userValidation.errors
			});
			return;
		}

		// Check for existing membership
		const existingMemberships = teamCore.getTeamMemberships();
		const conflictCheck = canAddUserToTeam(sanitizedRequest.userId, teamId, existingMemberships);
		if (!conflictCheck.canAdd) {
			res.status(409).json({
				message: conflictCheck.conflict
			});
			return;
		}

		// Determine appropriate role for user
		const assignedRole = determineUserRoleForTeam(userToAdd.role);
		const roleChanged = userToAdd.role === "basic_user" && assignedRole === "team_member";

		// Add user to team
		const membership = teamCore.addMemberWithRole({
			team_id: teamId,
			user_id: sanitizedRequest.userId,
			role: assignedRole
		});

		// Format response
		const membershipRecord: MembershipRecord = {
			id: membership.id,
			user_id: membership.user_id,
			team_id: membership.team_id,
			role: membership.role,
			joined_at: new Date(membership.created_at),
			created_at: new Date(membership.created_at),
			updated_at: new Date(membership.created_at)
		};

		const response = formatMembershipResponse(
			membershipRecord,
			{
				id: userToAdd.id,
				email: userToAdd.email,
				first_name: userToAdd.first_name,
				last_name: userToAdd.last_name
			},
			roleChanged
		);

		res.status(201).json(response);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error adding team member:", error);
		res.status(500).json({
			message: "Failed to add user to team",
			error: error instanceof Error ? error.message : "Unknown error"
		});
	}
});

// POST /api/teams/:id/invitations - Send team invitation (requires team_lead role)
router.post("/:id/invitations", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
	try {
		// Get authenticated user from session middleware
		const user = req.user;
		if (!user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Check if user has permission to send invitations
		if (!canUserInviteToTeam(user.role as UserRole)) {
			res.status(403).json({
				message: "Insufficient permissions. Only team leads can send team invitations."
			});
			return;
		}

		const teamId = req.params.id;
		if (!teamId) {
			res.status(400).json({ message: "Team ID is required" });
			return;
		}

		// Validate team exists
		const team = await TeamModel.findById(teamId);
		if (!team) {
			res.status(404).json({ message: "Team not found" });
			return;
		}

		// Extract and validate request data
		const requestBody = req.body as { email?: string; role?: UserRole };
		const invitationData: InvitationData = {
			teamId: teamId,
			invitedEmail: requestBody.email ?? "",
			invitedBy: user.id,
			role: requestBody.role ?? "team_member"
		};

		// Validate invitation data
		const validation = validateInvitationData(invitationData);
		if (!validation.isValid) {
			res.status(400).json({
				message: "Invalid invitation data",
				errors: validation.errors
			});
			return;
		}

		// Sanitize input data
		const sanitizedData = sanitizeInvitationData(invitationData);

		// Check if user is already a team member
		const existingMemberships = teamCore.getTeamMemberships();
		const existingUser = await UserModel.findByEmail(sanitizedData.invitedEmail);

		if (existingUser) {
			const membershipConflict = canAddUserToTeam(existingUser.id, teamId, existingMemberships);
			if (!membershipConflict.canAdd) {
				res.status(409).json({
					message: "User is already a member of this team"
				});
				return;
			}
		}

		// Check for existing pending invitation
		const existingInvitation = await TeamInvitationModel.findPendingForTeamAndEmail(
			teamId,
			sanitizedData.invitedEmail
		);
		if (existingInvitation) {
			res.status(409).json({
				message: "User already has a pending invitation for this team"
			});
			return;
		}

		// Create invitation
		const token = createInvitationToken();
		const expiresAt = getInvitationExpiryDate(7); // 7 days expiry

		const invitation = await TeamInvitationModel.create({
			team_id: teamId,
			invited_email: sanitizedData.invitedEmail,
			invited_by: user.id,
			role: sanitizedData.role,
			token: token,
			expires_at: expiresAt
		});

		// Format response
		const inviterName = `${user.first_name} ${user.last_name}`.trim() || "Team Lead";
		const response = formatInvitationForResponse(invitation, team.name, inviterName);

		res.status(201).json({
			invitation: {
				id: response.id,
				teamId: response.teamId,
				invitedEmail: response.invitedEmail,
				role: response.role,
				status: response.status,
				expiresAt: response.expiresAt
			},
			message: `Invitation sent to ${sanitizedData.invitedEmail} to join ${team.name}`
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error sending team invitation:", error);
		res.status(500).json({
			message: "Failed to send invitation",
			error: error instanceof Error ? error.message : "Unknown error"
		});
	}
});

// User search route is in the users router at /api/users/search

export default router;
