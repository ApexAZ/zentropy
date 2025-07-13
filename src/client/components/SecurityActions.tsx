import Button from "./atoms/Button";
import type { AccountSecurityResponse } from "../types";

interface SecurityActionsProps {
	/** Current security status */
	securityStatus: AccountSecurityResponse;
	/** Loading state for linking operation */
	linkingLoading: boolean;
	/** Loading state for unlinking operation */
	unlinkingLoading: boolean;
	/** Google OAuth readiness state */
	googleOAuthReady: boolean;
	/** OAuth loading state */
	oauthLoading: boolean;
	/** Handler for Google account linking */
	onLinkGoogle: () => void;
	/** Handler for Google account unlinking */
	onUnlinkGoogle: () => void;
}

/**
 * Security Actions Component
 *
 * Provides action buttons for linking/unlinking Google authentication
 * with appropriate loading states and helper text.
 */
export function SecurityActions({
	securityStatus,
	linkingLoading,
	unlinkingLoading,
	googleOAuthReady,
	oauthLoading,
	onLinkGoogle,
	onUnlinkGoogle
}: SecurityActionsProps) {
	return (
		<div className="border-layout-background border-t pt-4">
			{securityStatus.google_auth_linked ? (
				<Button
					variant="danger"
					onClick={onUnlinkGoogle}
					isLoading={unlinkingLoading}
					disabled={unlinkingLoading}
					aria-describedby="unlink-description"
				>
					Unlink Google Account
				</Button>
			) : (
				<Button
					variant="primary"
					onClick={onLinkGoogle}
					isLoading={linkingLoading || oauthLoading}
					loadingText={oauthLoading ? "Starting OAuth..." : "Linking..."}
					disabled={linkingLoading || oauthLoading || !googleOAuthReady}
					aria-describedby="link-description"
				>
					Link Google Account
				</Button>
			)}

			{/* Helper text */}
			<p
				id={securityStatus.google_auth_linked ? "unlink-description" : "link-description"}
				className="text-secondary mt-2 text-sm"
			>
				{securityStatus.google_auth_linked
					? "Remove Google OAuth as an authentication method for your account."
					: !googleOAuthReady
						? "Google OAuth is being initialized. Please wait a moment."
						: "Add Google OAuth as an additional authentication method for improved security."}
			</p>
		</div>
	);
}
