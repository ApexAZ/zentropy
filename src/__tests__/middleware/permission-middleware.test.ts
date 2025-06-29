import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
	requireTeamAccess,
	requireTeamManagement,
	requireMemberManagement,
	requireTeamLead,
	createPermissionMiddleware
} from "../../middleware/permission-middleware";
import type { UserRole } from "../../models/User";

// Mock user interface for testing
interface MockUser {
	id: string;
	role: UserRole;
	email: string;
}

// Mock request with user
interface MockRequest extends Partial<Request> {
	user?: MockUser;
}

describe("Permission Middleware", () => {
	let mockRequest: MockRequest;
	let mockResponse: Partial<Response>;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockRequest = {};
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis()
		};
		mockNext = vi.fn();
	});

	describe("requireTeamAccess", () => {
		it("should allow team lead to access team features", () => {
			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			requireTeamAccess(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it("should allow team member to access team features", () => {
			mockRequest.user = {
				id: "user-2",
				role: "team_member",
				email: "member@example.com"
			};

			requireTeamAccess(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it("should deny basic user access to team features", () => {
			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			requireTeamAccess(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "You need to join a team to access team features. Create a new team or ask a team lead to invite you."
			});
		});

		it("should deny access when no user is present", () => {
			mockRequest.user = undefined;

			requireTeamAccess(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "You do not have sufficient permissions to perform this action."
			});
		});
	});

	describe("requireTeamManagement", () => {
		it("should allow team lead to manage teams", () => {
			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			requireTeamManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it("should deny team member access to team management", () => {
			mockRequest.user = {
				id: "user-2",
				role: "team_member",
				email: "member@example.com"
			};

			requireTeamManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Only team leads can perform this action. Contact your team lead if you need to make changes."
			});
		});

		it("should deny basic user access to team management", () => {
			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			requireTeamManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "You need to join a team and become a team lead to perform this action."
			});
		});
	});

	describe("requireMemberManagement", () => {
		it("should allow team lead to manage members", () => {
			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			requireMemberManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it("should deny team member access to member management", () => {
			mockRequest.user = {
				id: "user-2",
				role: "team_member",
				email: "member@example.com"
			};

			requireMemberManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "Only team leads can perform this action. Contact your team lead if you need to make changes."
			});
		});

		it("should deny basic user access to member management", () => {
			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			requireMemberManagement(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
	});

	describe("requireTeamLead", () => {
		it("should allow team lead access", () => {
			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			requireTeamLead(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it("should deny team member access", () => {
			mockRequest.user = {
				id: "user-2",
				role: "team_member",
				email: "member@example.com"
			};

			requireTeamLead(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});

		it("should deny basic user access", () => {
			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			requireTeamLead(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
	});

	describe("createPermissionMiddleware", () => {
		it("should create middleware for team access permission", () => {
			const middleware = createPermissionMiddleware("access_teams");

			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should create middleware that denies access appropriately", () => {
			const middleware = createPermissionMiddleware("manage_team");

			mockRequest.user = {
				id: "user-2",
				role: "team_member",
				email: "member@example.com"
			};

			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});

		it("should handle user without role gracefully", () => {
			const middleware = createPermissionMiddleware("access_teams");

			mockRequest.user = {
				id: "user-4",
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			role: undefined as any,
				email: "noRole@example.com"
			};

			middleware(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
	});

	describe("Error Handling", () => {
		it("should handle middleware errors gracefully", () => {
			// Simulate error in permission check
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
			mockRequest.user = null as any;

			requireTeamAccess(mockRequest as Request, mockResponse as Response, mockNext);

			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				message: "You do not have sufficient permissions to perform this action."
			});
		});

		it("should not expose sensitive information in error messages", () => {
			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			requireTeamManagement(mockRequest as Request, mockResponse as Response, mockNext);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const errorCall = (mockResponse.json as any).mock.calls[0][0];
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(errorCall.message).not.toContain("user-3");
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(errorCall.message).not.toContain("basic@example.com");
		});
	});

	describe("Integration Scenarios", () => {
		it("should work correctly in middleware chain", () => {
			// Simulate multiple middleware calls
			const middleware1 = requireTeamAccess;
			const middleware2 = requireTeamManagement;

			mockRequest.user = {
				id: "user-1",
				role: "team_lead",
				email: "lead@example.com"
			};

			// First middleware should pass
			middleware1(mockRequest as Request, mockResponse as Response, mockNext);
			expect(mockNext).toHaveBeenCalledTimes(1);

			// Reset mock
			vi.clearAllMocks();

			// Second middleware should also pass
			middleware2(mockRequest as Request, mockResponse as Response, mockNext);
			expect(mockNext).toHaveBeenCalledTimes(1);
		});

		it("should block at first failing middleware in chain", () => {
			const middleware1 = requireTeamAccess;
			// Second middleware would be requireTeamManagement (not executed because first one fails)

			mockRequest.user = {
				id: "user-3",
				role: "basic_user",
				email: "basic@example.com"
			};

			// First middleware should fail
			middleware1(mockRequest as Request, mockResponse as Response, mockNext);
			expect(mockNext).not.toHaveBeenCalled();
			expect(mockResponse.status).toHaveBeenCalledWith(403);

			// Second middleware would not be reached in real scenario
		});
	});
});