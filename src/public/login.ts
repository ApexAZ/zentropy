/**
 * Login Page TypeScript
 * Handles user authentication with comprehensive error handling and security measures
 * Follows TDD approach and strict ESLint compliance
 */

(function (): void {
	// Type definitions
	interface LoginFormData {
		email: string;
		password: string;
		remember?: boolean;
	}

	interface LoginResponse {
		message: string;
		user?: {
			id: string;
			email: string;
			first_name: string;
			last_name: string;
			role: string;
		};
	}

	interface ErrorResponse {
		message: string;
		error?: string;
		field?: string;
	}

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
		const formData = getFormData();
		if (!formData) {
			showGeneralError("Unable to read form data. Please try again.");
			return;
		}

		// Perform login
		await performLogin(formData.email, formData.password);
	}

	/**
	 * Validate the entire login form
	 */
	function validateLoginForm(): boolean {
		let isValid = true;

		// Validate email
		if (!validateField("email")) {
			isValid = false;
		}

		// Validate password
		if (!validateField("password")) {
			isValid = false;
		}

		return isValid;
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
	 * Validate email format
	 */
	function isValidEmail(email: string): boolean {
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		return emailRegex.test(email);
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
	 * Get form data
	 */
	function getFormData(): LoginFormData | null {
		if (!emailInput || !passwordInput) {
			return null;
		}

		return {
			email: sanitizeInput(emailInput.value.trim()),
			password: passwordInput.value, // Don't trim passwords
			remember: rememberCheckbox?.checked ?? false
		};
	}

	/**
	 * Sanitize input to prevent XSS
	 */
	function sanitizeInput(input: string): string {
		// Remove script tags and other dangerous content
		return input
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
			.replace(/<[^>]*>/g, "")
			.trim();
	}

	/**
	 * Perform login API call
	 */
	async function performLogin(email: string, password: string): Promise<void> {
		try {
			setLoadingState(true);
			hideGeneralError();

			const response = await fetch("/api/users/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include", // Important for session cookies
				body: JSON.stringify({ email, password })
			});

			await handleLoginResponse(response);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Network error during login:", error);
			showGeneralError("Network error. Please check your connection and try again.");
		} finally {
			setLoadingState(false);
		}
	}

	/**
	 * Handle login API response
	 */
	async function handleLoginResponse(response: Response): Promise<void> {
		try {
			const data = (await response.json()) as LoginResponse | ErrorResponse;

			switch (response.status) {
				case 200:
					// Successful login
					handleSuccessfulLogin(data as LoginResponse);
					break;

				case 400:
					// Validation error
					showGeneralError((data as ErrorResponse).message || "Please check your input and try again.");
					break;

				case 401:
					// Authentication failed
					showGeneralError("Invalid email or password. Please try again.");
					break;

				case 429:
					// Rate limited
					showGeneralError("Too many login attempts. Please wait 15 minutes before trying again.");
					break;

				case 500:
				default:
					// Server error
					showGeneralError("Server error. Please try again later.");
					break;
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error("Error parsing login response:", error);
			showGeneralError("Unexpected response from server. Please try again.");
		}
	}

	/**
	 * Handle successful login
	 */
	function handleSuccessfulLogin(data: LoginResponse): void {
		// Show success message
		showSuccessToast("Login successful! Redirecting...");

		// Store user info if needed (avoid storing sensitive data)
		if (data.user) {
			sessionStorage.setItem(
				"user",
				JSON.stringify({
					id: data.user.id,
					email: data.user.email,
					name: `${data.user.first_name} ${data.user.last_name}`,
					role: data.user.role
				})
			);
		}

		// Redirect after short delay
		setTimeout(() => {
			redirectToIntendedPage();
		}, 1000);
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
			sanitizeInput
		};
	}
})();
