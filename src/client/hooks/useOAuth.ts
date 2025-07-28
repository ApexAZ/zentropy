import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../utils/logger";
import type { GoogleCredentialResponse, GoogleOAuthNotification } from "../types/global";

export interface OAuthConfig {
	provider: "google" | "microsoft" | "github";
	clientIdEnvVar: string;
	displayName: string;
}

interface UseOAuthProps {
	config: OAuthConfig;
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseOAuthReturn {
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

function createTestMockResponse(config: OAuthConfig, onSuccess?: (credential: string) => void): UseOAuthReturn {
	logger.debug(`use${config.displayName}OAuth: Test environment detected, returning mock implementation`);

	return {
		isReady: true,
		isLoading: false,
		error: null,
		triggerOAuth: () => {
			logger.debug(`use${config.displayName}OAuth: Mock triggerOAuth called`);
			// In test mode, immediately simulate successful OAuth
			// Generate a mock credential based on provider
			const mockCredential = `mock-${config.provider}-credential-${Date.now()}`;
			if (onSuccess) {
				onSuccess(mockCredential);
			}
		},
		clearError: () => {
			logger.debug(`use${config.displayName}OAuth: Mock clearError called`);
		}
	};
}

export const useOAuth = ({ config, onSuccess, onError }: UseOAuthProps): UseOAuthReturn => {
	// 🚀 ALWAYS CALL HOOKS FIRST (Rules of Hooks compliance)
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const initializedRef = useRef(false);

	const clientId = import.meta.env[config.clientIdEnvVar];

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Google-specific credential handler
	const handleCredentialResponse = useCallback(
		(response: GoogleCredentialResponse) => {
			logger.debug(`${config.displayName} OAuth credential response received`);
			try {
				if (!response.credential) {
					throw new Error(`No credential received from ${config.displayName} OAuth`);
				}
				onSuccess(response.credential);
			} catch (err) {
				const errorMessage = `Failed to process ${config.displayName} OAuth credential`;
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			} finally {
				setIsLoading(false);
			}
		},
		[config.displayName, onSuccess, onError]
	);

	// Validate required environment variables on mount
	useEffect(() => {
		if (!clientId) {
			const errorMessage = `${config.clientIdEnvVar} is not configured in environment variables`;
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [clientId, onError, config.clientIdEnvVar]);

	// Initialize OAuth when component mounts
	useEffect(() => {
		if (initializedRef.current || !clientId) return;

		const initializeOAuth = () => {
			try {
				if (config.provider === "google") {
					// Google OAuth initialization
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
				} else if (config.provider === "microsoft") {
					// Microsoft OAuth initialization - no library needed, just validate config
					logger.info("Initializing Microsoft OAuth");

					if (!clientId) {
						throw new Error("Microsoft Client ID not configured");
					}

					// Microsoft OAuth is ready immediately (no library to load)
					setIsReady(true);
					setError(null);
					initializedRef.current = true;
					logger.info("Microsoft OAuth initialized successfully");
				} else if (config.provider === "github") {
					// GitHub OAuth initialization - no library needed, just validate config
					logger.info("Initializing GitHub OAuth");

					if (!clientId) {
						throw new Error("GitHub Client ID not configured");
					}

					// GitHub OAuth is ready immediately (no library to load)
					setIsReady(true);
					setError(null);
					initializedRef.current = true;
					logger.info("GitHub OAuth initialized successfully");
				} else {
					// Other OAuth providers initialization (mock for now)
					logger.info(`Initializing ${config.displayName} OAuth (mock)`, {
						clientId,
						origin: window.location.origin
					});

					// Mock successful initialization
					setIsReady(true);
					setError(null);
					initializedRef.current = true;
					logger.info(`${config.displayName} OAuth initialized successfully (mock)`);
				}
			} catch (err) {
				const errorMessage = `Failed to initialize ${config.displayName} OAuth`;
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			}
		};

		if (config.provider === "google") {
			// Check if Google Identity Services is already loaded
			if (window.google?.accounts?.id) {
				logger.debug("Google Identity Services already loaded");
				initializeOAuth();
				return undefined;
			} else {
				logger.debug("Waiting for Google Identity Services to load");
				// Wait for Google Identity Services to load
				const checkGoogleLoaded = setInterval(() => {
					if (window.google?.accounts?.id) {
						logger.debug("Google Identity Services loaded successfully");
						clearInterval(checkGoogleLoaded);
						initializeOAuth();
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
		} else {
			// For Microsoft/GitHub, initialize immediately (mock)
			initializeOAuth();
			return undefined;
		}
	}, [clientId, onError, isReady, handleCredentialResponse, config.provider, config.displayName]);

	// Refs for cleanup
	const cleanupRef = useRef<(() => void) | null>(null);

	const triggerOAuth = useCallback(() => {
		// Clear any previous errors and cleanup before starting
		setError(null);
		cleanupRef.current?.();
		cleanupRef.current = null;

		if (!isReady) {
			const errorMessage = `${config.displayName} Sign-In not available`;
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
			return;
		}

		try {
			setIsLoading(true);

			if (config.provider === "google") {
				// Google OAuth trigger
				if (!window.google?.accounts?.id) {
					throw new Error("Google Sign-In is temporarily unavailable. Please try again in a moment.");
				}

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
			} else if (config.provider === "microsoft") {
				// Microsoft OAuth trigger using popup flow
				logger.info("Starting Microsoft OAuth flow");

				try {
					// Microsoft OAuth popup-based flow
					const redirectUri = `${window.location.origin}/oauth-redirect.html`;
					const microsoftAuthUrl =
						`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
						`client_id=${encodeURIComponent(clientId)}&` +
						`response_type=code&` +
						`redirect_uri=${encodeURIComponent(redirectUri)}&` +
						`scope=${encodeURIComponent("openid profile email User.Read")}&` +
						`response_mode=query&` +
						`state=${Date.now()}`;

					// Open popup for Microsoft OAuth
					const popup = window.open(
						microsoftAuthUrl,
						"microsoft-oauth",
						"width=500,height=600,scrollbars=yes,resizable=yes"
					);

					if (!popup) {
						throw new Error("Failed to open Microsoft OAuth popup - popup blocked");
					}

					// Listen for popup completion
					const checkClosed = setInterval(() => {
						if (popup.closed) {
							clearInterval(checkClosed);
							setIsLoading(false);
							setError("Microsoft OAuth was cancelled");
							onError?.("Microsoft OAuth was cancelled");
							cleanupRef.current = null;
						}
					}, 1000);

					// Listen for message from popup
					const messageHandler = (event: MessageEvent) => {
						if (event.origin !== window.location.origin) {
							return;
						}

						// Ignore non-OAuth messages (browser extensions, etc.)
						if (
							!event.data ||
							typeof event.data !== "object" ||
							!event.data.type ||
							typeof event.data.type !== "string" ||
							!event.data.type.includes("OAUTH")
						) {
							return;
						}

						// Handle both MICROSOFT_OAUTH_SUCCESS and UNKNOWN_OAUTH_SUCCESS (provider detection fallback)
						if (
							event.data.type === "MICROSOFT_OAUTH_SUCCESS" ||
							event.data.type === "UNKNOWN_OAUTH_SUCCESS"
						) {
							clearInterval(checkClosed);
							popup.close();
							window.removeEventListener("message", messageHandler);
							onSuccess(event.data.authorizationCode);
							setIsLoading(false);
							cleanupRef.current = null;
						} else if (
							event.data.type === "MICROSOFT_OAUTH_ERROR" ||
							event.data.type === "UNKNOWN_OAUTH_ERROR"
						) {
							clearInterval(checkClosed);
							popup.close();
							window.removeEventListener("message", messageHandler);
							setError(event.data.error);
							onError?.(event.data.error);
							setIsLoading(false);
							cleanupRef.current = null;
						}
					};

					window.addEventListener("message", messageHandler);

					// Store cleanup function
					cleanupRef.current = () => {
						clearInterval(checkClosed);
						window.removeEventListener("message", messageHandler);
						if (!popup.closed) {
							popup.close();
						}
						setIsLoading(false);
					};
				} catch (err) {
					const errorMessage = `Failed to start Microsoft OAuth`;
					logger.error(errorMessage, { err });
					setError(errorMessage);
					onError?.(errorMessage);
					setIsLoading(false);
				}
			} else if (config.provider === "github") {
				// GitHub OAuth trigger using popup flow
				logger.info("Starting GitHub OAuth flow");

				try {
					// GitHub OAuth popup-based flow
					const redirectUri = `${window.location.origin}/oauth-redirect.html`;
					const githubAuthUrl =
						`https://github.com/login/oauth/authorize?` +
						`client_id=${encodeURIComponent(clientId)}&` +
						`redirect_uri=${encodeURIComponent(redirectUri)}&` +
						`scope=${encodeURIComponent("user:email")}&` +
						`state=${Date.now()}`;

					// Open popup for GitHub OAuth
					const popup = window.open(
						githubAuthUrl,
						"github-oauth",
						"width=500,height=600,scrollbars=yes,resizable=yes"
					);

					if (!popup) {
						throw new Error("Failed to open GitHub OAuth popup - popup blocked");
					}

					// Listen for popup completion
					const checkClosed = setInterval(() => {
						if (popup.closed) {
							clearInterval(checkClosed);
							setIsLoading(false);
							setError("GitHub OAuth was cancelled");
							onError?.("GitHub OAuth was cancelled");
							cleanupRef.current = null;
						}
					}, 1000);

					// Listen for message from popup
					const messageHandler = (event: MessageEvent) => {
						if (event.origin !== window.location.origin) return;

						// Ignore non-OAuth messages (browser extensions, etc.)
						if (
							!event.data ||
							typeof event.data !== "object" ||
							!event.data.type ||
							typeof event.data.type !== "string" ||
							!event.data.type.includes("OAUTH")
						) {
							return;
						}

						// Handle both GITHUB_OAUTH_SUCCESS and UNKNOWN_OAUTH_SUCCESS (provider detection fallback)
						if (event.data.type === "GITHUB_OAUTH_SUCCESS" || event.data.type === "UNKNOWN_OAUTH_SUCCESS") {
							clearInterval(checkClosed);
							popup.close();
							window.removeEventListener("message", messageHandler);
							// Pass the authorization code to the backend for token exchange
							onSuccess(event.data.authorizationCode);
							setIsLoading(false);
							cleanupRef.current = null;
						} else if (
							event.data.type === "GITHUB_OAUTH_ERROR" ||
							event.data.type === "UNKNOWN_OAUTH_ERROR"
						) {
							clearInterval(checkClosed);
							popup.close();
							window.removeEventListener("message", messageHandler);
							setError(event.data.error);
							onError?.(event.data.error);
							setIsLoading(false);
							cleanupRef.current = null;
						}
					};

					window.addEventListener("message", messageHandler);

					// Store cleanup function
					cleanupRef.current = () => {
						clearInterval(checkClosed);
						window.removeEventListener("message", messageHandler);
						if (!popup.closed) {
							popup.close();
						}
						setIsLoading(false);
					};
				} catch (err) {
					const errorMessage = `Failed to start GitHub OAuth`;
					logger.error(errorMessage, { err });
					setError(errorMessage);
					onError?.(errorMessage);
					setIsLoading(false);
				}
			} else {
				// Other OAuth providers trigger (mock for now)
				logger.info(`Starting ${config.displayName} OAuth flow (mock)`);

				try {
					const mockCredential = `mock-${config.provider}-credential-` + Date.now();
					logger.info(`${config.displayName} OAuth completed successfully (mock)`, {
						credential: mockCredential
					});
					onSuccess(mockCredential);
				} catch (err) {
					const errorMessage = `${config.displayName} OAuth callback failed`;
					logger.error(errorMessage, { err });
					setError(errorMessage);
					onError?.(errorMessage);
				} finally {
					setIsLoading(false);
				}
			}
		} catch (err) {
			const errorMessage = `Failed to start ${config.displayName} Sign-In`;
			logger.error(errorMessage, { err });
			setIsLoading(false);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [isReady, onSuccess, onError, config.provider, config.displayName, clientId]);

	// 🚀 ENVIRONMENT-AWARE RESPONSE
	// ✅ Return deterministic mocks in test environment
	if (isTestEnvironment()) {
		return createTestMockResponse(config, onSuccess);
	}

	return {
		isReady: isReady && !error && (config.provider !== "google" || Boolean(window.google?.accounts?.id)), // Additional Google library check
		isLoading,
		error,
		triggerOAuth,
		clearError
	};
};
