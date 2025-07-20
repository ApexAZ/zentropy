import React, { useState, useEffect, useCallback } from "react";
import { AuthService } from "../services/AuthService";
import type { AuthUser, CustomError } from "../types";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import { useFormValidation } from "../hooks/useFormValidation";
import RequiredAsterisk from "./RequiredAsterisk";
import PasswordRequirements from "./PasswordRequirements";
import { setPendingVerification } from "../utils/pendingVerification";
import { useToast } from "../contexts/ToastContext";

type AuthMode = "signin" | "signup";

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	onShowVerification?: (email: string) => void;
	auth: {
		isAuthenticated: boolean;
		user: AuthUser | null;
		token: string | null;
		login: (token: string, user: AuthUser, rememberMe?: boolean) => void;
		logout: () => Promise<void>;
	};
	initialMode?: AuthMode;
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
	const [showPasswords, setShowPasswords] = useState({ password: false, confirm_password: false });
	const { showSuccess, showError, showInfo, showCriticalError } = useToast();

	const signInForm = useFormValidation<any>({
		initialValues: { email: "", password: "", remember_me: false },
		validate: (data: any) => {
			const errors: Record<string, string> = {};
			if (!data.email.trim()) errors.email = "Email is required";
			else if (!AuthService.validateEmail(data.email)) errors.email = "Please enter a valid email address";
			if (!data.password.trim()) errors.password = "Password is required";
			return { isValid: Object.keys(errors).length === 0, errors };
		},
		onSubmit: async (values: any) => {
			const { token, user } = await AuthService.signIn(values);
			auth.login(token, user, values.remember_me);
			showSuccess("Successfully signed in!");
			onSuccess();
			setTimeout(() => onClose(), import.meta.env.NODE_ENV === "test" ? 0 : 1000);
		}
	});

	const signUpForm = useFormValidation<any>({
		initialValues: {
			first_name: "",
			last_name: "",
			email: "",
			password: "",
			confirm_password: "",
			terms_agreement: false,
			has_projects_access: true
		},
		validate: (data: any) => {
			const errors: Record<string, string> = {};
			if (!data.first_name.trim()) errors.first_name = "First name is required";
			if (!data.last_name.trim()) errors.last_name = "Last name is required";
			if (!data.email.trim()) errors.email = "Email is required";
			else if (!AuthService.validateEmail(data.email)) errors.email = "Please enter a valid email address";
			if (!data.password.trim()) errors.password = "Password is required";
			else {
				const pwValidation = AuthService.validatePassword(data.password, data.confirm_password);
				if (!pwValidation.isValid) errors.password = "Password does not meet requirements";
			}
			if (data.password !== data.confirm_password) errors.confirm_password = "Passwords do not match";
			if (!data.terms_agreement) errors.terms_agreement = "You must agree to the terms";
			return { isValid: Object.keys(errors).length === 0, errors };
		},
		onSubmit: async (values: any) => {
			const { message } = await AuthService.signUp(values);
			showSuccess(message);
			setPendingVerification(values.email);
			setTimeout(
				() => {
					if (onShowVerification) onShowVerification(values.email);
					else {
						onSuccess();
						onClose();
					}
				},
				import.meta.env.NODE_ENV === "test" ? 0 : 1500
			);
		}
	});

	const { isReady: isGoogleReady, triggerOAuth } = useGoogleOAuth({
		onSuccess: async (credential: string) => {
			setIsLoading(true);
			try {
				const { token, user } = await AuthService.oauthSignIn("google", credential);
				auth.login(token, user, true); // Google OAuth defaults to persistent login
				showSuccess("Successfully signed in with Google!");
				onSuccess();
				setTimeout(() => onClose(), import.meta.env.NODE_ENV === "test" ? 0 : 1000);
			} catch (error) {
				showError(error instanceof Error ? error.message : "Google sign in failed");
			} finally {
				setIsLoading(false);
			}
		},
		onError: error => showError(error)
	});

	const resetForms = useCallback(() => {
		signInForm.resetForm();
		signUpForm.resetForm();
		setShowPasswords({ password: false, confirm_password: false });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Intentionally omitting signInForm and signUpForm to prevent infinite loop

	useEffect(() => {
		if (isOpen) setMode(initialMode);
		else resetForms();
	}, [isOpen, initialMode, resetForms]);

	const handleSubmit = async (e: React.FormEvent, form: typeof signInForm | typeof signUpForm) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			await form.handleSubmit(e);
		} catch (error) {
			const message = error instanceof Error ? error.message : "An unexpected error occurred.";
			if ((error as CustomError).type === "email_not_verified" && onShowVerification) {
				setPendingVerification(signInForm.values.email);
				showInfo("Please verify your email to sign in");
				setTimeout(() => onShowVerification(signInForm.values.email), 1500);
			} else if ((error as CustomError).type === "email_already_exists") {
				showCriticalError(message, {
					text: "Sign in",
					onClick: () => {
						setMode("signin");
						signInForm.setFieldValue("email", signUpForm.values.email);
					}
				});
			} else {
				// For sign-in authentication errors, add field-level error indication
				if (
					mode === "signin" &&
					(message.toLowerCase().includes("invalid") ||
						message.toLowerCase().includes("incorrect") ||
						message.toLowerCase().includes("credential"))
				) {
					// Set field-level errors for better UX
					signInForm.setFieldError("password", "Incorrect email or password");
					signInForm.setFieldTouched("password", true);
				}
				showError(message);
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	const renderInput = (form: any, name: string, type: string, label: string, required = true) => (
		<div>
			<label htmlFor={name} className="text-text-primary mb-1 block text-sm font-medium">
				{label} <RequiredAsterisk isEmpty={!form.values[name]?.trim()} isRequired={required} />
			</label>
			<div className="relative">
				<input
					id={name}
					type={showPasswords[name as keyof typeof showPasswords] ? "text" : type}
					name={name}
					value={form.values[name]}
					onChange={e => form.handleChange(name, e.target.value)}
					onBlur={() => form.handleBlur(name)}
					className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 pr-10 focus:ring-1"
					disabled={isLoading}
				/>
				{type === "password" && (
					<button
						type="button"
						onClick={() => setShowPasswords(p => ({ ...p, [name]: !p[name as keyof typeof p] }))}
						className="text-text-primary/50 hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2 transform"
					>
						{showPasswords[name as keyof typeof showPasswords] ? "👁️" : "👁️‍🗨️"}
					</button>
				)}
			</div>
			{form.touched[name] && form.errors[name] && <p className="text-error mt-1 text-sm">{form.errors[name]}</p>}
		</div>
	);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-xl">
				<div className="p-6">
					<div className="mb-4 flex justify-end">
						<button onClick={onClose} className="text-text-primary/50 hover:text-text-primary">
							✕
						</button>
					</div>
					<div className="space-y-6">
						<div className="text-center">
							<h2 className="text-text-primary mb-2 text-2xl font-bold">
								{mode === "signin" ? "Sign In" : "Create Your Account"}
							</h2>
							<p className="text-text-primary/70">
								{mode === "signin" ? "Welcome back to Zentropy" : "Join Zentropy today"}
							</p>
						</div>
						{mode === "signin" ? (
							<form onSubmit={e => handleSubmit(e, signInForm)} className="space-y-4">
								{renderInput(signInForm, "email", "email", "Email")}
								{renderInput(signInForm, "password", "password", "Password")}
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
									disabled={isLoading}
									className="bg-interactive hover:bg-interactive-hover hover:text-text-primary w-full rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
								>
									{isLoading ? "Signing In..." : "Sign In"}
								</button>
							</form>
						) : (
							<form onSubmit={e => handleSubmit(e, signUpForm)} className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									{renderInput(signUpForm, "first_name", "text", "First Name")}
									{renderInput(signUpForm, "last_name", "text", "Last Name")}
								</div>
								{renderInput(signUpForm, "email", "email", "Email")}
								{renderInput(signUpForm, "password", "password", "Password")}
								<PasswordRequirements
									password={signUpForm.values.password}
									confirmPassword={signUpForm.values.confirm_password}
									showMatchRequirement={true}
								/>
								{renderInput(signUpForm, "confirm_password", "password", "Confirm Password")}
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
										<RequiredAsterisk
											isEmpty={!signUpForm.values.terms_agreement}
											isRequired={true}
										/>
									</label>
								</div>
								{signUpForm.touched.terms_agreement && signUpForm.errors.terms_agreement && (
									<p className="text-error text-sm">{signUpForm.errors.terms_agreement}</p>
								)}
								<button
									type="submit"
									disabled={isLoading}
									className="bg-interactive hover:bg-interactive-hover hover:text-text-primary w-full rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
								>
									{isLoading ? "Creating Account..." : "Create Account"}
								</button>
							</form>
						)}
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="border-layout-background w-full border-t"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="bg-content-background text-text-primary/70 px-2">or</span>
							</div>
						</div>
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
				</div>
			</div>
		</div>
	);
};

export default AuthModal;
