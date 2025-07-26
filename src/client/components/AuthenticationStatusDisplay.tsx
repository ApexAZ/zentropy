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
				description: "You have multiple authentication methods for maximum security",
				recommendation: null
			};
		} else if (securityStatus.email_auth_linked) {
			return {
				level: "moderate",
				text: "Moderate Security",
				color: "bg-warning-light text-warning",
				description: "Email authentication is active",
				recommendation: "Add Google authentication for one-click sign-in convenience"
			};
		} else if (securityStatus.google_auth_linked) {
			return {
				level: "moderate",
				text: "Moderate Security",
				color: "bg-warning-light text-warning",
				description: "Google authentication is active",
				recommendation: "Add email authentication as a backup sign-in method"
			};
		} else {
			return {
				level: "weak",
				text: "Weak Security",
				color: "bg-error-light text-error",
				description: "No authentication methods are active",
				recommendation: "Set up authentication to secure your account"
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
				description: "You can sign in with either email/password or Google"
			};
		} else if (securityStatus.email_auth_linked) {
			return {
				text: "Email Only",
				color: "bg-warning-light text-warning",
				description: "You can sign in with email and password"
			};
		} else if (securityStatus.google_auth_linked) {
			return {
				text: "Google Only",
				color: "bg-warning-light text-warning",
				description: "You can sign in with Google"
			};
		} else {
			return {
				text: "Setup Required",
				color: "bg-error-light text-error",
				description: "No authentication methods configured"
			};
		}
	};

	const providerBadge = getProviderBadge();

	return (
		<div className="space-y-6">
			{/* Security Overview Section */}
			<div className="border-layout-background bg-layout-background rounded-lg border p-4">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-text-contrast font-heading-small">Authentication Status</h3>
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
				{securityStrength.recommendation && (
					<div className="bg-interactive-light rounded-md p-3 text-sm">
						<p className="text-interactive-dark">
							💡 <strong>Security Tip:</strong> {securityStrength.recommendation}
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
						<h4 className="text-text-contrast font-heading-small">Email Authentication</h4>
						<p className="text-secondary text-sm">
							{securityStatus.email_auth_linked
								? "Sign in with email and password"
								: "Set up email and password as backup sign-in"}
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
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
						{securityStatus.email_auth_linked ? "Active" : "Not linked"}
					</span>
					{!securityStatus.email_auth_linked && (
						<button
							className="bg-interactive hover:bg-interactive-hover rounded px-3 py-1 text-sm font-medium text-white transition-colors"
							onClick={() => {
								// TODO: Open password setup modal or navigate to setup flow
								console.log("Setup email authentication");
							}}
						>
							Set Password
						</button>
					)}
				</div>
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
							<h4 className="text-text-contrast font-heading-small">Google Authentication</h4>
							<ContextualHelp concept="oauth" />
						</div>
						<p className="text-secondary text-sm">
							{securityStatus.google_auth_linked && securityStatus.google_email
								? `One-click sign-in with ${securityStatus.google_email}`
								: "One-click sign-in with Google account"}
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-2">
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
					{!securityStatus.google_auth_linked && (
						<button
							className="bg-interactive hover:bg-interactive-hover rounded px-3 py-1 text-sm font-medium text-white transition-colors"
							onClick={() => {
								// TODO: Trigger Google OAuth linking flow
								console.log("Link Google authentication");
							}}
						>
							Link Google
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
