import React, { useState, useRef, useEffect, useMemo } from "react";

interface EmailVerificationPageProps {
	onClose?: () => void;
	initialEmail?: string;
}

interface VerificationCodeResponse {
	message: string;
	success: boolean;
	user_id?: string;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ onClose, initialEmail = "" }) => {
	const [email, setEmail] = useState(initialEmail);
	const [code, setCode] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [isResending, setIsResending] = useState(false);

	// Refs for individual code inputs
	const inputRef0 = useRef<HTMLInputElement>(null);
	const inputRef1 = useRef<HTMLInputElement>(null);
	const inputRef2 = useRef<HTMLInputElement>(null);
	const inputRef3 = useRef<HTMLInputElement>(null);
	const inputRef4 = useRef<HTMLInputElement>(null);
	const inputRef5 = useRef<HTMLInputElement>(null);

	const inputRefs = useMemo(
		() => [inputRef0, inputRef1, inputRef2, inputRef3, inputRef4, inputRef5],
		[inputRef0, inputRef1, inputRef2, inputRef3, inputRef4, inputRef5]
	);

	// Focus first input on mount
	useEffect(() => {
		const firstRef = inputRefs[0];
		if (firstRef?.current) {
			firstRef.current.focus();
		}
	}, [inputRefs]);

	const handleCodeChange = (index: number, value: string) => {
		// Only allow digits
		if (!/^\d*$/.test(value)) return;

		// Update code
		const newCode = code.split("");
		newCode[index] = value;
		setCode(newCode.join(""));
		setError(null);

		// Auto-focus next input
		if (value && index < 5) {
			const nextRef = inputRefs[index + 1];
			if (nextRef?.current) {
				nextRef.current.focus();
			}
		}
	};

	const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
		if (e.key === "Backspace" && !code[index] && index > 0) {
			const prevRef = inputRefs[index - 1];
			if (prevRef?.current) {
				prevRef.current.focus();
			}
		}
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
		setCode(pastedText);
		setError(null);

		// Focus appropriate input after paste
		const nextIndex = Math.min(pastedText.length, 5);
		const targetRef = inputRefs[nextIndex];
		if (targetRef?.current) {
			targetRef.current.focus();
		}
	};

	const handleVerifyCode = async () => {
		if (!email || !code || code.length !== 6) {
			setError("Please enter your email and complete 6-digit code");
			return;
		}

		setIsVerifying(true);
		setError(null);

		try {
			const response = await fetch("/api/v1/auth/verify-code", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email,
					code,
					verification_type: "email_verification"
				})
			});

			const result: VerificationCodeResponse = await response.json();

			if (response.ok && result.success) {
				setSuccess(true);
				setTimeout(() => {
					onClose?.();
				}, 2000);
			} else {
				setError(result.message || "Verification failed");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setIsVerifying(false);
		}
	};

	const handleResendCode = async () => {
		if (!email) {
			setError("Please enter your email address");
			return;
		}

		setIsResending(true);
		setError(null);

		try {
			const response = await fetch("/api/v1/auth/send-verification", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ email })
			});

			if (response.ok) {
				setError(null);
				// Clear the code for new attempt
				setCode("");
				const firstRef = inputRefs[0];
				if (firstRef?.current) {
					firstRef.current.focus();
				}
			} else {
				setError("Failed to resend code. Please try again.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setIsResending(false);
		}
	};

	if (success) {
		return (
			<div className="bg-layout-background flex min-h-screen items-center justify-center">
				<div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
						<svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fillRule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<h2 className="mb-2 text-2xl font-bold text-green-600">Email Verified!</h2>
					<p className="text-text-primary">Your email has been successfully verified. You can now sign in.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-layout-background flex min-h-screen items-center justify-center">
			<div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
				<div className="text-center">
					<h2 className="text-text-primary mb-2 text-2xl font-bold">Verify Your Email</h2>
					<p className="text-text-primary mb-6">
						We've sent a 6-digit verification code to your email address.
					</p>
				</div>

				<form
					role="form"
					onSubmit={e => {
						e.preventDefault();
						handleVerifyCode();
					}}
				>
					{/* Email Input */}
					<div className="mb-4">
						<label htmlFor="email" className="text-text-primary mb-2 block text-sm font-medium">
							Email Address
						</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							className="focus:border-interactive focus:ring-interactive border-neutral-border w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
							placeholder="your@email.com"
							required
						/>
					</div>

					{/* Verification Code Input */}
					<div className="mb-6">
						<label
							id="verification-code-label"
							className="text-text-primary mb-2 block text-sm font-medium"
						>
							Verification Code
						</label>
						<div className="flex justify-between gap-2">
							{inputRefs.map((ref, index) => (
								<input
									key={index}
									ref={ref}
									type="text"
									inputMode="numeric"
									maxLength={1}
									value={code[index] || ""}
									onChange={e => handleCodeChange(index, e.target.value)}
									onKeyDown={e => handleKeyDown(index, e)}
									onPaste={handlePaste}
									aria-labelledby="verification-code-label"
									className="focus:border-interactive focus:ring-interactive border-neutral-border h-12 w-12 rounded-md border text-center text-lg font-semibold focus:ring-1 focus:outline-none"
								/>
							))}
						</div>
					</div>

					{/* Error Message */}
					{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

					{/* Verify Button */}
					<button
						type="submit"
						disabled={isVerifying || code.length !== 6}
						className="bg-interactive hover:bg-interactive-hover w-full rounded-md px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isVerifying ? "Verifying..." : "Verify Email"}
					</button>

					{/* Resend Code */}
					<div className="mt-4 text-center">
						<button
							type="button"
							onClick={handleResendCode}
							disabled={isResending}
							className="text-interactive hover:text-interactive-hover text-sm disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isResending ? "Sending..." : "Didn't receive a code? Resend"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EmailVerificationPage;
