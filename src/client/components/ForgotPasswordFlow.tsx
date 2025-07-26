import React, { useState } from "react";
import { AuthService } from "../services/AuthService";
import EmailVerificationModal from "./EmailVerificationModal";
import PasswordRequirements from "./PasswordRequirements";
import { setPendingPasswordReset, clearPendingPasswordReset } from "../utils/pendingVerification";

interface ForgotPasswordFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
}

type ForgotPasswordStep = "email" | "verification" | "password" | "complete";

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({ onComplete, onCancel }) => {
	const [step, setStep] = useState<ForgotPasswordStep>("email");
	const [email, setEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [operationToken, setOperationToken] = useState<string>();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showVerificationModal, setShowVerificationModal] = useState(false);

	const handleEmailSubmit = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate email format
			if (!AuthService.validateEmail(email)) {
				setError("Please enter a valid email address");
				return;
			}

			// Send reset code using the SAME email verification system
			await AuthService.sendEmailVerification(email);

			// Set pending password reset state for header integration
			setPendingPasswordReset(email);

			setStep("verification");
			setShowVerificationModal(true);
		} catch {
			// Don't reveal if email exists for security - always proceed to verification
			// Set pending password reset state for header integration
			setPendingPasswordReset(email);
			setStep("verification");
			setShowVerificationModal(true);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCodeVerified = (token?: string) => {
		setOperationToken(token);
		setShowVerificationModal(false);
		setStep("password"); // This will close the modal and show password form
	};

	const handlePasswordReset = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate passwords match
			if (newPassword !== confirmPassword) {
				setError("Passwords don't match");
				return;
			}

			await AuthService.resetPasswordWithUserId(newPassword, operationToken!);

			// Clear pending password reset state - password reset is complete
			clearPendingPasswordReset();

			// Auto-redirect to sign-in modal after successful password reset
			setTimeout(() => {
				onComplete?.(); // This should open the sign-in modal
			}, 2000);

			setStep("complete");
		} catch (err: any) {
			setError(err.message || "Failed to reset password");
		} finally {
			setIsLoading(false);
		}
	};

	// Step 2: Code Verification
	if (step === "verification") {
		// If modal was closed, don't render anything (user can continue via header buttons)
		if (!showVerificationModal) {
			return null;
		}

		return (
			<EmailVerificationModal
				isOpen={showVerificationModal}
				onClose={() => {
					// For password reset: just close modal, don't call onCancel
					// User can continue via header buttons (Enter Code/Resend)
					// Pending password reset state remains active for header integration
					setShowVerificationModal(false);
				}}
				onSuccess={handleCodeVerified}
				initialEmail={email}
				operationType="password_reset"
				title="Check Your Email"
				description="Enter the reset code sent to your email address"
			/>
		);
	}

	// Step 3: Password Input
	if (step === "password") {
		return (
			<div className="bg-content-background rounded-lg p-6 shadow-lg">
				<div className="space-y-4">
					<h3 className="text-text-primary text-lg font-semibold">Set New Password</h3>
					<p className="text-text-secondary text-sm">Enter your new password for {email}</p>

					<div className="space-y-3">
						<input
							type="password"
							placeholder="New Password"
							value={newPassword}
							onChange={e => setNewPassword(e.target.value)}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
							autoComplete="new-password"
							disabled={isLoading}
						/>

						<input
							type="password"
							placeholder="Confirm New Password"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
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
							onClick={() => {
								setStep("verification");
								setShowVerificationModal(true);
							}}
							className="bg-secondary hover:bg-secondary-hover text-text-primary rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
							disabled={isLoading}
						>
							Back
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
		);
	}

	// Step 4: Completion
	if (step === "complete") {
		return (
			<div className="bg-content-background rounded-lg p-6 shadow-lg">
				<div className="space-y-4 text-center">
					<div className="text-success text-4xl">✓</div>
					<h3 className="text-text-primary text-lg font-semibold">Password Reset Complete</h3>
					<p className="text-text-secondary">
						Your password has been reset successfully. Redirecting to sign in...
					</p>
				</div>
			</div>
		);
	}

	// Step 1: Email Input
	return (
		<div className="bg-content-background rounded-lg p-6 shadow-lg">
			<div className="space-y-4">
				<h3 className="text-text-primary text-lg font-semibold">Reset Your Password</h3>
				<p className="text-text-secondary text-sm">
					Enter your email address and we'll send you a code to reset your password.
				</p>

				<input
					type="email"
					placeholder="Email Address"
					value={email}
					onChange={e => setEmail(e.target.value)}
					className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
					autoComplete="email"
					disabled={isLoading}
				/>

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
						onClick={handleEmailSubmit}
						disabled={!email || isLoading}
						className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
					>
						{isLoading ? "Sending..." : "Send Reset Code"}
					</button>
				</div>
			</div>
		</div>
	);
};
