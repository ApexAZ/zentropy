import type { AccountSecurityResponse } from "../types";

interface AuthenticationStatusDisplayProps {
	/** Current security status from API */
	securityStatus: AccountSecurityResponse;
}

/**
 * Authentication Status Display Component
 *
 * Displays current authentication provider status with visual indicators
 * following atomic design patterns for reusability and maintainability.
 */
export function AuthenticationStatusDisplay({ securityStatus }: AuthenticationStatusDisplayProps) {
	return (
		<div className="space-y-6">
			{/* Email Authentication Status */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div
						data-testid="email-auth-indicator"
						className={`h-3 w-3 rounded-full ${
							securityStatus.email_auth_linked ? "bg-success" : "bg-neutral"
						}`}
					/>
					<div>
						<h4 className="text-primary font-medium">Email Authentication</h4>
						<p className="text-secondary text-sm">Password-based authentication</p>
					</div>
				</div>
				<span
					data-testid="email-auth-status"
					aria-label={`Email authentication is ${securityStatus.email_auth_linked ? "active" : "inactive"}`}
					className={`rounded-full px-3 py-1 text-sm font-medium ${
						securityStatus.email_auth_linked
							? "bg-success-light text-success"
							: "bg-neutral-light text-neutral"
					}`}
				>
					{securityStatus.email_auth_linked ? "Active" : "Inactive"}
				</span>
			</div>

			{/* Google Authentication Status */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div
						data-testid="google-auth-indicator"
						className={`h-3 w-3 rounded-full ${
							securityStatus.google_auth_linked ? "bg-success" : "bg-neutral"
						}`}
					/>
					<div>
						<h4 className="text-primary font-medium">Google Authentication</h4>
						<p className="text-secondary text-sm">
							{securityStatus.google_auth_linked && securityStatus.google_email
								? securityStatus.google_email
								: "OAuth-based authentication"}
						</p>
					</div>
				</div>
				<span
					data-testid="google-auth-status"
					aria-label={`Google authentication is ${securityStatus.google_auth_linked ? "active" : "not linked"}`}
					className={`rounded-full px-3 py-1 text-sm font-medium ${
						securityStatus.google_auth_linked
							? "bg-success-light text-success"
							: "bg-neutral-light text-neutral"
					}`}
				>
					{securityStatus.google_auth_linked ? "Active" : "Not linked"}
				</span>
			</div>
		</div>
	);
}
