import React, { useState } from "react";
import { AuthService } from "../services/AuthService";
import { SecurityOperationType } from "../types";
import SecurityCodeFlow from "./SecurityCodeFlow";
import PasswordRequirements from "./PasswordRequirements";

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

	const handleEmailSubmit = async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate email format
			if (!AuthService.validateEmail(email)) {
				setError("Please enter a valid email address");
				return;
			}

			// Send reset code
			await AuthService.sendSecurityCode(email, SecurityOperationType.PASSWORD_RESET);
			setStep("verification");
		} catch {
			// Don't reveal if email exists for security - always proceed to verification
			setStep("verification");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCodeVerified = (token: string) => {
		setOperationToken(token);
		setStep("password");
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

			await AuthService.resetPassword(newPassword, operationToken!);
			setStep("complete");
		} catch (err: any) {
			setError(err.message || "Failed to reset password");
		} finally {
			setIsLoading(false);
		}
	};

	// Step 2: Code Verification
	if (step === "verification") {
		return (
			<SecurityCodeFlow
				userEmail={email}
				operationType={SecurityOperationType.PASSWORD_RESET}
				onCodeVerified={handleCodeVerified}
				onCancel={() => setStep("email")}
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

						<PasswordRequirements password={newPassword} />
					</div>

					{error && <p className="text-error text-sm">{error}</p>}

					<div className="flex justify-end space-x-2">
						<button
							type="button"
							onClick={() => setStep("verification")}
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
						Your password has been reset successfully. You can now sign in with your new password.
					</p>
					<button
						type="button"
						onClick={onComplete}
						className="bg-interactive hover:bg-interactive-hover rounded-lg px-4 py-2 text-white transition-colors"
					>
						Continue to Sign In
					</button>
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
