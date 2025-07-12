import React, { useState } from "react";
import Button from "./atoms/Button";
import { AuthService } from "../services/AuthService";
import { logger } from "../utils/logger";

interface EmailVerificationResendButtonProps {
	userEmail: string;
}

const EmailVerificationResendButton: React.FC<EmailVerificationResendButtonProps> = ({ userEmail }) => {
	const [isResending, setIsResending] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const handleResendVerification = async (): Promise<void> => {
		try {
			setIsResending(true);
			setShowSuccess(false);

			await AuthService.sendEmailVerification(userEmail);
			setShowSuccess(true);

			// Log success for debugging
			logger.info("Verification email resent successfully", { email: userEmail });

			// Hide success message after 3 seconds
			setTimeout(() => setShowSuccess(false), 3000);
		} catch (error) {
			logger.error("Resend verification error", { error });
			// Don't show error in this compact UI - user can try again
		} finally {
			setIsResending(false);
		}
	};

	if (showSuccess) {
		return <span className="text-success text-sm font-medium">Verification email sent to {userEmail}!</span>;
	}

	return (
		<Button
			variant="secondary"
			onClick={handleResendVerification}
			isLoading={isResending}
			loadingText="Sending..."
			className="!bg-interactive hover:!bg-interactive-hover hover:!text-text-primary !border-none !px-3 !py-1 !text-white"
		>
			Resend
		</Button>
	);
};

export default EmailVerificationResendButton;
