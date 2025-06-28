/**
 * User Registration TypeScript
 * Handles user registration with real-time validation, password strength checking,
 * email availability, and comprehensive error handling
 */

// Import utilities following established patterns
import { validateReturnUrl, handleAuthError, type AuthError } from "../utils/auth-utils.js";

// Type definitions for registration
interface RegistrationData {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	role: "team_member" | "team_lead";
}

interface RegistrationResponse {
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: string;
	};
	message: string;
}

interface ValidationErrors {
	field: string;
	message: string;
}

interface ApiErrorResponse {
	message: string;
	errors?: ValidationErrors[];
	rateLimitInfo?: {
		remaining: number;
		resetTime: number;
	};
}

interface PasswordStrengthResult {
	score: number;
	level: "very-weak" | "weak" | "fair" | "good" | "excellent";
	feedback: string[];
}

// Password requirements configuration
interface PasswordRequirement {
	id: string;
	test: (password: string) => boolean;
	message: string;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
	{
		id: "req-length",
		test: (password: string) => password.length >= 8,
		message: "At least 8 characters"
	},
	{
		id: "req-uppercase",
		test: (password: string) => /[A-Z]/.test(password),
		message: "One uppercase letter (A-Z)"
	},
	{
		id: "req-lowercase",
		test: (password: string) => /[a-z]/.test(password),
		message: "One lowercase letter (a-z)"
	},
	{
		id: "req-number",
		test: (password: string) => /[0-9]/.test(password),
		message: "One number (0-9)"
	},
	{
		id: "req-symbol",
		test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
		message: "One symbol (!@#$%^&*)"
	}
];

// Global state
let isSubmitting = false;
let emailCheckTimeout: number | null = null;
let lastEmailChecked = "";

// DOM Elements - initialized on DOMContentLoaded
let registerForm: HTMLFormElement;
let registerBtn: HTMLButtonElement;
let passwordInput: HTMLInputElement;
let confirmPasswordInput: HTMLInputElement;
let emailInput: HTMLInputElement;
let firstNameInput: HTMLInputElement;
let lastNameInput: HTMLInputElement;
let roleSelect: HTMLSelectElement;
let termsCheckbox: HTMLInputElement;
let toast: HTMLElement;
let successModal: HTMLElement;
let rateLimitInfo: HTMLElement;

// Initialize registration functionality only in browser environment
if (typeof document !== "undefined") {
	document.addEventListener("DOMContentLoaded", () => {
		initializeDOMElements();
		setupEventListeners();
		setupPasswordStrengthIndicator();
		checkInitialFormState();
		handleUrlParameters();
	});
}

/**
 * Initialize DOM element references
 */
function initializeDOMElements(): void {
	registerForm = document.getElementById("register-form") as HTMLFormElement;
	registerBtn = document.getElementById("register-btn") as HTMLButtonElement;
	passwordInput = document.getElementById("password") as HTMLInputElement;
	confirmPasswordInput = document.getElementById("confirm-password") as HTMLInputElement;
	emailInput = document.getElementById("email") as HTMLInputElement;
	firstNameInput = document.getElementById("first-name") as HTMLInputElement;
	lastNameInput = document.getElementById("last-name") as HTMLInputElement;
	roleSelect = document.getElementById("role") as HTMLSelectElement;
	termsCheckbox = document.getElementById("terms-agreement") as HTMLInputElement;
	toast = document.getElementById("toast") as HTMLElement;
	successModal = document.getElementById("success-modal") as HTMLElement;
	rateLimitInfo = document.getElementById("rate-limit-info") as HTMLElement;
}

/**
 * Setup all event listeners for registration functionality
 */
function setupEventListeners(): void {
	// Form submission
	registerForm.addEventListener("submit", (event: Event) => {
		void handleRegistrationSubmit(event);
	});

	// Real-time password validation
	passwordInput.addEventListener("input", handlePasswordInput);
	confirmPasswordInput.addEventListener("input", handleConfirmPasswordInput);

	// Email availability checking
	emailInput.addEventListener("input", handleEmailInput);
	emailInput.addEventListener("blur", () => {
		void handleEmailBlur();
	});

	// Form validation
	firstNameInput.addEventListener("input", handleNameInput);
	lastNameInput.addEventListener("input", handleNameInput);
	roleSelect.addEventListener("change", handleRoleChange);
	termsCheckbox.addEventListener("change", handleTermsChange);

	// Password visibility toggles
	document.addEventListener("click", handlePasswordToggle);

	// Modal and toast actions
	document.addEventListener("click", handleInterfaceActions);

	// Form state validation
	registerForm.addEventListener("input", updateFormValidationState);
	registerForm.addEventListener("change", updateFormValidationState);
}

/**
 * Handle registration form submission
 */
async function handleRegistrationSubmit(event: Event): Promise<void> {
	event.preventDefault();

	if (isSubmitting) {
		return;
	}

	// Validate form before submission
	const validationResult = validateRegistrationForm();
	if (!validationResult.isValid) {
		showToast("Please fix the errors below before submitting", "error");
		return;
	}

	try {
		setSubmitButtonLoading(true);
		isSubmitting = true;

		const formData = new FormData(registerForm);
		const registrationData: RegistrationData = {
			first_name: (formData.get("first_name") as string).trim(),
			last_name: (formData.get("last_name") as string).trim(),
			email: (formData.get("email") as string).trim().toLowerCase(),
			password: formData.get("password") as string,
			role: formData.get("role") as "team_member" | "team_lead"
		};

		const response = await fetch("/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			credentials: "include",
			body: JSON.stringify(registrationData)
		});

		if (response.ok) {
			const data = (await response.json()) as RegistrationResponse;
			handleRegistrationSuccess(data);
		} else {
			await handleRegistrationError(response);
		}
	} catch (error) {
		handleNetworkError(error);
	} finally {
		setSubmitButtonLoading(false);
		isSubmitting = false;
	}
}

/**
 * Handle successful registration
 */
function handleRegistrationSuccess(data: RegistrationResponse): void {
	// Show success modal
	showSuccessModal(data);

	// Clear form
	registerForm.reset();
	clearAllErrors();
	updateFormValidationState();
}

/**
 * Handle registration API errors
 */
async function handleRegistrationError(response: Response): Promise<void> {
	try {
		const errorData = (await response.json()) as ApiErrorResponse;

		switch (response.status) {
			case 400:
				// Validation errors
				if (errorData.errors) {
					handleValidationErrors(errorData.errors);
				} else {
					showToast(errorData.message ?? "Invalid registration data", "error");
				}
				break;

			case 409:
				// Email already exists
				showFieldError("email-error", "An account with this email already exists");
				showToast("Email address is already registered", "error");
				break;

			case 429:
				// Rate limiting
				handleRateLimitError(errorData);
				break;

			case 500:
				showToast("Server error occurred. Please try again later.", "error");
				break;

			default:
				showToast(errorData.message ?? "Registration failed. Please try again.", "error");
				break;
		}
	} catch {
		showToast("An unexpected error occurred. Please try again.", "error");
	}
}

/**
 * Handle network errors during registration
 */
function handleNetworkError(error: unknown): void {
	// Log the actual error for debugging
	// eslint-disable-next-line no-console
	console.error("Network error during registration:", error);

	const authError: AuthError = {
		type: "network",
		message: "Unable to connect to the server. Please check your connection and try again.",
		redirectRequired: false
	};

	handleAuthError(authError);
	showToast("Network connection error. Please try again.", "error");
}

/**
 * Handle validation errors from the server
 */
function handleValidationErrors(errors: ValidationErrors[]): void {
	clearAllErrors();

	errors.forEach(error => {
		const fieldErrorId = `${error.field.replace(/_/g, "-")}-error`;
		showFieldError(fieldErrorId, error.message);
	});

	showToast("Please fix the validation errors below", "error");
}

/**
 * Handle rate limiting errors
 */
function handleRateLimitError(errorData: ApiErrorResponse): void {
	if (errorData.rateLimitInfo) {
		const { remaining, resetTime } = errorData.rateLimitInfo;
		const resetDate = new Date(resetTime);
		const resetTimeStr = resetDate.toLocaleTimeString();

		showToast(
			`Registration limit reached. You can try again at ${resetTimeStr} (${remaining} attempts remaining).`,
			"error"
		);

		// Show rate limit info
		rateLimitInfo.style.display = "block";
	} else {
		showToast("Registration limit reached. Please try again later.", "error");
	}
}

/**
 * Real-time password validation and strength checking
 */
function handlePasswordInput(): void {
	const password = passwordInput.value;

	// Update password requirements
	updatePasswordRequirements(password);

	// Update password strength
	const strengthResult = calculatePasswordStrength(password);
	updatePasswordStrengthDisplay(strengthResult);

	// Clear password error if valid
	if (password.length > 0) {
		const isValid = validatePassword(password);
		if (isValid.isValid) {
			clearFieldError("password-error");
		} else {
			showFieldError("password-error", isValid.error);
		}
	}

	// Validate confirm password if it has content
	if (confirmPasswordInput.value) {
		handleConfirmPasswordInput();
	}

	updateFormValidationState();
}

/**
 * Handle confirm password validation
 */
function handleConfirmPasswordInput(): void {
	const password = passwordInput.value;
	const confirmPassword = confirmPasswordInput.value;

	if (confirmPassword.length > 0) {
		if (password !== confirmPassword) {
			showFieldError("confirm-password-error", "Passwords do not match");
		} else {
			clearFieldError("confirm-password-error");
		}
	}

	updateFormValidationState();
}

/**
 * Handle email input with debounced availability checking
 */
function handleEmailInput(): void {
	const email = emailInput.value.trim();

	// Clear previous timeout
	if (emailCheckTimeout) {
		clearTimeout(emailCheckTimeout);
	}

	// Clear previous availability message
	clearFieldInfo("email-availability");

	// Basic email validation
	if (email.length > 0) {
		const emailValidation = validateEmail(email);
		if (!emailValidation.isValid) {
			showFieldError("email-error", emailValidation.error);
			updateFormValidationState();
			return;
		} else {
			clearFieldError("email-error");
		}

		// Debounced availability check
		emailCheckTimeout = window.setTimeout(() => {
			if (email !== lastEmailChecked && email.length > 0) {
				void checkEmailAvailability(email);
			}
		}, 500);
	}

	updateFormValidationState();
}

/**
 * Handle email blur for immediate validation
 */
function handleEmailBlur(): void {
	const email = emailInput.value.trim();
	if (email && email !== lastEmailChecked) {
		void checkEmailAvailability(email);
	}
}

/**
 * Check email availability with the server
 */
async function checkEmailAvailability(email: string): Promise<void> {
	try {
		lastEmailChecked = email;

		showFieldInfo("email-availability", "Checking availability...", "checking");

		const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`, {
			method: "GET",
			credentials: "include"
		});

		if (response.ok) {
			const data = (await response.json()) as { available: boolean };
			if (data.available) {
				showFieldInfo("email-availability", "✓ Email is available", "success");
			} else {
				showFieldError("email-error", "An account with this email already exists");
				clearFieldInfo("email-availability");
			}
		} else if (response.status === 400) {
			const errorData = (await response.json()) as ApiErrorResponse;
			showFieldError("email-error", errorData.message || "Invalid email address");
			clearFieldInfo("email-availability");
		} else {
			// Non-critical error - don't block registration
			clearFieldInfo("email-availability");
		}
	} catch {
		// Network error - don't block registration
		clearFieldInfo("email-availability");
	}

	updateFormValidationState();
}

/**
 * Handle name input validation
 */
function handleNameInput(): void {
	// Validate first name
	if (firstNameInput.value.trim()) {
		const validation = validateName(firstNameInput.value.trim());
		if (validation.isValid) {
			clearFieldError("first-name-error");
		} else {
			showFieldError("first-name-error", validation.error);
		}
	}

	// Validate last name
	if (lastNameInput.value.trim()) {
		const validation = validateName(lastNameInput.value.trim());
		if (validation.isValid) {
			clearFieldError("last-name-error");
		} else {
			showFieldError("last-name-error", validation.error);
		}
	}

	updateFormValidationState();
}

/**
 * Handle role selection change
 */
function handleRoleChange(): void {
	if (roleSelect.value) {
		clearFieldError("role-error");
	}
	updateFormValidationState();
}

/**
 * Handle terms agreement change
 */
function handleTermsChange(): void {
	if (termsCheckbox.checked) {
		clearFieldError("terms-error");
	}
	updateFormValidationState();
}

/**
 * Handle password visibility toggle
 */
function handlePasswordToggle(event: Event): void {
	const target = event.target as HTMLElement;
	const action = target.dataset.action ?? target.closest("[data-action]")?.getAttribute("data-action");

	if (action === "toggle-password") {
		const button = target.closest(".password-toggle") as HTMLButtonElement;
		const targetId = button.dataset.target;
		if (!targetId) {
			return;
		}

		const passwordField = document.getElementById(targetId) as HTMLInputElement;
		const toggleText = button.querySelector(".password-toggle-text") as HTMLElement;

		if (passwordField.type === "password") {
			passwordField.type = "text";
			toggleText.textContent = "Hide";
		} else {
			passwordField.type = "password";
			toggleText.textContent = "Show";
		}
	}
}

/**
 * Handle interface actions (modals, toasts, etc.)
 */
function handleInterfaceActions(event: Event): void {
	const target = event.target as HTMLElement;
	const action = target.dataset.action ?? target.closest("[data-action]")?.getAttribute("data-action");

	if (!action) {
		return;
	}

	switch (action) {
		case "hide-toast":
			hideToast();
			break;
		case "redirect-to-dashboard":
			redirectToDashboard();
			break;
	}
}

/**
 * Calculate password strength score
 */
function calculatePasswordStrength(password: string): PasswordStrengthResult {
	let score = 0;
	const feedback: string[] = [];

	// Length scoring
	if (password.length >= 8) {
		score += 20;
	}
	if (password.length >= 12) {
		score += 10;
	}
	if (password.length >= 16) {
		score += 10;
	}

	// Character variety scoring
	if (/[a-z]/.test(password)) {
		score += 10;
	}
	if (/[A-Z]/.test(password)) {
		score += 10;
	}
	if (/[0-9]/.test(password)) {
		score += 10;
	}
	if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
		score += 15;
	}

	// Pattern scoring
	if (password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
		score += 15;
	}

	// Determine level
	let level: PasswordStrengthResult["level"];
	if (score < 20) {
		level = "very-weak";
		feedback.push("Password is too weak");
	} else if (score < 40) {
		level = "weak";
		feedback.push("Add more character variety");
	} else if (score < 60) {
		level = "fair";
		feedback.push("Consider making it longer");
	} else if (score < 80) {
		level = "good";
		feedback.push("Strong password");
	} else {
		level = "excellent";
		feedback.push("Excellent password strength");
	}

	return { score, level, feedback };
}

/**
 * Update password requirements display
 */
function updatePasswordRequirements(password: string): void {
	PASSWORD_REQUIREMENTS.forEach(requirement => {
		const element = document.getElementById(requirement.id);
		const icon = element?.querySelector(".requirement-icon");

		if (element && icon) {
			const isValid = requirement.test(password);
			if (isValid) {
				element.classList.add("valid");
				icon.textContent = "✓";
			} else {
				element.classList.remove("valid");
				icon.textContent = "✗";
			}
		}
	});
}

/**
 * Update password strength display
 */
function updatePasswordStrengthDisplay(result: PasswordStrengthResult): void {
	const strengthContainer = document.getElementById("password-strength");
	const strengthBar = document.getElementById("strength-bar");
	const strengthText = document.getElementById("strength-text");

	if (!strengthContainer || !strengthBar || !strengthText) {
		return;
	}

	if (passwordInput.value.length > 0) {
		strengthContainer.style.display = "block";

		// Update bar
		strengthBar.style.width = `${result.score}%`;
		strengthBar.className = `strength-bar strength-${result.level}`;

		// Update text
		strengthText.textContent = result.feedback[0] ?? "";
		strengthText.className = `strength-text strength-${result.level}`;
	} else {
		strengthContainer.style.display = "none";
	}
}

/**
 * Setup password strength indicator
 */
function setupPasswordStrengthIndicator(): void {
	// Initialize requirements display
	updatePasswordRequirements("");
}

/**
 * Comprehensive form validation
 */
function validateRegistrationForm(): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	// First name validation
	const firstNameValidation = validateName(firstNameInput.value.trim());
	if (!firstNameValidation.isValid) {
		errors.push(firstNameValidation.error);
		showFieldError("first-name-error", firstNameValidation.error);
	}

	// Last name validation
	const lastNameValidation = validateName(lastNameInput.value.trim());
	if (!lastNameValidation.isValid) {
		errors.push(lastNameValidation.error);
		showFieldError("last-name-error", lastNameValidation.error);
	}

	// Email validation
	const emailValidation = validateEmail(emailInput.value.trim());
	if (!emailValidation.isValid) {
		errors.push(emailValidation.error);
		showFieldError("email-error", emailValidation.error);
	}

	// Password validation
	const passwordValidation = validatePassword(passwordInput.value);
	if (!passwordValidation.isValid) {
		errors.push(passwordValidation.error);
		showFieldError("password-error", passwordValidation.error);
	}

	// Confirm password validation
	if (passwordInput.value !== confirmPasswordInput.value) {
		const error = "Passwords do not match";
		errors.push(error);
		showFieldError("confirm-password-error", error);
	}

	// Role validation
	if (!roleSelect.value) {
		const error = "Please select your role";
		errors.push(error);
		showFieldError("role-error", error);
	}

	// Terms validation
	if (!termsCheckbox.checked) {
		const error = "You must agree to the Terms of Service and Privacy Policy";
		errors.push(error);
		showFieldError("terms-error", error);
	}

	return { isValid: errors.length === 0, errors };
}

/**
 * Individual field validation functions
 */
function validateName(name: string): { isValid: boolean; error: string } {
	if (!name) {
		return { isValid: false, error: "This field is required" };
	}
	if (name.length < 2) {
		return { isValid: false, error: "Must be at least 2 characters" };
	}
	if (name.length > 50) {
		return { isValid: false, error: "Must be less than 50 characters" };
	}
	if (!/^[a-zA-Z\s'-]+$/.test(name)) {
		return { isValid: false, error: "Only letters, spaces, hyphens and apostrophes allowed" };
	}
	return { isValid: true, error: "" };
}

function validateEmail(email: string): { isValid: boolean; error: string } {
	if (!email) {
		return { isValid: false, error: "Email address is required" };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { isValid: false, error: "Please enter a valid email address" };
	}

	if (email.length > 255) {
		return { isValid: false, error: "Email address is too long" };
	}

	return { isValid: true, error: "" };
}

function validatePassword(password: string): { isValid: boolean; error: string } {
	if (!password) {
		return { isValid: false, error: "Password is required" };
	}

	// Check all requirements
	const failedRequirements = PASSWORD_REQUIREMENTS.filter(req => !req.test(password));

	if (failedRequirements.length > 0) {
		return {
			isValid: false,
			error: `Password must meet all requirements below`
		};
	}

	return { isValid: true, error: "" };
}

/**
 * Update form validation state and button availability
 */
function updateFormValidationState(): void {
	const validation = validateRegistrationForm();

	// Update submit button state
	if (validation.isValid && !isSubmitting) {
		registerBtn.disabled = false;
	} else {
		registerBtn.disabled = true;
	}
}

/**
 * Check initial form state
 */
function checkInitialFormState(): void {
	updateFormValidationState();
}

/**
 * Handle URL parameters (e.g., return URL, messages)
 */
function handleUrlParameters(): void {
	const urlParams = new URLSearchParams(window.location.search);

	// Handle messages
	const message = urlParams.get("message");
	if (message) {
		showToast(decodeURIComponent(message), "info");
	}

	// Handle return URL validation
	const returnUrl = urlParams.get("return");
	if (returnUrl && !validateReturnUrl(returnUrl)) {
		// eslint-disable-next-line no-console
		console.warn("Invalid return URL detected and ignored");
	}
}

/**
 * UI Helper Functions
 */
function setSubmitButtonLoading(loading: boolean): void {
	const btnText = registerBtn.querySelector(".btn-text") as HTMLElement;
	const btnSpinner = registerBtn.querySelector(".btn-spinner") as HTMLElement;

	if (loading) {
		registerBtn.disabled = true;
		btnText.style.display = "none";
		btnSpinner.style.display = "inline-block";
	} else {
		btnText.style.display = "inline";
		btnSpinner.style.display = "none";
		updateFormValidationState(); // Re-evaluate button state
	}
}

function showFieldError(errorId: string, message: string): void {
	const errorElement = document.getElementById(errorId);
	if (errorElement) {
		errorElement.textContent = message;
		errorElement.style.display = "block";

		// Highlight corresponding input
		const inputId = errorId.replace("-error", "");
		const input = document.getElementById(inputId);
		if (input) {
			input.classList.add("error");
		}
	}
}

function clearFieldError(errorId: string): void {
	const errorElement = document.getElementById(errorId);
	if (errorElement) {
		errorElement.textContent = "";
		errorElement.style.display = "none";

		// Remove error highlight
		const inputId = errorId.replace("-error", "");
		const input = document.getElementById(inputId);
		if (input) {
			input.classList.remove("error");
		}
	}
}

function showFieldInfo(infoId: string, message: string, type: "success" | "checking" | "info" = "info"): void {
	const infoElement = document.getElementById(infoId);
	if (infoElement) {
		infoElement.textContent = message;
		infoElement.className = `field-info field-info-${type}`;
		infoElement.style.display = "block";
	}
}

function clearFieldInfo(infoId: string): void {
	const infoElement = document.getElementById(infoId);
	if (infoElement) {
		infoElement.textContent = "";
		infoElement.style.display = "none";
	}
}

function clearAllErrors(): void {
	const errorElements = document.querySelectorAll<HTMLElement>(".field-error");
	errorElements.forEach(element => {
		element.textContent = "";
		element.style.display = "none";
	});

	const inputs = document.querySelectorAll<HTMLElement>(".form-input");
	inputs.forEach(input => input.classList.remove("error"));
}

function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
	const toastMessage = document.getElementById("toast-message") as HTMLElement;

	toastMessage.textContent = message;
	toast.className = `toast toast-${type}`;
	toast.style.display = "block";

	// Auto-hide after 5 seconds
	setTimeout(hideToast, 5000);
}

function hideToast(): void {
	toast.style.display = "none";
}

function showSuccessModal(data: RegistrationResponse): void {
	const successMessage = successModal.querySelector(".success-message") as HTMLElement;

	successMessage.textContent = `Welcome to Capacity Planner, ${data.user.first_name}! Your account has been created and you're now logged in.`;

	successModal.style.display = "flex";
}

function redirectToDashboard(): void {
	const urlParams = new URLSearchParams(window.location.search);
	const returnUrl = urlParams.get("return");

	if (returnUrl && validateReturnUrl(returnUrl)) {
		window.location.href = decodeURIComponent(returnUrl);
	} else {
		window.location.href = "/team-configuration.html"; // Default dashboard
	}
}

// Export functions for testing
export { validateName, validateEmail, validatePassword, calculatePasswordStrength, validateRegistrationForm };
