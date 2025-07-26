import { useState } from "react";
import type { AccountSecurityResponse } from "../types";

interface SecurityRecommendationsProps {
	/** Current security status from API */
	securityStatus: AccountSecurityResponse;
	/** Callback when user dismisses recommendation */
	onDismiss: (recommendationType: string, postpone?: boolean) => void;
	/** Callback when user wants to learn more */
	onLearnMore: () => void;
}

interface SecurityRecommendation {
	id: string;
	title: string;
	description: string;
	urgency: "moderate" | "high";
	icon: string;
	educationalContent: {
		title: string;
		benefits: string[];
		setupInfo: string;
	};
}

/**
 * Security Recommendations Component
 *
 * Provides helpful, non-pushy security recommendations based on current authentication status.
 * Includes educational content about multi-factor authentication benefits and gentle dismissal options.
 */
export function SecurityRecommendations({ securityStatus, onDismiss, onLearnMore }: SecurityRecommendationsProps) {
	const [showEducationalContent, setShowEducationalContent] = useState(false);

	// Determine appropriate recommendation based on security status
	const getRecommendation = (): SecurityRecommendation | null => {
		if (securityStatus.email_auth_linked && securityStatus.google_auth_linked) {
			// Strong security - no recommendation needed
			return null;
		}

		if (securityStatus.email_auth_linked && !securityStatus.google_auth_linked) {
			// Email-only authentication - suggest adding Google
			return {
				id: "email-only-mfa",
				title: "Enhance your account security",
				description: "Add Google authentication for an extra layer of protection and convenience.",
				urgency: "moderate",
				icon: "🔒",
				educationalContent: {
					title: "Multi-factor authentication protects your account",
					benefits: [
						"Even if your password is compromised, your account stays secure",
						"Alternative sign-in option if you forget your password",
						"Industry-standard security practice used by leading companies",
						"Quick and convenient access with one-click sign-in"
					],
					setupInfo: "Adding Google authentication takes less than 1 minute with our one-click setup process."
				}
			};
		}

		// No authentication or weak security
		return {
			id: "no-auth-critical",
			title: "Secure your account",
			description: "Enable authentication methods to protect your account and data.",
			urgency: "high",
			icon: "⚠️",
			educationalContent: {
				title: "Account security is essential for data protection",
				benefits: [
					"Prevents unauthorized access to your sensitive information",
					"Protects your team's data and project information",
					"Meets modern security standards and compliance requirements",
					"Gives you peace of mind when working remotely"
				],
				setupInfo: "Setting up authentication is quick and provides immediate protection for your account."
			}
		};
	};

	const recommendation = getRecommendation();

	// Don't render if no recommendation needed
	if (!recommendation) {
		return null;
	}

	const handleLearnMore = () => {
		setShowEducationalContent(!showEducationalContent);
		onLearnMore();
	};

	const handleDismiss = () => {
		onDismiss(recommendation.id);
	};

	const handlePostpone = () => {
		onDismiss(recommendation.id, true);
	};

	const urgencyStyles = {
		moderate: "border-warning bg-warning-light",
		high: "border-error bg-error-light"
	};

	return (
		<div
			data-testid="security-recommendation"
			role="alert"
			aria-live="polite"
			className={`rounded-lg border-2 p-4 ${urgencyStyles[recommendation.urgency]}`}
		>
			<div role="region" className="space-y-4">
				{/* Recommendation Header */}
				<div className="flex items-start space-x-3">
					<span className="text-2xl" aria-hidden="true">
						{recommendation.icon}
					</span>
					<div className="flex-1">
						<h4 className="text-text-contrast font-heading-small">{recommendation.title}</h4>
						<p className="text-secondary mt-1 text-sm">{recommendation.description}</p>
					</div>
				</div>

				{/* Educational Content (Expandable) */}
				{showEducationalContent && (
					<div data-testid="educational-content" className="bg-content-background space-y-3 rounded-md p-4">
						<h5 className="text-text-contrast font-heading-small">
							{recommendation.educationalContent.title}
						</h5>
						<ul className="text-secondary space-y-2 text-sm">
							{recommendation.educationalContent.benefits.map((benefit, index) => (
								<li key={index} className="flex items-start space-x-2">
									<span className="text-success mt-0.5">•</span>
									<span>{benefit}</span>
								</li>
							))}
						</ul>
						<p className="text-interactive bg-interactive-light rounded px-2 py-1 text-xs">
							💡 {recommendation.educationalContent.setupInfo}
						</p>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex items-center space-x-3 pt-2">
					<button
						type="button"
						onClick={handleLearnMore}
						className="text-interactive hover:text-interactive-hover focus:ring-interactive rounded text-sm font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						{showEducationalContent ? "Show less" : "Learn more"}
					</button>

					<button
						type="button"
						onClick={handlePostpone}
						className="text-secondary hover:text-text-contrast focus:ring-interactive rounded px-2 py-1 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Remind me later
					</button>

					<button
						type="button"
						onClick={handleDismiss}
						className="text-secondary hover:text-text-contrast focus:ring-interactive rounded px-2 py-1 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	);
}
