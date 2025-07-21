import React, { useState, useCallback } from "react";
import { SecurityOperationType } from "../types";
import { AuthService } from "../services/AuthService";
import { UserService } from "../services/UserService";
import { useAuth } from "../hooks/useAuth";
import SecurityCodeFlow from "./SecurityCodeFlow";
import PasswordRequirements from "./PasswordRequirements";
import { logger } from "../utils/logger";

interface PasswordChangeFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess, onCancel }) => {
	const [step, setStep] = useState<"password" | "verification" | "complete">("password");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [operationToken, setOperationToken] = useState<string>();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { user } = useAuth();

	const handlePasswordSubmit = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate passwords match
			if (newPassword !== confirmPassword) {
				setError("New passwords don't match");
				return;
			}

			// Send verification code
			logger.info("Sending verification code for password change", { email: user?.email });
			await AuthService.sendSecurityCode(user!.email, SecurityOperationType.PASSWORD_CHANGE);
			setStep("verification");
		} catch (err: any) {
			logger.error("Failed to send verification code", { error: err.message });
			setError(err.message || "Failed to send verification code");
		} finally {
			setIsLoading(false);
		}
	}, [newPassword, confirmPassword, user]);

	const handleCodeVerified = useCallback((token: string) => {
		logger.info("Verification code confirmed, proceeding to password change");
		setOperationToken(token);
		setStep("complete");
	}, []);

	const handlePasswordChange = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			await UserService.changePassword(currentPassword, newPassword, operationToken!);
			logger.info("Password changed successfully");
			onSuccess?.();
		} catch (err: any) {
			logger.error("Failed to change password", { error: err.message });
			setError(err.message || "Failed to change password");

			// If token expired, go back to verification
			if (err.message?.includes("token") || err.message?.includes("expired")) {
				setStep("verification");
			}
		} finally {
			setIsLoading(false);
		}
	}, [currentPassword, newPassword, operationToken, onSuccess]);

	const handleCancel = useCallback(() => {
		onCancel?.();
	}, [onCancel]);

	const handleBackToPasswordStep = useCallback(() => {
		setStep("password");
	}, []);

	if (!user) {
		return null;
	}

	if (step === "verification") {
		return (
			<SecurityCodeFlow
				userEmail={user.email}
				operationType={SecurityOperationType.PASSWORD_CHANGE}
				onCodeVerified={handleCodeVerified}
				onCancel={handleBackToPasswordStep}
				title="Verify Password Change"
				description="To change your password, please verify your email address"
			/>
		);
	}

	if (step === "complete") {
		return (
			<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
				<div className="space-y-4">
					<h3 className="text-text-contrast text-xl font-semibold">Complete Password Change</h3>

					<div className="space-y-3">
						<div>
							<label htmlFor="current-password" className="text-text-primary mb-2 block font-medium">
								Current Password
							</label>
							<input
								id="current-password"
								type="password"
								placeholder="Current Password"
								value={currentPassword}
								onChange={e => setCurrentPassword(e.target.value)}
								autoComplete="current-password"
								className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
							/>
						</div>

						<div>
							<label htmlFor="new-password" className="text-text-primary mb-2 block font-medium">
								New Password
							</label>
							<input
								id="new-password"
								type="password"
								placeholder="New Password"
								value={newPassword}
								onChange={e => setNewPassword(e.target.value)}
								autoComplete="new-password"
								className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
							/>
						</div>

						<div>
							<label htmlFor="confirm-password" className="text-text-primary mb-2 block font-medium">
								Confirm New Password
							</label>
							<input
								id="confirm-password"
								type="password"
								placeholder="Confirm New Password"
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								autoComplete="new-password"
								className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
							/>
						</div>
					</div>

					{error && <p className="text-sm text-red-600">{error}</p>}

					<div className="border-layout-background flex justify-end space-x-2 border-t pt-4">
						<button
							type="button"
							onClick={handleCancel}
							className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
						>
							Cancel
						</button>
						<button
							onClick={handlePasswordChange}
							disabled={!currentPassword || !newPassword || !confirmPassword || isLoading}
							className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? "Changing Password..." : "Change Password"}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Step 1: Password input
	return (
		<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
			<div className="space-y-4">
				<h3 className="text-text-contrast text-xl font-semibold">Change Password</h3>
				<p className="text-text-primary text-sm">
					Enter your new password. You'll need to verify your email address to complete the change.
				</p>

				<div className="space-y-3">
					<div>
						<label htmlFor="new-password-input" className="text-text-primary mb-2 block font-medium">
							New Password
						</label>
						<input
							id="new-password-input"
							type="password"
							placeholder="New Password"
							value={newPassword}
							onChange={e => setNewPassword(e.target.value)}
							autoComplete="new-password"
							className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
						/>
					</div>

					<div>
						<label htmlFor="confirm-password-input" className="text-text-primary mb-2 block font-medium">
							Confirm New Password
						</label>
						<input
							id="confirm-password-input"
							type="password"
							placeholder="Confirm New Password"
							value={confirmPassword}
							onChange={e => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
							className="border-layout-background focus:border-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
						/>
					</div>

					<PasswordRequirements password={newPassword} />
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<div className="border-layout-background flex justify-end space-x-2 border-t pt-4">
					<button
						type="button"
						onClick={handleCancel}
						className="border-layout-background bg-content-background text-text-primary hover:border-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-center text-base font-medium no-underline transition-all duration-200"
					>
						Cancel
					</button>
					<button
						onClick={handlePasswordSubmit}
						disabled={!newPassword || !confirmPassword || isLoading}
						className="bg-interactive hover:bg-interactive-hover inline-flex cursor-pointer items-center gap-2 rounded-md border-none px-6 py-3 text-center text-base font-medium text-white no-underline transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isLoading ? "Sending Code..." : "Send Verification Code"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default PasswordChangeForm;
