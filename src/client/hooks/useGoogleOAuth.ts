import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../utils/logger";
import type { GoogleCredentialResponse, GoogleOAuthNotification } from "../types/global";

interface UseGoogleOAuthProps {
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseGoogleOAuthReturn {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	triggerOAuth: () => void;
	clearError: () => void;
}

export const useGoogleOAuth = ({ onSuccess, onError }: UseGoogleOAuthProps): UseGoogleOAuthReturn => {
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const initializedRef = useRef(false);

	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Validate required environment variables on mount
	useEffect(() => {
		if (!clientId) {
			const errorMessage = "VITE_GOOGLE_CLIENT_ID is not configured in environment variables";
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [clientId, onError]);

	const handleCredentialResponse = useCallback(
		async (response: GoogleCredentialResponse) => {
			setIsLoading(true);
			setError(null);

			try {
				if (!response.credential) {
					throw new Error("No credential received from Google");
				}

				onSuccess(response.credential);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Google OAuth failed";
				setError(errorMessage);
				onError?.(errorMessage);
			} finally {
				setIsLoading(false);
			}
		},
		[onSuccess, onError]
	);

	// Initialize Google OAuth when component mounts

	useEffect(() => {
		if (initializedRef.current) return;

		const initializeGoogleOAuth = () => {
			setError(null); // Clear any previous errors
			
			if (!window.google?.accounts?.id) {
				const errorMessage = "Google Identity Services not available";
				logger.error(errorMessage);
				setError(errorMessage);
				onError?.(errorMessage);
				return;
			}

			if (!clientId) {
				const errorMessage = "Google Sign-In not configured";
				logger.error(errorMessage);
				setError(errorMessage);
				onError?.(errorMessage);
				return;
			}

			try {
				logger.info("Initializing Google OAuth", { clientId, origin: window.location.origin });

				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: handleCredentialResponse,
					auto_select: false,
					cancel_on_tap_outside: true
				});

				setIsReady(true);
				setError(null);
				initializedRef.current = true;
				logger.info("Google OAuth initialized successfully");
			} catch (err) {
				const errorMessage = "Failed to initialize Google OAuth";
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			}
		};

		// Check if Google Identity Services is already loaded
		if (window.google?.accounts?.id) {
			logger.debug("Google Identity Services already loaded");
			initializeGoogleOAuth();
			return undefined;
		} else {
			logger.debug("Waiting for Google Identity Services to load");
			// Wait for Google Identity Services to load
			const checkGoogleLoaded = setInterval(() => {
				if (window.google?.accounts?.id) {
					logger.debug("Google Identity Services loaded successfully");
					clearInterval(checkGoogleLoaded);
					initializeGoogleOAuth();
				}
			}, 100);

			// Extended timeout to 30 seconds for slower connections
			setTimeout(() => {
				clearInterval(checkGoogleLoaded);
				if (!isReady && !initializedRef.current) {
					const errorMessage = "Google Identity Services failed to load after 30 seconds";
					logger.error(errorMessage);
					setError(errorMessage);
					onError?.(errorMessage);
				}
			}, 30000);

			return () => clearInterval(checkGoogleLoaded);
		}
	}, [clientId, onError, isReady, handleCredentialResponse]);

	const triggerOAuth = useCallback(() => {
		// Clear any previous errors before starting
		setError(null);
		
		if (!isReady || !window.google?.accounts?.id) {
			const errorMessage = "Google Sign-In not available";
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
			return;
		}

		try {
			setIsLoading(true);

			// Use popup-based OAuth instead of embedded button
			window.google.accounts.id.prompt((notification: GoogleOAuthNotification) => {
				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					// Fallback: user dismissed or popup blocked
					const errorMessage = "Google Sign-In was cancelled or blocked";
					setIsLoading(false);
					setError(errorMessage);
					onError?.(errorMessage);
				}
			});
		} catch (err) {
			const errorMessage = "Failed to start Google Sign-In";
			logger.error(errorMessage, { err });
			setIsLoading(false);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [isReady, onError]);

	return {
		isReady: isReady && !error,
		isLoading,
		error,
		triggerOAuth,
		clearError
	};
};
