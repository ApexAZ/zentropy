import React, { useState, useCallback } from "react";
import { UserService } from "../services/UserService";
import { useAuth } from "../hooks/useAuth";
import PasswordRequirements from "./PasswordRequirements";
import Form from "./atoms/Form";
import Button from "./atoms/Button";
import { logger } from "../utils/logger";

interface PasswordChangeFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess, onCancel }) => {
	const [currentPassword, setCurrentPassword] = useState("");
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
				setError("New passwords don't match");
				return;
			}

			// Change password directly - no email verification needed for authenticated users
			logger.info("Changing password for authenticated user");
			await UserService.changePassword(currentPassword, newPassword);
			logger.info("Password changed successfully");
			onSuccess?.();
		} catch (err: any) {
			logger.error("Failed to change password", { error: err.message });
			setError(err.message || "Failed to change password");
		} finally {
			setIsLoading(false);
		}
	}, [currentPassword, newPassword, confirmPassword, onSuccess]);

	const handleCancel = useCallback(() => {
		onCancel?.();
	}, [onCancel]);

	if (!user) {
		return null;
	}

	return (
		<div className="border-layout-background bg-content-background rounded-lg border p-6 shadow-sm">
			<div className="space-y-4">
				<h3 className="text-text-contrast font-heading-medium">Change Password</h3>
				<p className="text-text-primary text-sm">
					Enter your current password and choose a new secure password.
				</p>

				<Form onSubmit={handleSubmit} isSubmitting={isLoading} error={error} className="space-y-3">
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
							className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
							required
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
							className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
							required
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
							className="border-layout-background focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
							required
						/>
					</div>

					<PasswordRequirements
						password={newPassword}
						confirmPassword={confirmPassword}
						showMatchRequirement={true}
					/>

					<div className="border-layout-background flex justify-end space-x-2 border-t pt-4">
						<Button type="button" variant="secondary" onClick={handleCancel} disabled={isLoading}>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!currentPassword || !newPassword || !confirmPassword || isLoading}
							isLoading={isLoading}
							loadingText="Changing Password..."
						>
							Change Password
						</Button>
					</div>
				</Form>
			</div>
		</div>
	);
};

export default PasswordChangeForm;
