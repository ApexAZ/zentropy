import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "../utils/logger";
import { clearPendingVerification } from "../utils/pendingVerification";
import { requestCrossTabRedirect } from "../utils/crossTabRedirect";

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
			console.log("🔥 VERIFICATION: verifyEmailToken called with token:", token);
			logger.info("Email verification started", { token });

			setState(prev => ({
				...prev,
				isVerifying: true,
				error: null,
				token
			}));

			try {
				const response = await fetch(`/api/v1/auth/verify/${token}`, {
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

				if (response.ok) {
					// Success - clear pending verification state
					logger.info("Email verification successful");
					clearPendingVerification();

					setState(prev => ({
						...prev,
						isVerifying: false,
						success: true
					}));

					const successMessage = "Email verified successfully! Please sign in.";
					onSuccess?.(successMessage);

					// Request other tabs to redirect to home page for clean single-tab experience
					requestCrossTabRedirect("success", "/", "Email verification successful");

					// Clean URL and redirect AFTER successful verification
					window.history.pushState({}, "", "/");
					onRedirectHome?.();

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

					// Request other tabs to redirect to home page even for failed verification
					requestCrossTabRedirect("failure", "/", errorMessage);

					// Clean URL and redirect AFTER failed verification
					window.history.pushState({}, "", "/");
					onRedirectHome?.();

					onError?.(errorMessage);
					// Do not open login modal on verification failure - keep user on main page with resend button
				}
			} catch (error) {
				// Network Error
				logger.error("Network error during verification", { error });

				// Get current callbacks from ref
				const { onError, onRedirectHome } = callbacksRef.current;

				const errorMessage = "Network error during email verification. Please try again.";
				setState(prev => ({
					...prev,
					isVerifying: false,
					error: errorMessage
				}));

				// Request other tabs to redirect to home page even for network errors
				requestCrossTabRedirect("error", "/", errorMessage);

				// Clean URL and redirect AFTER network error
				window.history.pushState({}, "", "/");
				onRedirectHome?.();

				onError?.(errorMessage);
				// Do not open login modal on network error - keep user on main page with resend button
			}
		},
		[] // No dependencies - use callbacksRef.current inside the function
	);

	// Auto-detect email verification tokens in URL - run only once on mount
	useEffect(() => {
		console.log("🔥 VERIFICATION: useEffect running with URL:", window.location.href);
		logger.debug("Email verification useEffect running", {
			pathname: window.location.pathname
		});

		const pathSegments = window.location.pathname.split("/");
		console.log("🔥 VERIFICATION: Path segments:", pathSegments);
		
		if (pathSegments[1] === "verify" && pathSegments[2]) {
			const token = pathSegments[2];
			console.log("🔥 VERIFICATION: Token detected:", token);

			// Check if we've already attempted verification for this token
			if (verificationAttempted.current.has(token)) {
				console.log("🔥 VERIFICATION: Skipping duplicate for token:", token);
				logger.debug("Skipping duplicate verification attempt", { token });
				return;
			}

			console.log("🔥 VERIFICATION: Starting verification for token:", token);
			logger.info("Email verification token detected", { token });
			verificationAttempted.current.add(token);
			verifyEmailToken(token);
		} else {
			console.log("🔥 VERIFICATION: No token found in URL");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Remove verifyEmailToken dependency to prevent infinite loop

	return {
		state,
		clearState
	};
}
