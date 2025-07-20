import React, { useState } from "react";
import Button from "./atoms/Button";
import Input from "./atoms/Input";
import Card from "./atoms/Card";
import EmailVerificationResendButton from "./EmailVerificationResendButton";
import { AuthService } from "../services/AuthService";
import { SecurityOperationType } from "../types";

interface SecurityCodeFlowProps {
	userEmail: string;
	operationType: SecurityOperationType;
	onCodeVerified: (operationToken: string) => void;
	onCancel?: () => void;
	title?: string;
	description?: string;
}

const SecurityCodeFlow: React.FC<SecurityCodeFlowProps> = ({
	userEmail,
	operationType,
	onCodeVerified,
	onCancel,
	title = "Verify Your Email",
	description = "Enter the verification code sent to your email"
}) => {
	const [code, setCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCodeSubmit = async () => {
		try {
			setIsVerifying(true);
			setError(null);

			const result = await AuthService.verifySecurityCode(userEmail, code, operationType);
			onCodeVerified(result.operation_token);
		} catch (err: any) {
			setError(err.message || "Invalid verification code");
		} finally {
			setIsVerifying(false);
		}
	};

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Only allow numeric input and limit to 6 digits
		const value = e.target.value.replace(/\D/g, "").slice(0, 6);
		setCode(value);
	};

	return (
		<Card>
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">{title}</h3>
					<p className="text-secondary mt-1 text-sm">{description}</p>
					<p className="text-secondary text-sm">Code sent to: {userEmail}</p>
				</div>

				<div className="space-y-3">
					<Input
						id="verification-code"
						type="text"
						label="Verification Code"
						placeholder="Enter 6-digit code"
						value={code}
						onChange={handleCodeChange}
						maxLength={6}
						className="text-center text-lg tracking-widest"
						autoComplete="one-time-code"
					/>

					{error && <p className="text-error text-sm">{error}</p>}
				</div>

				<div className="flex items-center justify-between">
					<EmailVerificationResendButton userEmail={userEmail} operationType={operationType} />

					<div className="space-x-2">
						{onCancel && (
							<Button variant="secondary" onClick={onCancel}>
								Cancel
							</Button>
						)}
						<Button
							onClick={handleCodeSubmit}
							disabled={code.length !== 6 || isVerifying}
							isLoading={isVerifying}
						>
							Verify Code
						</Button>
					</div>
				</div>
			</div>
		</Card>
	);
};

export default SecurityCodeFlow;
