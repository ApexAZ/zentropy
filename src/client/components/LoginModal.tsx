import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../hooks/useFormValidation";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import RequiredAsterisk from "./RequiredAsterisk";

interface LoginData {
	email: string;
	password: string;
	remember_me: boolean;
}

interface AuthUser {
	email: string;
	name: string;
	has_projects_access: boolean;
	email_verified: boolean;
}

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser, rememberMe?: boolean) => void;
	logout: () => Promise<void>;
}

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	auth: Auth;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, auth }) => {
	const [formData, setFormData] = useState<LoginData>({
		email: "",
		password: "",
		remember_me: false
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
	const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

	// Define which fields are required for form validation
	const requiredFields: (keyof LoginData)[] = ["email", "password"];

	// Use reusable form validation hook
	const { isFieldEmpty, getFieldBorderClass, isFieldRequired } = useFormValidation(formData, requiredFields);

	const modalRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

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

	// Hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	// Clear form data when modal closes
	useEffect(() => {
		if (!isOpen) {
			// Clear form data for security when modal closes
			setFormData({
				email: "",
				password: "",
				remember_me: false
			});
			setErrors({});
			setToast(null);
		}
	}, [isOpen]);

	// Clear form data when user logs out (auth state changes)
	useEffect(() => {
		if (!auth.isAuthenticated) {
			// User logged out, clear any cached credentials
			setFormData({
				email: "",
				password: "",
				remember_me: false
			});
			setErrors({});
			setToast(null);
		}
	}, [auth.isAuthenticated]);

	const clearForm = (): void => {
		setFormData({
			email: "",
			password: "",
			remember_me: false
		});
		setErrors({});
		setToast(null);
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Email validation
		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		// Password validation
		if (!formData.password) {
			newErrors.password = "Password is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/auth/login-json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					email: formData.email,
					password: formData.password,
					remember_me: formData.remember_me
				})
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { detail?: string };
				throw new Error(errorData.detail ?? "Login failed");
			}

			const data = (await response.json()) as {
				access_token: string;
				token_type: string;
				user: {
					email: string;
					first_name: string;
					last_name: string;
					organization: string;
					has_projects_access: boolean;
					email_verified: boolean;
				};
			};

			// Create user object from backend response
			const user: AuthUser = {
				email: data.user.email,
				name: `${data.user.first_name} ${data.user.last_name}`,
				has_projects_access: data.user.has_projects_access || false,
				email_verified: data.user.email_verified || false
			};

			// Update auth state with token and user info
			auth.login(data.access_token, user, formData.remember_me);

			// Clear form immediately for security
			clearForm();

			// Call success callback
			onSuccess();
			onClose();
		} catch (err) {
			setToast({
				message: err instanceof Error ? err.message : "Login failed. Please try again.",
				type: "error"
			});
		} finally {
			setIsLoading(false);
		}
	};

	const togglePasswordVisibility = (): void => {
		setShowPassword(prev => !prev);
	};

	// Google OAuth integration using the same approach as registration
	const {
		isReady: isGoogleReady,
		isLoading: isGoogleLoading,
		error: googleError,
		triggerOAuth
	} = useGoogleOAuth({
		onSuccess: async (credential: string) => {
			setIsProcessingOAuth(true);
			try {
				// Make API call to backend OAuth endpoint for login
				const response = await fetch("/api/auth/google-oauth", {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ credential })
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.detail || "Google OAuth authentication failed");
				}

				const data = await response.json();
				console.log("Google OAuth login successful:", data);

				// Store auth token and update state
				if (data.access_token && data.user) {
					const user: AuthUser = {
						email: data.user.email,
						name: `${data.user.first_name} ${data.user.last_name}`,
						has_projects_access: data.user.has_projects_access || false,
						email_verified: data.user.email_verified || false
					};

					auth.login(data.access_token, user, formData.remember_me);

					// Clear form and close modal
					clearForm();
					onSuccess();
					onClose();
				}
			} catch (err) {
				setToast({
					message: err instanceof Error ? err.message : "Google Sign-In failed",
					type: "error"
				});
			} finally {
				setIsProcessingOAuth(false);
			}
		},
		onError: (errorMessage: string) => {
			setToast({
				message: errorMessage,
				type: "error"
			});
			setIsProcessingOAuth(false);
		}
	});

	const handleGoogleSignIn = (): void => {
		if (!isGoogleReady) {
			setToast({
				message: "Google Sign-In not available",
				type: "error"
			});
			return;
		}

		triggerOAuth();
	};

	if (!isOpen) {
		return null;
	}

	return (
		<>
			{/* Modal backdrop - dimmed for form emphasis */}
			<div className="fixed inset-0 z-[998] bg-black/50" data-testid="modal-backdrop" onClick={onClose} />

			{/* Modal container */}
			<div className="pointer-events-none fixed inset-0 z-[999] flex items-center justify-center p-4">
				<div
					ref={modalRef}
					className="bg-content-background border-layout-background pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border shadow-lg"
					role="dialog"
					aria-modal="true"
					aria-labelledby="login-modal-title"
				>
					{/* Modal header */}
					<div className="border-layout-background bg-layout-background border-b p-6">
						<div className="flex items-center justify-between">
							<div className="text-center">
								<h1 className="text-interactive mb-2 text-2xl font-bold">Zentropy</h1>
								<h2 id="login-modal-title" className="text-text-primary text-xl font-semibold">
									Welcome Back
								</h2>
								<p className="text-text-primary text-sm">Sign in to your Zentropy account</p>
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

					{/* OAuth Providers Section */}
					<div className="p-6 pb-0">
						<div className="w-full">
							<div className="mb-6">
								<p className="text-text-primary mb-4 text-center text-sm">
									Continue with your preferred account
								</p>

								{/* Error Display */}
								{googleError && (
									<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
										<div className="text-sm text-red-700">{googleError}</div>
									</div>
								)}

								{/* Google OAuth Button */}
								<div className="grid grid-cols-4 gap-3">
									<button
										type="button"
										onClick={handleGoogleSignIn}
										disabled={!isGoogleReady || isGoogleLoading || isProcessingOAuth || isLoading}
										className={`border-layout-background bg-content-background text-text-primary hover:bg-layout-background flex aspect-square items-center justify-center rounded-lg border p-3 transition-all duration-200 hover:-translate-y-px hover:shadow-md ${
											!isGoogleReady || isGoogleLoading || isProcessingOAuth || isLoading
												? "cursor-not-allowed opacity-50"
												: "cursor-pointer"
										}`}
										aria-label={
											isProcessingOAuth
												? "Processing authentication..."
												: isGoogleLoading
													? "Loading..."
													: !isGoogleReady
														? "Google Sign-In not available"
														: "Continue with Google"
										}
										title={
											isProcessingOAuth
												? "Processing authentication..."
												: isGoogleLoading
													? "Loading..."
													: !isGoogleReady
														? "Google Sign-In not available"
														: "Continue with Google"
										}
									>
										{isProcessingOAuth || isGoogleLoading ? (
											<div
												className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-current"
												role="progressbar"
												aria-label="Loading"
											></div>
										) : (
											<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
										)}
									</button>

									{/* Placeholder buttons for future OAuth providers */}
									<button
										type="button"
										disabled={true}
										className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
										aria-label="Microsoft (Coming Soon)"
										title="Microsoft (Coming Soon)"
									>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
											<rect x="1" y="1" width="10" height="10" fill="#F25022" />
											<rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
											<rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
											<rect x="13" y="13" width="10" height="10" fill="#FFB900" />
										</svg>
									</button>

									<button
										type="button"
										disabled={true}
										className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
										aria-label="GitHub (Coming Soon)"
										title="GitHub (Coming Soon)"
									>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.300 24 12c0-6.627-5.373-12-12-12z" />
										</svg>
									</button>

									<button
										type="button"
										disabled={true}
										className="border-layout-background bg-content-background text-text-primary flex aspect-square cursor-not-allowed items-center justify-center rounded-lg border p-3 opacity-50"
										aria-label="Apple (Coming Soon)"
										title="Apple (Coming Soon)"
									>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
										</svg>
									</button>
								</div>
							</div>

							{/* Divider */}
							<div className="my-6 flex items-center">
								<div className="border-layout-background flex-1 border-t"></div>
								<span className="text-text-primary bg-content-background px-4 text-sm">
									or continue with email
								</span>
								<div className="border-layout-background flex-1 border-t"></div>
							</div>
						</div>
					</div>

					{/* Login Form */}
					<form onSubmit={e => void handleSubmit(e)} className="p-6 pt-0" noValidate>
						<div className="mb-4 flex flex-col gap-2">
							<label htmlFor="email" className="text-text-primary block text-sm font-medium">
								Email Address
								<RequiredAsterisk
									isEmpty={isFieldEmpty("email")}
									isRequired={isFieldRequired("email")}
								/>
							</label>
							<input
								type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={e => setFormData({ ...formData, email: e.target.value })}
								className={`${getFieldBorderClass("email")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none`}
								required
								autoComplete="off"
								placeholder="Enter your email address"
							/>
							{errors.email && <div className="mt-1 text-sm text-red-600">{errors.email}</div>}
						</div>

						<div className="mb-4 flex flex-col gap-2">
							<label htmlFor="password" className="text-text-primary block text-sm font-medium">
								Password
								<RequiredAsterisk
									isEmpty={isFieldEmpty("password")}
									isRequired={isFieldRequired("password")}
								/>
							</label>
							<div className="relative flex items-center">
								<input
									type={showPassword ? "text" : "password"}
									id="password"
									name="password"
									value={formData.password}
									onChange={e => setFormData({ ...formData, password: e.target.value })}
									className={`${getFieldBorderClass("password")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 pr-20 text-base leading-6 transition-all duration-200 focus:outline-none`}
									required
									autoComplete="off"
									placeholder="Enter your password"
								/>
								<button
									type="button"
									onClick={togglePasswordVisibility}
									className="text-text-primary hover:bg-layout-background hover:text-text-primary absolute right-3 cursor-pointer rounded-sm border-none bg-none p-1 transition-colors duration-200"
									aria-label="Toggle password visibility"
								>
									{showPassword ? (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
										</svg>
									) : (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
											<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
										</svg>
									)}
								</button>
							</div>
							{errors.password && <div className="mt-1 text-sm text-red-600">{errors.password}</div>}
						</div>

						<div className="mb-6 flex flex-col gap-2">
							<label className="flex cursor-pointer items-center gap-3 text-sm">
								<input
									type="checkbox"
									id="remember-me"
									name="remember_me"
									checked={formData.remember_me}
									onChange={e => setFormData({ ...formData, remember_me: e.target.checked })}
									className="mt-0.5"
								/>
								<span className="text-text-primary">Remember me</span>
							</label>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={isLoading}
							className="bg-interactive hover:bg-interactive-hover hover:text-text-primary relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none p-3 px-6 text-base font-medium text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? (
								<>
									<svg
										className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"
										width="16"
										height="16"
										viewBox="0 0 24 24"
									>
										<circle
											cx="12"
											cy="12"
											r="10"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										/>
									</svg>
									Signing In...
								</>
							) : (
								"Sign In"
							)}
						</button>
					</form>
				</div>
			</div>

			{/* Toast */}
			{toast && (
				<div className="fixed top-5 right-5 z-[1100] min-w-[300px] animate-[slideIn_0.3s_ease] rounded-md shadow-lg">
					<div
						className={`flex items-center justify-between gap-2 p-4 ${
							toast.type === "success"
								? "border-layout-background bg-layout-background border"
								: toast.type === "error"
									? "border border-red-200 bg-red-50"
									: "border-layout-background bg-layout-background border"
						}`}
					>
						<div
							className={`flex-1 text-sm leading-5 ${
								toast.type === "success"
									? "text-text-primary"
									: toast.type === "error"
										? "text-red-700"
										: "text-text-primary"
							}`}
						>
							{toast.message}
						</div>
						<button
							onClick={() => setToast(null)}
							className="opacity-80 transition-opacity duration-200 hover:opacity-100"
							aria-label="Close notification"
						>
							&times;
						</button>
					</div>
				</div>
			)}

			<style>{`
				@keyframes slideIn {
					from { opacity: 0; transform: translateX(100%); }
					to { opacity: 1; transform: translateX(0); }
				}
			`}</style>
		</>
	);
};

export default LoginModal;
