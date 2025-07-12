import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// ===== URL DEBUG LOGGING =====
console.log("🔥🔥🔥 MAIN.TSX: Initial URL at script start:", window.location.href);
console.log("🔥🔥🔥 MAIN.TSX: Initial pathname:", window.location.pathname);

// Add URL monitoring to catch any changes
let lastUrl = window.location.href;
const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function(...args) {
	console.log("🔥🔥🔥 HISTORY.PUSHSTATE called:", args);
	console.log("🔥🔥🔥 URL BEFORE pushState:", window.location.href);
	const result = originalPushState.apply(this, args);
	console.log("🔥🔥🔥 URL AFTER pushState:", window.location.href);
	return result;
};

window.history.replaceState = function(...args) {
	console.log("🔥🔥🔥 HISTORY.REPLACESTATE called:", args);
	console.log("🔥🔥🔥 URL BEFORE replaceState:", window.location.href);
	const result = originalReplaceState.apply(this, args);
	console.log("🔥🔥🔥 URL AFTER replaceState:", window.location.href);
	return result;
};

// Monitor for any URL changes
setInterval(() => {
	if (window.location.href !== lastUrl) {
		console.log("🔥🔥🔥 URL CHANGED DETECTED!");
		console.log("🔥🔥🔥 OLD URL:", lastUrl);
		console.log("🔥🔥🔥 NEW URL:", window.location.href);
		console.log("🔥🔥🔥 STACK TRACE:", new Error().stack);
		lastUrl = window.location.href;
	}
}, 50);

// Add logging when window loads
window.addEventListener('load', () => {
	console.log("🔥🔥🔥 WINDOW LOAD EVENT - URL:", window.location.href);
});

// Add logging for navigation events
window.addEventListener('beforeunload', () => {
	console.log("🔥🔥🔥 BEFORE UNLOAD - URL:", window.location.href);
});

window.addEventListener('popstate', (e) => {
	console.log("🔥🔥🔥 POPSTATE EVENT - URL:", window.location.href, "State:", e.state);
});

// ===== GLOBAL CROSS-TAB REDIRECT LISTENER =====
// Set up BroadcastChannel listener ONCE, outside of React lifecycle
// This prevents race conditions with component re-renders
console.log("🔥 Setting up GLOBAL BroadcastChannel listener (outside React)");

if (typeof BroadcastChannel !== 'undefined') {
	const globalVerificationChannel = new BroadcastChannel("email-verification");
	
	globalVerificationChannel.onmessage = (event) => {
		console.log("🔥 GLOBAL broadcast message received:", event.data);
		console.log("🔥 CURRENT URL when message received:", window.location.href);
		
		if (event.data?.action === 'redirect') {
			const { url = "/", reason, message } = event.data;
			console.log(`🔥 GLOBAL REDIRECT to ${url} due to ${reason}: ${message || "No message"}`);
			console.log("🔥 URL BEFORE redirect:", window.location.href);
			window.location.href = url;
		}
	};
	
	console.log("🔥 Global BroadcastChannel listener set up successfully");
} else {
	console.error("🔥 BroadcastChannel not supported in this browser");
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
