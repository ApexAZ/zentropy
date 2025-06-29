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
		const profileUpdateData: ProfileUpdateData = (validation.sanitizedData as ProfileUpdateData) ?? {
			first_name: "",
			last_name: "",
			email: ""
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
