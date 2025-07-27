import React, { useState, useCallback, useMemo } from "react";
import type { AccountSecurityResponse } from "../types";
import PasswordChangeForm from "./PasswordChangeForm";
import { PasswordConfirmationModal } from "./PasswordConfirmationModal";
import Button from "./atoms/Button";
import { useToast } from "../contexts/ToastContext";
import { useMultiProviderOAuth } from "../hooks/useMultiProviderOAuth";
import { useAccountSecurity } from "../hooks/useAccountSecurity";
import { OAuthProviderService } from "../services/OAuthProviderService";

interface SignInMethodsProps {
	/** Current security status data from API */
	securityStatus: AccountSecurityResponse;
	/** Callback when security status is updated */
	onSecurityUpdate: () => void;
	/** Callback for error handling */
	onError: (error: string) => void;
}

interface SignInMethod {
	id: string;
	name: string;
	isActive: boolean;
	status: string;
	icon: string | React.ReactElement;
	actionLabel: string;
	actionType: "primary" | "secondary";
	email?: string;
}

/**
 * Sign-In Methods Component - Modern Compact Design
 *
 * Status-first grouped design following modern UX patterns:
 * - Active methods shown first with clear status
 * - Available methods grouped separately
 * - Reduced visual clutter with progressive disclosure
 */
export function SignInMethods({ securityStatus, onSecurityUpdate, onError }: SignInMethodsProps) {
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [showUnlinkModal, setShowUnlinkModal] = useState(false);
	const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
	const [unlinkLoading, setUnlinkLoading] = useState(false);
	const [unlinkError, setUnlinkError] = useState<string | null>(null);
	const { showSuccess } = useToast();

	// Use account security hook for OAuth operations
	const { handleUnlinkGoogle } = useAccountSecurity({ onSecurityUpdate, onError });

	// OAuth success handler that calls the API to link the account
	const handleOAuthSuccess = useCallback(
		async (credential: string, provider: string) => {
			try {
				// Call the API to link the account using the OAuth credential
				await OAuthProviderService.linkProvider({
					credential,
					provider
				});

				// On successful linking, refresh the security status
				onSecurityUpdate();
			} catch (error) {
				// Handle linking errors
				const errorMessage = error instanceof Error ? error.message : `Failed to link ${provider} account`;
				onError(errorMessage);
			}
		},
		[onSecurityUpdate, onError]
	);

	// Multi-provider OAuth hook
	const { providers, linkProvider, unlinkProvider, isProviderLinked } = useMultiProviderOAuth({
		onSuccess: handleOAuthSuccess,
		onError,
		securityStatus,
		handleUnlinkGoogle
	});

	const handlePasswordChangeSuccess = useCallback(() => {
		setIsChangingPassword(false);
		showSuccess("Password changed successfully!");
		onSecurityUpdate();
	}, [showSuccess, onSecurityUpdate]);

	const handlePasswordChangeCancel = useCallback(() => {
		setIsChangingPassword(false);
	}, []);

	// OAuth unlinking functions
	const handleStartUnlink = useCallback(
		(providerName: string) => {
			// Check if this would be the last authentication method
			const hasEmailAuth = securityStatus.email_auth_linked;
			const linkedProviders = providers.filter(provider => isProviderLinked(provider.name));
			const totalLinkedMethods = (hasEmailAuth ? 1 : 0) + linkedProviders.length;

			if (totalLinkedMethods <= 1) {
				onError(
					"You can't unlink your only authentication method. Set up email authentication first to safely remove OAuth providers."
				);
				return;
			}

			setUnlinkingProvider(providerName);
			setShowUnlinkModal(true);
			setUnlinkError(null);
		},
		[securityStatus, providers, isProviderLinked, onError]
	);

	const handleConfirmUnlink = useCallback(
		async (password: string) => {
			if (!unlinkingProvider) return;

			setUnlinkLoading(true);
			setUnlinkError(null);

			try {
				await unlinkProvider(unlinkingProvider, password);
				setShowUnlinkModal(false);
				setUnlinkingProvider(null);
				showSuccess(
					`${providers.find(p => p.name === unlinkingProvider)?.displayName || unlinkingProvider} account unlinked successfully!`
				);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : `Failed to unlink ${unlinkingProvider}`;
				setUnlinkError(errorMessage);
			} finally {
				setUnlinkLoading(false);
			}
		},
		[unlinkingProvider, unlinkProvider, providers, showSuccess]
	);

	const handleCancelUnlink = useCallback(() => {
		setShowUnlinkModal(false);
		setUnlinkingProvider(null);
		setUnlinkError(null);
	}, []);

	// Transform security status into organized method lists
	const { activeMethods, availableMethods } = useMemo(() => {
		const active: SignInMethod[] = [];
		const available: SignInMethod[] = [];

		// Email + Password method
		const emailMethod: SignInMethod = {
			id: "email",
			name: "Email & Password",
			isActive: securityStatus.email_auth_linked,
			status: securityStatus.email_auth_linked ? "Primary method" : "Not set up",
			icon: "✉️",
			actionLabel: securityStatus.email_auth_linked ? "Change Password" : "Set up",
			actionType: "secondary"
		};

		if (securityStatus.email_auth_linked) {
			active.push(emailMethod);
		} else {
			available.push(emailMethod);
		}

		// OAuth providers
		providers.forEach(provider => {
			const isLinked = isProviderLinked(provider.name);
			const providerEmail = provider.name === "google" ? securityStatus.google_email : undefined;

			const method: SignInMethod = {
				id: provider.name,
				name: provider.displayName,
				isActive: isLinked,
				status: isLinked ? (providerEmail ? `Linked (${providerEmail})` : "Linked") : "Not linked",
				icon: getProviderIcon(provider.name),
				actionLabel: isLinked ? "Manage" : "Connect",
				actionType: isLinked ? "secondary" : "primary",
				...(providerEmail && { email: providerEmail })
			};

			if (isLinked) {
				active.push(method);
			} else {
				available.push(method);
			}
		});

		return { activeMethods: active, availableMethods: available };
	}, [securityStatus, providers, isProviderLinked]);

	const handleMethodAction = useCallback(
		(method: SignInMethod) => {
			if (method.id === "email") {
				if (method.isActive) {
					setIsChangingPassword(true);
				} else {
					// Could navigate to email setup flow
					onError("Email setup not yet implemented");
				}
			} else {
				// OAuth provider
				if (method.isActive) {
					handleStartUnlink(method.id);
				} else {
					linkProvider(method.id);
				}
			}
		},
		[linkProvider, handleStartUnlink, onError]
	);

	return (
		<div className="space-y-6">
			{/* Section Header */}
			<div>
				<h3 className="text-text-contrast font-heading-medium">Sign-In Methods</h3>
				<p className="text-text-primary mt-1 text-sm">Manage how you access your account</p>
			</div>

			{/* Password Change Form (shown when editing) */}
			{isChangingPassword && (
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<PasswordChangeForm onSuccess={handlePasswordChangeSuccess} onCancel={handlePasswordChangeCancel} />
				</div>
			)}

			{/* Active Methods Section */}
			{activeMethods.length > 0 && (
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="mb-4 flex items-center gap-2">
						<span className="text-success text-lg">🔐</span>
						<h4 className="text-text-contrast font-medium">
							Active Sign-in Methods ({activeMethods.length})
						</h4>
					</div>
					<div className="space-y-3">
						{activeMethods.map(method => (
							<MethodRow
								key={method.id}
								method={method}
								onAction={() => handleMethodAction(method)}
								disabled={isChangingPassword}
							/>
						))}
					</div>
				</div>
			)}

			{/* Available Methods Section */}
			{availableMethods.length > 0 && (
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="mb-4">
						<h4 className="text-text-contrast font-medium">Available Methods</h4>
					</div>
					<div className="space-y-3">
						{availableMethods.map(method => (
							<MethodRow
								key={method.id}
								method={method}
								onAction={() => handleMethodAction(method)}
								disabled={isChangingPassword}
							/>
						))}
					</div>
				</div>
			)}

			{/* Password Confirmation Modal for OAuth Unlinking */}
			{unlinkingProvider && (
				<PasswordConfirmationModal
					isOpen={showUnlinkModal}
					onClose={handleCancelUnlink}
					onConfirm={handleConfirmUnlink}
					loading={unlinkLoading}
					error={unlinkError}
				/>
			)}
		</div>
	);
}

interface MethodRowProps {
	method: SignInMethod;
	onAction: () => void;
	disabled?: boolean;
}

function MethodRow({ method, onAction, disabled }: MethodRowProps) {
	return (
		<div className="flex items-start justify-between py-2">
			<div className="flex flex-1 items-start gap-3">
				<div className="mt-0.5">{method.icon}</div>
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-center gap-2">
						{method.isActive && <span className="text-success text-sm">✓</span>}
						<span className="text-text-contrast font-medium">{method.name}</span>
					</div>
					<div className="flex items-center gap-3">
						<p className="text-text-primary text-sm">{method.status}</p>
						<Button
							onClick={onAction}
							disabled={disabled}
							variant={method.actionType === "primary" ? "primary" : "secondary"}
							size="small"
						>
							{method.actionLabel}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

function getProviderIcon(providerName: string): React.ReactElement {
	switch (providerName) {
		case "google":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
			);
		case "github":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" fill="#24292e" className="flex-shrink-0">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
				</svg>
			);
		case "microsoft":
			return (
				<svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0">
					<path fill="#F25022" d="M1 1h10v10H1z" />
					<path fill="#00A4EF" d="M13 1h10v10H13z" />
					<path fill="#7FBA00" d="M1 13h10v10H1z" />
					<path fill="#FFB900" d="M13 13h10v10H13z" />
				</svg>
			);
		default:
			return <span className="text-lg">🔗</span>;
	}
}
