/**
 * Login Page TypeScript
 * Handles user authentication with comprehensive error handling and security measures
 * Follows TDD approach and strict ESLint compliance
 * Uses tested pure functions from login utilities
 */

import {
	isValidEmail,
	validateLoginForm as validateLoginFormData,
	sanitizeLoginInput,
	createLoginRequest,
	handleLoginResponse,
	type LoginFormData,
	type LoginCredentials,
	type LoginApiResponse,
	type LoginApiError
} from "../utils/auth-core.js";

(function (): void {
	// Type definitions for local use

	// State management
	let isLoading = false;

	// DOM Elements
	const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
	const emailInput = document.getElementById("email") as HTMLInputElement | null;
	const passwordInput = document.getElementById("password") as HTMLInputElement | null;
	const rememberCheckbox = document.getElementById("remember-me") as HTMLInputElement | null;
	const loginButton = document.getElementById("login-btn") as HTMLButtonElement | null;
	const togglePasswordButton = document.getElementById("toggle-password") as HTMLButtonElement | null;
	const generalError = document.getElementById("general-error");
	const generalErrorText = document.getElementById("general-error-text");
	const successToast = document.getElementById("success-toast");
	const successMessage = document.getElementById("success-message");
	const loadingOverlay = document.getElementById("loading-overlay");

	// Initialize page
	document.addEventListener("DOMContentLoaded", function () {
		initializeLoginPage();
	});

	/**
	 * Initialize login page functionality
	 */
	function initializeLoginPage(): void {
		if (!loginForm) {
			// eslint-disable-next-line no-console
			console.error("Login form not found");
			return;
		}

		// Set up event listeners
		setupEventListeners();

		// Check if user is already logged in
		void checkExistingSession();

		// Focus on email input
		if (emailInput) {
			emailInput.focus();
		}
	}

	/**
	 * Set up all event listeners
	 */
	function setupEventListeners(): void {
		// Form submission
		if (loginForm) {
			loginForm.addEventListener("submit", (event: Event) => void handleFormSubmit(event));
		}

		// Password toggle
		if (togglePasswordButton) {
			togglePasswordButton.addEventListener("click", handlePasswordToggle);
		}

		// Input validation on blur
		if (emailInput) {
			emailInput.addEventListener("blur", () => validateField("email"));
			emailInput.addEventListener("input", () => clearFieldError("email"));
		}

		if (passwordInput) {
			passwordInput.addEventListener("blur", () => validateField("password"));
			passwordInput.addEventListener("input", () => clearFieldError("password"));
		}

		// Hide general error when user starts typing
		[emailInput, passwordInput].forEach(input => {
			if (input) {
				input.addEventListener("input", hideGeneralError);
			}
		});
	}

	/**
	 * Handle form submission
	 */
	async function handleFormSubmit(event: Event): Promise<void> {
		event.preventDefault();

		if (isLoading) {
			return;
		}

		// Validate form
		if (!validateLoginForm()) {
			return;
		}

		// Get form data
		const formResult = getFormData();
		if (!formResult) {
			showGeneralError("Unable to read form data. Please try again.");
			return;
		}

		// Perform login
		await performLogin(formResult.loginData.email, formResult.loginData.password);
	}

	/**
	 * Validate the entire login form using tested utilities
	 */
	function validateLoginForm(): boolean {
		// Get current form data
		const formResult = getFormData();
		if (!formResult) {
			return false;
		}

		// Use tested validation utility
		const validation = validateLoginFormData(formResult.loginData);

		// Clear any existing errors
		clearFieldError("email");
		clearFieldError("password");

		// Display validation errors in UI
		if (!validation.isValid) {
			if (validation.errors.email) {
				const emailInput = document.getElementById("email") as HTMLInputElement;
				const emailError = document.getElementById("email-error");
				if (emailInput && emailError) {
					showFieldError(emailInput, emailError, validation.errors.email);
				}
			}

			if (validation.errors.password) {
				const passwordInput = document.getElementById("password") as HTMLInputElement;
				const passwordError = document.getElementById("password-error");
				if (passwordInput && passwordError) {
					showFieldError(passwordInput, passwordError, validation.errors.password);
				}
			}
		}

		return validation.isValid;
	}

	/**
	 * Validate individual form field
	 */
	function validateField(fieldName: string): boolean {
		const input = document.getElementById(fieldName) as HTMLInputElement | null;
		const errorElement = document.getElementById(`${fieldName}-error`);

		if (!input || !errorElement) {
			return false;
		}

		const value = input.value.trim();
		let errorMessage = "";

		switch (fieldName) {
			case "email":
				if (!value) {
					errorMessage = "Email is required";
				} else if (!isValidEmail(value)) {
					errorMessage = "Please enter a valid email address";
				}
				break;

			case "password":
				if (!value) {
					errorMessage = "Password is required";
				}
				break;

			default:
				return false;
		}

		if (errorMessage) {
			showFieldError(input, errorElement, errorMessage);
			return false;
		} else {
			clearFieldError(fieldName);
			return true;
		}
	}

	/**
	 * Show field-specific error
	 */
	function showFieldError(input: HTMLInputElement, errorElement: HTMLElement, message: string): void {
		errorElement.textContent = message;
		errorElement.style.display = "block";
		input.classList.add("error");
		input.setAttribute("aria-invalid", "true");
	}

	/**
	 * Clear field-specific error
	 */
	function clearFieldError(fieldName: string): void {
		const input = document.getElementById(fieldName) as HTMLInputElement | null;
		const errorElement = document.getElementById(`${fieldName}-error`);

		if (input && errorElement) {
			errorElement.textContent = "";
			errorElement.style.display = "none";
			input.classList.remove("error");
			input.removeAttribute("aria-invalid");
		}
	}

	/**
	 * Get form data (returns base LoginFormData and remember checkbox separately)
	 */
	function getFormData(): { loginData: LoginFormData; remember: boolean } | null {
		if (!emailInput || !passwordInput) {
			return null;
		}

		return {
			loginData: {
				email: emailInput.value.trim(),
				password: passwordInput.value // Don't trim passwords
			},
			remember: rememberCheckbox?.checked ?? false
		};
	}

	/**
	 * Perform login API call using tested utilities
	 */
	async function performLogin(email: string, password: string): Promise<void> {
		try {
			setLoadingState(true);
			hideGeneralError();

			// Use tested API utility to create request
			const credentials: LoginCredentials = { email, password };
			const requestConfig = createLoginRequest(credentials);
			const response = await fetch(requestConfig.url, requestConfig.options);

			// Use tested API utility to handle response
			const result = await handleLoginResponse(response);

			if (result.success) {
				handleSuccessfulLogin(result);
			} else {
				handleLoginError(result);
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Network error during login:", error);
			showGeneralError("Network error. Please check your connection and try again.");
		} finally {
			setLoadingState(false);
		}
	}

	/**
	 * Handle successful login result
	 */
	function handleSuccessfulLogin(result: LoginApiResponse | LoginApiError): void {
		if (!result.success) {
			return;
		}

		// Show success message
		showSuccessToast("Login successful! Redirecting...");

		// Store user info if needed (avoid storing sensitive data)
		if (result.user) {
			// Store minimal user info for navigation
			sessionStorage.setItem(
				"user_info",
				JSON.stringify({
					id: result.user.id,
					email: result.user.email,
					name: `${result.user.first_name} ${result.user.last_name}`,
					role: result.user.role
				})
			);
		}

		// Redirect to dashboard or intended page
		const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
		const redirectUrl = returnUrl ?? "/teams.html";

		setTimeout(() => {
			window.location.href = redirectUrl;
		}, 1500);
	}

	/**
	 * Handle login error result
	 */
	function handleLoginError(result: LoginApiResponse | LoginApiError): void {
		if (result.success) {
			return;
		}

		// Show appropriate error message
		showGeneralError(result.message ?? "Login failed. Please try again.");
	}

	/**
	 * Redirect to intended page or dashboard
	 */
	function redirectToIntendedPage(): void {
		// Check for return URL parameter
		const urlParams = new URLSearchParams(window.location.search);
		const returnUrl = urlParams.get("return");

		if (returnUrl && isValidReturnUrl(returnUrl)) {
			window.location.href = returnUrl;
		} else {
			// Default redirect to dashboard
			window.location.href = "/team-configuration.html";
		}
	}

	/**
	 * Validate return URL to prevent open redirect attacks
	 */
	function isValidReturnUrl(url: string): boolean {
		// Only allow relative URLs or same-origin URLs
		try {
			const returnUrl = new URL(url, window.location.origin);
			return returnUrl.origin === window.location.origin;
		} catch {
			// If URL parsing fails, treat as relative
			return url.startsWith("/") && !url.startsWith("//");
		}
	}

	/**
	 * Check if user already has valid session
	 */
	async function checkExistingSession(): Promise<void> {
		try {
			const response = await fetch("/api/users/session", {
				method: "GET",
				credentials: "include"
			});

			if (response.ok) {
				// User already logged in, redirect
				redirectToIntendedPage();
			}
		} catch (error) {
			// Ignore errors - user likely not logged in
			// eslint-disable-next-line no-console
			console.debug("No existing session found");
		}
	}

	/**
	 * Set loading state
	 */
	function setLoadingState(loading: boolean): void {
		isLoading = loading;

		if (loginButton) {
			loginButton.disabled = loading;
			const buttonText = loginButton.querySelector(".btn-text");
			const buttonSpinner = loginButton.querySelector(".btn-spinner");

			if (buttonText instanceof HTMLElement && buttonSpinner instanceof HTMLElement) {
				if (loading) {
					buttonText.style.display = "none";
					buttonSpinner.style.display = "inline-block";
				} else {
					buttonText.style.display = "inline";
					buttonSpinner.style.display = "none";
				}
			}
		}

		if (loadingOverlay) {
			loadingOverlay.style.display = loading ? "flex" : "none";
		}

		// Disable form inputs during loading
		[emailInput, passwordInput, rememberCheckbox].forEach(input => {
			if (input) {
				input.disabled = loading;
			}
		});
	}

	/**
	 * Show general error message
	 */
	function showGeneralError(message: string): void {
		if (generalError && generalErrorText) {
			generalErrorText.textContent = message;
			generalError.style.display = "block";

			// Scroll error into view
			generalError.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	/**
	 * Hide general error message
	 */
	function hideGeneralError(): void {
		if (generalError) {
			generalError.style.display = "none";
		}
	}

	/**
	 * Show success toast
	 */
	function showSuccessToast(message: string): void {
		if (successToast && successMessage) {
			successMessage.textContent = message;
			successToast.style.display = "block";

			// Auto-hide after 3 seconds
			setTimeout(() => {
				if (successToast) {
					successToast.style.display = "none";
				}
			}, 3000);
		}
	}

	/**
	 * Handle password visibility toggle
	 */
	function handlePasswordToggle(): void {
		if (!passwordInput || !togglePasswordButton) {
			return;
		}

		const isPassword = passwordInput.type === "password";
		passwordInput.type = isPassword ? "text" : "password";

		const icon = togglePasswordButton.querySelector(".password-toggle-icon");
		if (icon) {
			icon.textContent = isPassword ? "🙈" : "👁";
		}

		togglePasswordButton.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
	}

	/**
	 * Display error in specified element (for testing)
	 */
	function displayError(message: string, element: HTMLElement): void {
		element.textContent = message;
	}

	// Export functions for testing (will be removed in production build)
	if (typeof window !== "undefined") {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
		(window as any).loginPageFunctions = {
			validateLoginForm,
			performLogin,
			displayError,
			sanitizeInput: sanitizeLoginInput
		};
	}
})();
