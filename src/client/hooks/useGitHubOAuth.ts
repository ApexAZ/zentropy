import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../utils/logger";

interface UseGitHubOAuthProps {
	onSuccess: (credential: string) => void;
	onError?: (error: string) => void;
}

interface UseGitHubOAuthReturn {
	isReady: boolean;
	isLoading: boolean;
	error: string | null;
	triggerOAuth: () => void;
	clearError: () => void;
}

export const useGitHubOAuth = ({ onSuccess, onError }: UseGitHubOAuthProps): UseGitHubOAuthReturn => {
	const [isReady, setIsReady] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const initializedRef = useRef(false);

	const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Validate required environment variables on mount
	useEffect(() => {
		if (!clientId) {
			const errorMessage = "VITE_GITHUB_CLIENT_ID is not configured in environment variables";
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [clientId, onError]);

	// Initialize GitHub OAuth when component mounts
	useEffect(() => {
		if (initializedRef.current || !clientId) return;

		const initializeGitHubOAuth = () => {
			try {
				logger.info("Initializing GitHub OAuth (mock)", { clientId, origin: window.location.origin });

				// Mock successful initialization
				setIsReady(true);
				setError(null);
				initializedRef.current = true;
				logger.info("GitHub OAuth initialized successfully (mock)");
			} catch (err) {
				const errorMessage = "Failed to initialize GitHub OAuth";
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			}
		};

		// For mock implementation, initialize immediately
		initializeGitHubOAuth();
	}, [clientId, onError]);

	const triggerOAuth = useCallback(() => {
		// Clear any previous errors before starting
		setError(null);

		if (!isReady) {
			const errorMessage = "GitHub Sign-In not available";
			logger.error(errorMessage);
			setError(errorMessage);
			onError?.(errorMessage);
			return;
		}

		try {
			setIsLoading(true);
			logger.info("Starting GitHub OAuth flow (mock)");

			// TODO: Replace with real GitHub OAuth implementation
			// For now, simulate OAuth flow with mock credential (immediate for tests)
			try {
				const mockCredential = "mock-github-credential-" + Date.now();
				logger.info("GitHub OAuth completed successfully (mock)", { credential: mockCredential });
				onSuccess(mockCredential);
			} catch (err) {
				const errorMessage = "GitHub OAuth callback failed";
				logger.error(errorMessage, { err });
				setError(errorMessage);
				onError?.(errorMessage);
			} finally {
				setIsLoading(false);
			}
		} catch (err) {
			const errorMessage = "Failed to start GitHub Sign-In";
			logger.error(errorMessage, { err });
			setIsLoading(false);
			setError(errorMessage);
			onError?.(errorMessage);
		}
	}, [isReady, onSuccess, onError]);

	return {
		isReady: isReady && !error,
		isLoading,
		error,
		triggerOAuth,
		clearError
	};
};
