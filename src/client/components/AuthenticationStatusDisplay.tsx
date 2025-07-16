import type { AccountSecurityResponse } from "../types";
import { ContextualHelp } from "./ContextualHelp";

interface AuthenticationStatusDisplayProps {
	/** Current security status from API */
	securityStatus: AccountSecurityResponse;
}

/**
 * Authentication Status Display Component
 *
 * Displays current authentication provider status with enhanced visual indicators,
 * security strength badges, and helpful tooltips for improved user experience.
 */
export function AuthenticationStatusDisplay({ securityStatus }: AuthenticationStatusDisplayProps) {
	// Determine security strength based on authentication methods
	const getSecurityStrength = () => {
		if (securityStatus.email_auth_linked && securityStatus.google_auth_linked) {
			return {
				level: "strong",
				text: "Strong Security",
				color: "bg-success-light text-success",
				description: "Multiple authentication methods provide excellent security"
			};
		} else if (securityStatus.email_auth_linked) {
			return {
				level: "moderate",
				text: "Moderate Security",
				color: "bg-warning-light text-warning",
				description: "Consider adding Google authentication for enhanced security"
			};
		} else {
			return {
				level: "weak",
				text: "Weak Security",
				color: "bg-error-light text-error",
				description: "Enable authentication methods to secure your account"
			};
		}
	};

	const securityStrength = getSecurityStrength();

	// Determine overall authentication provider badge
	const getProviderBadge = () => {
		if (securityStatus.email_auth_linked && securityStatus.google_auth_linked) {
			return {
				text: "Email + Google",
				color: "bg-success-light text-success",
				description: "Hybrid authentication with both email and Google OAuth"
			};
		} else if (securityStatus.email_auth_linked) {
			return {
				text: "Email Only",
				color: "bg-warning-light text-warning",
				description: "Email and password authentication only"
			};
		} else {
			return {
				text: "No Authentication",
				color: "bg-error-light text-error",
				description: "No active authentication methods"
			};
		}
	};

	const providerBadge = getProviderBadge();

	return (
		<div className="space-y-6">
			{/* Security Overview Section */}
			<div className="border-layout-background bg-layout-background rounded-lg border p-4">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-primary font-semibold">Authentication Status</h3>
					<div className="flex items-center space-x-3">
						{/* Authentication Provider Badge */}
						<div
							data-testid="auth-provider-badge"
							className={`rounded-full px-3 py-1 text-sm font-medium ${providerBadge.color}`}
							title={providerBadge.description}
							aria-label={`Authentication provider: ${providerBadge.text}. ${providerBadge.description}`}
						>
							{providerBadge.text}
						</div>

						{/* Security Strength Badge */}
						<div
							data-testid="security-strength-badge"
							className={`rounded-full px-3 py-1 text-sm font-medium ${securityStrength.color}`}
							title={securityStrength.description}
							aria-label={`Security strength: ${securityStrength.text}. ${securityStrength.description}`}
						>
							{securityStrength.text}
						</div>
					</div>
				</div>

				{/* Security Strength Recommendation */}
				{securityStrength.level !== "strong" && (
					<div className="bg-interactive-light rounded-md p-3 text-sm">
						<p className="text-interactive-dark">
							💡 <strong>Security Tip:</strong> {securityStrength.description}
						</p>
					</div>
				)}
			</div>

			{/* Email Authentication Status */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div
						data-testid="email-auth-indicator"
						className={`h-3 w-3 rounded-full ${
							securityStatus.email_auth_linked ? "bg-success" : "bg-neutral"
						}`}
						title={`Email authentication is ${securityStatus.email_auth_linked ? "enabled" : "disabled"}`}
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
					title={`Email authentication: ${securityStatus.email_auth_linked ? "Your account can be accessed with email and password" : "Email authentication is not configured"}`}
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
						title={`Google authentication is ${securityStatus.google_auth_linked ? "enabled" : "disabled"}`}
					/>
					<div>
						<div className="flex items-center space-x-2">
							<h4 className="text-primary font-medium">Google Authentication</h4>
							<ContextualHelp concept="oauth" />
						</div>
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
					title={`Google authentication: ${securityStatus.google_auth_linked ? "Your account can be accessed with Google OAuth" : "Google authentication is not configured"}`}
				>
					{securityStatus.google_auth_linked ? "Active" : "Not linked"}
				</span>
			</div>
		</div>
	);
}
