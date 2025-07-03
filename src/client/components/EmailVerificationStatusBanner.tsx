import React, { useState } from "react";

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

			const response = await fetch("/api/auth/send-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email: userEmail })
			});

			const data = await response.json();

			if (response.ok) {
				setResendMessage("Verification email sent! Please check your inbox.");
			} else {
				setResendMessage(data.detail || "Failed to send verification email");
			}
		} catch (error) {
			setResendMessage("Network error. Please try again.");
			console.error("Resend verification error:", error);
		} finally {
			setIsResending(false);
		}
	};

	const handleDismiss = () => {
		setIsDismissed(true);
	};

	return (
		<div className="border-b border-l-4 border-yellow-200 border-l-yellow-400 bg-yellow-50 p-4">
			<div className="mx-auto flex max-w-[3840px] items-start justify-between">
				<div className="flex">
					<div className="ml-3 flex-1">
						<p className="text-sm text-yellow-800">
							<span className="font-medium">Email verification required.</span> Please check your email
							and click the verification link to complete your account setup.
						</p>
						{resendMessage && (
							<p
								className={`mt-2 text-sm ${resendMessage.includes("sent") ? "text-green-800" : "text-red-800"}`}
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
						className="inline-flex rounded-md bg-yellow-50 text-yellow-400 hover:text-yellow-600 focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:outline-none"
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
