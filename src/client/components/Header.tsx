import React, { useState, useEffect } from "react";
import NavigationPanel from "./NavigationPanel";
import FlyoutNavigation from "./FlyoutNavigation";
import EmailVerificationResendButton from "./EmailVerificationResendButton";
import type { AuthUser } from "../types";
import { getPendingVerification } from "../utils/pendingVerification";

type Page = "home" | "about" | "contact" | "profile" | "teams" | "calendar" | "dashboard" | "team-configuration";

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser) => void;
	logout: () => Promise<void>;
}

interface HeaderProps {
	currentPage: Page;
	onPageChange: (page: Page) => void;
	onShowRegistration: () => void;
	onShowSignIn: () => void;
	auth: Auth;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, onShowRegistration, onShowSignIn, auth }) => {
	const [pendingVerification, setPendingVerificationState] = useState(getPendingVerification());

	// Note: Cross-tab redirect listener is now set up globally in main.tsx
	// to avoid React lifecycle race conditions

	// Check for pending verification state changes
	useEffect(() => {
		const checkPendingVerification = () => {
			setPendingVerificationState(getPendingVerification());
		};

		// Check immediately
		checkPendingVerification();

		// Set up periodic checking to handle expiration (every minute)
		const interval = setInterval(checkPendingVerification, 60000);

		// Listen for custom pending verification events (immediate updates)
		const handlePendingVerificationChange = () => {
			checkPendingVerification();
		};

		// Listen for storage changes for pending verification updates only
		// (Cross-tab communication now handled by BroadcastChannel)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "pendingEmailVerification") {
				checkPendingVerification();
			}
		};

		window.addEventListener("pendingVerificationChanged", handlePendingVerificationChange);
		window.addEventListener("storage", handleStorageChange);

		return () => {
			clearInterval(interval);
			window.removeEventListener("pendingVerificationChanged", handlePendingVerificationChange);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	// Determine if we should show the email verification notice
	const shouldShowVerificationNotice =
		// Authenticated user with unverified email
		(auth.isAuthenticated && auth.user && !auth.user.email_verified) ||
		// OR unauthenticated user with pending verification
		(!auth.isAuthenticated && pendingVerification);

	const verificationEmail = auth.isAuthenticated && auth.user ? auth.user.email : pendingVerification?.email || "";

	return (
		<header className="border-layout-background bg-content-background flex w-full items-center border-b px-8 py-4 shadow-sm">
			{/* Left side - Flyout navigation */}
			<div className="flex flex-1 items-center">
				<FlyoutNavigation currentPage={currentPage} onPageChange={onPageChange} />
			</div>

			{/* Center - Zentropy logo */}
			<h1 className="m-0 flex-shrink-0 text-3xl">
				<button
					onClick={() => onPageChange("home")}
					className="text-interactive cursor-pointer border-none bg-transparent p-0 text-3xl font-bold no-underline"
				>
					Zentropy
				</button>
			</h1>

			{/* Right side - Email verification + Auth navigation */}
			<div className="flex flex-1 items-center justify-end gap-4">
				{/* Email verification notice */}
				{shouldShowVerificationNotice && verificationEmail && (
					<div className="flex items-center gap-3">
						<span className="text-warning text-lg font-medium">Email verification required</span>
						<EmailVerificationResendButton userEmail={verificationEmail} />
					</div>
				)}

				<NavigationPanel
					onPageChange={onPageChange}
					onShowRegistration={onShowRegistration}
					onShowSignIn={onShowSignIn}
					auth={auth}
				/>
			</div>
		</header>
	);
};

export default Header;
