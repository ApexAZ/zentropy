import React, { useMemo, useCallback } from "react";
import type { OAuthProvider } from "../types";
import Button from "./atoms/Button";
import Card from "./atoms/Card";

interface ProviderStatusCardProps {
	/** OAuth provider information */
	provider: OAuthProvider;
	/** Whether the provider is currently linked to the account */
	isLinked: boolean;
	/** Optional email or identifier for the linked provider */
	providerEmail?: string;
	/** Function called when user wants to link the provider */
	onLink: () => void;
	/** Function called when user wants to unlink the provider */
	onUnlink: () => void;
	/** When true, shows loading state for linking operation */
	linkingLoading?: boolean;
	/** When true, shows loading state for unlinking operation */
	unlinkingLoading?: boolean;
	/** Whether email authentication is available as backup */
	hasEmailAuth?: boolean;
	/** Total number of linked authentication methods */
	totalLinkedMethods?: number;
}

const ProviderStatusCard: React.FC<ProviderStatusCardProps> = ({
	provider,
	isLinked,
	providerEmail,
	onLink,
	onUnlink,
	linkingLoading = false,
	unlinkingLoading = false,
	hasEmailAuth = false,
	totalLinkedMethods = 0
}) => {
	// Validate provider prop for security
	const isValidProvider = useMemo(() => {
		return (
			provider &&
			typeof provider.name === "string" &&
			typeof provider.displayName === "string" &&
			typeof provider.iconClass === "string" &&
			typeof provider.brandColor === "string"
		);
	}, [provider]);

	// Sanitize brand color to prevent XSS
	const sanitizedBrandColor = useMemo(() => {
		if (!provider.brandColor) return "#666";
		// Allow only hex colors and basic color names
		const colorRegex = /^(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)$/;
		return colorRegex.test(provider.brandColor) ? provider.brandColor : "#666";
	}, [provider.brandColor]);

	// Determine if unlinking this provider would cause account lockout
	const wouldCauseLockout = useMemo(() => {
		if (!isLinked) return false;
		// If this is the only linked method and no email auth, unlinking would cause lockout
		return totalLinkedMethods <= 1 && !hasEmailAuth;
	}, [isLinked, totalLinkedMethods, hasEmailAuth]);

	// Generate tooltip message for disabled unlink button
	const unlinkDisabledReason = useMemo(() => {
		if (!wouldCauseLockout) return null;
		return `You can't unlink your only authentication method. Set up email authentication first to safely remove ${provider.displayName}.`;
	}, [wouldCauseLockout, provider.displayName]);

	const statusContent = useMemo(() => {
		if (isLinked) {
			return (
				<div className="flex items-center gap-2">
					<span className="text-success font-medium">✓ Linked</span>
					{providerEmail && <span className="text-text-primary text-sm">({providerEmail})</span>}
				</div>
			);
		}
		return <span className="text-text-secondary">Not linked</span>;
	}, [isLinked, providerEmail]);

	const handleLink = useCallback(() => {
		if (!linkingLoading && !unlinkingLoading) {
			onLink();
		}
	}, [onLink, linkingLoading, unlinkingLoading]);

	const handleUnlink = useCallback(() => {
		if (!linkingLoading && !unlinkingLoading) {
			onUnlink();
		}
	}, [onUnlink, linkingLoading, unlinkingLoading]);

	const actionButton = useMemo(() => {
		if (isLinked) {
			const isUnlinkDisabled = linkingLoading || wouldCauseLockout;

			return (
				<div className="flex flex-col items-end">
					<Button
						variant="secondary"
						onClick={handleUnlink}
						isLoading={unlinkingLoading}
						loadingText={`Unlinking ${provider.displayName}`}
						aria-label={`Unlink ${provider.displayName} Account`}
						disabled={isUnlinkDisabled}
						title={wouldCauseLockout ? unlinkDisabledReason || undefined : undefined}
					>
						Unlink {provider.displayName}
					</Button>
					{wouldCauseLockout && (
						<p className="text-warning mt-1 max-w-xs text-right text-xs">
							⚠️ Set up email authentication first
						</p>
					)}
				</div>
			);
		}

		return (
			<Button
				variant="primary"
				onClick={handleLink}
				isLoading={linkingLoading}
				loadingText={`Linking ${provider.displayName}`}
				aria-label={`Link ${provider.displayName} Account`}
				disabled={unlinkingLoading}
			>
				Link {provider.displayName}
			</Button>
		);
	}, [
		isLinked,
		provider.displayName,
		handleLink,
		handleUnlink,
		linkingLoading,
		unlinkingLoading,
		wouldCauseLockout,
		unlinkDisabledReason
	]);

	// Early return if invalid provider
	if (!isValidProvider) {
		return null;
	}

	return (
		<Card className="transition-shadow hover:shadow-lg">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="bg-layout-background flex h-10 w-10 items-center justify-center rounded-full">
						<i
							className={provider.iconClass}
							data-testid="provider-icon"
							style={{ color: sanitizedBrandColor }}
							aria-hidden="true"
						/>
					</div>
					<div>
						<h3 className="text-text-contrast font-semibold">{provider.displayName}</h3>
						<div aria-live="polite" aria-label={`${provider.displayName} account linked`}>
							{statusContent}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">{actionButton}</div>
			</div>
		</Card>
	);
};

export default ProviderStatusCard;
