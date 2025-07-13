import { useState, useEffect, useCallback } from "react";
import { UserService } from "../services/UserService";
import { useGoogleOAuth } from "./useGoogleOAuth";
import type { AccountSecurityResponse, LinkGoogleAccountRequest, UnlinkGoogleAccountRequest } from "../types";

interface UseAccountSecurityProps {
	/** Callback when security status is updated */
	onSecurityUpdate: () => void;
	/** Callback for error handling */
	onError: (error: string) => void;
}

interface UseAccountSecurityReturn {
	// Security status data
	securityStatus: AccountSecurityResponse | null;
	loading: boolean;
	error: string | null;

	// Google linking state
	linkingLoading: boolean;
	unlinkingLoading: boolean;

	// Google OAuth state
	googleOAuthReady: boolean;
	oauthLoading: boolean;

	// Actions
	loadSecurityStatus: () => Promise<void>;
	handleLinkGoogle: () => void;
	handleUnlinkGoogle: (password: string) => Promise<void>;
}

/**
 * Custom hook for managing account security operations
 *
 * Handles loading security status, Google account linking/unlinking,
 * and OAuth integration following React hooks best practices.
 */
export function useAccountSecurity({ onSecurityUpdate, onError }: UseAccountSecurityProps): UseAccountSecurityReturn {
	// Security status state
	const [securityStatus, setSecurityStatus] = useState<AccountSecurityResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Linking operation state
	const [linkingLoading, setLinkingLoading] = useState(false);
	const [unlinkingLoading, setUnlinkingLoading] = useState(false);

	/**
	 * Load account security status from API
	 */
	const loadSecurityStatus = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await UserService.getAccountSecurity();
			setSecurityStatus(response);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load security status";
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [onError]);

	/**
	 * Handle successful Google OAuth credential
	 */
	const handleGoogleOAuthSuccess = useCallback(
		async (credential: string) => {
			try {
				const linkRequest: LinkGoogleAccountRequest = {
					google_credential: credential
				};

				await UserService.linkGoogleAccount(linkRequest);
				await loadSecurityStatus(); // Refresh status
				onSecurityUpdate();
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to link Google account";
				onError(errorMessage);
			} finally {
				setLinkingLoading(false);
			}
		},
		[loadSecurityStatus, onSecurityUpdate, onError]
	);

	/**
	 * Handle Google OAuth errors
	 */
	const handleGoogleOAuthError = useCallback(
		(error: string) => {
			setLinkingLoading(false);
			onError(error);
		},
		[onError]
	);

	/**
	 * Google OAuth hook for handling authentication flow
	 */
	const {
		triggerOAuth,
		isReady: googleOAuthReady,
		isLoading: oauthLoading
	} = useGoogleOAuth({
		onSuccess: handleGoogleOAuthSuccess,
		onError: handleGoogleOAuthError
	});

	/**
	 * Handle Google account linking - starts OAuth flow
	 */
	const handleLinkGoogle = useCallback(() => {
		setLinkingLoading(true);
		triggerOAuth();
	}, [triggerOAuth]);

	/**
	 * Handle Google account unlinking with password confirmation
	 */
	const handleUnlinkGoogle = useCallback(
		async (password: string) => {
			try {
				setUnlinkingLoading(true);

				const unlinkRequest: UnlinkGoogleAccountRequest = {
					password
				};

				await UserService.unlinkGoogleAccount(unlinkRequest);
				await loadSecurityStatus(); // Refresh status
				onSecurityUpdate();
			} catch (err) {
				throw err; // Re-throw original error for component to handle
			} finally {
				setUnlinkingLoading(false);
			}
		},
		[loadSecurityStatus, onSecurityUpdate]
	);

	// Load security status on mount
	useEffect(() => {
		loadSecurityStatus();
	}, [loadSecurityStatus]);

	return {
		// Security status data
		securityStatus,
		loading,
		error,

		// Google linking state
		linkingLoading,
		unlinkingLoading,

		// Google OAuth state
		googleOAuthReady,
		oauthLoading,

		// Actions
		loadSecurityStatus,
		handleLinkGoogle,
		handleUnlinkGoogle
	};
}
