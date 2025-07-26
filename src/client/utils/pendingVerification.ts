/**
 * Utility functions for managing pending email verification state
 * Tracks users who have registered but not yet verified their email, or are resetting passwords
 * State persists in localStorage for 24 hours
 */

const PENDING_VERIFICATION_KEY = "pendingEmailVerification";
const VERIFICATION_EXPIRY_HOURS = 24;

export type VerificationType = "email_verification" | "password_reset";

interface PendingVerificationState {
	email: string;
	timestamp: number;
	type?: VerificationType; // Optional for backward compatibility
}

/**
 * Set pending verification state after user registration
 * @param email - Email address that needs verification
 * @param type - Type of verification (defaults to 'email_verification' for backward compatibility)
 */
export function setPendingVerification(email: string, type: VerificationType = "email_verification"): void {
	const state: PendingVerificationState = {
		email,
		timestamp: Date.now(),
		type
	};

	localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(state));

	// Dispatch custom event for immediate UI updates
	window.dispatchEvent(
		new CustomEvent("pendingVerificationChanged", {
			detail: { type: "set", state }
		})
	);
}

/**
 * Get pending verification state if it exists and hasn't expired
 * @returns PendingVerificationState if valid, null if expired or doesn't exist
 */
export function getPendingVerification(): PendingVerificationState | null {
	try {
		const stored = localStorage.getItem(PENDING_VERIFICATION_KEY);
		if (!stored) return null;

		const state: PendingVerificationState = JSON.parse(stored);
		const now = Date.now();
		const expiryTime = state.timestamp + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000;

		// Check if expired
		if (now > expiryTime) {
			clearPendingVerification();
			return null;
		}

		// Handle backward compatibility - if no type is set, assume email_verification
		if (!state.type) {
			state.type = "email_verification";
		}

		return state;
	} catch {
		// Invalid data in localStorage, clear it
		clearPendingVerification();
		return null;
	}
}

/**
 * Clear pending verification state
 * Called when user verifies email or state expires
 * @param specificType - If provided, only clear if the pending verification matches this type
 */
export function clearPendingVerification(specificType?: VerificationType): void {
	// If a specific type is requested, check if it matches before clearing
	if (specificType) {
		const current = getPendingVerification();
		if (!current || current.type !== specificType) {
			return; // Don't clear if type doesn't match
		}
	}

	localStorage.removeItem(PENDING_VERIFICATION_KEY);

	// Dispatch custom event for immediate UI updates
	window.dispatchEvent(
		new CustomEvent("pendingVerificationChanged", {
			detail: { type: "clear", state: null }
		})
	);
}

/**
 * Check if there's a valid pending verification
 * @returns boolean indicating if user has pending verification
 */
export function hasPendingVerification(): boolean {
	return getPendingVerification() !== null;
}

/**
 * Set pending password reset state
 * @param email - Email address that needs password reset verification
 */
export function setPendingPasswordReset(email: string): void {
	setPendingVerification(email, "password_reset");
}

/**
 * Get pending password reset state if it exists and hasn't expired
 * @returns PendingVerificationState if valid password reset is pending, null otherwise
 */
export function getPendingPasswordReset(): PendingVerificationState | null {
	const state = getPendingVerification();
	return state && state.type === "password_reset" ? state : null;
}

/**
 * Get pending email verification state if it exists and hasn't expired
 * @returns PendingVerificationState if valid email verification is pending, null otherwise
 */
export function getPendingEmailVerification(): PendingVerificationState | null {
	const state = getPendingVerification();
	return state && state.type === "email_verification" ? state : null;
}

/**
 * Check if there's a valid pending password reset
 * @returns boolean indicating if user has pending password reset
 */
export function hasPendingPasswordReset(): boolean {
	return getPendingPasswordReset() !== null;
}

/**
 * Clear pending password reset state specifically
 */
export function clearPendingPasswordReset(): void {
	clearPendingVerification("password_reset");
}

// Note: Cross-tab communication functions (requestAppTabFocus, requestAppTabClosure)
// have been moved to BroadcastChannel implementation in useVerificationChannel.ts
// for more reliable real-time messaging between tabs.
