import React, { useState, useEffect } from "react";
import Button from "./atoms/Button";
import { AuthService } from "../services/AuthService";
import { logger } from "../utils/logger";

// Rate limit timer persistence utilities
const RATE_LIMIT_STORAGE_KEY = "emailResendRateLimit";

interface RateLimitData {
	email: string;
	expiresAt: number; // timestamp
}

const saveRateLimitTimer = (email: string, seconds: number): void => {
	const expiresAt = Date.now() + seconds * 1000;
	const data: RateLimitData = { email, expiresAt };
	localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
};

const getRateLimitTimer = (email: string): number | null => {
	try {
		const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
		if (!stored) return null;

		const data: RateLimitData = JSON.parse(stored);
		if (data.email !== email) return null;

		const remaining = Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000));
		if (remaining <= 0) {
			localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
			return null;
		}

		return remaining;
	} catch {
		localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
		return null;
	}
};

const clearRateLimitTimer = (): void => {
	localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
};

interface EmailVerificationResendButtonProps {
	userEmail: string;
	onResendSuccess?: () => void;
}

const EmailVerificationResendButton: React.FC<EmailVerificationResendButtonProps> = ({
	userEmail,
	onResendSuccess
}) => {
	const [isResending, setIsResending] = useState(false);
	const [rateLimitSeconds, setRateLimitSeconds] = useState<number | null>(() => {
		// Initialize from localStorage on component mount
		return getRateLimitTimer(userEmail);
	});

	// Countdown timer effect
	useEffect(() => {
		if (rateLimitSeconds === null || rateLimitSeconds <= 0) {
			return;
		}

		const timer = setInterval(() => {
			setRateLimitSeconds(prev => {
				if (prev === null || prev <= 1) {
					clearRateLimitTimer();
					return null;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [rateLimitSeconds]);

	const handleResendVerification = async (): Promise<void> => {
		try {
			setIsResending(true);

			// Use simple email verification system
			await AuthService.sendEmailVerification(userEmail);

			// Log success for debugging
			logger.info("Email verification sent successfully", {
				email: userEmail
			});

			// Start rate limit timer (standard 60 seconds)
			const rateLimitDuration = 60;
			setRateLimitSeconds(rateLimitDuration);
			saveRateLimitTimer(userEmail, rateLimitDuration);

			// Notify parent component of success
			onResendSuccess?.();
		} catch (error: any) {
			logger.error("Resend verification error", { error });

			// Check for rate limiting error from HTTP 429 response
			if (error.response?.status === 429 && error.response?.data?.detail?.rate_limit_seconds_remaining) {
				const remainingSeconds = error.response.data.detail.rate_limit_seconds_remaining;
				setRateLimitSeconds(remainingSeconds);
				saveRateLimitTimer(userEmail, remainingSeconds);
				logger.info(`Rate limit active: ${remainingSeconds} seconds remaining`);
			}
		} finally {
			setIsResending(false);
		}
	};

	const isDisabled = isResending || (rateLimitSeconds !== null && rateLimitSeconds > 0);
	const buttonText = rateLimitSeconds !== null && rateLimitSeconds > 0 ? `${rateLimitSeconds}s` : "Resend";

	return (
		<Button
			variant="secondary"
			onClick={handleResendVerification}
			isLoading={isResending}
			loadingText="Sending..."
			disabled={isDisabled}
			className="!bg-interactive hover:!bg-interactive-hover hover:!text-text-primary w-[80px] justify-center !border-none !px-2 !py-1 text-center text-xs whitespace-nowrap !text-white disabled:!bg-gray-400 disabled:hover:!bg-gray-400"
		>
			{buttonText}
		</Button>
	);
};

export default EmailVerificationResendButton;
