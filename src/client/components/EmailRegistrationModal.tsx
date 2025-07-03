import React, { useState, useEffect, useRef } from "react";
import { useFormValidation } from "../hooks/useFormValidation";
import RequiredAsterisk from "./RequiredAsterisk";

interface RegisterData {
	first_name: string;
	last_name: string;
	email: string;
	organization: string;
	password: string;
	confirm_password: string;
	terms_agreement: boolean;
	has_projects_access: boolean;
}

interface PasswordRequirements {
	length: boolean;
	uppercase: boolean;
	lowercase: boolean;
	number: boolean;
	symbol: boolean;
	passwordsMatch: boolean;
}

interface EmailRegistrationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: (redirectTo?: string) => void;
}

const EmailRegistrationModal: React.FC<EmailRegistrationModalProps> = ({ isOpen, onClose, onSuccess }) => {
	const [formData, setFormData] = useState<RegisterData>({
		first_name: "",
		last_name: "",
		email: "",
		organization: "",
		password: "",
		confirm_password: "",
		terms_agreement: false,
		has_projects_access: true
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
		symbol: false,
		passwordsMatch: false
	});
	const [passwordStrength, setPasswordStrength] = useState(0);
	const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

	// Define which fields are required for form validation
	const requiredFields: (keyof RegisterData)[] = ["first_name", "last_name", "email", "password", "confirm_password"];

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

	// Check password requirements whenever password or confirm password changes
	useEffect(() => {
		const password = formData.password;
		const confirmPassword = formData.confirm_password;
		const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

		const requirements = {
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /\d/.test(password),
			symbol: /[!@#$%^&*]/.test(password),
			passwordsMatch: passwordsMatch
		};

		setPasswordRequirements(requirements);

		// Calculate strength (exclude passwordsMatch from strength calculation)
		const basicRequirements = {
			length: requirements.length,
			uppercase: requirements.uppercase,
			lowercase: requirements.lowercase,
			number: requirements.number,
			symbol: requirements.symbol
		};
		const validCount = Object.values(basicRequirements).filter(Boolean).length;
		setPasswordStrength(validCount);
	}, [formData.password, formData.confirm_password]);

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

		// Organization validation (optional)
		if (formData.organization.length > 100) {
			newErrors.organization = "Organization name must be less than 100 characters";
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
					password: formData.password,
					has_projects_access: formData.has_projects_access
				})
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { message?: string };
				throw new Error(errorData.message ?? "Registration failed");
			}

			// Show success modal
			setShowSuccessModal(true);
			// Call onSuccess callback for successful registration
			onSuccess();
		} catch (err) {
			setToast({
				message: err instanceof Error ? err.message : "Registration failed. Please try again.",
				type: "error"
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleRedirectToDashboard = (): void => {
		onSuccess("dashboard");
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
					className="bg-content-background border-layout-background pointer-events-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border shadow-lg"
					role="dialog"
					aria-modal="true"
					aria-labelledby="registration-modal-title"
				>
					{/* Modal header */}
					<div className="border-layout-background bg-layout-background border-b p-6">
						<div className="flex items-center justify-between">
							<div className="text-center">
								<h1 className="text-interactive mb-2 text-2xl font-bold">Zentropy</h1>
								<h2 id="registration-modal-title" className="text-text-primary text-xl font-semibold">
									Create Your Account
								</h2>
								<p className="text-text-primary text-sm">
									Join your team&apos;s capacity planning workspace
								</p>
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

					{/* Email Registration Form */}
					<form onSubmit={e => void handleSubmit(e)} className="p-6" noValidate>
						{/* Personal Information */}
						<div className="border-layout-background mb-6 border-b pb-6">
							<h3 className="border-layout-background text-text-primary mb-4 border-b pb-2 text-lg font-semibold">
								Personal Information
							</h3>

							<div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<label htmlFor="first-name" className="text-text-primary block text-sm font-medium">
										First Name
										<RequiredAsterisk
											isEmpty={isFieldEmpty("first_name")}
											isRequired={isFieldRequired("first_name")}
										/>
									</label>
									<input
										type="text"
										id="first-name"
										name="first_name"
										value={formData.first_name}
										onChange={e => setFormData({ ...formData, first_name: e.target.value })}
										className={`${getFieldBorderClass("first_name")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none`}
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
									<label htmlFor="last-name" className="text-text-primary block text-sm font-medium">
										Last Name
										<RequiredAsterisk
											isEmpty={isFieldEmpty("last_name")}
											isRequired={isFieldRequired("last_name")}
										/>
									</label>
									<input
										type="text"
										id="last-name"
										name="last_name"
										value={formData.last_name}
										onChange={e => setFormData({ ...formData, last_name: e.target.value })}
										className={`${getFieldBorderClass("last_name")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none`}
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
								{emailAvailable === true && (
									<div className="mt-1 text-sm text-green-600">✓ Email is available</div>
								)}
								{emailAvailable === false && (
									<div className="mt-1 text-sm text-red-600">✗ Email is already registered</div>
								)}
							</div>

							<div className="mb-4 flex flex-col gap-2">
								<label htmlFor="organization" className="text-text-primary block text-sm font-medium">
									Organization
								</label>
								<input
									type="text"
									id="organization"
									name="organization"
									value={formData.organization}
									onChange={e => setFormData({ ...formData, organization: e.target.value })}
									className="border-layout-background bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 text-base leading-6 transition-all duration-200 focus:outline-none"
									autoComplete="organization"
									maxLength={100}
									placeholder="Enter your organization name (optional)"
								/>
								{errors.organization && (
									<div className="mt-1 text-sm text-red-600">{errors.organization}</div>
								)}
							</div>
						</div>

						{/* Password Security */}
						<div className="border-layout-background mb-6 border-b pb-6">
							<h3 className="border-layout-background text-text-primary mb-4 border-b pb-2 text-lg font-semibold">
								Password Security
							</h3>

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
										type={showPasswords.password ? "text" : "password"}
										id="password"
										name="password"
										value={formData.password}
										onChange={e => setFormData({ ...formData, password: e.target.value })}
										className={`${getFieldBorderClass("password")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 pr-20 text-base leading-6 transition-all duration-200 focus:outline-none`}
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
										aria-label="Toggle password visibility"
									>
										{showPasswords.password ? (
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
											className={`mb-1 flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.symbol ? "text-green-600" : "text-text-primary"}`}
										>
											<span className="min-w-4 text-center text-xs font-bold">
												{passwordRequirements.symbol ? "✓" : "✗"}
											</span>
											One symbol (!@#$%^&*)
										</li>
										<li
											className={`flex items-center gap-2 text-sm transition-colors duration-200 ${passwordRequirements.passwordsMatch ? "text-green-600" : "text-text-primary"}`}
										>
											<span className="min-w-4 text-center text-xs font-bold">
												{passwordRequirements.passwordsMatch ? "✓" : "✗"}
											</span>
											Passwords match
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
									<RequiredAsterisk
										isEmpty={isFieldEmpty("confirm_password")}
										isRequired={isFieldRequired("confirm_password")}
									/>
								</label>
								<div className="relative flex items-center">
									<input
										type={showPasswords.confirm ? "text" : "password"}
										id="confirm-password"
										name="confirm_password"
										value={formData.confirm_password}
										onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
										className={`${getFieldBorderClass("confirm_password")} bg-content-background text-text-primary focus:border-interactive focus:shadow-interactive w-full rounded-md border p-3 pr-20 text-base leading-6 transition-all duration-200 focus:outline-none`}
										required
										autoComplete="new-password"
										placeholder="Confirm your password"
									/>
									<button
										type="button"
										onClick={() => togglePasswordVisibility("confirm")}
										className="text-text-primary hover:bg-layout-background hover:text-text-primary absolute right-3 cursor-pointer rounded-sm border-none bg-none p-1 transition-colors duration-200"
										aria-label="Toggle password visibility"
									>
										{showPasswords.confirm ? (
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
								{errors.confirm_password && (
									<div className="mt-1 text-sm text-red-600">{errors.confirm_password}</div>
								)}
							</div>
						</div>

						{/* Terms and Privacy */}
						<div className="mb-6">
							<div className="flex flex-col gap-2">
								<label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
									<input
										type="checkbox"
										id="terms-agreement"
										name="terms_agreement"
										checked={formData.terms_agreement}
										onChange={e => setFormData({ ...formData, terms_agreement: e.target.checked })}
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
		</>
	);
};

export default EmailRegistrationModal;
