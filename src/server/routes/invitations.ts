import { Router, Request, Response } from "express";
import { teamCore, type TeamMembershipWithRole } from "../utils/team-core";
import {
	validateInvitationResponse,
	isInvitationExpired,
	canActOnInvitation,
	shouldPromoteUserOnAccept
} from "../utils/team-invitation-utils";
import { determineUserRoleForTeam } from "../utils/team-membership-utils";
import type { UserRole } from "../models/User";
import { UserModel } from "../models/User";
import { TeamInvitationModel } from "../models/TeamInvitation";
import sessionAuthMiddleware from "../middleware/session-auth";

const router = Router();

// POST /api/invitations/respond - Accept or decline team invitation
router.post("/respond", sessionAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
	try {
		// Get authenticated user from session middleware
		const user = req.user;
		if (!user) {
			res.status(401).json({ message: "Authentication required" });
			return;
		}

		// Extract and validate request data
		const requestBody = req.body as { token?: string; action?: "accept" | "decline" };
		const responseData = {
			token: requestBody.token ?? "",
			action: requestBody.action ?? ("accept" as "accept" | "decline")
		};

		// Validate response data
		const validation = validateInvitationResponse(responseData);
		if (!validation.isValid) {
			res.status(400).json({
				message: "Invalid response data",
				errors: validation.errors
			});
			return;
		}

		// Find invitation with details
		const invitationWithDetails = await TeamInvitationModel.findByTokenWithDetails(responseData.token);
		if (!invitationWithDetails) {
			res.status(404).json({ message: "Invitation not found" });
			return;
		}

		const invitation = invitationWithDetails.invitation;

		// Check if invitation can be acted upon
		if (!canActOnInvitation(invitation)) {
			if (isInvitationExpired(invitation.expires_at)) {
				res.status(410).json({ message: "Invitation has expired" });
				return;
			}
			res.status(400).json({ message: "Invitation cannot be processed" });
			return;
		}

		// Check if the invitation is for the authenticated user
		if (invitation.invited_email.toLowerCase() !== user.email.toLowerCase()) {
			res.status(403).json({ message: "This invitation is not for your account" });
			return;
		}

		if (responseData.action === "decline") {
			// Update invitation status to declined
			await TeamInvitationModel.update(invitation.id, { status: "declined" });

			res.json({
				message: `You have declined the invitation to join ${invitationWithDetails.team.name}`
			});
			return;
		}

		// Handle acceptance
		if (responseData.action === "accept") {
			// Check if user should be promoted
			const roleForTeam = determineUserRoleForTeam(user.role as UserRole);
			const shouldPromote = shouldPromoteUserOnAccept(user.role as UserRole, invitation.role);

			// Add user to team
			const membership: TeamMembershipWithRole = teamCore.addMemberWithRole({
				team_id: invitation.team_id,
				user_id: user.id,
				role: roleForTeam
			});

			// Update invitation status
			await TeamInvitationModel.update(invitation.id, { status: "accepted" });

			// Update user role if needed
			if (shouldPromote) {
				await UserModel.update(user.id, { role: roleForTeam });
			}

			// Format response
			const response = {
				membership: {
					id: membership.id,
					userId: membership.user_id,
					teamId: membership.team_id,
					role: membership.role,
					joinedAt: membership.created_at
				},
				user: {
					id: user.id,
					email: user.email,
					displayName: `${user.first_name} ${user.last_name}`.trim()
				},
				message: shouldPromote
					? `You have joined ${invitationWithDetails.team.name} and been promoted to ${roleForTeam}`
					: `You have joined ${invitationWithDetails.team.name}`
			};

			res.json(response);
			return;
		}
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("Error responding to invitation:", error);
		res.status(500).json({
			message: "Failed to process invitation response",
			error: error instanceof Error ? error.message : "Unknown error"
		});
	}
});

export default router;
