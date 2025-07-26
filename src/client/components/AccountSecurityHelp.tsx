import { useState } from "react";
import { ContextualHelp } from "./ContextualHelp";
import { SecurityHelpFAQ } from "./SecurityHelpFAQ";
import type { AccountSecurityResponse } from "../types";

interface AccountSecurityHelpProps {
	/** Current security status to provide contextual help */
	securityStatus?: AccountSecurityResponse;
	/** Whether to show FAQ section */
	showFAQ?: boolean;
	/** Whether to show contact support section */
	showContactSupport?: boolean;
	/** Whether to show emergency contact information */
	showEmergencyContact?: boolean;
	/** Whether to show documentation links */
	showDocumentationLinks?: boolean;
	/** Whether to show contextual links based on security status */
	showContextualLinks?: boolean;
	/** Whether to show explanatory text for security concepts */
	showExplanations?: boolean;
	/** Whether to show step-by-step guides */
	showStepByStepGuides?: boolean;
	/** Whether to show troubleshooting help */
	showTroubleshooting?: boolean;
	/** Whether to make help sections expandable */
	expandableHelp?: boolean;
}

/**
 * Account Security Help Component
 *
 * Provides comprehensive contextual help for account security features including
 * tooltips, documentation links, FAQ section, and contact support options.
 */
export function AccountSecurityHelp({
	securityStatus,
	showFAQ = false,
	showContactSupport = false,
	showEmergencyContact = false,
	showDocumentationLinks = false,
	showContextualLinks = false,
	showExplanations = false,
	showStepByStepGuides = false,
	showTroubleshooting = false,
	expandableHelp = false
}: AccountSecurityHelpProps) {
	const [isHelpExpanded, setIsHelpExpanded] = useState(false);

	const hasStrongSecurity = securityStatus?.email_auth_linked && securityStatus?.google_auth_linked;
	const hasEmailOnly = securityStatus?.email_auth_linked && !securityStatus?.google_auth_linked;

	const toggleHelpExpansion = () => {
		setIsHelpExpanded(!isHelpExpanded);
	};

	const helpContent = (
		<div className="space-y-6">
			{/* OAuth Help */}
			<div className="flex items-center space-x-2">
				<span className="text-text-primary font-caption">OAuth-based authentication</span>
				<ContextualHelp concept="oauth" />
			</div>

			{/* Security Explanations */}
			{showExplanations && (
				<div className="bg-content-background rounded-lg p-4">
					<h4 className="text-text-contrast font-heading-small mb-3">Security Concepts Explained</h4>
					<div className="space-y-3 text-sm">
						<p className="text-secondary">
							<strong>Multi-factor authentication (MFA)</strong> protects your account by requiring both
							your password and access to another device or method.
						</p>
						<p className="text-secondary">
							<strong>Account linking</strong> connects multiple authentication methods to a single
							account, giving you flexibility and backup options.
						</p>
						<p className="text-secondary">
							<strong>OAuth</strong> is a secure authentication standard that lets you sign in with Google
							without sharing your password with Zentropy.
						</p>
					</div>
				</div>
			)}

			{/* Step-by-Step Guides */}
			{showStepByStepGuides && (
				<div className="bg-interactive-light rounded-lg p-4">
					<h4 className="text-interactive-dark mb-3 font-medium">How to Enhance Your Security</h4>
					<ol className="text-interactive-dark space-y-2 text-sm">
						<li>1. Click "Link Google Account" in the Security Actions section</li>
						<li>2. Sign in with your Google account when prompted</li>
						<li>3. Confirm the account linking to complete the setup</li>
						<li>4. You can now sign in with either email/password or Google</li>
					</ol>
				</div>
			)}

			{/* Documentation Links */}
			{showDocumentationLinks && (
				<div className="border-layout-background bg-content-background rounded-lg border p-4">
					<h4 className="text-text-contrast font-heading-small mb-3">Security Documentation</h4>
					<div className="space-y-2">
						<a
							href="/docs/security/best-practices"
							target="_blank"
							rel="noopener noreferrer"
							className="text-interactive hover:text-interactive-hover focus:ring-interactive block text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
						>
							Security Best Practices Guide
						</a>
						<a
							href="/docs/security/multi-factor-setup"
							target="_blank"
							rel="noopener noreferrer"
							className="text-interactive hover:text-interactive-hover focus:ring-interactive block text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
						>
							Multi-factor Authentication Setup Guide
						</a>
					</div>
				</div>
			)}

			{/* Contextual Links */}
			{showContextualLinks && securityStatus && (
				<div className="border-layout-background bg-content-background rounded-lg border p-4">
					<h4 className="text-text-contrast font-heading-small mb-3">Recommended Actions</h4>
					<div className="space-y-2">
						{hasEmailOnly && (
							<a
								href="/docs/security/link-google-account"
								target="_blank"
								rel="noopener noreferrer"
								className="text-interactive hover:text-interactive-hover focus:ring-interactive block text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								How to Link Google Account
							</a>
						)}
						{hasStrongSecurity && (
							<a
								href="/docs/security/advanced-features"
								target="_blank"
								rel="noopener noreferrer"
								className="text-interactive hover:text-interactive-hover focus:ring-interactive block text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								Advanced Security Features
							</a>
						)}
					</div>
				</div>
			)}

			{/* Troubleshooting */}
			{showTroubleshooting && (
				<div className="border-warning-light bg-warning-light rounded-lg border p-4">
					<h4 className="text-warning-dark mb-3 font-medium">Troubleshooting Common Issues</h4>
					<div className="text-warning-dark space-y-2 text-sm">
						<div>
							<strong>Google account linking fails:</strong> Ensure you're using the same email address
							for both accounts.
						</div>
						<div>
							<strong>Password reset problems:</strong> Check your spam folder or contact support for
							assistance.
						</div>
						<div>
							<strong>Authentication errors:</strong> Clear your browser cache and try again.
						</div>
					</div>
				</div>
			)}

			{/* FAQ Section */}
			{showFAQ && (
				<div>
					<h3 className="text-text-contrast font-heading-small mb-4">Security Help & FAQs</h3>
					<SecurityHelpFAQ searchable />
				</div>
			)}

			{/* Contact Support */}
			{showContactSupport && (
				<div className="border-interactive-light bg-interactive-light rounded-lg border p-4">
					<h4 className="text-interactive-dark mb-2 font-medium">Need Help with Account Security?</h4>
					<p className="text-interactive-dark mb-3 text-sm">
						Our security team is here to help you protect your account and resolve any issues.
					</p>
					<a
						href="/contact"
						className="text-interactive hover:text-interactive-hover focus:ring-interactive inline-flex items-center text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Contact Support
					</a>
				</div>
			)}

			{/* Emergency Contact */}
			{showEmergencyContact && (
				<div className="border-error-light bg-error-light rounded-lg border p-4">
					<h4 className="text-error-dark mb-2 font-semibold">Security Emergency?</h4>
					<p className="text-error-dark text-sm">
						If you believe your account has been compromised, email us immediately at{" "}
						<strong>support@zentropy.app</strong> for priority assistance with 24-hour response time.
					</p>
				</div>
			)}
		</div>
	);

	if (expandableHelp) {
		return (
			<div className="space-y-4">
				<button
					type="button"
					onClick={toggleHelpExpansion}
					className="text-interactive hover:text-interactive-hover focus:ring-interactive flex w-full items-center justify-between rounded-lg border border-current p-3 text-left text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
					aria-expanded={isHelpExpanded}
				>
					<span>{isHelpExpanded ? "Hide" : "Show"} Security Help</span>
					<span>{isHelpExpanded ? "−" : "+"}</span>
				</button>

				{isHelpExpanded && (
					<div role="region" aria-label="Security help and guidance">
						<h3 className="text-text-contrast font-heading-small mb-4">Security Help & Guidance</h3>
						{helpContent}
					</div>
				)}
			</div>
		);
	}

	return (
		<div role="region" aria-label="Security help">
			{helpContent}
		</div>
	);
}
