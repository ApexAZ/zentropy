import React, { useState } from "react";
import { AuthService } from "../services/AuthService";
import EmailVerificationModal from "./EmailVerificationModal";
import PasswordRequirements from "./PasswordRequirements";
import Form from "./atoms/Form";
import Button from "./atoms/Button";
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
					// For password reset: close entire modal stack per universal modal rules
					// User can continue via header buttons (Enter Code/Resend) on clean home page
					// Pending password reset state remains active for header integration
					setShowVerificationModal(false);
					onCancel?.(); // Close entire AuthModal to return to clean home page
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
		const handlePasswordSubmit = () => {
			if (!newPassword || !confirmPassword || isLoading) return;
			handlePasswordReset();
		};

		return (
			<div className="bg-content-background rounded-lg p-6 shadow-lg">
				<div className="space-y-4">
					<h3 className="text-text-primary text-lg font-semibold">Set New Password</h3>
					<p className="text-text-secondary text-sm">Enter your new password for {email}</p>

					<Form onSubmit={handlePasswordSubmit} isSubmitting={isLoading} error={error} className="space-y-3">
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

						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									setStep("verification");
									setShowVerificationModal(true);
								}}
								disabled={isLoading}
							>
								Back
							</Button>
							<Button
								type="submit"
								variant="primary"
								disabled={!newPassword || !confirmPassword || isLoading}
								isLoading={isLoading}
								loadingText="Resetting..."
							>
								Reset Password
							</Button>
						</div>
					</Form>
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

				<Form onSubmit={handleEmailSubmit} isSubmitting={isLoading} error={error}>
					<input
						type="email"
						placeholder="Email Address"
						value={email}
						onChange={e => setEmail(e.target.value)}
						className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
						autoComplete="email"
						disabled={isLoading}
					/>

					<div className="flex justify-end space-x-2">
						<Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!email || isLoading}
							isLoading={isLoading}
							loadingText="Sending..."
						>
							Send Reset Code
						</Button>
					</div>
				</Form>
			</div>
		</div>
	);
};
