/**
 * Simple cross-tab redirect utility using BroadcastChannel
 * Singleton pattern to avoid React hook dependency issues
 */

// Global state to track if listener is already set up
let listenerSetup = false;
let channel: BroadcastChannel | null = null;

// Initialize the BroadcastChannel
function initChannel() {
	if (!channel) {
		if (typeof BroadcastChannel === 'undefined') {
			console.error("🔥 BroadcastChannel is not supported in this browser!");
			return null;
		}
		
		channel = new BroadcastChannel("email-verification");
		console.log("🔥 BroadcastChannel created (singleton):", channel);
	}
	return channel;
}

/**
 * Set up cross-tab redirect listener (call once per tab)
 */
export function setupCrossTabRedirectListener(): void {
	if (listenerSetup) {
		console.log("🔥 Cross-tab listener already set up, skipping");
		return;
	}

	const broadcastChannel = initChannel();
	if (!broadcastChannel) return;

	const handleMessage = (event: MessageEvent) => {
		console.log("🔥 Cross-tab message received:", event.data);
		
		if (event.data?.action === "redirect") {
			const { url = "/", reason, message } = event.data;
			console.log(`🔥 REDIRECTING tab to ${url} due to ${reason}: ${message || "No message"}`);
			window.location.href = url;
		}
	};

	console.log("🔥 Setting up cross-tab redirect listener (singleton)");
	broadcastChannel.addEventListener("message", handleMessage);
	listenerSetup = true;

	// Cleanup on page unload
	window.addEventListener("beforeunload", () => {
		if (broadcastChannel) {
			broadcastChannel.removeEventListener("message", handleMessage);
			console.log("🔥 Removed cross-tab listener on page unload");
		}
	});
}

/**
 * Send redirect request to other tabs
 */
export function requestCrossTabRedirect(
	reason: "success" | "failure" | "error",
	url: string = "/",
	message?: string
): void {
	const broadcastChannel = initChannel();
	if (!broadcastChannel) return;

	const redirectMessage = {
		action: "redirect",
		url,
		reason,
		message
	};

	try {
		console.log("🔥 SENDING cross-tab redirect message:", redirectMessage);
		broadcastChannel.postMessage(redirectMessage);
		console.log("🔥 Cross-tab redirect message sent successfully");
	} catch (error) {
		console.warn("🔥 Failed to send cross-tab redirect message:", error);
	}
}