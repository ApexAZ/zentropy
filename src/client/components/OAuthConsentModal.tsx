import { useCallback } from "react";
import Button from "./atoms/Button";
import { formatAuthMethod } from "../utils/formatters";
import type { OAuthConsentResponse, OAuthConsentDecision } from "../types";

interface OAuthConsentModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Consent response data from OAuth flow */
	consentResponse: OAuthConsentResponse | null;
	/** Callback when user makes consent decision */
	onConsentDecision: (decision: OAuthConsentDecision) => void;
	/** Callback when modal is closed/cancelled */
	onClose: () => void;
	/** Loading state during consent processing */
	loading?: boolean;
}

/**
 * OAuth Consent Modal Component
 *
 * Displays when OAuth account linking requires explicit user consent.
 * Provides clear options for linking accounts or creating separate accounts
 * with detailed explanations of the implications.
 *
 * Follows existing modal design patterns and accessibility standards.
 */
export function OAuthConsentModal({
	isOpen,
	consentResponse,
	onConsentDecision,
	onClose,
	loading = false
}: OAuthConsentModalProps) {
	const handleLinkAccounts = useCallback(() => {
		if (!consentResponse) return;

		onConsentDecision({
			consent_given: true,
			provider: consentResponse.provider,
			context: consentResponse.security_context
		});
	}, [consentResponse, onConsentDecision]);

	const handleCreateSeparateAccount = useCallback(() => {
		if (!consentResponse) return;

		onConsentDecision({
			consent_given: false,
			provider: consentResponse.provider,
			context: consentResponse.security_context
		});
	}, [consentResponse, onConsentDecision]);

	const handleClose = useCallback(() => {
		if (!loading) {
			onClose();
		}
	}, [loading, onClose]);

	// Don't render if not open or no consent response
	if (!isOpen || !consentResponse) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				role="dialog"
				aria-labelledby="oauth-consent-title"
				aria-describedby="oauth-consent-description"
				className="bg-content-background mx-4 w-full max-w-lg rounded-lg p-6"
			>
				{/* Modal Header */}
				<div className="mb-6">
					<h2 id="oauth-consent-title" className="font-heading-medium text-text-contrast mb-2">
						Link {consentResponse.provider_display_name} Account?
					</h2>
					<p id="oauth-consent-description" className="font-body text-text-primary">
						We found an existing account with the email{" "}
						<strong className="text-text-contrast">{consentResponse.existing_email}</strong>.
					</p>
				</div>

				{/* Account Information Card */}
				<div className="border-layout-background bg-content-background mb-6 rounded-lg border p-4">
					<h3 className="font-interface text-text-contrast mb-3 font-medium">Current Account Details</h3>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="font-interface text-text-primary">Email:</span>
							<span className="font-interface text-text-contrast font-medium">
								{consentResponse.existing_email}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-interface text-text-primary">Current Sign-In Method:</span>
							<span className="font-interface text-text-contrast font-medium">
								{formatAuthMethod(consentResponse.security_context.existing_auth_method)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="font-interface text-text-primary">
								{consentResponse.provider_display_name} Email Verified:
							</span>
							<span
								className={`font-interface font-medium ${
									consentResponse.security_context.provider_email_verified
										? "text-success"
										: "text-error"
								}`}
							>
								{consentResponse.security_context.provider_email_verified ? "Yes" : "No"}
							</span>
						</div>
					</div>
				</div>

				{/* Options Explanation */}
				<div className="mb-6">
					<h3 className="font-interface text-text-contrast mb-3 font-medium">Choose an Option:</h3>
					<div className="space-y-4">
						{/* Link Accounts Option */}
						<div className="border-layout-background bg-content-background rounded border p-4">
							<h4 className="font-interface text-text-contrast mb-2 flex items-center font-medium">
								<span className="bg-interactive mr-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white">
									1
								</span>
								Link Accounts (Recommended)
							</h4>
							<ul className="font-interface text-text-primary ml-8 space-y-1 text-sm">
								<li>• Use both password and {consentResponse.provider_display_name} to sign in</li>
								<li>• Access all your existing data and settings</li>
								<li>• Single account with multiple sign-in options</li>
								<li>• Enhanced security with backup authentication method</li>
							</ul>
						</div>

						{/* Separate Account Option */}
						<div className="border-layout-background bg-content-background rounded border p-4">
							<h4 className="font-interface text-text-contrast mb-2 flex items-center font-medium">
								<span className="bg-neutral mr-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold text-white">
									2
								</span>
								Create Separate Account
							</h4>
							<ul className="font-interface text-text-primary ml-8 space-y-1 text-sm">
								<li>• Keep {consentResponse.provider_display_name} account completely separate</li>
								<li>• Start fresh with no existing data or settings</li>
								<li>• Two independent accounts with same email</li>
								<li>• You'll need to choose different usernames/handles</li>
							</ul>
						</div>
					</div>
				</div>

				{/* Security Notice */}
				<div className="bg-interactive-hover mb-6 rounded p-3">
					<p className="font-caption text-text-primary">
						<strong className="text-text-contrast">Security Note:</strong> Both options are secure. Linking
						accounts is recommended as it provides backup access methods and maintains your existing data
						and preferences.
					</p>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col justify-end gap-3 sm:flex-row">
					<Button variant="secondary" onClick={handleClose} disabled={loading} className="sm:order-1">
						Cancel
					</Button>
					<Button
						variant="secondary"
						onClick={handleCreateSeparateAccount}
						disabled={loading}
						className="sm:order-2"
					>
						Create Separate Account
					</Button>
					<Button
						variant="primary"
						onClick={handleLinkAccounts}
						disabled={loading}
						isLoading={loading}
						loadingText="Linking..."
						className="sm:order-3"
					>
						Link Accounts
					</Button>
				</div>
			</div>
		</div>
	);
}
