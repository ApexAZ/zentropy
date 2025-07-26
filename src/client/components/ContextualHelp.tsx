import { useState } from "react";

interface ContextualHelpProps {
	/** The security concept to provide help for */
	concept: string;
	/** Whether to show a documentation link */
	showDocumentationLink?: boolean;
}

interface HelpContent {
	label: string;
	tooltip: string;
	documentationUrl?: string;
	documentationLabel?: string;
}

/**
 * Contextual Help Component
 *
 * Provides help tooltips and documentation links for complex security concepts.
 * Follows atomic design patterns with comprehensive accessibility support.
 */
export function ContextualHelp({ concept, showDocumentationLink = false }: ContextualHelpProps) {
	const [showTooltip, setShowTooltip] = useState(false);

	const helpContent: Record<string, HelpContent> = {
		oauth: {
			label: "Help with OAuth",
			tooltip:
				"OAuth allows you to sign in using your Google account without sharing your password with Zentropy. It's a secure, industry-standard authentication method.",
			documentationUrl: "/docs/security/oauth-authentication",
			documentationLabel: "Learn more about OAuth authentication"
		},
		mfa: {
			label: "Help with Multi-factor Authentication",
			tooltip:
				"Multi-factor authentication adds an extra layer of security by requiring both your password and access to another device (like your phone) to sign in.",
			documentationUrl: "/docs/security/multi-factor-authentication",
			documentationLabel: "Learn more about Multi-factor Authentication"
		},
		"account-linking": {
			label: "Help with Account Linking",
			tooltip:
				"Account linking connects your Google account to your Zentropy account, allowing you to sign in with either method while maintaining a single account.",
			documentationUrl: "/docs/security/account-linking",
			documentationLabel: "Learn more about Account Linking"
		}
	};

	const content = helpContent[concept];

	// Don't render if concept is not recognized
	if (!content) {
		return null;
	}

	const tooltipId = `tooltip-${concept}`;

	const handleToggleTooltip = () => {
		setShowTooltip(!showTooltip);
	};

	const handleMouseEnter = () => {
		setShowTooltip(true);
	};

	const handleMouseLeave = () => {
		setShowTooltip(false);
	};

	return (
		<div className="inline-flex items-center space-x-2">
			{/* Help Icon with Tooltip */}
			<div className="relative">
				<button
					type="button"
					onClick={handleToggleTooltip}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					className="text-interactive hover:text-interactive-hover focus:ring-interactive inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs focus:ring-2 focus:ring-offset-2 focus:outline-none"
					aria-label={content.label}
					aria-describedby={tooltipId}
					title={content.tooltip}
				>
					?
				</button>

				{/* Tooltip */}
				{showTooltip && (
					<div
						id={tooltipId}
						role="tooltip"
						className="bg-layout-background border-layout-background absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 transform rounded-md border p-3 text-sm shadow-lg"
					>
						<div className="text-text-primary font-body">{content.tooltip}</div>
						{/* Tooltip arrow */}
						<div className="bg-layout-background border-layout-background absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 transform border-r border-b"></div>
					</div>
				)}
			</div>

			{/* Documentation Link */}
			{showDocumentationLink && content.documentationUrl && (
				<a
					href={content.documentationUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-interactive hover:text-interactive-hover focus:ring-interactive text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
				>
					{content.documentationLabel}
				</a>
			)}
		</div>
	);
}
