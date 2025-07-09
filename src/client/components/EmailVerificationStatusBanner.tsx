import React, { useState } from "react";
import { logger } from "../utils/logger";
import { AuthService } from "../services/AuthService";

interface EmailVerificationStatusBannerProps {
	userEmail: string;
	isVisible: boolean;
}

const EmailVerificationStatusBanner: React.FC<EmailVerificationStatusBannerProps> = ({ userEmail, isVisible }) => {
	const [isResending, setIsResending] = useState(false);
	const [resendMessage, setResendMessage] = useState("");
	const [isDismissed, setIsDismissed] = useState(false);

	if (!isVisible || isDismissed) {
		return null;
	}

	const handleResendVerification = async () => {
		try {
			setIsResending(true);
			setResendMessage("");

			const result = await AuthService.sendEmailVerification(userEmail);
			setResendMessage(result.message);
		} catch (error) {
			setResendMessage(error instanceof Error ? error.message : "Network error. Please try again.");
			logger.error("Resend verification error", { error });
		} finally {
			setIsResending(false);
		}
	};

	const handleDismiss = () => {
		setIsDismissed(true);
	};

	return (
		<div className="border-warning-border border-l-warning bg-warning-background border-b border-l-4 p-4">
			<div className="mx-auto flex max-w-[3840px] items-start justify-between">
				<div className="flex">
					<div className="ml-3 flex-1">
						<p className="text-warning text-sm">
							<span className="font-medium">Email verification required.</span> Please check your email
							and click the verification link to complete your account setup.
						</p>
						{resendMessage && (
							<p
								className={`mt-2 text-sm ${resendMessage.includes("sent") ? "text-success" : "text-error"}`}
							>
								{resendMessage}
							</p>
						)}
						<div className="mt-2">
							<button
								onClick={handleResendVerification}
								disabled={isResending}
								className="bg-interactive hover:bg-interactive-hover rounded px-3 py-1 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
							>
								{isResending ? "Sending..." : "Resend verification email"}
							</button>
						</div>
					</div>
				</div>
				<div className="ml-4 flex flex-shrink-0">
					<button
						onClick={handleDismiss}
						className="bg-warning-background text-warning hover:text-warning focus:ring-warning focus:ring-offset-warning-background inline-flex rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						<span className="sr-only">Dismiss</span>
						<svg
							className="h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
};

export default EmailVerificationStatusBanner;
