import React, { useState } from "react";
import { AuthService } from "../services/AuthService";
import EmailVerificationModal from "./EmailVerificationModal";
import PasswordRequirements from "./PasswordRequirements";
import Form from "./atoms/Form";
import Button from "./atoms/Button";
import { setPendingPasswordReset, clearPendingPasswordReset } from "../utils/pendingVerification";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";

interface ForgotPasswordFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
	useSecureFlow?: boolean; // New prop to enable secure verification code flow
}

type ForgotPasswordStep = "email" | "verification" | "password" | "complete";

export const ForgotPasswordFlow: React.FC<ForgotPasswordFlowProps> = ({
	onComplete,
	onCancel,
	useSecureFlow = true // Default to secure flow
}) => {
	const [step, setStep] = useState<ForgotPasswordStep>("email");
	const [email, setEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
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
				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError(
					"Please enter a valid email address",
					"loading"
				);
				setError(errorDetails.message);
				return;
			}

			if (useSecureFlow) {
				// New secure flow: Request password reset verification code
				await AuthService.requestPasswordResetCode(email);

				// Set pending password reset state for header integration
				setPendingPasswordReset(email);

				setStep("verification");
				// For secure flow, we'll show a code input instead of the modal
			} else {
				// Legacy flow: Send reset code using email verification system
				await AuthService.sendEmailVerification(email);

				// Set pending password reset state for header integration
				setPendingPasswordReset(email);

				setStep("verification");
				setShowVerificationModal(true);
			}
		} catch (error) {
			if (useSecureFlow) {
				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError(
					error instanceof Error ? error.message : "Failed to send reset code",
					"loading" // Email submission is a loading operation in password reset context
				);
				setError(errorDetails.message);
			} else {
				// Legacy flow: Don't reveal if email exists for security - always proceed
				setPendingPasswordReset(email);
				setStep("verification");
				setShowVerificationModal(true);
			}
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
				// Use centralized error handling for consistent user experience
				const errorDetails = AccountSecurityErrorHandler.processError("Passwords don't match", "loading");
				setError(errorDetails.message);
				return;
			}

			if (useSecureFlow) {
				// New secure flow: Use verification code
				if (!verificationCode.trim()) {
					// Use centralized error handling for consistent user experience
					const errorDetails = AccountSecurityErrorHandler.processError(
						"Please enter the verification code",
						"loading"
					);
					setError(errorDetails.message);
					return;
				}

				await AuthService.resetPasswordWithCode(email, verificationCode, newPassword);
			} else {
				// Legacy flow: Use deprecated method with operation token
				await AuthService.resetPasswordWithUserId(newPassword, operationToken!);
			}

			// Clear pending password reset state - password reset is complete
			clearPendingPasswordReset();

			// Auto-redirect to sign-in modal after successful password reset
			setTimeout(() => {
				onComplete?.(); // This should open the sign-in modal
			}, 2000);

			setStep("complete");
		} catch (err: any) {
			// Use centralized error handling for consistent user experience
			const errorDetails = AccountSecurityErrorHandler.processError(
				err.message || "Failed to reset password",
				"loading" // Password reset is a loading operation
			);
			setError(errorDetails.message);
		} finally {
			setIsLoading(false);
		}
	};

	// Step 2: Code Verification
	if (step === "verification") {
		if (useSecureFlow) {
			// Secure flow: Show verification code input directly
			const handleVerificationSubmit = () => {
				if (!verificationCode.trim() || isLoading) return;
				setStep("password"); // Move to password reset step
			};

			return (
				<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
					<div className="space-y-4">
						<h3 className="font-heading-medium text-text-contrast">Enter Verification Code</h3>
						<p className="font-body text-text-primary">
							We've sent a 6-digit verification code to {email}. Enter it below to continue.
						</p>

						<Form
							onSubmit={handleVerificationSubmit}
							isSubmitting={isLoading}
							error={error}
							className="space-y-3"
						>
							<input
								type="text"
								placeholder="Enter 6-digit code"
								value={verificationCode}
								onChange={e => setVerificationCode(e.target.value)}
								className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
								maxLength={6}
								pattern="[0-9]{6}"
								autoComplete="one-time-code"
								disabled={isLoading}
							/>

							<div className="flex justify-end space-x-2">
								<Button
									type="button"
									variant="secondary"
									onClick={() => setStep("email")}
									disabled={isLoading}
								>
									Back
								</Button>
								<Button
									type="submit"
									variant="primary"
									disabled={!verificationCode.trim() || verificationCode.length !== 6 || isLoading}
									isLoading={isLoading}
									loadingText="Verifying..."
								>
									Continue
								</Button>
							</div>
						</Form>
					</div>
				</div>
			);
		} else {
			// Legacy flow: Use modal (only if modal is open)
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
	}

	// Step 3: Password Input
	if (step === "password") {
		const handlePasswordSubmit = () => {
			if (!newPassword || !confirmPassword || isLoading) return;
			handlePasswordReset();
		};

		return (
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<div className="space-y-4">
					<h3 className="font-heading-medium text-text-contrast">Set New Password</h3>
					<p className="font-body text-text-primary">Enter your new password for {email}</p>

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
									if (!useSecureFlow) {
										setShowVerificationModal(true);
									}
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
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<div className="space-y-4 text-center">
					<div className="text-success text-4xl">✓</div>
					<h3 className="font-heading-medium text-text-contrast">Password Reset Complete</h3>
					<p className="font-body text-text-primary">
						Your password has been reset successfully. Redirecting to sign in...
					</p>
				</div>
			</div>
		);
	}

	// Step 1: Email Input
	return (
		<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
			<div className="space-y-4">
				<h3 className="font-heading-medium text-text-contrast">Reset Your Password</h3>
				<p className="font-body text-text-primary">
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
