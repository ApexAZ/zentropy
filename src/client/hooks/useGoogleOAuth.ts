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

// 🚀 PERFORMANCE PATTERN: Environment-Aware Hook Design
// ✅ Auto-detects test environment and returns mock data for fast, deterministic tests
// ✅ Preserves full production OAuth functionality in development and production

function isTestEnvironment(): boolean {
	// 🎯 EXPLICIT DETECTION: Only return mocks when explicitly requested
	// ✅ Hook unit tests get production logic by default (renderHook)
	// ✅ Component tests can opt-in via VITE_OAUTH_MOCK_MODE=true
	// ✅ Avoids false positives with automatic detection

	// Only detection: Explicit opt-in via environment variable
	if (import.meta.env.VITE_OAUTH_MOCK_MODE === "true") {
		return true;
	}

	return false;
}

function createTestMockResponse(): UseGoogleOAuthReturn {
	logger.debug("useGoogleOAuth: Test environment detected, returning mock implementation");

	return {
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: () => {
			logger.debug("useGoogleOAuth: Mock triggerOAuth called");
			// In test mode, immediately simulate successful OAuth
			// Tests can override this behavior with vi.mock if needed
		},
		clearError: () => {
			logger.debug("useGoogleOAuth: Mock clearError called");
		}
	};
}

export const useGoogleOAuth = ({ onSuccess, onError }: UseGoogleOAuthProps): UseGoogleOAuthReturn => {
	// 🚀 ALWAYS CALL HOOKS FIRST (Rules of Hooks compliance)
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const initializedRef = useRef(false);

	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const handleCredentialResponse = useCallback(
		(response: GoogleCredentialResponse) => {
			logger.debug("Google OAuth credential response received");
			try {
				if (!response.credential) {
					throw new Error("No credential received from Google OAuth");
				}
				onSuccess(response.credential);
			} catch (err) {
				const errorMessage = "Failed to process Google OAuth credential";
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			} finally {
				setIsLoading(false);
			}
		},
		[onSuccess, onError]
	);

	// Validate required environment variables on mount
	useEffect(() => {
		if (!clientId) {
			const errorMessage =
				"Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID environment variable.";
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
			return;
		}
	}, [clientId, onError]);

	useEffect(() => {
		if (!clientId || initializedRef.current) {
			return;
		}

		const initializeGoogleOAuth = () => {
			try {
				logger.debug("Initializing Google OAuth");
				if (!window.google?.accounts?.id) {
					throw new Error("Google Identity Services not available");
				}

				window.google.accounts.id.initialize({
					client_id: clientId,
					callback: handleCredentialResponse,
					auto_select: false,
					cancel_on_tap_outside: true
				});

				setIsReady(true);
				initializedRef.current = true;
				logger.debug("Google OAuth initialized successfully");
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
			logger.debug("Triggering Google OAuth popup");

			// Use prompt method for popup-based OAuth
			window.google.accounts.id.prompt((notification: GoogleOAuthNotification) => {
				logger.debug("Google OAuth notification received", { notification });

				if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
					// User dismissed the popup or it wasn't shown
					setIsLoading(false);
					const errorMessage = "Google Sign-In was dismissed or unavailable";
					logger.warn(errorMessage);
					setError(errorMessage);
					onError?.(errorMessage);
				}
			});
		} catch (err) {
			setIsLoading(false);
			const errorMessage = "Failed to trigger Google OAuth";
			logger.error(errorMessage, { err });
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [isReady, onError]);

	// 🚀 ENVIRONMENT-AWARE RESPONSE
	// ✅ Return deterministic mocks in test environment
	if (isTestEnvironment()) {
		return createTestMockResponse();
	}

	return {
		isReady,
		isLoading,
		error,
		triggerOAuth,
		clearError
	};
};
