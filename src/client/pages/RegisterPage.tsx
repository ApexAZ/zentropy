import React, { useState, useEffect } from "react";

interface RegisterData {
	first_name: string;
	last_name: string;
	email: string;
	organization: string;
	role: string;
	password: string;
	confirm_password: string;
	terms_agreement: boolean;
}

interface PasswordRequirements {
	length: boolean;
	uppercase: boolean;
	lowercase: boolean;
	number: boolean;
	symbol: boolean;
}

const RegisterPage: React.FC = () => {
	const [formData, setFormData] = useState<RegisterData>({
		first_name: "",
		last_name: "",
		email: "",
		organization: "",
		role: "",
		password: "",
		confirm_password: "",
		terms_agreement: false
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [showPasswords, setShowPasswords] = useState({
		password: false,
		confirm: false
	});
	const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
		length: false,
		uppercase: false,
		lowercase: false,
		number: false,
		symbol: false
	});
	const [passwordStrength, setPasswordStrength] = useState(0);
	const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

	// Check password requirements whenever password changes
	useEffect(() => {
		const password = formData.password;
		const requirements = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			symbol: /[!@#$%^&*]/.test(password)
		};

		setPasswordRequirements(requirements);

		// Calculate strength
		const validCount = Object.values(requirements).filter(Boolean).length;
		setPasswordStrength(validCount);
	}, [formData.password]);

	// Check email availability with debounce
	useEffect(() => {
		if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			setEmailAvailable(null);
			return;
		}

		const timeoutId = setTimeout(
			() =>
				void (async (): Promise<void> => {
					try {
						const response = await fetch(
							`/api/users/check-email?email=${encodeURIComponent(formData.email)}`
						);
						const data = (await response.json()) as { available: boolean };
						setEmailAvailable(data.available);
					} catch {
						// Error checking email availability - handle silently
						setEmailAvailable(null);
					}
				})(),
			500
		);

		return () => clearTimeout(timeoutId);
	}, [formData.email]);

	// Hide toast after 5 seconds
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		// First name validation
		if (!formData.first_name.trim()) {
			newErrors.first_name = "First name is required";
		} else if (formData.first_name.length > 50) {
			newErrors.first_name = "First name must be less than 50 characters";
		}

		// Last name validation
		if (!formData.last_name.trim()) {
			newErrors.last_name = "Last name is required";
		} else if (formData.last_name.length > 50) {
			newErrors.last_name = "Last name must be less than 50 characters";
		}

		// Email validation
		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		} else if (emailAvailable === false) {
			newErrors.email = "This email address is already registered";
		}

		// Organization validation
		if (!formData.organization.trim()) {
			newErrors.organization = "Organization is required";
		} else if (formData.organization.length > 100) {
			newErrors.organization = "Organization name must be less than 100 characters";
		}

		// Role validation
		if (!formData.role) {
			newErrors.role = "Please select your role";
		}

		// Password validation
		if (!formData.password) {
			newErrors.password = "Password is required";
		} else if (!Object.values(passwordRequirements).every(Boolean)) {
			newErrors.password = "Password does not meet all requirements";
		}

		// Confirm password validation
		if (!formData.confirm_password) {
			newErrors.confirm_password = "Please confirm your password";
		} else if (formData.password !== formData.confirm_password) {
			newErrors.confirm_password = "Passwords do not match";
		}

		// Terms agreement validation
		if (!formData.terms_agreement) {
			newErrors.terms = "You must agree to the Terms of Service and Privacy Policy";
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
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					first_name: formData.first_name,
					last_name: formData.last_name,
					email: formData.email,
					organization: formData.organization,
					role: formData.role,
					password: formData.password
				})
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Registration failed");
			}

			// Show success modal
			setShowSuccessModal(true);
		} catch (err) {
			// console.error('Registration error:', err)
			setToast({
				message: err instanceof Error ? err.message : "Registration failed. Please try again.",
				type: "error"
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleRedirectToDashboard = (): void => {
		window.location.href = "/dashboard";
	};

	const togglePasswordVisibility = (field: "password" | "confirm"): void => {
		setShowPasswords(prev => ({
			...prev,
			[field]: !prev[field]
		}));
	};

	const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
		switch (strength) {
			case 0:
			case 1:
				return { label: "Very Weak", color: "text-red-600" };
			case 2:
				return { label: "Weak", color: "text-orange-500" };
			case 3:
				return { label: "Fair", color: "text-yellow-500" };
			case 4:
				return { label: "Good", color: "text-green-500" };
			case 5:
				return { label: "Excellent", color: "text-green-600" };
			default:
				return { label: "", color: "" };
		}
	};

	const getPasswordStrengthBarColor = (strength: number): string => {
		switch (strength) {
			case 0:
			case 1:
				return "bg-red-600";
			case 2:
				return "bg-orange-500";
			case 3:
				return "bg-yellow-500";
			case 4:
				return "bg-green-500";
			case 5:
				return "bg-green-600";
			default:
				return "bg-[#C5E0D8]";
		}
	};

	const getPasswordStrengthWidth = (strength: number): string => {
		return `${(strength / 5) * 100}%`;
	};

	return (
		<div className="from-layout-background to-content-background min-h-screen bg-gradient-to-br">
			<div className="flex items-center justify-center p-8">
				<div className="w-full max-w-2xl">
					<div className="border-layout-background bg-content-background rounded-lg border shadow-lg">
						<div className="border-layout-background bg-layout-background border-b p-8 text-center">
							<h1 className="text-interactive mb-4 text-2xl font-bold">
								<a href="/" className="text-interactive no-underline">
									Zentropy
								</a>
							</h1>
							<h2 className="text-text-primary mb-2 text-2xl font-semibold">Create Your Account</h2>
							<p className="text-text-primary text-sm">
								Join your team&apos;s capacity planning workspace
							</p>
						</div>

						{/* Registration Form */}
						<form onSubmit={e => void handleSubmit(e)} className="p-8" noValidate>
							{/* Personal Information */}
							<div className="border-layout-background mb-8 border-b pb-6">
								<h3 className="border-layout-background text-text-primary mb-6 border-b pb-2 text-lg font-semibold">
									Personal Information
								</h3>

								<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<label
											htmlFor="first-name"
											className="text-text-primary block text-sm font-medium"
										>
											First Name
										</label>
										<input
											type="text"
											id="first-name"
											name="first_name"
											value={formData.first_name}
											onChange={e => setFormData({ ...formData, first_name: e.target.value })}
											className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
											required
											autoComplete="given-name"
											maxLength={50}
											placeholder="Enter your first name"
										/>
										{errors.first_name && (
											<div className="mt-1 text-sm text-red-600">{errors.first_name}</div>
										)}
									</div>

									<div className="flex flex-col gap-2">
										<label
											htmlFor="last-name"
											className="text-text-primary block text-sm font-medium"
										>
											Last Name
										</label>
										<input
											type="text"
											id="last-name"
											name="last_name"
											value={formData.last_name}
											onChange={e => setFormData({ ...formData, last_name: e.target.value })}
											className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
											required
											autoComplete="family-name"
											maxLength={50}
											placeholder="Enter your last name"
										/>
										{errors.last_name && (
											<div className="mt-1 text-sm text-red-600">{errors.last_name}</div>
										)}
									</div>
								</div>

								<div className="mb-6 flex flex-col gap-2">
									<label htmlFor="email" className="text-text-primary block text-sm font-medium">
										Email Address
									</label>
									<input
										type="email"
										id="email"
										name="email"
										value={formData.email}
										onChange={e => setFormData({ ...formData, email: e.target.value })}
										className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
										required
										autoComplete="email"
										placeholder="Enter your email address"
									/>
									{errors.email && <div className="mt-1 text-sm text-red-600">{errors.email}</div>}
									{emailAvailable === true && (
										<div className="mt-1 text-sm text-green-600">✓ Email is available</div>
									)}
									{emailAvailable === false && (
										<div className="mt-1 text-sm text-red-600">✗ Email is already registered</div>
									)}
								</div>

								<div className="mb-6 flex flex-col gap-2">
									<label
										htmlFor="organization"
										className="text-text-primary block text-sm font-medium"
									>
										Organization
									</label>
									<input
										type="text"
										id="organization"
										name="organization"
										value={formData.organization}
										onChange={e => setFormData({ ...formData, organization: e.target.value })}
										className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
										required
										autoComplete="organization"
										maxLength={100}
										placeholder="Enter your organization name"
									/>
									{errors.organization && (
										<div className="mt-1 text-sm text-red-600">{errors.organization}</div>
									)}
								</div>

								<div className="flex flex-col gap-2">
									<label htmlFor="role" className="text-text-primary block text-sm font-medium">
										Role
									</label>
									<select
										id="role"
										name="role"
										value={formData.role}
										onChange={e => setFormData({ ...formData, role: e.target.value })}
										className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
										required
									>
										<option value="">Select your role</option>
										<option value="team_member">Team Member</option>
										<option value="team_lead">Team Lead</option>
									</select>
									{errors.role && <div className="mt-1 text-sm text-red-600">{errors.role}</div>}
									<div className="text-text-primary mt-1 text-sm">
										Team Leads can manage team settings and member access
									</div>
								</div>
							</div>

							{/* Password Security */}
							<div className="border-layout-background mb-8 border-b pb-6">
								<h3 className="border-layout-background text-text-primary mb-6 border-b pb-2 text-lg font-semibold">
									Password Security
								</h3>

								<div className="mb-6 flex flex-col gap-2">
									<label htmlFor="password" className="text-text-primary block text-sm font-medium">
										Password
									</label>
									<div className="relative flex items-center">
										<input
											type={showPasswords.password ? "text" : "password"}
											id="password"
											name="password"
											value={formData.password}
											onChange={e => setFormData({ ...formData, password: e.target.value })}
											className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 pr-20 text-base leading-6 transition-all duration-200 focus:outline-none"
											required
											autoComplete="new-password"
											placeholder="Create a secure password"
											minLength={8}
											maxLength={128}
										/>
										<button
											type="button"
											onClick={() => togglePasswordVisibility("password")}
											className="text-text-primary hover:bg-layout-background hover:text-text-primary absolute right-3 cursor-pointer rounded-sm border-none bg-none p-1 transition-colors duration-200"
										>
											<span className="text-sm">{showPasswords.password ? "Hide" : "Show"}</span>
										</button>
									</div>
									{errors.password && (
										<div className="mt-1 text-sm text-red-600">{errors.password}</div>
									)}

									{/* Password Strength Indicator */}
									{formData.password && (
										<div className="bg-layout-background mt-2 rounded-sm p-2">
											<div className="text-text-primary mb-1 text-sm font-medium">
												Password Strength:
											</div>
											<div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-[#C5E0D8]">
												<div
													className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthBarColor(passwordStrength)}`}
													style={{ width: getPasswordStrengthWidth(passwordStrength) }}
												></div>
											</div>
											<div
												className={`text-sm font-medium ${getPasswordStrengthLabel(passwordStrength).color}`}
											>
												{getPasswordStrengthLabel(passwordStrength).label}
											</div>
										</div>
									)}

									{/* Password Requirements */}
									<div className="bg-layout-background mt-2 rounded-sm p-2">
										<div className="text-text-primary mb-2 text-sm font-medium">
											Password must contain:
										</div>
										<ul className="m-0 list-none p-0">
											<li
												className={`mb-1 flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.length ? "text-green-600" : "text-text-primary"}`}
											>
												<span className="min-w-4 text-center text-xs font-bold">
													{passwordRequirements.length ? "✓" : "✗"}
												</span>
												At least 8 characters
											</li>
											<li
												className={`mb-1 flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.uppercase ? "text-green-600" : "text-text-primary"}`}
											>
												<span className="min-w-4 text-center text-xs font-bold">
													{passwordRequirements.uppercase ? "✓" : "✗"}
												</span>
												One uppercase letter (A-Z)
											</li>
											<li
												className={`mb-1 flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.lowercase ? "text-green-600" : "text-text-primary"}`}
											>
												<span className="min-w-4 text-center text-xs font-bold">
													{passwordRequirements.lowercase ? "✓" : "✗"}
												</span>
												One lowercase letter (a-z)
											</li>
											<li
												className={`mb-1 flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.number ? "text-green-600" : "text-text-primary"}`}
											>
												<span className="min-w-4 text-center text-xs font-bold">
													{passwordRequirements.number ? "✓" : "✗"}
												</span>
												One number (0-9)
											</li>
											<li
												className={`flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.symbol ? "text-green-600" : "text-text-primary"}`}
											>
												<span className="min-w-4 text-center text-xs font-bold">
													{passwordRequirements.symbol ? "✓" : "✗"}
												</span>
												One symbol (!@#$%^&*)
											</li>
										</ul>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<label
										htmlFor="confirm-password"
										className="text-text-primary block text-sm font-medium"
									>
										Confirm Password
									</label>
									<div className="relative flex items-center">
										<input
											type={showPasswords.confirm ? "text" : "password"}
											id="confirm-password"
											name="confirm_password"
											value={formData.confirm_password}
											onChange={e =>
												setFormData({ ...formData, confirm_password: e.target.value })
											}
											className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 pr-20 text-base leading-6 transition-all duration-200 focus:outline-none"
											required
											autoComplete="new-password"
											placeholder="Confirm your password"
										/>
										<button
											type="button"
											onClick={() => togglePasswordVisibility("confirm")}
											className="text-text-primary hover:bg-layout-background hover:text-text-primary absolute right-3 cursor-pointer rounded-sm border-none bg-none p-1 transition-colors duration-200"
										>
											<span className="text-sm">{showPasswords.confirm ? "Hide" : "Show"}</span>
										</button>
									</div>
									{errors.confirm_password && (
										<div className="mt-1 text-sm text-red-600">{errors.confirm_password}</div>
									)}
								</div>
							</div>

							{/* Terms and Privacy */}
							<div className="mb-8">
								<div className="flex flex-col gap-2">
									<label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
										<input
											type="checkbox"
											id="terms-agreement"
											name="terms_agreement"
											checked={formData.terms_agreement}
											onChange={e =>
												setFormData({ ...formData, terms_agreement: e.target.checked })
											}
											required
											className="mt-1"
										/>
										<span className="text-text-primary">
											I agree to the{" "}
											<button
												type="button"
												className="text-interactive hover:text-interactive-hover cursor-pointer border-none bg-transparent p-0 font-medium no-underline transition-colors duration-200 hover:underline"
											>
												Terms of Service
											</button>{" "}
											and{" "}
											<button
												type="button"
												className="text-interactive hover:text-interactive-hover cursor-pointer border-none bg-transparent p-0 font-medium no-underline transition-colors duration-200 hover:underline"
											>
												{" "}
												Privacy Policy
											</button>
										</span>
									</label>
									{errors.terms && <div className="mt-1 text-sm text-red-600">{errors.terms}</div>}
								</div>
							</div>

							{/* Submit Button */}
							<button
								type="submit"
								disabled={false}
								className="bg-interactive hover:bg-interactive-hover hover:text-text-primary relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none p-3 px-6 text-base font-medium text-white transition-all duration-200 hover:-translate-y-px hover:shadow-md"
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
										Creating Account...
									</>
								) : (
									"Create Account"
								)}
							</button>
						</form>

						{/* Rate Limiting Info */}
						<div className="border-layout-background bg-layout-background m-4 flex items-center gap-2 rounded-md border p-3">
							<div className="flex-shrink-0 text-xl">ℹ️</div>
							<div className="text-text-primary text-sm leading-5">
								For security, only 2 account registrations are allowed per hour from each location.
							</div>
						</div>

						{/* Alternative Actions */}
						<div className="p-8 pt-0 text-center">
							<p className="text-text-primary text-sm">
								Already have an account?
								<a
									href="/login"
									className="text-interactive hover:text-interactive-hover font-medium no-underline transition-colors duration-200 hover:underline"
								>
									{" "}
									Sign in here
								</a>
							</p>
						</div>
					</div>
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
						>
							&times;
						</button>
					</div>
				</div>
			)}

			{/* Registration Success Modal */}
			{showSuccessModal && (
				<div className="bg-opacity-50 fixed inset-0 z-[1000] flex items-center justify-center bg-black p-6">
					<div className="bg-content-background border-interactive max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border p-8 text-center shadow-lg">
						<div className="mb-4 text-5xl">✅</div>
						<h3 className="text-text-primary mb-4 text-xl font-semibold">Account Created Successfully!</h3>
						<p className="text-text-primary mb-8 leading-6">
							Welcome to Zentropy! Your account has been created and you&apos;re now logged in.
						</p>
						<div className="flex justify-end gap-4">
							<button
								onClick={handleRedirectToDashboard}
								className="bg-interactive hover:bg-interactive-hover hover:text-text-primary inline-flex cursor-pointer items-center gap-2 rounded-md border-none p-3 px-6 text-center text-base font-medium text-white no-underline transition-all duration-200"
							>
								Go to Dashboard
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
		</div>
	);
};

export default RegisterPage;
