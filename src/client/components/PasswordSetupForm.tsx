import React, { useState, useCallback } from "react";
import { UserService } from "../services/UserService";
import { useAuth } from "../hooks/useAuth";
import PasswordRequirements from "./PasswordRequirements";
import Form from "./atoms/Form";
import Button from "./atoms/Button";
import { logger } from "../utils/logger";
import { AccountSecurityErrorHandler } from "../utils/errorHandling";

interface PasswordSetupFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

export const PasswordSetupForm: React.FC<PasswordSetupFormProps> = ({ onSuccess, onCancel }) => {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { user } = useAuth();

	const handleSubmit = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Validate passwords match
			if (newPassword !== confirmPassword) {
				setError("Passwords don't match");
				return;
			}

			// Set up password for OAuth-only user
			logger.info("Setting up password for OAuth-only user");
			await UserService.setupPassword(newPassword);
			logger.info("Password set up successfully");
			onSuccess?.();
		} catch (err: any) {
			logger.error("Failed to set up password", { error: err.message });

			// Use centralized error handling for consistent user experience
			const errorDetails = AccountSecurityErrorHandler.processError(
				err.message || "Failed to set up password",
				"loading" // Password setup is a loading operation in account security context
			);
			setError(errorDetails.message);
		} finally {
			setIsLoading(false);
		}
	}, [newPassword, confirmPassword, onSuccess]);

	const handleCancel = useCallback(() => {
		onCancel?.();
	}, [onCancel]);

	if (!user) {
		return null;
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-text-contrast font-heading-medium">Set Up Password</h3>
				<p className="text-text-primary font-body mt-2">
					Create a secure password to enable email/password authentication. This will allow you to safely
					unlink OAuth providers if needed.
				</p>
			</div>

			<Form onSubmit={handleSubmit} isSubmitting={isLoading} error={error} className="space-y-6">
				<div>
					<label htmlFor="new-password" className="text-text-primary mb-2 block font-medium">
						New Password
					</label>
					<input
						id="new-password"
						type="password"
						placeholder="Create a secure password"
						value={newPassword}
						onChange={e => setNewPassword(e.target.value)}
						autoComplete="new-password"
						className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
						disabled={isLoading}
						required
					/>
				</div>

				<div>
					<label htmlFor="confirm-password" className="text-text-primary mb-2 block font-medium">
						Confirm Password
					</label>
					<input
						id="confirm-password"
						type="password"
						placeholder="Confirm your password"
						value={confirmPassword}
						onChange={e => setConfirmPassword(e.target.value)}
						autoComplete="new-password"
						className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
						disabled={isLoading}
						required
					/>
				</div>

				<PasswordRequirements
					password={newPassword}
					confirmPassword={confirmPassword}
					showMatchRequirement={true}
				/>

				<div className="flex justify-end space-x-4">
					<Button type="button" variant="secondary" onClick={handleCancel} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!newPassword || !confirmPassword || isLoading}
						isLoading={isLoading}
						loadingText="Setting Up Password..."
					>
						Set Up Password
					</Button>
				</div>
			</Form>
		</div>
	);
};

export default PasswordSetupForm;
