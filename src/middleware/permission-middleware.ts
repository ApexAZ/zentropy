import type { Request, Response, NextFunction } from "express";
import { validateUserPermissions, type PermissionAction } from "../utils/permission-controls";
import type { UserRole } from "../models/User";

/**
 * Extended request interface with user information
 */
interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		role: UserRole;
		email: string;
	};
}

/**
 * Middleware to require team access permissions
 * Users must be at least team members to proceed
 */
export function requireTeamAccess(req: Request, res: Response, next: NextFunction): void {
	const authReq = req as AuthenticatedRequest;
	
	if (!authReq.user) {
		res.status(403).json({
			message: "You do not have sufficient permissions to perform this action."
		});
		return;
	}

	const permissionCheck = validateUserPermissions(authReq.user.role, "access_teams");
	
	if (!permissionCheck.hasPermission) {
		res.status(403).json({
			message: permissionCheck.message
		});
		return;
	}

	next();
}

/**
 * Middleware to require team management permissions
 * Only team leads can proceed
 */
export function requireTeamManagement(req: Request, res: Response, next: NextFunction): void {
	const authReq = req as AuthenticatedRequest;
	
	if (!authReq.user) {
		res.status(403).json({
			message: "You do not have sufficient permissions to perform this action."
		});
		return;
	}

	const permissionCheck = validateUserPermissions(authReq.user.role, "manage_team");
	
	if (!permissionCheck.hasPermission) {
		res.status(403).json({
			message: permissionCheck.message
		});
		return;
	}

	next();
}

/**
 * Middleware to require member management permissions
 * Only team leads can add/remove members
 */
export function requireMemberManagement(req: Request, res: Response, next: NextFunction): void {
	const authReq = req as AuthenticatedRequest;
	
	if (!authReq.user) {
		res.status(403).json({
			message: "You do not have sufficient permissions to perform this action."
		});
		return;
	}

	const permissionCheck = validateUserPermissions(authReq.user.role, "add_members");
	
	if (!permissionCheck.hasPermission) {
		res.status(403).json({
			message: permissionCheck.message
		});
		return;
	}

	next();
}

/**
 * Middleware to require team lead role specifically
 * Strict check for team lead permissions
 */
export function requireTeamLead(req: Request, res: Response, next: NextFunction): void {
	const authReq = req as AuthenticatedRequest;
	
	if (!authReq.user) {
		res.status(403).json({
			message: "You do not have sufficient permissions to perform this action."
		});
		return;
	}

	if (authReq.user.role !== "team_lead") {
		res.status(403).json({
			message: "Only team leads can perform this action. Contact your team lead if you need to make changes."
		});
		return;
	}

	next();
}

/**
 * Generic permission middleware factory
 * Create middleware for any permission action
 */
export function createPermissionMiddleware(action: PermissionAction) {
	return (req: Request, res: Response, next: NextFunction): void => {
		const authReq = req as AuthenticatedRequest;
		
		if (!authReq.user) {
			res.status(403).json({
				message: "You do not have sufficient permissions to perform this action."
			});
			return;
		}

		const permissionCheck = validateUserPermissions(authReq.user.role, action);
		
		if (!permissionCheck.hasPermission) {
			res.status(403).json({
				message: permissionCheck.message
			});
			return;
		}

		next();
	};
}

/**
 * Middleware to check if user can view team details
 * Team members and leads can view, basic users cannot
 */
export const requireTeamView = createPermissionMiddleware("view_team_details");

/**
 * Middleware to check if user can send invitations
 * Only team leads can send invitations
 */
export const requireInvitationPermissions = createPermissionMiddleware("send_invitations");

/**
 * Middleware to check if user can modify team settings
 * Only team leads can modify settings
 */
export const requireTeamSettings = createPermissionMiddleware("modify_team_settings");

/**
 * Utility function to get user role from request
 * Returns null if user is not authenticated
 */
export function getUserRole(req: Request): UserRole | null {
	const authReq = req as AuthenticatedRequest;
	return authReq.user?.role ?? null;
}

/**
 * Utility function to get user ID from request
 * Returns null if user is not authenticated
 */
export function getUserId(req: Request): string | null {
	const authReq = req as AuthenticatedRequest;
	return authReq.user?.id ?? null;
}

/**
 * Utility function to check if request user has specific permission
 * Returns boolean result without throwing errors
 */
export function hasPermission(req: Request, action: PermissionAction): boolean {
	const authReq = req as AuthenticatedRequest;
	
	if (!authReq.user) {
		return false;
	}

	const permissionCheck = validateUserPermissions(authReq.user.role, action);
	return permissionCheck.hasPermission;
}