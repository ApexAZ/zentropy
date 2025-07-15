import { useState, useEffect, useCallback } from "react";
import { UserService } from "../services/UserService";
import { useGoogleOAuth } from "./useGoogleOAuth";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";
import { useToast } from "../contexts/ToastContext";
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
	errorResolution: string | null;

	// Google linking state
	linkingLoading: boolean;
	unlinkingLoading: boolean;

	// Google OAuth state
	googleOAuthReady: boolean;
	oauthLoading: boolean;

	// Optimistic update state
	optimisticSecurityStatus: AccountSecurityResponse | null;

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
	// Toast notifications
	const { showSuccess } = useToast();

	// Security status state
	const [securityStatus, setSecurityStatus] = useState<AccountSecurityResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [errorResolution, setErrorResolution] = useState<string | null>(null);

	// Linking operation state
	const [linkingLoading, setLinkingLoading] = useState(false);
	const [unlinkingLoading, setUnlinkingLoading] = useState(false);

	// Optimistic update state
	const [optimisticSecurityStatus, setOptimisticSecurityStatus] = useState<AccountSecurityResponse | null>(null);

	/**
	 * Load account security status from API with enhanced error handling and timeout
	 */
	const loadSecurityStatus = useCallback(async () => {
		const TIMEOUT_MS = 15000; // 15 second timeout
		let timeoutId: NodeJS.Timeout | undefined;

		try {
			setLoading(true);
			setError(null);
			setErrorResolution(null);

			// Create timeout promise
			const timeoutPromise = new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error("Request timed out. Please check your connection and try again."));
				}, TIMEOUT_MS);
			});

			// Race between the API call and timeout
			const response = await Promise.race([UserService.getAccountSecurity(), timeoutPromise]);

			setSecurityStatus(response);
			// Clear optimistic update when we get real data
			setOptimisticSecurityStatus(null);
		} catch (err) {
			const errorMessage = AccountSecurityErrorHandler.getDisplayMessage(err as Error, "loading");
			const errorResolution = AccountSecurityErrorHandler.getResolutionGuidance(err as Error, "loading");

			setError(errorMessage);
			setErrorResolution(errorResolution || null);
			onError(errorMessage);
		} finally {
			setLoading(false);
			if (timeoutId) clearTimeout(timeoutId);
		}
	}, [onError]);

	/**
	 * Handle successful Google OAuth credential with enhanced error handling and timeout
	 */
	const handleGoogleOAuthSuccess = useCallback(
		async (credential: string) => {
			const TIMEOUT_MS = 10000; // 10 second timeout for linking
			let timeoutId: NodeJS.Timeout | undefined;

			try {
				const linkRequest: LinkGoogleAccountRequest = {
					google_credential: credential
				};

				// Create timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => {
						reject(new Error("Linking timed out. Please try again."));
					}, TIMEOUT_MS);
				});

				// Race between the API call and timeout
				await Promise.race([UserService.linkGoogleAccount(linkRequest), timeoutPromise]);

				await loadSecurityStatus(); // Refresh status
				onSecurityUpdate();

				// Show success toast with confirmation message
				showSuccess(
					"Google account linked successfully! Your account now has enhanced security with multiple authentication methods."
				);
			} catch (err) {
				const errorMessage = AccountSecurityErrorHandler.getDisplayMessage(err as Error, "linking");
				onError(errorMessage);

				// Clear optimistic update on error
				setOptimisticSecurityStatus(null);
			} finally {
				setLinkingLoading(false);
				if (timeoutId) clearTimeout(timeoutId);
			}
		},
		[loadSecurityStatus, onSecurityUpdate, onError, showSuccess]
	);

	/**
	 * Handle Google OAuth errors with enhanced error handling
	 */
	const handleGoogleOAuthError = useCallback(
		(error: string) => {
			setLinkingLoading(false);
			const errorMessage = AccountSecurityErrorHandler.getDisplayMessage(error, "linking");
			onError(errorMessage);

			// Clear optimistic update on error
			setOptimisticSecurityStatus(null);
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
	 * Handle Google account linking - starts OAuth flow with optimistic updates
	 */
	const handleLinkGoogle = useCallback(() => {
		setLinkingLoading(true);

		// Optimistic update: show linked state while operation is in progress
		if (securityStatus) {
			setOptimisticSecurityStatus({
				...securityStatus,
				google_auth_linked: true,
				google_email: "linking..." // Temporary placeholder
			});
		}

		triggerOAuth();
	}, [triggerOAuth, securityStatus]);

	/**
	 * Handle Google account unlinking with password confirmation, enhanced error handling, and timeout
	 */
	const handleUnlinkGoogle = useCallback(
		async (password: string) => {
			const TIMEOUT_MS = 10000; // 10 second timeout for unlinking
			let timeoutId: NodeJS.Timeout | undefined;

			try {
				setUnlinkingLoading(true);

				const unlinkRequest: UnlinkGoogleAccountRequest = {
					password
				};

				// Create timeout promise
				const timeoutPromise = new Promise<never>((_, reject) => {
					timeoutId = setTimeout(() => {
						reject(new Error("Unlinking timed out. Please try again."));
					}, TIMEOUT_MS);
				});

				// Race between the API call and timeout
				await Promise.race([UserService.unlinkGoogleAccount(unlinkRequest), timeoutPromise]);

				await loadSecurityStatus(); // Refresh status
				onSecurityUpdate();

				// Show success toast with confirmation message
				showSuccess("Google account unlinked successfully. Your account now uses email authentication only.");
			} catch (err) {
				// Re-throw with enhanced error message for component to handle
				const errorMessage = AccountSecurityErrorHandler.getDisplayMessage(err as Error, "unlinking");
				throw new Error(errorMessage);
			} finally {
				setUnlinkingLoading(false);
				if (timeoutId) clearTimeout(timeoutId);
			}
		},
		[loadSecurityStatus, onSecurityUpdate, showSuccess]
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
		errorResolution,

		// Google linking state
		linkingLoading,
		unlinkingLoading,

		// Google OAuth state
		googleOAuthReady,
		oauthLoading,

		// Optimistic update state
		optimisticSecurityStatus,

		// Actions
		loadSecurityStatus,
		handleLinkGoogle,
		handleUnlinkGoogle
	};
}
