import React, { useState, useEffect } from "react";
import NavigationPanel from "./NavigationPanel";
import FlyoutNavigation from "./FlyoutNavigation";
import EmailVerificationResendButton from "./EmailVerificationResendButton";
import Button from "./atoms/Button";
import type { AuthUser } from "../types";
import { getPendingVerification } from "../utils/pendingVerification";

// Success message persistence utilities
const SUCCESS_MESSAGE_STORAGE_KEY = "emailVerificationSuccess";

interface SuccessMessageData {
	email: string;
	expiresAt: number; // timestamp
}

const saveSuccessMessage = (email: string, durationSeconds: number): void => {
	const expiresAt = Date.now() + durationSeconds * 1000;
	const data: SuccessMessageData = { email, expiresAt };
	localStorage.setItem(SUCCESS_MESSAGE_STORAGE_KEY, JSON.stringify(data));
};

const getSuccessMessage = (email: string): boolean => {
	try {
		const stored = localStorage.getItem(SUCCESS_MESSAGE_STORAGE_KEY);
		if (!stored) return false;

		const data: SuccessMessageData = JSON.parse(stored);
		if (data.email !== email) return false;

		const isActive = data.expiresAt > Date.now();
		if (!isActive) {
			localStorage.removeItem(SUCCESS_MESSAGE_STORAGE_KEY);
			return false;
		}

		return true;
	} catch {
		localStorage.removeItem(SUCCESS_MESSAGE_STORAGE_KEY);
		return false;
	}
};

const clearSuccessMessage = (): void => {
	localStorage.removeItem(SUCCESS_MESSAGE_STORAGE_KEY);
};

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
	onShowVerification?: (email: string) => void;
	auth: Auth;
}

const Header: React.FC<HeaderProps> = ({
	currentPage,
	onPageChange,
	onShowRegistration,
	onShowSignIn,
	onShowVerification,
	auth
}) => {
	const [pendingVerification, setPendingVerificationState] = useState(getPendingVerification());
	const [resendSuccess, setResendSuccess] = useState(false);

	// Note: Cross-tab redirect listener is now set up globally in main.tsx
	// to avoid React lifecycle race conditions

	// Determine verification email
	const verificationEmail = auth.isAuthenticated && auth.user ? auth.user.email : pendingVerification?.email || "";

	// Check for persisted success state on mount and when email changes
	useEffect(() => {
		if (verificationEmail) {
			const hasPersistedSuccess = getSuccessMessage(verificationEmail);
			setResendSuccess(hasPersistedSuccess);
		}
	}, [verificationEmail]);

	// Periodic check to clear expired success state
	useEffect(() => {
		if (!verificationEmail) return;

		const checkSuccessState = () => {
			const hasPersistedSuccess = getSuccessMessage(verificationEmail);
			if (!hasPersistedSuccess && resendSuccess) {
				setResendSuccess(false);
			}
		};

		// Check every 5 seconds for expiration
		const interval = setInterval(checkSuccessState, 5000);

		return () => clearInterval(interval);
	}, [verificationEmail, resendSuccess]);

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

	const handleResendSuccess = () => {
		setResendSuccess(true);
		// Save success state to localStorage for persistence
		if (verificationEmail) {
			saveSuccessMessage(verificationEmail, 60); // 60 seconds duration
		}
		// Hide success message after 60 seconds (rate limit period)
		setTimeout(() => {
			setResendSuccess(false);
			clearSuccessMessage();
		}, 60000);
	};

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
			<div className="flex flex-1 items-center justify-end gap-2">
				{/* Email verification notice */}
				{shouldShowVerificationNotice && verificationEmail && (
					<div className="flex items-center gap-1.5">
						<span className={`text-sm font-medium ${resendSuccess ? "text-success" : "text-warning"}`}>
							{resendSuccess
								? `Verification email sent to ${verificationEmail}!`
								: "Email verification required"}
						</span>
						{onShowVerification && (
							<Button
								variant="secondary"
								onClick={() => onShowVerification(verificationEmail)}
								className="!bg-interactive hover:!bg-interactive-hover hover:!text-text-primary ml-2 w-[80px] justify-center !border-none !px-2 !py-1 text-center text-xs whitespace-nowrap !text-white"
							>
								Enter Code
							</Button>
						)}
						<EmailVerificationResendButton
							userEmail={verificationEmail}
							onResendSuccess={handleResendSuccess}
						/>
					</div>
				)}

				<NavigationPanel
					onPageChange={onPageChange}
					onShowRegistration={onShowRegistration}
					onShowSignIn={onShowSignIn}
					auth={auth}
					pendingVerification={pendingVerification}
				/>
			</div>
		</header>
	);
};

export default Header;
