import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../hooks/useFormValidation";
import RequiredAsterisk from "./RequiredAsterisk";
import OAuthProviders from "./OAuthProviders";

interface LoginData {
	email: string;
	password: string;
	remember_me: boolean;
}

interface AuthUser {
	email: string;
	name: string;
}

interface Auth {
	isAuthenticated: boolean;
	user: AuthUser | null;
	token: string | null;
	login: (token: string, user: AuthUser) => void;
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
				};
			};

			// Create user object from backend response
			const user: AuthUser = {
				email: data.user.email,
				name: `${data.user.first_name} ${data.user.last_name}`
			};

			// Update auth state with token and user info
			auth.login(data.access_token, user);

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

	const handleGoogleSignIn = (credentialResponse: any): void => {
		console.log("Google OAuth credential:", credentialResponse);
		// TODO: Process the Google credential and call your backend API
		// The credential contains a JWT token with user info
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
						<OAuthProviders onGoogleSignIn={handleGoogleSignIn} disabled={isLoading} />
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
								autoComplete="email"
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
									autoComplete="current-password"
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
