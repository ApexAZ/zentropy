import { useState, useCallback } from "react";
import Card from "./atoms/Card";
import Button from "./atoms/Button";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import { useMultiProviderOAuth } from "../hooks/useMultiProviderOAuth";
import { AuthenticationStatusDisplay } from "./AuthenticationStatusDisplay";
import { EnhancedConfirmationModal } from "./EnhancedConfirmationModal";
import { SecurityStatusSkeleton } from "./SecurityStatusSkeleton";
import { SecurityRecommendations } from "./SecurityRecommendations";
import { AccountSecurityHelp } from "./AccountSecurityHelp";
import ProviderStatusCard from "./ProviderStatusCard";

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
	// Enhanced confirmation modal state
	const [showEnhancedConfirmation, setShowEnhancedConfirmation] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [currentUnlinkingProvider, setCurrentUnlinkingProvider] = useState<string | null>(null);

	// Security recommendations state
	const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
	const [postponedRecommendations, setPostponedRecommendations] = useState<Set<string>>(new Set());

	// Use the custom hook for all business logic
	const {
		securityStatus,
		loading,
		error,
		errorResolution,
		unlinkingLoading,
		optimisticSecurityStatus,
		loadSecurityStatus,
		handleUnlinkGoogle
	} = useAccountSecurity({ onSecurityUpdate, onError });

	// Memoized callbacks to prevent unnecessary re-renders
	const handleOAuthSuccess = useCallback(() => {
		// Handle successful OAuth linking
		onSecurityUpdate();
	}, [onSecurityUpdate]);

	const handleOAuthError = useCallback(
		(error: string) => {
			// Handle OAuth errors
			onError(error);
		},
		[onError]
	);

	// Multi-provider OAuth hook for new functionality
	const { providers, linkProvider, unlinkProvider, getProviderState, isProviderLinked } = useMultiProviderOAuth({
		onSuccess: handleOAuthSuccess,
		onError: handleOAuthError,
		securityStatus,
		handleUnlinkGoogle
	});

	// Use optimistic security status if available, otherwise use actual status
	const displaySecurityStatus = optimisticSecurityStatus || securityStatus;

	/**
	 * Handle provider linking
	 */
	const handleLinkProvider = useCallback(
		(providerName: string) => {
			linkProvider(providerName);
		},
		[linkProvider]
	);

	/**
	 * Handle showing enhanced confirmation modal for unlinking
	 */
	const handleUnlinkProvider = useCallback((providerName: string) => {
		setCurrentUnlinkingProvider(providerName);
		setShowEnhancedConfirmation(true);
		setPasswordError(null);
	}, []);

	/**
	 * Confirm provider account unlinking with password
	 */
	const handleConfirmUnlink = useCallback(
		async (password?: string) => {
			try {
				setPasswordError(null);
				if (password && currentUnlinkingProvider) {
					await unlinkProvider(currentUnlinkingProvider, password);
					setShowEnhancedConfirmation(false);
					setCurrentUnlinkingProvider(null);
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : `Failed to unlink ${currentUnlinkingProvider} account`;
				setPasswordError(errorMessage);
			}
		},
		[unlinkProvider, currentUnlinkingProvider]
	);

	/**
	 * Close enhanced confirmation modal
	 */
	const handleCloseConfirmationModal = useCallback(() => {
		setShowEnhancedConfirmation(false);
		setPasswordError(null);
		setCurrentUnlinkingProvider(null);
	}, []);

	/**
	 * Handle dismissing security recommendations
	 */
	const handleDismissRecommendation = useCallback((recommendationType: string, postpone?: boolean) => {
		if (postpone) {
			setPostponedRecommendations(prev => new Set(prev).add(recommendationType));
			// For Phase 3, could implement reminder logic here
		} else {
			setDismissedRecommendations(prev => new Set(prev).add(recommendationType));
		}
	}, []);

	/**
	 * Handle when user wants to learn more about security recommendations
	 */
	const handleLearnMore = useCallback(() => {
		// For Phase 3, could track analytics or provide additional guidance
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

						{/* Security Recommendations (only show if not dismissed and security isn't strong) */}
						{!dismissedRecommendations.has("email-only-mfa") &&
							!dismissedRecommendations.has("no-auth-critical") &&
							!postponedRecommendations.has("email-only-mfa") &&
							!postponedRecommendations.has("no-auth-critical") && (
								<SecurityRecommendations
									securityStatus={displaySecurityStatus}
									onDismiss={handleDismissRecommendation}
									onLearnMore={handleLearnMore}
								/>
							)}

						{/* OAuth Provider Cards */}
						<div className="space-y-4">
							{providers.map(provider => {
								const providerState = getProviderState(provider.name);
								const isLinked = isProviderLinked(provider.name);
								const providerEmail =
									provider.name === "google" ? displaySecurityStatus?.google_email : undefined;

								// Calculate lockout prevention data
								const hasEmailAuth = displaySecurityStatus?.email_auth_linked || false;
								const totalLinkedMethods = [
									displaySecurityStatus?.email_auth_linked,
									displaySecurityStatus?.google_auth_linked
									// Add other OAuth providers as they're implemented
								].filter(Boolean).length;

								return (
									<ProviderStatusCard
										key={provider.name}
										provider={provider}
										isLinked={isLinked}
										providerEmail={providerEmail || ""}
										onLink={() => handleLinkProvider(provider.name)}
										onUnlink={() => handleUnlinkProvider(provider.name)}
										linkingLoading={providerState.isLoading}
										unlinkingLoading={
											currentUnlinkingProvider === provider.name && unlinkingLoading
										}
										hasEmailAuth={hasEmailAuth}
										totalLinkedMethods={totalLinkedMethods}
									/>
								);
							})}
						</div>

						{/* Contextual Help Section */}
						<AccountSecurityHelp
							securityStatus={displaySecurityStatus}
							expandableHelp
							showFAQ
							showContactSupport
							showDocumentationLinks
							showContextualLinks
						/>
					</div>
				)}
			</Card>

			{/* Enhanced Confirmation Modal for Provider Account Unlinking */}
			{currentUnlinkingProvider && (
				<EnhancedConfirmationModal
					isOpen={showEnhancedConfirmation}
					onClose={handleCloseConfirmationModal}
					onConfirm={handleConfirmUnlink}
					loading={unlinkingLoading}
					title={`Unlink ${providers.find(p => p.name === currentUnlinkingProvider)?.displayName || currentUnlinkingProvider} Account`}
					message={`Are you sure you want to unlink your ${providers.find(p => p.name === currentUnlinkingProvider)?.displayName || currentUnlinkingProvider} account from Zentropy?`}
					actionType="destructive"
					impactDescription="After unlinking, you will:"
					consequences={[
						"Only be able to sign in with email and password",
						`Lose the convenience of one-click ${providers.find(p => p.name === currentUnlinkingProvider)?.displayName || currentUnlinkingProvider} sign-in`,
						"Need to remember your password for account access"
					]}
					recoveryGuidance={`You can re-link your ${providers.find(p => p.name === currentUnlinkingProvider)?.displayName || currentUnlinkingProvider} account anytime by going to Security Settings and clicking 'Link ${providers.find(p => p.name === currentUnlinkingProvider)?.displayName || currentUnlinkingProvider} Account'.`}
					confirmText="Yes, Unlink Account"
					loadingText="Unlinking account..."
					requiresPasswordConfirmation={true}
					{...(passwordError && { passwordError })}
				/>
			)}
		</>
	);
}
