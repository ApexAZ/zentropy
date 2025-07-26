import React, { useState, useEffect } from "react";
import NavigationPanel from "./NavigationPanel";
import FlyoutNavigation from "./FlyoutNavigation";
import EmailVerificationResendButton from "./EmailVerificationResendButton";
import EmailVerificationModal from "./EmailVerificationModal";
import PasswordRequirements from "./PasswordRequirements";
import Button from "./atoms/Button";
import type { AuthUser } from "../types";
import { AuthService } from "../services/AuthService";
import {
	getPendingVerification,
	getPendingPasswordReset,
	getPendingEmailVerification,
	clearPendingPasswordReset
} from "../utils/pendingVerification";

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

// Password reset form component for header usage
interface PasswordResetFormProps {
	isOpen: boolean;
	email: string;
	operationToken: string;
	onComplete: () => void;
	onCancel: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
	isOpen,
	email,
	operationToken,
	onComplete,
	onCancel
}) => {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePasswordReset = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate passwords match
			if (newPassword !== confirmPassword) {
				setError("Passwords don't match");
				return;
			}

			await AuthService.resetPasswordWithUserId(newPassword, operationToken);
			onComplete();
		} catch (err: any) {
			setError(err.message || "Failed to reset password");
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-xl">
				<div className="p-6">
					{/* Close button */}
					<div className="mb-4 flex justify-end">
						<button onClick={onCancel} className="text-text-primary/50 hover:text-text-primary">
							✕
						</button>
					</div>

					<div className="space-y-4">
						<h3 className="text-text-primary text-lg font-semibold">Set New Password</h3>
						<p className="text-text-primary text-sm">Enter your new password for {email}</p>

						<div className="space-y-3">
							<input
								type="password"
								placeholder="New Password"
								value={newPassword}
								onChange={e => setNewPassword(e.target.value)}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-none"
								autoComplete="new-password"
								disabled={isLoading}
							/>

							<input
								type="password"
								placeholder="Confirm New Password"
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1 focus:outline-none"
								autoComplete="new-password"
								disabled={isLoading}
							/>

							<PasswordRequirements
								password={newPassword}
								confirmPassword={confirmPassword}
								showMatchRequirement={true}
							/>
						</div>

						{error && <p className="text-error text-sm">{error}</p>}

						<div className="flex justify-end space-x-2">
							<button
								type="button"
								onClick={onCancel}
								className="bg-secondary hover:bg-secondary-hover text-text-primary rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
								disabled={isLoading}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handlePasswordReset}
								disabled={!newPassword || !confirmPassword || isLoading}
								className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
							>
								{isLoading ? "Resetting..." : "Reset Password"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
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

	// Local state for context-aware verification handling
	const [showLocalVerificationModal, setShowLocalVerificationModal] = useState(false);
	const [showPasswordResetFlow, setShowPasswordResetFlow] = useState(false);
	const [passwordResetToken, setPasswordResetToken] = useState<string>();

	// Note: Cross-tab redirect listener is now set up globally in main.tsx
	// to avoid React lifecycle race conditions

	// Separate state tracking for different verification types
	const pendingEmailVerification = getPendingEmailVerification();
	const pendingPasswordReset = getPendingPasswordReset();

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

	// Determine if we should show verification notices
	const shouldShowEmailVerificationNotice =
		// Authenticated user with unverified email
		(auth.isAuthenticated && auth.user && !auth.user.email_verified) ||
		// OR unauthenticated user with pending email verification
		(!auth.isAuthenticated && pendingEmailVerification);

	const shouldShowPasswordResetNotice =
		// Unauthenticated user with pending password reset
		!auth.isAuthenticated && pendingPasswordReset;

	// Show any verification notice
	const shouldShowVerificationNotice = shouldShowEmailVerificationNotice || shouldShowPasswordResetNotice;

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

	// Context-aware handler for "Enter Code" button
	const handleEnterCodeClick = () => {
		if (shouldShowPasswordResetNotice) {
			// Handle password reset verification locally
			setShowLocalVerificationModal(true);
		} else {
			// Delegate to parent for email verification (backward compatibility)
			if (onShowVerification) {
				onShowVerification(verificationEmail);
			}
		}
	};

	// Handle successful verification for password reset
	const handlePasswordResetVerificationSuccess = (operationToken?: string) => {
		setShowLocalVerificationModal(false);
		if (operationToken) {
			setPasswordResetToken(operationToken);
			setShowPasswordResetFlow(true);
		}
	};

	// Handle password reset flow completion
	const handlePasswordResetComplete = () => {
		setShowPasswordResetFlow(false);
		setPasswordResetToken(undefined);
		clearPendingPasswordReset();
		// Open sign-in modal after password reset is complete
		onShowSignIn();
	};

	// Handle password reset flow cancellation
	const handlePasswordResetCancel = () => {
		setShowPasswordResetFlow(false);
		setPasswordResetToken(undefined);
		// Keep pending state - user might want to try again
	};

	return (
		<header className="border-layout-background bg-content-background flex w-full items-center border-b px-8 py-4 shadow-sm">
			{/* Left side - Flyout navigation */}
			<div className="flex flex-1 items-center">
				<FlyoutNavigation currentPage={currentPage} onPageChange={onPageChange} />
			</div>

			{/* Center - Zentropy logo */}
			<h1 className="m-0 flex-shrink-0">
				<button
					onClick={() => onPageChange("home")}
					className="cursor-pointer border-none bg-transparent p-0 no-underline focus:outline-none"
					aria-label="Zentropy - Go to homepage"
				>
					<img
						src="/images/ZentropyLogo.svg"
						alt="Zentropy"
						className="h-20 w-auto"
						width="360"
						height="80"
					/>
				</button>
			</h1>

			{/* Right side - Email verification + Auth navigation */}
			<div className="flex flex-1 items-center justify-end gap-2">
				{/* Verification notice */}
				{shouldShowVerificationNotice && verificationEmail && (
					<div className="flex items-center gap-1.5">
						<span className={`font-interface ${resendSuccess ? "text-success" : "text-warning"}`}>
							{resendSuccess
								? `Verification email sent to ${verificationEmail}!`
								: shouldShowPasswordResetNotice
									? "Password reset verification required"
									: "Email verification required"}
						</span>
						{(onShowVerification || shouldShowPasswordResetNotice) && (
							<Button
								variant="secondary"
								onClick={handleEnterCodeClick}
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

			{/* Local verification modal for password reset */}
			{showLocalVerificationModal && shouldShowPasswordResetNotice && (
				<EmailVerificationModal
					isOpen={showLocalVerificationModal}
					onClose={() => setShowLocalVerificationModal(false)}
					onSuccess={handlePasswordResetVerificationSuccess}
					initialEmail={verificationEmail}
					operationType="password_reset"
					title="Password Reset Verification"
					description="Enter the verification code from your email to continue with password reset."
				/>
			)}

			{/* Password reset form modal */}
			{showPasswordResetFlow && passwordResetToken && (
				<PasswordResetForm
					isOpen={showPasswordResetFlow}
					email={verificationEmail}
					operationToken={passwordResetToken}
					onComplete={handlePasswordResetComplete}
					onCancel={handlePasswordResetCancel}
				/>
			)}
		</header>
	);
};

export default Header;
