import React, { useState, useEffect, useCallback } from "react";
import { AuthService } from "../services/AuthService";
import type { AuthUser, CustomError } from "../types";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import { useMicrosoftOAuth } from "../hooks/useMicrosoftOAuth";
import { useGitHubOAuth } from "../hooks/useGitHubOAuth";
import { useFormValidation } from "../hooks/useFormValidation";
import RequiredAsterisk from "./RequiredAsterisk";
import PasswordRequirements from "./PasswordRequirements";
import Form from "./atoms/Form";
import Button from "./atoms/Button";
import { setPendingVerification } from "../utils/pendingVerification";
import { useToast } from "../contexts/ToastContext";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";

type AuthMode = "signin" | "signup" | "forgot-password";

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
			email: "",
			password: "",
			confirm_password: "",
			terms_agreement: false,
			has_projects_access: true
		},
		validate: (data: any) => {
			const errors: Record<string, string> = {};
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
				const { token, user, action } = await AuthService.oauthSignIn("google", credential);
				auth.login(token, user, true); // Google OAuth defaults to persistent login

				if (action === "complete_profile") {
					showSuccess("Successfully signed in with Google! Please complete your profile.");
					// TODO: Redirect to profile completion
				} else {
					showSuccess("Successfully signed in with Google!");
				}
				onSuccess();
				setTimeout(() => onClose(), import.meta.env.NODE_ENV === "test" ? 0 : 1000);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Google sign in failed";

				// Handle specific error cases for better UX
				if (errorMessage.includes("temporarily unavailable")) {
					showError(errorMessage); // Use the improved error message from the hook
				} else {
					showError(errorMessage);
				}
			} finally {
				setIsLoading(false);
			}
		},
		onError: error => showError(error)
	});

	const { isReady: isMicrosoftReady, triggerOAuth: triggerMicrosoftOAuth } = useMicrosoftOAuth({
		onSuccess: async (credential: string) => {
			setIsLoading(true);
			try {
				const { token, user, action } = await AuthService.oauthSignIn("microsoft", credential);
				auth.login(token, user, true); // Microsoft OAuth defaults to persistent login

				if (action === "complete_profile") {
					showSuccess("Successfully signed in with Microsoft! Please complete your profile.");
					// TODO: Redirect to profile completion
				} else {
					showSuccess("Successfully signed in with Microsoft!");
				}
				onSuccess();
				setTimeout(() => onClose(), import.meta.env.NODE_ENV === "test" ? 0 : 1000);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "Microsoft sign in failed";

				// Handle specific error cases for better UX
				showError(errorMessage);
			} finally {
				setIsLoading(false);
			}
		},
		onError: error => showError(error)
	});

	const { isReady: isGitHubReady, triggerOAuth: triggerGitHubOAuth } = useGitHubOAuth({
		onSuccess: async (credential: string) => {
			setIsLoading(true);
			try {
				const { token, user, action } = await AuthService.oauthSignIn("github", credential);
				auth.login(token, user, true); // GitHub OAuth defaults to persistent login

				if (action === "complete_profile") {
					showSuccess("Successfully signed in with GitHub! Please complete your profile.");
					// TODO: Redirect to profile completion
				} else {
					showSuccess("Successfully signed in with GitHub!");
				}
				onSuccess();
				setTimeout(() => onClose(), import.meta.env.NODE_ENV === "test" ? 0 : 1000);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "GitHub sign in failed";

				// Handle specific error cases for better UX
				showError(errorMessage);
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

	const handleSignInSubmit = async () => {
		setIsLoading(true);
		try {
			await signInForm.handleSubmit(new Event("submit") as any);
		} catch (error) {
			const message = error instanceof Error ? error.message : "An unexpected error occurred.";
			if ((error as CustomError).type === "email_not_verified" && onShowVerification) {
				setPendingVerification(signInForm.values.email);
				showInfo("Please verify your email to sign in");
				setTimeout(() => onShowVerification(signInForm.values.email), 1500);
			} else {
				// For sign-in authentication errors, add field-level error indication
				if (
					message.toLowerCase().includes("invalid") ||
					message.toLowerCase().includes("incorrect") ||
					message.toLowerCase().includes("credential")
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

	const handleSignUpSubmit = async () => {
		setIsLoading(true);
		try {
			await signUpForm.handleSubmit(new Event("submit") as any);
		} catch (error) {
			const message = error instanceof Error ? error.message : "An unexpected error occurred.";
			if ((error as CustomError).type === "email_already_exists") {
				showCriticalError(message, {
					text: "Sign in",
					onClick: () => {
						setMode("signin");
						signInForm.setFieldValue("email", signUpForm.values.email);
					}
				});
			} else {
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
						{mode === "forgot-password" ? (
							<ForgotPasswordFlow
								onComplete={() => {
									setMode("signin");
									showSuccess("Password reset complete! You can now sign in with your new password.");
								}}
								onCancel={() => onClose()} // Close entire modal, don't just change mode
							/>
						) : (
							<>
								<div className="text-center">
									<h2 className="text-text-primary mb-2 text-2xl font-bold">
										{mode === "signin" ? "Sign In" : "Create Your Account"}
									</h2>
									<p className="text-text-primary/70">
										{mode === "signin" ? "Welcome back to Zentropy" : "Join Zentropy today"}
									</p>
								</div>
								{mode === "signin" ? (
									<Form onSubmit={handleSignInSubmit} isSubmitting={isLoading} className="space-y-4">
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
										<Button
											type="submit"
											variant="primary"
											size="large"
											fullWidth
											disabled={isLoading}
											isLoading={isLoading}
											loadingText="Signing In..."
										>
											Sign In
										</Button>
										<div className="space-y-2 text-center">
											<button
												type="button"
												onClick={() => setMode("forgot-password")}
												className="text-interactive hover:text-interactive-hover block w-full text-sm"
											>
												Forgot your password?
											</button>
										</div>
									</Form>
								) : (
									<Form onSubmit={handleSignUpSubmit} isSubmitting={isLoading} className="space-y-4">
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
												onChange={e =>
													signUpForm.handleChange("terms_agreement", e.target.checked)
												}
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
										<Button
											type="submit"
											variant="primary"
											size="large"
											fullWidth
											disabled={isLoading}
											isLoading={isLoading}
											loadingText="Creating Account..."
										>
											Create Account
										</Button>
									</Form>
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
								<button
									onClick={triggerMicrosoftOAuth}
									disabled={!isMicrosoftReady || isLoading}
									className="border-layout-background bg-content-background hover:bg-layout-background flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 transition-colors disabled:opacity-50"
								>
									<svg className="h-5 w-5" viewBox="0 0 24 24">
										<path fill="#F25022" d="M1 1h10v10H1z" />
										<path fill="#00A4EF" d="M13 1h10v10H13z" />
										<path fill="#7FBA00" d="M1 13h10v10H1z" />
										<path fill="#FFB900" d="M13 13h10v10H13z" />
									</svg>
									Continue with Microsoft
								</button>
								<button
									onClick={triggerGitHubOAuth}
									disabled={!isGitHubReady || isLoading}
									className="border-layout-background bg-content-background hover:bg-layout-background flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 transition-colors disabled:opacity-50"
								>
									<svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
									</svg>
									Continue with GitHub
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthModal;
