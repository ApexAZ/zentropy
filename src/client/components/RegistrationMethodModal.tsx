import React, { useEffect, useRef, useState } from "react";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";

interface RegistrationMethodModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectEmail: () => void;
	onSelectGoogle: (credential?: string) => void;
}

const RegistrationMethodModal: React.FC<RegistrationMethodModalProps> = ({
	isOpen,
	onClose,
	onSelectEmail,
	onSelectGoogle
}) => {
	const modalRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const googleButtonRef = useRef<HTMLButtonElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

	// Re-enable Google OAuth integration
	const {
		isReady: isGoogleReady,
		isLoading: isGoogleLoading,
		error: googleError,
		initializeButton
	} = useGoogleOAuth({
		onSuccess: async (credential: string) => {
			setIsProcessingOAuth(true);
			try {
				await onSelectGoogle(credential);
				onClose();
			} catch (err) {
				setError(err instanceof Error ? err.message : "OAuth authentication failed");
			} finally {
				setIsProcessingOAuth(false);
			}
		},
		onError: (errorMessage: string) => {
			setError(errorMessage);
			setIsProcessingOAuth(false);
		}
	});

	// Focus management
	useEffect(() => {
		if (isOpen && closeButtonRef.current) {
			closeButtonRef.current.focus();
		}
	}, [isOpen]);

	// Handle escape key and outside clicks
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			document.addEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	// Initialize Google button when modal opens and Google is ready
	useEffect(() => {
		if (isOpen && isGoogleReady && googleButtonRef.current) {
			initializeButton(googleButtonRef.current);
		}
	}, [isOpen, isGoogleReady, initializeButton]);

	const handleSelectGoogle = (): void => {
		// For manual click, we'll use the Google button which should trigger OAuth
		// This is a fallback in case the Google button doesn't work
		if (!isGoogleReady) {
			setError("Google Sign-In not available");
			return;
		}
		// Google OAuth will be handled by the Google button itself
		// The useGoogleOAuth hook handles the credential response
	};

	const handleSelectEmail = (): void => {
		onSelectEmail();
		onClose();
	};

	if (!isOpen) {
		return null;
	}

	return (
		<>
			{/* Modal backdrop */}
			<div className="fixed inset-0 z-[998] bg-black/50" data-testid="modal-backdrop" onClick={onClose} />

			{/* Modal container */}
			<div className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center p-4">
				<div
					ref={modalRef}
					className="bg-content-background border-layout-background pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border shadow-lg"
					role="dialog"
					aria-modal="true"
					aria-labelledby="registration-method-modal-title"
				>
					{/* Modal header */}
					<div className="border-layout-background bg-layout-background border-b p-6">
						<div className="flex items-center justify-between">
							<div className="text-center">
								<h1 className="text-interactive mb-2 text-2xl font-bold">Zentropy</h1>
								<h2
									id="registration-method-modal-title"
									className="text-text-primary text-xl font-semibold"
								>
									Create Your Account
								</h2>
								<p className="text-text-primary text-sm">Choose your preferred registration method</p>
							</div>
							<button
								ref={closeButtonRef}
								onClick={onClose}
								className="text-text-primary hover:text-text-contrast cursor-pointer rounded-md border-none bg-none p-2 text-2xl transition-colors duration-200"
								aria-label="Close"
							>
								&times;
							</button>
						</div>
					</div>

					{/* Registration Methods */}
					<div className="p-6">
						{/* Error Display */}
						{(error || googleError) && (
							<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
								<div className="text-sm text-red-700">{error || googleError}</div>
							</div>
						)}

						<div className="mb-6">
							<p className="text-text-primary mb-6 text-center text-sm">
								Continue with your preferred account
							</p>

							{/* Registration method grid - 2x2 layout */}
							<div className="grid grid-cols-2 gap-4">
								{/* Google OAuth */}
								<button
									ref={googleButtonRef}
									type="button"
									onClick={handleSelectGoogle}
									disabled={!isGoogleReady || isGoogleLoading || isProcessingOAuth}
									className={`border-layout-background bg-content-background text-text-primary flex h-20 flex-col items-center justify-center rounded-lg border p-4 transition-all duration-200 ${
										!isGoogleReady || isGoogleLoading || isProcessingOAuth
											? "cursor-not-allowed opacity-50"
											: "hover:bg-layout-background cursor-pointer hover:-translate-y-px hover:shadow-md"
									}`}
									aria-label={
										isProcessingOAuth
											? "Processing authentication..."
											: isGoogleLoading
												? "Loading..."
												: !isGoogleReady
													? import.meta.env.VITE_GOOGLE_CLIENT_ID
														? "Google Sign-In temporarily unavailable"
														: "Google Sign-In not configured"
													: "Continue with Google"
									}
									aria-describedby="google-oauth-status"
									title={
										isProcessingOAuth
											? "Processing authentication..."
											: isGoogleLoading
												? "Loading..."
												: !isGoogleReady
													? import.meta.env.VITE_GOOGLE_CLIENT_ID
														? "Google Sign-In temporarily unavailable"
														: "Google Sign-In not configured"
													: "Continue with Google"
									}
								>
									{isProcessingOAuth ? (
										<>
											<div
												className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-current"
												role="progressbar"
												aria-label="Processing"
											></div>
											<span className="text-xs">Processing...</span>
										</>
									) : isGoogleLoading ? (
										<>
											<div
												className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-current"
												role="progressbar"
												aria-label="Loading"
											></div>
											<span className="text-xs">Loading...</span>
										</>
									) : (
										<>
											{/* Google "G" Logo */}
											<svg
												width="24"
												height="24"
												viewBox="0 0 24 24"
												fill="none"
												className="mb-2"
											>
												<path
													d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
													fill="#4285F4"
												/>
												<path
													d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
													fill="#34A853"
												/>
												<path
													d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
													fill="#FBBC05"
												/>
												<path
													d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
													fill="#EA4335"
												/>
											</svg>
											<span className="text-xs">
												{!isGoogleReady
													? import.meta.env.VITE_GOOGLE_CLIENT_ID
														? "Google Sign-In temporarily unavailable"
														: "Google Sign-In not configured"
													: "Continue with Google"}
											</span>
										</>
									)}
								</button>
								<div id="google-oauth-status" className="sr-only">
									{isGoogleReady ? "Google Sign-In ready" : "Google Sign-In not available"}
								</div>

								{/* Email Registration */}
								<button
									type="button"
									onClick={handleSelectEmail}
									className="border-layout-background bg-content-background text-text-primary hover:bg-layout-background flex h-20 cursor-pointer flex-col items-center justify-center rounded-lg border p-4 transition-all duration-200 hover:-translate-y-px hover:shadow-md"
									aria-label="Continue with Email"
									title="Continue with Email"
								>
									{/* Email Icon */}
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="mb-2"
									>
										<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
									</svg>
									<span className="text-xs">Continue with Email</span>
								</button>

								{/* Microsoft OAuth - Placeholder */}
								<button
									type="button"
									disabled={true}
									className="border-layout-background bg-content-background text-text-primary flex h-20 cursor-not-allowed flex-col items-center justify-center rounded-lg border p-4 opacity-50"
									aria-label="Microsoft (Coming Soon)"
									title="Microsoft (Coming Soon)"
								>
									{/* Microsoft Logo */}
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mb-2">
										<rect x="1" y="1" width="10" height="10" fill="#F25022" />
										<rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
										<rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
										<rect x="13" y="13" width="10" height="10" fill="#FFB900" />
									</svg>
									<span className="text-xs">Coming Soon</span>
								</button>

								{/* GitHub OAuth - Placeholder */}
								<button
									type="button"
									disabled={true}
									className="border-layout-background bg-content-background text-text-primary flex h-20 cursor-not-allowed flex-col items-center justify-center rounded-lg border p-4 opacity-50"
									aria-label="GitHub (Coming Soon)"
									title="GitHub (Coming Soon)"
								>
									{/* GitHub Logo */}
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="mb-2"
									>
										<path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z" />
									</svg>
									<span className="text-xs">Coming Soon</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default RegistrationMethodModal;
