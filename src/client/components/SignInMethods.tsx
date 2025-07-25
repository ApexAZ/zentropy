import { useState, useCallback } from "react";
import type { AccountSecurityResponse } from "../types";
import { AccountSecuritySection } from "./AccountSecuritySection";
import PasswordChangeForm from "./PasswordChangeForm";
import { useToast } from "../contexts/ToastContext";

interface SignInMethodsProps {
	/** Current security status data from API */
	securityStatus: AccountSecurityResponse;
	/** Callback when security status is updated */
	onSecurityUpdate: () => void;
	/** Callback for error handling */
	onError: (error: string) => void;
}

/**
 * Sign-In Methods Component
 *
 * Unified interface for managing all authentication methods:
 * - Email + Password (primary method)
 * - OAuth providers (Google, GitHub, Microsoft)
 * - Future: Backup codes, 2FA, etc.
 *
 * This presents all authentication as "ways to sign in" rather than
 * separate password/OAuth concepts, creating a more intuitive UX.
 */
export function SignInMethods({ securityStatus, onSecurityUpdate, onError }: SignInMethodsProps) {
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const { showSuccess } = useToast();

	const handlePasswordChangeSuccess = useCallback(() => {
		setIsChangingPassword(false);
		showSuccess("Password changed successfully! Your account is now more secure.");
		onSecurityUpdate(); // Refresh security status
	}, [showSuccess, onSecurityUpdate]);

	const handlePasswordChangeCancel = useCallback(() => {
		setIsChangingPassword(false);
	}, []);

	return (
		<div className="space-y-6">
			{/* Section Header */}
			<div>
				<h3 className="text-text-contrast text-xl font-semibold">Sign-In Methods</h3>
				<p className="text-text-primary mt-1 text-sm">
					Manage how you sign in to your account. Multiple methods provide better security and convenience.
				</p>
			</div>

			{/* Primary Method: Email + Password */}
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={`h-3 w-3 rounded-full ${securityStatus.email_auth_linked ? "bg-success" : "bg-neutral"}`}
						/>
						<div>
							<h4 className="text-text-contrast font-medium">Email + Password</h4>
							<p className="text-text-primary text-sm">
								{securityStatus.email_auth_linked
									? "Your primary sign-in method"
									: "Set up email and password authentication"}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span
							className={`rounded-full px-3 py-1 text-sm font-medium ${
								securityStatus.email_auth_linked
									? "bg-success-background text-success"
									: "bg-neutral-background text-neutral"
							}`}
						>
							{securityStatus.email_auth_linked ? "Active" : "Not Set"}
						</span>
					</div>
				</div>

				{securityStatus.email_auth_linked && !isChangingPassword && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-text-primary text-sm font-medium">Password Status</div>
								<div className="mt-1 flex items-center gap-2">
									<span className="text-neutral">••••••••••••</span>
									<span className="text-text-primary text-sm">Last changed: Recent</span>
								</div>
							</div>
						</div>

						<div className="border-layout-background border-t pt-4">
							<button
								onClick={() => setIsChangingPassword(true)}
								className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-sm font-medium no-underline transition-all duration-200"
							>
								<span>🔐</span>
								Change Password
							</button>
						</div>
					</div>
				)}

				{isChangingPassword && (
					<div className="mt-4">
						<PasswordChangeForm
							onSuccess={handlePasswordChangeSuccess}
							onCancel={handlePasswordChangeCancel}
						/>
					</div>
				)}

				{!securityStatus.email_auth_linked && (
					<div className="bg-warning-light rounded-md p-3">
						<p className="text-warning-dark text-sm">
							⚠️ Email + password authentication is not set up. This is recommended as your primary
							sign-in method.
						</p>
					</div>
				)}
			</div>

			{/* OAuth Providers Section */}
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<div className="mb-4">
					<h4 className="text-text-contrast font-medium">Alternative Sign-In Methods</h4>
					<p className="text-text-primary mt-1 text-sm">
						Link your accounts with other providers for convenient one-click sign-in
					</p>
				</div>

				{/* Embed the existing AccountSecuritySection but with minimal styling */}
				<div className="[&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none">
					<AccountSecuritySection onSecurityUpdate={onSecurityUpdate} onError={onError} />
				</div>
			</div>

			{/* Future Methods Placeholder */}
			<div className="border-layout-background bg-layout-background rounded-lg border border-dashed p-6">
				<div className="text-center">
					<div className="text-text-primary mb-2 font-medium">Additional Security Methods</div>
					<p className="text-text-primary mb-4 text-sm">
						Coming soon: Backup recovery codes, two-factor authentication, and more security options
					</p>
					<div className="flex justify-center gap-2">
						<span className="bg-neutral-background text-neutral rounded px-2 py-1 text-xs">
							🔑 Backup Codes
						</span>
						<span className="bg-neutral-background text-neutral rounded px-2 py-1 text-xs">
							📱 Two-Factor Auth
						</span>
						<span className="bg-neutral-background text-neutral rounded px-2 py-1 text-xs">
							🔐 Hardware Keys
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
