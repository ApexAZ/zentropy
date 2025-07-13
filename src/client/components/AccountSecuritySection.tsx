import { useState, useCallback } from "react";
import Card from "./atoms/Card";
import Button from "./atoms/Button";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import { AuthenticationStatusDisplay } from "./AuthenticationStatusDisplay";
import { SecurityActions } from "./SecurityActions";
import { PasswordConfirmationModal } from "./PasswordConfirmationModal";

interface AccountSecuritySectionProps {
	/** Callback when security status is updated */
	onSecurityUpdate: () => void;
	/** Callback for error handling */
	onError: (error: string) => void;
}

/**
 * Account Security Section Component
 *
 * Displays current authentication status and provides actions for linking/unlinking
 * Google OAuth authentication following atomic design patterns.
 */
export function AccountSecuritySection({ onSecurityUpdate, onError }: AccountSecuritySectionProps) {
	// Password modal state (kept in component since it's UI-specific)
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	// Use the custom hook for all business logic
	const {
		securityStatus,
		loading,
		error,
		linkingLoading,
		unlinkingLoading,
		googleOAuthReady,
		oauthLoading,
		loadSecurityStatus,
		handleLinkGoogle,
		handleUnlinkGoogle: hookHandleUnlinkGoogle
	} = useAccountSecurity({ onSecurityUpdate, onError });

	/**
	 * Handle showing password modal for unlinking
	 */
	const handleUnlinkGoogle = useCallback(() => {
		setShowPasswordModal(true);
		setPasswordError(null);
	}, []);

	/**
	 * Confirm Google account unlinking with password
	 */
	const handleConfirmUnlink = useCallback(
		async (password: string) => {
			try {
				setPasswordError(null);
				await hookHandleUnlinkGoogle(password);
				setShowPasswordModal(false);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to unlink Google account";
				setPasswordError(errorMessage);
			}
		},
		[hookHandleUnlinkGoogle]
	);

	/**
	 * Close password modal
	 */
	const handleClosePasswordModal = useCallback(() => {
		setShowPasswordModal(false);
		setPasswordError(null);
	}, []);

	// Loading state
	if (loading) {
		return (
			<Card>
				<div className="flex items-center justify-center py-8">
					<div role="status" aria-label="Loading security status">
						<div className="border-interactive h-8 w-8 animate-spin rounded-full border-b-2"></div>
						<span className="sr-only">Loading security status...</span>
					</div>
					<span className="text-primary ml-3">Loading...</span>
				</div>
			</Card>
		);
	}

	// Error state
	if (error) {
		return (
			<Card>
				<div className="py-8 text-center">
					<p className="text-error mb-4">Failed to load security information</p>
					<Button onClick={loadSecurityStatus} variant="secondary">
						Retry
					</Button>
				</div>
			</Card>
		);
	}

	// Main security status display
	return (
		<>
			<Card title="Account Security" data-testid="account-security-container">
				{securityStatus && (
					<div className="space-y-6">
						{/* Authentication Status Display */}
						<AuthenticationStatusDisplay securityStatus={securityStatus} />

						{/* Security Actions */}
						<SecurityActions
							securityStatus={securityStatus}
							linkingLoading={linkingLoading}
							unlinkingLoading={unlinkingLoading}
							googleOAuthReady={googleOAuthReady}
							oauthLoading={oauthLoading}
							onLinkGoogle={handleLinkGoogle}
							onUnlinkGoogle={handleUnlinkGoogle}
						/>
					</div>
				)}
			</Card>

			{/* Password Confirmation Modal */}
			<PasswordConfirmationModal
				isOpen={showPasswordModal}
				onClose={handleClosePasswordModal}
				onConfirm={handleConfirmUnlink}
				loading={unlinkingLoading}
				error={passwordError}
			/>
		</>
	);
}
