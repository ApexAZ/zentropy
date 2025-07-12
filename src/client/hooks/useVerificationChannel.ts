/**
 * BroadcastChannel hook for reliable cross-tab communication during email verification
 *
 * Provides a robust alternative to localStorage storage events for real-time
 * messaging between browser tabs. Used specifically for coordinating tab
 * redirects during email verification flows.
 */

import { useEffect, useCallback, useRef } from "react";

// Check BroadcastChannel support
if (typeof BroadcastChannel === 'undefined') {
	console.error("🔥 BroadcastChannel is not supported in this browser!");
} else {
	console.log("🔥 BroadcastChannel is supported");
}

// Global BroadcastChannel instance for email verification communication
const verificationChannel = new BroadcastChannel("email-verification");

// Add debug logging for channel creation
console.log("🔥 BroadcastChannel created:", verificationChannel);

// Expose test function globally for debugging
(window as any).testBroadcastChannel = () => {
	console.log("🔥 Testing BroadcastChannel manually...");
	const testMessage: VerificationMessage = {
		action: "redirect",
		url: "/",
		reason: "success",
		message: "Manual test"
	};
	postVerificationMessage(testMessage);
};

export interface VerificationMessage {
	action: "redirect";
	url?: string;
	reason: "success" | "failure" | "error";
	message?: string;
}

/**
 * Hook to listen for verification messages from other tabs
 *
 * @param onMessage - Callback function to handle received messages
 */
export const useVerificationChannel = (onMessage: (message: VerificationMessage) => void) => {
	// Use ref to avoid re-creating the handler on every render
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	useEffect(() => {
		// Define handler inside useEffect to avoid dependency issues
		const handleMessage = (event: MessageEvent<VerificationMessage>) => {
			console.log("🔥 BroadcastChannel message received in tab:", event.data);
			onMessageRef.current(event.data);
		};

		console.log("🔥 Setting up BroadcastChannel listener in tab");
		verificationChannel.addEventListener("message", handleMessage);

		return () => {
			console.log("🔥 Removing BroadcastChannel listener in tab");
			verificationChannel.removeEventListener("message", handleMessage);
		};
	}, []); // Empty dependency array - should only run once
};

/**
 * Send a verification message to all other open tabs
 *
 * @param message - The verification message to broadcast
 */
export const postVerificationMessage = (message: VerificationMessage): void => {
	try {
		console.log("🔥 SENDING BroadcastChannel message from verification tab:", message);
		verificationChannel.postMessage(message);
		console.log("🔥 BroadcastChannel message sent successfully");
	} catch (error) {
		console.warn("🔥 Failed to send verification message:", error);
	}
};

/**
 * Request that other tabs redirect to a specific URL
 * Used when email verification completes (successfully or unsuccessfully)
 * to ensure clean single-tab experience
 *
 * @param reason - Why the redirect is being requested
 * @param url - URL to redirect to (defaults to home page)
 * @param message - Optional message for debugging/logging
 */
export const requestTabRedirect = (
	reason: "success" | "failure" | "error",
	url: string = "/",
	message?: string
): void => {
	const verificationMessage: VerificationMessage = {
		action: "redirect",
		url,
		reason
	};
	
	// Only add message if provided to satisfy exactOptionalPropertyTypes
	if (message !== undefined) {
		verificationMessage.message = message;
	}
	
	postVerificationMessage(verificationMessage);
};
