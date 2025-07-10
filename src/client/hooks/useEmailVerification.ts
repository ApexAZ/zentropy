import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "../utils/logger";

interface EmailVerificationState {
	isVerifying: boolean;
	error: string | null;
	success: boolean;
	token: string | null;
}

interface EmailVerificationCallbacks {
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
	onRedirectHome?: () => void;
	onShowSignIn?: () => void;
}

interface UseEmailVerificationReturn {
	state: EmailVerificationState;
	clearState: () => void;
}

/**
 * Custom hook for handling email verification from URL tokens
 *
 * Automatically detects email verification tokens in the URL path,
 * makes API calls to verify the email, handles success/error states,
 * and provides callbacks for UI actions.
 *
 * @param callbacks - Optional callbacks for handling verification results
 * @returns Object containing verification state and utility functions
 */
export function useEmailVerification(callbacks: EmailVerificationCallbacks = {}): UseEmailVerificationReturn {
	const [state, setState] = useState<EmailVerificationState>({
		isVerifying: false,
		error: null,
		success: false,
		token: null
	});

	const verificationAttempted = useRef<Set<string>>(new Set());
	// Use refs to store current callbacks to avoid dependency issues
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

	const clearState = useCallback(() => {
		setState({
			isVerifying: false,
			error: null,
			success: false,
			token: null
		});
	}, []);

	const verifyEmailToken = useCallback(
		async (token: string) => {
			logger.info("Email verification started", { token });

			setState(prev => ({
				...prev,
				isVerifying: true,
				error: null,
				token
			}));

			try {
				const response = await fetch(`/api/v1/auth/verify-email/${token}`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					}
				});

				logger.info("Verification response received", {
					status: response.status,
					ok: response.ok
				});

				// Get current callbacks from ref
				const { onSuccess, onError, onRedirectHome, onShowSignIn } = callbacksRef.current;

				// Clean URL immediately
				window.history.pushState({}, "", "/");
				onRedirectHome?.();

				if (response.ok) {
					// Success
					logger.info("Email verification successful");
					setState(prev => ({
						...prev,
						isVerifying: false,
						success: true
					}));

					const successMessage = "Email verified successfully! Please sign in.";
					onSuccess?.(successMessage);
					onShowSignIn?.();
				} else {
					// API Error
					const errorData = await response.json();
					logger.warn("Email verification failed", { errorData });

					const errorMessage = errorData.detail || "Email verification failed. Please try again.";
					setState(prev => ({
						...prev,
						isVerifying: false,
						error: errorMessage
					}));

					onError?.(errorMessage);
					onShowSignIn?.();
				}
			} catch (error) {
				// Network Error
				logger.error("Network error during verification", { error });

				// Get current callbacks from ref
				const { onError, onRedirectHome, onShowSignIn } = callbacksRef.current;

				// Clean URL in case of network error
				window.history.pushState({}, "", "/");
				onRedirectHome?.();

				const errorMessage = "Network error during email verification. Please try again.";
				setState(prev => ({
					...prev,
					isVerifying: false,
					error: errorMessage
				}));

				onError?.(errorMessage);
				onShowSignIn?.();
			}
		},
		[] // No dependencies - use callbacksRef.current inside the function
	);

	// Auto-detect email verification tokens in URL - run only once on mount
	useEffect(() => {
		logger.debug("Email verification useEffect running", {
			pathname: window.location.pathname
		});

		const pathSegments = window.location.pathname.split("/");
		if (pathSegments[1] === "verify-email" && pathSegments[2]) {
			const token = pathSegments[2];

			// Check if we've already attempted verification for this token
			if (verificationAttempted.current.has(token)) {
				logger.debug("Skipping duplicate verification attempt", { token });
				return;
			}

			logger.info("Email verification token detected", { token });
			verificationAttempted.current.add(token);
			verifyEmailToken(token);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Remove verifyEmailToken dependency to prevent infinite loop

	return {
		state,
		clearState
	};
}
