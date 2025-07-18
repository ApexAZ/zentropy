import React, { useState, useEffect, useCallback } from "react";
import { AuthService } from "../services/AuthService";
import type { AuthUser, SignInCredentials, SignUpData, CustomError } from "../types";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import { useFormValidation } from "../hooks/useFormValidation";
import RequiredAsterisk from "./RequiredAsterisk";
import { setPendingVerification } from "../utils/pendingVerification";
import { useToast } from "../contexts/ToastContext";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
	/** Controls modal visibility */
	isOpen: boolean;
	/** Called when user closes modal or clicks outside */
	onClose: () => void;
	/** Called when authentication succeeds */
	onSuccess: () => void;
	/** Called when user needs to verify their email */
	onShowVerification?: (email: string) => void;
	/** Authentication state and methods from useAuth hook */
	auth: {
		/** Current authentication status */
		isAuthenticated: boolean;
		/** Currently authenticated user data, null if not authenticated */
		user: AuthUser | null;
		/** JWT authentication token, null if not authenticated */
		token: string | null;
		/** Function to log in user with token and user data */
		login: (token: string, user: AuthUser, rememberMe?: boolean) => void;
		/** Function to log out current user */
		logout: () => Promise<void>;
	};
	/** Initial authentication mode to display when modal opens */
	initialMode?: AuthMode;
}

interface SignInFormData {
	email: string;
	password: string;
	remember_me: boolean;
}

interface SignUpFormData {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	confirm_password: string;
	terms_agreement: boolean;
	has_projects_access: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	onShowVerification,
	auth,
	initialMode = "signin"
}) => {
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [showPasswords, setShowPasswords] = useState({
		password: false,
		confirm: false
	});

	// Centralized toast notifications
	const { showSuccess, showError, showInfo, showCriticalError } = useToast();

	// Sign In Form with useFormValidation
	const signInForm = useFormValidation<SignInFormData>({
		initialValues: {
			email: "",
			password: "",
			remember_me: false
		},
		validate: data => {
			const errors: Record<string, string> = {};

			if (!data.email.trim()) {
				errors.email = "Email is required";
			} else if (!AuthService.validateEmail(data.email)) {
				errors.email = "Please enter a valid email address";
			}

			if (!data.password.trim()) {
				errors.password = "Password is required";
			}

			return {
				isValid: Object.keys(errors).length === 0,
				errors
			};
		},
		onSubmit: async values => {
			const credentials: SignInCredentials = {
				email: values.email,
				password: values.password,
				remember_me: values.remember_me
			};

			const { token, user } = await AuthService.signIn(credentials);
			auth.login(token, user, values.remember_me);

			showSuccess("Successfully signed in!");

			// Core business logic (always immediate, testable)
			onSuccess();

			// UX/Accessibility timing (environment-specific)
			const closeDelay = import.meta.env.NODE_ENV === "test" ? 0 : 1000;
			setTimeout(() => onClose(), closeDelay);
		}
	});

	// Sign Up Form with useFormValidation
	const signUpForm = useFormValidation<SignUpFormData>({
		initialValues: {
			first_name: "",
			last_name: "",
			email: "",
			password: "",
			confirm_password: "",
			terms_agreement: false,
			has_projects_access: true
		},
		validate: data => {
			const errors: Record<string, string> = {};

			if (!data.first_name.trim()) {
				errors.first_name = "First name is required";
			}

			if (!data.last_name.trim()) {
				errors.last_name = "Last name is required";
			}

			if (!data.email.trim()) {
				errors.email = "Email is required";
			} else if (!AuthService.validateEmail(data.email)) {
				errors.email = "Please enter a valid email address";
			}

			if (!data.password.trim()) {
				errors.password = "Password is required";
			} else {
				const passwordValidation = AuthService.validatePassword(data.password, data.confirm_password);
				if (!passwordValidation.isValid) {
					errors.password = "Password does not meet requirements";
				}
			}

			if (!data.confirm_password.trim()) {
				errors.confirm_password = "Confirm password is required";
			} else if (data.password !== data.confirm_password) {
				errors.confirm_password = "Passwords do not match";
			}

			if (!data.terms_agreement) {
				errors.terms_agreement = "You must agree to the terms";
			}

			return {
				isValid: Object.keys(errors).length === 0,
				errors
			};
		},
		onSubmit: async values => {
			const userData: SignUpData = {
				first_name: values.first_name,
				last_name: values.last_name,
				email: values.email,
				password: values.password,
				terms_agreement: values.terms_agreement,
				has_projects_access: values.has_projects_access
			};

			const { message } = await AuthService.signUp(userData);

			showSuccess(message);

			// Core business logic (always immediate, testable)
			setPendingVerification(values.email);

			// UX/Accessibility timing (environment-specific)
			const showVerificationDelay = import.meta.env.NODE_ENV === "test" ? 0 : 1500;
			setTimeout(() => {
				if (onShowVerification) {
					onShowVerification(values.email);
				} else {
					// Fallback to old behavior if verification handler not provided
					onSuccess();
					onClose();
				}
			}, showVerificationDelay);
		}
	});

	// Google OAuth
	const { isReady: isGoogleReady, triggerOAuth } = useGoogleOAuth({
		onSuccess: handleGoogleSuccess,
		onError: error => showError(error)
	});

	// Reset form helper function - stable reference to avoid infinite loops
	const resetForms = useCallback(() => {
		signInForm.resetForm();
		signUpForm.resetForm();
		setShowPasswords({ password: false, confirm: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Remove form dependencies to prevent infinite loop

	// Toast auto-dismiss is now handled by the centralized ToastProvider

	// Reset form when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setMode(initialMode);
			resetForms();
			// Toast cleanup is now handled by the centralized ToastProvider
		} else {
			// When modal opens, ensure mode matches initialMode
			setMode(initialMode);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, initialMode]); // Remove resetForms from dependencies to prevent infinite loop

	const handleSignIn = async (e: React.FormEvent) => {
		setIsLoading(true);

		try {
			await signInForm.handleSubmit(e);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Sign in failed";

			// Check if the error is related to unverified email
			const errorType = (error as CustomError).type;
			if (
				errorType === "email_not_verified" ||
				message.toLowerCase().includes("verify") ||
				message.toLowerCase().includes("verification")
			) {
				// Set pending verification state for recovery
				setPendingVerification(signInForm.values.email);

				// Show verification modal if handler is available
				if (onShowVerification) {
					showInfo("Please verify your email to sign in");

					// UX/Accessibility timing (environment-specific)
					const verificationDelay = import.meta.env.NODE_ENV === "test" ? 0 : 1500;
					setTimeout(() => {
						onShowVerification(signInForm.values.email);
					}, verificationDelay);
				} else {
					showError(message);
				}
			} else {
				showError(message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		setIsLoading(true);

		try {
			await signUpForm.handleSubmit(e);
		} catch (error) {
			let message = "Registration failed";

			if (error instanceof Error) {
				message = error.message;

				// Handle specific error types
				const errorType = (error as CustomError).type;
				if (errorType === "email_already_exists") {
					// For duplicate email, show persistent error with sign-in link
					showCriticalError(error.message, {
						text: "Sign in",
						onClick: () => {
							setMode("signin");
							signInForm.setFieldValue("email", signUpForm.values.email);
						}
					});
					return; // Exit early to avoid setting the regular toast
				}
			}

			showError(message);
		} finally {
			setIsLoading(false);
		}
	};

	async function handleGoogleSuccess(credential: string) {
		setIsLoading(true);

		try {
			const { token, user } = await AuthService.oauthSignIn("google", credential);
			auth.login(token, user, false);

			showSuccess("Successfully signed in with Google!");

			// Core business logic (always immediate, testable)
			onSuccess();

			// UX/Accessibility timing (environment-specific)
			// Critical for OAuth: Google's backend needs time to complete cross-domain processing
			const closeDelay = import.meta.env.NODE_ENV === "test" ? 0 : 1000;
			setTimeout(() => onClose(), closeDelay);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Google sign in failed";
			showError(message);
		} finally {
			setIsLoading(false);
		}
	}

	if (!isOpen) return null;

	const renderSignIn = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-text-primary mb-2 text-2xl font-bold">Sign In</h2>
				<p className="text-text-primary/70">Welcome back to Zentropy</p>
			</div>

			<form onSubmit={handleSignIn} className="space-y-4">
				<div>
					<label className="text-text-primary mb-1 block text-sm font-medium">
						Email <RequiredAsterisk isEmpty={!signInForm.values.email.trim()} isRequired={true} />
					</label>
					<input
						type="email"
						name="email"
						value={signInForm.values.email}
						onChange={e => signInForm.handleChange("email", e.target.value)}
						onBlur={() => signInForm.handleBlur("email")}
						className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
						disabled={isLoading}
					/>
					{signInForm.touched.email && signInForm.errors.email && (
						<p className="text-error mt-1 text-sm">{signInForm.errors.email}</p>
					)}
				</div>

				<div>
					<label className="text-text-primary mb-1 block text-sm font-medium">
						Password <RequiredAsterisk isEmpty={!signInForm.values.password.trim()} isRequired={true} />
					</label>
					<div className="relative">
						<input
							type={showPasswords.password ? "text" : "password"}
							name="password"
							value={signInForm.values.password}
							onChange={e => signInForm.handleChange("password", e.target.value)}
							onBlur={() => signInForm.handleBlur("password")}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 pr-10 focus:ring-1"
							disabled={isLoading}
						/>
						<button
							type="button"
							onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
							className="text-text-primary/50 hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform"
						>
							{showPasswords.password ? "👁️" : "👁️‍🗨️"}
						</button>
					</div>
					{signInForm.touched.password && signInForm.errors.password && (
						<p className="text-error mt-1 text-sm">{signInForm.errors.password}</p>
					)}
				</div>

				<div className="flex items-center">
					<input
						type="checkbox"
						id="remember_me"
						checked={signInForm.values.remember_me}
						onChange={e => signInForm.handleChange("remember_me", e.target.checked)}
						className="mr-2"
					/>
					<label htmlFor="remember_me" className="text-text-primary text-sm">
						Remember me
					</label>
				</div>

				<button
					type="submit"
					disabled={isLoading || signInForm.isSubmitting}
					className="bg-interactive hover:bg-interactive-hover hover:text-text-primary w-full rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
				>
					{isLoading || signInForm.isSubmitting ? "Signing In..." : "Sign In"}
				</button>
			</form>

			{/* Divider */}
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="border-layout-background w-full border-t"></div>
				</div>
				<div className="relative flex justify-center text-sm">
					<span className="bg-content-background text-text-primary/70 px-2">or</span>
				</div>
			</div>

			{/* Google OAuth Button */}
			<button
				onClick={triggerOAuth}
				disabled={!isGoogleReady || isLoading}
				className="border-layout-background bg-content-background hover:bg-layout-background flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 transition-colors disabled:opacity-50"
			>
				<svg className="h-5 w-5" viewBox="0 0 24 24">
					<path
						fill="#4285F4"
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
					/>
					<path
						fill="#34A853"
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
					/>
					<path
						fill="#FBBC05"
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
					/>
					<path
						fill="#EA4335"
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
					/>
				</svg>
				Continue with Google
			</button>
		</div>
	);

	const renderSignUp = () => {
		const passwordValidation = AuthService.validatePassword(
			signUpForm.values.password,
			signUpForm.values.confirm_password
		);

		return (
			<div className="space-y-6">
				<div className="text-center">
					<h2 className="text-text-primary mb-2 text-2xl font-bold">Create Your Account</h2>
					<p className="text-text-primary/70">Join Zentropy today</p>
				</div>

				<form onSubmit={handleSignUp} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								First Name{" "}
								<RequiredAsterisk isEmpty={!signUpForm.values.first_name.trim()} isRequired={true} />
							</label>
							<input
								type="text"
								name="first_name"
								value={signUpForm.values.first_name}
								onChange={e => signUpForm.handleChange("first_name", e.target.value)}
								onBlur={() => signUpForm.handleBlur("first_name")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={isLoading}
							/>
							{signUpForm.touched.first_name && signUpForm.errors.first_name && (
								<p className="text-error mt-1 text-sm">{signUpForm.errors.first_name}</p>
							)}
						</div>

						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								Last Name{" "}
								<RequiredAsterisk isEmpty={!signUpForm.values.last_name.trim()} isRequired={true} />
							</label>
							<input
								type="text"
								name="last_name"
								value={signUpForm.values.last_name}
								onChange={e => signUpForm.handleChange("last_name", e.target.value)}
								onBlur={() => signUpForm.handleBlur("last_name")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={isLoading}
							/>
							{signUpForm.touched.last_name && signUpForm.errors.last_name && (
								<p className="text-error mt-1 text-sm">{signUpForm.errors.last_name}</p>
							)}
						</div>
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Email <RequiredAsterisk isEmpty={!signUpForm.values.email.trim()} isRequired={true} />
						</label>
						<input
							type="email"
							name="email"
							value={signUpForm.values.email}
							onChange={e => signUpForm.handleChange("email", e.target.value)}
							onBlur={() => signUpForm.handleBlur("email")}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
							disabled={isLoading}
						/>
						{signUpForm.touched.email && signUpForm.errors.email && (
							<p className="text-error mt-1 text-sm">{signUpForm.errors.email}</p>
						)}
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Password <RequiredAsterisk isEmpty={!signUpForm.values.password.trim()} isRequired={true} />
						</label>
						<div className="relative">
							<input
								type={showPasswords.password ? "text" : "password"}
								name="password"
								value={signUpForm.values.password}
								onChange={e => signUpForm.handleChange("password", e.target.value)}
								onBlur={() => signUpForm.handleBlur("password")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 pr-10 focus:ring-1"
								disabled={isLoading}
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
								className="text-text-primary/50 hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform"
							>
								{showPasswords.password ? "👁️" : "👁️‍🗨️"}
							</button>
						</div>
						{signUpForm.values.password && (
							<div className="mt-2 space-y-1 text-xs">
								<div className={passwordValidation.requirements.length ? "text-success" : "text-error"}>
									✓ At least 8 characters
								</div>
								<div
									className={
										passwordValidation.requirements.uppercase ? "text-success" : "text-error"
									}
								>
									✓ One uppercase letter
								</div>
								<div
									className={
										passwordValidation.requirements.lowercase ? "text-success" : "text-error"
									}
								>
									✓ One lowercase letter
								</div>
								<div className={passwordValidation.requirements.number ? "text-success" : "text-error"}>
									✓ One number
								</div>
								<div className={passwordValidation.requirements.symbol ? "text-success" : "text-error"}>
									✓ One special character
								</div>
								{signUpForm.values.confirm_password && (
									<div
										className={
											passwordValidation.requirements.match ? "text-success" : "text-error"
										}
									>
										✓ Passwords match
									</div>
								)}
							</div>
						)}
						{signUpForm.touched.password && signUpForm.errors.password && (
							<p className="text-error mt-1 text-sm">{signUpForm.errors.password}</p>
						)}
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Confirm Password{" "}
							<RequiredAsterisk isEmpty={!signUpForm.values.confirm_password.trim()} isRequired={true} />
						</label>
						<div className="relative">
							<input
								type={showPasswords.confirm ? "text" : "password"}
								name="confirm_password"
								value={signUpForm.values.confirm_password}
								onChange={e => signUpForm.handleChange("confirm_password", e.target.value)}
								onBlur={() => signUpForm.handleBlur("confirm_password")}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 pr-10 focus:ring-1"
								disabled={isLoading}
							/>
							<button
								type="button"
								onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
								className="text-text-primary/50 hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform"
							>
								{showPasswords.confirm ? "👁️" : "👁️‍🗨️"}
							</button>
						</div>
						{signUpForm.touched.confirm_password && signUpForm.errors.confirm_password && (
							<p className="text-error mt-1 text-sm">{signUpForm.errors.confirm_password}</p>
						)}
					</div>

					<div className="flex items-start">
						<input
							type="checkbox"
							id="terms_agreement"
							checked={signUpForm.values.terms_agreement}
							onChange={e => signUpForm.handleChange("terms_agreement", e.target.checked)}
							className="mt-1 mr-2"
						/>
						<label htmlFor="terms_agreement" className="text-text-primary text-sm">
							I agree to the Terms of Service and Privacy Policy{" "}
							<RequiredAsterisk isEmpty={!signUpForm.values.terms_agreement} isRequired={true} />
						</label>
					</div>
					{signUpForm.touched.terms_agreement && signUpForm.errors.terms_agreement && (
						<p className="text-error text-sm">{signUpForm.errors.terms_agreement}</p>
					)}

					<button
						type="submit"
						disabled={isLoading || signUpForm.isSubmitting}
						className="bg-interactive hover:bg-interactive-hover hover:text-text-primary w-full rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
					>
						{isLoading || signUpForm.isSubmitting ? "Creating Account..." : "Create Account"}
					</button>
				</form>

				{/* Divider */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="border-layout-background w-full border-t"></div>
					</div>
					<div className="bg-content-background relative flex justify-center text-sm">
						<span className="text-text-primary/70 px-2">or</span>
					</div>
				</div>

				{/* Google OAuth Button */}
				<button
					onClick={triggerOAuth}
					disabled={!isGoogleReady || isLoading}
					className="border-layout-background bg-content-background hover:bg-layout-background flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 transition-colors disabled:opacity-50"
				>
					<svg className="h-5 w-5" viewBox="0 0 24 24">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Continue with Google
				</button>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-xl">
				<div className="p-6">
					{/* Close button */}
					<div className="mb-4 flex justify-end">
						<button onClick={onClose} className="text-text-primary/50 hover:text-text-primary">
							✕
						</button>
					</div>

					{/* Toast notification */}
					{/* Toast notifications are now handled by the centralized ToastProvider */}

					{/* Content based on mode */}
					{mode === "signin" && renderSignIn()}
					{mode === "signup" && renderSignUp()}
				</div>
			</div>
		</div>
	);
};

export default AuthModal;
