/**
 * Utility functions for managing pending email verification state
 * Tracks users who have registered but not yet verified their email
 * State persists in localStorage for 24 hours
 */

const PENDING_VERIFICATION_KEY = "pendingEmailVerification";
const TAB_FOCUS_REQUEST_KEY = "appTabFocusRequest";
const TAB_CLOSURE_REQUEST_KEY = "appTabClosureRequest";
const VERIFICATION_EXPIRY_HOURS = 24;

interface PendingVerificationState {
	email: string;
	timestamp: number;
}

/**
 * Set pending verification state after user registration
 * @param email - Email address that needs verification
 */
export function setPendingVerification(email: string): void {
	const state: PendingVerificationState = {
		email,
		timestamp: Date.now()
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
 */
export function clearPendingVerification(): void {
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
 * Request focus on existing app tab (if any)
 * Uses localStorage to communicate across tabs
 * @returns void
 */
export function requestAppTabFocus(): void {
	try {
		// Send focus request to other tabs
		localStorage.setItem(TAB_FOCUS_REQUEST_KEY, Date.now().toString());

		// Clean up the request after a short delay
		setTimeout(() => {
			localStorage.removeItem(TAB_FOCUS_REQUEST_KEY);
		}, 1000);
	} catch (error) {
		// Silently handle localStorage errors
		console.warn("Failed to request app tab focus:", error);
	}
}

/**
 * Request closure of existing app tabs
 * Used when email verification succeeds to ensure only one tab remains
 * Uses localStorage to communicate across tabs
 * @returns void
 */
export function requestAppTabClosure(): void {
	try {
		// Send closure request to other tabs
		localStorage.setItem(TAB_CLOSURE_REQUEST_KEY, Date.now().toString());

		// Clean up the request after a short delay
		setTimeout(() => {
			localStorage.removeItem(TAB_CLOSURE_REQUEST_KEY);
		}, 1000);
	} catch (error) {
		// Silently handle localStorage errors
		console.warn("Failed to request app tab closure:", error);
	}
}
