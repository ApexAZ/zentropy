import { useMemo } from "react";
import type { AccountSecurityResponse } from "../types";

interface SecurityOverviewProps {
	/** Current security status data from API */
	securityStatus: AccountSecurityResponse;
}

/**
 * Security Overview Component
 *
 * Provides a high-level security status summary with actionable recommendations.
 * This gives users a quick understanding of their account security and clear next steps.
 */
export function SecurityOverview({ securityStatus }: SecurityOverviewProps) {
	// Calculate security score and recommendations
	const securityAnalysis = useMemo(() => {
		const methods = [];
		let score = 0;
		let maxScore = 3;

		// Check active authentication methods
		if (securityStatus.email_auth_linked) {
			methods.push("Email + Password");
			score += 1;
		}

		if (securityStatus.google_auth_linked) {
			methods.push("Google Account");
			score += 1;
		}

		// Future: Add other OAuth providers
		// if (securityStatus.github_auth_linked) {
		//   methods.push("GitHub Account");
		//   score += 1;
		// }

		// Determine security level and recommendations
		let level: "excellent" | "good" | "fair" | "poor";
		let levelColor: string;
		let primaryRecommendation: string;

		if (score >= 2) {
			level = "good";
			levelColor = "bg-success-background text-success";
			primaryRecommendation = "Consider adding backup recovery codes for emergencies";
		} else if (score === 1) {
			if (securityStatus.email_auth_linked) {
				level = "fair";
				levelColor = "bg-warning-background text-warning";
				primaryRecommendation = "Add Google sign-in for convenience and backup security";
			} else {
				level = "fair";
				levelColor = "bg-warning-background text-warning";
				primaryRecommendation = "Set up email + password as a backup sign-in method";
			}
		} else {
			level = "poor";
			levelColor = "bg-error-background text-error";
			primaryRecommendation = "Set up at least one sign-in method to secure your account";
		}

		return {
			score,
			maxScore,
			level,
			levelColor,
			methods,
			primaryRecommendation
		};
	}, [securityStatus]);

	const { score, maxScore, level, levelColor, methods, primaryRecommendation } = securityAnalysis;

	return (
		<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
			<div className="mb-6">
				<h3 className="text-text-contrast font-heading-medium">Security Overview</h3>
				<p className="text-text-primary font-caption mt-1">
					Your account security status and recommended improvements
				</p>
			</div>

			<div className="space-y-6">
				{/* Security Score */}
				<div className="flex items-center justify-between">
					<div>
						<div className="text-text-primary font-interface mb-1 block">Security Score</div>
						<div className="flex items-center gap-3">
							<span
								className={`font-interface inline-flex items-center gap-1 rounded-full px-3 py-1 ${levelColor}`}
							>
								{level === "good" && "🛡️"}
								{level === "fair" && "⚠️"}
								{level === "poor" && "🔓"}
								{level.charAt(0).toUpperCase() + level.slice(1)} Security
							</span>
							<span className="text-text-primary font-caption">
								{score} of {maxScore} security methods active
							</span>
						</div>
					</div>
				</div>

				{/* Active Methods */}
				<div>
					<div className="text-text-primary font-interface mb-2 block">Active Sign-In Methods</div>
					{methods.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{methods.map((method, index) => (
								<span
									key={index}
									className="bg-interactive-background text-interactive-dark font-interface inline-flex items-center gap-1 rounded-full px-3 py-1"
								>
									✅ {method}
								</span>
							))}
						</div>
					) : (
						<span className="text-neutral font-caption italic">No sign-in methods configured</span>
					)}
				</div>

				{/* Primary Recommendation */}
				<div className="bg-interactive-light rounded-md p-4">
					<div className="flex items-start gap-3">
						<span className="text-interactive-dark text-lg">💡</span>
						<div>
							<div className="text-interactive-dark mb-1 font-medium">Recommended Next Step</div>
							<p className="text-interactive-dark text-sm">{primaryRecommendation}</p>
						</div>
					</div>
				</div>

				{/* Quick Stats */}
				<div className="border-layout-background border-t pt-4">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<div className="text-center">
							<div className="text-text-contrast text-lg font-semibold">{score}</div>
							<div className="text-text-primary text-sm">Active Methods</div>
						</div>
						<div className="text-center">
							<div className="text-text-contrast text-lg font-semibold">
								{securityStatus.email_auth_linked ? "Recent" : "Never"}
							</div>
							<div className="text-text-primary text-sm">Last Password Change</div>
						</div>
						<div className="text-center">
							<div className="text-text-contrast text-lg font-semibold">
								{securityStatus.google_auth_linked ? (
									<span className="text-success">Linked</span>
								) : (
									<span className="text-neutral">Available</span>
								)}
							</div>
							<div className="text-text-primary text-sm">Google Account</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
