import { useState } from "react";
import { AuthService } from "../services/AuthService";
import { SecurityOperationType } from "../types";
import SecurityCodeFlow from "./SecurityCodeFlow";

interface UsernameRecoveryFlowProps {
	onComplete?: () => void;
	onCancel?: () => void;
}

export const UsernameRecoveryFlow: React.FC<UsernameRecoveryFlowProps> = ({ onComplete, onCancel }) => {
	const [step, setStep] = useState<"email" | "verification" | "complete">("email");
	const [email, setEmail] = useState("");
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

			// Send verification code
			await AuthService.sendSecurityCode(email, SecurityOperationType.USERNAME_RECOVERY);
			setStep("verification");
		} catch {
			// Don't reveal if email exists for security
			setStep("verification");
		} finally {
			setIsLoading(false);
		}
	};

	const handleCodeVerified = async (token: string) => {
		try {
			// Automatically recover username after verification
			await AuthService.recoverUsername(token);
			setStep("complete");
		} catch (error: any) {
			// Go back to email step so user can see the error
			setError(error.message || "Failed to recover username");
			setStep("email");
		}
	};

	if (step === "verification") {
		return (
			<SecurityCodeFlow
				userEmail={email}
				operationType={SecurityOperationType.USERNAME_RECOVERY}
				onCodeVerified={handleCodeVerified}
				onCancel={() => setStep("email")}
				title="Verify Your Email"
				description="Enter the code sent to your email to recover your username"
			/>
		);
	}

	if (step === "complete") {
		return (
			<div className="bg-content-background rounded-lg p-6 shadow-lg">
				<div className="space-y-4 text-center">
					<div className="text-success text-4xl">✓</div>
					<h3 className="text-text-primary text-lg font-semibold">Username Sent</h3>
					<p className="text-text-secondary">
						Your username has been sent to {email}. Check your email and then try signing in.
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

	// Step 1: Email input
	return (
		<div className="bg-content-background rounded-lg p-6 shadow-lg">
			<div className="space-y-4">
				<h3 className="text-text-primary text-lg font-semibold">Recover Your Username</h3>
				<p className="text-text-secondary text-sm">
					Enter your email address and we'll send your username to you.
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
						{isLoading ? "Sending..." : "Send Username"}
					</button>
				</div>
			</div>
		</div>
	);
};
