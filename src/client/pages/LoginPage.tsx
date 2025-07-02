import React, { useState, useEffect } from "react";

interface LoginData {
	email: string;
	password: string;
	remember: boolean;
}

const LoginPage: React.FC = () => {
	const [formData, setFormData] = useState<LoginData>({
		email: "",
		password: "",
		remember: false
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [generalError, setGeneralError] = useState<string>("");
	const [showPassword, setShowPassword] = useState(false);
	const [showSuccessToast, setShowSuccessToast] = useState(false);

	// Hide success toast after 3 seconds
	useEffect(() => {
		if (showSuccessToast) {
			const timer = setTimeout(() => setShowSuccessToast(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [showSuccessToast]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		if (!formData.password) {
			newErrors.password = "Password is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent): Promise<void> => {
		e.preventDefault();
		setGeneralError("");

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
					password: formData.password
				})
			});

			if (!response.ok) {
				const errorData = (await response.json()) as { detail?: string; message?: string };
				throw new Error(errorData.detail ?? errorData.message ?? "Login failed");
			}

			const data = (await response.json()) as { access_token?: string };

			// Store the token
			if (data.access_token) {
				localStorage.setItem("authToken", data.access_token);
			}

			// Show success toast
			setShowSuccessToast(true);

			// Redirect to dashboard after short delay
			setTimeout(() => {
				window.location.href = "/dashboard"; // or handle routing appropriately
			}, 1500);
		} catch (err) {
			// console.error('Login error:', err)
			setGeneralError(err instanceof Error ? err.message : "Login failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleForgotPassword = (e: React.MouseEvent): void => {
		e.preventDefault();
		// TODO: Implement forgot password functionality
		alert("Forgot password functionality not yet implemented");
	};

	return (
		<div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100">
			<header className="border-b border-gray-200 bg-white p-4 px-8 text-center shadow-sm">
				<h1 className="m-0 mb-4 text-3xl">
					<a href="/" className="font-bold text-blue-500 no-underline">
						Zentropy
					</a>
				</h1>
			</header>

			<main className="flex flex-1 items-center justify-center p-8">
				<div className="w-full max-w-sm">
					<div className="rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
						<div className="mb-8 text-center">
							<h2 className="mb-2 text-2xl font-semibold text-gray-900">Welcome Back</h2>
							<p className="text-sm text-gray-600">Sign in to your account to continue</p>
						</div>

						<form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-6">
							{/* Email Field */}
							<div className="flex flex-col gap-2">
								<label htmlFor="email" className="text-sm font-medium text-gray-700">
									Email Address
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={e => setFormData({ ...formData, email: e.target.value })}
									required
									autoComplete="email"
									placeholder="your.email@company.com"
									className="rounded-md border border-gray-300 bg-white p-3 text-base transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
								/>
								{errors.email && <span className="mt-1 text-sm text-red-600">{errors.email}</span>}
							</div>

							{/* Password Field */}
							<div className="flex flex-col gap-2">
								<label htmlFor="password" className="text-sm font-medium text-gray-700">
									Password
								</label>
								<div className="relative flex items-center">
									<input
										type={showPassword ? "text" : "password"}
										id="password"
										name="password"
										value={formData.password}
										onChange={e => setFormData({ ...formData, password: e.target.value })}
										required
										autoComplete="current-password"
										placeholder="Enter your password"
										className="flex-1 rounded-md border border-gray-300 bg-white p-3 pr-12 text-base transition-all duration-200 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 cursor-pointer rounded-sm border-none bg-none p-1 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-700 focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
										aria-label={showPassword ? "Hide password" : "Show password"}
										tabIndex={-1}
									>
										<span className="text-base select-none">{showPassword ? "🙈" : "👁"}</span>
									</button>
								</div>
								{errors.password && (
									<span className="mt-1 text-sm text-red-600">{errors.password}</span>
								)}
							</div>

							{/* Remember Me */}
							<div className="flex items-center gap-3">
								<label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 select-none">
									<input
										type="checkbox"
										checked={formData.remember}
										onChange={e => setFormData({ ...formData, remember: e.target.checked })}
										className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500"
									/>
									Keep me signed in
								</label>
							</div>

							{/* Submit Button */}
							<button
								type="submit"
								disabled={isLoading}
								className="relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-blue-500 p-3 px-6 text-center text-base font-medium text-white no-underline transition-all duration-200 hover:-translate-y-px hover:bg-blue-600 hover:shadow-md active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:shadow-none"
							>
								{isLoading ? (
									<>
										<span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"></span>
										Signing In...
									</>
								) : (
									"Sign In"
								)}
							</button>

							{/* Forgot Password Link */}
							<div className="text-center">
								<button
									type="button"
									onClick={handleForgotPassword}
									className="cursor-pointer border-none bg-transparent text-sm text-gray-600 no-underline transition-colors duration-200 hover:text-blue-500 hover:underline"
								>
									Forgot your password?
								</button>
							</div>
						</form>

						{/* General Error Message */}
						{generalError && (
							<div className="mt-4 animate-[slideDown_0.3s_ease-out] rounded-md border border-red-200 bg-red-50 p-4">
								<div className="flex items-center gap-2">
									<span className="error-icon">⚠️</span>
									<span className="text-sm font-medium text-red-600">{generalError}</span>
								</div>
							</div>
						)}

						{/* Registration Link */}
						<div className="mt-8 border-t border-gray-200 pt-6 text-center">
							<p className="text-sm text-gray-600">
								Don&apos;t have an account?{" "}
								<a
									href="/register"
									className="font-medium text-blue-500 no-underline transition-colors duration-200 hover:text-blue-600 hover:underline"
								>
									Create one now
								</a>
							</p>
						</div>
					</div>
				</div>
			</main>

			{/* Success Toast */}
			{showSuccessToast && (
				<div className="fixed top-5 right-5 z-[1100] min-w-[300px] animate-[slideIn_0.3s_ease] rounded-md border border-green-200 bg-green-50 shadow-lg">
					<div className="flex items-center justify-between gap-2 p-4">
						<span className="text-xl font-bold text-green-600">✓</span>
						<span className="flex-1 text-sm font-medium text-green-700">
							Login successful! Redirecting...
						</span>
					</div>
				</div>
			)}

			{/* Loading Overlay */}
			{isLoading && (
				<div className="bg-opacity-50 fixed top-0 left-0 z-[9999] flex h-full w-full items-center justify-center bg-black">
					<div className="min-w-[200px] rounded-lg bg-white p-8 text-center shadow-lg">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
						<p className="m-0 text-sm text-gray-700">Signing you in...</p>
					</div>
				</div>
			)}

			<style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
		</div>
	);
};

export default LoginPage;
