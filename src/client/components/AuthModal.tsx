import React, { useState, useEffect } from "react";
import { AuthService, type AuthUser, type SignInCredentials, type SignUpData } from "../services/AuthService";
import { useGoogleOAuth } from "../hooks/useGoogleOAuth";
import RequiredAsterisk from "./RequiredAsterisk";

type AuthMode = "signin" | "signup" | "method-selection";

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
	auth: {
		isAuthenticated: boolean;
		user: AuthUser | null;
		token: string | null;
		login: (token: string, user: AuthUser, rememberMe?: boolean) => void;
		logout: () => Promise<void>;
	};
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
	organization: string;
	password: string;
	confirm_password: string;
	terms_agreement: boolean;
	has_projects_access: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
	auth,
	initialMode = "method-selection"
}) => {
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [isLoading, setIsLoading] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
	const [showPasswords, setShowPasswords] = useState({
		password: false,
		confirm: false
	});

	// Sign In Form
	const [signInData, setSignInData] = useState<SignInFormData>({
		email: "",
		password: "",
		remember_me: false
	});

	// Sign Up Form
	const [signUpData, setSignUpData] = useState<SignUpFormData>({
		first_name: "",
		last_name: "",
		email: "",
		organization: "",
		password: "",
		confirm_password: "",
		terms_agreement: false,
		has_projects_access: true
	});

	// Form validation errors
	const [signInErrors, setSignInErrors] = useState<Record<string, string>>({});
	const [signUpErrors, setSignUpErrors] = useState<Record<string, string>>({});

	// Form validation logic
	const validateSignInForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!signInData.email.trim()) newErrors.email = "Email is required";
		if (!signInData.password.trim()) newErrors.password = "Password is required";

		setSignInErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const validateSignUpForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!signUpData.first_name.trim()) newErrors.first_name = "First name is required";
		if (!signUpData.last_name.trim()) newErrors.last_name = "Last name is required";
		if (!signUpData.email.trim()) newErrors.email = "Email is required";
		if (!signUpData.organization.trim()) newErrors.organization = "Organization is required";
		if (!signUpData.password.trim()) newErrors.password = "Password is required";
		if (!signUpData.confirm_password.trim()) newErrors.confirm_password = "Confirm password is required";

		setSignUpErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const setSignUpFieldError = (field: string, message: string) => {
		setSignUpErrors(prev => ({ ...prev, [field]: message }));
	};

	// Google OAuth
	const { isReady: isGoogleReady, triggerOAuth } = useGoogleOAuth({
		onSuccess: handleGoogleSuccess,
		onError: error => setToast({ message: error, type: "error" })
	});

	// Auto-hide toast
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [toast]);

	// Reset form when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setMode(initialMode);
			resetForms();
			setToast(null);
		}
	}, [isOpen, initialMode]);

	const resetForms = () => {
		setSignInData({ email: "", password: "", remember_me: false });
		setSignUpData({
			first_name: "",
			last_name: "",
			email: "",
			organization: "",
			password: "",
			confirm_password: "",
			terms_agreement: false,
			has_projects_access: true
		});
		setSignInErrors({});
		setSignUpErrors({});
		setShowPasswords({ password: false, confirm: false });
	};

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateSignInForm()) return;

		setIsLoading(true);
		setToast(null);

		try {
			const credentials: SignInCredentials = {
				email: signInData.email,
				password: signInData.password,
				remember_me: signInData.remember_me
			};

			const { token, user } = await AuthService.signIn(credentials);
			auth.login(token, user, signInData.remember_me);

			setToast({ message: "Successfully signed in!", type: "success" });
			setTimeout(() => {
				onSuccess();
				onClose();
			}, 1000);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Sign in failed";
			setToast({ message, type: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateSignUpForm()) return;

		// Additional validation
		if (signUpData.password !== signUpData.confirm_password) {
			setSignUpFieldError("confirm_password", "Passwords do not match");
			return;
		}

		const passwordValidation = AuthService.validatePassword(signUpData.password);
		if (!passwordValidation.isValid) {
			setSignUpFieldError("password", "Password does not meet requirements");
			return;
		}

		if (!signUpData.terms_agreement) {
			setSignUpFieldError("terms_agreement", "You must agree to the terms");
			return;
		}

		setIsLoading(true);
		setToast(null);

		try {
			const userData: SignUpData = {
				first_name: signUpData.first_name,
				last_name: signUpData.last_name,
				email: signUpData.email,
				organization: signUpData.organization,
				password: signUpData.password,
				terms_agreement: signUpData.terms_agreement,
				has_projects_access: signUpData.has_projects_access
			};

			const { token, user } = await AuthService.signUp(userData);
			auth.login(token, user, false);

			setToast({ message: "Registration successful!", type: "success" });
			setTimeout(() => {
				onSuccess();
				onClose();
			}, 1000);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Registration failed";
			setToast({ message, type: "error" });
		} finally {
			setIsLoading(false);
		}
	};

	async function handleGoogleSuccess(credential: string) {
		setIsLoading(true);
		setToast(null);

		try {
			const { token, user } = await AuthService.oauthSignIn("google", credential);
			auth.login(token, user, false);

			setToast({ message: "Successfully signed in with Google!", type: "success" });
			setTimeout(() => {
				onSuccess();
				onClose();
			}, 1000);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Google sign in failed";
			setToast({ message, type: "error" });
		} finally {
			setIsLoading(false);
		}
	}

	if (!isOpen) return null;

	const renderMethodSelection = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-text-primary mb-2 text-2xl font-bold">Welcome to Zentropy</h2>
				<p className="text-text-primary/70">Choose how you'd like to continue</p>
			</div>

			{/* Google OAuth Button */}
			<div className="space-y-4">
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

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="border-layout-background w-full border-t"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="bg-content-background text-text-primary/70 px-2">or</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<button
						onClick={() => setMode("signin")}
						className="border-layout-background bg-content-background hover:bg-interactive rounded-lg border px-4 py-2 transition-colors hover:text-white"
					>
						Sign In
					</button>
					<button
						onClick={() => setMode("signup")}
						className="bg-interactive hover:bg-interactive-hover hover:text-text-primary rounded-lg px-4 py-2 text-white transition-colors"
					>
						Sign Up
					</button>
				</div>
			</div>
		</div>
	);

	const renderSignIn = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-text-primary mb-2 text-2xl font-bold">Sign In</h2>
				<p className="text-text-primary/70">Welcome back to Zentropy</p>
			</div>

			<form onSubmit={handleSignIn} className="space-y-4">
				<div>
					<label className="text-text-primary mb-1 block text-sm font-medium">
						Email <RequiredAsterisk isEmpty={!signInData.email.trim()} isRequired={true} />
					</label>
					<input
						type="email"
						value={signInData.email}
						onChange={e => setSignInData(prev => ({ ...prev, email: e.target.value }))}
						className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
						disabled={isLoading}
					/>
					{signInErrors.email && <p className="mt-1 text-sm text-red-500">{signInErrors.email}</p>}
				</div>

				<div>
					<label className="text-text-primary mb-1 block text-sm font-medium">
						Password <RequiredAsterisk isEmpty={!signInData.password.trim()} isRequired={true} />
					</label>
					<div className="relative">
						<input
							type={showPasswords.password ? "text" : "password"}
							value={signInData.password}
							onChange={e => setSignInData(prev => ({ ...prev, password: e.target.value }))}
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
					{signInErrors.password && <p className="mt-1 text-sm text-red-500">{signInErrors.password}</p>}
				</div>

				<div className="flex items-center">
					<input
						type="checkbox"
						id="remember_me"
						checked={signInData.remember_me}
						onChange={e => setSignInData(prev => ({ ...prev, remember_me: e.target.checked }))}
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

			<div className="text-center">
				<button
					onClick={() => setMode("method-selection")}
					className="text-interactive hover:text-interactive-hover"
				>
					← Back to options
				</button>
			</div>
		</div>
	);

	const renderSignUp = () => {
		const passwordValidation = AuthService.validatePassword(signUpData.password);

		return (
			<div className="space-y-6">
				<div className="text-center">
					<h2 className="text-text-primary mb-2 text-2xl font-bold">Create Account</h2>
					<p className="text-text-primary/70">Join Zentropy today</p>
				</div>

				<form onSubmit={handleSignUp} className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								First Name{" "}
								<RequiredAsterisk isEmpty={!signUpData.first_name.trim()} isRequired={true} />
							</label>
							<input
								type="text"
								value={signUpData.first_name}
								onChange={e => setSignUpData(prev => ({ ...prev, first_name: e.target.value }))}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={isLoading}
							/>
							{signUpErrors.first_name && (
								<p className="mt-1 text-sm text-red-500">{signUpErrors.first_name}</p>
							)}
						</div>

						<div>
							<label className="text-text-primary mb-1 block text-sm font-medium">
								Last Name <RequiredAsterisk isEmpty={!signUpData.last_name.trim()} isRequired={true} />
							</label>
							<input
								type="text"
								value={signUpData.last_name}
								onChange={e => setSignUpData(prev => ({ ...prev, last_name: e.target.value }))}
								className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
								disabled={isLoading}
							/>
							{signUpErrors.last_name && (
								<p className="mt-1 text-sm text-red-500">{signUpErrors.last_name}</p>
							)}
						</div>
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Email <RequiredAsterisk isEmpty={!signUpData.email.trim()} isRequired={true} />
						</label>
						<input
							type="email"
							value={signUpData.email}
							onChange={e => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
							disabled={isLoading}
						/>
						{signUpErrors.email && <p className="mt-1 text-sm text-red-500">{signUpErrors.email}</p>}
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Organization{" "}
							<RequiredAsterisk isEmpty={!signUpData.organization.trim()} isRequired={true} />
						</label>
						<input
							type="text"
							value={signUpData.organization}
							onChange={e => setSignUpData(prev => ({ ...prev, organization: e.target.value }))}
							className="border-layout-background bg-content-background focus:border-interactive focus:ring-interactive w-full rounded-lg border px-3 py-2 focus:ring-1"
							disabled={isLoading}
						/>
						{signUpErrors.organization && (
							<p className="mt-1 text-sm text-red-500">{signUpErrors.organization}</p>
						)}
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Password <RequiredAsterisk isEmpty={!signUpData.password.trim()} isRequired={true} />
						</label>
						<div className="relative">
							<input
								type={showPasswords.password ? "text" : "password"}
								value={signUpData.password}
								onChange={e => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
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
						{signUpData.password && (
							<div className="mt-2 space-y-1 text-xs">
								<div
									className={
										passwordValidation.requirements.length ? "text-green-600" : "text-red-500"
									}
								>
									✓ At least 8 characters
								</div>
								<div
									className={
										passwordValidation.requirements.uppercase ? "text-green-600" : "text-red-500"
									}
								>
									✓ One uppercase letter
								</div>
								<div
									className={
										passwordValidation.requirements.lowercase ? "text-green-600" : "text-red-500"
									}
								>
									✓ One lowercase letter
								</div>
								<div
									className={
										passwordValidation.requirements.number ? "text-green-600" : "text-red-500"
									}
								>
									✓ One number
								</div>
								<div
									className={
										passwordValidation.requirements.symbol ? "text-green-600" : "text-red-500"
									}
								>
									✓ One special character
								</div>
							</div>
						)}
						{signUpErrors.password && <p className="mt-1 text-sm text-red-500">{signUpErrors.password}</p>}
					</div>

					<div>
						<label className="text-text-primary mb-1 block text-sm font-medium">
							Confirm Password{" "}
							<RequiredAsterisk isEmpty={!signUpData.confirm_password.trim()} isRequired={true} />
						</label>
						<div className="relative">
							<input
								type={showPasswords.confirm ? "text" : "password"}
								value={signUpData.confirm_password}
								onChange={e => setSignUpData(prev => ({ ...prev, confirm_password: e.target.value }))}
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
						{signUpData.confirm_password && signUpData.password !== signUpData.confirm_password && (
							<p className="mt-1 text-sm text-red-500">Passwords do not match</p>
						)}
						{signUpErrors.confirm_password && (
							<p className="mt-1 text-sm text-red-500">{signUpErrors.confirm_password}</p>
						)}
					</div>

					<div className="flex items-start">
						<input
							type="checkbox"
							id="terms_agreement"
							checked={signUpData.terms_agreement}
							onChange={e => setSignUpData(prev => ({ ...prev, terms_agreement: e.target.checked }))}
							className="mt-1 mr-2"
						/>
						<label htmlFor="terms_agreement" className="text-text-primary text-sm">
							I agree to the Terms of Service and Privacy Policy{" "}
							<RequiredAsterisk isEmpty={!signUpData.terms_agreement} isRequired={true} />
						</label>
					</div>
					{signUpErrors.terms_agreement && (
						<p className="text-sm text-red-500">{signUpErrors.terms_agreement}</p>
					)}

					<button
						type="submit"
						disabled={isLoading}
						className="bg-interactive hover:bg-interactive-hover hover:text-text-primary w-full rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
					>
						{isLoading ? "Creating Account..." : "Create Account"}
					</button>
				</form>

				<div className="text-center">
					<button
						onClick={() => setMode("method-selection")}
						className="text-interactive hover:text-interactive-hover"
					>
						← Back to options
					</button>
				</div>
			</div>
		);
	};

	return (
		<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
			<div className="bg-content-background max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-xl">
				<div className="p-6">
					{/* Close button */}
					<div className="mb-4 flex justify-end">
						<button onClick={onClose} className="text-text-primary/50 hover:text-text-primary">
							✕
						</button>
					</div>

					{/* Toast notification */}
					{toast && (
						<div
							className={`mb-4 rounded-lg p-3 ${
								toast.type === "success"
									? "bg-green-100 text-green-800"
									: toast.type === "error"
										? "bg-red-100 text-red-800"
										: "bg-blue-100 text-blue-800"
							}`}
						>
							{toast.message}
						</div>
					)}

					{/* Content based on mode */}
					{mode === "method-selection" && renderMethodSelection()}
					{mode === "signin" && renderSignIn()}
					{mode === "signup" && renderSignUp()}
				</div>
			</div>
		</div>
	);
};

export default AuthModal;
