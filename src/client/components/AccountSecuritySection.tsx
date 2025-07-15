import { useState, useCallback } from "react";
import Card from "./atoms/Card";
import Button from "./atoms/Button";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import { AuthenticationStatusDisplay } from "./AuthenticationStatusDisplay";
import { SecurityActions } from "./SecurityActions";
import { PasswordConfirmationModal } from "./PasswordConfirmationModal";
import { SecurityStatusSkeleton } from "./SecurityStatusSkeleton";

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
		errorResolution,
		linkingLoading,
		unlinkingLoading,
		googleOAuthReady,
		oauthLoading,
		optimisticSecurityStatus,
		loadSecurityStatus,
		handleLinkGoogle,
		handleUnlinkGoogle: hookHandleUnlinkGoogle
	} = useAccountSecurity({ onSecurityUpdate, onError });

	// Use optimistic security status if available, otherwise use actual status
	const displaySecurityStatus = optimisticSecurityStatus || securityStatus;

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

	// Loading state with skeleton
	if (loading) {
		return (
			<Card title="Account Security" data-testid="account-security-container">
				<SecurityStatusSkeleton />
			</Card>
		);
	}

	// Error state
	if (error) {
		return (
			<Card>
				<div className="py-8 text-center">
					<p className="text-error mb-2">{error}</p>
					{errorResolution && <p className="text-secondary mb-4 text-sm">{errorResolution}</p>}
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
				{displaySecurityStatus && (
					<div className="space-y-6">
						{/* Authentication Status Display */}
						<AuthenticationStatusDisplay securityStatus={displaySecurityStatus} />

						{/* Security Actions */}
						<SecurityActions
							securityStatus={displaySecurityStatus}
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
