// Profile page functionality with strict TypeScript compliance
// Following established patterns from login.ts and register.ts

import {
	fetchUserProfile,
	createProfileUpdateRequest,
	handleProfileApiResponse,
	type UserProfile,
	type ProfileUpdateData
} from "../utils/profile-utils.js";

import { getSessionInfo, redirectToLogin, handleAuthError } from "../utils/auth-utils.js";

import { initializeNavigation } from "../utils/navigation-auth.js";

import {
	getRoleBadgeClass,
	validateProfileFormData,
	createProfileDisplayData,
	type ProfileFormData
} from "../utils/profile-ui-utils.js";

import {
	validatePasswordChangeForm,
	createPasswordChangeRequest,
	handlePasswordChangeResponse,
	type PasswordChangeFormData,
	type PasswordChangeData
} from "../utils/password-change-utils.js";

/**
 * Current profile data cache
 */
let currentProfileData: UserProfile | null = null;

/**
 * Initialize the profile page
 */
export async function initializeProfilePage(): Promise<void> {
	try {
		// Initialize navigation first
		void initializeNavigation("");

		// Check authentication
		const sessionInfo = getSessionInfo();
		if (!sessionInfo) {
			redirectToLogin();
			return;
		}

		// Show loading state
		showProfileSection("loading-state");
		hideProfileSection("error-state");
		hideProfileSection("profile-content");

		// Fetch and display profile data
		await loadProfileData(sessionInfo.id);

		// Set up event listeners
		setupEventListeners();
	} catch (error) {
		// console.error("Error initializing profile page:", error);
		const authError = {
			type: "server" as const,
			message: error instanceof Error ? error.message : "Unknown error",
			redirectRequired: true
		};
		handleAuthError(authError);
	}
}

/**
 * Load profile data from API
 * @param userId - The user ID to load profile for
 */
async function loadProfileData(userId: string): Promise<void> {
	try {
		currentProfileData = await fetchUserProfile(userId);

		// Display the profile data
		displayProfileData(currentProfileData);

		// Show profile content
		hideProfileSection("loading-state");
		showProfileSection("profile-content");
	} catch (error) {
		// console.error("Error loading profile data:", error);

		// Show error state
		hideProfileSection("loading-state");
		showProfileSection("error-state");

		const errorElement = document.getElementById("error-message-text");
		if (errorElement) {
			errorElement.textContent = (error as Error).message || "Failed to load profile";
		}
	}
}

/**
 * Display profile data in the UI
 * @param profileData - The profile data to display
 */
export function displayProfileData(profileData: UserProfile): void {
	// Create display data using tested pure function
	const displayData = createProfileDisplayData(profileData);

	// Full name
	const fullNameElement = document.getElementById("display-full-name");
	if (fullNameElement) {
		fullNameElement.textContent = displayData.fullName;
	}

	// Email
	const emailElement = document.getElementById("display-email");
	if (emailElement) {
		emailElement.textContent = profileData.email;
	}

	// Role
	const roleTextElement = document.getElementById("display-role-text");
	if (roleTextElement) {
		roleTextElement.textContent = displayData.roleText;
	}

	// Update role badge
	if (profileData.role) {
		updateRoleBadge(profileData.role);
	}

	// User ID
	const userIdElement = document.getElementById("display-user-id");
	if (userIdElement) {
		userIdElement.textContent = profileData.id;
	}

	// Created date
	const createdDateElement = document.getElementById("display-created-date");
	if (createdDateElement && displayData.createdDateFormatted) {
		createdDateElement.innerHTML = displayData.createdDateFormatted;
	}

	// Updated date
	const updatedDateElement = document.getElementById("display-updated-date");
	if (updatedDateElement && displayData.updatedDateFormatted) {
		updatedDateElement.innerHTML = displayData.updatedDateFormatted;
	}

	// Last login
	const lastLoginElement = document.getElementById("display-last-login");
	if (lastLoginElement) {
		lastLoginElement.innerHTML = displayData.lastLoginFormatted;
	}
}

/**
 * Update role badge styling
 * @param role - The user role
 */
export function updateRoleBadge(role: "team_lead" | "team_member"): void {
	const badgeElement = document.getElementById("display-role-badge");
	if (!badgeElement) {
		return;
	}

	// Remove existing role classes
	badgeElement.classList.remove("team-lead", "team-member");

	// Add new role class using tested pure function
	const badgeClass = getRoleBadgeClass(role);
	badgeElement.classList.add(badgeClass);
}

/**
 * Enter edit mode for profile
 * @param profileData - Current profile data to pre-fill form
 */
export function enterEditMode(profileData: UserProfile): void {
	// Hide display mode, show edit mode
	hideProfileSection("profile-display");
	showProfileSection("profile-edit");

	// Pre-fill form with current data
	const firstNameInput = document.getElementById("edit-first-name") as HTMLInputElement;
	const lastNameInput = document.getElementById("edit-last-name") as HTMLInputElement;
	const emailInput = document.getElementById("edit-email") as HTMLInputElement;

	if (firstNameInput) {
		firstNameInput.value = profileData.first_name;
	}
	if (lastNameInput) {
		lastNameInput.value = profileData.last_name;
	}
	if (emailInput) {
		emailInput.value = profileData.email;
	}

	// Focus first input
	if (firstNameInput) {
		firstNameInput.focus();
	}
}

/**
 * Exit edit mode and return to display mode
 */
export function exitEditMode(): void {
	// Show display mode, hide edit mode
	showProfileSection("profile-display");
	hideProfileSection("profile-edit");

	// Reset form
	const form = document.getElementById("profile-form") as HTMLFormElement;
	if (form) {
		form.reset();
	}

	// Clear any error messages
	clearFormErrors();
}

/**
 * Handle profile form submission
 * @param event - Form submit event
 */
export async function handleProfileFormSubmit(event: Event): Promise<void> {
	event.preventDefault();

	const form = event.target as HTMLFormElement;
	const sessionInfo = getSessionInfo();

	if (!sessionInfo) {
		redirectToLogin();
		return;
	}

	try {
		// Get form data
		const formData = new FormData(form);
		const profileFormData: ProfileFormData = {
			first_name: (formData.get("first_name") as string) ?? "",
			last_name: (formData.get("last_name") as string) ?? "",
			email: (formData.get("email") as string) ?? ""
		};

		// Validate data using tested pure function
		const validation = validateProfileFormData(profileFormData);

		if (!validation.isValid) {
			displayFormErrors(validation.errors);
			return;
		}

		// Use sanitized data for the API request
		if (!validation.sanitizedData) {
			throw new Error("Validation failed - no sanitized data available");
		}

		const profileUpdateData: ProfileUpdateData = {
			first_name: validation.sanitizedData.first_name,
			last_name: validation.sanitizedData.last_name,
			email: validation.sanitizedData.email
		};

		// Show loading state
		setFormLoading(true);

		// Create and send request
		const requestConfig = createProfileUpdateRequest(sessionInfo.id, profileUpdateData);
		const response = await fetch(requestConfig.url, requestConfig.options);

		// Handle response
		await handleProfileApiResponse(response);

		// Success - reload profile data
		await loadProfileData(sessionInfo.id);
		exitEditMode();
		showProfileToast("Profile updated successfully", "success");
	} catch (error) {
		// console.error("Error updating profile:", error);

		const errorMessage = (error as Error).message ?? "Failed to update profile";
		showProfileToast(errorMessage, "error");

		// Handle auth errors
		if (errorMessage.includes("Session") || errorMessage.includes("Unauthorized")) {
			const authError = {
				type: "unauthorized" as const,
				message: errorMessage,
				redirectRequired: true
			};
			handleAuthError(authError);
		}
	} finally {
		setFormLoading(false);
	}
}

/**
 * Set up event listeners for profile page
 */
function setupEventListeners(): void {
	// Edit profile button
	const editProfileBtn = document.getElementById("edit-profile-btn");
	if (editProfileBtn) {
		editProfileBtn.addEventListener("click", () => {
			if (currentProfileData) {
				enterEditMode(currentProfileData);
			}
		});
	}

	// Cancel edit button
	const cancelEditBtn = document.getElementById("cancel-edit-btn");
	if (cancelEditBtn) {
		cancelEditBtn.addEventListener("click", () => {
			exitEditMode();
		});
	}

	// Profile form submission
	const profileForm = document.getElementById("profile-form");
	if (profileForm) {
		profileForm.addEventListener("submit", (event: Event) => {
			void handleProfileFormSubmit(event);
		});
	}

	// Password change button
	const changePasswordBtn = document.getElementById("change-password-btn");
	if (changePasswordBtn) {
		changePasswordBtn.addEventListener("click", () => {
			enterPasswordChangeMode();
		});
	}

	// Cancel password change button
	const cancelPasswordBtn = document.getElementById("cancel-password-btn");
	if (cancelPasswordBtn) {
		cancelPasswordBtn.addEventListener("click", () => {
			exitPasswordChangeMode();
		});
	}

	// Password form submission
	const passwordForm = document.getElementById("password-form");
	if (passwordForm) {
		passwordForm.addEventListener("submit", (event: Event) => {
			void handlePasswordFormSubmit(event);
		});
	}

	// Password visibility toggles
	document.addEventListener("click", (event: Event) => {
		const target = event.target as HTMLElement;
		if (target.dataset.action === "toggle-password") {
			const targetId = target.dataset.target;
			if (targetId) {
				togglePasswordVisibility(targetId);
			}
		}
	});

	// Real-time password validation
	const newPasswordInput = document.getElementById("new-password") as HTMLInputElement;
	if (newPasswordInput) {
		newPasswordInput.addEventListener("input", () => {
			updatePasswordStrengthIndicator(newPasswordInput.value);
			updatePasswordRequirements(newPasswordInput.value);
		});
	}

	// Retry button
	const retryBtn = document.getElementById("retry-btn");
	if (retryBtn) {
		retryBtn.addEventListener("click", () => {
			const sessionInfo = getSessionInfo();
			if (sessionInfo) {
				void loadProfileData(sessionInfo.id);
			}
		});
	}

	// Toast close button
	document.addEventListener("click", (event: Event) => {
		const target = event.target as HTMLElement;
		if (target.dataset.action === "hide-toast") {
			hideProfileToast();
		}
	});
}

/**
 * Show a profile section by ID
 * @param sectionId - The section ID to show
 */
export function showProfileSection(sectionId: string): void {
	const element = document.getElementById(sectionId);
	if (element) {
		element.style.display = "block";
	}
}

/**
 * Hide a profile section by ID
 * @param sectionId - The section ID to hide
 */
export function hideProfileSection(sectionId: string): void {
	const element = document.getElementById(sectionId);
	if (element) {
		element.style.display = "none";
	}
}

/**
 * Show profile toast notification
 * @param message - Toast message
 * @param type - Toast type (success or error)
 */
export function showProfileToast(message: string, type: "success" | "error"): void {
	const toastElement = document.getElementById("toast");
	const messageElement = document.getElementById("toast-message");

	if (toastElement && messageElement) {
		messageElement.textContent = message;
		toastElement.style.display = "block";

		// Remove existing type classes and add new one
		toastElement.classList.remove("toast-success", "toast-error");
		toastElement.classList.add(`toast-${type}`);

		// Auto-hide after 5 seconds
		setTimeout(() => {
			hideProfileToast();
		}, 5000);
	}
}

/**
 * Hide profile toast notification
 */
export function hideProfileToast(): void {
	const toastElement = document.getElementById("toast");
	if (toastElement) {
		toastElement.style.display = "none";
		toastElement.classList.remove("toast-success", "toast-error");
	}
}

/**
 * Display form validation errors
 * @param errors - Validation errors object
 */
function displayFormErrors(errors: Record<string, string>): void {
	// Clear existing errors first
	clearFormErrors();

	// Display each error
	Object.entries(errors).forEach(([field, message]) => {
		const errorElement = document.getElementById(`edit-${field.replace("_", "-")}-error`);
		if (errorElement) {
			errorElement.textContent = message;
			errorElement.style.display = "block";
		}
	});
}

/**
 * Clear all form validation errors
 */
function clearFormErrors(): void {
	const errorElements = document.querySelectorAll(".field-error");
	errorElements.forEach(element => {
		element.textContent = "";
		(element as HTMLElement).style.display = "none";
	});
}

/**
 * Set form loading state
 * @param loading - Whether form is loading
 */
function setFormLoading(loading: boolean): void {
	const saveBtn = document.getElementById("save-profile-btn");
	const spinner = saveBtn?.querySelector(".btn-spinner") as HTMLElement;
	const text = saveBtn?.querySelector(".btn-text") as HTMLElement;

	if (saveBtn && spinner && text) {
		if (loading) {
			(saveBtn as HTMLButtonElement).disabled = true;
			spinner.style.display = "inline-block";
			text.style.display = "none";
		} else {
			(saveBtn as HTMLButtonElement).disabled = false;
			spinner.style.display = "none";
			text.style.display = "inline-block";
		}
	}
}

/**
 * Enter password change mode
 */
export function enterPasswordChangeMode(): void {
	// Hide password display mode, show password change mode
	hideProfileSection("password-display");
	showProfileSection("password-change");

	// Focus current password input
	const currentPasswordInput = document.getElementById("current-password") as HTMLInputElement;
	if (currentPasswordInput) {
		currentPasswordInput.focus();
	}

	// Clear any existing errors and reset form
	clearPasswordFormErrors();
	const passwordForm = document.getElementById("password-form") as HTMLFormElement;
	if (passwordForm) {
		passwordForm.reset();
	}

	// Hide password strength indicator initially
	hideProfileSection("new-password-strength");
}

/**
 * Exit password change mode and return to display mode
 */
export function exitPasswordChangeMode(): void {
	// Show password display mode, hide password change mode
	showProfileSection("password-display");
	hideProfileSection("password-change");

	// Reset form
	const passwordForm = document.getElementById("password-form") as HTMLFormElement;
	if (passwordForm) {
		passwordForm.reset();
	}

	// Clear any error messages
	clearPasswordFormErrors();

	// Hide password strength indicator
	hideProfileSection("new-password-strength");

	// Reset password requirements display
	resetPasswordRequirements();
}

/**
 * Handle password form submission with comprehensive validation and API integration
 * @param event - Form submit event
 */
export async function handlePasswordFormSubmit(event: Event): Promise<void> {
	event.preventDefault();

	const form = event.target as HTMLFormElement;
	const sessionInfo = getSessionInfo();

	if (!sessionInfo) {
		redirectToLogin();
		return;
	}

	try {
		// Get form data
		const formData = new FormData(form);
		const passwordFormData: PasswordChangeFormData = {
			currentPassword: (formData.get("current_password") as string) ?? "",
			newPassword: (formData.get("new_password") as string) ?? "",
			confirmPassword: (formData.get("confirm_new_password") as string) ?? ""
		};

		// Validate using tested utility function
		const validation = validatePasswordChangeForm(passwordFormData);

		if (!validation.isValid) {
			displayPasswordFormErrors(validation.errors);
			return;
		}

		// Use sanitized data for the API request
		if (!validation.sanitizedData) {
			throw new Error("Validation failed - no sanitized data available");
		}

		const passwordChangeData: PasswordChangeData = {
			currentPassword: validation.sanitizedData.currentPassword,
			newPassword: validation.sanitizedData.newPassword
		};

		// Show loading state
		setPasswordFormLoading(true);

		// Create and send request using tested utility functions
		const requestConfig = createPasswordChangeRequest(sessionInfo.id, passwordChangeData);
		const response = await fetch(requestConfig.url, requestConfig.options);

		// Handle response using tested utility function
		const apiResponse = await handlePasswordChangeResponse(response);

		if (apiResponse.success) {
			// Success - exit password change mode and show success message
			exitPasswordChangeMode();
			showProfileToast("Password updated successfully", "success");
		} else {
			// Handle various error scenarios
			if (apiResponse.requiresReauth) {
				const authError = {
					type: "unauthorized" as const,
					message: apiResponse.message,
					redirectRequired: true
				};
				handleAuthError(authError);
			} else if (apiResponse.rateLimited) {
				showRateLimitInfo();
				showProfileToast(apiResponse.message, "error");
			} else {
				showProfileToast(apiResponse.message, "error");
			}
		}
	} catch (error) {
		// console.error("Error updating password:", error);

		const errorMessage = (error as Error).message ?? "Failed to update password";
		showProfileToast(errorMessage, "error");

		// Handle auth errors
		if (errorMessage.includes("Session") || errorMessage.includes("Unauthorized")) {
			const authError = {
				type: "unauthorized" as const,
				message: errorMessage,
				redirectRequired: true
			};
			handleAuthError(authError);
		}
	} finally {
		setPasswordFormLoading(false);
	}
}

/**
 * Toggle password visibility for a specific input field
 * @param inputId - The ID of the password input to toggle
 */
export function togglePasswordVisibility(inputId: string): void {
	const passwordInput = document.getElementById(inputId) as HTMLInputElement;
	const toggleButton = document.querySelector(`[data-target="${inputId}"]`) as HTMLElement;
	const toggleText = toggleButton?.querySelector(".password-toggle-text") as HTMLElement;

	if (passwordInput && toggleButton && toggleText) {
		if (passwordInput.type === "password") {
			passwordInput.type = "text";
			toggleText.textContent = "Hide";
		} else {
			passwordInput.type = "password";
			toggleText.textContent = "Show";
		}
	}
}

/**
 * Update password strength indicator based on password value
 * @param password - The password to analyze
 */
export function updatePasswordStrengthIndicator(password: string): void {
	const strengthContainer = document.getElementById("new-password-strength");
	const strengthBar = document.getElementById("new-strength-bar");
	const strengthText = document.getElementById("new-strength-text");

	if (!strengthContainer || !strengthBar || !strengthText) {
		return;
	}

	if (!password.trim()) {
		hideProfileSection("new-password-strength");
		return;
	}

	// Show strength indicator
	showProfileSection("new-password-strength");

	// Calculate password strength (simplified version for UI feedback)
	let score = 0;
	let strengthClass = "";
	let strengthLabel = "";

	// Length scoring
	if (password.length >= 8) {
		score += 20;
	}
	if (password.length >= 12) {
		score += 10;
	}

	// Character type scoring
	if (/[A-Z]/.test(password)) {
		score += 20;
	}
	if (/[a-z]/.test(password)) {
		score += 20;
	}
	if (/\d/.test(password)) {
		score += 15;
	}
	if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
		score += 15;
	}

	// Determine strength level
	if (score < 20) {
		strengthClass = "very-weak";
		strengthLabel = "Very Weak";
	} else if (score < 40) {
		strengthClass = "weak";
		strengthLabel = "Weak";
	} else if (score < 60) {
		strengthClass = "fair";
		strengthLabel = "Fair";
	} else if (score < 80) {
		strengthClass = "good";
		strengthLabel = "Good";
	} else {
		strengthClass = "excellent";
		strengthLabel = "Excellent";
	}

	// Update visual indicator
	strengthBar.className = `strength-bar ${strengthClass}`;
	strengthBar.style.width = `${Math.min(score, 100)}%`;
	strengthText.textContent = strengthLabel;
	strengthText.className = `strength-text ${strengthClass}`;
}

/**
 * Update password requirements checklist based on password value
 * @param password - The password to check against requirements
 */
export function updatePasswordRequirements(password: string): void {
	const requirements = [
		{ id: "new-req-length", test: (pwd: string): boolean => pwd.length >= 8 },
		{ id: "new-req-uppercase", test: (pwd: string): boolean => /[A-Z]/.test(pwd) },
		{ id: "new-req-lowercase", test: (pwd: string): boolean => /[a-z]/.test(pwd) },
		{ id: "new-req-number", test: (pwd: string): boolean => /\d/.test(pwd) },
		{ id: "new-req-symbol", test: (pwd: string): boolean => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
	];

	requirements.forEach(requirement => {
		const element = document.getElementById(requirement.id);
		const icon = element?.querySelector(".requirement-icon");

		if (element && icon) {
			if (requirement.test(password)) {
				element.classList.add("requirement-met");
				icon.textContent = "✓";
			} else {
				element.classList.remove("requirement-met");
				icon.textContent = "✗";
			}
		}
	});
}

/**
 * Reset password requirements display to initial state
 */
export function resetPasswordRequirements(): void {
	const requirementIds = [
		"new-req-length",
		"new-req-uppercase",
		"new-req-lowercase",
		"new-req-number",
		"new-req-symbol"
	];

	requirementIds.forEach(id => {
		const element = document.getElementById(id);
		const icon = element?.querySelector(".requirement-icon");

		if (element && icon) {
			element.classList.remove("requirement-met");
			icon.textContent = "✗";
		}
	});
}

/**
 * Display password form validation errors
 * @param errors - Validation errors object
 */
function displayPasswordFormErrors(errors: Record<string, string>): void {
	// Clear existing errors first
	clearPasswordFormErrors();

	// Display each error
	Object.entries(errors).forEach(([field, message]) => {
		let errorElementId = "";

		if (field === "currentPassword") {
			errorElementId = "current-password-error";
		} else if (field === "newPassword") {
			errorElementId = "new-password-error";
		} else if (field === "confirmPassword") {
			errorElementId = "confirm-new-password-error";
		}

		if (errorElementId) {
			const errorElement = document.getElementById(errorElementId);
			if (errorElement) {
				errorElement.textContent = message;
				errorElement.style.display = "block";
			}
		}
	});
}

/**
 * Clear all password form validation errors
 */
function clearPasswordFormErrors(): void {
	const errorIds = ["current-password-error", "new-password-error", "confirm-new-password-error"];

	errorIds.forEach(id => {
		const errorElement = document.getElementById(id);
		if (errorElement) {
			errorElement.textContent = "";
			errorElement.style.display = "none";
		}
	});
}

/**
 * Set password form loading state
 * @param loading - Whether form is loading
 */
function setPasswordFormLoading(loading: boolean): void {
	const saveBtn = document.getElementById("save-password-btn");
	const spinner = saveBtn?.querySelector(".btn-spinner") as HTMLElement;
	const text = saveBtn?.querySelector(".btn-text") as HTMLElement;

	if (saveBtn && spinner && text) {
		if (loading) {
			(saveBtn as HTMLButtonElement).disabled = true;
			spinner.style.display = "inline-block";
			text.style.display = "none";
		} else {
			(saveBtn as HTMLButtonElement).disabled = false;
			spinner.style.display = "none";
			text.style.display = "inline-block";
		}
	}
}

/**
 * Show rate limiting information
 */
function showRateLimitInfo(): void {
	const rateLimitInfo = document.getElementById("rate-limit-info");
	if (rateLimitInfo) {
		rateLimitInfo.style.display = "block";

		// Auto-hide after 10 seconds
		setTimeout(() => {
			if (rateLimitInfo) {
				rateLimitInfo.style.display = "none";
			}
		}, 10000);
	}
}

// Initialize page when DOM is ready (only in browser environment)
if (typeof document !== "undefined") {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			void initializeProfilePage();
		});
	} else {
		void initializeProfilePage();
	}
}
